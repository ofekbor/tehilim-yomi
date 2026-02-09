
export interface HebrewDateInfo {
  hy: number;
  hm: string;
  hd: number;
  hebrew: string;
  events?: string[];
}

export interface PsalmRange {
  day: number;
  start: number;
  end: number;
  extra?: string;
}

export type CycleType = 'month' | 'week' | 'custom';

export interface UserStats {
  currentStreak: number;
  maxStreak: number;
  totalChaptersRead: number;
  daysCompleted: number;
  lastReadDate: string | null; // ISO Date
  cycleType: CycleType;
  customInterval: number; // For custom days choice
  notificationsEnabled: boolean;
  notificationTime: string; // "HH:mm"
  readChaptersStatus: number[]; // Array of unique chapter numbers read in current cycle (1-150)
  booksCompleted: number; // Count of fully completed cycles
  readingHistory: string[]; // ISO Date strings of days where Tehillim was read
}

export interface InsightData {
  title: string;
  content: string;
  source: string;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  source: string;
  relatedBookId?: number;
  chaptersRange?: string;
  tag: 'סיפור' | 'תובנה' | 'פירוש';
}
