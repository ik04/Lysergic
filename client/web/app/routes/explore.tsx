// app/routes/explore.tsx
import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useLoaderData } from "@remix-run/react";
import { Layout } from "~/components/layout/layout";
import { loadSubstances } from "~/utils/actions";
import { getCachedSubstances } from "~/utils/utils";

import {
  FlaskConical,
  Leaf,
  BrainCircuit,
  Pill,
  Sprout,
  HelpCircle,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  chemicals: FlaskConical,
  plants: Leaf,
  smart_drugs: BrainCircuit,
  pharmaceuticals: Pill,
  herbs: Sprout,
};
const iconFor = (category: string): LucideIcon => ICONS[category] ?? HelpCircle;
const pretty = (c: string) =>
  c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

const TileIcon = ({ category }: { category: string }) => {
  const Icon = iconFor(category);
  return <Icon className="w-6 h-6 mb-1 shrink-0" />;
};

export const loader = () => {
  return { baseUrl: process.env.SERVER_URL ?? "" };
};

export default function ExplorePage() {
  const { baseUrl } = useLoaderData<typeof loader>();
  const [substances, setSubstances] = useState<any>({});
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const cached: any = getCachedSubstances();
    if (cached) {
      setSubstances(cached.data ?? cached);
    } else {
      loadSubstances(baseUrl).then(() => {
        const fresh: any = getCachedSubstances();
        setSubstances(fresh?.data ?? fresh ?? {});
      });
    }
  }, [baseUrl]);

  const categories = useMemo(
    () => Object.keys(substances).filter((k) => Array.isArray(substances[k])),
    [substances]
  );

  const allItems = useMemo(() => {
    return categories.flatMap((cat) =>
      (substances[cat] ?? []).map((s: any) => ({ ...s, _cat: cat }))
    );
  }, [substances, categories]);

  const filteredItems = useMemo(() => {
    let baseList = category
      ? allItems.filter((s) => s._cat === category)
      : allItems;

    if (!query) return baseList;

    const fuse = new Fuse(baseList, { keys: ["name"], threshold: 0.35 });
    return fuse.search(query).map((r) => r.item);
  }, [allItems, category, query]);

  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, 20);

  return (
    <Layout>
      <div className="p-4 max-w-7xl mx-auto space-y-8 text-baseColor">
        <h1 className="italic text-accent text-lg font-silkscreen">
          “Not all those who wander are lost.”
          <br />
          <p className="font-spacegrotesk text-accent2">— J.R.R. Tolkien</p>
        </h1>
        {/* story of the day */}

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = iconFor(cat);
            const active = cat === category;
            return (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat === category ? null : cat);
                  setQuery("");
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-full border text-sm transition ${
                  active
                    ? "bg-accent border-accent text-black"
                    : "border-accent text-accent hover:bg-accent hover:text-black"
                }`}
              >
                <Icon className="w-4 h-4" />
                {pretty(cat)}
              </button>
            );
          })}
          {category && (
            <button
              onClick={() => {
                setCategory(null);
                setQuery("");
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-full border border-muted text-muted hover:text-black hover:bg-muted/30 text-sm"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder={`Search ${
            category ? pretty(category) : "substances"
          }...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-2 border border-accent rounded-md bg-background text-baseColor"
        />

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {visibleItems.map((item, idx) => (
            <a
              key={idx}
              href={item.info_url}
              target="_blank"
              rel="noreferrer"
              className="aspect-square rounded-xl border border-accent bg-baseColor/5
                         flex flex-col items-center justify-center text-center1
                         text-sm font-medium text-accent p-3 hover:bg-accent/10"
            >
              <TileIcon category={item._cat} />
              <span className="truncate">{item.name}</span>
            </a>
          ))}
          {filteredItems.length === 0 && (
            <p className="text-muted col-span-full text-center">
              No matches found.
            </p>
          )}
        </div>

        {/* Show All Button */}
        {!showAll && filteredItems.length > 20 && (
          <div className="text-center">
            <button
              onClick={() => setShowAll(true)}
              className="mt-2 text-accent hover:underline text-sm"
            >
              Show All ({filteredItems.length})
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
