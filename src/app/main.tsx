import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startStores } from "../state/stores";
import { App } from "./App";
import { IS_MAC } from "./platform";
import "./styles/app.css";

document.documentElement.classList.add(IS_MAC ? "platform-mac" : "platform-other");

void startStores();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
