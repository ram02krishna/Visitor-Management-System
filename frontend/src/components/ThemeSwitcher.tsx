import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export const ThemeSwitcher = ({ className = "" }: { className?: string }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vms_theme");
      // Default to light theme
      return saved === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("vms_theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("vms_theme", "light");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDarkMode}
      onClick={toggleTheme}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 border select-none ${
        isDarkMode
          ? "bg-slate-800 border-slate-700 focus-visible:ring-offset-slate-900"
          : "bg-slate-200 border-slate-300 focus-visible:ring-offset-white"
      } ${className}`}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none text-slate-400 dark:text-slate-500">
        <Sun className={`h-3.5 w-3.5 transition-opacity duration-200 ${isDarkMode ? "opacity-40" : "opacity-0"}`} />
        <Moon className={`h-3.5 w-3.5 transition-opacity duration-200 ${isDarkMode ? "opacity-0" : "opacity-40"}`} />
      </div>

      <span
        className={`pointer-events-none flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out dark:bg-slate-900 ${
          isDarkMode ? "translate-x-6 text-indigo-400" : "translate-x-0 text-amber-500"
        }`}
      >
        {isDarkMode ? (
          <Moon className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Sun className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
};
