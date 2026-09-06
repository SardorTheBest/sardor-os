import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  BookOpen,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { Book } from '../types';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';
import { haptics } from '../lib/haptics';
import { i18n } from '../lib/i18n';
import { bookParserService, ParsedBookResult } from '../lib/bookParserService';
import { bookFileStorage } from '../lib/bookFileStorage';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (newBook: Book) => void;
}

const PRESET_COVER_COLORS = [
  { name: 'Emerald Teal', value: 'from-emerald-800 to-teal-950' },
  { name: 'Midnight Navy', value: 'from-blue-900 to-slate-950' },
  { name: 'Vintage Amber', value: 'from-amber-700 to-amber-950' },
  { name: 'Crimson Wine', value: 'from-rose-900 to-zinc-950' },
  { name: 'Obsidian Slate', value: 'from-zinc-800 to-neutral-950' },
  { name: 'Royal Purple', value: 'from-purple-900 to-indigo-950' },
];

export const AddBookModal: React.FC<AddBookModalProps> = ({
  isOpen,
  onClose,
  onBookAdded,
}) => {
  const isRu = i18n.getLanguage() === 'ru';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('320');
  const [currentPage, setCurrentPage] = useState('0');
  const [genre, setGenre] = useState('Литература');
  const [status, setStatus] = useState<Book['status']>('reading');
  const [coverUrl, setCoverUrl] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COVER_COLORS[0].value);
  const [notes, setNotes] = useState('');

  // File parsing state
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedBookResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setIsParsing(true);
    setParseError(null);

    try {
      const parsed = await bookParserService.parseBookFile(file);
      setParsedData(parsed);

      // Auto-fill form fields
      if (parsed.title) setTitle(parsed.title);
      if (parsed.author && parsed.author !== 'Unknown') setAuthor(parsed.author);
      if (parsed.totalPages) setTotalPages(String(parsed.totalPages));
      if (parsed.genre) setGenre(parsed.genre);
      if (parsed.coverUrl) setCoverUrl(parsed.coverUrl);

      sound.playPop();
    } catch (err: any) {
      console.error('File parsing error:', err);
      setParseError(
        isRu
          ? `Ошибка разбора файла: ${err?.message || 'неподдерживаемый формат'}`
          : `Parsing error: ${err?.message || 'unsupported file'}`
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const bookId = `book-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const pages = Math.max(1, parseInt(totalPages, 10) || 100);
    const current = Math.min(pages, Math.max(0, parseInt(currentPage, 10) || 0));

    // 1. Save binary file to Dexie if uploaded
    if (parsedData?.fileBlob) {
      try {
        await bookFileStorage.saveBookFile(
          bookId,
          parsedData.fileBlob,
          parsedData.fileName,
          parsedData.fileType
        );
      } catch (err) {
        console.warn('Failed to save file to Dexie:', err);
      }
    }

    // 2. Save book record to storage
    const newBook: Book = {
      id: bookId,
      title: title.trim(),
      author: author.trim() || (isRu ? 'Автор не указан' : 'Unknown Author'),
      totalPages: pages,
      currentPage: current,
      genre: genre.trim() || (isRu ? 'Чтение' : 'Reading'),
      status,
      rating: 0,
      coverUrl: coverUrl.trim() || undefined,
      coverColor: selectedColor,
      quotes: [],
      notes: notes.trim() || undefined,
      fileType: parsedData?.fileType || 'text',
      fileName: parsedData?.fileName,
      fileSize: parsedData?.fileBlob?.size,
      hasLocalFile: !!parsedData?.fileBlob,
      content: parsedData?.content,
      chapters: parsedData?.chapters,
      lastReadPosition: Math.round((current / pages) * 100),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const added = storage.addBook(newBook);
    sound.playComplete();
    haptics.success();
    onBookAdded(added || newBook);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-float pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-2 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[rgba(255,255,255,0.08)] bg-[#111214]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00ffab]/10 border border-[#00ffab]/20 flex items-center justify-center text-[#00ffab]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-[#dae2fd] font-display">
                {isRu ? 'Добавить книгу в библиотеку' : 'Add Book to Library'}
              </h2>
              <p className="text-[11px] text-[#86948a]">
                {isRu ? 'EPUB, PDF, FB2 или ручной ввод' : 'EPUB, PDF, FB2 or manual entry'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* File Upload Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center relative overflow-hidden ${
              isDragOver
                ? 'border-[#00ffab] bg-[#00ffab]/5'
                : parsedData
                ? 'border-[#00ffab]/50 bg-[#111214]'
                : 'border-white/10 hover:border-white/20 bg-[#111214]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub,.pdf,.fb2,.txt,.fb2.zip"
              onChange={handleFileChange}
              className="hidden"
            />

            {isParsing ? (
              <div className="py-4 flex flex-col items-center gap-2 text-[#00ffab]">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-medium">
                  {isRu ? 'Извлечение метаданных, обложки и текста...' : 'Extracting metadata, cover & text...'}
                </span>
              </div>
            ) : parsedData ? (
              <div className="flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-14 rounded bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {parsedData.coverUrl ? (
                      <img src={parsedData.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-5 h-5 text-[#00ffab]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#00ffab]/10 text-[#00ffab] font-bold">
                      {parsedData.fileType.toUpperCase()}
                    </span>
                    <h4 className="text-xs font-semibold text-[#dae2fd] truncate mt-1">
                      {parsedData.fileName}
                    </h4>
                    <p className="text-[11px] text-[#86948a]">
                      {isRu ? 'Файл готов к сохранению в IndexedDB' : 'Ready for offline IndexedDB storage'}
                    </p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded bg-[#00ffab]/20 text-[#00ffab] text-xs font-medium flex items-center gap-1 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                  {isRu ? 'Считано' : 'Loaded'}
                </div>
              </div>
            ) : (
              <div className="py-2 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#86948a]">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-[#dae2fd]">
                    {isRu ? 'Перетащите файл книги сюда или выберите' : 'Drop book file here or browse'}
                  </span>
                  <p className="text-[10px] text-[#86948a] mt-0.5">
                    EPUB, PDF, FB2 (.fb2, .fb2.zip), TXT
                  </p>
                </div>
              </div>
            )}

            {parseError && (
              <div className="mt-2 text-xs text-[#ffb4ab] flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* Book Title & Author */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#86948a] mb-1">
                {isRu ? 'Название книги *' : 'Book Title *'}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isRu ? 'Например: Чистый Код' : 'e.g. Clean Code'}
                className="w-full px-3.5 py-2.5 bg-[#111214] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs sm:text-sm text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#86948a] mb-1">
                  {isRu ? 'Автор' : 'Author'}
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={isRu ? 'Имя автора' : 'Author name'}
                  className="w-full px-3.5 py-2.5 bg-[#111214] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs sm:text-sm text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#86948a] mb-1">
                  {isRu ? 'Жанр / Категория' : 'Genre / Category'}
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder={isRu ? 'Жанр' : 'Genre'}
                  className="w-full px-3.5 py-2.5 bg-[#111214] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs sm:text-sm text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
              </div>
            </div>
          </div>

          {/* Pages & Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#86948a] mb-1">
                {isRu ? 'Всего стр.' : 'Total pages'}
              </label>
              <input
                type="number"
                min="1"
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                className="w-full px-3 py-2 bg-[#111214] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs sm:text-sm text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#86948a] mb-1">
                {isRu ? 'Текущая стр.' : 'Current page'}
              </label>
              <input
                type="number"
                min="0"
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                className="w-full px-3 py-2 bg-[#111214] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs sm:text-sm text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#86948a] mb-1">
                {isRu ? 'Статус' : 'Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-2.5 py-2 bg-[#111214] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs sm:text-sm text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
              >
                <option value="reading">{isRu ? 'Читаю' : 'Reading'}</option>
                <option value="want_to_read">{isRu ? 'В планах' : 'Want to read'}</option>
                <option value="completed">{isRu ? 'Прочитано' : 'Completed'}</option>
              </select>
            </div>
          </div>

          {/* Cover Color Preset / Custom Image URL */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#86948a]">
              {isRu ? 'Оформление обложки' : 'Cover styling'}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                {PRESET_COVER_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    className={`h-7 flex-1 rounded-lg bg-gradient-to-br ${c.value} border transition-all ${
                      selectedColor === c.value ? 'border-[#00ffab] scale-105' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Optional Cover URL */}
            <div className="pt-1">
              <input
                type="url"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder={isRu ? 'URL изображения обложки (необязательно)' : 'Cover image URL (optional)'}
                className="w-full px-3 py-2 bg-[#111214] border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-[rgba(255,255,255,0.08)]">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs text-[#86948a] hover:text-[#dae2fd] hover:bg-white/5 transition-colors min-h-[44px] flex items-center justify-center font-mono"
            >
              {isRu ? 'Отмена' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isParsing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#00ffab] text-[#002114] font-semibold text-xs shadow-lg shadow-[#00ffab]/20 hover:opacity-95 disabled:opacity-50 transition-all active:scale-[0.98] min-h-[44px] flex items-center justify-center font-mono"
            >
              {isRu ? 'Добавить в библиотеку' : 'Add to Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
