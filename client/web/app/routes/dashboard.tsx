import { useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import {
  generateFeedFromCache,
  loadOrGenerateInfoUrls,
  loadSubstances,
} from "~/utils/actions";
import { Layout } from "~/components/layout/layout";
import { DashboardLoaderData } from "~/types/dashboard";
import { ExperienceCard } from "~/components/dashboard/experienceCard";
import { useFeed } from "~/context/feedContext";
import { FeedList } from "~/components/dashboard/feedList";

const Dashboard = () => {
  const { baseUrl } = useLoaderData<DashboardLoaderData>();
  const hasFetched = useRef(false);

  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const init = async () => {
      setLoading(true);

      try {
        await loadSubstances(baseUrl);
        await loadOrGenerateInfoUrls(baseUrl);
        const result = await generateFeedFromCache(baseUrl, 10);
        setFeed(result.feed || []);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [baseUrl]);

  return (
    <Layout>
      <FeedList baseUrl={baseUrl} />
    </Layout>
  );
};

export default Dashboard;

export const loader = async () => {
  const baseUrl = process.env.SERVER_URL ?? "";
  return { baseUrl };
};
