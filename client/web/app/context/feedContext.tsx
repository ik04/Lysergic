// app/context/FeedContext.tsx
import React, { createContext, useContext, useState } from "react";
import { Experience } from "~/types/dashboard";
import {
  generateFeedFromCache,
  loadOrGenerateInfoUrls,
  loadSubstances,
} from "~/utils/actions";

type FeedCtx = {
  feed: Experience[];
  loading: boolean;
  appendMore: (baseUrl: string) => Promise<void>;
  refreshFeed: (baseUrl: string) => Promise<void>;
};

const FeedContext = createContext<FeedCtx | undefined>(undefined);

export const FeedProvider = ({ children }: { children: React.ReactNode }) => {
  const [feed, setFeed] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const refreshFeed = async (baseUrl: string) => {
    if (hasFetched) return;
    setLoading(true);

    await loadSubstances(baseUrl);
    await loadOrGenerateInfoUrls(baseUrl);

    const { feed: fresh } = await generateFeedFromCache(baseUrl, 10);

    const uniqueFeed = Array.from(
      new Map(fresh.map((f: any) => [f.url, f])).values()
    );

    setFeed(uniqueFeed);
    setHasFetched(true);
    setLoading(false);
  };

  const appendMore = async (baseUrl: string) => {
    console.log("entered function append feed");
    if (loading) return;
    setLoading(true);
    const { feed: extra } = await generateFeedFromCache(baseUrl, 5);
    setFeed((prev: any) => [...prev, ...extra]);
    setLoading(false);
  };

  return (
    <FeedContext.Provider value={{ feed, loading, refreshFeed, appendMore }}>
      {children}
    </FeedContext.Provider>
  );
};

export const useFeed = () => {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be used inside FeedProvider");
  return ctx;
};
