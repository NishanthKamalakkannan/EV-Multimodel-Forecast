import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LineChart,
  Map,
  Layers,
  Sparkles,
  Moon,
  Sun,
  ChevronLeft,
} from "lucide-react";

const navItems = [
  { to: "/forecast", label: "Forecasting", icon: LineChart },
  { to: "/infrastructure", label: "Infrastructure", icon: Map },
  { to: "/scenarios", label: "Scenarios", icon: Layers },
  { to: "/ai", label: "AI Insights", icon: Sparkles },
];

export default function Sidebar() {
  /* -----------------------------
     Collapsed state (persisted)
  ------------------------------ */
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed);
  }, [collapsed]);

  /* -----------------------------
     Dark mode state (persisted)
  ------------------------------ */
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } transition-all duration-300 flex flex-col
      bg-gradient-to-b from-slate-900 to-slate-800
      text-slate-100
      border-r border-slate-700/50
      shadow-lg`}
    >
      {/* ================= HEADER ================= */}
      <div
        className={`flex items-center justify-between px-4 py-6 border-b
        border-slate-700/50`}
      >
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">
              🔋 EV Intelligence
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Analytics Dashboard
            </p>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-white/10 transition"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* ================= NAVIGATION ================= */}
      <nav className="flex-1 px-2 py-6 space-y-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : ""}
            className={({ isActive }) =>
              `flex items-center ${
                collapsed ? "justify-center" : "gap-3 px-4"
              } py-2.5 rounded-xl text-sm font-medium transition-all
              ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 shadow-inner"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <Icon className="w-4 h-4 text-current opacity-90" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ================= FOOTER / UTILITIES ================= */}
      <div
        className={`px-2 py-3 border-t border-slate-700/50
        space-y-3`}
      >
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          title={collapsed ? "Toggle dark mode" : ""}
          className={`w-full flex items-center ${
            collapsed ? "justify-center" : "gap-2 px-3"
          } py-2 rounded-lg text-sm
          bg-slate-800
          text-slate-200
          hover:bg-slate-700 transition`}
        >
          {darkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          {!collapsed && (darkMode ? "Light Mode" : "Dark Mode")}
        </button>

        {!collapsed && (
          <p className="text-xs text-slate-400 text-center tracking-wide">
            v1.1 · Product Preview
          </p>
        )}
      </div>
    </aside>
  );
}