import axios from "axios";
import { useEffect, useState, useRef, useCallback, RefObject } from "react";
import { ExperienceCard } from "~/components/dashboard/experienceCard";
import { Loader } from "~/components/loader";
import { useIntersectionObserver } from "~/hooks/useIntersectionObserver";
import type {
  ApiResponse,
  CategoryFeedProps,
  Experience,
} from "~/types/explore";

export function CategoryFeed({
  baseUrl,
  categoryUrl,
  pageSize = 20,
}: CategoryFeedProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(true);
  const [start, setStart] = useState(0);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ------------ first page ------------
  const firstFetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.post<ApiResponse>(
        `${baseUrl}/erowid/category/experiences`,
        { url: categoryUrl },
        { params: { start: 0, max: pageSize } }
      );

      setExperiences(res.data.experiences ?? []);
      setHasNext(res.data.pagination?.has_next ?? false);
      setStart(pageSize);
    } catch (e) {
      console.error("initial fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, categoryUrl, pageSize]);

  // ------------ next pages ------------
  const nextFetch = useCallback(async () => {
    if (!hasNext || loading) return;
    setLoading(true);
    try {
      const res = await axios.post<ApiResponse>(
        `${baseUrl}/erowid/category/experiences`,
        { url: categoryUrl },
        { params: { start, max: pageSize } }
      );

      setExperiences((prev) => [...prev, ...(res.data.experiences ?? [])]);
      setHasNext(res.data.pagination?.has_next ?? false);
      setStart((prev) => prev + pageSize);
    } catch (e) {
      console.error("scroll fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, categoryUrl, start, pageSize, hasNext, loading]);

  // run once
  useEffect(() => {
    firstFetch();
  }, [firstFetch]);

  // trigger on scroll
  useIntersectionObserver({
    target: sentinelRef as RefObject<HTMLDivElement>,
    onIntersect: nextFetch,
    enabled: hasNext,
    rootMargin: "200px",
  });

  return (
    <>
      {experiences.map((exp, i) => (
        <ExperienceCard key={`${exp.url}-${i}`} exp={exp} />
      ))}

      <div ref={sentinelRef} />

      {loading && <Loader />}

      {!loading && !hasNext && experiences.length === 0 && (
        <p className="text-center text-muted mt-4">No experiences found.</p>
      )}
    </>
  );
}
