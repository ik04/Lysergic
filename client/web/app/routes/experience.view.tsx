import { LoaderFunctionArgs, json, MetaFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  fetchExperience,
  getBookmarks,
  removeBookmark,
  saveBookmark,
} from "~/utils/actions";
import { useEffect, useState } from "react";
import { Layout } from "~/components/layout/view/layout";
import { ArrowLeft, Bookmark } from "lucide-react";
import { Loader } from "~/components/loader";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url || !url.startsWith("http"))
    throw new Response("Bad URL", { status: 400 });
  const baseUrl = process.env.SERVER_URL ?? "";

  return { url, baseUrl };
}

export default function ExperienceViewPage() {
  const { url, baseUrl } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [exp, setExp] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchExperience(baseUrl || "", url)
      .then((res) => {
        setExp(res.data);
        const isMatch = getBookmarks().some((b) => b.url === res.data.url);
        setIsBookmarked(isMatch);
      })
      .catch((err) => console.error("fetchExperience failed:", err))
      .finally(() => setLoading(false));
  }, [url]);

  const handleBookmark = () => {
    if (!exp) return;
    if (isBookmarked) {
      removeBookmark(exp.url);
      setIsBookmarked(false);
    } else {
      saveBookmark({
        title: exp.title,
        url: exp.url,
        author: exp.author,
        substance: exp.substances,
        date: exp.metadata?.published,
      });
      setIsBookmarked(true);
    }
  };

  return (
    <Layout>
      <div className="p-4 max-w-2xl md:max-w-7xl mx-auto text-baseColor h-full">
        <button
          onClick={() =>
            history.length > 1 ? navigate(-1) : navigate("/dashboard")
          }
          className="hidden md:flex items-center gap-1 text-baseColor hover:text-accent mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {loading || !exp ? (
          <Loader />
        ) : (
          <>
            <h1 className="text-xl font-silkscreen md:text-3xl text-accent mb-1">
              {exp.title}
            </h1>
            <p className="text-sm text-muted mb-4 text-accent md:text-lg pl-1">
              by {exp.author} • {exp.substances} • {exp.metadata.published}
            </p>

            <div className="text-xs text-muted mb-4 flex flex-wrap gap-x-4 gap-y-1 pl-1 md:text-lg font-spacegrotesk text-accent2">
              <p>
                <strong>Gender:</strong> {exp.metadata.gender}
              </p>
              <p>
                <strong>Age:</strong> {exp.metadata.age}
              </p>
              <p>
                <strong>Views:</strong> {exp.metadata.views}
              </p>
            </div>

            {exp.doses?.length > 0 && (
              <div className="text-xs text-muted mb-6 space-y-1 pl-1">
                <h2 className="text-sm font-bold text-accent">Doses</h2>
                {exp.doses.map((d: any, i: number) => {
                  const info = [
                    d.substance,
                    d.form && `${d.form}`,
                    d.method && `via ${d.method}`,
                    d.amount && `– ${d.amount}`,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <p className="text-accent2 text-xs md:text-base" key={i}>
                      • {info}
                    </p>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleBookmark}
              className={`mb-4 flex items-center gap-1 px-3 py-1 rounded-full border ${
                isBookmarked
                  ? "bg-accent border-accent text-black"
                  : "border-accent text-accent"
              } hover:bg-accent hover:text-black text-xs font-bold transition`}
            >
              <Bookmark
                className="w-4 h-4"
                fill={isBookmarked ? "currentColor" : "none"}
              />
              {isBookmarked ? "Bookmarked" : "Bookmark"}
            </button>

            <article className="prose prose-invert whitespace-pre-wrap max-w-none font-spacegrotesk md:leading-relaxed text-sm md:text-lg text-baseColor pb-10">
              {exp.content}
            </article>
          </>
        )}
      </div>
    </Layout>
  );
}

export const meta: MetaFunction<typeof loader> = () => [
  { charSet: "utf-8" },
  { title: "Experience | Lysergic" },
  {
    name: "description",
    content: "Read a detailed psychedelic experience report.",
  },
];
