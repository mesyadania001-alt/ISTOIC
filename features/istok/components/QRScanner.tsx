import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, Zap, ScanLine } from 'lucide-react';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const frameIdRef = useRef<number>(0);

    useEffect(() => {
        let stream: MediaStream | null = null;
        
        // Native Barcode Detector (Shape Detection API) - Much faster/cooler
        const BarcodeDetector = (window as any).BarcodeDetector;
        let detector: any = null;
        
        if (BarcodeDetector) {
            BarcodeDetector.getSupportedFormats()
                .then((formats: string[]) => {
                    if (formats.includes('qr_code')) {
                        detector = new BarcodeDetector({ formats: ['qr_code'] });
                    }
                })
                .catch(console.error);
        }

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" } 
                });
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute("playsinline", "true"); 
                    await videoRef.current.play();
                    setLoading(false);
                    scanFrame();
                }
            } catch (err) {
                console.error("Camera Error:", err);
                setError("Akses kamera ditolak atau tidak tersedia.");
                setLoading(false);
            }
        };

        const scanFrame = async () => {
            if (!videoRef.current) return;
            const video = videoRef.current;

            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                // 1. Try Native Detection (Fast & Efficient)
                if (detector) {
                    try {
                        const barcodes = await detector.detect(video);
                        if (barcodes.length > 0) {
                            onScan(barcodes[0].rawValue);
                            return; // Stop loop
                        }
                    } catch (e) {
                        // Fallback to jsQR if native detection fails momentarily
                    }
                }

                // 2. Fallback to jsQR (CPU Intensive but reliable)
                if (canvasRef.current) {
                    const canvas = canvasRef.current;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });

                    if (ctx) {
                        canvas.height = video.videoHeight;
                        canvas.width = video.videoWidth;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        });

                        if (code && code.data) {
                            onScan(code.data);
                            return; // Stop loop
                        }
                    }
                }
            }
            frameIdRef.current = requestAnimationFrame(scanFrame);
        };

        startCamera();

        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
            if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
        };
    }, [onScan]);

    return (
        <div className="fixed inset-0 z-[5000] bg-black flex flex-col font-sans">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
                <div>
                    <h2 className="text-emerald-500 font-black text-xl tracking-widest flex items-center gap-2">
                        <ScanLine size={20} className="animate-pulse"/> SCANNER_V2
                    </h2>
                    <p className="text-[10px] text-white/60 font-mono">ALIGN QR CODE WITHIN FRAME</p>
                </div>
                <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur rounded-full text-white hover:bg-white/20 transition">
                    <X size={20}/>
                </button>
            </div>

            {/* Camera Viewport */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                        <p className="text-emerald-500 text-xs font-bold tracking-widest">INITIALIZING SENSORS...</p>
                    </div>
                )}
                
                {error && (
                    <div className="text-red-500 text-center p-6 bg-red-500/10 rounded-xl border border-red-500/30 max-w-xs mx-auto z-10">
                        <Camera size={40} className="mx-auto mb-4 opacity-50"/>
                        <p className="text-sm font-bold mb-2">CAMERA OFFLINE</p>
                        <p className="text-xs opacity-70">{error}</p>
                    </div>
                )}

                <video 
                    ref={videoRef} 
                    className="absolute inset-0 w-full h-full object-cover opacity-60" 
                    playsInline 
                    muted
                />
                
                {/* Hidden canvas for processing */}
                <canvas ref={canvasRef} className="hidden" />

                {/* HUD Overlay (The "Cyberpunk" Feel) */}
                <div className="relative z-10 w-64 h-64 border-2 border-emerald-500/50 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.2)]">
                    {/* Corner Markers */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400"></div>
                    
                    {/* Scanning Beam */}
                    <div className="absolute inset-x-0 h-1 bg-emerald-400/80 shadow-[0_0_15px_#34d399] animate-scan-down top-0"></div>
                    
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                </div>

                <div className="absolute bottom-32 text-center w-full z-10">
                    <p className="text-emerald-500/80 text-[10px] font-mono tracking-[0.3em] animate-pulse">SEARCHING PATTERN...</p>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-[#09090b] border-t border-white/10 p-6 pb-8 z-20">
                <div className="flex items-center justify-center gap-6">
                    <button className="flex flex-col items-center gap-2 text-neutral-500 group">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition">
                            <Zap size={20} className="group-hover:text-yellow-400 transition"/>
                        </div>
                        <span className="text-[9px] font-bold tracking-wider">FLASH</span>
                    </button>
                </div>
            </div>
        </div>
    );
};