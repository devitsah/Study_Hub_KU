export interface TutorialVideo {
  title: string;
  channel: string;
  duration: string;
  note: string;
  query: string; // used to build a YouTube search URL, never a guessed video ID
}

export interface TutorialSubject {
  id: string;
  name: string;
  fullName: string;
  color: string;
  videos: TutorialVideo[];
}
