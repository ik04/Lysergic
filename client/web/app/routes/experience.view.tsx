import { defer, LoaderFunction } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import { fetchExperience } from "~/utils/actions";
import { Layout } from "~/components/layout/view/layout";
import { ArrowLeft } from "lucide-react";
import { Loader } from "~/components/loader";

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url).searchParams.get("url");
  if (!url || !url.startsWith("http"))
    throw new Response("Bad URL", { status: 400 });

  const promise = fetchExperience(process.env.SERVER_URL || "", url);
  return defer({ experience: promise });
};

export default function ExperienceViewPage() {
  const { experience } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [exp, setExp] = useState<any | null>(null);

  experience
    .then((data: any) => {
      setExp(data.data);
    })
    .catch((err: any) => console.error("fetchExperience failed:", err))
    .finally(() => setLoading(false));

  return (
    <Layout>
      <div className="p-4 max-w-2xl md:max-w-full mx-auto text-baseColor h-full">
        <button
          onClick={() =>
            history.length > 1 ? navigate(-1) : navigate("/dashboard")
          }
          className="hidden md:flex items-center gap-1 text-baseColor hover:text-accent mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {loading || !exp ? (
          <Loader />
        ) : (
          <>
            <h1 className="text-xl font-silkscreen md:text-3xl text-accent2 mb-1">
              {exp.title}
            </h1>
            <p className="text-sm text-muted mb-2 text-accent md:text-lg pl-1">
              by {exp.author} • {exp.substances} • {exp.metadata.published}
            </p>

            <div className="text-xs text-muted mb-4 flex flex-wrap gap-x-4 gap-y-1 pl-1 md:text-lg font-spacegrotesk text-accent2">
              <p>
                <strong>Gender:</strong> {exp.metadata.gender}
              </p>
              <p>
                <strong>Age:</strong> {exp.metadata.age}
              </p>
              <p>
                <strong>Views:</strong> {exp.metadata.views}
              </p>
            </div>

            {/* doses */}
            {exp.doses?.length > 0 && (
              <div className="text-xs text-muted mb-6 space-y-1 pl-1">
                <h2 className="text-sm font-bold text-accent">Doses</h2>
                {exp.doses.map((d: any, i: number) => {
                  const info = [
                    d.substance,
                    d.form && `${d.form}`,
                    d.method && `via ${d.method}`,
                    d.amount && `– ${d.amount}`,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <p className="text-accent text-xs md:text-base" key={i}>
                      • {info}
                    </p>
                  );
                })}
              </div>
            )}

            <article className="prose prose-invert whitespace-pre-wrap max-w-none font-spacegrotesk text-[15px] md:leading-relaxed text-sm md:text-lg text-baseColor">
              {exp.content}
            </article>
          </>
        )}
      </div>
    </Layout>
  );
}
