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

    // API Key Settings
    React.createElement(ApiKeySettings, null),

    // header
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
          React.createElement("span", { className: "text-lg" }, "☝️"),
          " Point to Move"
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

    // Webcam Component
    React.createElement(GestureController, { onGestureChange: handleGestureChange }),

    // Main Game Canvas
    React.createElement(GameWorld, { gestureState }),

    // footer
    React.createElement(
      "footer",
      { className: "mt-8 text-xs text-slate-400 max-w-lg text-center" },
      "Powered by Google Gemini API & MediaPipe.",
      React.createElement("br"),
      "Keep your hand visible. ",
      React.createElement("span", { className: "text-[#003580] font-bold" }, "Release fist to close popup.")
    )
  );
}
