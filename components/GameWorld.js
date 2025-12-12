import React from "https://esm.sh/react@19";

export function GameWorld({ gestureState }) {
  return React.createElement(
    "div",
    { className: "w-full max-w-lg px-4" },
    React.createElement(
      "div",
      { className: "bg-white rounded-2xl shadow border border-slate-200 p-6" },
      React.createElement("div", { className: "font-bold mb-2" }, "GameWorld (placeholder)"),
      React.createElement("pre", { className: "text-xs text-slate-600 whitespace-pre-wrap" }, JSON.stringify(gestureState, null, 2))
    )
  );
}
