import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  Check,
  Calendar,
  Clock,
  Tag,
  Bell,
  ArrowRight,
  Flame,
  BookOpen,
  FileText,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { AppState } from '../types';
import {
  voiceIntentService,
  ParsedVoiceAction,
  isSpeechRecognitionSupported,
} from '../lib/voiceIntentService';
import { sound } from '../lib/sound';

interface VoiceInputDialogProps {
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: AppState['activeView']) => void;
}

export const VoiceInputDialog: React.FC<VoiceInputDialogProps> = ({
  state,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const isRu = state.language === 'ru';
  const isSupported = isSpeechRecognitionSupported();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parsedAction, setParsedAction] = useState<ParsedVoiceAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-listen when opened
  useEffect(() => {
    if (isOpen && isSupported) {
      handleStartListening();
    } else if (!isOpen) {
      voiceIntentService.stopListening();
      setIsListening(false);
      setTranscript('');
      setInterimTranscript('');
      setParsedAction(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const handleStartListening = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setTranscript('');
    setInterimTranscript('');
    setParsedAction(null);

    voiceIntentService.setLanguage(state.language);

    const ok = voiceIntentService.startListening({
      onStart: () => {
        setIsListening(true);
      },
      onInterim: (text) => {
        setInterimTranscript(text);
        const full = (transcript ? transcript + ' ' + text : text).trim();
        const parsed = voiceIntentService.parseTranscript(full, state);
        setParsedAction(parsed);
      },
      onFinal: (text) => {
        const full = (transcript ? transcript + ' ' + text : text).trim();
        setTranscript(full);
        setInterimTranscript('');
        const parsed = voiceIntentService.parseTranscript(full, state);
        setParsedAction(parsed);
      },
      onError: (err) => {
        setIsListening(false);
        setErrorMessage(
          isRu
            ? 'Не удалось распознать речь. Попробуйте еще раз или введите команду текстом.'
            : 'Could not recognize speech. Please try again or type your command.'
        );
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    if (!ok) {
      setIsListening(false);
      setErrorMessage(
        isRu
          ? 'Распознавание речи не поддерживается в этом браузере.'
          : 'Speech recognition not supported in this browser.'
      );
    }
  };

  const handleStopListening = () => {
    voiceIntentService.stopListening();
    setIsListening(false);
    const fullText = (transcript + ' ' + interimTranscript).trim();
    if (fullText) {
      setTranscript(fullText);
      setInterimTranscript('');
      const parsed = voiceIntentService.parseTranscript(fullText, state);
      setParsedAction(parsed);
    }
  };

  const handleExecute = async () => {
    if (!parsedAction) return;
    setIsExecuting(true);
    try {
      const res = await voiceIntentService.executeAction(parsedAction, state);
      setSuccessMessage(res.message);
      sound.playComplete();
      setTimeout(() => {
        onClose();
        if (parsedAction.type === 'create_task') onNavigate?.('tasks');
        else if (parsedAction.type === 'create_note') onNavigate?.('notes');
        else if (parsedAction.type === 'log_reading' || parsedAction.type === 'create_book') onNavigate?.('books');
        else if (parsedAction.type === 'create_habit' || parsedAction.type === 'check_habit') onNavigate?.('habits');
      }, 900);
    } catch (e: any) {
      setErrorMessage(e.message || 'Ошибка выполнения действия');
    } finally {
      setIsExecuting(false);
    }
  };

  const handlePresetClick = (phrase: string) => {
    setTranscript(phrase);
    setInterimTranscript('');
    const parsed = voiceIntentService.parseTranscript(phrase, state);
    setParsedAction(parsed);
    sound.playPop();
  };

  if (!isOpen) return null;

  const currentDisplayTranscript = transcript || interimTranscript;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#0c1424] border border-[#222a3d] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-2 sm:hidden" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1e293b] flex items-center justify-between bg-[#080f1d]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#00ffab]/20 to-[#00e5ff]/20 border border-[#00ffab]/40 flex items-center justify-center text-[#00ffab] flex-shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#dae2fd] font-display flex items-center gap-2">
                {isRu ? 'Голосовой «Flow-Ввод» Nova' : 'Nova Voice-to-Action'}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#86948a] font-sans">
                {isRu
                  ? 'Автоматический разбор задач, времени, книг и привычек'
                  : 'AI Intent Parser for tasks, reminders, books & habits'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#86948a] hover:text-[#dae2fd] hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          {/* Pulsing Mic Visualizer */}
          <div className="flex flex-col items-center justify-center py-4 relative">
            {isListening && (
              <div className="absolute w-28 h-28 rounded-full bg-[#00ffab]/10 animate-ping pointer-events-none" />
            )}
            {isListening && (
              <div className="absolute w-20 h-20 rounded-full bg-[#00e5ff]/20 animate-pulse pointer-events-none" />
            )}

            <button
              onClick={isListening ? handleStopListening : handleStartListening}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                isListening
                  ? 'bg-gradient-to-tr from-[#ff5252] to-[#ff7979] text-white shadow-red-500/30 scale-105'
                  : 'bg-gradient-to-tr from-[#00ffab] to-[#00e5ff] text-[#003824] hover:scale-105 shadow-[#00ffab]/20'
              }`}
            >
              {isListening ? (
                <Mic className="w-8 h-8 animate-bounce" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>

            <div className="mt-3 text-xs font-mono font-medium text-center">
              {isListening ? (
                <span className="text-[#00ffab] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00ffab] animate-ping" />
                  {isRu ? 'Слушаю вас... Говорите фразу' : 'Listening... Speak your command'}
                </span>
              ) : (
                <span className="text-[#86948a]">
                  {isRu ? 'Нажмите на микрофон для записи' : 'Tap microphone to start speaking'}
                </span>
              )}
            </div>
          </div>

          {/* Transcript Display & Manual Input */}
          <div className="p-3 rounded-2xl bg-[#131b2e] border border-[#222a3d] focus-within:border-[#00ffab] transition-colors">
            <textarea
              rows={2}
              value={currentDisplayTranscript}
              onChange={(e) => {
                const text = e.target.value;
                setTranscript(text);
                setInterimTranscript('');
                if (text.trim()) {
                  const parsed = voiceIntentService.parseTranscript(text, state);
                  setParsedAction(parsed);
                } else {
                  setParsedAction(null);
                }
              }}
              placeholder={
                isRu
                  ? 'Говорите в микрофон или введите команду текстом (например: «Напомни завтра в 16:00 доделать проект»)...'
                  : 'Speak into microphone or type command (e.g. "Remind tomorrow at 4pm to finish project")...'
              }
              className="w-full bg-transparent text-sm font-medium text-[#dae2fd] placeholder-[#64748b] focus:outline-none resize-none"
            />
          </div>

          {/* Parsed Intent Preview Card */}
          {parsedAction && (
            <div className="p-4 rounded-2xl bg-[#081020] border border-[#00ffab]/30 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#00ffab] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isRu ? 'РАСПОЗНАННОЕ ДЕЙСТВИЕ' : 'PARSED INTENT'}
                </span>
                <span className="text-[11px] font-mono bg-[#00ffab]/10 text-[#00ffab] px-2 py-0.5 rounded-full border border-[#00ffab]/20">
                  {parsedAction.type === 'create_task'
                    ? isRu ? 'Задача' : 'Task'
                    : parsedAction.type === 'create_note'
                    ? isRu ? 'Заметка' : 'Note'
                    : parsedAction.type === 'log_reading'
                    ? isRu ? 'Чтение' : 'Reading'
                    : isRu ? 'Привычка' : 'Habit'}
                </span>
              </div>

              {/* Task Details */}
              {parsedAction.type === 'create_task' && parsedAction.taskPayload && (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-[#dae2fd]">
                    {parsedAction.taskPayload.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#131b2e] border border-[#222a3d] text-[#dae2fd]">
                      <Calendar className="w-3.5 h-3.5 text-[#00ffab]" />
                      {parsedAction.taskPayload.dueDate}
                    </span>
                    {parsedAction.taskPayload.dueTime && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#131b2e] border border-[#222a3d] text-[#00e5ff] font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {parsedAction.taskPayload.dueTime}
                      </span>
                    )}
                    {parsedAction.taskPayload.priority === 'high' && (
                      <span className="px-2 py-0.5 rounded-md bg-[#ff5252]/10 text-[#ff7979] border border-[#ff5252]/30 font-semibold text-[11px]">
                        Срочно
                      </span>
                    )}
                    {parsedAction.taskPayload.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-[#1f293d] text-[#86948a] text-[11px]"
                      >
                        #{tag}
                      </span>
                    ))}
                    {parsedAction.taskPayload.reminderEnabled && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00ffab]/10 text-[#00ffab] text-[11px]">
                        <Bell className="w-3 h-3" />
                        {isRu ? 'Напоминание включено' : 'Reminder active'}
                      </span>
                    )}
                  </div>

                  {parsedAction.secondaryActions && parsedAction.secondaryActions.length > 0 && (
                    <div className="pt-2 border-t border-[#1e293b] space-y-1">
                      <div className="text-[11px] font-mono text-[#86948a]">
                        {isRu ? '+ Дополнительные задачи:' : '+ Linked sub-actions:'}
                      </div>
                      {parsedAction.secondaryActions.map((sec, idx) => (
                        <div key={idx} className="text-xs text-[#86948a] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                          {sec.summary}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Note Details */}
              {parsedAction.type === 'create_note' && parsedAction.notePayload && (
                <div className="space-y-1">
                  <div className="text-sm font-bold text-[#dae2fd]">
                    {parsedAction.notePayload.title}
                  </div>
                  <div className="text-xs text-[#86948a] line-clamp-2">
                    {parsedAction.notePayload.content}
                  </div>
                </div>
              )}

              {/* Reading Log Details */}
              {parsedAction.type === 'log_reading' && parsedAction.readingLogPayload && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#00e5ff]/10 text-[#00e5ff]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#dae2fd]">
                      +{parsedAction.readingLogPayload.pagesRead} {isRu ? 'страниц' : 'pages'}
                    </div>
                    <div className="text-xs text-[#86948a]">
                      {parsedAction.readingLogPayload.bookTitle
                        ? `Книга «${parsedAction.readingLogPayload.bookTitle}»`
                        : isRu ? 'Текущая читаемая книга' : 'Current active book'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Presets */}
          {!parsedAction && (
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-[#86948a] uppercase tracking-wider">
                {isRu ? 'БЫСТРЫЕ ПРИМЕРЫ ДЛЯ ТЕСТА:' : 'QUICK TEST EXAMPLES:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  'Напомни завтра в 16:00 доделать дизайн карточек',
                  'Почитал 25 страниц книги по философии',
                  'Запиши мысль: идея для архитектуры приложения',
                  'Отметь привычку утренняя зарядка',
                ].map((phrase, i) => (
                  <button
                    key={i}
                    onClick={() => handlePresetClick(phrase)}
                    className="px-3 py-1.5 rounded-xl bg-[#131b2e] hover:bg-[#171f33] border border-[#222a3d] hover:border-[#00ffab]/30 text-xs text-[#86948a] hover:text-[#dae2fd] text-left transition-all"
                  >
                    «{phrase}»
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[#ff5252]/10 border border-[#ff5252]/30 text-xs text-[#ffb4ab] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 rounded-xl bg-[#00ffab]/10 border border-[#00ffab]/30 text-xs text-[#00ffab] font-medium flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e293b] flex items-center justify-between bg-[#080f1d]/80">
          <button
            onClick={() => {
              setTranscript('');
              setInterimTranscript('');
              setParsedAction(null);
            }}
            className="px-3 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:text-[#dae2fd] hover:bg-[#131b2e] transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isRu ? 'Сброс' : 'Clear'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:text-[#dae2fd] transition-colors"
            >
              {isRu ? 'Отмена' : 'Cancel'}
            </button>
            <button
              onClick={handleExecute}
              disabled={!parsedAction || isExecuting}
              className={`px-5 py-2 rounded-xl font-semibold text-xs font-mono flex items-center gap-2 transition-all shadow-md ${
                parsedAction && !isExecuting
                  ? 'bg-[#00ffab] hover:bg-[#00e5ff] text-[#003824] shadow-[#00ffab]/20'
                  : 'bg-[#171f33] text-[#86948a] cursor-not-allowed border border-[#222a3d]'
              }`}
            >
              <Check className="w-4 h-4" />
              {isExecuting
                ? isRu ? 'Сохранение...' : 'Saving...'
                : isRu ? 'Создать мгновенно' : 'Execute & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
