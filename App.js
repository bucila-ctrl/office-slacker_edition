import React from "https://esm.sh/react@19";
import { GameWorld } from "./components/GameWorld.js";
import { GestureController } from "./components/GestureController.js";
import { ApiKeySettings } from "./components/ApiKeySettings.js";
import { initialGestureState } from "./types.js";

export default function App() {
  const [gestureState, setGestureState] = React.useState(initialGestureState);

  const handleGestureChange = React.useCallback((newState) => {
    setGestureState(newState);
  }, []);

  return React.createElement(
    "div",
    { className: "min-h-screen bg-slate-100 flex flex-col items-center py-6 font-sans" },

    React.createElement(ApiKeySettings, null),

    React.createElement(
      "header",
      { className: "mb-4 text-center" },
      React.createElement(
        "h1",
        { className: "text-3xl font-extrabold text-[#003580] tracking-tight" },
        "🏢 Office Fish ",
        React.createElement("span", { className: "text-[#febb02]" }, "Hunter")
      ),
      React.createElement(
        "div",
        { className: "mt-3 flex gap-3 justify-center text-xs font-bold text-slate-600" },
        React.createElement(
          "span",
          { className: "bg-white px-3 py-1.5 rounded-full shadow border border-slate-200 flex items-center gap-2" },
          React.createElement("span", { className: "text-lg" }, "✌️"),
          " Victory to Move"
        ),
        React.createElement(
          "span",
          { className: "bg-white px-3 py-1.5 rounded-full shadow border border-slate-200 flex items-center gap-2" },
          React.createElement("span", { className: "text-lg" }, "🖐️"),
          " Palm to Fish"
        ),
        React.createElement(
          "span",
          { className: "bg-white px-3 py-1.5 rounded-full shadow border border-slate-200 flex items-center gap-2" },
          React.createElement("span", { className: "text-lg" }, "✊"),
          " Fist to Catch"
        )
      )
    ),

    // 摄像头 HUD（右上角 fixed 的那块在 GestureController 内实现）
    React.createElement(GestureController, { onGestureChange: handleGestureChange }),

    // ✅ 缩放容器：给上方 UI + 右上角摄像头留空间
    React.createElement(
      "div",
      {
        className: "w-full flex-1 flex items-center justify-center",
        style: { height: "calc(100vh - 140px)" },
      },
      React.createElement(GameWorld, { gestureState })
    ),

    React.createElement(
      "footer",
      { className: "mt-4 text-xs text-slate-400 max-w-lg text-center" },
      "Powered by MediaPipe. ",
      React.createElement("br"),
      "Keep your hand visible. ",
      React.createElement("span", { className: "text-[#003580] font-bold" }, "Release fist to close popup.")
    )
  );
}
