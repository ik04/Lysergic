export interface Experience {
  title: string;
  url: string;
  author: string;
  substance: string;
  rating?: string;
  date?: string;
}

export interface DashboardLoaderData {
  baseUrl: string;
}

export interface WithInfoUrl {
  info_url?: string;
}
