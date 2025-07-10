import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { Layout } from "~/components/layout/layout";
import { loadSubstances } from "~/utils/actions";
import { getCachedSubstances } from "~/utils/utils";
import { toast, Toaster } from "sonner";
import { useNavigate } from "@remix-run/react";

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
import { StoryOfTheDay } from "~/components/explore/storyOfTheDay";

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
  return <Icon className="w-6 h-6 mb-1 shrink-0 text-accent2" />;
};

export const loader = () => {
  return { baseUrl: process.env.SERVER_URL ?? "" };
};

export default function ExplorePage() {
  const { baseUrl } = useLoaderData<typeof loader>();
  const [substances, setSubstances] = useState<any>({});
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [searchParams] = useSearchParams();
  const alertMsg = searchParams.get("alert");
  const navigate = useNavigate();

  useEffect(() => {
    if (alertMsg) {
      toast.error(
        <div className="font-spacegrotesk text-base">{alertMsg}</div>
      );

      const params = new URLSearchParams(searchParams);
      params.delete("alert");
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [alertMsg, navigate, searchParams]);

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
      <Toaster />
      <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-4 md:space-y-8 text-baseColor">
        <h1 className="italic text-accent text-2xl md:text-4xl font-silkscreen">
          Information
        </h1>

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
              className="flex items-center gap-1 px-3 py-1 rounded-full border border-error text-error transition duration-150 hover:text-background hover:bg-error text-sm"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        <input
          type="text"
          placeholder={`Search ${
            category ? pretty(category) : "substances"
          }...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-2 border border-accent font-silkscreen rounded-md bg-background text-baseColor"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {visibleItems.map((item, idx) => (
            <Link
              key={idx}
              to={`/information/substance?url=${encodeURIComponent(
                item.info_url
              )}`}
              rel="noreferrer"
              className="aspect-square rounded-xl border border-accent 
                         flex flex-col items-center justify-center text-center1
                         text-sm font-medium bg-transparent p-3"
            >
              <TileIcon category={item._cat} />
              <span className="truncate text-accent2">{item.name}</span>
            </Link>
          ))}
          {filteredItems.length === 0 && (
            <p className="text-muted col-span-full text-center">
              No matches found.
            </p>
          )}
        </div>

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
