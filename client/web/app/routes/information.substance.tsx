import { useEffect, useState } from "react";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import { Layout } from "~/components/layout/view/layout";
import { fetchSubstanceInformation } from "~/utils/actions";
import { Loader } from "~/components/loader";

export const loader = () => {
  return { baseUrl: process.env.SERVER_URL ?? "" };
};

function capitalizeEachWord(text: string) {
  return text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function SubstanceInformation() {
  const { baseUrl } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const infoUrl = searchParams.get("url");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!infoUrl) {
      setError("Missing url param");
      setLoading(false);
      return;
    }

    fetchSubstanceInformation(baseUrl, infoUrl)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [infoUrl]);

  if (loading)
    return (
      <Layout>
        <div className="p-8 text-center text-accent2">
          <Loader />
        </div>
      </Layout>
    );

  if (error)
    return (
      <Layout>
        <div className="p-8 text-red-500">{error}</div>
      </Layout>
    );

  if (!data) return null;

  const sectionsTop = ["RELATED VAULTS", "EXPERIENCES"];
  const topSections = data.sections.filter((s: any) =>
    sectionsTop.includes(s.section)
  );
  const otherSections = data.sections.filter(
    (s: any) => !sectionsTop.includes(s.section)
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6 font-spacegrotesk">
        <button
          onClick={() => navigate(-1)}
          className="text-baseColor hidden md:inline-block hover:text-accent mb-4 transition"
        >
          ← Back
        </button>

        <h1 className="text-2xl md:text-3xl font-silkscreen text-accent mb-4">
          {data.substance_name}
        </h1>

        <div className="space-y-2 text-accent2 mb-4 text-sm md:text-base">
          <p>
            <strong className="text-accent">Common Names:</strong>{" "}
            {data.summary.common_names}
          </p>
          <p>
            <strong className="text-accent">Effects Classification:</strong>{" "}
            {data.summary.effects_classification}
          </p>
          <p>
            <strong className="text-accent">Chemical Name:</strong>{" "}
            {data.summary.chemical_name}
          </p>
        </div>

        <p className="text-baseColor text-sm md:text-base mb-6">
          {data.summary.description}
        </p>

        {infoUrl && (
          <a
            href={`/explore/substance?url=${encodeURIComponent(infoUrl)}`}
            className="inline-block mb-8 px-4 py-2 rounded-md bg-accent text-background font-medium text-sm transition hover:opacity-90"
          >
            Visit Vault →
          </a>
        )}

        {topSections.map((section: any) => (
          <div key={section.section} className="mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-accent mb-2">
              {capitalizeEachWord(section.section)}
            </h2>
            <ul className="space-y-1 text-sm md:text-base">
              {section.links.map((link: any) => {
                const href = (() => {
                  if (section.section === "RELATED VAULTS") {
                    return `/information/substance?url=${encodeURIComponent(
                      link.href
                    )}`;
                  }
                  if (section.section === "EXPERIENCES" && infoUrl) {
                    if (link.title.toLowerCase().includes("more")) {
                      return `/explore/substance?url=${encodeURIComponent(
                        infoUrl
                      )}`;
                    }
                    return `/experience/view?url=${encodeURIComponent(
                      link.href
                    )}`;
                  }
                  return link.href;
                })();

                const internal =
                  href.startsWith("/") ||
                  href.includes(window?.location?.origin);

                return (
                  <li key={link.href}>
                    <a
                      href={href}
                      target={internal ? "_self" : "_blank"}
                      rel="noopener noreferrer"
                      className="text-accent2 underline hover:opacity-80 transition"
                    >
                      {capitalizeEachWord(link.title)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="mb-10">
          <h2 className="text-lg md:text-xl font-semibold text-accent mb-2">
            Summary Links
          </h2>
          <ul className="space-y-1 text-sm md:text-base">
            {data.summary_links.map((link: any) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent2 underline hover:opacity-80 transition"
                >
                  {capitalizeEachWord(link.title)}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {otherSections.map((section: any) => (
          <div key={section.section} className="mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-accent mb-2">
              {capitalizeEachWord(section.section)}
            </h2>
            <ul className="space-y-1 text-sm md:text-base">
              {section.links.map((link: any) => {
                const href = link.href;
                const internal =
                  href.startsWith("/") ||
                  href.includes(window?.location?.origin);

                return (
                  <li key={link.href}>
                    <a
                      href={href}
                      target={internal ? "_self" : "_blank"}
                      rel="noopener noreferrer"
                      className="text-accent2 underline hover:opacity-80 transition"
                    >
                      {capitalizeEachWord(link.title)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Layout>
  );
}
