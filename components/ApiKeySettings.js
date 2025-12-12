import React from "https://esm.sh/react@19";

export function ApiKeySettings() {
  return React.createElement(
    "div",
    { className: "w-full max-w-lg px-4" },
    React.createElement(
      "div",
      { className: "bg-white rounded-2xl shadow border border-slate-200 p-4 mb-4" },
      React.createElement("div", { className: "text-sm font-bold text-slate-700 mb-2" }, "API Key Settings (placeholder)"),
      React.createElement("input", {
        className: "w-full border rounded-xl px-3 py-2 text-sm",
        placeholder: "Paste your API key here (optional)",
        type: "password",
      })
    )
  );
}
