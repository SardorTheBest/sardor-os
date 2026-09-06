import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Bookmark,
  Play,
  Sparkles,
  Layers,
  FileText,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { AppState, Book } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';
import { i18n } from '../lib/i18n';
import { BookStatsModal } from './BookStatsModal';
import { BookReaderModal } from './BookReaderModal';
import { AddBookModal } from './AddBookModal';
import { EmptyState } from './EmptyState';

interface BooksModuleProps {
  state: AppState;
  onOpenDeepWork?: (book?: Book) => void;
}

export const BooksModule: React.FC<BooksModuleProps> = ({ state }) => {
  const isRu = i18n.getLanguage() === 'ru';

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'reading' | 'want_to_read' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Book for Stats Modal
  const [selectedBookForStats, setSelectedBookForStats] = useState<Book | null>(null);

  // Active Book for Fullscreen Reader
  const [activeReadingBook, setActiveReadingBook] = useState<Book | null>(null);

  // Add Book Modal
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return state.books.filter((b) => {
      // Status filter
      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = b.title.toLowerCase().includes(query);
        const matchAuthor = b.author.toLowerCase().includes(query);
        const matchGenre = b.genre?.toLowerCase().includes(query);
        if (!matchTitle && !matchAuthor && !matchGenre) return false;
      }
      return true;
    });
  }, [state.books, statusFilter, searchQuery]);

  // Total counts
  const counts = useMemo(() => {
    const reading = state.books.filter((b) => b.status === 'reading').length;
    const completed = state.books.filter((b) => b.status === 'completed').length;
    const want = state.books.filter((b) => b.status === 'want_to_read').length;
    return { all: state.books.length, reading, completed, want };
  }, [state.books]);

  const handleOpenStats = (book: Book) => {
    sound.playClick();
    setSelectedBookForStats(book);
  };

  const handleStartReading = (book: Book) => {
    setSelectedBookForStats(null);
    setActiveReadingBook(book);
  };

  const handleDeleteBook = (bookId: string) => {
    storage.deleteBook(bookId);
    if (selectedBookForStats?.id === bookId) {
      setSelectedBookForStats(null);
    }
  };

  const handleCloseReader = () => {
    setActiveReadingBook(null);
  };

  const handleUpdateBook = (updated: Book) => {
    setSelectedBookForStats((prev) => (prev?.id === updated.id ? updated : prev));
    setActiveReadingBook((prev) => (prev && prev.id === updated.id ? updated : null));
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* ================= HEADER & TOOLBAR ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Stats */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#dae2fd] font-display tracking-tight">
              {isRu ? 'Библиотека' : 'Library'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#00ffab]/10 border border-[#00ffab]/20 text-[#00ffab] text-xs font-mono font-medium">
              {counts.all} {isRu ? 'книг' : 'books'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#86948a] mt-1">
            {isRu
              ? 'Ваша коллекция книг и персональная офлайн-читалка'
              : 'Your personal book collection & offline e-reader'}
          </p>
        </div>

        {/* Action Button: + Add Book */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddBookModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00ffab] to-[#00e5ff] text-[#002114] font-semibold text-xs sm:text-sm shadow-lg shadow-[#00ffab]/20 hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{isRu ? 'Добавить книгу' : 'Add Book'}</span>
          </button>
        </div>
      </div>

      {/* ================= CONTROLS: SEARCH & STATUS TABS ================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] overflow-x-auto">
          {[
            { id: 'all', label: isRu ? 'Все' : 'All', count: counts.all },
            { id: 'reading', label: isRu ? 'Читаю' : 'Reading', count: counts.reading },
            { id: 'completed', label: isRu ? 'Прочитано' : 'Completed', count: counts.completed },
            { id: 'want_to_read', label: isRu ? 'В планах' : 'Want to read', count: counts.want },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id as any);
                sound.playClick();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-white/10 text-[#00ffab] shadow-sm font-semibold'
                  : 'text-[#86948a] hover:text-[#dae2fd] hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.id
                    ? 'bg-[#00ffab]/20 text-[#00ffab]'
                    : 'bg-white/5 text-[#86948a]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-[#86948a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRu ? 'Поиск по названию или автору...' : 'Search by title or author...'}
            className="w-full pl-9 pr-3.5 py-2 bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-[#dae2fd] placeholder-[#86948a] focus:outline-none focus:border-[#00ffab] transition-colors"
          />
        </div>
      </div>

      {/* ================= AQIL READER STYLE GRID COVER GALLERY ================= */}
      {filteredBooks.length === 0 ? (
        <div className="py-16">
          <EmptyState
            icon={BookOpen}
            title={isRu ? 'Книги не найдены' : 'No books found'}
            description={
              searchQuery
                ? isRu
                  ? 'По вашему поисковому запросу ничего не найдено.'
                  : 'Try adjusting your search query.'
                : isRu
                ? 'Ваша библиотека пока пуста. Загрузите файлы EPUB, PDF, FB2 или добавьте книгу вручную!'
                : 'Your library is empty. Upload EPUB, PDF, FB2 files or add a book manually!'
            }
            actionLabel={isRu ? 'Добавить книгу' : 'Add Book'}
            onAction={() => setIsAddBookModalOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 pt-2">
          {filteredBooks.map((book) => {
            const total = Math.max(1, book.totalPages || 100);
            const current = Math.min(total, Math.max(0, book.currentPage || 0));
            const percent = Math.min(100, Math.round((current / total) * 100));

            return (
              <div
                key={book.id}
                onClick={() => handleOpenStats(book)}
                className="group flex flex-col cursor-pointer select-none"
              >
                {/* Book Cover Card (Aspect 2/3) */}
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-lg shadow-black/50 border border-[rgba(255,255,255,0.08)] bg-[#16171A] group-hover:shadow-2xl group-hover:shadow-[#00ffab]/10 group-hover:border-[rgba(255,255,255,0.18)] transition-all duration-300 transform group-hover:-translate-y-1.5">
                  {/* Cover Image or Auto-generated Minimalist Artwork */}
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${
                        book.coverColor || 'from-emerald-800 to-teal-950'
                      } flex flex-col justify-between p-3.5 text-white relative`}
                    >
                      {/* Geometric accent / foil detail */}
                      <div className="flex items-center justify-between">
                        <div className="w-5 h-0.5 bg-white/40 rounded-full" />
                        <div className="w-2 h-2 rounded-full border border-white/40" />
                      </div>

                      {/* Center Title */}
                      <div className="my-auto space-y-1 text-center">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-white/95 leading-tight line-clamp-3">
                          {book.title}
                        </h3>
                        <div className="w-8 h-px bg-white/30 mx-auto mt-2" />
                      </div>

                      {/* Author */}
                      <p className="text-[9px] uppercase tracking-wider text-white/70 text-center truncate">
                        {book.author}
                      </p>
                    </div>
                  )}

                  {/* 3D Spine Ridge Effect */}
                  <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/50 via-white/10 to-transparent pointer-events-none" />

                  {/* Top-Right Format Badge */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-mono font-bold text-white/90 border border-white/10 uppercase">
                    {book.fileType?.toUpperCase() || 'BOOK'}
                  </div>

                  {/* Completed Badge */}
                  {book.status === 'completed' && (
                    <div className="absolute top-2 left-2 p-1 rounded-full bg-emerald-500/90 text-white shadow-md">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  )}

                  {/* Bottom Reading Progress Bar */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-black/50">
                    <div
                      className="h-full bg-gradient-to-r from-[#00ffab] to-[#00e5ff] transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Hover Quick Action Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200">
                    <div className="w-10 h-10 rounded-full bg-[#00ffab] text-[#002114] flex items-center justify-center shadow-lg shadow-[#00ffab]/30 transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Minimalist Title & Author underneath */}
                <div className="mt-2.5 space-y-0.5 px-0.5">
                  <h4 className="text-xs sm:text-sm font-semibold text-[#dae2fd] line-clamp-1 leading-snug group-hover:text-[#00ffab] transition-colors">
                    {book.title}
                  </h4>
                  <p className="text-[11px] text-[#86948a] line-clamp-1">
                    {book.author}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#86948a] pt-0.5">
                    <span>
                      {current} / {total} {isRu ? 'стр.' : 'p.'}
                    </span>
                    <span className="text-[#00ffab] font-medium">
                      {percent}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= BOOK DETAILS & STATS MODAL ================= */}
      {selectedBookForStats && (
        <BookStatsModal
          book={selectedBookForStats}
          isOpen={!!selectedBookForStats}
          onClose={() => setSelectedBookForStats(null)}
          onStartReading={handleStartReading}
          onDeleteBook={handleDeleteBook}
          onUpdateBook={handleUpdateBook}
          sessions={state.readingSessions || []}
        />
      )}

      {/* ================= FULLSCREEN UNIVERSAL E-READER ================= */}
      {activeReadingBook && (
        <BookReaderModal
          book={activeReadingBook}
          isOpen={!!activeReadingBook}
          onClose={handleCloseReader}
          onUpdateBook={handleUpdateBook}
        />
      )}

      {/* ================= ADD BOOK MODAL ================= */}
      {isAddBookModalOpen && (
        <AddBookModal
          isOpen={isAddBookModalOpen}
          onClose={() => setIsAddBookModalOpen(false)}
          onBookAdded={(newBook) => {
            // Select newly added book stats
            setSelectedBookForStats(newBook);
          }}
        />
      )}
    </div>
  );
};
