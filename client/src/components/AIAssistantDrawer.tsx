import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Settings,
  Bot,
  User,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Server,
  Cloud,
  Volume2,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import { AppState, AIProvider, AISettings } from '../types';
import { aiEngine, ChatMessage, ModelProgress } from '../lib/aiEngine';
import { storage } from '../lib/storage';
import { sound } from '../lib/sound';
import { AISettingsModal } from './AISettingsModal';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AIAssistantDrawerProps {
  state: AppState;
  onNavigate?: (view: AppState['activeView']) => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ state, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [modelProgress, setModelProgress] = useState<ModelProgress | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings>(storage.getAISettings());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-nova-drawer',
      role: 'assistant',
      content: `**Nova готова к работе, Сардор!**
- **${state.tasks.filter((t) => !t.isCompleted).length} активных задач**
- **${state.habits.length} привычек**
- **${state.books.filter((b) => b.status === 'reading').length} книг** в процессе чтения

Чем могу помочь?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      providerUsed: 'gemini',
      modelUsed: 'gemini-3.7-flash',
    },
  ]);

  useEffect(() => {
    setAiSettings(storage.getAISettings());
  }, [isOpen, isSettingsOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleProviderSwitch = (provider: AIProvider) => {
    sound.playClick();
    const updated = storage.updateAISettings({ provider });
    setAiSettings(updated);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const text = customPrompt || inputQuery;
    if (!text.trim() || isGenerating) return;

    sound.playClick();

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMessageId = `asst-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      providerUsed: aiSettings.provider,
      modelUsed: aiSettings.provider === 'gemini' ? (aiSettings.geminiModel || 'gemini-3.7-flash') : aiSettings.webllmModel,
    };

    const updatedMessages = [...messages, userMessage, initialAssistantMessage];
    setMessages(updatedMessages);
    if (!customPrompt) setInputQuery('');
    setIsGenerating(true);

    let accumulatedContent = '';

    await aiEngine.streamChat({
      messages: [...messages, userMessage],
      state,
      onProgress: (progress) => {
        setModelProgress(progress);
      },
      onChunk: (chunk) => {
        accumulatedContent += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: accumulatedContent } : msg
          )
        );
        scrollToBottom();
      },
      onDone: (fullText) => {
        setIsGenerating(false);
        setModelProgress(null);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: fullText } : msg
          )
        );
        sound.playPop();

        if (aiSettings.voiceAutoSpeak) {
          handleSpeakMessage(assistantMessageId, fullText);
        }
      },
      onError: (err) => {
        setIsGenerating(false);
        setModelProgress(null);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `**Ошибка подключения:** ${err.message}\n\n*Совет: переключитесь на резервный провайдер (Gemma 2 или Groq).*`,
                }
              : msg
          )
        );
      },
    });
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    sound.playClick();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeakMessage = (id: string, text: string) => {
    if (speakingMsgId === id) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(id);
    sound.playClick();
    aiEngine.speakText(
      text,
      aiSettings.selectedVoice || 'Zephyr',
      () => setSpeakingMsgId(id),
      () => setSpeakingMsgId(null)
    );
  };

  const handleClearHistory = () => {
    sound.playPop();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Диалог перезапущен. Чем могу помочь, Сардор?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        providerUsed: aiSettings.provider,
      },
    ]);
  };

  const quickActions = [
    {
      id: 'qa-habits',
      label: 'Анализ привычек',
      prompt: 'Проанализируй мои текущие привычки, активность и стрейки. Дай 2-3 практических совета по удержанию дисциплины.',
    },
    {
      id: 'qa-summary',
      label: 'Саммари книги',
      prompt: 'Сделай саммари книги, которую я сейчас читаю, выдели ключевые тезисы и выжимку главных идей.',
    },
    {
      id: 'qa-recommend',
      label: 'Что почитать дальше?',
      prompt: 'На основе прочитанных мною книг и оценок, порекомендуй 3 книги для следующего чтения с кратким обоснованием.',
    },
    {
      id: 'qa-schedule',
      label: 'План задач на день',
      prompt: 'Посмотри мои невыполненные задачи и дедлайны. Составь структурированный план фокуса на сегодня.',
    },
  ];

  return (
    <>
      {/* Floating Action Button (FAB) - Compact & Non-Obtrusive */}
      {!isOpen && (
        <button
          id="ai-assistant-fab"
          onClick={() => {
            sound.playClick();
            setIsOpen(true);
          }}
          className="fixed bottom-20 md:bottom-6 right-3.5 md:right-6 z-40 w-10 h-10 md:w-11 md:h-11 rounded-full bg-[#0a1020]/90 hover:bg-[#131d33] border border-[#00ffab]/40 hover:border-[#00ffab] text-[#00ffab] shadow-lg shadow-black/60 hover:scale-105 active:scale-95 transition-all group flex items-center justify-center backdrop-blur-md"
          title="Nova AI • Быстрый ассистент"
          aria-label="Открыть Nova AI"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 md:w-5 md:h-5 group-hover:rotate-12 transition-transform duration-300 text-[#00ffab]" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00ffab] ring-2 ring-[#0a1020] animate-pulse" />
          </div>
        </button>
      )}

      {/* Slide-out Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          <div
            className={`relative flex flex-col bg-[#0d1628] border-l border-[#1e293b] shadow-2xl transition-all duration-300 ease-out z-50 ${
              isExpanded ? 'w-full md:w-[720px]' : 'w-full md:w-[480px]'
            } h-full max-h-[100dvh]`}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#1e293b] bg-[#080e1c]/95 flex flex-col gap-3 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00ffab]/20 to-[#00e5ff]/20 border border-[#00ffab]/40 flex items-center justify-center text-[#00ffab]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#dae2fd] font-display flex items-center gap-2">
                      Нова (Nova) • ИИ Ассистент
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#00ffab]/10 text-[#00ffab] border border-[#00ffab]/20">
                        Online
                      </span>
                    </h3>
                    <div className="text-[10px] font-mono text-[#86948a]">
                      Zenith Командный пульт: Сардор
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="hidden md:flex p-1.5 rounded-lg text-[#86948a] hover:text-[#00ffab] hover:bg-[#131d33] transition-colors"
                    title={isExpanded ? 'Сузить панель' : 'Расширить панель'}
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  {onNavigate && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onNavigate('ai');
                      }}
                      className="p-1.5 rounded-lg text-[#00ffab] hover:bg-[#131d33] transition-colors flex items-center gap-1 text-[11px] font-mono"
                      title="Открыть во весь экран"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-1.5 rounded-lg text-[#86948a] hover:text-[#00e5ff] hover:bg-[#131d33] transition-colors"
                    title="Настройки ИИ"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="p-1.5 rounded-lg text-[#86948a] hover:text-[#ffb4ab] hover:bg-[#131d33] transition-colors"
                    title="Очистить диалог"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-[#86948a] hover:text-[#dae2fd] hover:bg-[#131d33] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Provider Fast Switcher Pills */}
              <div className="grid grid-cols-4 gap-1 bg-[#080d1a] p-1 rounded-xl border border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => handleProviderSwitch('gemini')}
                  className={`py-1 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 transition-all ${
                    aiSettings.provider === 'gemini'
                      ? 'bg-[#00ffab]/20 text-[#00ffab] font-bold border border-[#00ffab]/40'
                      : 'text-[#86948a] hover:text-[#dae2fd]'
                  }`}
                >
                  Gemini
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderSwitch('webllm')}
                  className={`py-1 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 transition-all ${
                    aiSettings.provider === 'webllm'
                      ? 'bg-[#00e5ff]/20 text-[#00e5ff] font-bold border border-[#00e5ff]/40'
                      : 'text-[#86948a] hover:text-[#dae2fd]'
                  }`}
                >
                  Gemma
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderSwitch('groq')}
                  className={`py-1 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 transition-all ${
                    aiSettings.provider === 'groq'
                      ? 'bg-[#e5a93c]/20 text-[#e5a93c] font-bold border border-[#e5a93c]/40'
                      : 'text-[#86948a] hover:text-[#dae2fd]'
                  }`}
                >
                  Groq
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderSwitch('ollama')}
                  className={`py-1 rounded-lg text-[10px] font-mono flex items-center justify-center gap-1 transition-all ${
                    aiSettings.provider === 'ollama'
                      ? 'bg-[#a78bfa]/20 text-[#a78bfa] font-bold border border-[#a78bfa]/40'
                      : 'text-[#86948a] hover:text-[#dae2fd]'
                  }`}
                >
                  Ollama
                </button>
              </div>
            </div>

            {/* Model Download Progress Bar */}
            {modelProgress && modelProgress.isLoading && (
              <div className="p-3 bg-[#080e1c] border-b border-[#1e293b] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-[#00ffab]">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {modelProgress.text || 'Загрузка весов WebGPU...'}
                  </span>
                  <span>{modelProgress.progress}%</span>
                </div>
                <div className="w-full bg-[#131d33] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00ffab] h-full transition-all duration-300"
                    style={{ width: `${modelProgress.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-3.5 md:p-4 space-y-4 custom-scrollbar">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  } space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#86948a] px-1">
                    {msg.role === 'user' ? (
                      <>
                        <span>{state.user.name || 'Сардор'}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-3 h-3 text-[#00ffab]" />
                        <span>Нова</span>
                        {msg.modelUsed && (
                          <span className="text-[#00ffab]">[{msg.modelUsed}]</span>
                        )}
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`p-3.5 md:p-4 rounded-2xl text-xs leading-relaxed max-w-[95%] relative group ${
                      msg.role === 'user'
                        ? 'bg-[#131d33] text-[#dae2fd] border border-[#1e293b] rounded-br-none'
                        : 'bg-[#080e1c] text-[#dae2fd] border border-[#1e293b] rounded-bl-none shadow-md w-full'
                    }`}
                  >
                    {/* Action buttons */}
                    {msg.role === 'assistant' && msg.content && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="p-1.5 rounded-lg bg-[#131d33] text-[#86948a] hover:text-[#dae2fd]"
                          title="Скопировать"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-[#00ffab]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleSpeakMessage(msg.id, msg.content)}
                          className={`p-1.5 rounded-lg bg-[#131d33] ${
                            speakingMsgId === msg.id ? 'text-[#00ffab] animate-bounce' : 'text-[#86948a] hover:text-[#dae2fd]'
                          }`}
                          title="Озвучить"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {msg.content ? (
                      msg.role === 'assistant' ? (
                        <MarkdownRenderer content={msg.content} isStreaming={isGenerating && msg === messages[messages.length - 1]} />
                      ) : (
                        <div className="whitespace-pre-wrap font-sans text-xs">
                          {msg.content}
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-mono text-[#00ffab] animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Нова генерирует ответ...
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-3.5 py-2 bg-[#080e1c]/80 border-t border-[#1e293b] overflow-x-auto flex-shrink-0">
              <div className="flex sm:grid sm:grid-cols-2 gap-1.5 min-w-max sm:min-w-0">
                {quickActions.map((qa) => (
                  <button
                    key={qa.id}
                    onClick={() => handleSendMessage(qa.prompt)}
                    disabled={isGenerating}
                    className="p-2 rounded-xl bg-[#080d1a] hover:bg-[#131d33] border border-[#1e293b] text-left text-[11px] text-[#bbcabf] hover:text-[#dae2fd] transition-all whitespace-nowrap sm:whitespace-normal truncate disabled:opacity-50 min-h-[38px] flex items-center"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Input Box */}
            <div className="p-3.5 md:p-4 border-t border-[#1e293b] bg-[#080e1c] pb-[max(1rem,env(safe-area-inset-bottom))] flex-shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  disabled={isGenerating}
                  placeholder="Спросите Нову о задачах, привычках или коде..."
                  className="flex-1 bg-[#131d33] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#dae2fd] focus:outline-none focus:border-[#00ffab] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isGenerating || !inputQuery.trim()}
                  className="p-2.5 rounded-xl bg-[#00ffab] hover:bg-[#00ffab]/90 text-[#003824] font-bold disabled:opacity-40 shadow-md shadow-[#00ffab]/20 transition-all flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <AISettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={() => setAiSettings(storage.getAISettings())}
      />
    </>
  );
};
