import { useEffect, useRef, useState } from "react";
import { useFeed } from "~/context/feedContext";
import { ExperienceCard } from "~/components/dashboard/experienceCard";
import { Toaster } from "sonner";

export const FeedList = ({ baseUrl }: { baseUrl: string }) => {
  const { feed, loading, appendMore, refreshFeed } = useFeed();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [showSlowNotice, setShowSlowNotice] = useState(false);

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

  useEffect(() => {
    if (!loading) {
      setShowSlowNotice(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSlowNotice(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <>
      <Toaster />

      {feed.map((exp, i) => (
        <ExperienceCard key={`${exp.url}-${i}`} exp={exp} />
      ))}

      <div ref={sentinelRef} />

      {loading && (
        <div className="p-3 text-center space-y-2">
          <p className="font-silkscreen text-accent transition-all ease-in-out font-semibold italic animate-pulse md:text-2xl">
            Loading Feed...
          </p>

          {showSlowNotice && (
            <p className="md:text-sm text-xs transition-all ease-in-out text-accent2 font-silkscreen text-muted-foreground italic animate-pulse">
              This might take a few seconds (crawling Erowid is a bit tedious.)
              :(
            </p>
          )}
        </div>
      )}
    </>
  );
};
