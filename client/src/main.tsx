import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./register-sw";

const clearCachesAndReload = async () => {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Ignore cache clear failures.
  }
  window.location.reload();
};

window.addEventListener("vite:preloadError", () => {
  void clearCachesAndReload();
});

window.addEventListener("error", (event) => {
  const message = typeof event.message === "string" ? event.message : "";
  if (
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module")
  ) {
    void clearCachesAndReload();
  }
});

// Register service worker for PWA functionality
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
