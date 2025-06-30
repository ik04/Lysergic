import { useLoaderData } from "@remix-run/react";

import { Layout } from "~/components/layout/layout";
import { DashboardLoaderData } from "~/types/dashboard";
import { ExperienceCard } from "~/components/dashboard/experienceCard";
import { useFeed } from "~/context/feedContext";
import { FeedList } from "~/components/dashboard/feedList";

const Dashboard = () => {
  const { baseUrl } = useLoaderData<DashboardLoaderData>();

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
