import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "@remix-run/react";
import { Palette, Home, Compass, BookOpen, Info } from "lucide-react";
import { useTheme } from "~/theme/ThemeProvider";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const navlinks = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Explore", href: "/settings", icon: Compass },
    { name: "Bookmarks", href: "/bookmarks", icon: BookOpen },
    { name: "Information", href: "/information", icon: Info },
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-baseColor font-spacegrotesk">
      <nav className="flex items-center justify-between px-4 py-3 border-b border-gray-500">
        <div className="flex items-center gap-2">
          <img src="/assets/logo.svg" className="h-7" alt="" />
          <span className="text-base font-pressstart font-bold text-accent">
            Lysergic
          </span>
        </div>
        <div className="flex items-center gap-4 relative">
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-125 hover:rotate-45 transition-all duration-200"
            aria-label="Theme Switcher"
            onClick={() => setOpen((v) => !v)}
            tabIndex={0}
          >
            <Palette className="w-5 h-5 text-accent" />
          </button>
          {open && (
            <div
              ref={dropdownRef}
              className="absolute right-0 top-10 z-50 bg-background border border-gray-500 rounded shadow-md min-w-[8rem] font-silkscreen text-xs"
            >
              <ul className="py-2">
                {themes.map((t) => (
                  <li key={t}>
                    <button
                      onClick={() => {
                        setTheme(t);
                        setOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 hover:text-accent2 transition uppercase ${
                        theme === t
                          ? "font-bold text-accent"
                          : "text-baseColor font-semibold"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* profile */}
          {/* <div className="w-8 h-8 bg-gray-200 rounded-full" /> */}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>

      {/* Bottom Nav */}
      <nav className="flex justify-between items-center border-t border-gray-500 bg-background text-[11px]">
        {navlinks.map(({ name, href, icon: Icon }) => {
          const isActive = location.pathname === href;
          return (
            <Link
              key={name}
              to={href}
              className={`flex flex-col items-center justify-center w-full py-2 transition ${
                isActive ? "text-accent font-bold" : "text-baseColor"
              } hover:text-accent`}
              prefetch="intent"
            >
              <Icon className="w-4 h-4 mb-1" />
              {name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
