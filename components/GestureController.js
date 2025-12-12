import React from "https://esm.sh/react@19";

export function GestureController({ onGestureChange }) {
  // 占位：点击按钮模拟一个 gesture 变化
  return React.createElement(
    "div",
    { className: "w-full max-w-lg px-4" },
    React.createElement(
      "div",
      { className: "bg-white rounded-2xl shadow border border-slate-200 p-4 mb-4 flex items-center justify-between" },
      React.createElement("div", { className: "text-sm text-slate-700" }, "GestureController (placeholder)"),
      React.createElement(
        "button",
        {
          className: "px-3 py-2 rounded-xl bg-slate-900 text-white text-sm",
          onClick: () =>
            onGestureChange?.({
              isWaving: true,
              isFist: false,
              isPointing: false,
              handPresent: true,
              move: { x: 1, y: 0 },
            }),
        },
        "模拟🖐️"
      )
    )
  );
}
