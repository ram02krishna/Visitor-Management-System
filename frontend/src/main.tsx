import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

let wasDark = false;
window.addEventListener("beforeprint", () => {
  wasDark = document.documentElement.classList.contains("dark");
  if (wasDark) {
    document.documentElement.classList.remove("dark");
  }
});
window.addEventListener("afterprint", () => {
  if (wasDark) {
    document.documentElement.classList.add("dark");
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
