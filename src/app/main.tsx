import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startStores } from "../state/stores";
import { App } from "./App";
import "./styles/app.css";

void startStores();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
