import { WithInfoUrl } from "~/types/dashboard";
import { fetchSubstances } from "./actions";

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

export const getCachedSubstances = <T = unknown[]>(): T | null => {
  if (typeof window === "undefined") return null;

  const cached = localStorage.getItem("substances");
  const expiry = localStorage.getItem("substances_expiry");

  if (cached && expiry && Date.now() < Number(expiry)) {
    return JSON.parse(cached) as T;
  }

  return null;
};

export const setCachedSubstances = (data: any) => {
  if (typeof window === "undefined") return;

  localStorage.setItem("substances", JSON.stringify(data));
  localStorage.setItem(
    "substances_expiry",
    (Date.now() + SIX_MONTHS_MS).toString()
  );
};

export const collectInfoUrls = (data: any) => {
  return Object.values(data)
    .filter(Array.isArray)
    .flatMap((arr) =>
      (arr as WithInfoUrl[]).map((item) => item.info_url).filter(Boolean)
    );
};

const LINK_KEY = "substance_links";
const LINK_EXPIRY_KEY = "substance_links_expiry";

export const getCachedSubstanceLinks = (): string[] | null => {
  if (typeof window === "undefined") return null;

  const data = localStorage.getItem(LINK_KEY);
  const expiry = localStorage.getItem(LINK_EXPIRY_KEY);

  if (data && expiry && Date.now() < Number(expiry)) {
    return JSON.parse(data) as string[];
  }

  return null;
};

export const setCachedSubstanceLinks = (links: string[]) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(LINK_KEY, JSON.stringify(links));
  localStorage.setItem(
    LINK_EXPIRY_KEY,
    (Date.now() + SIX_MONTHS_MS).toString()
  );
};

export const randrange = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min)) + min;
};
