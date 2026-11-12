import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { LandmarkPoint } from '../types';
import { classifyISLGesture, GestureClassification } from '../utils/islClassifier';

interface HandCanvasProps {
  isActive: boolean;
  onLandmarksDetected: (
    landmarks: LandmarkPoint[],
    handCount: number,
    localClassification?: GestureClassification
  ) => void;
  confidenceThreshold?: number;
}

// MediaPipe 21 Hand Connections
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                               // Palm base
];

// Helper to ensure MediaPipe Hands script is loaded in document
function ensureMediaPipeLoaded(): Promise<any> {
  return new Promise((resolve, reject) => {
    const win = window as any;
    if (win.Hands) {
      resolve(win.Hands);
      return;
    }

    // Check if script already exists
    let script = document.querySelector('script[src*="mediapipe/hands"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (win.Hands) {
        clearInterval(interval);
        resolve(win.Hands);
      } else if (attempts > 50) {
        clearInterval(interval);
        reject(new Error('MediaPipe Hands library timed out while loading.'));
      }
    }, 100);
  });
}

export const HandCanvas: React.FC<HandCanvasProps> = ({
  isActive,
  onLandmarksDetected,
  confidenceThreshold = 0.70
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [liveDetectedSign, setLiveDetectedSign] = useState<string | null>(null);

  const handsInstanceRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const onLandmarksDetectedRef = useRef(onLandmarksDetected);
  onLandmarksDetectedRef.current = onLandmarksDetected;

  // Cleanup helper
  const stopCamera = useCallback(() => {
    isRunningRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (handsInstanceRef.current) {
      try {
        handsInstanceRef.current.close();
      } catch (e) {}
      handsInstanceRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    setLiveDetectedSign(null);
    setLoadingStatus(null);
  }, [stream]);

  // Start Camera and Real-Time Tracking Loop
  const startCamera = useCallback(async () => {
    setPermissionError(null);
    setLoadingStatus('Accessing webcam feed...');

    try {
      // 1. Request user media with clean 640x480 resolution
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      setStream(mediaStream);

      const video = videoRef.current;
      if (!video) throw new Error('Video element not mounted.');

      video.srcObject = mediaStream;

      // Wait until video is playing and ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve()).catch(() => resolve());
        };
      });

      // 2. Load MediaPipe Hands
      setLoadingStatus('Initializing AI Hand Tracking Model...');
      const HandsClass = await ensureMediaPipeLoaded();

      const hands = new HandsClass({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // 3. Define Result Handler
      hands.onResults((results: any) => {
        const canvas = canvasRef.current;
        const currentVideo = videoRef.current;
        if (!canvas || !currentVideo) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure canvas dimensions match actual video resolution
        const vw = currentVideo.videoWidth || 640;
        const vh = currentVideo.videoHeight || 480;
        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const handCount = results.multiHandLandmarks.length;
          const primaryHand = results.multiHandLandmarks[0];

          // Format landmarks as LandmarkPoint[]
          const landmarks: LandmarkPoint[] = primaryHand.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z ?? 0,
          }));

          // Run instant zero-latency geometric classifier
          const classified = classifyISLGesture(landmarks, handCount);
          setLiveDetectedSign(classified.isRecognized ? classified.gesture : null);

          // Notify parent component with landmarks and classification
          onLandmarksDetectedRef.current(landmarks, handCount, classified);

          // Draw hand skeletons and AR visual feedback
          results.multiHandLandmarks.forEach((handPoints: any[], hIndex: number) => {
            const isDominant = hIndex === 0;

            // Compute bounding box
            let minX = 1, maxX = 0, minY = 1, maxY = 0;
            handPoints.forEach((pt: any) => {
              if (pt.x < minX) minX = pt.x;
              if (pt.x > maxX) maxX = pt.x;
              if (pt.y < minY) minY = pt.y;
              if (pt.y > maxY) maxY = pt.y;
            });

            const pad = 20;
            const bx = Math.max(0, minX * canvas.width - pad);
            const by = Math.max(0, minY * canvas.height - pad);
            const bw = Math.min(canvas.width - bx, (maxX - minX) * canvas.width + pad * 2);
            const bh = Math.min(canvas.height - by, (maxY - minY) * canvas.height + pad * 2);

            // Draw Skeletal Connections
            ctx.lineWidth = 3;
            ctx.strokeStyle = isDominant ? '#06b6d4' : '#818cf8';
            ctx.shadowColor = isDominant ? '#06b6d4' : '#818cf8';
            ctx.shadowBlur = 6;

            HAND_CONNECTIONS.forEach(([p1, p2]) => {
              const pt1 = handPoints[p1];
              const pt2 = handPoints[p2];
              if (pt1 && pt2) {
                ctx.beginPath();
                ctx.moveTo(pt1.x * canvas.width, pt1.y * canvas.height);
                ctx.lineTo(pt2.x * canvas.width, pt2.y * canvas.height);
                ctx.stroke();
              }
            });

            // Draw Joint Nodes
            ctx.shadowBlur = 0;
            handPoints.forEach((pt: any, jIndex: number) => {
              const isFingertip = [4, 8, 12, 16, 20].includes(jIndex);
              const isIndexTip = jIndex === 8;
              const x = pt.x * canvas.width;
              const y = pt.y * canvas.height;

              ctx.beginPath();
              ctx.arc(x, y, isIndexTip ? 6.5 : isFingertip ? 5 : 3.5, 0, 2 * Math.PI);
              ctx.fillStyle = isIndexTip ? '#38bdf8' : isFingertip ? '#22d3ee' : '#0284c7';
              ctx.fill();

              // Glowing ring around fingertips
              if (isFingertip) {
                ctx.beginPath();
                ctx.arc(x, y, isIndexTip ? 9.5 : 7.5, 0, 2 * Math.PI);
                ctx.strokeStyle = isIndexTip ? 'rgba(56, 189, 248, 0.9)' : 'rgba(34, 211, 238, 0.7)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }
            });

            // Draw Sci-Fi Bounding Brackets
            ctx.strokeStyle = isDominant ? 'rgba(6, 182, 212, 0.85)' : 'rgba(129, 140, 248, 0.7)';
            ctx.lineWidth = 2;
            const cornerSize = Math.min(24, bw * 0.25);

            // Top-Left corner
            ctx.beginPath();
            ctx.moveTo(bx, by + cornerSize);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx + cornerSize, by);
            ctx.stroke();

            // Top-Right corner
            ctx.beginPath();
            ctx.moveTo(bx + bw - cornerSize, by);
            ctx.lineTo(bx + bw, by);
            ctx.lineTo(bx + bw, by + cornerSize);
            ctx.stroke();

            // Bottom-Left corner
            ctx.beginPath();
            ctx.moveTo(bx, by + bh - cornerSize);
            ctx.lineTo(bx, by + bh);
            ctx.lineTo(bx + cornerSize, by + bh);
            ctx.stroke();

            // Bottom-Right corner
            ctx.beginPath();
            ctx.moveTo(bx + bw - cornerSize, by + bh);
            ctx.lineTo(bx + bw, by + bh);
            ctx.lineTo(bx + bw, by + bh - cornerSize);
            ctx.stroke();

            // Draw Floating AR Badge above the hand
            // Note: Since canvas is flipped with CSS -scale-x-100, we unmirror text locally
            if (isDominant && classified.gesture) {
              const badgeText = `${classified.gesture} · ${(classified.confidence * 100).toFixed(0)}%`;
              const badgeCenterX = bx + bw / 2;
              const badgeCenterY = Math.max(30, by - 16);

              ctx.save();
              // Invert horizontal scale around badge center so text reads normally
              ctx.translate(badgeCenterX, badgeCenterY);
              ctx.scale(-1, 1);

              ctx.font = 'bold 12px "JetBrains Mono", monospace';
              const textMetrics = ctx.measureText(badgeText);
              const textWidth = textMetrics.width;
              const pillWidth = textWidth + 24;
              const pillHeight = 26;

              // Badge background pill
              ctx.fillStyle = classified.isRecognized
                ? 'rgba(15, 23, 42, 0.92)'
                : 'rgba(30, 41, 59, 0.85)';
              ctx.strokeStyle = classified.isRecognized ? '#06b6d4' : '#64748b';
              ctx.lineWidth = 1.5;

              ctx.beginPath();
              ctx.roundRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, 6);
              ctx.fill();
              ctx.stroke();

              // Text fill
              ctx.fillStyle = classified.isRecognized ? '#38bdf8' : '#cbd5e1';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(badgeText, 0, 0);

              ctx.restore();
            }
          });
        } else {
          // No hand detected
          setLiveDetectedSign(null);
          onLandmarksDetectedRef.current([], 0);
        }

        ctx.restore();
      });

      handsInstanceRef.current = hands;
      isRunningRef.current = true;
      setLoadingStatus(null);

      // 4. Start requestAnimationFrame video processing loop
      let lastSendTime = 0;
      const processFrame = async () => {
        if (!isRunningRef.current) return;

        const currentVideo = videoRef.current;
        const currentHands = handsInstanceRef.current;

        if (currentVideo && currentHands && currentVideo.readyState >= 2) {
          const now = performance.now();
          // Target ~30fps inference to guarantee silky rendering without GPU throttling
          if (now - lastSendTime >= 30) {
            lastSendTime = now;
            try {
              await currentHands.send({ image: currentVideo });
            } catch (err) {
              // Frame dropped, proceed
            }
          }
        }

        if (isRunningRef.current) {
          animationFrameRef.current = requestAnimationFrame(processFrame);
        }
      };

      animationFrameRef.current = requestAnimationFrame(processFrame);
    } catch (err: any) {
      console.error('Webcam initialization error:', err);
      setIsInitializingError(err);
    }
  }, []);

  const setIsInitializingError = (err: any) => {
    setLoadingStatus(null);
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      setPermissionError('Camera permission was denied. Please grant webcam access in your browser bar.');
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      setPermissionError('No webcam detected on your system. Please connect a camera.');
    } else {
      setPermissionError(`Webcam error: ${err.message || 'Unable to open camera feed'}`);
    }
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isActive]);

  return (
    <div className="relative w-full aspect-[4/3] max-h-[520px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
      {/* Background Video Element (mirrored for natural webcam experience) */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover transform -scale-x-100 ${isActive && stream ? 'block' : 'hidden'}`}
        playsInline
        muted
        autoPlay
      />

      {/* Overlay Canvas for Real-Time Hand Landmark Tracking & AR Floating Badges */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none ${isActive && stream ? 'block' : 'hidden'}`}
      />

      {/* Live Active AR Badge in top center */}
      {isActive && stream && liveDetectedSign && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-cyan-500/80 shadow-lg shadow-cyan-500/20 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono font-bold text-cyan-300">
              {liveDetectedSign}
            </span>
          </div>
        </div>
      )}

      {/* Inactive State */}
      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 backdrop-blur-sm z-10">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-4 text-slate-400">
            <CameraOff className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-200 mb-1">Camera Stream Standby</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Click &quot;Start Interpreter&quot; to initialize high-speed MediaPipe hand tracking and live ISL gesture recognition.
          </p>
        </div>
      )}

      {/* Permission Blocked Dialog */}
      {permissionError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-rose-950/95 backdrop-blur-md z-30">
          <div className="w-14 h-14 rounded-2xl bg-rose-900/50 border border-rose-700/60 flex items-center justify-center mb-3 text-rose-300">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-semibold text-rose-200 mb-1">Camera Permission Needed</h3>
          <p className="text-xs text-rose-300/80 max-w-sm mb-4 leading-relaxed">
            {permissionError}
          </p>
          <button
            onClick={() => startCamera()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-lg shadow-rose-900/30"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Camera Access</span>
          </button>
        </div>
      )}

      {/* Loading & Calibration Status */}
      {loadingStatus && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md z-30 space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono font-medium text-cyan-300 tracking-wide">
            {loadingStatus}
          </p>
        </div>
      )}
    </div>
  );
};
