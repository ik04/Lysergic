import axios from "axios";
import { WithInfoUrl } from "~/types/dashboard";
import {
  collectInfoUrls,
  getCachedSubstanceLinks,
  getCachedSubstances,
  setCachedSubstanceLinks,
  setCachedSubstances,
} from "./utils";

export const fetchSubstances = async <T = unknown[]>(
  baseUrl: string
): Promise<T> => {
  const url = `${baseUrl}/erowid/substances`;
  const { data } = await axios.get<T>(url);
  return data;
};

export const loadSubstances = async (baseUrl: string) => {
  const cached: any = getCachedSubstances();
  if (cached) {
    return;
  }

  try {
    const response: any = await fetchSubstances(baseUrl);
    setCachedSubstances(response);
  } catch (err) {
    console.error("Failed to fetch substances:", err);
  }
};

export const loadOrGenerateInfoUrls = async (baseUrl: string) => {
  const cachedLinks = getCachedSubstanceLinks();
  if (cachedLinks) {
    return cachedLinks;
  }

  const cachedSubstances = getCachedSubstances();
  const response: any = cachedSubstances ?? (await fetchSubstances(baseUrl));
  if (!cachedSubstances) {
    setCachedSubstances(response.data);
  }

  const links: any = collectInfoUrls(response.data);
  if (links.length !== 0) {
    setCachedSubstanceLinks(links);
    return links;
  }
};

export const generateFeed = async (
  baseUrl: string,
  size: number,
  urls: string[]
) => {
  const url = `${baseUrl}/erowid/random/experiences?size_per_substance=${size}`;
  const response = await axios.post(url, {
    urls,
  });
  console.log("Generated feed response:", response.data);

  return response.data;
};

export const generateFeedFromCache = async (baseUrl: string, size: number) => {
  const urls = getCachedSubstanceLinks();
  if (!urls) {
    console.warn("No cached substance links found");
    return { feed: [] };
  }

  return await generateFeed(baseUrl, size, urls);
};

export const fetchExperience = async (baseUrl: string, url: string) => {
  const response = await axios.post(
    `${baseUrl}/erowid/experience`,
    { url },
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data;
};

const BOOKMARK_KEY = "bookmarkedExperiences";

export const getBookmarks = (): any[] =>
  JSON.parse(localStorage.getItem(BOOKMARK_KEY) ?? "[]");

export const saveBookmark = (exp: any): boolean => {
  const list = getBookmarks();
  console.log("Current bookmarks list:", list);
  console.log("Trying to save experience with URL:", exp.url);

  const exists =
    Array.isArray(list) &&
    list.some(
      (bookmark) =>
        bookmark && bookmark.url && exp && exp.url && bookmark.url === exp.url
    );

  console.log("Bookmark already exists:", exists);

  if (!exists) {
    const newList = [exp, ...list];
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(newList));
    console.log("Bookmark saved successfully. New list:", newList);
    return true;
  }

  console.log("Bookmark already exists, not saving");
  return false; // Already exists, not saved
};

export const removeBookmark = (url: string): boolean => {
  const list = getBookmarks();
  const newList = list.filter((e) => e.url !== url);
  if (newList.length !== list.length) {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(newList));
    return true;
  }
  return false;
};

export const fetchRandomStory = async (baseUrl: string, size = 1) => {
  const substanceUrls = await loadOrGenerateInfoUrls(baseUrl);
  console.log(substanceUrls);

  const res = await fetch(
    `${baseUrl}/erowid/random/experience?size_per_substance=${size}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: substanceUrls }),
    }
  );
  return res.json() as Promise<{
    success: boolean;
    experience: any | null;
  }>;
};

export async function fetchSubstanceCategories(
  baseUrl: string,
  substanceUrl: string
) {
  const res = await fetch(`${baseUrl}/erowid/experiences/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: substanceUrl }),
  });
  return res.json() as Promise<{
    status: string;
    has_experiences: boolean;
    experiences_url: string | null;
    categories: Record<
      string,
      { name: string; url: string; experience_count: number }
    > | null;
  }>;
}

export const fetchSubstanceInformation = async (
  baseUrl: string,
  infoUrl: string
) => {
  const res = await fetch(
    `${baseUrl}/erowid/information?url=${encodeURIComponent(infoUrl)}`
  );
  if (!res.ok) throw new Error("Failed to fetch substance information");
  return res.json();
};
