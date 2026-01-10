
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { encodeAudio, decodeAudio, decodeAudioData, noteTools, visualTools, KEY_MANAGER } from "./geminiService";
import { debugService } from "./debugService";

export type NeuralLinkStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'ERROR' | 'RECONNECTING';
export type MicMode = 'STANDARD' | 'ISOLATION' | 'HIGH_FIDELITY';
export type AmbientMode = 'OFF' | 'CYBER' | 'RAIN' | 'CAFE';

export interface TranscriptionEvent {
    text: string;
    source: 'user' | 'model';
    isFinal: boolean;
}

export interface NeuralLinkConfig {
    modelId: string;
    persona: 'hanisah' | 'stoic';
    systemInstruction: string;
    voiceName: string;
    onStatusChange: (status: NeuralLinkStatus, error?: string) => void;
    onToolCall: (toolCall: any) => Promise<any>;
    onTranscription?: (event: TranscriptionEvent) => void;
}

// Allowed Gemini Live Voices
const GOOGLE_VALID_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Zephyr'];

// --- AUDIO WORKLET PROCESSOR CODE (Inline) ---
const AUDIO_WORKLET_CODE = `
class PCMWorklet extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.idx = 0;
    }
    process(inputs) {
        const input = inputs[0];
        if (!input || !input[0]) return true;
        const incoming = input[0];
        for (let i = 0; i < incoming.length; i++) {
            this.buffer[this.idx++] = incoming[i];
            if (this.idx >= this.bufferSize) {
                this.port.postMessage(this.buffer.slice());
                this.idx = 0;
            }
        }
        return true;
    }
}
registerProcessor('pcm-worklet', PCMWorklet);
`;

/**
 * PROCEDURAL AMBIENT ENGINE
 */
class AmbientMixer {
    private ctx: AudioContext;
    private activeNodes: AudioNode[] = [];
    private gainNode: GainNode;

    constructor(ctx: AudioContext) {
        this.ctx = ctx;
        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = 0.15; // Default low volume
        this.gainNode.connect(ctx.destination);
    }

    setMode(mode: AmbientMode) {
        this.stop();
        if (mode === 'OFF') return;

        const t = this.ctx.currentTime;

        if (mode === 'CYBER') {
            const osc = this.ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(50, t);
            
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, t);
            
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.2; 
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 100;

            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            
            osc.connect(filter);
            filter.connect(this.gainNode);
            
            osc.start();
            lfo.start();
            this.activeNodes.push(osc, lfo, filter, lfoGain);
        } 
        else if (mode === 'RAIN') {
            const bufferSize = 2 * this.ctx.sampleRate;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = this.ctx.createBufferSource();
            whiteNoise.buffer = buffer;
            whiteNoise.loop = true;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 800;

            whiteNoise.connect(filter);
            filter.connect(this.gainNode);
            
            whiteNoise.start();
            this.activeNodes.push(whiteNoise, filter);
        }
    }

    stop() {
        this.activeNodes.forEach(node => {
            try { (node as any).stop && (node as any).stop(); } catch(e){}
            try { node.disconnect(); } catch(e){}
        });
        this.activeNodes = [];
    }
}

export class NeuralLinkService {
    private session: any = null;
    private inputCtx: AudioContext | null = null;
    private outputCtx: AudioContext | null = null;
    private nextStartTime: number = 0;
    private sources: Set<AudioBufferSourceNode> = new Set();
    private activeStream: MediaStream | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private config: NeuralLinkConfig | null = null;
    private _analyser: AnalyserNode | null = null;
    private isConnecting: boolean = false;
    private isConnected: boolean = false;
    private audioCheckInterval: any = null;
    private retryCount = 0;
    private maxRetries = 3;
    private isWorkletLoaded: boolean = false;
    
    // Modules
    private ambientMixer: AmbientMixer | null = null;
    private currentMicMode: MicMode = 'STANDARD';

    constructor() {}

    get analyser() {
        return this._analyser;
    }

    async connect(config: NeuralLinkConfig) {
        if (this.isConnecting || this.isConnected) return;
        
        this.isConnecting = true;
        this.config = config;
        this.retryCount = 0;
        
        this.disconnect(true); 
        config.onStatusChange('CONNECTING');

        await this.attemptConnection(config);
    }

    private async attemptConnection(config: NeuralLinkConfig) {
        try {
            await this.initializeSession(config);
        } catch (e: any) {
            console.error("Neural Link Setup Failed:", e);
            
            // Auto-Reconnect Logic for Socket Errors (1007, etc)
            if (this.retryCount < this.maxRetries && !e.name.includes('NotAllowed')) {
                this.retryCount++;
                const delay = Math.pow(2, this.retryCount) * 1000;
                config.onStatusChange('RECONNECTING');
                debugService.log('WARN', 'NEURAL_LINK', 'RETRY', `Connection failed, retrying in ${delay}ms...`);
                
                setTimeout(() => {
                    this.attemptConnection(config);
                }, delay);
            } else {
                config.onStatusChange('ERROR', e.name === 'NotAllowedError' ? "Mic Access Denied" : e.message);
                this.disconnect();
            }
        }
    }

    private async initializeSession(config: NeuralLinkConfig) {
        // 1. Initialize Audio Contexts
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        
        if (!this.inputCtx || this.inputCtx.state === 'closed') {
            this.inputCtx = new AudioContextClass({ sampleRate: 16000 });
            this.isWorkletLoaded = false; // Reset loaded flag on new context
        }
        
        if (!this.outputCtx || this.outputCtx.state === 'closed') {
            this.outputCtx = new AudioContextClass({ sampleRate: 24000 });
            this._analyser = this.outputCtx.createAnalyser();
            this._analyser.fftSize = 512;
            this._analyser.smoothingTimeConstant = 0.7;
            this.ambientMixer = new AmbientMixer(this.outputCtx);
        }

        // Resume contexts
        try {
            if (this.inputCtx.state === 'suspended') await this.inputCtx.resume();
            if (this.outputCtx.state === 'suspended') await this.outputCtx.resume();
        } catch (e) {}

        // 2. Setup Audio Worklet (Background Processing)
        if (!this.inputCtx.audioWorklet) {
            throw new Error("AudioWorklet not supported in this browser.");
        }
        
        // Prevent redundant loading which causes AbortError or NotSupportedError
        if (!this.isWorkletLoaded) {
            try {
                const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
                const workletUrl = URL.createObjectURL(blob);
                await this.inputCtx.audioWorklet.addModule(workletUrl);
                this.isWorkletLoaded = true;
            } catch (e: any) {
                // If it fails, log warning but try to proceed to verification
                // It might fail if already registered in some race conditions
                console.warn("Worklet module load warning (possibly already registered):", e);
            }
        }

        // Verify processor registration by attempting to create a node
        try {
            const dummy = new AudioWorkletNode(this.inputCtx, 'pcm-worklet');
            dummy.disconnect();
            this.isWorkletLoaded = true;
        } catch (e: any) {
            throw new Error("Audio processor failed to initialize: " + e.message);
        }

        // 3. Initialize Mic
        if (!this.activeStream) {
            await this.setupMicrophone(this.currentMicMode);
        }

        // 4. API Client
        const apiKey = KEY_MANAGER.getKey('GEMINI');
        if (!apiKey) throw new Error("No healthy GEMINI API key available.");

        const ai = new GoogleGenAI({ apiKey });
        
        // 5. Voice
        let selectedVoice = config.voiceName;
        if (!GOOGLE_VALID_VOICES.includes(selectedVoice)) {
            selectedVoice = config.persona === 'hanisah' ? 'Kore' : 'Fenrir';
        }

        // 6. Tools
        const liveTools: any[] = [{ googleSearch: {} }];
        const functions = [...(noteTools.functionDeclarations || []), ...(visualTools?.functionDeclarations || [])];
        if (functions.length > 0) liveTools.push({ functionDeclarations: functions });

        // 7. Connect
        debugService.log('INFO', 'NEURAL_LINK', 'CONNECTING', `Dialing Gemini Live...`);

        const sessionPromise = ai.live.connect({
            model: config.modelId,
            callbacks: {
                onopen: () => {
                    console.log("[NeuralLink] Socket Opened");
                    this.isConnecting = false;
                    this.isConnected = true;
                    config.onStatusChange('ACTIVE');
                    
                    this.startAudioInputStream(sessionPromise);
                    
                    // iOS Watchdog
                    this.audioCheckInterval = setInterval(() => {
                        if (this.outputCtx?.state === 'suspended') this.outputCtx.resume();
                        if (this.inputCtx?.state === 'suspended') this.inputCtx.resume();
                    }, 2000);

                    // Context Init
                    sessionPromise.then(session => {
                        session.sendRealtimeInput({ text: `System initialized. Persona: ${config.persona}. Ready.` });
                    });
                },
                onmessage: async (msg: LiveServerMessage) => {
                    await this.handleServerMessage(msg, sessionPromise);
                },
                onerror: (e) => {
                    console.error("Neural Link Socket Error:", e);
                    if (this.isConnected) {
                         config.onStatusChange('ERROR', "Connection Dropped");
                         this.disconnect();
                    }
                },
                onclose: (e) => {
                    console.log("Neural Link Socket Closed");
                    this.disconnect();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                tools: liveTools,
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
                systemInstruction: config.systemInstruction,
                inputAudioTranscription: { model: "google-1.0" }, 
                outputAudioTranscription: { model: "google-1.0" },
            }
        });

        this.session = await sessionPromise;
    }

    async switchVoice(newVoice: string) {
        if (!this.config || !this.isConnected) return;
        this.disconnect(true);
        this.config.voiceName = newVoice;
        await this.connect(this.config);
    }

    async setMicMode(mode: MicMode) {
        if (!this.isConnected || this.currentMicMode === mode) return;
        this.currentMicMode = mode;
        await this.setupMicrophone(mode);
        if (this.session && this.inputCtx) {
             const sessionPromise = Promise.resolve(this.session);
             this.startAudioInputStream(sessionPromise);
        }
    }

    setAmbientMode(mode: AmbientMode) {
        if (this.ambientMixer) {
            this.ambientMixer.setMode(mode);
        }
    }

    private async setupMicrophone(mode: MicMode) {
        if (this.activeStream) {
            this.activeStream.getTracks().forEach(t => t.stop());
        }

        const constraints: MediaTrackConstraints = {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            autoGainControl: true,
            noiseSuppression: mode !== 'HIGH_FIDELITY'
        };

        this.activeStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
    }

    private startAudioInputStream(sessionPromise: Promise<any>) {
        if (!this.inputCtx || !this.activeStream) return;
        
        try {
            if (this.workletNode) {
                this.workletNode.disconnect();
                this.workletNode = null;
            }

            const source = this.inputCtx.createMediaStreamSource(this.activeStream);
            this.workletNode = new AudioWorkletNode(this.inputCtx, 'pcm-worklet');
            
            // Handle data from worklet thread
            this.workletNode.port.onmessage = (event) => {
                if (!this.isConnected) return;

                const inputData = event.data as Float32Array;
                
                // VAD Gate
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                const rms = Math.sqrt(sum / inputData.length);
                if (rms < 0.002) return; 

                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
                }
                
                const pcmBlob = { 
                    data: encodeAudio(new Uint8Array(int16.buffer)), 
                    mimeType: 'audio/pcm;rate=16000' 
                };
                
                sessionPromise.then(s => { 
                    try { s.sendRealtimeInput({ media: pcmBlob }); } catch (err) {} 
                });
            };
            
            source.connect(this.workletNode);
            // Must connect to destination to keep processing alive in some browsers, 
            // but gain is 0 to prevent feedback loop
            this.workletNode.connect(this.inputCtx.destination);
            
        } catch (err) {
            console.error("Input Stream Error:", err);
        }
    }

    private async handleServerMessage(msg: LiveServerMessage, sessionPromise: Promise<any>) {
        // 1. Transcription
        if (this.config?.onTranscription) {
            if (msg.serverContent?.inputTranscription) {
                this.config.onTranscription({ 
                    text: msg.serverContent.inputTranscription.text, 
                    source: 'user', 
                    isFinal: !!msg.serverContent.turnComplete 
                });
            }
            if (msg.serverContent?.outputTranscription) {
                this.config.onTranscription({ 
                    text: msg.serverContent.outputTranscription.text, 
                    source: 'model', 
                    isFinal: !!msg.serverContent.turnComplete 
                });
            }
        }

        // 2. Tool Execution
        if (msg.toolCall) {
            for (const fc of msg.toolCall.functionCalls) {
                if (this.config?.onToolCall) {
                    try {
                        const result = await this.config.onToolCall(fc);
                        sessionPromise.then(s => s.sendToolResponse({ 
                            functionResponses: [{ id: fc.id, name: fc.name, response: { result: String(result) } }] 
                        })).catch(e => console.error("Tool Response Error", e));
                    } catch (err) {
                        sessionPromise.then(s => s.sendToolResponse({
                            functionResponses: [{ id: fc.id, name: fc.name, response: { result: "Error executing tool" } }]
                        }));
                    }
                }
            }
        }

        // 3. Audio Playback
        const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && this.outputCtx) {
            try {
                if (this.outputCtx.state === 'suspended') await this.outputCtx.resume();

                const currentTime = this.outputCtx.currentTime;
                if (this.nextStartTime < currentTime) {
                    this.nextStartTime = currentTime + 0.05; 
                }

                const audioBuffer = await decodeAudioData(decodeAudio(base64Audio), this.outputCtx, 24000, 1);
                const source = this.outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                
                if (this._analyser) { 
                    source.connect(this._analyser); 
                    this._analyser.connect(this.outputCtx.destination); 
                } else {
                    source.connect(this.outputCtx.destination);
                }
                
                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);
                
                source.onended = () => this.sources.delete(source);
            } catch (e) { }
        }

        // Handle Interruption
        if (msg.serverContent?.interrupted) {
            this.sources.forEach(s => { try { s.stop(); } catch(e){} });
            this.sources.clear();
            if (this.outputCtx) this.nextStartTime = this.outputCtx.currentTime;
        }
    }

    disconnect(silent: boolean = false) {
        this.isConnected = false;
        this.isConnecting = false;

        if (this.audioCheckInterval) {
            clearInterval(this.audioCheckInterval);
            this.audioCheckInterval = null;
        }
        
        if (this.session) { 
            try { if(typeof this.session.close === 'function') this.session.close(); } catch(e){} 
            this.session = null; 
        }

        if (this.activeStream) { 
            this.activeStream.getTracks().forEach(t => t.stop()); 
            this.activeStream = null; 
        }

        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }

        if (this.ambientMixer) {
            this.ambientMixer.stop();
        }

        if (this.inputCtx && this.inputCtx.state === 'running') { try { this.inputCtx.suspend(); } catch(e){} }
        if (this.outputCtx && this.outputCtx.state === 'running') { try { this.outputCtx.suspend(); } catch(e){} }

        this.sources.forEach(s => { try { s.stop(); } catch(e){} });
        this.sources.clear();
        this.nextStartTime = 0;
        
        if (!silent && this.config) {
            this.config.onStatusChange('IDLE');
        }
    }
}
