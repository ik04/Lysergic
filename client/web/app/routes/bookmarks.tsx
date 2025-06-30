import { useEffect, useState } from "react";
import { ExperienceCard } from "~/components/dashboard/experienceCard";
import { Layout } from "~/components/layout/layout";
import { getBookmarks } from "~/utils/actions";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  useEffect(() => {
    const stored = getBookmarks();
    setBookmarks(stored);
  }, []);

  return (
    <Layout>
      <>
        {bookmarks.length === 0 ? (
          <div className="p-6 text-center text-muted text-sm text-accent font-spacegrotesk">
            No bookmarks found.
          </div>
        ) : (
          <>
            {bookmarks.map((exp, idx) => (
              <ExperienceCard exp={exp} />
            ))}
          </>
        )}
      </>
    </Layout>
  );
}
