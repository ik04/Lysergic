import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@remix-run/react";
import {
  Palette,
  Home,
  Compass,
  BookOpen,
  Info,
  X,
  ArrowLeft,
} from "lucide-react";
import { useTheme } from "~/theme/ThemeProvider";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  /*  nav config  */
  const navlinks = [
    { name: "Home", href: "/", icon: Home },
    { name: "Explore", href: "/explore", icon: Compass },
    { name: "Bookmarks", href: "/bookmarks", icon: BookOpen },
    { name: "Information", href: "/information", icon: Info },
  ];

  /*  close / back handler  */
  const handleClose = () => {
    if (history.length > 1) navigate(-1);
    else navigate("/");
  };

  /*  close theme dropdown on outside click  */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-baseColor font-spacegrotesk">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center bg-background justify-between px-4 py-4 border-b border-accent">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="md:hidden flex items-center justify-center text-baseColor hover:text-accent"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <img
            src="/assets/logo.svg"
            className="h-7 hidden md:block"
            alt="Lysergic logo"
          />
          <span className="text-base hidden md:block font-pressstart font-bold text-accent">
            Lysergic
          </span>
        </div>

        <div className="relative">
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-125 hover:rotate-45 transition-all duration-200"
            aria-label="Theme Switcher"
            onClick={() => setOpen((v) => !v)}
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
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto pt-16 pb-16">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-between items-center border-t border-accent bg-background text-[11px]">
        {navlinks.map(({ name, href, icon: Icon }) => {
          const isActive = location.pathname === href;
          return (
            <Link
              key={name}
              to={href}
              prefetch="intent"
              className={`flex flex-col items-center justify-center w-full py-4 transition ${
                isActive ? "text-accent font-bold" : "text-baseColor"
              } hover:text-accent`}
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
