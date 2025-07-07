import { json, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Layout } from "~/components/layout/view/layout";
import { CategoryFeed } from "~/components/explore/category/categoryFeed";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) throw redirect("/explore");
  return json({ categoryUrl: url, baseUrl: process.env.SERVER_URL ?? "" });
}

export default function CategoryPage() {
  const { baseUrl, categoryUrl } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex flex-col w-full">
        <div className="hidden md:flex md:justify-start px-4 py-3 border-b border-accent">
          <button
            onClick={() => navigate(-1)}
            className="text-sm font-medium text-accent2 hover:opacity-80  w-full transition"
          >
            ← Back
          </button>
        </div>

        <div className="flex flex-col w-full">
          <CategoryFeed
            baseUrl={baseUrl}
            categoryUrl={categoryUrl}
            pageSize={20}
          />
        </div>
      </div>
    </Layout>
  );
}
