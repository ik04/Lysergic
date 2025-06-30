import { defer, LoaderFunctionArgs } from "@remix-run/node";
import { Await, useLoaderData, useNavigate } from "@remix-run/react";
import {
  fetchExperience,
  getBookmarks,
  removeBookmark,
  saveBookmark,
} from "~/utils/actions";
import { Suspense, useEffect, useState } from "react";
import { Layout } from "~/components/layout/view/layout";
import { ArrowLeft, Bookmark } from "lucide-react";
import { Loader } from "~/components/loader";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url || !url.startsWith("http")) {
    throw new Response("Bad URL", { status: 400 });
  }

  const promise = fetchExperience(process.env.SERVER_URL || "", url);
  return defer({ experience: promise });
}

export default function ExperienceViewPage() {
  const { experience } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

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

        <Suspense fallback={<Loader />}>
          <Await resolve={experience}>
            {(experience: any) => (
              <ExperienceContent experience={experience.data} />
            )}
          </Await>
        </Suspense>
      </div>
    </Layout>
  );
}

function ExperienceContent({ experience }: { experience: any }) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const bookmarks = getBookmarks();
    console.log("Bookmarks:", bookmarks);
    console.log("Current isBookmarked state:", isBookmarked);

    const isMatch =
      Array.isArray(bookmarks) &&
      bookmarks.some(
        (bookmark) =>
          bookmark &&
          bookmark.url &&
          experience &&
          experience.url &&
          bookmark.url === experience.url
      );

    console.log("URL match found:", isMatch);
    setIsBookmarked(isMatch);
  }, [experience?.url]);

  const handleBookmark = () => {
    if (isBookmarked) {
      console.log("Removing bookmark for:", experience.url);
      const success = removeBookmark(experience.url);
      if (success) {
        setIsBookmarked(false);
        console.log("Bookmark removed successfully");
      } else {
        console.log("Failed to remove bookmark - not found");
      }
    } else {
      console.log("Saving bookmark:", experience);
      const success = saveBookmark(experience);
      if (success) {
        setIsBookmarked(true);
        console.log("Bookmark saved successfully");
      } else {
        console.log("Bookmark already exists - not saved");
        setIsBookmarked(true);
      }
    }
  };

  return (
    <>
      <h1 className="text-xl font-silkscreen md:text-3xl text-accent mb-1">
        {experience.title}
      </h1>
      <p className="text-sm text-muted mb-4 text-accent md:text-lg pl-1">
        by {experience.author} • {experience.substances} •{" "}
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

      <article className="prose prose-invert whitespace-pre-wrap max-w-none font-spacegrotesk md:leading-relaxed text-sm md:text-lg text-baseColor pb-10">
        {experience.content}
      </article>
    </>
  );
}
