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
      {loading ? (
        <div className="flex justify-center items-center h-[80vh]">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-dashed rounded-full animate-spin border-accent" />
            <div className="absolute inset-1 border-4 border-dotted rounded-full animate-slow-spin border-accent2 opacity-60" />
          </div>
        </div>
      ) : (
        <div className="">
          {feed.map((exp, i) => (
            <ExperienceCard key={i} exp={exp} />
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;

export const loader = async () => {
  const baseUrl = process.env.SERVER_URL ?? "";
  return { baseUrl };
};
