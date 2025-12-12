import React from "https://esm.sh/react@19";
import {
  FilesetResolver,
  GestureRecognizer,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";

// 小工具
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function GestureController({ onGestureChange }) {
  const videoRef = React.useRef(null);

  const [permissionGranted, setPermissionGranted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [debugStatus, setDebugStatus] = React.useState("Initializing AI...");

  const lastVideoTimeRef = React.useRef(-1);
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
        updateDebugStatus("AI Error");
        setLoading(false);
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
          setPermissionGranted(true);
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

      if (
        recognizer &&
        video &&
        !video.paused &&
        video.currentTime !== lastVideoTimeRef.current
      ) {
        lastVideoTimeRef.current = video.currentTime;

        try {
          const results = recognizer.recognizeForVideo(video, Date.now());

          let isFist = false;
          let isWaving = false;   // Open Palm
          let isPointing = false; // Moving
          let handPresent = false;
          let move = { x: 0, y: 0 };
          let currentStatus = "No Hand";

          if (results?.gestures?.length > 0 && results.gestures[0]?.length > 0) {
            handPresent = true;
            const gestureName = results.gestures[0][0].categoryName;

            // 1) CATCH: Closed Fist
            if (gestureName === "Closed_Fist") {
              isFist = true;
              currentStatus = "✊ GRAB (CATCH)";
            }
            // 2) FISH: Open Palm / Victory
            else if (gestureName === "Open_Palm" || gestureName === "Victory") {
              isWaving = true;
              currentStatus = "🖐️ FISHING";
            }
            // 3) MOVE: Pointing Up + index tip control
            else if (gestureName === "Pointing_Up") {
              isPointing = true;
              currentStatus = "☝️ MOVING";

              if (results.landmarks && results.landmarks[0] && results.landmarks[0][8]) {
                const tip = results.landmarks[0][8]; // index finger tip

                // 你原来的逻辑：x 镜像 + 灵敏度 2.0 + deadzone 0.1 + clamp
                const rawX = tip.x;
                const rawY = tip.y;

                move.x = (0.5 - rawX) * 2.0;
                move.y = (rawY - 0.5) * 2.0;

                if (Math.abs(move.x) < 0.1) move.x = 0;
                if (Math.abs(move.y) < 0.1) move.y = 0;

                move.x = clamp(move.x, -1, 1);
                move.y = clamp(move.y, -1, 1);
              }
            } else {
              currentStatus = "✋ Hand Detected";
            }
          }

          updateDebugStatus(currentStatus);

          onGestureChange?.({
            isFist,
            isWaving,
            isPointing,
            handPresent,
            move,
          });
        } catch (e) {
          // 这里保持你原来做法：静默吞掉偶发推理异常
        }
      }

      rafRef.current = requestAnimationFrame(predictWebcam);
    };

    // 只要二者都 ready，开始推理
    // 注意：permissionGranted/loading 是 state，会触发 effect 重新跑，所以这里我们只在 effect 内启动一次循环，
    // 循环内部会检查 recognizer/video 是否 ready。
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

  // HUD 颜色逻辑（完全按你原来的 includes 判断）
  const hudClass =
    debugStatus.includes("MOVING")
      ? "bg-blue-500 text-white"
      : debugStatus.includes("FISHING")
      ? "bg-green-500 text-white"
      : debugStatus.includes("CATCH")
      ? "bg-red-500 text-white"
      : "bg-black/50 text-gray-300";

  // UI：右上角小窗 + 叠加HUD
  return React.createElement(
    "div",
    { className: "absolute top-4 right-4 w-52 h-40 bg-slate-900 rounded-lg border-4 border-slate-700 shadow-xl overflow-hidden z-50" },

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
          "☝️ POINT",
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
