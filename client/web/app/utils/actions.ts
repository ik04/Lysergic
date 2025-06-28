import axios from "axios";
import { WithInfoUrl } from "~/types/dashboard";
import {
  collectInfoUrls,
  getCachedSubstanceLinks,
  getCachedSubstances,
  setCachedSubstanceLinks,
  setCachedSubstances,
} from "./utils";

export const generateFeed = async (
  baseUrl: string,
  size: number,
  urls: string[]
) => {
  const url = `${baseUrl}/erowid/random/experiences?size_per_substance=${size}`;
  const response = await axios.post(url, {
    urls,
  });
  return response.data;
};

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
    console.log("Using cached substances:", cached);

    return;
  }

  try {
    const response: any = await fetchSubstances(baseUrl);
    setCachedSubstances(response);
    console.log("Fetched and cached substances:", response);
  } catch (err) {
    console.error("Failed to fetch substances:", err);
  }
};

export const loadOrGenerateInfoUrls = async (baseUrl: string) => {
  const cachedLinks = getCachedSubstanceLinks();
  if (cachedLinks) {
    console.log("Using cached substance_links.");
    console.log(cachedLinks);

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
