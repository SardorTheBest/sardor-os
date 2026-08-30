import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  X,
  Sparkles,
  Tag as TagIcon,
} from 'lucide-react';
import { AppState, Note } from '../types';
import { storage } from '../lib/storage';

interface NotesModuleProps {
  state: AppState;
}

export const NotesModule: React.FC<NotesModuleProps> = ({ state }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(state.notes[0] || null);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [pinned, setPinned] = useState(false);

  const filteredNotes = state.notes.filter((note) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q) ||
      note.tags.some((t) => t.toLowerCase().includes(q))
    );
  }).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const openNewNoteModal = () => {
    setTitle('');
    setContent('');
    setTags('');
    setPinned(false);
    setIsNewNoteModalOpen(true);
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
    setIsNewNoteModalOpen(false);
  };

  const handleUpdateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNote) return;
    storage.updateNote(selectedNote.id, {
      title: selectedNote.title,
      content: selectedNote.content,
      pinned: selectedNote.pinned,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#89ceff] mb-1">
            <FileText className="w-4 h-4" />
            SYNTHESIS KNOWLEDGE REPOSITORY
          </div>
          <h2 className="text-2xl font-bold text-[#dae2fd] font-display">
            Notes & Second Brain
          </h2>
        </div>

        <button
          onClick={openNewNoteModal}
          className="px-4 py-2 bg-[#89ceff] hover:bg-[#89ceff]/90 text-[#001e2f] font-semibold text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-[#89ceff]/20"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {/* Two Pane Layout: Notes List (4 cols) & Note Workspace (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Notes Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86948a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-[#131b2e] border border-[#222a3d] rounded-xl pl-9 pr-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
            />
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  setSelectedNote(note);
                  setIsEditing(false);
                }}
                className={`w-full p-4 rounded-xl border text-left transition-all relative ${
                  selectedNote?.id === note.id
                    ? 'bg-[#171f33] border-[#89ceff]/50 shadow-sm'
                    : 'bg-[#131b2e] border-[#222a3d] hover:border-[#3c4a42]'
                }`}
              >
                {note.pinned && (
                  <Pin className="w-3.5 h-3.5 text-[#89ceff] absolute top-3 right-3 fill-[#89ceff]/20" />
                )}
                <h4 className="text-xs font-bold text-[#dae2fd] truncate pr-5">
                  {note.title}
                </h4>
                <p className="text-[11px] text-[#86948a] mt-1 line-clamp-2">
                  {note.content}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {note.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0b1326] text-[#89ceff] border border-[#222a3d]"
                    >
                      #{t}
                    </span>
                  ))}
                  <span className="text-[9px] font-mono text-[#86948a] ml-auto">
                    {note.updatedAt?.split('T')[0] || note.updatedAt}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Note Workspace Pane */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-[#131b2e] border border-[#222a3d] min-h-[500px] flex flex-col justify-between">
          {selectedNote ? (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-[#222a3d] pb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      storage.togglePinNote(selectedNote.id);
                      setSelectedNote({ ...selectedNote, pinned: !selectedNote.pinned });
                    }}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      selectedNote.pinned
                        ? 'bg-[#89ceff]/10 border-[#89ceff]/40 text-[#89ceff]'
                        : 'bg-[#0b1326] border-[#222a3d] text-[#86948a]'
                    }`}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <h3 className="text-lg font-bold text-[#dae2fd] font-display">
                    {selectedNote.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      storage.deleteNote(selectedNote.id);
                      setSelectedNote(state.notes.find((n) => n.id !== selectedNote.id) || null);
                    }}
                    className="p-2 rounded-xl text-[#86948a] hover:text-[#ffb4ab] hover:bg-[#222a3d] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Note Content Area */}
              <div className="flex-1">
                <textarea
                  value={selectedNote.content}
                  onChange={(e) => {
                    const updated = { ...selectedNote, content: e.target.value };
                    setSelectedNote(updated);
                    storage.updateNote(selectedNote.id, { content: e.target.value });
                  }}
                  placeholder="Type note in markdown..."
                  className="w-full h-full min-h-[350px] bg-transparent border-0 text-sm text-[#dae2fd] leading-relaxed resize-none focus:outline-none font-sans"
                />
              </div>

              {/* Tags footer */}
              <div className="pt-3 border-t border-[#222a3d] flex items-center justify-between text-xs font-mono text-[#86948a]">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-3.5 h-3.5 text-[#89ceff]" />
                  {selectedNote.tags.join(', ') || 'No tags'}
                </div>
                <div>Last edited {selectedNote.updatedAt?.split('T')[0] || selectedNote.updatedAt}</div>
              </div>
            </div>
          ) : (
            <div className="m-auto text-center text-xs text-[#86948a]">
              Select a note or create a new one.
            </div>
          )}
        </div>
      </div>

      {/* New Note Modal */}
      {isNewNoteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#131b2e] border border-[#222a3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222a3d] pb-3">
              <h3 className="text-base font-bold text-[#dae2fd] font-display">
                Create Knowledge Note
              </h3>
              <button
                onClick={() => setIsNewNoteModalOpen(false)}
                className="text-[#86948a] hover:text-[#dae2fd]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  CONTENT
                </label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write thoughts, insights, meeting takeaways..."
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1">
                  TAGS (COMMA SEPARATED)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="systems, engineering, architecture"
                  className="w-full bg-[#0b1326] border border-[#222a3d] rounded-xl px-3.5 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#89ceff]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222a3d]">
                <button
                  type="button"
                  onClick={() => setIsNewNoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#222a3d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#89ceff] text-[#001e2f] font-mono text-xs font-semibold rounded-xl"
                >
                  Create Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
