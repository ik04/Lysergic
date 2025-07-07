import { useEffect } from "react";

export function useIntersectionObserver({
  target,
  onIntersect,
  threshold = 1.0,
  root = null,
  rootMargin = "0px",
  enabled = true,
}: {
  target: React.RefObject<HTMLElement>;
  onIntersect: () => void;
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && onIntersect(),
      {
        root,
        rootMargin,
        threshold,
      }
    );

    const el = target.current;
    if (!el) return;

    observer.observe(el);
    return () => observer.unobserve(el);
  }, [target, onIntersect, root, rootMargin, threshold, enabled]);
}
