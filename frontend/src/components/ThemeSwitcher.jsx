// frontend/src/components/ThemeSwitcher.jsx
import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="button" onClick={toggleTheme}>
      {theme === "dark" ? "☀️ Light" : "🌙 Night"}
    </button>
  );
}
