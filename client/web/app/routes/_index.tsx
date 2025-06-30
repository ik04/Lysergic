import { useLoaderData } from "@remix-run/react";

import { Layout } from "~/components/layout/layout";
import { DashboardLoaderData } from "~/types/dashboard";
import { ExperienceCard } from "~/components/dashboard/experienceCard";
import { useFeed } from "~/context/feedContext";
import { FeedList } from "~/components/dashboard/feedList";
import { MetaFunction } from "@remix-run/node";

const Dashboard = () => {
  const { baseUrl } = useLoaderData<DashboardLoaderData>();
  console.log("Dashboard baseUrl:", baseUrl);

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

export const meta: MetaFunction = () => {
  return [
    { charSet: "utf-8" },
    { title: "Dashboard | Lysergic" },
    {
      name: "description",
      content: "Your personalized dashboard showing curated experiences.",
    },
  ];
};
