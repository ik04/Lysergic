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

  if (bookmarks.length === 0) {
    return (
      <div className="p-6 text-center text-muted text-sm">
        No bookmarks found.
      </div>
    );
  }

  return (
    <Layout>
      <>
        {bookmarks.map((exp, idx) => (
          <ExperienceCard exp={exp} />
        ))}
      </>
    </Layout>
  );
}
