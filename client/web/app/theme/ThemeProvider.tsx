import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = string;

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: Theme[];
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const availableThemes: Theme[] = [
  "lysergic",
  "psychedelic",
  "cyberdelic",
  "vaporwave",
  "alchemy",
];

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("theme");
      if (stored && availableThemes.includes(stored as Theme))
        return stored as Theme;
    }
    return "vaporwave";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
