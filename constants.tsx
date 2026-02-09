
import { PsalmRange } from './types';

// Standard 30-day cycle for Tehillim (Month)
export const MONTHLY_SCHEDULE: PsalmRange[] = [
  { day: 1, start: 1, end: 9 }, { day: 2, start: 10, end: 17 }, { day: 3, start: 18, end: 22 },
  { day: 4, start: 23, end: 28 }, { day: 5, start: 29, end: 34 }, { day: 6, start: 35, end: 38 },
  { day: 7, start: 39, end: 43 }, { day: 8, start: 44, end: 48 }, { day: 9, start: 49, end: 54 },
  { day: 10, start: 55, end: 59 }, { day: 11, start: 60, end: 65 }, { day: 12, start: 66, end: 68 },
  { day: 13, start: 69, end: 71 }, { day: 14, start: 72, end: 76 }, { day: 15, start: 77, end: 78 },
  { day: 16, start: 79, end: 82 }, { day: 17, start: 83, end: 87 }, { day: 18, start: 88, end: 89 },
  { day: 19, start: 90, end: 96 }, { day: 20, start: 97, end: 103 }, { day: 21, start: 104, end: 105 },
  { day: 22, start: 106, end: 107 }, { day: 23, start: 108, end: 112 }, { day: 24, start: 113, end: 118 },
  { day: 25, start: 119, end: 119, extra: "פסוקים א-צו" },
  { day: 26, start: 119, end: 119, extra: "פסוקים צז-קעו" },
  { day: 27, start: 120, end: 134 }, { day: 28, start: 135, end: 139 }, { day: 29, start: 140, end: 144 },
  { day: 30, start: 145, end: 150 },
];

// Weekly cycle (7 days)
export const WEEKLY_SCHEDULE: PsalmRange[] = [
  { day: 1, start: 1, end: 29 },   // Sunday
  { day: 2, start: 30, end: 50 },  // Monday
  { day: 3, start: 51, end: 72 },  // Tuesday
  { day: 4, start: 73, end: 89 },  // Wednesday
  { day: 5, start: 90, end: 106 }, // Thursday
  { day: 6, start: 107, end: 119 },// Friday
  { day: 7, start: 120, end: 150 },// Saturday
];

// Book (Sefer) divisions
export const BOOKS_SCHEDULE = [
  { id: 1, name: 'ספר ראשון', start: 1, end: 41 },
  { id: 2, name: 'ספר שני', start: 42, end: 72 },
  { id: 3, name: 'ספר שלישי', start: 73, end: 89 },
  { id: 4, name: 'ספר רביעי', start: 90, end: 106 },
  { id: 5, name: 'ספר חמישי', start: 107, end: 150 },
];

export const APP_THEME = {
  primary: "#1e3a8a",
  secondary: "#d97706",
  background: "#fdfbf7",
  surface: "#ffffff",
  text: "#334155"
};
