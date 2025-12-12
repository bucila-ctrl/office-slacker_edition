import React from "https://esm.sh/react@19";

// ✅ MediaPipe Tasks Vision (HandLandmarker)
// 说明：CodePen 官方示例用的是不带 +esm 的 jsdelivr import，这里用 +esm 更适合“纯 HTML ES Module”场景。
import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// 根据关键点判断四指是否伸直（index/middle/ring/pinky）
// landmark 坐标是归一化 0..1，y 越小越靠上
function fingerExtended(landmarks, tip, pip) {
  const TIP = landmarks[tip];
  const PIP = landmarks[pip];
  // 给一点阈值，减少抖动
  return TIP.y < PIP.y - 0.02;
}

function classifyGesture(landmarks) {
  // MediaPipe Hands landmarks index:
  // index tip 8, pip 6
  // middle tip 12, pip 10
  // ring tip 16, pip 14
  // pinky tip 20, pip 18
  const indexUp = fingerExtended(landmarks, 8, 6);
  const middleUp = fingerExtended(landmarks, 12, 10);
  const ringUp = fingerExtended(landmarks, 16, 14);
  const pinkyUp = fingerExtended(landmarks, 20, 18);

  const openPalm = indexUp && middleUp && ringUp && pinkyUp;
  const fist = !indexUp && !middleUp && !ringUp && !pinkyUp;
  const pointing = indexUp && !middleUp && !ringUp && !pinkyUp;

  return { openPalm, fist, pointing };
}

export function GestureController({ onGestureChange }) {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const landmarkerRef = React.useRef(null);
  const rafRef = React.useRef(0);
  const streamRef = React.useRef(null);

  const [status, setStatus] = React.useState("idle"); // idle | loading | running | error
  const [err, setErr] = React.useState("");

  // 平滑 move 输出
  const smoothMoveRef = React.useRef({ x: 0, y: 0 });

  const stop = React.useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("idle");
  }, []);

  const start = React.useCallback(async () => {
    try {
      setErr("");
      setStatus("loading");

      // 1) 摄像头
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Video element not found");
      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadeddata = resolve;
      });

      // 2) 加载 HandLandmarker
      // wasm 资源路径 + 模型 task 文件路径（官方示例同款结构）:contentReference[oaicite:1]{index=1}
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });

      setStatus("running");

      // 3) 逐帧检测
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      let lastVideoTime = -1;

      const loop = () => {
        const v = videoRef.current;
        const landmarker = landmarkerRef.current;

        if (!v || !landmarker) return;

        // 同步 canvas 尺寸
        if (canvas && (canvas.width !== v.videoWidth || canvas.height !== v.videoHeight)) {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
        }

        const now = performance.now();

        // 防止重复帧
        if (v.currentTime !== lastVideoTime) {
          lastVideoTime = v.currentTime;

          const res = landmarker.detectForVideo(v, now);

          // 画面（可选：你不想显示可注释掉）
          if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // 镜像显示更符合自拍习惯
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(v, -canvas.width, 0, canvas.width, canvas.height);
            ctx.restore();
          }

          if (res?.landmarks?.length) {
            const landmarks = res.landmarks[0];

            const { openPalm, fist, pointing } = classifyGesture(landmarks);

            // move：用食指指尖 (8) 的位置映射到 -1..1
            const tip = landmarks[8];
            // 镜像：因为我们画面镜像了，所以 x 也镜像一下
            const rawX = (1 - tip.x - 0.5) * 2; // -1..1
            const rawY = (tip.y - 0.5) * 2;     // -1..1（上负下正）

            const sm = smoothMoveRef.current;
            sm.x = lerp(sm.x, clamp(rawX, -1, 1), 0.25);
            sm.y = lerp(sm.y, clamp(rawY, -1, 1), 0.25);

            onGestureChange?.({
              isWaving: !!openPalm,     // 🖐️ Palm
              isFist: !!fist,           // ✊ Fist
              isPointing: !!pointing,   // ☝️ Point
              handPresent: true,
              move: { x: sm.x, y: sm.y },
            });
          } else {
            onGestureChange?.({
              isWaving: false,
              isFist: false,
              isPointing: false,
              handPresent: false,
              move: { x: 0, y: 0 },
            });
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.error(e);
      setErr(e?.message ? String(e.message) : String(e));
      setStatus("error");
      stop();
    }
  }, [onGestureChange, stop]);

  // 组件卸载时关闭摄像头
  React.useEffect(() => stop, [stop]);

  return React.createElement(
    "div",
    { className: "w-full max-w-lg px-4" },
    React.createElement(
      "div",
      { className: "bg-white rounded-2xl shadow border border-slate-200 p-4 mb-4" },

      React.createElement(
        "div",
        { className: "flex items-center justify-between gap-3" },
        React.createElement(
          "div",
          null,
          React.createElement("div", { className: "text-sm font-bold text-slate-800" }, "Webcam Gesture"),
          React.createElement(
            "div",
            { className: "text-xs text-slate-500 mt-1" },
            status === "idle" && "Ready",
            status === "loading" && "Loading model…",
            status === "running" && "Running",
            status === "error" && "Error"
          )
        ),

        React.createElement(
          "div",
          { className: "flex gap-2" },
          React.createElement(
            "button",
            {
              className:
                "px-3 py-2 rounded-xl bg-slate-900 text-white text-sm disabled:opacity-40",
              onClick: start,
              disabled: status === "loading" || status === "running",
            },
            "启用摄像头"
          ),
          React.createElement(
            "button",
            {
              className:
                "px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm disabled:opacity-40",
              onClick: stop,
              disabled: status !== "running" && status !== "loading",
            },
            "关闭"
          )
        )
      ),

      err
        ? React.createElement(
            "div",
            { className: "mt-3 text-xs text-red-600 whitespace-pre-wrap" },
            err
          )
        : null,

      // 预览画面（镜像）
      React.createElement(
        "div",
        { className: "mt-3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200" },
        React.createElement("video", {
          ref: videoRef,
          className: "hidden", // 我们用 canvas 显示镜像画面；想直接显示视频可改成 block
          autoPlay: true,
          playsInline: true,
          muted: true,
        }),
        React.createElement("canvas", {
          ref: canvasRef,
          className: "w-full h-auto",
        })
      )
    )
  );
}
