import React, { useState, useMemo } from 'react';
import {
  X,
  Play,
  Clock,
  BookOpen,
  Edit3,
  Trash2,
  Quote,
  Check,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileText,
  Bookmark,
  Share2,
  Plus,
} from 'lucide-react';
import { Book, BookQuote, ReadingSession } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';
import { i18n } from '../lib/i18n';
import { QuoteCardGeneratorModal } from './QuoteCardGeneratorModal';

interface BookStatsModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onStartReading: (book: Book) => void;
  onDeleteBook: (bookId: string) => void;
  onUpdateBook: (book: Book) => void;
  sessions: ReadingSession[];
}

export const BookStatsModal: React.FC<BookStatsModalProps> = ({
  book,
  isOpen,
  onClose,
  onStartReading,
  onDeleteBook,
  onUpdateBook,
  sessions,
}) => {
  const isRu = i18n.getLanguage() === 'ru';
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [newPageInput, setNewPageInput] = useState(String(book.currentPage || 0));
  const [showQuotesSection, setShowQuotesSection] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuotePage, setNewQuotePage] = useState(String(book.currentPage || 1));
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);

  // Quote Card Generator
  const [isQuoteCardModalOpen, setIsQuoteCardModalOpen] = useState(false);
  const [quoteCardInitialData, setQuoteCardInitialData] = useState<{
    text: string;
    author?: string;
    bookTitle?: string;
    page?: number;
  }>({ text: '' });

  // Filter sessions for this specific book
  const bookSessions = useMemo(() => {
    return sessions
      .filter((s) => s.bookId === book.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sessions, book.id]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalPages = Math.max(1, book.totalPages || 100);
    const currentPage = Math.min(totalPages, Math.max(0, book.currentPage || 0));
    const percent = Math.round((currentPage / totalPages) * 100);
    const pagesLeft = Math.max(0, totalPages - currentPage);

    // Calculate reading speed (pages per hour)
    let avgSpeed = book.readingSpeedPerHour || 35; // Default ~35 pages/hr
    if (bookSessions.length > 0) {
      const totalMinutes = bookSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
      const totalReadPages = bookSessions.reduce((acc, s) => acc + (s.pagesRead || 0), 0);
      if (totalMinutes >= 5 && totalReadPages > 0) {
        avgSpeed = Math.round((totalReadPages / totalMinutes) * 60);
      }
    }
    avgSpeed = Math.max(10, Math.min(120, avgSpeed));

    // Remaining time in hours and minutes
    const hoursRemaining = pagesLeft / avgSpeed;
    const wholeHours = Math.floor(hoursRemaining);
    const remainingMinutes = Math.round((hoursRemaining - wholeHours) * 60);

    return {
      totalPages,
      currentPage,
      percent,
      pagesLeft,
      avgSpeed,
      wholeHours,
      remainingMinutes,
    };
  }, [book, bookSessions]);

  if (!isOpen) return null;

  const handleSaveProgress = () => {
    const p = parseInt(newPageInput, 10);
    if (isNaN(p) || p < 0) return;
    const validatedPage = Math.min(book.totalPages, p);
    const updated = storage.updateBook(book.id, {
      currentPage: validatedPage,
      lastReadPosition: Math.round((validatedPage / (book.totalPages || 1)) * 100),
    });
    if (updated) {
      onUpdateBook(updated);
      sound.playComplete();
    }
    setIsEditingProgress(false);
  };

  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim()) return;
    const pageNum = parseInt(newQuotePage, 10) || book.currentPage || 1;
    const updated = storage.addBookQuote(book.id, newQuoteText.trim(), pageNum);
    if (updated) {
      onUpdateBook(updated);
      sound.playPop();
      setNewQuoteText('');
    }
  };

  const handleDeleteQuote = (quoteId: string) => {
    const updated = storage.deleteBookQuote(book.id, quoteId);
    if (updated) {
      onUpdateBook(updated);
      sound.playClick();
    }
  };

  const handleCopyQuote = (quote: BookQuote) => {
    navigator.clipboard.writeText(`«${quote.text}» — ${book.author}, ${book.title}`);
    setCopiedQuoteId(quote.id);
    sound.playClick();
    setTimeout(() => setCopiedQuoteId(null), 2000);
  };

  const handleOpenQuoteCard = (quote: BookQuote) => {
    setQuoteCardInitialData({
      text: quote.text,
      author: book.author,
      bookTitle: book.title,
      page: quote.page,
    });
    setIsQuoteCardModalOpen(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-modal-backdrop"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-float"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[rgba(255,255,255,0.08)] bg-[#111214]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00ffab]/10 border border-[#00ffab]/20 flex items-center justify-center text-[#00ffab]">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[#dae2fd] font-display">
                  {isRu ? 'Статистика и Детали книги' : 'Book Details & Stats'}
                </h2>
                <p className="text-[11px] text-[#86948a] flex items-center gap-1.5">
                  <span className="uppercase tracking-wider font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#00ffab]">
                    {book.fileType?.toUpperCase() || 'BOOK'}
                  </span>
                  <span>•</span>
                  <span>{book.genre || (isRu ? 'Литература' : 'Reading')}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#86948a] hover:text-[#dae2fd] hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
            {/* Top Showcase: Large Cover & Title */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Cover Card */}
              <div className="w-28 sm:w-36 flex-shrink-0 mx-auto sm:mx-0">
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-xl shadow-black/50 border border-white/10 group">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${
                        book.coverColor || 'from-emerald-800 to-teal-950'
                      } flex flex-col justify-between p-3 text-white`}
                    >
                      <div className="w-6 h-0.5 bg-white/30 rounded-full" />
                      <div className="space-y-1">
                        <div className="text-[11px] font-bold font-serif line-clamp-3 leading-tight text-white/95">
                          {book.title}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-white/70 truncate">
                          {book.author}
                        </div>
                      </div>
                      <div className="w-full h-0.5 bg-white/20 rounded-full" />
                    </div>
                  )}

                  {/* Spine effect */}
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/40 via-white/10 to-transparent pointer-events-none" />

                  {/* Format badge */}
                  <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-mono font-bold text-white border border-white/10">
                    {book.fileType?.toUpperCase() || 'BOOK'}
                  </div>

                  {/* Bottom progress line */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40">
                    <div
                      className="h-full bg-gradient-to-r from-[#00ffab] to-[#00e5ff] transition-all duration-300"
                      style={{ width: `${stats.percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-[#dae2fd] font-display leading-tight">
                    {book.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#86948a] font-medium mt-1">
                    {book.author}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      book.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : book.status === 'reading'
                        ? 'bg-[#00ffab]/10 text-[#00ffab] border-[#00ffab]/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {book.status === 'completed' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isRu ? 'Прочитано' : 'Completed'}
                      </>
                    ) : book.status === 'reading' ? (
                      <>
                        <BookOpen className="w-3.5 h-3.5" />
                        {isRu ? 'Читаю сейчас' : 'Reading'}
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        {isRu ? 'В планах' : 'Want to read'}
                      </>
                    )}
                  </span>

                  {book.rating && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      ★ {book.rating}/5
                    </span>
                  )}

                  {book.fileName && (
                    <span className="text-[11px] text-[#86948a] bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[180px]">
                      {book.fileName}
                    </span>
                  )}
                </div>

                {/* Main Action Buttons */}
                <div className="pt-2 flex flex-wrap gap-2.5 justify-center sm:justify-start">
                  <button
                    onClick={() => {
                      onClose();
                      onStartReading(book);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00ffab] to-[#00e5ff] text-[#002114] font-semibold text-xs sm:text-sm shadow-lg shadow-[#00ffab]/20 hover:opacity-95 active:scale-[0.98] transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {isRu ? 'Читать' : 'Read Now'}
                  </button>

                  <button
                    onClick={() => setIsEditingProgress(!isEditingProgress)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#dae2fd] border border-[rgba(255,255,255,0.08)] text-xs font-medium active:scale-[0.98] transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#00ffab]" />
                    {isRu ? 'Изменить прогресс' : 'Update Progress'}
                  </button>

                  <button
                    onClick={() => setShowQuotesSection(!showQuotesSection)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#dae2fd] border border-[rgba(255,255,255,0.08)] text-xs font-medium active:scale-[0.98] transition-all"
                  >
                    <Quote className="w-3.5 h-3.5 text-amber-400" />
                    {isRu
                      ? `Цитаты и заметки (${(book.quotes?.length || 0) + (book.highlights?.length || 0)})`
                      : `Quotes & Notes (${(book.quotes?.length || 0) + (book.highlights?.length || 0)})`}
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(isRu ? `Удалить книгу «${book.title}»?` : `Delete "${book.title}"?`)) {
                        onDeleteBook(book.id);
                        onClose();
                      }
                    }}
                    className="p-2.5 text-[#86948a] hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 rounded-lg transition-colors ml-auto"
                    title={isRu ? 'Удалить книгу' : 'Delete Book'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Progress Editor Drawer */}
            {isEditingProgress && (
              <div className="p-4 rounded-xl bg-[#111214] border border-[#00ffab]/30 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#dae2fd] flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-[#00ffab]" />
                    {isRu ? 'Укажите текущую страницу' : 'Set Current Page'}
                  </span>
                  <span className="text-[11px] text-[#86948a]">
                    {isRu ? `Всего: ${book.totalPages} стр.` : `Total: ${book.totalPages} pages`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={book.totalPages}
                    value={newPageInput}
                    onChange={(e) => setNewPageInput(e.target.value)}
                    className="w-28 px-3 py-2 bg-[#16171A] border border-[rgba(255,255,255,0.12)] rounded-lg text-sm text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                  />
                  <div className="flex items-center gap-1.5">
                    {[10, 25, 50].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => {
                          const curr = parseInt(newPageInput, 10) || 0;
                          setNewPageInput(String(Math.min(book.totalPages, curr + inc)));
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-[#dae2fd] border border-white/5"
                      >
                        +{inc}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSaveProgress}
                    className="ml-auto px-4 py-2 rounded-lg bg-[#00ffab] text-[#002114] font-semibold text-xs active:scale-[0.98] transition-all"
                  >
                    {isRu ? 'Сохранить' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Statistics Dashboard Block */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#86948a]">
                  {isRu ? 'Статистика чтения' : 'Reading Analytics'}
                </h3>
                <span className="text-xs font-mono font-semibold text-[#00ffab]">
                  {stats.percent}% {isRu ? 'завершено' : 'completed'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-[#111214] rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-[#00ffab] via-[#00e5ff] to-[#38bdf8] transition-all duration-500 rounded-full"
                  style={{ width: `${stats.percent}%` }}
                />
              </div>

              {/* 3 Metrics Cards */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {/* Pages Read */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-[#111214] border border-[rgba(255,255,255,0.06)] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[#86948a] text-[11px]">
                    <BookOpen className="w-3.5 h-3.5 text-[#00ffab]" />
                    <span>{isRu ? 'Страницы' : 'Pages'}</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm sm:text-base font-bold font-mono text-[#dae2fd]">
                      {stats.currentPage} <span className="text-[#86948a] text-xs font-normal">/ {stats.totalPages}</span>
                    </div>
                    <div className="text-[10px] text-[#86948a] mt-0.5">
                      {stats.pagesLeft} {isRu ? 'стр. осталось' : 'pages left'}
                    </div>
                  </div>
                </div>

                {/* Reading Speed */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-[#111214] border border-[rgba(255,255,255,0.06)] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[#86948a] text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>{isRu ? 'Скорость' : 'Pace'}</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm sm:text-base font-bold font-mono text-[#dae2fd]">
                      ~{stats.avgSpeed} <span className="text-[#86948a] text-xs font-normal">{isRu ? 'стр/ч' : 'p/h'}</span>
                    </div>
                    <div className="text-[10px] text-[#86948a] mt-0.5">
                      {isRu ? 'средний темп' : 'avg speed'}
                    </div>
                  </div>
                </div>

                {/* Remaining Time */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-[#111214] border border-[rgba(255,255,255,0.06)] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[#86948a] text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isRu ? 'Осталось' : 'Est. Time'}</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm sm:text-base font-bold font-mono text-[#dae2fd]">
                      {stats.wholeHours > 0 ? `${stats.wholeHours}ч ` : ''}{stats.remainingMinutes}м
                    </div>
                    <div className="text-[10px] text-[#86948a] mt-0.5">
                      {isRu ? 'до конца книги' : 'to finish'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reading Sessions History */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#86948a] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#00ffab]" />
                  {isRu ? 'История сессий чтения' : 'Recent Sessions'}
                </h3>
                <span className="text-[11px] text-[#86948a]">
                  {bookSessions.length} {isRu ? 'сессий' : 'recorded'}
                </span>
              </div>

              {bookSessions.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#111214] border border-[rgba(255,255,255,0.06)] text-center text-xs text-[#86948a]">
                  {isRu
                    ? 'Сессии появятся автоматически при чтении книги в читалке.'
                    : 'Reading sessions will automatically record when you read in e-reader.'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {bookSessions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-lg bg-[#111214] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#00ffab]" />
                        <span className="font-mono text-[#dae2fd]">
                          {new Date(s.timestamp).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span className="text-[#86948a]">
                          {new Date(s.timestamp).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-[#86948a]">
                          {s.durationMinutes} {isRu ? 'мин' : 'min'}
                        </span>
                        <span className="text-[#00ffab] font-medium">
                          +{s.pagesRead} {isRu ? 'стр.' : 'pages'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes & Quotes Section (Collapsible / Expandable) */}
            {showQuotesSection && (
              <div className="p-4 rounded-xl bg-[#111214] border border-[rgba(255,255,255,0.08)] space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <h3 className="text-xs font-semibold text-[#dae2fd] flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-amber-400" />
                    {isRu ? 'Цитаты и выписки' : 'Book Quotes & Notes'}
                  </h3>
                </div>

                {/* Add quote form */}
                <form onSubmit={handleAddQuote} className="space-y-2">
                  <textarea
                    value={newQuoteText}
                    onChange={(e) => setNewQuoteText(e.target.value)}
                    placeholder={isRu ? 'Введите цитату или важную мысль из книги...' : 'Enter a quote or key insight from this book...'}
                    className="w-full px-3 py-2 bg-[#16171A] border border-[rgba(255,255,255,0.12)] rounded-lg text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab] min-h-[60px]"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#86948a]">
                      <span>{isRu ? 'Стр.' : 'Page'}:</span>
                      <input
                        type="number"
                        value={newQuotePage}
                        onChange={(e) => setNewQuotePage(e.target.value)}
                        className="w-16 px-2 py-1 bg-[#16171A] border border-white/10 rounded text-xs text-[#dae2fd]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newQuoteText.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00ffab] text-[#002114] font-semibold text-xs disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isRu ? 'Добавить цитату' : 'Add Quote'}
                    </button>
                  </div>
                </form>

                {/* Quotes and Highlights List */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(!book.quotes || book.quotes.length === 0) && (!book.highlights || book.highlights.length === 0) ? (
                    <div className="text-center py-4 text-xs text-[#86948a]">
                      {isRu ? 'Цитат и заметок пока нет. Выделяйте текст во время чтения!' : 'No quotes or notes yet. Highlight text while reading!'}
                    </div>
                  ) : (
                    <>
                      {/* Highlights with color and notes */}
                      {book.highlights?.map((hl) => (
                        <div
                          key={hl.id}
                          className="p-3 rounded-lg bg-[#16171A] border border-white/5 space-y-1.5 group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: hl.color }}
                              />
                              <span className="text-[10px] text-[#00ffab] font-mono">
                                {isRu ? `Выделение (Стр. ${hl.page || '—'})` : `Highlight (p. ${hl.page || '—'})`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                onClick={() =>
                                  handleOpenQuoteCard({
                                    id: hl.id,
                                    text: hl.text,
                                    page: hl.page,
                                    createdAt: hl.createdAt,
                                  })
                                }
                                className="p-1 hover:text-[#00ffab] transition-colors"
                                title={isRu ? 'Создать карточку цитаты' : 'Generate Quote Card'}
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  storage.deleteBookHighlight(book.id, hl.id);
                                  onUpdateBook({
                                    ...book,
                                    highlights: (book.highlights || []).filter((h) => h.id !== hl.id),
                                  });
                                }}
                                className="p-1 hover:text-[#ffb4ab] transition-colors"
                                title={isRu ? 'Удалить' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p
                            className="text-xs text-[#dae2fd] italic leading-relaxed pl-2 border-l-2"
                            style={{ borderColor: hl.color }}
                          >
                            «{hl.text}»
                          </p>
                          {hl.note && (
                            <p className="text-[11px] text-[#00ffab] bg-black/20 px-2 py-1 rounded border border-white/5">
                              💬 {hl.note}
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Manual Quotes */}
                      {book.quotes?.map((q) => (
                        <div
                          key={q.id}
                          className="p-3 rounded-lg bg-[#16171A] border border-white/5 space-y-1.5 group"
                        >
                          <p className="text-xs text-[#dae2fd] italic leading-relaxed">
                            «{q.text}»
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-[#86948a]">
                            <span>{isRu ? `Стр. ${q.page || '—'}` : `Page ${q.page || '—'}`}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenQuoteCard(q)}
                                className="p-1 hover:text-[#00ffab] transition-colors"
                                title={isRu ? 'Создать карточку цитаты' : 'Generate Quote Card'}
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleCopyQuote(q)}
                                className="p-1 hover:text-[#dae2fd] transition-colors"
                                title={isRu ? 'Скопировать' : 'Copy'}
                              >
                                {copiedQuoteId === q.id ? (
                                  <Check className="w-3.5 h-3.5 text-[#00ffab]" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteQuote(q.id)}
                                className="p-1 hover:text-[#ffb4ab] transition-colors"
                                title={isRu ? 'Удалить' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quote Card Generator Modal */}
      {isQuoteCardModalOpen && (
        <QuoteCardGeneratorModal
          isOpen={isQuoteCardModalOpen}
          onClose={() => setIsQuoteCardModalOpen(false)}
          initialQuote={quoteCardInitialData.text}
          initialAuthor={quoteCardInitialData.author}
          initialBookTitle={quoteCardInitialData.bookTitle}
          initialPage={quoteCardInitialData.page}
        />
      )}
    </>
  );
};
