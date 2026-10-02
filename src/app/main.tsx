import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startStores } from "../state/stores";
import { App } from "./App";
import { IS_MAC } from "./platform";
import "./styles/app.css";

document.documentElement.classList.add(IS_MAC ? "platform-mac" : "platform-other");

// Keep the native text menu (copy/paste) in fields; hide the web page menu everywhere else.
window.addEventListener("contextmenu", (e) => {
  const target = e.target as HTMLElement | null;
  if (!target?.closest("input, textarea, [contenteditable='true']")) e.preventDefault();
});

void startStores();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
