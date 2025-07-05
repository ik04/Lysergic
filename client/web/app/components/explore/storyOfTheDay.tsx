import { useEffect, useState } from "react";
import { fetchRandomStory } from "~/utils/actions";
import { Loader } from "~/components/loader";
import { randrange } from "~/utils/utils";
import { Link } from "@remix-run/react";

const DAILY_KEY = `story-${new Date().toISOString().slice(0, 10)}`;
const storyGif = `/assets/trippy/pattern${randrange(1, 4)}.gif`;

export function StoryOfTheDay({ baseUrl }: { baseUrl: string }) {
  const [story, setStory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem(DAILY_KEY);
    if (cached) {
      setStory(JSON.parse(cached));
      setLoading(false);
      return;
    }

    fetchRandomStory(baseUrl ?? "").then((d) => {
      if (d.success) {
        setStory(d.experience);
        localStorage.setItem(DAILY_KEY, JSON.stringify(d.experience));
      }
      setLoading(false);
    });
  }, [baseUrl]);

  return (
    <section className="space-y-2">
      <h2 className="text-lg md:text-3xl font-silkscreen text-accent">
        Story of the day
      </h2>
      <Link
        to={`/experience/view?url=${encodeURIComponent(story?.url)}`}
        className="relative flex flex-col md:flex-row md:items-center gap-4 rounded-2xl border border-dashed border-accent bg-background overflow-hidden"
      >
        <div className="flex-1 h-40 md:h-[20rem]">
          <img
            src={storyGif}
            alt=""
            className="w-full h-full object-cover md:object-cover"
          />
        </div>

        <div className="flex-1 px-4 pb-4">
          {loading ? (
            <Loader />
          ) : story ? (
            <div className="space-y-2">
              <h3 className="font-silkscreen text-accent text-lg md:text-3xl">
                {story.title}
              </h3>
              <p className="text-xs md:text-lg text-accent2">
                {story.substance} • {story.author}
              </p>
              <p className="line-clamp-5 whitespace-pre-wrap text-sm md:text-base">
                {story.content}
              </p>
            </div>
          ) : (
            <p className="text-sm">No story available today.</p>
          )}
        </div>
      </Link>
    </section>
  );
}
