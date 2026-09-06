import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Sparkles,
  Quote as QuoteIcon,
  BookOpen,
  Image as ImageIcon,
  Palette,
  Type,
  Share2,
  Bookmark,
  CheckCircle2,
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import { sound } from '../lib/sound';
import { haptics } from '../lib/haptics';

interface QuoteCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuote: string;
  initialAuthor?: string;
  initialBookTitle?: string;
  initialPage?: number | string;
  onSaveToQuotes?: (quote: { text: string; author?: string; bookTitle?: string; page?: number }) => void;
}

type CardTheme = 'obsidian' | 'washi' | 'midnight' | 'amber' | 'nordic';
type CardFont = 'serif' | 'sans' | 'italic' | 'mono';
type AspectRatio = 'square' | 'portrait' | 'story';

const THEMES: Record<
  CardTheme,
  {
    name: string;
    bgClass: string;
    textClass: string;
    authorClass: string;
    quoteMarkClass: string;
    borderClass: string;
    watermarkClass: string;
    accentColor: string;
  }
> = {
  obsidian: {
    name: 'Obsidian Emerald',
    bgClass: 'bg-gradient-to-br from-[#060b13] via-[#09111e] to-[#040810]',
    textClass: 'text-[#e6f4ed]',
    authorClass: 'text-[#00ffab]',
    quoteMarkClass: 'text-[#00ffab]/30',
    borderClass: 'border border-[#00ffab]/30 shadow-2xl shadow-[#00ffab]/10',
    watermarkClass: 'text-[#86948a]/60',
    accentColor: '#00ffab',
  },
  washi: {
    name: 'Washi Paper',
    bgClass: 'bg-[#f7f4ed] text-[#1c1917]',
    textClass: 'text-[#1c1917]',
    authorClass: 'text-[#854d0e]',
    quoteMarkClass: 'text-[#a8a29e]/40',
    borderClass: 'border border-[#d6d3d1] shadow-xl',
    watermarkClass: 'text-[#78716c]',
    accentColor: '#854d0e',
  },
  midnight: {
    name: 'Cosmic Indigo',
    bgClass: 'bg-gradient-to-br from-[#0a0f1d] via-[#101b33] to-[#080d1a]',
    textClass: 'text-[#dae2fd]',
    authorClass: 'text-[#00e5ff]',
    quoteMarkClass: 'text-[#00e5ff]/25',
    borderClass: 'border border-[#00e5ff]/30 shadow-2xl shadow-[#00e5ff]/10',
    watermarkClass: 'text-[#86948a]/60',
    accentColor: '#00e5ff',
  },
  amber: {
    name: 'Gilded Amber',
    bgClass: 'bg-gradient-to-br from-[#140f07] via-[#21160a] to-[#120c05]',
    textClass: 'text-[#fef3c7]',
    authorClass: 'text-[#f59e0b]',
    quoteMarkClass: 'text-[#f59e0b]/30',
    borderClass: 'border border-[#f59e0b]/40 shadow-2xl shadow-[#f59e0b]/10',
    watermarkClass: 'text-[#a1a1aa]/60',
    accentColor: '#f59e0b',
  },
  nordic: {
    name: 'Nordic Frost',
    bgClass: 'bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]',
    textClass: 'text-[#0f172a]',
    authorClass: 'text-[#2563eb]',
    quoteMarkClass: 'text-[#94a3b8]/40',
    borderClass: 'border border-[#cbd5e1] shadow-xl',
    watermarkClass: 'text-[#64748b]',
    accentColor: '#2563eb',
  },
};

export const QuoteCardGeneratorModal: React.FC<QuoteCardGeneratorModalProps> = ({
  isOpen,
  onClose,
  initialQuote,
  initialAuthor = 'Автор не указан',
  initialBookTitle = '',
  initialPage,
  onSaveToQuotes,
}) => {
  const [quoteText, setQuoteText] = useState(initialQuote || '');
  const [author, setAuthor] = useState(initialAuthor || '');
  const [bookTitle, setBookTitle] = useState(initialBookTitle || '');
  const [page, setPage] = useState<string>(initialPage ? String(initialPage) : '');
  const [theme, setTheme] = useState<CardTheme>('obsidian');
  const [font, setFont] = useState<CardFont>('serif');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('square');
  const [showWatermark, setShowWatermark] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const currentTheme = THEMES[theme];

  const getFontFamilyClass = () => {
    switch (font) {
      case 'serif':
        return 'font-serif tracking-normal leading-relaxed';
      case 'sans':
        return 'font-sans font-medium tracking-tight leading-relaxed';
      case 'italic':
        return 'font-serif italic tracking-wide leading-relaxed';
      case 'mono':
        return 'font-mono text-sm tracking-tight leading-relaxed';
      default:
        return 'font-serif';
    }
  };

  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square max-w-[420px]';
      case 'portrait':
        return 'aspect-[4/5] max-w-[400px]';
      case 'story':
        return 'aspect-[9/16] max-w-[340px]';
      default:
        return 'aspect-square max-w-[420px]';
    }
  };

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      haptics.medium();
      sound.playPop();

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
      });

      const link = document.createElement('a');
      link.download = `quote-${author.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      haptics.success();
      sound.playComplete();
    } catch (err) {
      console.error('Failed to export quote image', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      haptics.medium();
      sound.playClick();

      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
      });

      if (blob && navigator.clipboard && 'write' in navigator.clipboard) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedSuccess(true);
        haptics.success();
        sound.playComplete();
        setTimeout(() => setCopiedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to copy quote card to clipboard', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToQuoteBook = () => {
    if (onSaveToQuotes) {
      onSaveToQuotes({
        text: quoteText,
        author: author || undefined,
        bookTitle: bookTitle || undefined,
        page: page ? parseInt(page, 10) : undefined,
      });
      setSavedSuccess(true);
      haptics.success();
      sound.playComplete();
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#0b1220] border border-[#222f47] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1c283f] bg-[#0f172a]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e5a93c]/20 to-[#00ffab]/20 border border-[#e5a93c]/40 flex items-center justify-center text-[#e5a93c]">
              <QuoteIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#dae2fd] font-display">
                  Интерактивный скрапбук цитат
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00ffab]/10 text-[#00ffab] border border-[#00ffab]/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Quote Card Studio
                </span>
              </div>
              <p className="text-xs text-[#86948a] font-sans mt-0.5">
                Генератор эстетичных карточек с цитатами, шрифтовой гармонией и экспортом в высоком разрешении
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-[#86948a] hover:text-[#dae2fd] hover:bg-[#172238] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Preview, Right Controls */}
        <div className="p-5 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          {/* Left: Card Preview Area */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-[#060a14] border border-[#1a2336] min-h-[380px]">
            {/* The Actual HTML Printable Quote Card */}
            <div
              ref={cardRef}
              id="quote-export-card"
              className={`w-full ${getAspectRatioClasses()} ${currentTheme.bgClass} ${currentTheme.borderClass} rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300`}
            >
              {/* Background ambient watermark quote mark */}
              <QuoteIcon
                className={`absolute top-3 left-3 w-16 h-16 ${currentTheme.quoteMarkClass} pointer-events-none select-none`}
              />

              {/* Top Meta info */}
              <div className="flex items-center justify-between text-[11px] font-mono relative z-10">
                <div className={`flex items-center gap-1.5 ${currentTheme.authorClass} font-bold`}>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{bookTitle || 'Книга'}</span>
                </div>
                {page && (
                  <span className={currentTheme.watermarkClass}>Стр. {page}</span>
                )}
              </div>

              {/* Main Quote Content */}
              <div className="my-auto py-4 relative z-10">
                <p
                  className={`text-base sm:text-lg ${currentTheme.textClass} ${getFontFamilyClass()} tracking-normal text-left sm:text-center select-text`}
                >
                  «{quoteText || 'Текст цитаты будет отображен здесь...'}»
                </p>
              </div>

              {/* Bottom Signature / Author & App Brand */}
              <div className="pt-4 border-t border-black/10 dark:border-white/10 flex items-end justify-between relative z-10">
                <div className="text-left">
                  <div className={`text-xs sm:text-sm font-bold ${currentTheme.authorClass} font-display`}>
                    — {author || 'Автор'}
                  </div>
                  {bookTitle && (
                    <div className={`text-[10px] ${currentTheme.watermarkClass} italic`}>
                      {bookTitle}
                    </div>
                  )}
                </div>

                {showWatermark && (
                  <div className={`text-[9px] font-mono ${currentTheme.watermarkClass} uppercase tracking-widest`}>
                    Zenith OS
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Under Preview */}
            <div className="flex items-center gap-2 mt-4 w-full max-w-[420px]">
              <button
                onClick={handleDownloadPng}
                disabled={isExporting || !quoteText.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#00ffab] hover:bg-[#00ffab]/90 disabled:opacity-40 text-[#003824] font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00ffab]/10"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Экспорт...' : 'Скачать PNG'}</span>
              </button>

              <button
                onClick={handleCopyImage}
                disabled={isExporting || !quoteText.trim()}
                className="py-2.5 px-4 rounded-xl bg-[#131d30] hover:bg-[#1c2a44] border border-[#22304d] text-xs font-mono text-[#dae2fd] flex items-center justify-center gap-2 transition-colors"
                title="Скопировать изображение"
              >
                {copiedSuccess ? (
                  <Check className="w-4 h-4 text-[#00ffab]" />
                ) : (
                  <Copy className="w-4 h-4 text-[#00e5ff]" />
                )}
                <span className="hidden sm:inline">{copiedSuccess ? 'Скопировано!' : 'Копировать'}</span>
              </button>

              {onSaveToQuotes && (
                <button
                  onClick={handleSaveToQuoteBook}
                  className="py-2.5 px-3 rounded-xl bg-[#131d30] hover:bg-[#1c2a44] border border-[#22304d] text-xs font-mono text-[#e5a93c] flex items-center justify-center gap-1.5 transition-colors"
                  title="Сохранить в цитатник"
                >
                  {savedSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00ffab]" />
                  ) : (
                    <Bookmark className="w-4 h-4 text-[#e5a93c]" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right: Customization Controls */}
          <div className="lg:col-span-6 space-y-4">
            {/* Quote Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-[#86948a] uppercase flex items-center gap-1.5">
                <QuoteIcon className="w-3.5 h-3.5 text-[#00ffab]" />
                Текст цитаты
              </label>
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                rows={3}
                placeholder="Введите текст цитаты или мысль..."
                className="w-full bg-[#080d1a] border border-[#1e2a42] rounded-xl p-3 text-xs text-[#dae2fd] placeholder-[#55647a] focus:outline-none focus:border-[#00ffab]"
              />
            </div>

            {/* Author & Book Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#86948a] uppercase">Автор</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Автор цитаты"
                  className="w-full bg-[#080d1a] border border-[#1e2a42] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#86948a] uppercase">Источник / Книга</label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Название книги"
                  className="w-full bg-[#080d1a] border border-[#1e2a42] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#86948a] uppercase">Страница</label>
                <input
                  type="text"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  placeholder="Номер"
                  className="w-full bg-[#080d1a] border border-[#1e2a42] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-[#86948a] uppercase flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#e5a93c]" />
                Цветовая эстетика
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(THEMES) as CardTheme[]).map((tKey) => {
                  const t = THEMES[tKey];
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setTheme(tKey);
                      }}
                      className={`p-2.5 rounded-xl text-left border text-xs font-mono flex items-center gap-2 transition-all ${
                        theme === tKey
                          ? 'border-[#00ffab] bg-[#121c2e] text-[#dae2fd]'
                          : 'border-[#1e2a42] bg-[#0a101d] text-[#86948a] hover:text-[#dae2fd]'
                      }`}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: t.accentColor }}
                      />
                      <span className="truncate">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Style & Format Aspect Ratio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Font selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-[#86948a] uppercase flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#00e5ff]" />
                  Шрифтовая гармония
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'serif', label: 'Editorial Serif' },
                    { id: 'italic', label: 'Classic Italic' },
                    { id: 'sans', label: 'Modern Sans' },
                    { id: 'mono', label: 'Monospace' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setFont(f.id as CardFont);
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-[11px] font-mono text-center transition-all ${
                        font === f.id
                          ? 'border-[#00ffab] bg-[#121c2e] text-[#00ffab]'
                          : 'border-[#1e2a42] bg-[#0a101d] text-[#86948a] hover:text-[#dae2fd]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format / Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-[#86948a] uppercase flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#d0bcff]" />
                  Формат карточки
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'square', label: '1:1 Square' },
                    { id: 'portrait', label: '4:5 Post' },
                    { id: 'story', label: '9:16 Story' },
                  ].map((ar) => (
                    <button
                      key={ar.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setAspectRatio(ar.id as AspectRatio);
                      }}
                      className={`py-2 px-1.5 rounded-xl border text-[11px] font-mono text-center transition-all ${
                        aspectRatio === ar.id
                          ? 'border-[#00ffab] bg-[#121c2e] text-[#00ffab]'
                          : 'border-[#1e2a42] bg-[#0a101d] text-[#86948a] hover:text-[#dae2fd]'
                      }`}
                    >
                      {ar.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Toggle Watermark */}
            <div className="pt-2 flex items-center justify-between border-t border-[#1c283f]">
              <span className="text-xs text-[#86948a] font-sans">Водяной знак «Zenith OS»</span>
              <button
                type="button"
                onClick={() => setShowWatermark(!showWatermark)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  showWatermark ? 'bg-[#00ffab]' : 'bg-[#1e2a42]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-[#003824] absolute top-0.5 transition-transform ${
                    showWatermark ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1c283f] bg-[#0f172a]/60 flex items-center justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#172238] hover:bg-[#202d4a] text-xs font-mono text-[#dae2fd] transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
