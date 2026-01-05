
import { DataConnection } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { debugService } from './debugService';
import { generateSAS } from '../utils/crypto';

// --- TYPES ---
export type Participant = {
    id: string; // Peer ID
    name: string;
    role: 'HOST' | 'CLIENT';
    status: 'VERIFYING' | 'ONLINE' | 'RECONNECTING' | 'OFFLINE'; // Added VERIFYING
    lastPing: number;
    conn: DataConnection;
    sasFingerprint?: string; // Visual Hash for Security Check
};

export type PacketType = 
    | 'HANDSHAKE' 
    | 'SAS_READY' // New: Security Handshake
    | 'SAS_VERIFY' // New: User confirmed SAS
    | 'SYNC_REQ' 
    | 'SYNC_RESP' 
    | 'MESSAGE' 
    | 'NOTE_UPDATE' 
    | 'HEARTBEAT'
    | 'KICK';

export interface NetworkPacket {
    id: string;
    type: PacketType;
    senderId: string;
    senderName?: string;
    payload: any;
    timestamp: number;
}

// --- ROOM MANAGER CORE ---
export class RoomManager {
    private myId: string;
    private myName: string;
    private role: 'HOST' | 'CLIENT' = 'CLIENT';
    private accessPin: string = ''; // Shared secret for SAS generation
    
    // The "Source of Truth" State
    private participants: Map<string, Participant> = new Map();
    private messageHistory: any[] = [];
    
    // Callbacks for UI updates
    private onStateUpdate: (state: any) => void;
    private onMessage: (msg: any) => void;
    private onSasRequest: (peerId: string, sas: string) => void; // Callback to show UI

    constructor(
        myId: string, 
        myName: string, 
        onUpdate: any, 
        onMsg: any,
        onSasReq: any 
    ) {
        this.myId = myId;
        this.myName = myName;
        this.onStateUpdate = onUpdate;
        this.onMessage = onMsg;
        this.onSasRequest = onSasReq;
    }

    public setAccessPin(pin: string) {
        this.accessPin = pin;
    }

    // --- 1. HOST LOGIC ---
    public createRoom() {
        this.role = 'HOST';
        this.participants.clear();
        debugService.log('INFO', 'ROOM', 'INIT', 'Secure Room Created. Waiting for peers...');
        this.notifyUI();
        setInterval(() => this.checkHeartbeats(), 5000);
    }

    // Called when someone connects to us
    public handleIncomingConnection(conn: DataConnection) {
        debugService.log('INFO', 'ROOM', 'JOIN_REQ', `Peer ${conn.peer} attempting to join.`);

        conn.on('open', async () => {
            // 1. Generate SAS (Visual Fingerprint) immediately
            // This relies on both parties knowing the PIN + PeerIDs
            const sas = await generateSAS(this.myId, conn.peer, this.accessPin);

            // Register preliminary participant (VERIFYING state)
            this.participants.set(conn.peer, {
                id: conn.peer,
                name: 'Verifying...', 
                role: 'CLIENT',
                status: 'VERIFYING',
                lastPing: Date.now(),
                conn: conn,
                sasFingerprint: sas
            });

            conn.on('data', (data: any) => this.processPacket(data, conn.peer));
            conn.on('close', () => this.handleDisconnect(conn.peer));
            conn.on('error', () => this.handleDisconnect(conn.peer));
            
            // 2. Trigger UI to ask Host to verify SAS
            this.onSasRequest(conn.peer, sas);
        });
    }

    // --- 2. CLIENT LOGIC ---
    public joinRoom(hostConn: DataConnection) {
        this.role = 'CLIENT';
        
        hostConn.on('open', async () => {
            debugService.log('INFO', 'ROOM', 'CONNECTED', 'Connected to Host. Handshaking...');
            
            // Generate SAS locally to display to user if needed (Optional for client side check)
            const sas = await generateSAS(hostConn.peer, this.myId, this.accessPin);

            // Register Host
            this.participants.set(hostConn.peer, {
                id: hostConn.peer,
                name: 'HOST',
                role: 'HOST',
                status: 'ONLINE', // Client trusts host by default if PIN matches (simplification)
                lastPing: Date.now(),
                conn: hostConn,
                sasFingerprint: sas
            });

            hostConn.on('data', (data: any) => this.processPacket(data, hostConn.peer));
            
            // Send Identity immediately
            this.sendTo(hostConn.peer, 'HANDSHAKE', { name: this.myName });
        });
    }

    public verifyPeer(peerId: string) {
        const p = this.participants.get(peerId);
        if (p && p.status === 'VERIFYING') {
            p.status = 'ONLINE';
            
            // Notify Peer we accepted them
            this.sendTo(peerId, 'SAS_VERIFY', { verified: true });
            
            // Send Welcome Pack
            this.sendTo(peerId, 'HANDSHAKE', { hostName: this.myName });
            this.broadcastUserList();
            this.notifyUI();
        }
    }

    public rejectPeer(peerId: string) {
        const p = this.participants.get(peerId);
        if (p) {
            p.conn.close();
            this.participants.delete(peerId);
            this.notifyUI();
        }
    }

    public leaveRoom() {
        this.participants.forEach(p => p.conn.close());
        this.participants.clear();
        this.messageHistory = [];
        this.notifyUI();
    }

    // --- 3. THE "SMART" ROUTER (Packet Logic) ---
    private processPacket(packet: NetworkPacket, senderId: string) {
        const participant = this.participants.get(senderId);
        
        // Drop packets from unverified peers (except Handshake/SAS)
        if (participant?.status === 'VERIFYING' && packet.type !== 'HANDSHAKE') {
            console.warn("Dropped packet from unverified peer:", senderId);
            return;
        }

        if (participant) {
            participant.lastPing = Date.now();
            if (participant.status !== 'VERIFYING') participant.status = 'ONLINE';
            
            if (packet.type === 'HANDSHAKE' && packet.payload.name) {
                participant.name = packet.payload.name;
                if (this.role === 'HOST') this.broadcastUserList();
            }
        }

        switch (packet.type) {
            case 'SAS_VERIFY':
                // Host confirmed our SAS. We are in!
                if (this.role === 'CLIENT') {
                    this.sendTo(senderId, 'SYNC_REQ', {}); // Request data
                }
                break;
            case 'MESSAGE':
                this.handleMessagePacket(packet);
                break;
            case 'SYNC_REQ':
                if (this.role === 'HOST') {
                    // SAFE SYNC: Only send last 20 messages to prevent channel overflow
                    const safeHistory = this.messageHistory.slice(-20).map(m => {
                        // Strip large image data from history sync to be safe
                        if (m.type === 'IMAGE' && m.content.length > 50000) {
                            return { ...m, content: '', status: 'DATA_OMITTED_TOO_LARGE' };
                        }
                        return m;
                    });
                    
                    this.sendTo(senderId, 'SYNC_RESP', { 
                        messages: safeHistory,
                        users: this.getPublicList()
                    });
                }
                break;
            case 'SYNC_RESP':
                if (packet.payload.messages) {
                    this.messageHistory = packet.payload.messages;
                    this.onMessage(this.messageHistory);
                }
                if (packet.payload.users) {
                     this.onStateUpdate(packet.payload.users);
                }
                break;
        }
    }

    private handleMessagePacket(packet: NetworkPacket) {
        if (this.messageHistory.some(m => m.id === packet.id)) return;

        this.messageHistory.push(packet.payload);
        this.onMessage(packet.payload);

        if (this.role === 'HOST') {
            this.broadcast(packet, packet.senderId); 
        }
    }

    // --- 4. DATA TRANSMISSION ---
    public broadcastMessage(content: string, type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'FILE') {
        // Size Limit Guard (WebRTC Buffer Protection)
        if (content.length > 500000) { // Approx 500KB limit for now
            console.error("Payload too large for P2P buffer");
            return; 
        }

        const msgPayload = {
            id: uuidv4(),
            senderId: this.myId,
            senderName: this.myName,
            content,
            type,
            timestamp: Date.now(),
            status: 'SENT'
        };

        const packet: NetworkPacket = {
            id: msgPayload.id,
            type: 'MESSAGE',
            senderId: this.myId,
            senderName: this.myName,
            payload: msgPayload,
            timestamp: Date.now()
        };

        this.messageHistory.push(msgPayload);
        this.onMessage(msgPayload); 

        if (this.role === 'HOST') {
            this.broadcast(packet, this.myId);
        } else {
            const host = Array.from(this.participants.values()).find(p => p.role === 'HOST');
            if (host) {
                this.sendTo(host.id, 'MESSAGE', msgPayload);
            }
        }
    }

    private sendTo(targetId: string, type: PacketType, payload: any) {
        const target = this.participants.get(targetId);
        if (target && target.conn.open) {
            const packet: NetworkPacket = {
                id: uuidv4(),
                type,
                senderId: this.myId,
                senderName: this.myName,
                payload,
                timestamp: Date.now()
            };
            try {
                target.conn.send(packet);
            } catch(e) {
                console.error("Send Error:", e);
                if(target.status === 'ONLINE') target.status = 'RECONNECTING';
            }
        }
    }

    private broadcast(packet: NetworkPacket, excludeId?: string) {
        this.participants.forEach(p => {
            if (p.id !== excludeId && p.status === 'ONLINE' && p.conn.open) {
                try {
                    p.conn.send(packet);
                } catch(e) {
                     console.error("Broadcast Error to", p.id, e);
                }
            }
        });
    }

    private broadcastUserList() {
        if (this.role !== 'HOST') return;
        const userList = this.getPublicList();
        
        this.broadcast({
            id: uuidv4(),
            type: 'SYNC_RESP',
            senderId: this.myId,
            payload: { users: userList },
            timestamp: Date.now()
        });
        
        this.notifyUI();
    }

    // --- 5. MAINTENANCE & CLEANUP ---
    private checkHeartbeats() {
        const now = Date.now();
        let changed = false;
        
        this.participants.forEach(p => {
            if (now - p.lastPing > 15000 && p.status === 'ONLINE') { 
                p.status = 'OFFLINE';
                changed = true;
            }
        });
        
        if (changed) {
            this.notifyUI();
            if (this.role === 'HOST') this.broadcastUserList();
        }
    }

    private handleDisconnect(peerId: string) {
        const p = this.participants.get(peerId);
        if (p) {
            p.status = 'OFFLINE';
            this.notifyUI();
            if (this.role === 'HOST') this.broadcastUserList();
        }
    }

    private getPublicList() {
        const users = Array.from(this.participants.values())
            .filter(p => p.status === 'ONLINE' || p.status === 'RECONNECTING' || p.status === 'OFFLINE') // Don't show verifying users yet
            .map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
                isHost: p.role === 'HOST'
            }));
        users.unshift({ id: this.myId, name: this.myName, status: 'ONLINE', isHost: this.role === 'HOST' });
        return users;
    }

    private notifyUI() {
        this.onStateUpdate(this.getPublicList());
    }
}
