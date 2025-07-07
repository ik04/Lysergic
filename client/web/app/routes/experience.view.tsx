import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { useEffect, useState } from "react";
import {
  fetchExperience,
  getBookmarks,
  removeBookmark,
  saveBookmark,
} from "~/utils/actions";
import { Layout } from "~/components/layout/view/layout";
import { ArrowLeft, Bookmark } from "lucide-react";
import { Loader } from "~/components/loader";
import DOMPurify from "dompurify";
import { highlightErowidNotes } from "~/utils/utils";

export const loader = async () => {
  const baseUrl = process.env.SERVER_URL ?? "";
  return { baseUrl };
};

export default function ExperienceViewPage() {
  const [searchParams] = useSearchParams();
  const { baseUrl } = useLoaderData<{ baseUrl: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [experience, setExperience] = useState<any | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const url = searchParams.get("url");

  useEffect(() => {
    if (!url || !url.startsWith("http")) {
      navigate("/dashboard");
      return;
    }

    const load = async () => {
      try {
        const data = await fetchExperience(baseUrl || "", url);
        const cleaned = DOMPurify.sanitize(
          highlightErowidNotes(data.data?.content)
        );
        data.data.content = cleaned;
        console.log(data.data.content);

        setExperience(data.data);

        const bookmarks = getBookmarks();
        const isMatch = bookmarks.some(
          (bookmark) => bookmark.url === data.data.url
        );
        setIsBookmarked(isMatch);
      } catch (err) {
        console.error("Failed to fetch experience:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [url, navigate]);

  const handleBookmark = () => {
    if (!experience) return;

    if (isBookmarked) {
      removeBookmark(experience.url);
      setIsBookmarked(false);
    } else {
      saveBookmark(experience);
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

        {loading || !experience ? (
          <Loader />
        ) : (
          <>
            <h1 className="text-xl font-silkscreen md:text-3xl text-accent mb-1">
              {experience.title}
            </h1>
            <p className="text-sm text-muted mb-4 text-accent md:text-lg pl-1">
              by {experience.author} • {experience.substance} •{" "}
              {experience.metadata.published}
            </p>

            <div className="text-xs text-muted mb-4 flex flex-wrap gap-x-4 gap-y-1 pl-1 md:text-lg font-spacegrotesk text-accent2">
              <p>
                <strong>Gender:</strong> {experience.metadata.gender}
              </p>
              <p>
                <strong>Age:</strong> {experience.metadata.age}
              </p>
              <p>
                <strong>Views:</strong> {experience.metadata.views}
              </p>
            </div>

            {experience.doses?.length > 0 && (
              <div className="text-xs text-muted mb-6 space-y-1 pl-1">
                <h2 className="text-sm font-bold text-accent">Doses</h2>
                {experience.doses.map((d: any, i: number) => {
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

            <article
              dangerouslySetInnerHTML={{ __html: experience.content }}
              className="prose prose-invert whitespace-pre-wrap max-w-none font-spacegrotesk md:leading-relaxed text-sm md:text-lg text-baseColor pb-10"
            />
          </>
        )}
      </div>
    </Layout>
  );
}
