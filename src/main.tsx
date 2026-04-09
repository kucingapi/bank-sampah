import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import "./index.css";

// Expose seed function in dev console
import { seedBankSampah } from "./shared/lib/seed";
if (import.meta.env.DEV) {
  (window as any).seedBankSampah = seedBankSampah;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
