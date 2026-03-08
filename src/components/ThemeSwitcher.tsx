import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export const ThemeSwitcher = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsAnimating(true);
    const newIsDarkMode = !isDarkMode;

    setTimeout(() => {
      setIsDarkMode(newIsDarkMode);
      if (newIsDarkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      setIsAnimating(false);
    }, 150);
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2.5 text-gray-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-slate-800 group"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <div
        className={`transition-all duration-300 ${isAnimating ? "rotate-180 scale-0" : "rotate-0 scale-100"}`}
      >
        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </div>
    </button>
  );
};
