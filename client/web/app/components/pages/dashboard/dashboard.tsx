import { useTheme } from "~/theme/ThemeProvider";

export const Dashboard = () => {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="mb-6">
        <label htmlFor="theme-select" className="mr-2 font-medium">
          Select Theme:
        </label>
        <select
          id="theme-select"
          value={theme}
          onChange={(e) => setTheme(e.target.value as typeof theme)}
          className="border rounded px-2 py-1"
        >
          {themes.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded p-6 border" style={{ minHeight: 120 }}>
        <p>
          <strong>Current theme:</strong> <span>{theme}</span>
        </p>
        <p className="mt-2 text-gray-500">
          Try switching themes above. You can now test your theme system here!
        </p>
      </div>
    </div>
  );
};
