import { useEffect, useRef } from "react";
import { useFeed } from "~/context/feedContext";
import { ExperienceCard } from "~/components/dashboard/experienceCard";
import { Loader } from "../loader";
import { Toaster } from "sonner";

export const FeedList = ({ baseUrl }: { baseUrl: string }) => {
  const { feed, loading, appendMore, refreshFeed } = useFeed();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    refreshFeed(baseUrl);
  }, []);

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
      <Toaster />
      {feed.map((exp, i) => (
        <ExperienceCard key={`${exp.url}-${i}`} exp={exp} />
      ))}
      <div ref={sentinelRef} />
      {loading && (
        <p className="font-spacegrotesk text-accent2 animate-pulse">
          Loading Feed...
        </p>
      )}
    </>
  );
};
