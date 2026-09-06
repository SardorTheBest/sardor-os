import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Server,
  Cloud,
  Check,
  AlertCircle,
  Key,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Zap,
  HardDrive,
  Info,
  Volume2,
  Bot,
  User,
  Image,
  Video,
  Music,
} from 'lucide-react';
import { AIProvider, AISettings } from '../types';
import { storage } from '../lib/storage';
import { aiEngine, AI_MODELS } from '../lib/aiEngine';
import { sound } from '../lib/sound';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
}) => {
  const [settings, setSettings] = useState<AISettings>(storage.getAISettings());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; models?: string[] } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const isWebGPUSupported = aiEngine.isWebGPUSupported();

  useEffect(() => {
    if (isOpen) {
      setSettings(storage.getAISettings());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProviderSelect = (provider: AIProvider) => {
    sound.playClick();
    const updated = { ...settings, provider };
    setSettings(updated);
    storage.updateAISettings({ provider });
    setTestResult(null);
    onSettingsUpdated?.();
  };

  const handleSave = () => {
    sound.playComplete();
    storage.updateAISettings(settings);
    onSettingsUpdated?.();
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    sound.playClick();
    
    const res = await aiEngine.testProvider(settings.provider, settings);
    setTestResult(res);
    setIsTesting(false);
    
    if (res.success) {
      sound.playComplete();
    } else {
      sound.playPop();
    }
  };

  const handleTestVoice = () => {
    setIsTestingVoice(true);
    sound.playClick();
    aiEngine.speakText(
      'Приветствую, Сардор! Голосовой модуль Новы функционирует штатно. Все системы готовы к выполнению задач.',
      settings.selectedVoice || 'Zephyr',
      () => setIsTestingVoice(true),
      () => setIsTestingVoice(false)
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="w-full max-w-2xl bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-modal-float">
        {/* Header */}
        <div className="p-5 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[#111214]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00ffab]/20 to-[#00e5ff]/20 border border-[#00ffab]/40 flex items-center justify-center text-[#00ffab]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#dae2fd] font-display">
                  Нова (Nova) • Центр конфигурации ИИ
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00ffab]/10 text-[#00ffab] border border-[#00ffab]/30">
                  NOVA CORE
                </span>
              </div>
              <p className="text-xs text-[#86948a] font-sans">
                Управление моделями Google AI Studio, офлайн Gemma 2, Ollama и Groq
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#86948a] hover:text-[#dae2fd] p-1.5 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Provider Selection Tabs */}
          <div className="space-y-2.5">
            <label className="text-xs font-mono text-[#86948a] uppercase tracking-wider block">
              Выберите основной ИИ-движок:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Provider 1: Gemini */}
              <button
                type="button"
                onClick={() => handleProviderSelect('gemini')}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  settings.provider === 'gemini'
                    ? 'bg-[#00ffab]/10 border-[#00ffab] text-[#dae2fd] shadow-lg shadow-[#00ffab]/10'
                    : 'bg-[#0b1326] border-[#1e293b] text-[#86948a] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Sparkles className={`w-4 h-4 ${settings.provider === 'gemini' ? 'text-[#00ffab]' : 'text-[#86948a]'}`} />
                  <span className="text-[9px] font-mono px-1 rounded bg-[#00ffab]/20 text-[#00ffab]">
                    PRO & MEDIA
                  </span>
                </div>
                <div className="text-xs font-bold text-[#dae2fd]">Gemini 3.x</div>
                <div className="text-[10px] text-[#86948a]">Google AI Studio</div>
              </button>

              {/* Provider 2: WebLLM */}
              <button
                type="button"
                onClick={() => handleProviderSelect('webllm')}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  settings.provider === 'webllm'
                    ? 'bg-[#00e5ff]/10 border-[#00e5ff] text-[#dae2fd] shadow-lg shadow-[#00e5ff]/10'
                    : 'bg-[#0b1326] border-[#1e293b] text-[#86948a] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Cpu className={`w-4 h-4 ${settings.provider === 'webllm' ? 'text-[#00e5ff]' : 'text-[#86948a]'}`} />
                  <span className="text-[9px] font-mono px-1 rounded bg-[#00e5ff]/20 text-[#00e5ff]">
                    ОФЛАЙН
                  </span>
                </div>
                <div className="text-xs font-bold text-[#dae2fd]">Gemma 2</div>
                <div className="text-[10px] text-[#86948a]">WebGPU Браузер</div>
              </button>

              {/* Provider 3: Ollama */}
              <button
                type="button"
                onClick={() => handleProviderSelect('ollama')}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  settings.provider === 'ollama'
                    ? 'bg-[#a78bfa]/10 border-[#a78bfa] text-[#dae2fd] shadow-lg shadow-[#a78bfa]/10'
                    : 'bg-[#0b1326] border-[#1e293b] text-[#86948a] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Server className={`w-4 h-4 ${settings.provider === 'ollama' ? 'text-[#a78bfa]' : 'text-[#86948a]'}`} />
                  <span className="text-[9px] font-mono px-1 rounded bg-[#a78bfa]/20 text-[#a78bfa]">
                    LOCAL
                  </span>
                </div>
                <div className="text-xs font-bold text-[#dae2fd]">Ollama</div>
                <div className="text-[10px] text-[#86948a]">ПК (11434)</div>
              </button>

              {/* Provider 4: Groq */}
              <button
                type="button"
                onClick={() => handleProviderSelect('groq')}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  settings.provider === 'groq'
                    ? 'bg-[#e5a93c]/10 border-[#e5a93c] text-[#dae2fd] shadow-lg shadow-[#e5a93c]/10'
                    : 'bg-[#0b1326] border-[#1e293b] text-[#86948a] hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Cloud className={`w-4 h-4 ${settings.provider === 'groq' ? 'text-[#e5a93c]' : 'text-[#86948a]'}`} />
                  <span className="text-[9px] font-mono px-1 rounded bg-[#e5a93c]/20 text-[#e5a93c]">
                    CLOUD
                  </span>
                </div>
                <div className="text-xs font-bold text-[#dae2fd]">Groq Cloud</div>
                <div className="text-[10px] text-[#86948a]">GPT OSS 120B</div>
              </button>
            </div>
          </div>

          {/* Configuration Sections depending on active Provider */}
          {settings.provider === 'gemini' && (
            <div className="p-4 rounded-xl bg-[#0b1326] border border-[#1e293b] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00ffab]">
                  <Sparkles className="w-4 h-4" />
                  Модели Google AI Studio (Server-Side)
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ffab]/10 text-[#00ffab] border border-[#00ffab]/20">
                  Ключ защищен на сервере
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1.5">
                  ОСНОВНАЯ ЯЗЫКОВАЯ МОДЕЛЬ ДЛЯ ЧАТА:
                </label>
                <select
                  value={settings.geminiModel || 'gemini-3.7-flash'}
                  onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                  className="w-full bg-[#131b2e] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                >
                  {AI_MODELS.gemini.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supported Media Capabilities Showcase */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 rounded-lg bg-[#131b2e] border border-[#1e293b] space-y-1">
                  <div className="text-[11px] font-bold text-[#00ffab] flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5" /> Imagen & Flash
                  </div>
                  <p className="text-[10px] text-[#86948a]">
                    Генерация картинок 1K/2K/4K и редактирование по маске.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#131b2e] border border-[#1e293b] space-y-1">
                  <div className="text-[11px] font-bold text-[#00e5ff] flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" /> Google Veo 3.1
                  </div>
                  <p className="text-[10px] text-[#86948a]">
                    Кинематографичные HD видеоролики по тексту или картинке.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#131b2e] border border-[#1e293b] space-y-1">
                  <div className="text-[11px] font-bold text-[#e5a93c] flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" /> Nova Voice Engine
                  </div>
                  <p className="text-[10px] text-[#86948a]">
                    Живой синтез голоса Новы и распознавание речи.
                  </p>
                </div>
              </div>
            </div>
          )}

          {settings.provider === 'webllm' && (
            <div className="p-4 rounded-xl bg-[#0b1326] border border-[#1e293b] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00e5ff]">
                  <HardDrive className="w-4 h-4" />
                  Параметры WebLLM (In-Browser GPU Inference)
                </div>
                <div className="text-[11px] font-mono flex items-center gap-1.5">
                  {isWebGPUSupported ? (
                    <span className="text-[#00ffab] flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> WebGPU Поддерживается
                    </span>
                  ) : (
                    <span className="text-[#ffb4ab] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> WebGPU не найден
                    </span>
                  )}
                </div>
              </div>

              {!isWebGPUSupported && (
                <div className="p-3 rounded-lg bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-xs text-[#ffb4ab] leading-relaxed">
                  Ваш текущий браузер или устройство не поддерживает WebGPU. Для работы офлайн рекомендуется использовать Google Chrome 113+, Microsoft Edge или Safari 18, либо переключиться на <strong>Gemini 3.7</strong> или <strong>Groq API</strong>.
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1.5">
                  ВЫБЕРИТЕ ОФЛАЙН МОДЕЛЬ GOOGLE GEMMA / META LLAMA:
                </label>
                <select
                  value={settings.webllmModel || 'gemma-2-2b-it-q4f16_1-MLC'}
                  onChange={(e) => setSettings({ ...settings, webllmModel: e.target.value })}
                  className="w-full bg-[#131b2e] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00e5ff]"
                >
                  {AI_MODELS.webllm.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.size}) — {m.badge}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#86948a] mt-1.5">
                  При первом запуске веса модели Google Gemma загружаются и кэшируются в IndexedDB. После этого ИИ работает 100% автономно без интернета.
                </p>
              </div>
            </div>
          )}

          {settings.provider === 'ollama' && (
            <div className="p-4 rounded-xl bg-[#0b1326] border border-[#1e293b] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#a78bfa]">
                  <Server className="w-4 h-4" />
                  Параметры Local Ollama Server
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20">
                  Порт: 11434
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono text-[#86948a]">
                    OLLAMA URL СЕРВЕРА:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, ollamaUrl: '/api/ollama' })}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#131b2e] hover:bg-[#222a3d] text-[#00ffab] border border-[#00ffab]/30"
                    >
                      CORS Proxy (/api/ollama)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, ollamaUrl: 'http://localhost:11434' })}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#131b2e] hover:bg-[#222a3d] text-[#dae2fd] border border-[#1e293b]"
                    >
                      localhost:11434
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={settings.ollamaUrl}
                  onChange={(e) => setSettings({ ...settings, ollamaUrl: e.target.value })}
                  placeholder="http://localhost:11434 или /api/ollama"
                  className="w-full bg-[#131b2e] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#a78bfa] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1.5">
                  МОДЕЛЬ OLLAMA:
                </label>
                <input
                  type="text"
                  value={settings.ollamaModel}
                  onChange={(e) => setSettings({ ...settings, ollamaModel: e.target.value })}
                  placeholder="gemma2:2b, llama3.2, phi3, mistral, qwen2.5"
                  className="w-full bg-[#131b2e] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#a78bfa] font-mono"
                />
              </div>
            </div>
          )}

          {settings.provider === 'groq' && (
            <div className="p-4 rounded-xl bg-[#0b1326] border border-[#1e293b] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#e5a93c]">
                  <Cloud className="w-4 h-4" />
                  Параметры Groq Cloud API (Free Tier)
                </div>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-mono text-[#00e5ff] hover:underline flex items-center gap-1"
                >
                  Получить бесплатный ключ <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1.5">
                  GROQ API KEY:
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={settings.groqApiKey}
                    onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
                    placeholder="gsk_..."
                    className="w-full bg-[#131b2e] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c] font-mono pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#86948a] hover:text-[#dae2fd] px-2 py-1 bg-[#1e293b] rounded"
                  >
                    {showKey ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#86948a] mb-1.5">
                  ОБЛАЧНАЯ МОДЕЛЬ GROQ:
                </label>
                <select
                  value={settings.groqModel || 'openai/gpt-oss-120b'}
                  onChange={(e) => setSettings({ ...settings, groqModel: e.target.value })}
                  className="w-full bg-[#131b2e] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#e5a93c]"
                >
                  {AI_MODELS.groq.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.speed})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Voice & Persona Preferences */}
          <div className="p-4 rounded-xl bg-[#0b1326] border border-[#1e293b] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#dae2fd]">
                <Volume2 className="w-4 h-4 text-[#00ffab]" />
                Настройки голоса Новы (Nova Voice)
              </div>
              <button
                type="button"
                onClick={handleTestVoice}
                disabled={isTestingVoice}
                className="px-2.5 py-1 rounded-lg bg-[#131b2e] hover:bg-[#1e293b] border border-[#1e293b] text-[11px] font-mono text-[#00ffab] flex items-center gap-1.5 disabled:opacity-50"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {isTestingVoice ? 'Воспроизведение...' : 'Прослушать голос'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-[#86948a] mb-1">
                  ГОЛОСОВОЙ ПРОФИЛЬ СИНТЕЗА:
                </label>
                <select
                  value={settings.selectedVoice || 'Zephyr'}
                  onChange={(e) => setSettings({ ...settings, selectedVoice: e.target.value })}
                  className="w-full bg-[#131b2e] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-[#dae2fd] focus:outline-none focus:border-[#00ffab]"
                >
                  <option value="Zephyr">Zephyr (Технологичный, четкий, мужской)</option>
                  <option value="Fenrir">Fenrir (Глубокий, авторитетный)</option>
                  <option value="Puck">Puck (Энергичный, дружелюбный)</option>
                  <option value="Charon">Charon (Спокойный, медитативный)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#131b2e] border border-[#1e293b] mt-auto">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#dae2fd]">Авто-озвучка ответов</div>
                  <div className="text-[10px] text-[#86948a]">Нова сразу проговаривает текст</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.voiceAutoSpeak || false}
                  onChange={(e) => setSettings({ ...settings, voiceAutoSpeak: e.target.checked })}
                  className="w-4 h-4 accent-[#00ffab] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-[#00ffab]/10 border-[#00ffab]/40 text-[#00ffab]'
                  : 'bg-[#ffb4ab]/10 border-[#ffb4ab]/40 text-[#ffb4ab]'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">{testResult.message}</div>
                {testResult.models && testResult.models.length > 0 && (
                  <div className="text-[11px] opacity-80">
                    Доступные модели: {testResult.models.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#1e293b] bg-[#0b1326]/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl text-xs font-mono text-[#dae2fd] bg-[#131b2e] hover:bg-[#1e293b] border border-[#1e293b] flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Проверка...' : 'Тест соединения'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-[#86948a] hover:bg-[#1e293b] transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[#00ffab] hover:bg-[#00ffab]/90 text-[#003824] font-semibold text-xs font-mono rounded-xl shadow-md shadow-[#00ffab]/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Применить настройки
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
