import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Play,
  Pause,
  Plus,
  Quote,
  Star,
  CheckCircle2,
  Bookmark,
  X,
  Clock,
  Trash2,
  Search,
  Filter,
  Layers,
  ChevronRight,
  BookMarked,
  Sparkles,
  Edit3,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { AppState, Book, BookQuote } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';
import { i18n } from '../lib/i18n';

interface BooksModuleProps {
  state: AppState;
}

const PRESET_COVER_COLORS = [
  { name: 'Amber Gold', value: 'from-amber-600 to-amber-900', border: '#d97706' },
  { name: 'Mint Cyan', value: 'from-emerald-600 to-teal-900', border: '#059669' },
  { name: 'Cosmic Blue', value: 'from-blue-600 to-indigo-950', border: '#2563eb' },
  { name: 'Neon Purple', value: 'from-purple-600 to-slate-950', border: '#9333ea' },
  { name: 'Crimson Ember', value: 'from-rose-600 to-zinc-950', border: '#e11d48' },
  { name: 'Deep Space', value: 'from-slate-700 to-slate-950', border: '#475569' },
];

const GENRE_PRESETS = [
  'IT & Architecture',
  'Science Fiction',
  'Philosophy',
  'Psychology',
  'Business & Startup',
  'Productivity',
  'History & Science',
  'Fiction',
];

export const BooksModule: React.FC<BooksModuleProps> = ({ state }) => {
  // Active selected book
  const [selectedBookId, setSelectedBookId] = useState<string>(() => {
    const reading = state.books.find((b) => b.status === 'reading');
    return reading?.id || state.books[0]?.id || '';
  });

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'reading' | 'want_to_read' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('all');

  // Modals
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isAddQuoteModalOpen, setIsAddQuoteModalOpen] = useState(false);
  const [isEditProgressModalOpen, setIsEditProgressModalOpen] = useState(false);

  // Form State for Add Book
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('320');
  const [currentPage, setCurrentPage] = useState('0');
  const [genre, setGenre] = useState('IT & Architecture');
  const [status, setStatus] = useState<Book['status']>('reading');
  const [coverUrl, setCoverUrl] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COVER_COLORS[0].value);
  const [notes, setNotes] = useState('');

  // Form State for Quote
  const [quoteText, setQuoteText] = useState('');
  const [quotePage, setQuotePage] = useState('');
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);

  // Focus Reading Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loggedPagesInput, setLoggedPagesInput] = useState('');

  const isRu = state.language === 'ru';

  // Ensure selectedBookId points to a valid book if list updates
  useEffect(() => {
    if (state.books.length > 0) {
      const exists = state.books.some((b) => b.id === selectedBookId);
      if (!exists) {
        setSelectedBookId(state.books[0].id);
      }
    }
  }, [state.books, selectedBookId]);

  const selectedBook = useMemo(() => {
    return state.books.find((b) => b.id === selectedBookId) || state.books[0] || null;
  }, [state.books, selectedBookId]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return state.books.filter((b) => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (genreFilter !== 'all' && b.genre !== genreFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = b.title.toLowerCase().includes(q);
        const matchAuthor = b.author.toLowerCase().includes(q);
        const matchGenre = b.genre?.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor && !matchGenre) return false;
      }
      return true;
    });
  }, [state.books, statusFilter, genreFilter, searchQuery]);

  // Unique genres for filter
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    state.books.forEach((b) => {
      if (b.genre) set.add(b.genre);
    });
    return Array.from(set);
  }, [state.books]);

  // Reading Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleFinishTimer = () => {
    setIsTimerRunning(false);
    const pages = parseInt(loggedPagesInput, 10);
    const minutes = Math.max(1, Math.round(timerSeconds / 60));
    if (selectedBook && !isNaN(pages) && pages > 0) {
      storage.logReadingSession(selectedBook.id, minutes, pages);
    }
    setTimerSeconds(0);
    setLoggedPagesInput('');
  };

  // Reset Add Form
  const resetAddForm = () => {
    setTitle('');
    setAuthor('');
    setTotalPages('320');
    setCurrentPage('0');
    setGenre('IT & Architecture');
    setStatus('reading');
    setCoverUrl('');
    setSelectedColor(PRESET_COVER_COLORS[0].value);
    setNotes('');
  };

  // Handle Add Book
  const handleAddBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    const total = Math.max(1, parseInt(totalPages, 10) || 100);
    const current = Math.max(0, Math.min(total, parseInt(currentPage, 10) || 0));

    const createdBook = storage.addBook({
      title: title.trim(),
      author: author.trim(),
      totalPages: total,
      currentPage: current,
      genre: genre.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      coverColor: selectedColor,
      status: status || 'reading',
      rating: 5,
      notes: notes.trim() || undefined,
      startDate: status === 'reading' ? new Date().toISOString().split('T')[0] : undefined,
      finishDate: status === 'completed' ? new Date().toISOString().split('T')[0] : undefined,
    });

    setSelectedBookId(createdBook.id);
    resetAddForm();
    setIsAddBookModalOpen(false);
  };

  // Handle Add Quote
  const handleAddQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteText.trim() || !selectedBook) return;
    storage.addBookQuote(
      selectedBook.id,
      quoteText.trim(),
      quotePage ? parseInt(quotePage, 10) : undefined
    );
    setQuoteText('');
    setQuotePage('');
    setIsAddQuoteModalOpen(false);
  };

  // Delete Book
  const handleDeleteBook = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    const b = state.books.find((item) => item.id === bookId);
    const confirmText = isRu
      ? `Удалить книгу "${b?.title || ''}" из библиотеки?`
      : `Delete book "${b?.title || ''}" from your library?`;
    if (window.confirm(confirmText)) {
      storage.deleteBook(bookId);
      if (selectedBookId === bookId) {
        const remaining = state.books.filter((item) => item.id !== bookId);
        if (remaining.length > 0) {
          setSelectedBookId(remaining[0].id);
        }
      }
    }
  };

  // Copy quote
  const handleCopyQuote = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuoteId(id);
    sound.playPop();
    setTimeout(() => setCopiedQuoteId(null), 2000);
  };

  // Render Book Cover / Badge
  const renderBookCover = (book: Book, className: string = 'w-full h-full') => {
    if (book.coverUrl) {
      return (
        <img
          src={book.coverUrl}
          alt={book.title}
          referrerPolicy="no-referrer"
          className={`${className} object-cover`}
          onError={(e) => {
            // Fallback to stylized cover if image fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    const gradientClass = book.coverColor || 'from-amber-600 to-amber-900';
    return (
      <div
        className={`${className} bg-gradient-to-br ${gradientClass} flex flex-col justify-between p-3.5 text-white select-none border-l-4 border-white/20`}
      >
        <div className="flex items-center justify-between">
          <BookMarked className="w-4 h-4 text-white/80" />
          <span className="text-[9px] font-mono tracking-wider uppercase opacity-75">
            {book.genre || 'Vault'}
          </span>
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-xs line-clamp-3 leading-tight font-display drop-shadow-sm">
            {book.title}
          </h4>
          <p className="text-[10px] text-white/80 line-clamp-1">{book.author}</p>
        </div>
      </div>
    );
  };

  // EMPTY STATE when library has 0 books
  if (state.books.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#e5a93c] mb-1">
              <BookOpen className="w-4 h-4 text-[#e5a93c]" />
              {isRu ? 'ЧИТАТЕЛЬСКИЙ ХАБ SARDOR OS' : 'DEEP SPACE READING VAULT'}
            </div>
            <h2 className="text-2xl font-bold text-[#dae2fd] font-display">
              {isRu ? 'Книги и База Знаний' : 'Reading & Knowledge Synthesis'}
            </h2>
          </div>
          <button
            onClick={() => setIsAddBookModalOpen(true)}
            className="px-4 py-2.5 bg-[#e5a93c] hover:bg-[#e5a93c]/90 text-[#001e2f] font-semibold text-xs font-mono rounded-xl flex items-center gap-2 transition-all shadow-md shadow-[#e5a93c]/20"
          >
            <Plus className="w-4 h-4" />
            {isRu ? 'Добавить первую книгу' : 'Add First Book'}
          </button>
        </div>

        {/* Empty State Banner */}
        <div className="p-12 text-center rounded-3xl bg-[#131b2e]/60 border border-dashed border-[#222a3d] space-y-5 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#e5a93c]/10 border border-[#e5a93c]/30 text-[#e5a93c] flex items-center justify-center shadow-lg shadow-[#e5a93c]/10">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-lg font-bold text-[#dae2fd] font-display">
              {isRu ? 'Ваша библиотека пока пуста' : 'Your Library is Empty'}
            </h3>
            <p className="text-xs text-[#86948a] leading-relaxed">
              {isRu
                ? 'Добавьте книги, которые вы сейчас читаете или планируете изучить. Фиксируйте прочитанные страницы, ведите таймер чтения и сохраняйте ключевые цитаты.'
                : 'Add books you are currently reading or wish to explore. Track reading sessions, measure progress, and preserve key quotes.'}
            </p>
          </div>
          <button
            onClick={() => setIsAddBookModalOpen(true)}
            className="px-5 py-2.5 bg-[#e5a93c] hover:bg-[#e5a93c]/90 text-[#001e2f] font-bold text-xs font-mono rounded-xl flex items-center gap-2 transition-all shadow-md shadow-[#e5a93c]/20"
          >
            <Plus className="w-4 h-4" />
            {isRu ? 'Добавить первую книгу' : 'Add First Book'}
          </button>
        </div>

        {/* Add Book Modal */}
        {isAddBookModalOpen && renderAddBookModal()}
      </div>
    );
  }

  const progressPct = selectedBook
    ? Math.min(100, Math.round((selectedBook.currentPage / selectedBook.totalPages) * 100))
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#e5a93c] mb-1">
            <BookOpen className="w-4 h-4 text-[#e5a93c]" />
            {isRu ? 'ЧИТАТЕЛЬСКИЙ ХАБ SARDOR OS' : 'DEEP SPACE READING VAULT'}
          </div>
          <h2 className="text-2xl font-bold text-[#dae2fd] font-display">
            {isRu ? 'Книги и База Знаний' : 'Reading & Knowledge Synthesis'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddBookModalOpen(true)}
            className="px-4 py-2.5 bg-[#e5a93c] hover:bg-[#e5a93c]/90 text-[#001e2f] font-semibold text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-[#e5a93c]/20"
          >
            <Plus className="w-4 h-4" />
            {isRu ? 'Добавить книгу' : 'Add Book'}
          </button>
        </div>
      </div>

      {/* Main Selected Book Spotlight Hero */}
      {selectedBook && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-2xl bg-gradient-to-r from-[#131b2e] via-[#171f33] to-[#131b2e] border border-[#222a3d] shadow-xl relative overflow-hidden">
          {/* Spotlight Cover */}
          <div className="lg:col-span-3 flex justify-center items-center">
            <div className="relative group w-44 h-64 rounded-2xl overflow-hidden border border-[#222a3d] shadow-2xl shadow-black/80 flex-shrink-0">
              {renderBookCover(selectedBook)}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#0b1326]/90 border border-[#e5a93c]/40 text-[10px] font-mono text-[#e5a93c]">
                {progressPct}%
              </div>
            </div>
          </div>

          {/* Book Info & Dynamic Progress */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded border ${
                    selectedBook.status === 'reading'
                      ? 'bg-[#e5a93c]/15 text-[#e5a93c] border-[#e5a93c]/30'
                      : selectedBook.status === 'completed'
                      ? 'bg-[#00ffab]/15 text-[#00ffab] border-[#00ffab]/30'
                      : 'bg-[#89ceff]/15 text-[#89ceff] border-[#89ceff]/30'
                  }`}
                >
                  {selectedBook.status === 'reading'
                    ? isRu
                      ? 'Читаю сейчас'
                      : 'Reading'
                    : selectedBook.status === 'completed'
                    ? isRu
                      ? 'Прочитано'
                      : 'Completed'
                    : isRu
                    ? 'В планах'
                    : 'Want to Read'}
                </span>

                {selectedBook.genre && (
                  <span className="text-[10px] font-mono text-[#86948a] bg-[#0b1326] px-2.5 py-0.5 rounded border border-[#222a3d]">
                    {selectedBook.genre}
                  </span>
                )}
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-[#dae2fd] font-display">
                {selectedBook.title}
              </h3>
              <p className="text-sm text-[#bbcabf] font-sans mt-0.5">
                {isRu ? 'Автор:' : 'by'} <span className="text-[#dae2fd] font-semibold">{selectedBook.author}</span>
              </p>

              {selectedBook.notes && (
                <p className="text-xs text-[#86948a] mt-3 bg-[#0b1326]/70 p-3 rounded-xl border border-[#222a3d] italic leading-relaxed">
                  "{selectedBook.notes}"
                </p>
              )}
            </div>

            {/* Progress Slider & Quick Pages Update */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs font-mono text-[#bbcabf]">
                <span>
                  {isRu ? 'Страница' : 'Page'} {selectedBook.currentPage} / {selectedBook.totalPages}
                </span>
                <span className="text-[#e5a93c] font-bold">
                  {selectedBook.totalPages - selectedBook.currentPage > 0
                    ? `${selectedBook.totalPages - selectedBook.currentPage} ${isRu ? 'стр. осталось' : 'pages left'}`
                    : isRu
                    ? 'Книга завершена! 🎉'
                    : 'Completed! 🎉'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#0b1326] h-3 rounded-full overflow-hidden border border-[#222a3d]">
                <div
                  className="bg-gradient-to-r from-[#e5a93c] to-[#00ffab] h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Quick Increment buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[5, 15, 30].map((inc) => (
                  <button
                    key={inc}
                    onClick={() =>
                      storage.updateBook(selectedBook.id, {
                        currentPage: Math.min(selectedBook.totalPages, selectedBook.currentPage + inc),
                      })
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#0b1326] hover:bg-[#1b2332] text-xs font-mono text-[#dae2fd] border border-[#222a3d] transition-colors"
                  >
                    +{inc} {isRu ? 'стр' : 'pgs'}
                  </button>
                ))}

                {/* Status Changer */}
                <select
                  value={selectedBook.status}
                  onChange={(e) =>
                    storage.updateBook(selectedBook.id, {
                      status: e.target.value as Book['status'],
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#0b1326] text-xs font-mono text-[#e5a93c] border border-[#222a3d] focus:outline-none"
                >
                  <option value="reading">{isRu ? 'Читаю' : 'Reading'}</option>
                  <option value="want_to_read">{isRu ? 'В планах' : 'Want to Read'}</option>
                  <option value="completed">{isRu ? 'Прочитано' : 'Completed'}</option>
                </select>

                <button
                  onClick={(e) => handleDeleteBook(e, selectedBook.id)}
                  title={isRu ? 'Удалить книгу' : 'Delete book'}
                  className="p-1.5 rounded-lg bg-[#0b1326] hover:bg-[#222a3d] text-[#86948a] hover:text-[#ffb4ab] border border-[#222a3d] ml-auto transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Focus Reading Timer Module */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-[#0b1326]/80 border border-[#222a3d] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#89ceff]">
                <Clock className="w-4 h-4" />
                {isRu ? 'ТАЙМЕР СЕССИИ ЧТЕНИЯ' : 'FOCUS READING TIMER'}
              </div>
              <div className="text-3xl font-mono font-bold text-[#dae2fd] my-2">
                {formatTimer(timerSeconds)}
              </div>
              <p className="text-[11px] text-[#86948a]">
                {isRu
                  ? 'Запустите таймер, чтобы войти в состояние глубокого чтения и зафиксировать прогресс.'
                  : 'Immersive focus reading tracker with automatic page increment.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={loggedPagesInput}
                  onChange={(e) => setLoggedPagesInput(e.target.value)}
                  placeholder={isRu ? 'Прочитано страниц...' : 'Pages read...'}
                  className="w-full bg-[#131b2e] border border-[#222a3d] rounded-xl px-3 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div className="flex gap-2">
                {!isTimerRunning ? (
                  <button
                    onClick={() => {
                      setIsTimerRunning(true);
                      sound.playPop();
                    }}
                    className="flex-1 py-2 bg-[#00ffab] hover:bg-[#00ffab]/90 text-[#003824] font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#00ffab]/20"
                  >
                    <Play className="w-3.5 h-3.5" /> {isRu ? 'Старт' : 'Start'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsTimerRunning(false);
                      sound.playClick();
                    }}
                    className="flex-1 py-2 bg-[#e5a93c] text-[#001e2f] font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#e5a93c]/20"
                  >
                    <Pause className="w-3.5 h-3.5" /> {isRu ? 'Пауза' : 'Pause'}
                  </button>
                )}

                <button
                  onClick={handleFinishTimer}
                  disabled={timerSeconds === 0 && !loggedPagesInput}
                  className="px-3.5 py-2 bg-[#171f33] hover:bg-[#222a3d] disabled:opacity-40 text-[#dae2fd] font-mono text-xs rounded-xl border border-[#222a3d] transition-all"
                >
                  {isRu ? 'Зафиксировать' : 'Log'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Library Shelf & Quotes View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Books Shelf (5 cols) */}
        <div className="lg:col-span-5 p-5 md:p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono text-[#86948a] uppercase font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#e5a93c]" />
              {isRu ? 'Полка книг' : 'Library Shelf'} ({state.books.length})
            </h3>
            <button
              onClick={() => setIsAddBookModalOpen(true)}
              className="text-xs font-mono text-[#e5a93c] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {isRu ? 'Добавить' : 'New Book'}
            </button>
          </div>

          {/* Filter Pills & Search */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1 bg-[#0b1326] p-1 rounded-xl border border-[#222a3d] overflow-x-auto">
              {[
                { id: 'all', label: isRu ? 'Все' : 'All' },
                { id: 'reading', label: isRu ? 'Читаю' : 'Reading' },
                { id: 'want_to_read', label: isRu ? 'Планы' : 'Queue' },
                { id: 'completed', label: isRu ? 'Прочитано' : 'Done' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-[#171f33] text-[#e5a93c] font-semibold border border-[#e5a93c]/30 shadow-sm'
                      : 'text-[#86948a] hover:text-[#dae2fd]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#86948a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRu ? 'Поиск по названию или автору...' : 'Search books...'}
                className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#dae2fd] placeholder-[#86948a] focus:outline-none focus:border-[#e5a93c]"
              />
            </div>
          </div>

          {/* Books List Shelf */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredBooks.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#86948a] border border-dashed border-[#222a3d] rounded-xl">
                {isRu ? 'Книг по данному фильтру не найдено.' : 'No books matching this filter.'}
              </div>
            ) : (
              filteredBooks.map((book) => {
                const isSelected = selectedBook?.id === book.id;
                const pct = Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));

                return (
                  <button
                    key={book.id}
                    onClick={() => {
                      setSelectedBookId(book.id);
                      sound.playClick();
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-[#171f33] border-[#e5a93c]/50 shadow-md shadow-[#e5a93c]/5'
                        : 'bg-[#0b1326] border-[#222a3d] hover:border-[#3c4a42]'
                    }`}
                  >
                    {/* Small Cover Preview */}
                    <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 border border-[#222a3d]">
                      {renderBookCover(book, 'w-full h-full text-[8px]')}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#dae2fd] truncate">
                        {book.title}
                      </div>
                      <div className="text-[11px] text-[#86948a] truncate">
                        {book.author}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-[#131b2e] h-1.5 rounded-full overflow-hidden border border-[#222a3d]">
                          <div
                            className="bg-[#e5a93c] h-full rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-[#e5a93c] flex-shrink-0">
                          {book.currentPage}/{book.totalPages}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Quotes & Highlights (7 cols) */}
        <div className="lg:col-span-7 p-5 md:p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-[#e5a93c]" />
              <h3 className="text-xs font-mono text-[#86948a] uppercase font-semibold">
                {isRu ? 'Цитаты и Мысли' : 'Quotes & Key Insights'} ({selectedBook?.quotes.length || 0})
              </h3>
            </div>
            {selectedBook && (
              <button
                onClick={() => setIsAddQuoteModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-[#0b1326] hover:bg-[#171f33] text-xs font-mono text-[#e5a93c] border border-[#e5a93c]/30 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {isRu ? 'Добавить цитату' : 'Add Quote'}
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {!selectedBook || selectedBook.quotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#86948a] border border-dashed border-[#222a3d] rounded-2xl space-y-2">
                <Quote className="w-6 h-6 mx-auto opacity-30 text-[#e5a93c]" />
                <p>
                  {isRu
                    ? 'Для этой книги пока нет сохраненных цитат. Добавьте яркие фрагменты при чтении.'
                    : 'No quotes saved for this book yet. Capture memorable passages while reading.'}
                </p>
              </div>
            ) : (
              selectedBook.quotes.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-[#0b1326] border border-[#222a3d] space-y-2 relative group hover:border-[#e5a93c]/30 transition-all"
                >
                  <p className="text-xs text-[#dae2fd] italic font-serif leading-relaxed select-text">
                    "{q.text}"
                  </p>
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#86948a] pt-1">
                    <span>{q.page ? `${isRu ? 'Стр.' : 'Page'} ${q.page}` : isRu ? 'Фрагмент' : 'Highlight'}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyQuote(q.text, q.id)}
                        className="hover:text-[#dae2fd] flex items-center gap-1 transition-colors"
                        title={isRu ? 'Копировать' : 'Copy'}
                      >
                        {copiedQuoteId === q.id ? (
                          <Check className="w-3 h-3 text-[#00ffab]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => storage.deleteBookQuote(selectedBook.id, q.id)}
                        className="hover:text-[#ffb4ab] transition-colors"
                        title={isRu ? 'Удалить' : 'Delete'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Book Modal Component */}
      {isAddBookModalOpen && renderAddBookModal()}

      {/* Add Quote Modal */}
      {isAddQuoteModalOpen && selectedBook && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                {isRu ? `Цитата для "${selectedBook.title}"` : `Add Quote for ${selectedBook.title}`}
              </h3>
              <button
                onClick={() => setIsAddQuoteModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuoteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'ТЕКСТ ЦИТАТЫ *' : 'QUOTE TEXT *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder={isRu ? 'Вставьте важную мысль или отрывок из книги...' : 'Paste notable excerpt or quote...'}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'НОМЕР СТРАНИЦЫ (ОПЦИОНАЛЬНО)' : 'PAGE NUMBER (OPTIONAL)'}
                </label>
                <input
                  type="number"
                  value={quotePage}
                  onChange={(e) => setQuotePage(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsAddQuoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#222a3d]"
                >
                  {isRu ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#e5a93c] text-[#001e2f] font-mono text-xs font-semibold rounded-xl"
                >
                  {isRu ? 'Сохранить цитату' : 'Save Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Helper Modal Renderer
  function renderAddBookModal() {
    return (
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-lg bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4 my-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#e5a93c]" />
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                {isRu ? 'Добавить новую книгу' : 'Add Book to Library'}
              </h3>
            </div>
            <button
              onClick={() => setIsAddBookModalOpen(false)}
              className="text-[#86948a] hover:text-[#dae2fd]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleAddBookSubmit} className="space-y-4">
            {/* Title (req) */}
            <div>
              <label className="block text-xs font-mono text-[#86948a] mb-1">
                {isRu ? 'НАЗВАНИЕ КНИГИ *' : 'BOOK TITLE *'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isRu ? 'например, Чистый Код / Clean Code' : 'e.g. Clean Architecture'}
                className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
              />
            </div>

            {/* Author (req) */}
            <div>
              <label className="block text-xs font-mono text-[#86948a] mb-1">
                {isRu ? 'АВТОР *' : 'AUTHOR *'}
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={isRu ? 'например, Роберт Мартин' : 'e.g. Robert C. Martin'}
                className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
              />
            </div>

            {/* Total Pages & Current Page */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'ВСЕГО СТРАНИЦ *' : 'TOTAL PAGES *'}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'ТЕКУЩАЯ СТРАНИЦА' : 'CURRENT PAGE'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
              </div>
            </div>

            {/* Status & Genre */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'СТАТУС' : 'STATUS'}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Book['status'])}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                >
                  <option value="reading">{isRu ? 'Читаю сейчас' : 'Reading'}</option>
                  <option value="want_to_read">{isRu ? 'В планах' : 'Want to Read'}</option>
                  <option value="completed">{isRu ? 'Прочитано' : 'Completed'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  {isRu ? 'ЖАНР / КАТЕГОРИЯ' : 'GENRE / CATEGORY'}
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="IT, Sci-Fi..."
                  list="genre-list"
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
                <datalist id="genre-list">
                  {GENRE_PRESETS.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Cover URL or Color Preset */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-[#86948a]">
                {isRu ? 'ОБЛОЖКА (URL ИЛИ ВЫБОР ЦВЕТА)' : 'COVER IMAGE URL / COLOR PRESET'}
              </label>
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
              />

              {!coverUrl && (
                <div className="pt-1">
                  <span className="text-[11px] text-[#86948a] block mb-1.5">
                    {isRu ? 'Или выберите фирменный градиент обложки:' : 'Or pick a cover gradient palette:'}
                  </span>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COVER_COLORS.map((col) => (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => setSelectedColor(col.value)}
                        className={`h-8 rounded-lg bg-gradient-to-br ${col.value} border-2 transition-all flex items-center justify-center ${
                          selectedColor === col.value
                            ? 'border-white scale-105 shadow-md shadow-white/20'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        title={col.name}
                      >
                        {selectedColor === col.value && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-mono text-[#86948a] mb-1">
                {isRu ? 'ЗАМЕТКА / ВПЕЧАТЛЕНИЕ (ОПЦИОНАЛЬНО)' : 'INITIAL NOTES / THOUGHTS'}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isRu ? 'Почему эта книга важна для изучения...' : 'Key takeaways or reasons to read...'}
                className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[#222a3d]">
              <button
                type="button"
                onClick={() => setIsAddBookModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#222a3d] transition-colors"
              >
                {isRu ? 'Отмена' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#e5a93c] hover:bg-[#e5a93c]/90 text-[#001e2f] font-mono text-xs font-bold rounded-xl transition-all shadow-md shadow-[#e5a93c]/20"
              >
                {isRu ? 'Добавить в библиотеку' : 'Add to Library'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
};
