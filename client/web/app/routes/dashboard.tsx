import { useLoaderData } from "@remix-run/react";
import { useEffect } from "react";
import { loadOrGenerateInfoUrls, loadSubstances } from "~/utils/actions";
import { Layout } from "~/components/layout/layout";
import { DashboardLoaderData } from "~/types/dashboard";

const dashboard = () => {
  const { baseUrl } = useLoaderData<DashboardLoaderData>();

  useEffect(() => {
    loadSubstances(baseUrl);
    loadOrGenerateInfoUrls(baseUrl);
  }, [baseUrl]);

  return (
    <Layout>
      <div className="">ehdbdh</div>
    </Layout>
  );
};

export default dashboard;

export const loader = async () => {
  const baseUrl = process.env.SERVER_URL ?? "";
  return { baseUrl };
};
