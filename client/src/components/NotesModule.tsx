import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  Eye,
  Columns,
  X,
  Sparkles,
  Tag as TagIcon,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  CheckSquare,
  Code,
  Quote,
  ArrowLeft,
  Wand2,
} from 'lucide-react';
import { AppState, Note } from '../types';
import { storage } from '../lib/storage';
import { MarkdownRenderer } from './MarkdownRenderer';
import { EmptyState } from './EmptyState';
import { sound } from '../lib/sound';
import { aiEngine } from '../lib/aiEngine';

interface NotesModuleProps {
  state: AppState;
}

export const NotesModule: React.FC<NotesModuleProps> = ({ state }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(state.notes[0] || null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [isEnhancingWithAI, setIsEnhancingWithAI] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [pinned, setPinned] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen for mobile header "+" button event
  useEffect(() => {
    const handleNewNoteEvent = () => openNewNoteModal();
    window.addEventListener('create-new-note', handleNewNoteEvent);
    return () => window.removeEventListener('create-new-note', handleNewNoteEvent);
  }, []);

  // Keep selectedNote synchronized with external updates or deletions
  useEffect(() => {
    if (selectedNote && !state.notes.some((n) => n.id === selectedNote.id)) {
      setSelectedNote(state.notes[0] || null);
    } else if (!selectedNote && state.notes.length > 0) {
      setSelectedNote(state.notes[0]);
    }
  }, [state.notes, selectedNote]);

  const filteredNotes = state.notes
    .filter((note) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const openNewNoteModal = () => {
    setTitle('');
    setContent('');
    setTags('');
    setPinned(false);
    setIsNewNoteModalOpen(true);
    sound.playClick();
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const created = storage.addNote({
      title: title.trim(),
      content: content.trim(),
      category: 'General',
      tags: tagList,
      pinned,
    });
    setSelectedNote(created);
    setMobileShowDetail(true);
    setIsNewNoteModalOpen(false);
    sound.playComplete();
  };

  const insertMarkdownSnippet = (before: string, after: string = '') => {
    if (!selectedNote || !textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = selectedNote.content.substring(start, end);
    const replacement = `${before}${selectedText || 'текст'}${after}`;
    const newContent =
      selectedNote.content.substring(0, start) +
      replacement +
      selectedNote.content.substring(end);

    const updated = { ...selectedNote, content: newContent };
    setSelectedNote(updated);
    storage.updateNote(selectedNote.id, { content: newContent });
    sound.playClick();

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + (selectedText ? selectedText.length : 5)
      );
    }, 10);
  };

  const handleEnhanceWithAI = async () => {
    if (!selectedNote || !selectedNote.content.trim() || isEnhancingWithAI) return;
    setIsEnhancingWithAI(true);
    sound.playPop();

    try {
      const prompt = `Ты ассистент Nova. Отформатируй и структурируй текст заметки в чистом Markdown: выдели ключевые тезисы, добавь аккуратные списки или чек-листы, сохрани смысл. Выведи ТОЛЬКО итоговый готовый текст заметки без вступительных слов, мета-комментариев и тегов.\n\nЗаголовок: ${selectedNote.title}\nТекст заметки:\n${selectedNote.content}`;

      let enhancedContent = '';
      await aiEngine.streamChat({
        messages: [{ id: Date.now().toString(), role: 'user', content: prompt }],
        state,
        onChunk: (chunk: string) => {
          enhancedContent += chunk;
          setSelectedNote((prev) => (prev ? { ...prev, content: enhancedContent } : null));
        },
        onDone: (fullText: string) => {
          if (fullText) {
            storage.updateNote(selectedNote.id, { content: fullText });
            sound.playComplete();
          }
        },
        onError: (err: Error) => {
          console.error('AI Note Enhancement error', err);
        },
      });
    } catch (err) {
      console.error('AI Note Enhancement failed', err);
    } finally {
      setIsEnhancingWithAI(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto pb-16 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#00ffab] mb-1">
            <FileText className="w-4 h-4" />
            SYNTHESIS KNOWLEDGE BASE
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#dae2fd] font-display">
            Заметки & Вторая память (Second Brain)
          </h2>
        </div>

        <button
          onClick={openNewNoteModal}
          className="px-4 py-2.5 bg-[#00ffab] hover:bg-[#00ffab]/90 text-[#003824] font-semibold text-xs font-mono rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#00ffab]/20 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Новая заметка
        </button>
      </div>

      {/* Two Pane Responsive Layout: Notes List & Note Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Notes List Column (Visible on Desktop OR when not viewing detail on Mobile) */}
        <div className={`lg:col-span-4 space-y-3 ${mobileShowDetail ? 'hidden lg:block' : 'block'}`}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86948a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по заметкам и тегам..."
              className="w-full bg-[#131b2e] border border-[#222a3d] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
            />
          </div>

          <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1 custom-scrollbar">
            {filteredNotes.length === 0 ? (
              <div className="rounded-xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] overflow-hidden">
                <EmptyState
                  icon={FileText}
                  title={searchQuery ? 'Заметок не найдено' : 'Заметок пока нет'}
                  description={searchQuery ? 'Попробуйте изменить поисковый запрос или фильтр.' : 'Фиксируйте мысли, чек-листы и Markdown конспекты.'}
                  actionLabel="Новая заметка"
                  onAction={() => setIsNewNoteModalOpen(true)}
                  accentColor="cyan"
                  compact
                />
              </div>
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setSelectedNote(note);
                    setMobileShowDetail(true);
                    sound.playClick();
                  }}
                  className={`w-full p-3.5 md:p-4 rounded-xl border text-left transition-all relative ${
                    selectedNote?.id === note.id
                      ? 'bg-[#171f33] border-[#00ffab]/50 shadow-md shadow-[#00ffab]/5'
                      : 'bg-[#131b2e] border-[#222a3d] hover:border-[#3c4a42]'
                  }`}
                >
                  {note.pinned && (
                    <Pin className="w-3.5 h-3.5 text-[#00ffab] absolute top-3.5 right-3.5 fill-[#00ffab]/20" />
                  )}
                  <h4 className="text-xs md:text-sm font-bold text-[#dae2fd] truncate pr-5 font-sans">
                    {note.title}
                  </h4>
                  <p className="text-[11px] text-[#86948a] mt-1 line-clamp-2 leading-relaxed">
                    {note.content}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {note.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0b1326] text-[#00e5ff] border border-[#222a3d]"
                      >
                        #{t}
                      </span>
                    ))}
                    <span className="text-[9px] font-mono text-[#86948a] ml-auto">
                      {note.updatedAt?.split('T')[0] || note.updatedAt}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Note Workspace Pane (Full Screen Native on Mobile, Side Pane on Desktop) */}
        <div
          className={`${
            mobileShowDetail
              ? 'fixed inset-0 z-50 bg-[#0B0C0E] flex flex-col p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:p-6 lg:rounded-2xl lg:bg-[#131b2e] lg:border lg:border-[#222a3d] lg:min-h-[520px] lg:col-span-8'
              : 'hidden lg:flex lg:col-span-8 p-4 md:p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] min-h-[520px] flex-col justify-between'
          }`}
        >
          {selectedNote ? (
            <div className="space-y-4 flex-1 flex flex-col">
              {/* Top Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222a3d] pb-3">
                <div className="flex items-center gap-2">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileShowDetail(false)}
                    className="lg:hidden p-2 rounded-xl bg-[#131b2e] border border-[#222a3d] text-[#dae2fd] hover:text-[#00ffab] active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title="Назад к списку"
                  >
                    <ArrowLeft className="w-5 h-5 text-[#00ffab]" />
                  </button>

                  <button
                    onClick={() => {
                      storage.togglePinNote(selectedNote.id);
                      setSelectedNote({ ...selectedNote, pinned: !selectedNote.pinned });
                      sound.playPop();
                    }}
                    className={`p-2 rounded-xl border transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
                      selectedNote.pinned
                        ? 'bg-[#00ffab]/10 border-[#00ffab]/40 text-[#00ffab]'
                        : 'bg-[#0b1326] border-[#222a3d] text-[#86948a]'
                    }`}
                    title={selectedNote.pinned ? 'Открепить заметку' : 'Закрепить заметку'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={selectedNote.title}
                    onChange={(e) => {
                      const updated = { ...selectedNote, title: e.target.value };
                      setSelectedNote(updated);
                      storage.updateNote(selectedNote.id, { title: e.target.value });
                    }}
                    className="bg-transparent text-base md:text-lg font-bold text-[#dae2fd] font-display focus:outline-none focus:border-b border-[#00ffab] px-1 truncate max-w-[180px] sm:max-w-xs md:max-w-md"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-[#0b1326] p-1 rounded-xl border border-[#222a3d]">
                    <button
                      onClick={() => setViewMode('edit')}
                      title="Редактор"
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        viewMode === 'edit'
                          ? 'bg-[#171f33] text-[#00ffab] font-bold'
                          : 'text-[#86948a] hover:text-[#dae2fd]'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      title="Предпросмотр Markdown"
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        viewMode === 'preview'
                          ? 'bg-[#171f33] text-[#00e5ff] font-bold'
                          : 'text-[#86948a] hover:text-[#dae2fd]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('split')}
                      title="Разделенный вид"
                      className={`hidden md:block p-1.5 rounded-lg text-xs transition-colors ${
                        viewMode === 'split'
                          ? 'bg-[#171f33] text-[#dae2fd] font-bold'
                          : 'text-[#86948a] hover:text-[#dae2fd]'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* AI Enhance Button */}
                  <button
                    onClick={handleEnhanceWithAI}
                    disabled={isEnhancingWithAI}
                    title="Nova AI: структурировать и улучшить заметку"
                    className="p-2 rounded-xl bg-[#00ffab]/10 border border-[#00ffab]/30 text-[#00ffab] hover:bg-[#00ffab]/20 transition-all flex items-center gap-1 text-xs font-mono disabled:opacity-50"
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${isEnhancingWithAI ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Nova Polish</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      if (window.confirm('Удалить эту заметку?')) {
                        storage.deleteNote(selectedNote.id);
                        setSelectedNote(state.notes.find((n) => n.id !== selectedNote.id) || null);
                        setMobileShowDetail(false);
                        sound.playPop();
                      }
                    }}
                    className="p-2 rounded-xl text-[#86948a] hover:text-[#ffb4ab] hover:bg-[#222a3d] transition-colors"
                    title="Удалить заметку"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Markdown Toolbar (when in edit or split mode) */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-1 border-y border-[#222a3d]/60 bg-[#0B0C0E]/95 lg:bg-transparent backdrop-blur-sm sticky top-0 z-10 text-[#86948a] no-scrollbar flex-shrink-0">
                  <button
                    onClick={() => insertMarkdownSnippet('**', '**')}
                    className="p-2 rounded-lg hover:bg-[#0b1326] hover:text-[#00ffab] active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Жирный шрифт (**text**)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertMarkdownSnippet('*', '*')}
                    className="p-2 rounded-lg hover:bg-[#0b1326] hover:text-[#00ffab] active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Курсив (*text*)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertMarkdownSnippet('# ')}
                    className="p-2 rounded-lg hover:bg-[#0b1326] hover:text-[#00ffab] active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Заголовок 1 (# Heading)"
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertMarkdownSnippet('## ')}
                    className="p-2 rounded-lg hover:bg-[#0b1326] hover:text-[#00ffab] active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Заголовок 2 (## Heading)"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-[#222a3d] mx-1 flex-shrink-0" />
                  <button
                    onClick={() => insertMarkdownSnippet('- ')}
                    className="p-2 rounded-lg hover:bg-[#0b1326] hover:text-[#00ffab] active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Список (- Item)"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertMarkdownSnippet('- [ ] ')}
                    className="p-2 rounded-lg hover:bg-[#0b1326] hover:text-[#00ffab] active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Чекбокс (- [ ] Task)"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertMarkdownSnippet('```\n', '\n```')}
                    className="p-2 rounded-lg hover:bg-[#0b1326] hover:text-[#00ffab] active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Блок кода (```code```)"
                  >
                    <Code className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertMarkdownSnippet('> ')}
                    className="p-2 rounded-lg hover:bg-[#0b1326] hover:text-[#00ffab] active:scale-95 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Цитата (> Quote)"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Note Content Area */}
              <div className="flex-1 min-h-[360px] relative">
                {viewMode === 'edit' && (
                  <textarea
                    ref={textareaRef}
                    value={selectedNote.content}
                    onChange={(e) => {
                      const updated = { ...selectedNote, content: e.target.value };
                      setSelectedNote(updated);
                      storage.updateNote(selectedNote.id, { content: e.target.value });
                    }}
                    placeholder="Пишите заметку в Markdown формате..."
                    className="w-full h-full min-h-[360px] bg-transparent border-0 text-xs md:text-sm text-[#dae2fd] leading-relaxed resize-none focus:outline-none font-mono"
                  />
                )}

                {viewMode === 'preview' && (
                  <div className="p-3 bg-[#0b1326]/60 rounded-xl border border-[#222a3d]/50 min-h-[360px] max-h-[500px] overflow-y-auto custom-scrollbar">
                    {selectedNote.content ? (
                      <MarkdownRenderer content={selectedNote.content} />
                    ) : (
                      <div className="text-xs italic text-[#86948a]">Пустая заметка...</div>
                    )}
                  </div>
                )}

                {viewMode === 'split' && (
                  <div className="grid grid-cols-2 gap-4 h-full min-h-[360px]">
                    <textarea
                      ref={textareaRef}
                      value={selectedNote.content}
                      onChange={(e) => {
                        const updated = { ...selectedNote, content: e.target.value };
                        setSelectedNote(updated);
                        storage.updateNote(selectedNote.id, { content: e.target.value });
                      }}
                      placeholder="Markdown текст..."
                      className="w-full h-full bg-transparent border-0 text-xs text-[#dae2fd] leading-relaxed resize-none focus:outline-none font-mono p-2 border-r border-[#222a3d]"
                    />
                    <div className="p-3 bg-[#0b1326]/60 rounded-xl border border-[#222a3d]/50 overflow-y-auto max-h-[500px] custom-scrollbar">
                      <MarkdownRenderer content={selectedNote.content} />
                    </div>
                  </div>
                )}
              </div>

              {/* Tags and Metadata Footer */}
              <div className="pt-3 border-t border-[#222a3d] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#86948a]">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-3.5 h-3.5 text-[#00ffab]" />
                  <span>{selectedNote.tags.join(', ') || 'Без тегов'}</span>
                </div>
                <div>Обновлено: {selectedNote.updatedAt?.split('T')[0] || selectedNote.updatedAt}</div>
              </div>
            </div>
          ) : (
            <div className="m-auto w-full py-12 flex items-center justify-center">
              <EmptyState
                icon={FileText}
                title="Заметка не выбрана"
                description="Выберите существующую заметку из списка слева для чтения и редактирования или создайте новую."
                actionLabel="Создать заметку"
                onAction={() => setIsNewNoteModalOpen(true)}
                accentColor="cyan"
              />
            </div>
          )}
        </div>
      </div>

      {/* New Note Modal */}
      {isNewNoteModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-modal-backdrop">
          <div className="w-full max-w-lg bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-sheet-slide sm:animate-modal-float">
            <div className="w-12 h-1 bg-[#3c4a42] rounded-full mx-auto sm:hidden mb-2" />
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                Создать новую заметку
              </h3>
              <button
                onClick={() => setIsNewNoteModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd] p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  ЗАГОЛОВОК *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название заметки или идеи..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  ТЕКСТ ЗАМЕТКИ (MARKDOWN)
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="# Заголовок&#10;- [ ] Задача 1&#10;**Важная мысль**..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-4 py-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  ТЕГИ (через запятую)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="ai, книги, идеи, проект"
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-4 py-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="note-pin"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="rounded bg-[#0b1326] border-[#222a3d] text-[#00ffab] focus:ring-0"
                />
                <label htmlFor="note-pin" className="text-xs text-[#bbcabf]">
                  Закрепить вверху списка
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsNewNoteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0b1326] hover:bg-[#171f33] text-xs font-mono text-[#86948a] min-h-[44px]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#00ffab] hover:bg-[#00ffab]/90 text-[#003824] font-bold text-xs font-mono shadow-md shadow-[#00ffab]/20 min-h-[44px]"
                >
                  Сохранить заметку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
