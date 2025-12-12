import React, { useEffect, useRef, useState } from 'react';
import { GestureState } from '../types';
import { FilesetResolver, GestureRecognizer, GestureRecognizerResult } from '@mediapipe/tasks-vision';

interface GestureControllerProps {
  onGestureChange: (gesture: GestureState) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ onGestureChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [debugStatus, setDebugStatus] = useState("Initializing AI...");
  const lastVideoTime = useRef(-1);
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const lastStatusRef = useRef<string>("");
  
  const updateDebugStatus = (status: string) => {
    if (lastStatusRef.current !== status) {
        lastStatusRef.current = status;
        setDebugStatus(status);
    }
  };

  useEffect(() => {
    let animationFrameId: number;
    let isActive = true;

    const setupMediaPipe = async () => {
      try {
        updateDebugStatus("Loading Model...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        if (!isActive) return;

        gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        setLoading(false);
        updateDebugStatus("AI Ready");
      } catch (err) {
        console.error("MediaPipe load error:", err);
        updateDebugStatus("AI Error");
      }
    };

    setupMediaPipe();

    const startCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: 320, 
              height: 240, 
              frameRate: { ideal: 30 } 
            } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              if (videoRef.current) videoRef.current.play();
              setPermissionGranted(true);
            };
          }
        } catch (error) {
          console.error("Camera permission denied:", error);
          updateDebugStatus("Camera Denied");
        }
      }
    };

    startCamera();

    const predictWebcam = () => {
      if (!isActive) return;

      if (gestureRecognizerRef.current && videoRef.current && !videoRef.current.paused && videoRef.current.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = videoRef.current.currentTime;
        
        try {
            const results: GestureRecognizerResult = gestureRecognizerRef.current.recognizeForVideo(videoRef.current, Date.now());

            let isFist = false;
            let isWaving = false; // Open Palm
            let isPointing = false;
            let handPresent = false;
            let move = { x: 0, y: 0 };
            let currentStatus = "No Hand";

            if (results.gestures.length > 0) {
              handPresent = true;
              const gestureName = results.gestures[0][0].categoryName;
              
              // 1. CATCH: Closed Fist
              if (gestureName === "Closed_Fist") {
                isFist = true;
                currentStatus = "✊ GRAB (CATCH)";
              } 
              // 2. FISH: Open Palm
              else if (gestureName === "Open_Palm" || gestureName === "Victory") {
                isWaving = true;
                currentStatus = "🖐️ FISHING";
              } 
              // 3. MOVE: Pointing Up
              else if (gestureName === "Pointing_Up") {
                isPointing = true;
                currentStatus = "☝️ MOVING";
                
                if (results.landmarks && results.landmarks[0]) {
                    const tip = results.landmarks[0][8]; // Index finger tip
                    
                    const rawX = tip.x;
                    const rawY = tip.y;
                    
                    // Reduced sensitivity multiplier from 3 to 2 for slower, more controlled movement
                    move.x = (0.5 - rawX) * 2.0; 
                    move.y = (rawY - 0.5) * 2.0;

                    // Increased deadzone slightly to prevent drift
                    if (Math.abs(move.x) < 0.1) move.x = 0;
                    if (Math.abs(move.y) < 0.1) move.y = 0;
                    
                    // Clamp
                    move.x = Math.max(-1, Math.min(1, move.x));
                    move.y = Math.max(-1, Math.min(1, move.y));
                }
              }
               else {
                currentStatus = "✋ Hand Detected";
              }
            }

            updateDebugStatus(currentStatus);
            onGestureChange({ isFist, isWaving, isPointing, handPresent, move });
        } catch (e) {
            // console.error(e);
        }
      }
      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    if (permissionGranted && !loading) {
      predictWebcam();
    }

    return () => {
        isActive = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [loading, permissionGranted, onGestureChange]);

  return (
    <div className="absolute top-4 right-4 w-52 h-40 bg-slate-900 rounded-lg border-4 border-slate-700 shadow-xl overflow-hidden z-50">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover transform scale-x-[-1] opacity-60" 
      />
      
      {/* HUD Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-2 pointer-events-none">
          <div className="flex justify-center mb-2">
             <div className={`text-[10px] font-bold px-2 py-0.5 rounded shadow ${debugStatus.includes("MOVING") ? "bg-blue-500 text-white" : debugStatus.includes("FISHING") ? "bg-green-500 text-white" : debugStatus.includes("CATCH") ? "bg-red-500 text-white" : "bg-black/50 text-gray-300"}`}>
                {debugStatus}
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-1 text-[8px] text-white/80 text-center font-mono">
             <div className="bg-slate-800/80 p-1 rounded border border-white/10">
                ☝️ POINT<br/>TO MOVE
             </div>
             <div className="bg-slate-800/80 p-1 rounded border border-white/10">
                🖐️ PALM<br/>TO FISH
             </div>
             <div className="bg-slate-800/80 p-1 rounded border border-white/10">
                ✊ FIST<br/>TO CATCH
             </div>
          </div>
      </div>
    </div>
  );
};