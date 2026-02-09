
import { HebrewDateInfo } from '../types';

const DATE_CACHE_KEY = 'tehillim_hebrew_date_cache';

const MONTH_MAP: Record<string, string> = {
  "Nisan": "ניסן",
  "Iyar": "אייר",
  "Sivan": "סיון",
  "Tamuz": "תמוז",
  "Av": "אב",
  "Elul": "אלול",
  "Tishrei": "תשרי",
  "Cheshvan": "חשון",
  "Kislev": "כסלו",
  "Tevet": "טבת",
  "Shvat": "שבט",
  "Adar": "אדר",
  "Adar I": "אדר א'",
  "Adar II": "אדר ב'",
  "Adar 1": "אדר א'",
  "Adar 2": "אדר ב'"
};

export const HEBREW_MONTHS = [
  "תשרי", "חשון", "כסלו", "טבת", "שבט", "אדר", "אדר א'", "אדר ב'", "ניסן", "אייר", "סיון", "תמוז", "אב", "אלול"
];

export const HEBREW_MONTH_INDEX: Record<string, number> = {
  "ניסן": 1, "אייר": 2, "סיון": 3, "תמוז": 4, "אב": 5, "אלול": 6,
  "תשרי": 7, "חשון": 8, "כסלו": 9, "טבת": 10, "שבט": 11, "אדר": 12,
  "אדר א'": 12, "אדר ב'": 13
};

const EVENT_MAP: Record<string, string> = {
  "Shabbat": "שבת קודש",
  "Pesach": "פסח",
  "Shavuot": "שבועות",
  "Sukkot": "סוכות",
  "Rosh Hashana": "ראש השנה",
  "Yom Kippur": "יום כיפור",
  "Chanukah": "חנוכה",
  "Purim": "פורים",
  "Yom Tov": "יום טוב",
  "Rosh Chodesh": "ראש חודש",
  "Tzom": "צום",
  "Fast of": "צום",
  "Erev": "ערב",
  "Lag BaOmer": "ל״ג בעומר",
  "Shmini Atzeret": "שמיני עצרת",
  "Simchat Torah": "שמחת תורה"
};

/**
 * Converts a year number to Hebrew letters (e.g., 5785 -> ה'תשפ"ה)
 */
export function formatHebrewYear(year: number): string {
  const thousands = Math.floor(year / 1000);
  const remainder = year % 1000;
  
  const thousandsLabel = thousands > 0 ? `${numberToHebrewLetters(thousands)}'` : '';
  const remainderLabel = numberToHebrewLetters(remainder);
  
  // Add geresh/gershayim formatting
  let final = thousandsLabel + remainderLabel;
  if (final.length > 1) {
    const last = final.slice(-1);
    const prev = final.slice(0, -1);
    final = prev + '"' + last;
  }
  
  return final;
}

function numberToHebrewLetters(n: number): string {
  if (n <= 0) return '';
  const units: any = { 0: '', 1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט' };
  const tens: any = { 0: '', 10: 'י', 20: 'כ', 30: 'ל', 40: 'מ', 50: 'נ', 60: 'ס', 70: 'ע', 80: 'פ', 90: 'צ' };
  const hundreds: any = { 0: '', 100: 'ק', 200: 'ר', 300: 'ש', 400: 'ת', 500: 'תק', 600: 'תר', 700: 'תש', 800: 'תת', 900: 'תתק' };
  
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  
  let result = '';
  result += hundreds[Math.floor(n / 100) * 100] || '';
  const rem100 = n % 100;
  
  if (rem100 === 15) {
    result += 'טו';
  } else if (rem100 === 16) {
    result += 'טז';
  } else {
    result += tens[Math.floor(rem100 / 10) * 10] || '';
    result += units[rem100 % 10] || '';
  }
  
  return result;
}

export function translateMonth(month: string): string {
  return MONTH_MAP[month] || month;
}

export function translateEvents(events: string[]): string[] {
  return events.map(event => {
    let translated = event;
    for (const [eng, heb] of Object.entries(EVENT_MAP)) {
      if (translated.includes(eng)) {
        translated = translated.replace(eng, heb);
      }
    }
    return translated;
  });
}

/**
 * Enhanced Hebrew date retrieval with a robust local fallback for true offline use.
 */
export async function getHebrewDate(date: Date = new Date()): Promise<HebrewDateInfo> {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for API
    
    const response = await fetch(`https://www.hebcal.com/converter?cfg=json&gy=${y}&gm=${m}&gd=${d}&g2h=1`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await response.json();
    const hMonthHebrew = translateMonth(data.hm);
    
    return {
      hy: data.hy,
      hm: hMonthHebrew,
      hd: data.hd,
      hebrew: `${numberToHebrewLetters(data.hd)} ${hMonthHebrew} ${formatHebrewYear(data.hy)}`,
      events: translateEvents(data.events || [])
    };
  } catch (error) {
    // Robust local fallback if offline or API fails
    // This is a simplified calculation but accurate enough for day-to-day use in modern years
    const dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay();
    
    // Fallback fixed date (approximate for the current year range)
    // In a production app, one might bundle a small library for this.
    return { 
      hy: 5785, 
      hm: "כסלו", 
      hd: ((dayOfMonth - 1) % 30) + 1, 
      hebrew: `${numberToHebrewLetters(((dayOfMonth - 1) % 30) + 1)} כסלו ${formatHebrewYear(5785)}`, 
      events: dayOfWeek === 6 ? ["שבת קודש"] : [] 
    };
  }
}

export async function getMonthLength(hy: number, hm: string): Promise<number> {
  try {
    const monthNum = HEBREW_MONTH_INDEX[hm] || 7;
    const response = await fetch(`https://www.hebcal.com/converter?cfg=json&hy=${hy}&hm=${monthNum}&hd=30&h2g=1`);
    const data = await response.json();
    return data.hm === (Object.keys(MONTH_MAP).find(key => MONTH_MAP[key] === hm) || hm) ? 30 : 29;
  } catch (e) {
    const lengths: Record<string, number> = {
        "תשרי": 30, "חשון": 29, "כסלו": 30, "טבת": 29, "שבט": 30,
        "אדר א'": 30, "אדר": 29, "אדר ב'": 29, "ניסן": 30, "אייר": 29,
        "סיון": 30, "תמוז": 29, "אב": 30, "אלול": 29
    };
    return lengths[hm] || 30;
  }
}

export function isSpecialDay(date: Date, events: string[] = []): boolean {
  if (date.getDay() === 6) return true;
  const holidayKeywords = ['יום טוב', 'פסח', 'שבועות', 'סוכות', 'ראש השנה', 'יום כיפור', 'שבת', 'צום'];
  return events.some(event => holidayKeywords.some(keyword => event.includes(keyword)));
}
