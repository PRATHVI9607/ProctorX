// frontend/src/hooks/useFullscreenMonitor.js
import { useEffect, useState } from "react";

export function useFullscreenMonitor({ enabled, onExitFullscreen }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    async function enterFullscreen() {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.error("Fullscreen error:", err);
      }
    }

    enterFullscreen();

    function handleChange() {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs && typeof onExitFullscreen === "function") {
        onExitFullscreen();
      }
    }

    document.addEventListener("fullscreenchange", handleChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [enabled, onExitFullscreen]);

  return isFullscreen;
}
