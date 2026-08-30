import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Quote,
  Star,
  CheckCircle,
  Bookmark,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AppState, Book } from '../types';
import { storage } from '../lib/storage';

interface BooksModuleProps {
  state: AppState;
}

export const BooksModule: React.FC<BooksModuleProps> = ({ state }) => {
  const [selectedBookId, setSelectedBookId] = useState<string>(
    state.books.find((b) => b.status === 'reading')?.id || state.books[0]?.id || ''
  );
  
  // Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loggedPagesInput, setLoggedPagesInput] = useState('');

  // Modals
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isAddQuoteModalOpen, setIsAddQuoteModalOpen] = useState(false);
  
  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newTotalPages, setNewTotalPages] = useState('300');
  const [newCoverUrl, setNewCoverUrl] = useState('');

  const [quoteText, setQuoteText] = useState('');
  const [quotePage, setQuotePage] = useState('');

  const selectedBook = state.books.find((b) => b.id === selectedBookId) || state.books[0];

  // Timer Tick
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleFinishTimer = () => {
    setIsTimerRunning(false);
    const pages = parseInt(loggedPagesInput, 10);
    if (!isNaN(pages) && pages > 0 && selectedBook) {
      storage.updateBook(selectedBook.id, {
        currentPage: Math.min(selectedBook.totalPages, selectedBook.currentPage + pages),
      });
    }
    setTimerSeconds(0);
    setLoggedPagesInput('');
  };

  const handleAddQuote = (e: React.FormEvent) => {
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

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAuthor.trim()) return;
    const total = parseInt(newTotalPages, 10) || 300;
    const created = storage.addBook({
      title: newTitle.trim(),
      author: newAuthor.trim(),
      totalPages: total,
      currentPage: 0,
      status: 'reading',
      rating: 5,
      coverUrl: newCoverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
    });
    setSelectedBookId(created.id);
    setIsAddBookModalOpen(false);
  };

  if (!selectedBook) {
    return (
      <div className="p-12 text-center text-[#86948a] rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        No books in your library yet.
      </div>
    );
  }

  const progressPct = Math.round((selectedBook.currentPage / selectedBook.totalPages) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#e5a93c] mb-1">
            <BookOpen className="w-4 h-4 text-[#e5a93c]" />
            DEEP SPACE READING VAULT
          </div>
          <h2 className="text-2xl font-bold text-[#dae2fd] font-display">
            Reading & Knowledge Synthesis
          </h2>
        </div>

        <button
          onClick={() => setIsAddBookModalOpen(true)}
          className="px-4 py-2 bg-[#e5a93c] hover:bg-[#e5a93c]/90 text-[#001e2f] font-semibold text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-[#e5a93c]/20"
        >
          <Plus className="w-4 h-4" />
          Add Book
        </button>
      </div>

      {/* Main Selected Book Hero Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-2xl bg-gradient-to-r from-[#131b2e] via-[#171f33] to-[#131b2e] border border-[#222a3d] shadow-xl">
        {/* Book Cover */}
        <div className="lg:col-span-3 flex justify-center">
          <div className="relative group">
            <img
              src={selectedBook.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400'}
              alt={selectedBook.title}
              referrerPolicy="no-referrer"
              className="w-44 h-64 object-cover rounded-xl border border-[#222a3d] shadow-2xl shadow-black/60"
            />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#0b1326]/90 border border-[#e5a93c]/40 text-[10px] font-mono text-[#e5a93c]">
              {progressPct}% Done
            </div>
          </div>
        </div>

        {/* Book Info & Stats */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#e5a93c] uppercase px-2 py-0.5 rounded bg-[#e5a93c]/10 border border-[#e5a93c]/30">
                {selectedBook.status.replace('_', ' ')}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[#dae2fd] font-display mt-2">
              {selectedBook.title}
            </h3>
            <p className="text-sm text-[#bbcabf] font-sans mt-0.5">
              by {selectedBook.author}
            </p>

            {selectedBook.notes && (
              <p className="text-xs text-[#86948a] mt-3 bg-[#0b1326]/60 p-3 rounded-xl border border-[#222a3d]">
                "{selectedBook.notes}"
              </p>
            )}
          </div>

          {/* Progress Bar & Page Counters */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono text-[#bbcabf]">
              <span>Page {selectedBook.currentPage} of {selectedBook.totalPages}</span>
              <span className="text-[#e5a93c] font-bold">{selectedBook.totalPages - selectedBook.currentPage} pages left</span>
            </div>
            <div className="w-full bg-[#0b1326] h-2.5 rounded-full overflow-hidden border border-[#222a3d]">
              <div
                className="bg-gradient-to-r from-[#e5a93c] to-[#00ffab] h-full rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Quick Page Update Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() =>
                  storage.updateBook(selectedBook.id, {
                    currentPage: Math.min(selectedBook.totalPages, selectedBook.currentPage + 5),
                  })
                }
                className="px-3 py-1 rounded-lg bg-[#0b1326] hover:bg-[#1b2332] text-xs font-mono text-[#dae2fd] border border-[#222a3d]"
              >
                +5 pgs
              </button>
              <button
                onClick={() =>
                  storage.updateBook(selectedBook.id, {
                    currentPage: Math.min(selectedBook.totalPages, selectedBook.currentPage + 15),
                  })
                }
                className="px-3 py-1 rounded-lg bg-[#0b1326] hover:bg-[#1b2332] text-xs font-mono text-[#dae2fd] border border-[#222a3d]"
              >
                +15 pgs
              </button>
              <button
                onClick={() =>
                  storage.updateBook(selectedBook.id, {
                    currentPage: Math.min(selectedBook.totalPages, selectedBook.currentPage + 30),
                  })
                }
                className="px-3 py-1 rounded-lg bg-[#0b1326] hover:bg-[#1b2332] text-xs font-mono text-[#dae2fd] border border-[#222a3d]"
              >
                +30 pgs
              </button>
            </div>
          </div>
        </div>

        {/* Live Session Reading Timer */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-[#0b1326]/80 border border-[#222a3d] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#89ceff]">
              <Clock className="w-4 h-4" />
              FOCUS READING TIMER
            </div>
            <div className="text-3xl font-mono font-bold text-[#dae2fd] my-2">
              {formatTimer(timerSeconds)}
            </div>
            <p className="text-[11px] text-[#86948a]">
              Immersive reading session counter.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={loggedPagesInput}
                onChange={(e) => setLoggedPagesInput(e.target.value)}
                placeholder="Pages read..."
                className="w-full bg-[#131b2e] border border-[#222a3d] rounded-xl px-3 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
              />
            </div>

            <div className="flex gap-2">
              {!isTimerRunning ? (
                <button
                  onClick={() => setIsTimerRunning(true)}
                  className="flex-1 py-2 bg-[#4edea3] hover:bg-[#10b981] text-[#003824] font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Start
                </button>
              ) : (
                <button
                  onClick={() => setIsTimerRunning(false)}
                  className="flex-1 py-2 bg-[#e5a93c] text-[#001e2f] font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
              )}

              <button
                onClick={handleFinishTimer}
                className="px-3 py-2 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] font-mono text-xs rounded-xl"
              >
                Log Session
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Library Shelf & Quotes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Books Shelf (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-4">
          <h3 className="text-sm font-mono text-[#86948a] uppercase font-semibold">
            Library Shelf ({state.books.length})
          </h3>

          <div className="space-y-2.5">
            {state.books.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelectedBookId(book.id)}
                className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                  selectedBook.id === book.id
                    ? 'bg-[#171f33] border-[#e5a93c]/50 shadow-sm'
                    : 'bg-[#0b1326] border-[#222a3d] hover:border-[#3c4a42]'
                }`}
              >
                <div className="w-10 h-14 bg-[#131b2e] rounded overflow-hidden flex-shrink-0 border border-[#222a3d]">
                  {book.coverUrl && (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#dae2fd] truncate">
                    {book.title}
                  </div>
                  <div className="text-[11px] text-[#86948a] truncate">
                    {book.author}
                  </div>
                  <div className="text-[10px] font-mono text-[#e5a93c] mt-1">
                    {book.currentPage}/{book.totalPages} pgs
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quotes & Highlights (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-[#e5a93c]" />
              <h3 className="text-sm font-mono text-[#86948a] uppercase font-semibold">
                Quotes & Key Insights ({selectedBook.quotes.length})
              </h3>
            </div>
            <button
              onClick={() => setIsAddQuoteModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#0b1326] hover:bg-[#171f33] text-xs font-mono text-[#e5a93c] border border-[#e5a93c]/30 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Quote
            </button>
          </div>

          <div className="space-y-3">
            {selectedBook.quotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#86948a] border border-dashed border-[#222a3d] rounded-xl">
                No quotes saved for this book yet. Capture memorable passages while reading.
              </div>
            ) : (
              selectedBook.quotes.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-[#0b1326] border border-[#222a3d] space-y-2 relative group"
                >
                  <p className="text-xs text-[#dae2fd] italic font-serif leading-relaxed">
                    "{q.text}"
                  </p>
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#86948a] pt-1">
                    <span>{q.page ? `Page ${q.page}` : 'Highlight'}</span>
                    <span>{q.createdAt}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Book Modal */}
      {isAddBookModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                Add Book to Library
              </h3>
              <button
                onClick={() => setIsAddBookModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  BOOK TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Clean Code"
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  AUTHOR *
                </label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="e.g. Robert C. Martin"
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  TOTAL PAGES
                </label>
                <input
                  type="number"
                  value={newTotalPages}
                  onChange={(e) => setNewTotalPages(e.target.value)}
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  COVER IMAGE URL (OPTIONAL)
                </label>
                <input
                  type="url"
                  value={newCoverUrl}
                  onChange={(e) => setNewCoverUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsAddBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#222a3d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#e5a93c] text-[#001e2f] font-mono text-xs font-semibold rounded-xl"
                >
                  Add Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Quote Modal */}
      {isAddQuoteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                Add Quote for {selectedBook.title}
              </h3>
              <button
                onClick={() => setIsAddQuoteModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuote} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  QUOTE TEXT *
                </label>
                <textarea
                  rows={3}
                  required
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="Paste notable excerpt or quote..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  PAGE NUMBER (OPTIONAL)
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#e5a93c] text-[#001e2f] font-mono text-xs font-semibold rounded-xl"
                >
                  Save Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
