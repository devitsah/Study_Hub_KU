export interface Notice {
  title: string;
  link: string;
  image: string | null;
  date: string | null;
}

export interface NoticeResponse {
  notices: Notice[];
  lastUpdated: string | null;
  error: string | null;
  refreshIntervalSeconds: number;
}
