import { useEffect, useRef } from "react";
import { useFeed } from "~/context/feedContext";
import { ExperienceCard } from "~/components/dashboard/experienceCard";

export const FeedList = ({ baseUrl }: { baseUrl: string }) => {
  const { feed, loading, appendMore, refreshFeed } = useFeed();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    refreshFeed(baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) appendMore(baseUrl);
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [baseUrl, appendMore]);

  return (
    <>
      {feed.map((exp, i) => (
        <ExperienceCard key={`${exp.url}-${i}`} exp={exp} />
      ))}
      <div ref={sentinelRef} />
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-dashed rounded-full animate-spin border-accent" />
            <div className="absolute inset-1 border-4 border-dotted rounded-full animate-slow-spin border-accent2 opacity-60" />
          </div>
        </div>
      )}
    </>
  );
};
