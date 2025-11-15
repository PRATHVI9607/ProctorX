// frontend/src/hooks/useExamMonitor.js
import { useEffect } from "react";
import { reportViolation } from "../services/monitoringService";

export function useExamMonitor({ examId, active }) {
  useEffect(() => {
    if (!active || !examId) return;

    function handleKeyDown(e) {
      // Block most dangerous shortcuts
      const forbiddenKeys = [
        "F12",
        "F11",
      ];
      if (forbiddenKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        reportViolation(examId, `Pressed ${e.key}`).catch(console.error);
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        reportViolation(examId, "Tried shortcut combination").catch(
          console.error
        );
      }
    }

    function handleContextMenu(e) {
      e.preventDefault();
      reportViolation(examId, "Right click").catch(console.error);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        reportViolation(examId, "Tab change / minimized").catch(console.error);
      }
    }

    function handleCopy(e) {
      e.preventDefault();
      reportViolation(examId, "Copy").catch(console.error);
    }

    function handlePaste(e) {
      e.preventDefault();
      reportViolation(examId, "Paste").catch(console.error);
    }

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    const beforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      reportViolation(examId, "Attempted to leave page").catch(console.error);
      return "";
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [examId, active]);
}
