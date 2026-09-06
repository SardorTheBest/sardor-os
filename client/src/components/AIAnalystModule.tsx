import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  RefreshCw,
  Zap,
  Settings,
  Cpu,
  Server,
  Cloud,
  Copy,
  Check,
  HardDrive,
  Trash2,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Image as ImageIcon,
  Video as VideoIcon,
  Globe,
  MapPin,
  Bot,
  Paperclip,
  Download,
  Plus,
  Play,
  Pause,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Wand2,
  Pin,
  Edit2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  CheckCheck,
  X,
  Share2,
} from 'lucide-react';
import { AppState, AIProvider, AISettings, AIChatThread, ChatMessage } from '../types';
import { aiEngine, ModelProgress, AI_MODELS } from '../lib/aiEngine';
import { storage } from '../lib/storage';
import { chatStorage } from '../lib/chatStorage';
import { sound } from '../lib/sound';
import { i18n } from '../lib/i18n';
import { AISettingsModal } from './AISettingsModal';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AIAnalystModuleProps {
  state: AppState;
  onNavigate: (view: AppState['activeView']) => void;
}

type StudioTab = 'chat' | 'images' | 'videos';

export const AIAnalystModule: React.FC<AIAnalystModuleProps> = ({ state, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('chat');
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [modelProgress, setModelProgress] = useState<ModelProgress | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings>(storage.getAISettings());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [enableMaps, setEnableMaps] = useState(false);

  // Chat History Sidebar State (Closed by default on mobile/tablets, open on desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [threads, setThreads] = useState<AIChatThread[]>(chatStorage.getThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(chatStorage.getActiveThreadId());

  // Inline Message Editing State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editPromptValue, setEditPromptValue] = useState('');

  // Inline Chat Rename State
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameTitleValue, setRenameTitleValue] = useState('');

  // Attachments
  const [attachedImage, setAttachedImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Media Studios State
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; prompt: string; date: string }>>([]);

  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<Array<{ url: string; prompt: string; date: string }>>([]);

  const tNova = i18n.t('nova');

  // Sync threads with chatStorage
  useEffect(() => {
    const unsub = chatStorage.subscribe((newThreads, currentId) => {
      setThreads(newThreads);
      setActiveThreadId(currentId);
    });
    return () => unsub();
  }, []);

  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || threads[0];
  }, [threads, activeThreadId]);

  const filteredThreads = useMemo(() => {
    if (!searchFilter.trim()) return threads;
    const q = searchFilter.toLowerCase();
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [threads, searchFilter]);

  const pinnedThreads = useMemo(() => filteredThreads.filter((t) => t.isPinned), [filteredThreads]);
  const recentThreads = useMemo(() => filteredThreads.filter((t) => !t.isPinned), [filteredThreads]);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeThread?.messages, isGenerating]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [query]);

  const handleSelectThread = (id: string) => {
    chatStorage.setActiveThreadId(id);
    sound.playClick();
    // Auto close sidebar on mobile screen
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleCreateNewChat = () => {
    chatStorage.createThread();
    sound.playPop();
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleDeleteThread = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(tNova.deleteConfirm)) {
      chatStorage.deleteThread(id);
      sound.playClick();
    }
  };

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    chatStorage.togglePinThread(id);
    sound.playPop();
  };

  const handleStartRename = (e: React.MouseEvent, thread: AIChatThread) => {
    e.stopPropagation();
    setRenamingThreadId(thread.id);
    setRenameTitleValue(thread.title);
  };

  const handleSaveRename = (id: string) => {
    if (renameTitleValue.trim()) {
      chatStorage.updateThreadTitle(id, renameTitleValue.trim());
    }
    setRenamingThreadId(null);
  };

  // Copy to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    sound.playPop();
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Voice playback / TTS
  const handleToggleSpeak = async (msg: ChatMessage) => {
    if (speakingMsgId === msg.id) {
      aiEngine.stopTTS();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msg.id);
      try {
        await aiEngine.speakText(
          msg.content,
          aiSettings.selectedVoice || 'Zephyr',
          () => setSpeakingMsgId(msg.id),
          () => setSpeakingMsgId(null)
        );
      } catch (e) {
        console.error('TTS error', e);
        setSpeakingMsgId(null);
      }
    }
  };

  // Web Speech API Voice Dictation
  const handleToggleDictation = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser environment.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = state.language === 'ru' ? 'ru-RU' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        sound.playPop();
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
        sound.playComplete();
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  // Handle Image Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setAttachedImage({
        data: base64,
        mimeType: file.type,
        preview: result,
      });
      sound.playPop();
    };
    reader.readAsDataURL(file);
  };

  // Send message or prompt to Nova
  const handleSendMessage = async (customPrompt?: string, customImage?: any) => {
    const promptToSend = customPrompt !== undefined ? customPrompt : query;
    if ((!promptToSend.trim() && !attachedImage && !customImage) || isGenerating || !activeThread) return;

    const userMessageText = promptToSend.trim();
    const currentAttached = customImage !== undefined ? customImage : attachedImage;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: currentAttached?.data,
      mimeType: currentAttached?.mimeType,
    };

    chatStorage.addMessage(activeThread.id, userMessage);
    if (customPrompt === undefined) {
      setQuery('');
      setAttachedImage(null);
    }

    setIsGenerating(true);
    sound.playClick();

    const assistantMsgId = `asst-${Date.now()}`;
    const tempAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      providerUsed: aiSettings.provider,
      modelUsed: aiSettings.geminiModel || aiSettings.webllmModel || aiSettings.groqModel || 'Nova',
    };

    chatStorage.addMessage(activeThread.id, tempAssistantMsg);

    try {
      const contextMessages: ChatMessage[] = [
        ...activeThread.messages,
        userMessage,
      ];

      let fullContent = '';
      await aiEngine.streamChat({
        messages: contextMessages,
        state,
        onChunk: (chunk: string) => {
          fullContent += chunk;
          chatStorage.updateMessage(activeThread.id, assistantMsgId, {
            content: fullContent,
          });
        },
        onDone: (finalText: string) => {
          chatStorage.updateMessage(activeThread.id, assistantMsgId, {
            content: finalText,
          });
          sound.playComplete();
          if (aiSettings.voiceAutoSpeak && finalText) {
            aiEngine.speakText(finalText, aiSettings.selectedVoice || 'Zephyr').catch(() => {});
          }
        },
        onError: (err: Error) => {
          console.error('Stream error:', err);
          chatStorage.updateMessage(activeThread.id, assistantMsgId, {
            content: `⚠️ **${tNova.connectionError}**\n\n\`${err.message || 'Unknown network error'}\`\n\n*Попробуйте переключить модель в настройках.*`,
          });
        },
        onProgress: (p: ModelProgress) => {
          setModelProgress(p);
        },
        enableSearch,
        enableMaps,
        imageAttachment: currentAttached ? { data: currentAttached.data, mimeType: currentAttached.mimeType } : undefined,
      });
    } catch (err: any) {
      console.error('AI Generation error:', err);
      chatStorage.updateMessage(activeThread.id, assistantMsgId, {
        content: `⚠️ **${tNova.connectionError}**\n\n\`${err.message || 'Unknown network error'}\``,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Inline User Message Editing & Regeneration
  const handleStartEditMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditPromptValue(msg.content);
  };

  const handleSaveAndRegenerate = async (msgId: string) => {
    if (!activeThread || !editPromptValue.trim()) return;

    chatStorage.truncateAfterMessage(activeThread.id, msgId);
    chatStorage.updateMessage(activeThread.id, msgId, {
      content: editPromptValue.trim(),
    });

    setEditingMessageId(null);
    setIsGenerating(true);
    sound.playClick();

    const assistantMsgId = `asst-${Date.now()}`;
    const tempAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      providerUsed: aiSettings.provider,
      modelUsed: aiSettings.geminiModel || 'Nova',
    };

    chatStorage.addMessage(activeThread.id, tempAssistantMsg);

    try {
      const currentMessages = chatStorage.getActiveThread()?.messages || [];
      const promptMessages = currentMessages.filter((m) => m.id !== assistantMsgId);

      let fullContent = '';
      await aiEngine.streamChat({
        messages: promptMessages,
        state,
        onChunk: (chunk: string) => {
          fullContent += chunk;
          chatStorage.updateMessage(activeThread.id, assistantMsgId, {
            content: fullContent,
          });
        },
        onDone: (finalText: string) => {
          chatStorage.updateMessage(activeThread.id, assistantMsgId, {
            content: finalText,
          });
          sound.playComplete();
        },
        onError: (err: Error) => {
          chatStorage.updateMessage(activeThread.id, assistantMsgId, {
            content: `⚠️ **${tNova.connectionError}**\n\n\`${err.message || 'Error'}\``,
          });
        },
        enableSearch,
        enableMaps,
      });
    } catch (err: any) {
      console.error(err);
      chatStorage.updateMessage(activeThread.id, assistantMsgId, {
        content: `⚠️ **${tNova.connectionError}**\n\n\`${err.message || 'Error'}\``,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete message
  const handleDeleteMessage = (msgId: string) => {
    if (activeThread) {
      chatStorage.deleteMessage(activeThread.id, msgId);
      sound.playClick();
    }
  };

  // Image Generation Studio Handlers
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage) return;
    setIsGeneratingImage(true);
    sound.playClick();

    try {
      const res = await aiEngine.generateImage({
        prompt: imagePrompt.trim(),
        aspectRatio: imageAspectRatio,
        imageSize,
      });

      if (res.imageUrl) {
        setGeneratedImages((prev) => [
          { url: res.imageUrl, prompt: imagePrompt.trim(), date: new Date().toLocaleTimeString() },
          ...prev,
        ]);
        sound.playComplete();
      }
    } catch (err: any) {
      alert(`Image Generation Failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Video Generation Studio Handlers
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim() || isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    setVideoStatus('Veo 3.1 is initializing video render pipeline...');
    sound.playClick();

    try {
      const res = await aiEngine.generateVideo({
        prompt: videoPrompt.trim(),
        aspectRatio: videoAspectRatio,
        onStatusUpdate: (status: string) => setVideoStatus(status),
      });

      if (res.videoBlobUrl) {
        setGeneratedVideos((prev) => [
          { url: res.videoBlobUrl, prompt: videoPrompt.trim(), date: new Date().toLocaleTimeString() },
          ...prev,
        ]);
        sound.playComplete();
      }
    } catch (err: any) {
      alert(`Video Generation Failed: ${err.message || 'Veo service timeout'}`);
    } finally {
      setIsGeneratingVideo(false);
      setVideoStatus(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] -m-4 md:-m-8 bg-[#060e20] text-[#dae2fd] overflow-hidden select-none">
      {/* Top Studio Mode Selector Header */}
      <header className="h-14 border-b border-[#222a3d] px-3 md:px-4 flex items-center justify-between bg-[#0b1326]/90 backdrop-blur-md z-20 flex-shrink-0 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* History Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title={isSidebarOpen ? 'Скрыть историю' : 'Показать историю'}
            className="p-2 rounded-xl bg-[#131b2e] hover:bg-[#171f33] border border-[#222a3d] text-[#86948a] hover:text-[#dae2fd] transition-colors flex-shrink-0"
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          {/* Mode Tabs */}
          <div className="flex items-center p-1 bg-[#131b2e] rounded-xl border border-[#222a3d] flex-shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-[#00ffab]/10 text-[#00ffab] shadow-sm'
                  : 'text-[#86948a] hover:text-[#dae2fd]'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{tNova.chatTab}</span>
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'images'
                  ? 'bg-[#00e5ff]/10 text-[#00e5ff] shadow-sm'
                  : 'text-[#86948a] hover:text-[#dae2fd]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{tNova.imageTab}</span>
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'videos'
                  ? 'bg-[#d0bcff]/10 text-[#d0bcff] shadow-sm'
                  : 'text-[#86948a] hover:text-[#dae2fd]'
              }`}
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>{tNova.videoTab}</span>
            </button>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {activeTab === 'chat' && (
            <>
              {/* Google Search Grounding Toggle */}
              <button
                onClick={() => setEnableSearch((prev) => !prev)}
                title="Поиск Google (Grounding)"
                className={`flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                  enableSearch
                    ? 'bg-[#00ffab]/15 border-[#00ffab]/40 text-[#00ffab]'
                    : 'bg-[#131b2e] border-[#222a3d] text-[#86948a] hover:text-[#dae2fd]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search</span>
              </button>

              {/* Google Maps Grounding Toggle */}
              <button
                onClick={() => setEnableMaps((prev) => !prev)}
                title="Карты Google (Grounding)"
                className={`flex items-center gap-1.5 px-2 md:px-2.5 py-1.5 rounded-xl text-xs font-mono border transition-all ${
                  enableMaps
                    ? 'bg-[#00e5ff]/15 border-[#00e5ff]/40 text-[#00e5ff]'
                    : 'bg-[#131b2e] border-[#222a3d] text-[#86948a] hover:text-[#dae2fd]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Maps</span>
              </button>

              {/* Clear active thread */}
              <button
                onClick={() => {
                  if (activeThread && window.confirm('Очистить сообщения в этом диалоге?')) {
                    chatStorage.clearThreadMessages(activeThread.id);
                    sound.playClick();
                  }
                }}
                title={tNova.clearChat}
                className="p-2 rounded-xl bg-[#131b2e] hover:bg-[#171f33] border border-[#222a3d] text-[#86948a] hover:text-[#ffb4ab] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* AI Settings Modal Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#171f33] border border-[#222a3d] text-xs font-medium text-[#dae2fd] transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-[#00ffab]" />
            <span className="hidden sm:inline font-mono">
              {aiSettings.provider === 'gemini'
                ? 'Gemini 3.7'
                : aiSettings.provider === 'webllm'
                ? 'Gemma 2'
                : aiSettings.provider}
            </span>
          </button>
        </div>
      </header>

      {/* Main Full-Screen Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop for Sidebar */}
        {activeTab === 'chat' && isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
          />
        )}

        {/* Collapsible Chat History Left Sidebar (Desktop side-by-side, Mobile overlay) */}
        {activeTab === 'chat' && isSidebarOpen && (
          <aside className="fixed inset-y-14 left-0 z-40 w-64 max-w-[75vw] md:static md:w-64 border-r border-[#222a3d] bg-[#060e20] flex flex-col flex-shrink-0 shadow-2xl md:shadow-none transition-all duration-200">
            {/* New Chat Button & Search */}
            <div className="p-3 space-y-2 border-b border-[#222a3d]/50">
              <button
                onClick={handleCreateNewChat}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#00ffab]/20 to-[#00e5ff]/20 hover:from-[#00ffab]/30 hover:to-[#00e5ff]/30 text-[#00ffab] border border-[#00ffab]/30 font-medium text-xs shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{tNova.newChat}</span>
              </button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86948a]" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={tNova.searchChats}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#131b2e] border border-[#222a3d] text-xs text-[#dae2fd] placeholder:text-[#86948a] focus:outline-none focus:border-[#00ffab]/40 font-sans"
                />
              </div>
            </div>

            {/* Threads List (Pinned & Recent) */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {/* Pinned Section */}
              {pinnedThreads.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-mono tracking-wider text-[#00ffab] uppercase font-semibold flex items-center gap-1.5">
                    <Pin className="w-3 h-3" />
                    <span>{tNova.pinnedChats}</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {pinnedThreads.map((thread) => (
                      <ChatItem
                        key={thread.id}
                        thread={thread}
                        isActive={thread.id === activeThreadId}
                        isRenaming={renamingThreadId === thread.id}
                        renameValue={renameTitleValue}
                        onRenameChange={setRenameTitleValue}
                        onSaveRename={() => handleSaveRename(thread.id)}
                        onCancelRename={() => setRenamingThreadId(null)}
                        onSelect={() => handleSelectThread(thread.id)}
                        onTogglePin={(e) => handleTogglePin(e, thread.id)}
                        onStartRename={(e) => handleStartRename(e, thread)}
                        onDelete={(e) => handleDeleteThread(e, thread.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Section */}
              <div>
                <div className="px-2 py-1 text-[10px] font-mono tracking-wider text-[#86948a] uppercase font-semibold">
                  {tNova.recentChats}
                </div>
                <div className="space-y-1 mt-1">
                  {recentThreads.length === 0 && pinnedThreads.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#86948a]">
                      {tNova.noChats}
                    </div>
                  ) : (
                    recentThreads.map((thread) => (
                      <ChatItem
                        key={thread.id}
                        thread={thread}
                        isActive={thread.id === activeThreadId}
                        isRenaming={renamingThreadId === thread.id}
                        renameValue={renameTitleValue}
                        onRenameChange={setRenameTitleValue}
                        onSaveRename={() => handleSaveRename(thread.id)}
                        onCancelRename={() => setRenamingThreadId(null)}
                        onSelect={() => handleSelectThread(thread.id)}
                        onTogglePin={(e) => handleTogglePin(e, thread.id)}
                        onStartRename={(e) => handleStartRename(e, thread)}
                        onDelete={(e) => handleDeleteThread(e, thread.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Content Body */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0b1326] relative overflow-hidden">
          {activeTab === 'chat' && (
            <>
              {/* Messages Flow Area */}
              <div className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-6">
                {activeThread?.messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const isEditing = editingMessageId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isUser ? 'items-end' : 'items-start'
                      } group transition-all`}
                    >
                      {/* Message Bubble Container */}
                      <div
                        className={`max-w-3xl w-full rounded-2xl p-4 md:p-5 border transition-all ${
                          isUser
                            ? 'bg-[#171f33] border-[#222a3d] text-[#dae2fd] ml-auto'
                            : 'bg-[#131b2e] border-[#222a3d]/80 text-[#dae2fd]'
                        }`}
                      >
                        {/* Header info (Role & Model & Time) */}
                        <div className="flex items-center justify-between gap-3 mb-2 text-xs font-mono text-[#86948a]">
                          <div className="flex items-center gap-2">
                            {isUser ? (
                              <div className="w-5 h-5 rounded-md bg-[#00ffab]/20 text-[#00ffab] flex items-center justify-center font-bold text-[10px]">
                                S
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#00ffab] to-[#00e5ff] text-[#003824] flex items-center justify-center font-bold text-[10px]">
                                <Bot className="w-3 h-3 text-[#003824]" />
                              </div>
                            )}
                            <span className="font-semibold text-[#dae2fd]">
                              {isUser ? 'Сардор' : 'Nova'}
                            </span>
                            {!isUser && msg.modelUsed && (
                              <span className="px-1.5 py-0.2 rounded bg-[#00ffab]/10 text-[#00ffab] text-[10px] border border-[#00ffab]/20">
                                {msg.modelUsed}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px]">{msg.timestamp}</span>
                        </div>

                        {/* Image attachment if any */}
                        {msg.image && (
                          <div className="mb-3 rounded-xl overflow-hidden max-w-sm border border-[#222a3d]">
                            <img
                              src={`data:${msg.mimeType || 'image/jpeg'};base64,${msg.image}`}
                              alt="User attachment"
                              className="w-full h-auto object-cover"
                            />
                          </div>
                        )}

                        {/* Message Content or Inline Edit Form */}
                        {isEditing ? (
                          <div className="space-y-3 mt-2">
                            <textarea
                              value={editPromptValue}
                              onChange={(e) => setEditPromptValue(e.target.value)}
                              className="w-full p-3 rounded-xl bg-[#0b1326] border border-[#00ffab]/40 text-sm text-[#dae2fd] focus:outline-none font-sans min-h-[100px]"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingMessageId(null)}
                                className="px-3 py-1.5 rounded-lg bg-[#131b2e] hover:bg-[#171f33] text-xs text-[#86948a] border border-[#222a3d]"
                              >
                                {tNova.cancel}
                              </button>
                              <button
                                onClick={() => handleSaveAndRegenerate(msg.id)}
                                className="px-3 py-1.5 rounded-lg bg-[#00ffab] hover:bg-[#00ffab]/90 text-xs font-semibold text-[#003824] shadow-md shadow-[#00ffab]/20 flex items-center gap-1.5"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>{tNova.saveAndRegenerate}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="select-text font-sans">
                            {msg.content ? (
                              isUser ? (
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {msg.content}
                                </div>
                              ) : (
                                <MarkdownRenderer
                                  content={msg.content}
                                  isStreaming={isGenerating && msg.id === activeThread?.messages[activeThread.messages.length - 1]?.id}
                                />
                              )
                            ) : (
                              <span className="text-[#86948a] italic flex items-center gap-2 text-sm">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00ffab]" />
                                {tNova.generating}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Message Actions Bar (Copy, Edit, Speak, Delete) */}
                        {!isEditing && (
                          <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-[#222a3d]/40 text-[#86948a]">
                            {/* Copy button */}
                            <button
                              onClick={() => handleCopy(msg.content, msg.id)}
                              title={tNova.copy}
                              className="p-1.5 rounded-lg hover:bg-[#0b1326] hover:text-[#dae2fd] transition-colors"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-[#00ffab]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Voice TTS button (for assistant messages) */}
                            {!isUser && msg.content && (
                              <button
                                onClick={() => handleToggleSpeak(msg)}
                                title={speakingMsgId === msg.id ? tNova.stopSpeaking : tNova.speak}
                                className={`p-1.5 rounded-lg hover:bg-[#0b1326] transition-colors ${
                                  speakingMsgId === msg.id
                                    ? 'text-[#00ffab] bg-[#00ffab]/10 animate-pulse'
                                    : 'hover:text-[#dae2fd]'
                                }`}
                              >
                                {speakingMsgId === msg.id ? (
                                  <VolumeX className="w-3.5 h-3.5" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Edit prompt button (for user messages) */}
                            {isUser && (
                              <button
                                onClick={() => handleStartEditMessage(msg)}
                                title={tNova.editPrompt}
                                className="p-1.5 rounded-lg hover:bg-[#0b1326] hover:text-[#00e5ff] transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete message button */}
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              title={tNova.deleteMessage}
                              className="p-1.5 rounded-lg hover:bg-[#0b1326] hover:text-[#ffb4ab] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Model Progress Indicator */}
              {modelProgress && modelProgress.isLoading && (
                <div className="px-4 md:px-12 py-2 bg-[#131b2e]/80 border-t border-[#222a3d] flex items-center justify-between text-xs font-mono text-[#00ffab]">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{modelProgress.text}</span>
                  </div>
                  <span>{Math.round(modelProgress.progress)}%</span>
                </div>
              )}

              {/* Bottom Sticky Input Bar */}
              <div className="p-3 md:p-6 bg-[#060e20]/90 backdrop-blur-lg border-t border-[#222a3d] flex-shrink-0">
                <div className="max-w-4xl mx-auto space-y-2">
                  {/* Attached Image Preview */}
                  {attachedImage && (
                    <div className="flex items-center gap-2 p-2 bg-[#131b2e] rounded-xl border border-[#222a3d] w-fit">
                      <img
                        src={attachedImage.preview}
                        alt="Preview"
                        className="w-10 h-10 object-cover rounded-lg"
                      />
                      <span className="text-xs text-[#86948a]">Image attached</span>
                      <button
                        onClick={() => setAttachedImage(null)}
                        className="p-1 text-[#86948a] hover:text-[#ffb4ab]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Input Form Wrapper */}
                  <div className="flex items-end gap-2 bg-[#131b2e] rounded-2xl p-2 md:p-3 border border-[#222a3d] focus-within:border-[#00ffab]/50 focus-within:shadow-[0_0_15px_rgba(0,255,171,0.1)] transition-all">
                    {/* Attachment button */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach image"
                      className="p-2 text-[#86948a] hover:text-[#00ffab] rounded-xl hover:bg-[#171f33] transition-colors flex-shrink-0"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={tNova.inputPlaceholder}
                      rows={1}
                      className="flex-1 bg-transparent border-0 text-sm text-[#dae2fd] placeholder:text-[#86948a] focus:outline-none resize-none py-1.5 max-h-44 font-sans leading-relaxed"
                    />

                    {/* Voice Dictation Button */}
                    <button
                      onClick={handleToggleDictation}
                      title={tNova.dictation}
                      className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                        isRecording
                          ? 'bg-[#ffb4ab]/20 text-[#ffb4ab] animate-pulse border border-[#ffb4ab]/40'
                          : 'text-[#86948a] hover:text-[#dae2fd] hover:bg-[#171f33]'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* Send Button */}
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={(!query.trim() && !attachedImage) || isGenerating}
                      title={tNova.send}
                      className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                        (query.trim() || attachedImage) && !isGenerating
                          ? 'bg-[#00ffab] hover:bg-[#00ffab]/90 text-[#003824] shadow-md shadow-[#00ffab]/25'
                          : 'bg-[#171f33] text-[#86948a] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-[#00ffab]" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Image Studio Tab */}
          {activeTab === 'images' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
              <div className="bg-[#131b2e] rounded-2xl p-6 border border-[#222a3d] space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#00e5ff] font-mono">
                  <ImageIcon className="w-4 h-4" />
                  <span>{tNova.imageStudioTitle}</span>
                </div>

                <div className="space-y-3">
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder={tNova.imagePromptPlaceholder}
                    rows={3}
                    className="w-full p-3.5 rounded-xl bg-[#0b1326] border border-[#222a3d] text-sm text-[#dae2fd] placeholder:text-[#86948a] focus:outline-none focus:border-[#00e5ff]/50 font-sans"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Aspect Ratio */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#86948a] font-mono">{tNova.aspectRatio}:</span>
                        {['1:1', '16:9', '9:16', '4:3'].map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => setImageAspectRatio(ratio)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                              imageAspectRatio === ratio
                                ? 'bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/40'
                                : 'bg-[#0b1326] text-[#86948a] border-[#222a3d]'
                            }`}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>

                      {/* Resolution */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#86948a] font-mono">{tNova.quality}:</span>
                        {['1K', '2K', '4K'].map((size) => (
                          <button
                            key={size}
                            onClick={() => setImageSize(size)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                              imageSize === size
                                ? 'bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/40'
                                : 'bg-[#0b1326] text-[#86948a] border-[#222a3d]'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateImage}
                      disabled={!imagePrompt.trim() || isGeneratingImage}
                      className="px-5 py-2 rounded-xl bg-[#00e5ff] hover:bg-[#00e5ff]/90 text-[#00363d] font-semibold text-xs flex items-center gap-2 shadow-md shadow-[#00e5ff]/20 disabled:opacity-50"
                    >
                      {isGeneratingImage ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{tNova.generatingImage}</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>{tNova.generateImage}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Image Gallery */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#86948a] font-semibold">
                  {tNova.imageGallery}
                </h3>
                {generatedImages.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#131b2e]/40 border border-[#222a3d] text-center text-xs text-[#86948a]">
                    {tNova.noImages}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {generatedImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-2xl overflow-hidden bg-[#131b2e] border border-[#222a3d] hover:border-[#00e5ff]/50 transition-all"
                      >
                        <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />
                        <div className="p-3 bg-[#131b2e]/95 space-y-1">
                          <p className="text-xs text-[#dae2fd] line-clamp-2">{img.prompt}</p>
                          <div className="flex items-center justify-between text-[10px] text-[#86948a] font-mono">
                            <span>{img.date}</span>
                            <a
                              href={img.url}
                              download={`nova-artwork-${idx}.png`}
                              className="text-[#00e5ff] hover:underline flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>{tNova.download}</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Video Studio Tab (Veo 3.1) */}
          {activeTab === 'videos' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
              <div className="bg-[#131b2e] rounded-2xl p-6 border border-[#222a3d] space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#d0bcff] font-mono">
                  <VideoIcon className="w-4 h-4" />
                  <span>{tNova.videoStudioTitle}</span>
                </div>

                <div className="space-y-3">
                  <textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder={tNova.videoPromptPlaceholder}
                    rows={3}
                    className="w-full p-3.5 rounded-xl bg-[#0b1326] border border-[#222a3d] text-sm text-[#dae2fd] placeholder:text-[#86948a] focus:outline-none focus:border-[#d0bcff]/50 font-sans"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#86948a] font-mono">{tNova.aspectRatio}:</span>
                      {['16:9', '9:16'].map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setVideoAspectRatio(ratio)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
                            videoAspectRatio === ratio
                              ? 'bg-[#d0bcff]/15 text-[#d0bcff] border-[#d0bcff]/40'
                              : 'bg-[#0b1326] text-[#86948a] border-[#222a3d]'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleGenerateVideo}
                      disabled={!videoPrompt.trim() || isGeneratingVideo}
                      className="px-5 py-2 rounded-xl bg-[#d0bcff] hover:bg-[#d0bcff]/90 text-[#381e72] font-semibold text-xs flex items-center gap-2 shadow-md shadow-[#d0bcff]/20 disabled:opacity-50"
                    >
                      {isGeneratingVideo ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{tNova.renderingVideo}</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>{tNova.generateVideo}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {videoStatus && (
                    <div className="p-3 rounded-xl bg-[#0b1326] border border-[#d0bcff]/30 text-xs font-mono text-[#d0bcff] flex items-center gap-2 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{videoStatus}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Video Gallery */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#86948a] font-semibold">
                  {tNova.videoGallery}
                </h3>
                {generatedVideos.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#131b2e]/40 border border-[#222a3d] text-center text-xs text-[#86948a]">
                    {tNova.noVideos}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedVideos.map((vid, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl overflow-hidden bg-[#131b2e] border border-[#222a3d] space-y-2 p-3"
                      >
                        <video controls className="w-full aspect-video rounded-xl bg-black" src={vid.url} />
                        <p className="text-xs text-[#dae2fd] line-clamp-2">{vid.prompt}</p>
                        <div className="flex items-center justify-between text-[10px] text-[#86948a] font-mono">
                          <span>{vid.date}</span>
                          <a
                            href={vid.url}
                            download={`nova-video-${idx}.mp4`}
                            className="text-[#d0bcff] hover:underline flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>{tNova.download}</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={() => setAiSettings(storage.getAISettings())}
      />
    </div>
  );
};

interface ChatItemProps {
  thread: AIChatThread;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (val: string) => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onSelect: () => void;
  onTogglePin: (e: React.MouseEvent) => void;
  onStartRename: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({
  thread,
  isActive,
  isRenaming,
  renameValue,
  onRenameChange,
  onSaveRename,
  onCancelRename,
  onSelect,
  onTogglePin,
  onStartRename,
  onDelete,
}) => {
  if (isRenaming) {
    return (
      <div className="p-1.5 rounded-xl bg-[#131b2e] border border-[#00ffab]/40 flex items-center gap-1.5">
        <input
          type="text"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveRename();
            if (e.key === 'Escape') onCancelRename();
          }}
          autoFocus
          className="flex-1 px-2 py-1 text-xs bg-[#0b1326] rounded-lg text-[#dae2fd] focus:outline-none"
        />
        <button
          onClick={onSaveRename}
          className="p-1 text-[#00ffab] hover:bg-[#0b1326] rounded"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onCancelRename}
          className="p-1 text-[#86948a] hover:bg-[#0b1326] rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
        isActive
          ? 'bg-[#171f33] text-[#dae2fd] border border-[#00ffab]/30 shadow-sm'
          : 'text-[#bbcabf] hover:bg-[#131b2e] hover:text-[#dae2fd] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        <MessageSquare
          className={`w-3.5 h-3.5 flex-shrink-0 ${
            isActive ? 'text-[#00ffab]' : 'text-[#86948a] group-hover:text-[#dae2fd]'
          }`}
        />
        <span className="truncate font-sans">{thread.title}</span>
      </div>

      {/* Action buttons (Pin, Rename, Delete) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onTogglePin}
          title={thread.isPinned ? 'Открепить' : 'Закрепить'}
          className={`p-1 rounded hover:bg-[#0b1326] transition-colors ${
            thread.isPinned ? 'text-[#00ffab]' : 'text-[#86948a] hover:text-[#00ffab]'
          }`}
        >
          <Pin className="w-3 h-3" />
        </button>
        <button
          onClick={onStartRename}
          title="Переименовать"
          className="p-1 rounded text-[#86948a] hover:text-[#00e5ff] hover:bg-[#0b1326] transition-colors"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          title="Удалить"
          className="p-1 rounded text-[#86948a] hover:text-[#ffb4ab] hover:bg-[#0b1326] transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
