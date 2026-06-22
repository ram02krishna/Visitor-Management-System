import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { flushSync } from "react-dom";

export const ThemeSwitcher = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = (event?: React.MouseEvent) => {
    if (!document.startViewTransition) {
      setIsDarkMode((prev) => !prev);
      return;
    }

    // Get the click coordinates or fallback to viewport center
    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;

    // Radius: distance to the farthest corner of the viewport
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Suppress all per-element CSS transitions during the View Transition
    // so they don't fight the clip-path ripple and cause stutter.
    document.documentElement.classList.add("vt-active");

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setIsDarkMode((prev) => !prev);
      });
    });

    transition.ready.then(() => {
      // Always animate the NEW (destination) snapshot expanding from the
      // click point. The new snapshot sits on top (z-index 10000 in CSS)
      // with clip-path starting at a 0px circle, growing to full screen.
      // This unified strategy works cleanly for BOTH directions with no stutter.
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 600,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)", // Apple spring — fast start, smooth decel
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });

    // Re-enable per-element CSS transitions after the animation completes
    transition.finished.then(() => {
      document.documentElement.classList.remove("vt-active");
    }).catch(() => {
      document.documentElement.classList.remove("vt-active");
    });
  };

  return (
    <button
      onClick={(e) => toggleTheme(e)}
      className={`relative p-2.5 rounded-2xl transition-all duration-500 group overflow-hidden border shadow-sm hover:shadow-xl active:scale-95 ${isDarkMode
          ? "bg-slate-900 border-slate-800 text-yellow-400 hover:shadow-yellow-500/10"
          : "bg-white border-gray-100 text-slate-700 hover:shadow-sky-500/10"
        }`}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {/* Dynamic Background Glow */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${isDarkMode ? "from-yellow-500 to-transparent" : "from-sky-500 to-transparent"
        }`} />

      <div className="relative z-10 h-5 w-5 flex items-center justify-center">
        {/* Sun Icon: Rises up into view */}
        <Sun
          className={`absolute h-5 w-5 transition-all duration-500 transform ${isDarkMode
              ? "translate-y-8 scale-0 opacity-0 rotate-45"
              : "translate-y-0 scale-100 opacity-100 rotate-0"
            }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          strokeWidth={2.5}
        />

        {/* Moon Icon: Slides in from the side */}
        <div
          className={`absolute h-5 w-5 transition-all duration-500 transform ${isDarkMode
              ? "translate-x-0 scale-100 opacity-100 rotate-0"
              : "-translate-x-8 scale-0 opacity-0 -rotate-45"
            }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        >
          <Moon className="h-5 w-5" strokeWidth={2.5} fill="currentColor" />
        </div>
      </div>
    </button>
  );
};
