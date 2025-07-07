import { useEffect, useState, useMemo } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, useNavigate } from "@remix-run/react";
import {
  BookOpen,
  Sparkles,
  Layers,
  ClipboardList,
  UtensilsCrossed,
  Flame,
  Skull,
  HeartPulse,
  TrainFront,
  Syringe,
  Sun,
  Star,
  Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Layout } from "~/components/layout/view/layout";
import { fetchSubstanceCategories } from "~/utils/actions";
import { Loader } from "~/components/loader";

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) throw redirect("/explore");
  return json({
    url,
    base: process.env.SERVER_URL ?? "",
  });
};

const ICONS: Record<string, LucideIcon> = {
  General: BookOpen,
  "First Times": Sparkles,
  Combinations: Layers,
  "Retrospective / Summary": ClipboardList,
  "Preparation / Recipes": UtensilsCrossed,
  "Difficult Experiences": Flame,
  "Bad Trips": Skull,
  "Health Problems": HeartPulse,
  "Train Wrecks & Trip Disasters": TrainFront,
  "Addiction & Habituation": Syringe,
  "Glowing Experiences": Sun,
  "Mystical Experiences": Star,
  "Health Benefits": Heart,
};

const getSubstanceNameFromUrl = (url: string): string | null => {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 2] : null;
  } catch {
    return null;
  }
};

export default function SubstancePage() {
  const { url, base } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Record<
    string,
    { name: string; url: string; experience_count: number }
  > | null>(null);

  useEffect(() => {
    fetchSubstanceCategories(base, decodeURIComponent(url))
      .then((d) => {
        if (!d.has_experiences || !d.categories) {
          navigate("/explore?alert=No%20experiences%20found");
        } else {
          setCategories(d.categories);
        }
      })
      .finally(() => setLoading(false));
  }, [base, url, navigate]);

  const cards = useMemo(() => {
    if (!categories) return [];
    return Object.values(categories).map((c) => ({
      ...c,
      Icon: ICONS[c.name] ?? BookOpen,
    }));
  }, [categories]);

  return (
    <Layout>
      <div className="px-4 pb-10 md:px-0 md:pb-0 md:p-5 max-w-5xl mx-auto space-y-3 md:space-y-1 text-baseColor">
        <button
          onClick={() =>
            history.length > 1 ? navigate(-1) : navigate("/explore")
          }
          className="hidden md:flex items-center gap-1 text-baseColor hover:text-accent"
        >
          ← Back
        </button>

        <h1 className="font-silkscreen text-accent text-xl md:text-3xl leading-tight py-3">
          {getSubstanceNameFromUrl(url)} Categories
        </h1>

        {loading && <Loader />}

        {!loading && cards.length === 0 && (
          <p className="text-muted">
            No experiences available for this substance.
          </p>
        )}

        {!loading && cards.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {cards.map(({ name, url: catUrl, experience_count, Icon }) => (
              <Link
                key={name}
                to={`/explore/category?url=${encodeURIComponent(catUrl)}`}
                className="flex flex-col items-center justify-center gap-2 border border-accent rounded-xl p-4 transition text-center min-h-32 md:min-h-36"
              >
                <Icon className="w-6 h-6 text-accent2" />
                <span className="font-medium font-spacegrotesk text-xs md:text-sm text-accent2">
                  {name}
                </span>
                <span className="text-xs text-accent">{experience_count}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
