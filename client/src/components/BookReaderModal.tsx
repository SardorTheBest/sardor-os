import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
  Type,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Search,
  Sparkles,
  RotateCcw,
  Share2,
  Quote,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Sliders,
  FileText,
  SlidersHorizontal,
  Highlighter,
  MessageSquare,
  Trash2,
  Edit2,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { Book, BookChapter, BookQuote, BookHighlight } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';
import { i18n } from '../lib/i18n';
import { bookFileStorage } from '../lib/bookFileStorage';
import { QuoteCardGeneratorModal } from './QuoteCardGeneratorModal';

interface BookReaderModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBook?: (book: Book) => void;
}

export type ReaderTheme = 'dark' | 'light' | 'sepia' | 'oled';
export type ReaderFont = 'sans' | 'serif' | 'mono';

const THEME_STYLES: Record<
  ReaderTheme,
  {
    bg: string;
    text: string;
    subText: string;
    border: string;
    accent: string;
    cardBg: string;
    highlight: string;
  }
> = {
  dark: {
    bg: 'bg-[#121316]',
    text: 'text-[#dae2fd]',
    subText: 'text-[#86948a]',
    border: 'border-[rgba(255,255,255,0.08)]',
    accent: '#00ffab',
    cardBg: 'bg-[#16171A]',
    highlight: 'bg-[#00ffab]/20 text-[#00ffab]',
  },
  light: {
    bg: 'bg-[#faf8f5]',
    text: 'text-[#1e293b]',
    subText: 'text-[#64748b]',
    border: 'border-[#e2e8f0]',
    accent: '#0284c7',
    cardBg: 'bg-[#ffffff]',
    highlight: 'bg-amber-200/80 text-amber-950',
  },
  sepia: {
    bg: 'bg-[#f4ecd8]',
    text: 'text-[#433422]',
    subText: 'text-[#7d6952]',
    border: 'border-[#decbb0]',
    accent: '#b45309',
    cardBg: 'bg-[#ebe1ca]',
    highlight: 'bg-[#f5c66b]/40 text-[#433422]',
  },
  oled: {
    bg: 'bg-[#000000]',
    text: 'text-[#e5e5e5]',
    subText: 'text-[#737373]',
    border: 'border-[#262626]',
    accent: '#10b981',
    cardBg: 'bg-[#0d0d0d]',
    highlight: 'bg-emerald-950 text-emerald-300',
  },
};

// 5 Distinctive Highlighting Colors
export const HIGHLIGHT_COLORS = [
  { id: 'mint', color: '#00ffab', label: 'Изумруд', textCol: '#002114' },
  { id: 'amber', color: '#fbbf24', label: 'Янтарь', textCol: '#451a03' },
  { id: 'cyan', color: '#38bdf8', label: 'Небесный', textCol: '#082f49' },
  { id: 'rose', color: '#fb7185', label: 'Коралл', textCol: '#4c0519' },
  { id: 'violet', color: '#c084fc', label: 'Лаванда', textCol: '#3b0764' },
];

export const BookReaderModal: React.FC<BookReaderModalProps> = ({
  book,
  isOpen,
  onClose,
  onUpdateBook,
}) => {
  const isRu = i18n.getLanguage() === 'ru';
  const isClosingRef = useRef(false);

  // Format determination
  const isPdf = book.fileType === 'pdf' || (book.fileDataUrl && book.fileDataUrl.startsWith('data:application/pdf'));

  // Reader Settings State
  const [currentPage, setCurrentPage] = useState<number>(() => Math.max(1, book.currentPage || 1));
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [fontSize, setFontSize] = useState<number>(book.fontSize || 18);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>(book.readerTheme || 'dark');
  const [fontFamily, setFontFamily] = useState<ReaderFont>(book.fontFamily || 'serif');
  const [lineHeight, setLineHeight] = useState<'compact' | 'normal' | 'relaxed'>('normal');

  // Controls visibility
  const [showControls, setShowControls] = useState(true);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnnotationsDrawerOpen, setIsAnnotationsDrawerOpen] = useState(false);

  // Local Highlights State
  const [bookHighlights, setBookHighlights] = useState<BookHighlight[]>(book.highlights || []);

  // PDF Rendering State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(book.totalPages || 1);
  const [pdfZoom, setPdfZoom] = useState<number>(1.0);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Text Selection & Highlighting State
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingHighlight, setPendingHighlight] = useState<{ text: string; color: string } | null>(null);
  const [annotationNoteInput, setAnnotationNoteInput] = useState('');
  const [activeHighlightDetail, setActiveHighlightDetail] = useState<BookHighlight | null>(null);
  const [editingDetailNote, setEditingDetailNote] = useState(false);
  const [detailNoteInput, setDetailNoteInput] = useState('');
  const [highlightsColorFilter, setHighlightsColorFilter] = useState<string>('all');

  // Quote Card Modal
  const [isQuoteCardModalOpen, setIsQuoteCardModalOpen] = useState(false);
  const [quoteCardText, setQuoteCardText] = useState('');
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reading Timer & Session Logging
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [startPageAtSession] = useState(book.currentPage || 1);

  // Text to Speech
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Keep local highlights synced with prop
  useEffect(() => {
    if (book.highlights) {
      setBookHighlights(book.highlights);
    }
  }, [book.highlights]);

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Safe Close Handler
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (isSpeaking) {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      setIsSpeaking(false);
    }

    // Save session if read for > 20s
    if (sessionSeconds > 20) {
      const minutes = Math.round(sessionSeconds / 60);
      const pagesRead = Math.max(1, Math.abs(currentPage - startPageAtSession));
      storage.logReadingSession(book.id, Math.max(1, minutes), pagesRead);
    }

    // Persist progress to storage without triggering parent re-render that could re-open
    const totalPages = isPdf ? pdfTotalPages : book.totalPages || 100;
    const progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100));
    storage.updateBook(book.id, {
      currentPage,
      lastReadPosition: progressPercent,
      readerTheme,
      fontSize,
      fontFamily,
    });

    sound.playClick();
    onClose();
  }, [
    isSpeaking,
    sessionSeconds,
    currentPage,
    startPageAtSession,
    book.id,
    book.totalPages,
    isPdf,
    pdfTotalPages,
    readerTheme,
    fontSize,
    fontFamily,
    onClose,
  ]);

  // Derived chapters or fallback
  const chapters: BookChapter[] = useMemo(() => {
    if (book.chapters && book.chapters.length > 0) {
      return book.chapters;
    }
    if (book.content) {
      return [
        {
          id: 'ch-full',
          title: book.title,
          content: book.content,
        },
      ];
    }
    return [
      {
        id: 'ch-sample',
        title: 'Глава 1: Введение',
        content: `### ${book.title}\n\n*Автор: ${book.author}*\n\nДобро пожаловать в офлайн-читалку Zenith OS! Вы можете загрузить книгу в формате **EPUB**, **PDF** или **FB2** — файл надежно сохранится в IndexedDB (Dexie) для чтения без интернета.\n\n> «Чтение — это для ума то же, что физические упражнения для тела.»\n\nВыделяйте любой текст маркером — заметки и цитаты автоматически привяжутся к книге и синхронизируются с разделом Заметки.`,
      },
    ];
  }, [book]);

  const activeChapter = chapters[currentChapterIdx] || chapters[0];

  // 1. Session Timer
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Save reading progress while actively reading
  const saveReadingProgress = useCallback(
    (pageToSave: number, notifyParent: boolean = true) => {
      if (isClosingRef.current) return;
      const totalPages = isPdf ? pdfTotalPages : book.totalPages || 100;
      const progressPercent = Math.min(100, Math.round((pageToSave / totalPages) * 100));
      const updated = storage.updateBook(book.id, {
        currentPage: pageToSave,
        lastReadPosition: progressPercent,
        readerTheme,
        fontSize,
        fontFamily,
      });
      if (notifyParent && updated && onUpdateBook && !isClosingRef.current) {
        onUpdateBook(updated);
      }
    },
    [book.id, book.totalPages, isPdf, pdfTotalPages, readerTheme, fontSize, fontFamily, onUpdateBook]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!isClosingRef.current) {
        if (sessionSeconds > 20) {
          const minutes = Math.round(sessionSeconds / 60);
          const pagesRead = Math.max(1, Math.abs(currentPage - startPageAtSession));
          storage.logReadingSession(book.id, Math.max(1, minutes), pagesRead);
        }
        const totalPages = isPdf ? pdfTotalPages : book.totalPages || 100;
        const progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100));
        storage.updateBook(book.id, {
          currentPage,
          lastReadPosition: progressPercent,
        });
      }
    };
  }, [sessionSeconds, currentPage, startPageAtSession, book.id, isPdf, pdfTotalPages, book.totalPages]);

  // 2. Load PDF from Dexie or fileDataUrl
  useEffect(() => {
    if (!isOpen || !isPdf) return;

    let isMounted = true;
    setIsPdfLoading(true);

    const loadPdfData = async () => {
      try {
        let pdfSource: any = null;
        const arrayBuf = await bookFileStorage.getBookArrayBuffer(book.id);
        if (arrayBuf) {
          pdfSource = { data: arrayBuf };
        } else if (book.fileDataUrl) {
          pdfSource = { url: book.fileDataUrl };
        }

        if (!pdfSource) {
          setIsPdfLoading(false);
          return;
        }

        const task = pdfjs.getDocument({
          ...pdfSource,
          useSystemFonts: true,
        } as any);

        const doc = await task.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setPdfTotalPages(doc.numPages);
        if (book.totalPages !== doc.numPages) {
          storage.updateBook(book.id, { totalPages: doc.numPages });
        }
        setIsPdfLoading(false);
      } catch (err) {
        console.error('Error loading PDF in reader:', err);
        if (isMounted) setIsPdfLoading(false);
      }
    };

    loadPdfData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isPdf, book.id, book.fileDataUrl, book.totalPages]);

  // 3. Render PDF Page on Canvas
  useEffect(() => {
    if (!isPdf || !pdfDoc || !pdfCanvasRef.current) return;

    let renderTask: any = null;

    const renderPage = async () => {
      try {
        const pageNumber = Math.min(Math.max(1, currentPage), pdfTotalPages);
        const page = await pdfDoc.getPage(pageNumber);

        const canvas = pdfCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const baseViewport = page.getViewport({ scale: 1.0 });
        const containerWidth = Math.min(window.innerWidth - 32, 900);
        const scale = (containerWidth / baseViewport.width) * pdfZoom;
        const viewport = page.getViewport({ scale });

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF page rendering warning:', err);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
    };
  }, [isPdf, pdfDoc, currentPage, pdfZoom, pdfTotalPages]);

  // 4. Page Navigation Handlers
  const handleNextPage = () => {
    const maxPages = isPdf ? pdfTotalPages : book.totalPages || chapters.length || 100;
    if (currentPage < maxPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      saveReadingProgress(nextPage);
      sound.playClick();
      if (!isPdf && chapters.length > 1) {
        const chIdx = Math.min(chapters.length - 1, Math.floor((nextPage / maxPages) * chapters.length));
        setCurrentChapterIdx(chIdx);
      }
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      saveReadingProgress(prevPage);
      sound.playClick();
      if (!isPdf && chapters.length > 1) {
        const chIdx = Math.max(0, Math.floor(((prevPage - 1) / (book.totalPages || 100)) * chapters.length));
        setCurrentChapterIdx(chIdx);
      }
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleJumpToPage = (targetPage: number) => {
    const maxPages = isPdf ? pdfTotalPages : book.totalPages || 100;
    const bounded = Math.max(1, Math.min(maxPages, targetPage));
    setCurrentPage(bounded);
    saveReadingProgress(bounded);
    if (!isPdf && chapters.length > 1) {
      const chIdx = Math.min(chapters.length - 1, Math.floor((bounded / maxPages) * chapters.length));
      setCurrentChapterIdx(chIdx);
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 5. Center Tap Detection (Aqil Reader experience)
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('a') ||
      target.closest('mark') ||
      target.closest('.modal-content')
    ) {
      return;
    }

    // Near top edge -> always toggle controls rather than page turn
    if (e.clientY < 70) {
      setShowControls((prev) => !prev);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    // Left 20% -> Prev Page
    if (clickX < width * 0.2) {
      handlePrevPage();
      return;
    }

    // Right 20% -> Next Page
    if (clickX > width * 0.8) {
      handleNextPage();
      return;
    }

    // Center 60% -> Toggle UI panels
    setShowControls((prev) => !prev);
    setIsSettingsOpen(false);
    setIsTocOpen(false);
    setIsAnnotationsDrawerOpen(false);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (pendingHighlight) {
          setPendingHighlight(null);
        } else if (activeHighlightDetail) {
          setActiveHighlightDetail(null);
        } else if (isAnnotationsDrawerOpen) {
          setIsAnnotationsDrawerOpen(false);
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isTocOpen) {
          setIsTocOpen(false);
        } else {
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    currentPage,
    pdfTotalPages,
    book.totalPages,
    pendingHighlight,
    activeHighlightDetail,
    isAnnotationsDrawerOpen,
    isSettingsOpen,
    isTocOpen,
    handleClose,
  ]);

  // Text Selection Tracking
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 2) {
      const text = selection.toString().trim();
      setSelectedText(text);
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionPos({
        x: Math.max(120, Math.min(window.innerWidth - 120, rect.left + rect.width / 2)),
        y: Math.max(80, rect.top - 14),
      });
    } else {
      if (!pendingHighlight) {
        setSelectedText('');
        setSelectionPos(null);
      }
    }
  };

  // Highlight Selection with Color
  const handleSelectColor = (colorHex: string) => {
    if (!selectedText) return;
    setPendingHighlight({
      text: selectedText,
      color: colorHex,
    });
    setAnnotationNoteInput('');
  };

  // Confirm Highlight and Save to Book & Note Collection
  const handleConfirmHighlight = (noteText?: string) => {
    if (!pendingHighlight) return;

    const result = storage.addBookHighlight(
      book.id,
      pendingHighlight.text,
      pendingHighlight.color,
      noteText,
      currentPage
    );

    if (result) {
      setBookHighlights(result.book.highlights || []);
      if (onUpdateBook) {
        onUpdateBook(result.book);
      }
      showToast(isRu ? '✓ Выделено и сохранено в Заметки' : '✓ Highlighted & saved to Notes');
    }

    setPendingHighlight(null);
    setSelectedText('');
    setSelectionPos(null);
    setAnnotationNoteInput('');
    window.getSelection()?.removeAllRanges();
  };

  const handleSaveSelectionAsQuote = () => {
    if (!selectedText) return;
    storage.addBookQuote(book.id, selectedText, currentPage);
    setSelectedText('');
    setSelectionPos(null);
    setCopiedQuote(true);
    sound.playPop();
    showToast(isRu ? '✓ Добавлено в цитаты' : '✓ Added to quotes');
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  const handleOpenQuoteCard = () => {
    if (!selectedText) return;
    setQuoteCardText(selectedText);
    setIsQuoteCardModalOpen(true);
    setSelectedText('');
    setSelectionPos(null);
    setPendingHighlight(null);
  };

  // Delete an existing highlight
  const handleDeleteHighlight = (highlightId: string) => {
    const updated = storage.deleteBookHighlight(book.id, highlightId);
    if (updated) {
      setBookHighlights(updated.highlights || []);
      if (onUpdateBook) onUpdateBook(updated);
      showToast(isRu ? 'Выделение удалено' : 'Highlight deleted');
    }
    setActiveHighlightDetail(null);
  };

  // Update existing highlight note
  const handleSaveDetailNote = () => {
    if (!activeHighlightDetail) return;
    const updated = storage.updateBookHighlight(book.id, activeHighlightDetail.id, {
      note: detailNoteInput.trim() || undefined,
    });
    if (updated) {
      setBookHighlights(updated.highlights || []);
      if (onUpdateBook) onUpdateBook(updated);
      setActiveHighlightDetail({
        ...activeHighlightDetail,
        note: detailNoteInput.trim() || undefined,
      });
      showToast(isRu ? 'Заметка сохранена' : 'Note updated');
    }
    setEditingDetailNote(false);
  };

  // TTS Speech Synthesizer
  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = activeChapter?.content?.replace(/<[^>]*>?/gm, '') || book.title;
    if (!textToRead) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = isRu ? 'ru-RU' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Dynamic Content with Highlight Injection for EPUB/HTML/Text
  const renderedChapterContent = useMemo(() => {
    let content = activeChapter.content || '';
    if (!content) return '';

    const highlights = bookHighlights || [];
    if (highlights.length === 0) return content;

    try {
      highlights.forEach((hl) => {
        if (!hl.text || hl.text.trim().length < 2) return;
        const escaped = hl.text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match occurrences outside of html tag brackets
        const regex = new RegExp(`(?![^<]*>)(${escaped})`, 'gi');
        content = content.replace(
          regex,
          `<mark class="book-highlight-mark cursor-pointer rounded px-1 transition-all hover:brightness-110" data-hl-id="${hl.id}" style="background-color: ${hl.color}45; border-bottom: 2px solid ${hl.color}; color: inherit;" title="${hl.note ? `Заметка: ${hl.note}` : 'Нажмите для просмотра аннотации'}">$1</mark>`
        );
      });
    } catch (e) {
      console.warn('Highlight injection error:', e);
    }

    return content;
  }, [activeChapter.content, bookHighlights]);

  // Click on rendered text container to detect highlight clicks
  const handleContentContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const markEl = target.closest('mark[data-hl-id]') as HTMLElement;
    if (markEl) {
      e.stopPropagation();
      const hlId = markEl.getAttribute('data-hl-id');
      const hl = (bookHighlights || []).find((h) => h.id === hlId);
      if (hl) {
        setActiveHighlightDetail(hl);
        setDetailNoteInput(hl.note || '');
        setEditingDetailNote(false);
        sound.playPop();
      }
      return;
    }
    handleContentClick(e);
  };

  if (!isOpen) return null;

  const currentTheme = THEME_STYLES[readerTheme];
  const maxPages = isPdf ? pdfTotalPages : book.totalPages || 100;
  const progressPercent = Math.min(100, Math.round((currentPage / maxPages) * 100));

  const fontClass =
    fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const leadingClass =
    lineHeight === 'compact'
      ? 'leading-normal'
      : lineHeight === 'relaxed'
      ? 'leading-loose'
      : 'leading-relaxed';

  // Filtered highlights for the drawer
  const filteredDrawerHighlights = bookHighlights.filter((h) => {
    if (highlightsColorFilter === 'all') return true;
    return h.color === highlightsColorFilter;
  });

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex flex-col ${currentTheme.bg} ${currentTheme.text} select-text animate-fade-in overflow-hidden`}
      >
        {/* ================= PERSISTENT FLOATING EXIT BUTTON (ALWAYS ACCESSIBLE) ================= */}
        {!showControls && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="fixed top-3.5 left-3.5 z-50 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white/90 hover:text-white border border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-1.5 text-xs font-medium active:scale-95 transition-all group cursor-pointer"
            title={isRu ? 'Назад в библиотеку (Esc)' : 'Back to Library (Esc)'}
          >
            <ChevronLeft className="w-4 h-4 text-[#00ffab] group-hover:-translate-x-0.5 transition-transform" />
            <span>{isRu ? 'Библиотека' : 'Library'}</span>
          </button>
        )}

        {/* ================= TOP CONTROLS BAR ================= */}
        <div
          className={`absolute top-0 inset-x-0 z-30 transition-all duration-300 ${
            showControls
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-full pointer-events-none'
          } ${currentTheme.cardBg} border-b ${currentTheme.border} backdrop-blur-lg shadow-lg p-2.5 sm:px-6 flex items-center justify-between gap-2`}
        >
          {/* Back button & Book Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={handleClose}
              className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all text-inherit flex items-center gap-1 text-xs sm:text-sm font-medium"
              title={isRu ? 'Назад в библиотеку (Esc)' : 'Back to Library (Esc)'}
            >
              <ChevronLeft className="w-5 h-5 text-[#00ffab]" />
              <span className="hidden sm:inline font-semibold">{isRu ? 'Библиотека' : 'Library'}</span>
            </button>

            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-semibold truncate leading-tight font-display">
                {book.title}
              </h2>
              <p className={`text-[11px] ${currentTheme.subText} truncate mt-0.5`}>
                {book.author}
                {!isPdf && chapters.length > 1 && (
                  <span> • {activeChapter.title}</span>
                )}
              </p>
            </div>
          </div>

          {/* Top Actions: TOC, Highlights & Notes, TTS, Typography, Close */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Table of Contents */}
            {!isPdf && chapters.length > 1 && (
              <button
                onClick={() => {
                  setIsTocOpen(!isTocOpen);
                  setIsSettingsOpen(false);
                  setIsAnnotationsDrawerOpen(false);
                }}
                className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                  isTocOpen ? 'bg-white/10 text-[#00ffab]' : ''
                }`}
                title={isRu ? 'Оглавление' : 'Table of Contents'}
              >
                <List className="w-4 h-4" />
              </button>
            )}

            {/* Annotations & Notes Drawer Toggle */}
            <button
              onClick={() => {
                setIsAnnotationsDrawerOpen(!isAnnotationsDrawerOpen);
                setIsTocOpen(false);
                setIsSettingsOpen(false);
              }}
              className={`p-2 rounded-lg hover:bg-white/10 transition-colors relative ${
                isAnnotationsDrawerOpen ? 'bg-white/10 text-[#00ffab]' : ''
              }`}
              title={isRu ? 'Выделения и Заметки книги' : 'Book Highlights & Annotations'}
            >
              <Highlighter className="w-4 h-4" />
              {bookHighlights.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00ffab] text-[#002114] text-[9px] font-mono font-bold flex items-center justify-center shadow-sm">
                  {bookHighlights.length}
                </span>
              )}
            </button>

            {/* TTS Voice Read */}
            <button
              onClick={toggleSpeech}
              className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                isSpeaking ? 'bg-[#00ffab]/20 text-[#00ffab] animate-pulse' : ''
              }`}
              title={isSpeaking ? (isRu ? 'Остановить голос' : 'Stop speech') : (isRu ? 'Голосовое чтение' : 'Read aloud')}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Typography & Themes Menu Button */}
            <button
              onClick={() => {
                setIsSettingsOpen(!isSettingsOpen);
                setIsTocOpen(false);
                setIsAnnotationsDrawerOpen(false);
              }}
              className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                isSettingsOpen ? 'bg-white/10 text-[#00ffab]' : ''
              }`}
              title={isRu ? 'Шрифт и Темы' : 'Typography & Themes'}
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Zoom Controls for PDF */}
            {isPdf && (
              <div className="flex items-center gap-1 border-l border-white/10 pl-1 sm:pl-2">
                <button
                  onClick={() => setPdfZoom((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))))}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-inherit"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono opacity-70 w-9 text-center">
                  {Math.round(pdfZoom * 100)}%
                </span>
                <button
                  onClick={() => setPdfZoom((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))))}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-inherit"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 active:scale-95 transition-all text-inherit ml-1 text-[#86948a] hover:text-white"
              title={isRu ? 'Закрыть читалку (Esc)' : 'Exit Reader (Esc)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= TOAST NOTIFICATION ================= */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#16171A]/95 border border-[#00ffab]/40 text-[#00ffab] text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 animate-modal-float">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ================= TYPOGRAPHY & THEMES POPUP / BOTTOM SHEET ================= */}
        {isSettingsOpen && (
          <>
            <div
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:hidden animate-fade-in"
            />
            <div
              className={`fixed inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto sm:absolute sm:top-14 sm:right-6 z-50 w-full sm:w-80 rounded-t-2xl sm:rounded-xl ${currentTheme.cardBg} border-t sm:border ${currentTheme.border} shadow-2xl p-5 sm:p-4 space-y-4 max-h-[85vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom sm:animate-modal-float`}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-2 mb-2 sm:hidden" />
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider font-display flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#00ffab]" />
                {isRu ? 'Настройки чтения' : 'Reading Preferences'}
              </span>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-inherit opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Themes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium opacity-70">
                {isRu ? 'Тема оформления' : 'Theme'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'dark', label: 'Dark', bg: 'bg-[#121316]', border: 'border-white/20' },
                  { id: 'light', label: 'Light', bg: 'bg-[#faf8f5]', border: 'border-black/20' },
                  { id: 'sepia', label: 'Sepia', bg: 'bg-[#f4ecd8]', border: 'border-amber-900/20' },
                  { id: 'oled', label: 'OLED', bg: 'bg-[#000000]', border: 'border-emerald-500/30' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setReaderTheme(t.id as ReaderTheme);
                      sound.playClick();
                    }}
                    className={`h-9 rounded-lg ${t.bg} ${t.border} border text-[10px] font-medium flex items-center justify-center transition-all ${
                      readerTheme === t.id
                        ? 'ring-2 ring-[#00ffab] font-bold shadow-md'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className={t.id === 'light' || t.id === 'sepia' ? 'text-black' : 'text-white'}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] opacity-70">
                <span>{isRu ? 'Размер шрифта' : 'Font Size'}</span>
                <span className="font-mono">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFontSize((prev) => Math.max(12, prev - 2))}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold transition-colors"
                >
                  A-
                </button>
                <input
                  type="range"
                  min="12"
                  max="36"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-[#00ffab] cursor-pointer"
                />
                <button
                  onClick={() => setFontSize((prev) => Math.min(36, prev + 2))}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Font Family */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium opacity-70">
                {isRu ? 'Гарнитура' : 'Font Family'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'serif', label: 'Serif', font: 'font-serif' },
                  { id: 'sans', label: 'Sans', font: 'font-sans' },
                  { id: 'mono', label: 'Mono', font: 'font-mono' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFontFamily(f.id as ReaderFont);
                      sound.playClick();
                    }}
                    className={`h-8 rounded-lg border text-xs ${f.font} transition-all ${
                      fontFamily === f.id
                        ? 'border-[#00ffab] bg-[#00ffab]/10 text-[#00ffab] font-bold'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Spacing */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium opacity-70">
                {isRu ? 'Интервал' : 'Line Spacing'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'compact', label: isRu ? 'Сжатый' : 'Compact' },
                  { id: 'normal', label: isRu ? 'Стандарт' : 'Normal' },
                  { id: 'relaxed', label: isRu ? 'Просторный' : 'Relaxed' },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setLineHeight(l.id as any);
                      sound.playClick();
                    }}
                    className={`h-8 rounded-lg border text-[11px] transition-all ${
                      lineHeight === l.id
                        ? 'border-[#00ffab] bg-[#00ffab]/10 text-[#00ffab] font-bold'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            </div>
          </>
        )}

        {/* ================= TABLE OF CONTENTS SLIDE-OVER / BOTTOM SHEET ================= */}
        {isTocOpen && (
          <>
            <div
              onClick={() => setIsTocOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:hidden animate-fade-in"
            />
            <div
              className={`fixed inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto sm:absolute sm:top-14 sm:left-6 z-50 w-full sm:w-80 max-h-[85vh] sm:max-h-[75vh] rounded-t-2xl sm:rounded-xl ${currentTheme.cardBg} border-t sm:border ${currentTheme.border} shadow-2xl p-5 sm:p-4 flex flex-col space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom sm:animate-modal-float overflow-hidden`}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-2 mb-1 sm:hidden" />
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider font-display flex items-center gap-1.5">
                  <List className="w-3.5 h-3.5 text-[#00ffab]" />
                  {isRu ? 'Оглавление' : 'Table of Contents'}
                </span>
                <button
                  onClick={() => setIsTocOpen(false)}
                  className="p-1 text-inherit opacity-60 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-1 pr-1 flex-1 max-h-[60vh]">
                {chapters.map((ch, idx) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setCurrentChapterIdx(idx);
                      const estimatedPage = Math.max(1, Math.round(((idx + 1) / chapters.length) * maxPages));
                      setCurrentPage(estimatedPage);
                      saveReadingProgress(estimatedPage);
                      setIsTocOpen(false);
                      if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      currentChapterIdx === idx
                        ? 'bg-white/10 text-[#00ffab] font-medium border border-[#00ffab]/30'
                        : 'hover:bg-white/5 opacity-85'
                    }`}
                  >
                    <span className="truncate mr-2">{ch.title}</span>
                    <span className="text-[10px] font-mono opacity-50 flex-shrink-0">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ================= HIGHLIGHTS & ANNOTATIONS SLIDE-OVER / BOTTOM SHEET ================= */}
        {isAnnotationsDrawerOpen && (
          <>
            <div
              onClick={() => setIsAnnotationsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 sm:hidden animate-fade-in"
            />
            <div
              className={`fixed inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto sm:absolute sm:top-14 sm:right-6 z-50 w-full sm:w-96 max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-xl ${currentTheme.cardBg} border-t sm:border ${currentTheme.border} shadow-2xl p-5 sm:p-4 flex flex-col space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom sm:animate-modal-float overflow-hidden`}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-2 mb-1 sm:hidden" />
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider font-display flex items-center gap-1.5">
                  <Highlighter className="w-4 h-4 text-[#00ffab]" />
                  {isRu ? 'Аннотации и Заметки' : 'Highlights & Notes'}
                </span>
                <p className="text-[10px] text-[#86948a] mt-0.5">
                  {bookHighlights.length} {isRu ? 'выделений в книге' : 'highlights'} • {isRu ? 'связано с Заметками' : 'linked to Notes'}
                </p>
              </div>
              <button
                onClick={() => setIsAnnotationsDrawerOpen(false)}
                className="p-1 text-inherit opacity-60 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Color Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setHighlightsColorFilter('all')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                  highlightsColorFilter === 'all'
                    ? 'bg-white/15 text-white font-bold'
                    : 'bg-white/5 text-[#86948a] hover:text-white'
                }`}
              >
                {isRu ? 'Все' : 'All'} ({bookHighlights.length})
              </button>
              {HIGHLIGHT_COLORS.map((c) => {
                const count = bookHighlights.filter((h) => h.color === c.color).length;
                if (count === 0) return null;
                return (
                  <button
                    key={c.id}
                    onClick={() => setHighlightsColorFilter(c.color)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-colors ${
                      highlightsColorFilter === c.color
                        ? 'bg-white/15 font-bold text-white'
                        : 'bg-white/5 text-[#86948a] hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Highlights List */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 max-h-[60vh]">
              {filteredDrawerHighlights.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Bookmark className="w-8 h-8 text-[#86948a] mx-auto opacity-40" />
                  <p className="text-xs text-[#86948a]">
                    {isRu
                      ? 'В этой книге пока нет выделений. Выделите текст и выберите цвет маркера!'
                      : 'No highlights yet. Select any text to highlight and annotate!'}
                  </p>
                </div>
              ) : (
                filteredDrawerHighlights.map((hl) => (
                  <div
                    key={hl.id}
                    className="p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] border border-white/5 transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: hl.color }}
                        />
                        {hl.page && (
                          <button
                            onClick={() => {
                              handleJumpToPage(hl.page!);
                              setIsAnnotationsDrawerOpen(false);
                            }}
                            className="text-[10px] font-mono text-[#00ffab] hover:underline"
                            title={isRu ? 'Перейти на страницу' : 'Jump to page'}
                          >
                            {isRu ? 'Стр.' : 'p.'} {hl.page}
                          </button>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setQuoteCardText(hl.text);
                            setIsQuoteCardModalOpen(true);
                          }}
                          className="p-1 hover:text-[#00ffab] transition-colors"
                          title={isRu ? 'Создать карточку цитаты' : 'Quote Card'}
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(hl.text);
                            showToast(isRu ? 'Цитата скопирована' : 'Copied');
                          }}
                          className="p-1 hover:text-[#00ffab] transition-colors"
                          title={isRu ? 'Копировать' : 'Copy'}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteHighlight(hl.id)}
                          className="p-1 hover:text-red-400 transition-colors"
                          title={isRu ? 'Удалить' : 'Delete'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Excerpt quote */}
                    <p
                      className="text-xs italic leading-relaxed line-clamp-3 pl-2 border-l-2"
                      style={{ borderColor: hl.color }}
                    >
                      «{hl.text}»
                    </p>

                    {/* User annotation note */}
                    {hl.note && (
                      <div className="pt-1 flex items-start gap-1.5 text-xs text-[#dae2fd] bg-black/20 p-2 rounded border border-white/5">
                        <MessageSquare className="w-3 h-3 text-[#00ffab] mt-0.5 flex-shrink-0" />
                        <span className="leading-snug">{hl.note}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          </>
        )}

        {/* ================= MAIN READING VIEWPORT ================= */}
        <div
          ref={scrollContainerRef}
          onClick={handleContentContainerClick}
          onMouseUp={handleMouseUp}
          className="flex-1 overflow-y-auto px-4 sm:px-8 py-20 relative flex flex-col items-center cursor-default"
        >
          <div className="w-full max-w-2xl sm:max-w-3xl min-h-[70vh] flex flex-col justify-start">
            {isPdf ? (
              /* PDF View */
              <div className="w-full flex flex-col items-center justify-center my-auto">
                {isPdfLoading ? (
                  <div className="flex flex-col items-center gap-3 my-20">
                    <div className="w-8 h-8 border-2 border-[#00ffab] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs opacity-70">
                      {isRu ? 'Загрузка PDF страницы...' : 'Rendering PDF page...'}
                    </span>
                  </div>
                ) : (
                  <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white max-w-full">
                    <canvas ref={pdfCanvasRef} className="max-w-full block" />
                  </div>
                )}
              </div>
            ) : (
              /* EPUB / FB2 / HTML Text View */
              <article
                className={`w-full ${fontClass} ${leadingClass} transition-all duration-150`}
                style={{ fontSize: `${fontSize}px` }}
              >
                {activeChapter.title && (
                  <h1 className="text-2xl sm:text-3xl font-bold font-display mb-6 pb-3 border-b border-current/10 opacity-90">
                    {activeChapter.title}
                  </h1>
                )}

                <div
                  className="prose-reading space-y-4"
                  dangerouslySetInnerHTML={{ __html: renderedChapterContent }}
                />
              </article>
            )}
          </div>
        </div>

        {/* ================= TEXT SELECTION & HIGHLIGHT FLOATING TOOLBAR ================= */}
        {selectedText && selectionPos && (
          <div
            className="fixed z-50 transform -translate-x-1/2 -translate-y-full px-2.5 py-2 rounded-2xl bg-[#16171A] border border-[rgba(255,255,255,0.18)] shadow-2xl backdrop-blur-xl flex flex-col gap-2 animate-modal-float"
            style={{ left: `${selectionPos.x}px`, top: `${selectionPos.y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* If user clicked a color, show the annotation note input */}
            {pendingHighlight ? (
              <div className="w-64 sm:w-72 space-y-2 p-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: pendingHighlight.color }}
                    />
                    <span className="text-[#dae2fd]">
                      {isRu ? 'Добавить заметку' : 'Add Annotation'}
                    </span>
                  </div>
                  <button
                    onClick={() => setPendingHighlight(null)}
                    className="text-[#86948a] hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  type="text"
                  autoFocus
                  value={annotationNoteInput}
                  onChange={(e) => setAnnotationNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmHighlight(annotationNoteInput);
                    }
                  }}
                  placeholder={isRu ? 'Ваша мысль к фрагменту...' : 'Your thought or note...'}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#00ffab]"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => handleConfirmHighlight(annotationNoteInput)}
                    className="flex-1 py-1 rounded-lg bg-[#00ffab] text-[#002114] text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    {isRu ? 'Сохранить заметку' : 'Save with Note'}
                  </button>
                  <button
                    onClick={() => handleConfirmHighlight()}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#86948a] hover:text-white transition-colors"
                  >
                    {isRu ? 'Без заметки' : 'Quick'}
                  </button>
                </div>
              </div>
            ) : (
              /* Color Selection Palette & Quick Actions */
              <div className="flex items-center gap-1.5">
                {/* 5 Distinctive Colors */}
                <div className="flex items-center gap-1 pr-1.5 border-r border-white/10">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectColor(c.color)}
                      className="w-5 h-5 rounded-full hover:scale-125 active:scale-95 transition-all shadow-md flex items-center justify-center group"
                      style={{ backgroundColor: c.color }}
                      title={`${c.label} (${isRu ? 'Выделить и аннотировать' : 'Highlight'})`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-black/30 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>

                {/* Direct Quote Button */}
                <button
                  onClick={handleSaveSelectionAsQuote}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#dae2fd] transition-colors"
                  title={isRu ? 'Сохранить в цитаты' : 'Save as Quote'}
                >
                  <Quote className="w-3 h-3 text-[#00ffab]" />
                  <span className="hidden sm:inline">{isRu ? 'Цитата' : 'Quote'}</span>
                </button>

                {/* Shareable Quote Card */}
                <button
                  onClick={handleOpenQuoteCard}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#dae2fd] transition-colors"
                  title={isRu ? 'Создать эстетичную карточку' : 'Quote Card'}
                >
                  <Share2 className="w-3 h-3 text-[#38bdf8]" />
                  <span className="hidden sm:inline">{isRu ? 'Карточка' : 'Card'}</span>
                </button>

                {/* Copy Text */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedText);
                    setCopiedQuote(true);
                    sound.playClick();
                    showToast(isRu ? 'Текст скопирован' : 'Copied');
                    setTimeout(() => setCopiedQuote(false), 2000);
                  }}
                  className="p-1 text-[#86948a] hover:text-white transition-colors"
                  title="Copy"
                >
                  {copiedQuote ? <Check className="w-3.5 h-3.5 text-[#00ffab]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= EXISTING HIGHLIGHT DETAIL MODAL ================= */}
        {activeHighlightDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setActiveHighlightDetail(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-[#16171A] border border-white/10 p-5 shadow-2xl space-y-4 animate-modal-float"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: activeHighlightDetail.color }}
                  />
                  <h3 className="text-sm font-semibold text-[#dae2fd]">
                    {isRu ? 'Выделенный фрагмент' : 'Highlight Annotation'}
                  </h3>
                  {activeHighlightDetail.page && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-[#86948a]">
                      {isRu ? 'Стр.' : 'p.'} {activeHighlightDetail.page}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setActiveHighlightDetail(null)}
                  className="text-[#86948a] hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quote text */}
              <p
                className="text-xs sm:text-sm italic leading-relaxed text-[#dae2fd] pl-3 border-l-2 py-1 bg-white/[0.02] rounded-r"
                style={{ borderColor: activeHighlightDetail.color }}
              >
                «{activeHighlightDetail.text}»
              </p>

              {/* Annotation Note Section */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs text-[#86948a]">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-[#00ffab]" />
                    {isRu ? 'Заметка / мысль' : 'Annotation Note'}
                  </span>
                  {!editingDetailNote && (
                    <button
                      onClick={() => setEditingDetailNote(true)}
                      className="text-[11px] text-[#00ffab] hover:underline flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      {activeHighlightDetail.note ? (isRu ? 'Редактировать' : 'Edit') : (isRu ? '+ Добавить' : '+ Add')}
                    </button>
                  )}
                </div>

                {editingDetailNote ? (
                  <div className="space-y-2">
                    <textarea
                      value={detailNoteInput}
                      onChange={(e) => setDetailNoteInput(e.target.value)}
                      placeholder={isRu ? 'Введите вашу заметку к книге...' : 'Enter your note...'}
                      rows={3}
                      className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#00ffab]"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingDetailNote(false)}
                        className="px-3 py-1 rounded-lg text-xs text-[#86948a] hover:text-white"
                      >
                        {isRu ? 'Отмена' : 'Cancel'}
                      </button>
                      <button
                        onClick={handleSaveDetailNote}
                        className="px-3 py-1 rounded-lg bg-[#00ffab] text-[#002114] text-xs font-semibold hover:opacity-90"
                      >
                        {isRu ? 'Сохранить' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#dae2fd] bg-black/30 p-3 rounded-xl border border-white/5">
                    {activeHighlightDetail.note || (
                      <span className="italic text-[#86948a]">
                        {isRu ? 'Заметка не добавлена.' : 'No annotation note attached.'}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => handleDeleteHighlight(activeHighlightDetail.id)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 py-1 px-2 rounded hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isRu ? 'Удалить' : 'Delete'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setQuoteCardText(activeHighlightDetail.text);
                      setIsQuoteCardModalOpen(true);
                      setActiveHighlightDetail(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#dae2fd] transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#00ffab]" />
                    <span>{isRu ? 'Карточка цитаты' : 'Quote Card'}</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeHighlightDetail.text);
                      showToast(isRu ? 'Цитата скопирована' : 'Copied');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#dae2fd] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isRu ? 'Копировать' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= BOTTOM NAVIGATION & PROGRESS SLIDER ================= */}
        <div
          className={`absolute bottom-0 inset-x-0 z-30 transition-all duration-300 ${
            showControls
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-full pointer-events-none'
          } ${currentTheme.cardBg} border-t ${currentTheme.border} backdrop-blur-lg shadow-2xl p-3 sm:px-6 space-y-2`}
        >
          {/* Slider & Page Numbers */}
          <div className="max-w-xl mx-auto flex items-center gap-3">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all text-inherit"
              title={isRu ? 'Предыдущая страница' : 'Previous page'}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Interactive Page Slider */}
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min="1"
                max={maxPages}
                value={currentPage}
                onChange={(e) => handleJumpToPage(Number(e.target.value))}
                className="w-full accent-[#00ffab] cursor-pointer h-1.5 bg-white/10 rounded-full"
              />
              <div className="flex items-center justify-between text-[11px] font-mono opacity-70">
                <span>
                  {isRu ? 'Стр.' : 'p.'} {currentPage} / {maxPages}
                </span>
                <span className="font-semibold text-[#00ffab]">
                  {progressPercent}%
                </span>
              </div>
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= maxPages}
              className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-all text-inherit"
              title={isRu ? 'Следующая страница' : 'Next page'}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quote Card Generator Modal */}
      {isQuoteCardModalOpen && (
        <QuoteCardGeneratorModal
          isOpen={isQuoteCardModalOpen}
          onClose={() => setIsQuoteCardModalOpen(false)}
          initialQuote={quoteCardText}
          initialAuthor={book.author}
          initialBookTitle={book.title}
          initialPage={currentPage}
        />
      )}
    </>
  );
};
