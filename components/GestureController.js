import React from "https://esm.sh/react@19";
import {
  FilesetResolver,
  GestureRecognizer,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function GestureController({ onGestureChange }) {
  const videoRef = React.useRef(null);

  const [debugStatus, setDebugStatus] = React.useState("Initializing AI...");
  const [loading, setLoading] = React.useState(true);

  const lastVideoTime = React.useRef(-1);
  const gestureRecognizerRef = React.useRef(null);
  const lastStatusRef = React.useRef("");

  const streamRef = React.useRef(null);
  const rafRef = React.useRef(0);
  const isActiveRef = React.useRef(true);

  // 用于平滑移动（避免抖动）
  const smoothMoveRef = React.useRef({ x: 0, y: 0 });

  const updateDebugStatus = React.useCallback((status) => {
    if (lastStatusRef.current !== status) {
      lastStatusRef.current = status;
      setDebugStatus(status);
    }
  }, []);

  React.useEffect(() => {
    isActiveRef.current = true;

    const setupMediaPipe = async () => {
      try {
        updateDebugStatus("Loading Model...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        if (!isActiveRef.current) return;

        gestureRecognizerRef.current = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        setLoading(false);
        updateDebugStatus("AI Ready");
      } catch (err) {
        console.error("MediaPipe load error:", err);
        setLoading(false);
        updateDebugStatus("AI Error");
      }
    };

    const startCamera = async () => {
      try {
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
          updateDebugStatus("No Camera API");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 320,
            height: 240,
            frameRate: { ideal: 30 },
            facingMode: "user",
          },
          audio: false,
        });

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
        };
      } catch (error) {
        console.error("Camera permission denied:", error);
        updateDebugStatus("Camera Denied");
      }
    };

    setupMediaPipe();
    startCamera();

    const predictWebcam = () => {
      if (!isActiveRef.current) return;

      const recognizer = gestureRecognizerRef.current;
      const video = videoRef.current;

      if (recognizer && video && !video.paused && video.currentTime !== lastVideoTime.current) {
        lastVideoTime.current = video.currentTime;

        try {
          const results = recognizer.recognizeForVideo(video, Date.now());

          let isFist = false;
          let isWaving = false;   // Open Palm
          let isPointing = false; // 我们复用这个字段：现在表示“移动模式”
          let handPresent = false;
          let move = { x: 0, y: 0 };
          let currentStatus = "No Hand";

          if (results?.gestures?.length > 0 && results.gestures[0]?.length > 0) {
            handPresent = true;
            const gestureName = results.gestures[0][0].categoryName;

            // 1) ✊ CATCH
            if (gestureName === "Closed_Fist") {
              isFist = true;
              currentStatus = "✊ GRAB (CATCH)";

              // 握拳时把平滑残留清掉，避免松开后漂移
              smoothMoveRef.current.x = 0;
              smoothMoveRef.current.y = 0;
            }
            // 2) 🖐️ FISH
            else if (gestureName === "Open_Palm") {
              isWaving = true;
              currentStatus = "🖐️ FISHING";

              smoothMoveRef.current.x = 0;
              smoothMoveRef.current.y = 0;
            }
            // 3) ✌️ MOVE（两指）
            else if (gestureName === "Victory") {
              isPointing = true;
              currentStatus = "✌️ MOVING (SLOW)";

              if (results.landmarks && results.landmarks[0]) {
                const lm = results.landmarks[0];

                // ✅ 用手掌中心（wrist(0) + middle_mcp(9)）更稳
                const wrist = lm[0];
                const midMcp = lm[9];
                const cx = (wrist.x + midMcp.x) / 2;
                const cy = (wrist.y + midMcp.y) / 2;

                // 归一化到 -1..1（x 镜像让视觉更自然）
                const rawX = (0.5 - cx) * 2.0;
                const rawY = (cy - 0.5) * 2.0;

                // ✅ 更大的死区：防漂移
                const dead = 0.20;

                // ✅ “特别慢”：把幅度整体缩小（核心）
                // 原来你是 *2.0，这里我们再 *0.25（约等于 1/4）
                const slowScale = 0.25;

                let vx = Math.abs(rawX) < dead ? 0 : clamp(rawX, -1, 1) * slowScale;
                let vy = Math.abs(rawY) < dead ? 0 : clamp(rawY, -1, 1) * slowScale;

                // ✅ 再做平滑：更丝滑更慢（t 越小越慢）
                const sm = smoothMoveRef.current;
                sm.x = lerp(sm.x, vx, 0.15);
                sm.y = lerp(sm.y, vy, 0.15);

                move.x = sm.x;
                move.y = sm.y;
              }
            } else {
              currentStatus = "✋ Hand Detected";
              smoothMoveRef.current.x = 0;
              smoothMoveRef.current.y = 0;
            }
          } else {
            smoothMoveRef.current.x = 0;
            smoothMoveRef.current.y = 0;
          }

          updateDebugStatus(currentStatus);
          onGestureChange?.({ isFist, isWaving, isPointing, handPresent, move });
        } catch (e) {
          // 静默吞掉偶发错误
        }
      }

      rafRef.current = requestAnimationFrame(predictWebcam);
    };

    rafRef.current = requestAnimationFrame(predictWebcam);

    return () => {
      isActiveRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [onGestureChange, updateDebugStatus]);

  const hudClass =
    debugStatus.includes("MOVING")
      ? "bg-blue-500 text-white"
      : debugStatus.includes("FISHING")
      ? "bg-green-500 text-white"
      : debugStatus.includes("CATCH")
      ? "bg-red-500 text-white"
      : "bg-black/50 text-gray-300";

  // ✅ fixed：永远右上角，不会滚丢
  return React.createElement(
    "div",
    {
      className:
        "fixed top-4 right-4 w-52 h-40 bg-slate-900 rounded-lg border-4 border-slate-700 shadow-xl overflow-hidden z-[999]",
    },

    React.createElement("video", {
      ref: videoRef,
      autoPlay: true,
      playsInline: true,
      muted: true,
      className: "w-full h-full object-cover transform scale-x-[-1] opacity-60",
    }),

    React.createElement(
      "div",
      { className: "absolute inset-0 flex flex-col justify-end p-2 pointer-events-none" },

      React.createElement(
        "div",
        { className: "flex justify-center mb-2" },
        React.createElement(
          "div",
          { className: `text-[10px] font-bold px-2 py-0.5 rounded shadow ${hudClass}` },
          loading ? "Loading..." : debugStatus
        )
      ),

      React.createElement(
        "div",
        { className: "grid grid-cols-3 gap-1 text-[8px] text-white/80 text-center font-mono" },

        React.createElement(
          "div",
          { className: "bg-slate-800/80 p-1 rounded border border-white/10" },
          "✌️ V",
          React.createElement("br"),
          "TO MOVE"
        ),
        React.createElement(
          "div",
          { className: "bg-slate-800/80 p-1 rounded border border-white/10" },
          "🖐️ PALM",
          React.createElement("br"),
          "TO FISH"
        ),
        React.createElement(
          "div",
          { className: "bg-slate-800/80 p-1 rounded border border-white/10" },
          "✊ FIST",
          React.createElement("br"),
          "TO CATCH"
        )
      )
    )
  );
}
