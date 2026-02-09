
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BookOpen, Calendar, Flame, Trophy, ChevronLeft, ChevronRight, 
  CheckCircle2, ArrowRight, Scroll,
  Languages, Heart, X, Hash, AlertCircle, BarChart as BarChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { HebrewDateInfo, UserStats, InsightData, CycleType, PsalmRange, Story } from './types';
import { MONTHLY_SCHEDULE, WEEKLY_SCHEDULE, BOOKS_SCHEDULE } from './constants';
import { getHebrewDate, isSpecialDay, HEBREW_MONTHS, HEBREW_MONTH_INDEX, getMonthLength, translateEvents, formatHebrewYear } from './services/hebrewDateService';
import { getDailyInsight } from './services/geminiService';
import { getChaptersRange, fetchTehillimRange, YEHI_RATZON_BEFORE, YEHI_RATZON_AFTER } from './psalmsData';

const STORAGE_KEY = 'tehillim_daily_user_stats';

const App: React.FC = () => {
  const [hebrewDate, setHebrewDate] = useState<HebrewDateInfo | null>(null);
  const [stats, setStats] = useState<UserStats>({
    currentStreak: 0,
    maxStreak: 0,
    totalChaptersRead: 0,
    daysCompleted: 0,
    lastReadDate: null,
    cycleType: 'month',
    customInterval: 30,
    readChaptersStatus: [],
    booksCompleted: 0,
    readingHistory: [],
    notificationsEnabled: false,
    notificationTime: '09:00'
  });
  
  const [viewMonth, setViewMonth] = useState<string>("");
  const [viewYear, setViewYear] = useState<number>(0);
  const [viewMonthLength, setViewMonthLength] = useState<number>(30);
  const [viewMonthStartDay, setViewMonthStartDay] = useState<number>(0);

  const [insight, setInsight] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'reading' | 'stats' | 'browse' | 'story'>('home');
  const [readingMode, setReadingMode] = useState<'daily' | 'book' | 'single' | 'catchup' | 'lilui'>('daily');
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [catchupRange, setCatchupRange] = useState<{start: number, end: number} | null>(null);
  const [customRange, setCustomRange] = useState<{start: number, end: number}>({ start: 1, end: 1 });
  const [showYehiRatzon, setShowYehiRatzon] = useState<'none' | 'before' | 'after'>('none');
  const [isCompletedToday, setIsCompletedToday] = useState(false);
  const [protectedMissedDay, setProtectedMissedDay] = useState<number | null>(null);
  const [chapters, setChapters] = useState<{ chapter: number; verses: string[] }[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const getRangeForDate = (hDate: HebrewDateInfo | null, cycle: CycleType, dateObj: Date) => {
    if (!hDate) return MONTHLY_SCHEDULE[0];
    if (cycle === 'week') {
      const dayOfWeek = dateObj.getDay(); 
      return WEEKLY_SCHEDULE[dayOfWeek];
    }
    const dayIndex = (hDate.hd - 1) % 30;
    return MONTHLY_SCHEDULE[dayIndex];
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initialStats = saved ? { ...stats, ...JSON.parse(saved) } : stats;
    if (!initialStats.readChaptersStatus) initialStats.readChaptersStatus = [];
    if (!initialStats.readingHistory) initialStats.readingHistory = [];
    
    setStats(initialStats);
    
    const init = async () => {
      const hDate = await getHebrewDate();
      setHebrewDate(hDate);
      setViewMonth(hDate.hm);
      setViewYear(hDate.hy);
      
      const range = getRangeForDate(hDate, initialStats.cycleType, new Date());
      const chapterStr = `${range.start}-${range.end}`;
      
      const insightData = await getDailyInsight(chapterStr);
      setInsight(insightData);

      if (initialStats.lastReadDate) {
        const today = new Date();
        const lastRead = new Date(initialStats.lastReadDate);
        today.setHours(0, 0, 0, 0);
        lastRead.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((today.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
          for (let i = 1; i < diffDays; i++) {
            const checkDate = new Date(lastRead);
            checkDate.setDate(lastRead.getDate() + i);
            const eventsAtDate = await getHebrewDate(checkDate);
            if (isSpecialDay(checkDate, eventsAtDate.events)) {
               if (eventsAtDate.hm === hDate.hm && eventsAtDate.hy === hDate.hy) {
                 const missedRange = MONTHLY_SCHEDULE[eventsAtDate.hd - 1];
                 const isRead = initialStats.readChaptersStatus.includes(missedRange.start);
                 if (!isRead) {
                    setProtectedMissedDay(eventsAtDate.hd);
                    break;
                 }
               }
            }
          }
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (stats.lastReadDate) {
      const today = new Date().toISOString().split('T')[0];
      setIsCompletedToday(stats.lastReadDate === today);
    }
  }, [stats.lastReadDate]);

  useEffect(() => {
    if (viewMonth && viewYear) {
      const loadMonthData = async () => {
        const len = await getMonthLength(viewYear, viewMonth);
        setViewMonthLength(len);
        
        try {
          const monthNum = HEBREW_MONTH_INDEX[viewMonth] || 7;
          const resStart = await fetch(`https://www.hebcal.com/converter?cfg=json&hy=${viewYear}&hm=${monthNum}&hd=1&h2g=1`);
          const dataStart = await resStart.json();
          const gregorianDate = new Date(dataStart.gy, dataStart.gm - 1, dataStart.gd);
          setViewMonthStartDay(gregorianDate.getDay());
        } catch (e) {
          setViewMonthStartDay(0);
        }
      };
      loadMonthData();
    }
  }, [viewMonth, viewYear]);

  const todayRange = useMemo(() => getRangeForDate(hebrewDate, stats.cycleType, new Date()), [hebrewDate, stats.cycleType]);

  const navigateMonth = (direction: number) => {
    const currentIndex = HEBREW_MONTHS.indexOf(viewMonth);
    let nextIndex = currentIndex + direction;
    let nextYear = viewYear;

    if (nextIndex < 0) {
      nextIndex = HEBREW_MONTHS.length - 1;
      nextYear -= 1;
    } else if (nextIndex >= HEBREW_MONTHS.length) {
      nextIndex = 0;
      nextYear += 1;
    }

    setViewMonth(HEBREW_MONTHS[nextIndex]);
    setViewYear(nextYear);
  };

  const updateStatsAndStreak = useCallback(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    setStats(prev => {
      let newStreak = prev.currentStreak;
      const lastDate = prev.lastReadDate ? new Date(prev.lastReadDate) : null;
      const isAlreadyReadToday = prev.lastReadDate === todayStr;

      const updatedHistory = [...prev.readingHistory];
      if (!updatedHistory.includes(todayStr) && readingMode === 'daily') updatedHistory.push(todayStr);

      if (readingMode === 'daily' && !isAlreadyReadToday) {
        if (!lastDate) {
          newStreak = 1;
        } else {
          lastDate.setHours(0,0,0,0);
          const todayClean = new Date(now);
          todayClean.setHours(0,0,0,0);
          const diffInDays = Math.floor((todayClean.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          let protectedCount = 0;
          if (diffInDays > 1) {
             for (let i = 1; i < diffInDays; i++) {
               const checkDate = new Date(lastDate);
               checkDate.setDate(lastDate.getDate() + i);
               if (isSpecialDay(checkDate)) protectedCount++;
             }
          }
          if (diffInDays - protectedCount <= 1) newStreak += 1;
          else newStreak = 1;
        }
      }

      let activeRange;
      if (readingMode === 'book' && selectedBook !== null) activeRange = BOOKS_SCHEDULE.find(b => b.id === selectedBook)!;
      else if (readingMode === 'catchup' && catchupRange) activeRange = catchupRange;
      else if (readingMode === 'single' && customRange) activeRange = customRange;
      else activeRange = todayRange;

      const updatedReadStatus = [...prev.readChaptersStatus];
      for (let i = activeRange.start; i <= activeRange.end; i++) {
        if (!updatedReadStatus.includes(i)) updatedReadStatus.push(i);
      }

      let booksCompleted = prev.booksCompleted;
      let finalReadStatus = updatedReadStatus;
      if (finalReadStatus.length >= 150) {
        booksCompleted += 1;
        finalReadStatus = finalReadStatus.filter(c => c > 150);
      }

      const updated = {
        ...prev,
        currentStreak: newStreak,
        maxStreak: Math.max(newStreak, prev.maxStreak),
        lastReadDate: readingMode === 'daily' ? todayStr : prev.lastReadDate,
        totalChaptersRead: prev.totalChaptersRead + (activeRange.end - activeRange.start + 1),
        daysCompleted: (isAlreadyReadToday || readingMode !== 'daily') ? prev.daysCompleted : prev.daysCompleted + 1,
        readChaptersStatus: finalReadStatus,
        booksCompleted,
        readingHistory: updatedHistory
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (readingMode === 'daily') setIsCompletedToday(true);
    if (readingMode === 'catchup') setProtectedMissedDay(null);
    setView('home');
    setShowYehiRatzon('none');
  }, [readingMode, selectedBook, todayRange, catchupRange, customRange]);

  const getCalendarDayStatus = (dayNum: number) => {
    if (!hebrewDate) return 'pending';
    const isTodayMonth = viewMonth === hebrewDate.hm && viewYear === hebrewDate.hy;
    
    if (isTodayMonth) {
      if (dayNum < hebrewDate.hd) {
        const range = MONTHLY_SCHEDULE[dayNum - 1];
        if (!range) return 'pending';
        let allRead = true;
        for (let c = range.start; c <= range.end; c++) {
          if (!stats.readChaptersStatus.includes(c)) { allRead = false; break; }
        }
        return allRead ? 'done' : 'missed';
      }
      if (dayNum === hebrewDate.hd) return isCompletedToday ? 'done' : 'today';
    }
    return 'pending';
  };

  const handleCatchupDayClick = (day: number) => {
    const status = getCalendarDayStatus(day);
    if (status === 'missed') {
      const range = MONTHLY_SCHEDULE[day - 1];
      if (range) {
        setCatchupRange({ start: range.start, end: range.end });
        setReadingMode('catchup');
        setView('reading');
      }
    }
  };

  const getActiveRange = useCallback(() => {
    let range: { start: number; end: number } = todayRange;
    if (readingMode === 'book' && selectedBook !== null) {
      const book = BOOKS_SCHEDULE.find(b => b.id === selectedBook);
      if (book) range = book;
    } else if (readingMode === 'catchup' && catchupRange) {
      range = catchupRange;
    } else if (readingMode === 'single' && customRange) {
      range = customRange;
    } else if (readingMode === 'lilui') {
      range = todayRange;
    }
    return range;
  }, [readingMode, selectedBook, catchupRange, customRange, todayRange]);

  useEffect(() => {
    if (view !== 'reading') return;
    const range = getActiveRange();
    setChaptersLoading(true);
    fetchTehillimRange(range.start, range.end)
      .then(setChapters)
      .catch(() => {
        // graceful fallback to existing static snippets
        setChapters(getChaptersRange(range.start, range.end));
      })
      .finally(() => setChaptersLoading(false));
  }, [view, getActiveRange]);

  const jumpToSingleChapter = (chap: number) => {
    setCustomRange({ start: chap, end: chap });
    setReadingMode('single');
    setView('reading');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-[#fdfbf7]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-900 border-r-transparent"></div>
        <p className="text-blue-900 font-bold text-lg animate-pulse tracking-wide">טוען מזמורים...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#fdfbf7] text-[#334155] select-none flex flex-col font-['Assistant'] relative overflow-x-hidden">
      
      <main className="flex-1 overflow-y-auto px-5 pt-8 pb-16">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-8">
              
              <header className="flex flex-col items-center text-center space-y-1">
                <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100 mb-2">
                  <BookOpen className="text-blue-900 w-7 h-7" />
                </div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">תהילים יומי</h1>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">{hebrewDate?.hebrew}</p>
              </header>

              <div className="grid grid-cols-3 gap-3">
                <StatBox icon={<Flame className="text-orange-500" size={18} />} label="רצף ימים" value={stats.currentStreak} />
                <StatBox icon={<Trophy className="text-amber-500" size={18} />} label="פרקים" value={stats.totalChaptersRead} />
                <StatBox icon={<CheckCircle2 className="text-emerald-500" size={18} />} label="יום בחודש" value={numberToHebrew(hebrewDate?.hd || 1)} />
              </div>

              {protectedMissedDay && (
                <div className="bg-white border-2 border-blue-50 p-6 rounded-[2rem] soft-shadow flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-900"><AlertCircle size={24} /></div>
                    <div className="flex-1">
                      <h3 className="font-black text-slate-800">השלמה מוגנת</h3>
                      <p className="text-sm text-slate-500 leading-snug">השלם את יום {numberToHebrew(protectedMissedDay)} כדי לשמור על הרצף.</p>
                    </div>
                  </div>
                  <button onClick={() => handleCatchupDayClick(protectedMissedDay)} className="w-full py-3 bg-blue-50 text-blue-900 rounded-xl font-black active:scale-95 transition-transform">השלם עכשיו</button>
                </div>
              )}

              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 soft-shadow space-y-6">
                 <div className="flex items-center justify-between px-1">
                    <button onClick={() => navigateMonth(-1)} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-900 rounded-full transition-all"><ChevronRight size={18}/></button>
                    <h3 className="font-black text-slate-700 text-lg">חודש {viewMonth} {formatHebrewYear(viewYear)}</h3>
                    <button onClick={() => navigateMonth(1)} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-900 rounded-full transition-all"><ChevronLeft size={18}/></button>
                 </div>
                 
                 <div className="calendar-grid">
                    {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
                      <div key={d} className="text-center text-[10px] font-black text-slate-300 py-1">{d}</div>
                    ))}
                    {Array.from({ length: viewMonthStartDay }).map((_, i) => (
                      <div key={`pad-${i}`} className="w-full h-10"></div>
                    ))}
                    {Array.from({ length: viewMonthLength }, (_, i) => i + 1).map(day => {
                      const status = getCalendarDayStatus(day);
                      const isToday = day === hebrewDate?.hd && viewMonth === hebrewDate.hm && viewYear === hebrewDate.hy;

                      return (
                        <div key={day} className="flex flex-col items-center">
                          <motion.div 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => status === 'missed' && handleCatchupDayClick(day)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold transition-all relative ${
                            status === 'done' ? 'bg-emerald-50 text-emerald-600' :
                            status === 'missed' ? 'bg-rose-50 text-rose-600 border border-rose-100 cursor-pointer' :
                            status === 'today' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' :
                            'bg-slate-50/50 text-slate-400 border border-slate-100/50'
                          } ${isToday ? 'scale-110 z-10' : ''}`}>
                            {numberToHebrew(day)}
                          </motion.div>
                        </div>
                      );
                    })}
                 </div>
              </div>

              <motion.div 
                whileTap={{ scale: 0.98 }}
                onClick={() => { setView('reading'); setReadingMode('daily'); }}
                className="bg-white rounded-[2.5rem] p-10 soft-shadow border border-slate-50 relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute -top-12 -right-12 text-blue-900/5 opacity-30 pointer-events-none group-hover:rotate-6 transition-transform">
                  <BookOpen size={220} />
                </div>
                <div className="relative z-10 flex flex-col items-center text-center">
                  <span className="text-[10px] font-black text-blue-900/50 uppercase tracking-[0.3em] mb-4">פרקי היום</span>
                  <h2 className="text-4xl font-black text-slate-800 mb-2">מזמור {numberToHebrew(todayRange.start)} עד {numberToHebrew(todayRange.end)}</h2>
                  <div className="mt-8 flex items-center justify-center gap-3 px-8 py-4 bg-blue-900 text-white rounded-2xl font-bold soft-shadow group-hover:bg-blue-800 transition-colors">
                    <span className="text-lg">{isCompletedToday ? 'קראתי היום' : 'התחל קריאה'}</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {view === 'reading' && (
            <motion.div key="reading" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="bg-white rounded-[2.5rem] p-6 pb-20 relative soft-shadow">
              <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/95 backdrop-blur-md z-20 py-3 border-b border-slate-50">
                <button onClick={() => setView('home')} className="p-2 bg-slate-50 text-slate-500 rounded-full hover:bg-slate-100 transition-colors">
                  <ChevronRight size={20} />
                </button>
                <h2 className="text-lg font-black text-slate-800">
                  {readingMode === 'daily' ? 'סדר היום' : 'תהילים'}
                </h2>
                <div className="w-10"></div>
              </div>

              {/* Yehi Ratzon Before */}
              <div className="mb-10">
                <button 
                  onClick={() => setShowYehiRatzon(showYehiRatzon === 'before' ? 'none' : 'before')} 
                  className={`w-full py-3.5 rounded-xl font-black flex items-center justify-center transition-all border ${showYehiRatzon === 'before' ? 'bg-blue-900 text-white border-blue-900 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
                >
                  תפילת "יהי רצון" (לפני)
                </button>
                <AnimatePresence>
                  {showYehiRatzon === 'before' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="p-6 bg-slate-50/50 rounded-2xl text-right space-y-4 border border-slate-100 mt-3 psalm-text !text-[1.1rem]">
                        {YEHI_RATZON_BEFORE.map((p, i) => <p key={i}>{p}</p>)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-16 px-1">
                {chaptersLoading ? (
                  <div className="text-center text-slate-400 mt-8 text-sm">
                    טוען פרקי תהילים מלאים...
                  </div>
                ) : (
                  chapters.map((ch) => (
                    <motion.div key={ch.chapter} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} className="space-y-6">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-blue-900/30 uppercase tracking-[0.4em] mb-1">פרק</span>
                        <h3 className="text-2xl font-black text-slate-800 border-b-2 border-blue-900/10 pb-1 px-5">
                          {numberToHebrew(ch.chapter)}
                        </h3>
                      </div>
                      <div className="psalm-text text-slate-800">
                        {ch.verses.map((verse, idx) => (
                          <span key={idx} className="inline mr-1">{verse}</span>
                        ))}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Yehi Ratzon After */}
              <div className="mt-16 mb-6">
                <button 
                  onClick={() => setShowYehiRatzon(showYehiRatzon === 'after' ? 'none' : 'after')} 
                  className={`w-full py-3.5 rounded-xl font-black flex items-center justify-center transition-all border ${showYehiRatzon === 'after' ? 'bg-blue-900 text-white border-blue-900 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
                >
                  תפילת "יהי רצון" (אחרי)
                </button>
                <AnimatePresence>
                  {showYehiRatzon === 'after' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="p-6 bg-slate-50/50 rounded-2xl text-right space-y-4 border border-slate-100 mt-3 psalm-text !text-[1.1rem]">
                        {YEHI_RATZON_AFTER.map((p, i) => <p key={i}>{p}</p>)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button 
                whileTap={{ scale: 0.97 }}
                onClick={updateStatsAndStreak} 
                className="w-full py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black soft-shadow mt-4 flex items-center justify-center gap-2 text-md"
              >
                <CheckCircle2 size={20} />
                סיימתי לקרוא
              </motion.button>
            </motion.div>
          )}

          {view === 'browse' && (
            <motion.div key="browse" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 pb-12">
              <header className="px-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">קריאה והשראה</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">עיון בספרים ובסיפורים</p>
              </header>

              <section className="space-y-3">
                <div className="flex items-center gap-2 px-2 text-blue-900/50 uppercase text-[9px] font-black tracking-widest">
                   <Hash size={12} />
                   <span>קריאה חופשית</span>
                </div>
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 soft-shadow space-y-5">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">בחירת פרק בודד</label>
                    <div className="grid grid-cols-5 gap-1.5 overflow-y-auto max-h-32 p-1 bg-slate-50/40 rounded-xl border border-slate-100/30">
                      {Array.from({ length: 150 }, (_, i) => i + 1).map(c => (
                        <button key={c} onClick={() => jumpToSingleChapter(c)} className="p-2 text-[10px] font-black bg-white border border-slate-100 rounded-lg hover:bg-blue-900 hover:text-white transition-all text-slate-600">
                          {numberToHebrew(c)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 px-2 text-blue-900/50 uppercase text-[9px] font-black tracking-widest">
                   <Scroll size={12} />
                   <span>חלוקה לספרים</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {BOOKS_SCHEDULE.map(book => {
                    const totalChapters = book.end - book.start + 1;
                    const readChapters = stats.readChaptersStatus.filter(c => c >= book.start && c <= book.end).length;
                    const progressPercent = Math.round((readChapters / totalChapters) * 100);
                    return (
                      <button key={book.id} onClick={() => { setReadingMode('book'); setSelectedBook(book.id); setView('reading'); }} className="p-4 bg-white border border-slate-100 rounded-[1.5rem] soft-shadow text-right flex flex-col gap-3 group transition-all active:scale-95">
                        <div className="flex justify-between items-center w-full">
                           <ChevronLeft size={16} className="text-slate-200 group-hover:text-blue-900 group-hover:-translate-x-1 transition-all" />
                           <div className="text-right">
                            <p className="font-black text-slate-800 text-md">{book.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">מזמור {numberToHebrew(book.start)} - {numberToHebrew(book.end)}</p>
                           </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </motion.div>
          )}

          {view === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <header className="px-2">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">ההתקדמות שלי</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">שיאים ונתונים</p>
              </header>
              <div className="grid grid-cols-2 gap-3">
                <AchievementCard title="שיא רצף" value={stats.maxStreak} icon={<Flame className="text-orange-500" size={24} />} />
                <AchievementCard title="פרקים שנקראו" value={stats.totalChaptersRead} icon={<BookOpen className="text-blue-500" size={24} />} />
                <AchievementCard title="ספרים שלמים" value={stats.booksCompleted} icon={<Scroll className="text-emerald-500" size={24} />} />
                <AchievementCard title="היום בחודש" value={numberToHebrew(hebrewDate?.hd || 1)} icon={<Calendar className="text-amber-500" size={24} />} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 pb-safe px-6 pt-2 pb-0.5 flex flex-col items-center z-50 rounded-t-[1.5rem] shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-around w-full mb-0.5">
          <NavButton active={view === 'home'} onClick={() => setView('home')} icon={<Calendar size={18} />} label="היום" />
          <NavButton active={view === 'reading' || view === 'browse'} onClick={() => { if(view !== 'reading') setView('browse'); }} icon={<BookOpen size={18} />} label="קריאה" />
          <NavButton active={view === 'stats'} onClick={() => setView('stats')} icon={<BarChartIcon size={18} />} label="שיאים" />
        </div>
        <div className="w-full flex justify-center py-1 opacity-90">
          <div className="text-[11px] font-black text-blue-900/60 uppercase tracking-[0.5em] select-none font-serif italic leading-none">
            שבת וינפש
          </div>
        </div>
      </nav>
    </div>
  );
};

const StatBox = ({ icon, label, value }: any) => (
  <div className="bg-white p-3 rounded-2xl border border-slate-100 soft-shadow text-center flex flex-col items-center justify-center">
    <div className="mb-1">{icon}</div>
    <div className="text-xl font-black text-slate-800 leading-none">{value}</div>
    <div className="text-[8px] text-slate-300 font-black mt-1.5 uppercase tracking-widest">{label}</div>
  </div>
);

const AchievementCard = ({ title, value, icon }: any) => (
  <div className="bg-white p-6 rounded-[1.5rem] border border-slate-100 soft-shadow flex flex-col items-center text-center">
    <div className="p-3 bg-slate-50 rounded-2xl mb-4">{icon}</div>
    <div className="text-2xl font-black text-slate-800">{value}</div>
    <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">{title}</div>
  </div>
);

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-0.5 transition-all px-4 py-1 rounded-xl relative ${active ? 'text-blue-900 scale-105' : 'text-slate-300 hover:text-slate-400'}`}>
    <div className="p-0.5">{icon}</div>
    <span className={`text-[8px] font-black tracking-tight ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    {active && <motion.div layoutId="nav-pill" className="absolute inset-0 bg-blue-50/40 -z-10 rounded-lg" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />}
  </button>
);

function numberToHebrew(n: number): string {
  if (n <= 0) return '';
  const units: any = { 0: '', 1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט' };
  const tens: any = { 0: '', 10: 'י', 20: 'כ', 30: 'ל', 40: 'מ', 50: 'נ', 60: 'ס', 70: 'ע', 80: 'פ', 90: 'צ', 100: 'ק' };
  if (n === 15) return 'טו'; if (n === 16) return 'טז';
  if (n <= 10) return units[n] || tens[n];
  if (n <= 100) return tens[Math.floor(n / 10) * 10] + units[n % 10];
  if (n <= 150) return 'ק' + numberToHebrew(n - 100);
  return n.toString();
}

export default App;
