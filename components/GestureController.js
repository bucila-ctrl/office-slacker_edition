import React from "https://esm.sh/react@19";
import {
  FilesetResolver,
  GestureRecognizer,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// 判断手指是否伸直：y 越小越“向上伸”
function isFingerUp(lm, tip, pip) {
  return lm[tip].y < lm[pip].y - 0.02;
}

// 只数“四根手指”（index/middle/ring/pinky），不算拇指
function countUpFingers(lm) {
  const indexUp = isFingerUp(lm, 8, 6);
  const middleUp = isFingerUp(lm, 12, 10);
  const ringUp = isFingerUp(lm, 16, 14);
  const pinkyUp = isFingerUp(lm, 20, 18);

  let c = 0;
  if (indexUp) c++;
  if (middleUp) c++;
  if (ringUp) c++;
  if (pinkyUp) c++;
  return c;
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: { ideal: 30 }, facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play().catch(() => {});
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
          let isWaving = false;   // Open Palm -> Fishing
          let isPointing = false; // 我们复用这个字段：表示“在移动”
          let handPresent = false;

          // ✅ 离散方向移动：只输出 -1/0/1
          let move = { x: 0, y: 0 };

          let currentStatus = "No Hand";

          // 有手
          if (results?.landmarks?.length > 0 && results.landmarks[0]?.length) {
            handPresent = true;

            // 先看识别到的手势名（Closed_Fist / Open_Palm / 其它）
            let gestureName = "";
            if (results?.gestures?.length > 0 && results.gestures[0]?.length > 0) {
              gestureName = results.gestures[0][0].categoryName || "";
            }

            // 1) ✊ 抓鱼：优先级最高
            if (gestureName === "Closed_Fist") {
              isFist = true;
              currentStatus = "✊ GRAB (CATCH)";
            }
            // 2) 🖐️ 摸鱼：Open_Palm
            else if (gestureName === "Open_Palm") {
              isWaving = true;
              currentStatus = "🖐️ FISHING";
            }
            // 3) 其它情况：用“数手指”来做方向键
            else {
              const lm = results.landmarks[0];
              const n = countUpFingers(lm);

              // ✅ 速度特别慢：让 GameWorld 的 dx/dy 变成很小的值
              // 你 GameWorld 里是 dx * PLAYER_SPEED，所以这里直接给 0.25 当“慢速步伐”
              const step = 0.25;

              if (n === 1) {
                isPointing = true;
                move.x = -step; move.y = 0;
                currentStatus = "👆(1) LEFT";
              } else if (n === 2) {
                isPointing = true;
                move.x = step; move.y = 0;
                currentStatus = "✌️(2) RIGHT";
              } else if (n === 3) {
                isPointing = true;
                move.x = 0; move.y = -step;
                currentStatus = "🤟(3) UP";
              } else if (n === 4) {
                isPointing = true;
                move.x = 0; move.y = step;
                currentStatus = "🖖(4) DOWN";
              } else {
                currentStatus = "✋ Hand Detected";
              }
            }
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
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [onGestureChange, updateDebugStatus]);

  const hudClass =
    debugStatus.includes("LEFT") || debugStatus.includes("RIGHT") || debugStatus.includes("UP") || debugStatus.includes("DOWN")
      ? "bg-blue-500 text-white"
      : debugStatus.includes("FISHING")
      ? "bg-green-500 text-white"
      : debugStatus.includes("CATCH")
      ? "bg-red-500 text-white"
      : "bg-black/50 text-gray-300";

  // ✅ fixed：永远右上角
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
        { className: "grid grid-cols-4 gap-1 text-[8px] text-white/80 text-center font-mono" },
        React.createElement("div", { className: "bg-slate-800/80 p-1 rounded border border-white/10" }, "1指\nLEFT"),
        React.createElement("div", { className: "bg-slate-800/80 p-1 rounded border border-white/10" }, "2指\nRIGHT"),
        React.createElement("div", { className: "bg-slate-800/80 p-1 rounded border border-white/10" }, "3指\nUP"),
        React.createElement("div", { className: "bg-slate-800/80 p-1 rounded border border-white/10" }, "4指\nDOWN")
      ),

      React.createElement(
        "div",
        { className: "grid grid-cols-2 gap-1 mt-1 text-[8px] text-white/80 text-center font-mono" },
        React.createElement("div", { className: "bg-slate-800/80 p-1 rounded border border-white/10" }, "🖐️ PALM\nFISH"),
        React.createElement("div", { className: "bg-slate-800/80 p-1 rounded border border-white/10" }, "✊ FIST\nCATCH")
      )
    )
  );
}
