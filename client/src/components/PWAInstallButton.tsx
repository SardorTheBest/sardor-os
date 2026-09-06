import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 bg-[#00ffab]/10 border border-[#00ffab]/30 text-[#00ffab] hover:bg-[#00ffab]/20 px-3 py-1.5 rounded-xl text-xs font-mono transition-all active:scale-95 ${className}`}
        title="Установить Zing OS на устройство"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Установить приложение</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 bg-white/5 border border-white/10 text-[#dae2fd] hover:bg-white/10 px-3 py-1.5 rounded-xl text-xs font-mono transition-all active:scale-95 ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-[#89ceff]" />
          <span>Установить на iOS</span>
        </button>

        {showIOSGuide && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div 
              className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-[#16171A] border border-[rgba(255,255,255,0.1)] p-5 shadow-2xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-[#dae2fd] font-display flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#89ceff]" />
                  Установка на iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-[#86948a] hover:text-[#dae2fd] p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-[#bbcabf] font-mono bg-[#0b1326] p-3.5 rounded-xl border border-[#222a3d]">
                <p>1. Нажмите кнопку <strong>«Поделиться»</strong> в нижней панели браузера Safari.</p>
                <p>2. Прокрутите меню и выберите <strong>«На экран "Домой"»</strong>.</p>
                <p>3. Нажмите <strong>«Добавить»</strong> в правом верхнем углу.</p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#00ffab] text-[#002114] font-bold text-xs font-mono hover:opacity-90 transition-opacity"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
