export type Experience = {
  title: string;
  url: string;
  author: string | null;
  substance: string | null;
  rating: string;
  date: string | null;
};

export type Pagination = {
  has_next: boolean;
};

export type ApiResponse = {
  experiences: Experience[];
  pagination: Pagination;
};

export interface CategoryFeedProps {
  baseUrl: string;
  categoryUrl: string; // raw Erowid category URL
  pageSize?: number;
}
