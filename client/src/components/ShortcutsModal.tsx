import React from 'react';
import { Keyboard, X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Навигация и Виды',
      shortcuts: [
        { keys: ['D'], label: 'Перейти в Dashboard' },
        { keys: ['T'], label: 'Перейти в Tasks' },
        { keys: ['C'], label: 'Перейти в Calendar' },
        { keys: ['H'], label: 'Перейти в Habits' },
        { keys: ['B'], label: 'Перейти в Reading Vault' },
        { keys: ['N'], label: 'Перейти в Knowledge Base' },
        { keys: ['P'], label: 'Перейти в Projects' },
        { keys: ['A'], label: 'Перейти в AI Analyst' },
      ],
    },
    {
      title: 'Быстрые Действия',
      shortcuts: [
        { keys: ['⌘', 'K'], label: 'Открыть Командную Палитру (Omnibar)' },
        { keys: ['A'], label: 'Перейти в AI Analyst Orbit' },
        { keys: ['F'], label: 'Включить / выключить Focus Orbit' },
        { keys: ['L'], label: 'Заблокировать Cockpit (Lock Screen)' },
        { keys: ['?'], label: 'Показать горячие клавиши' },
        { keys: ['Esc'], label: 'Закрыть модальное окно' },
      ],
    },
    {
      title: 'Календарь и Задачи',
      shortcuts: [
        { keys: ['Drag'], label: 'Перетащить задачу на день или час в Календаре' },
        { keys: ['Click'], label: 'Быстрое добавление задачи на выбранную дату' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-modal-backdrop">
      <div className="w-full max-w-lg bg-[#16171A] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 shadow-2xl space-y-6 animate-modal-float">
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00ffab]/10 text-[#00ffab] flex items-center justify-center border border-[#00ffab]/20">
              <Keyboard className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#dae2fd] font-display">
              Горячие клавиши (Keyboard Shortcuts)
            </h3>
          </div>
          <button onClick={onClose} className="text-[#86948a] hover:text-[#dae2fd]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
          {shortcutGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <div className="text-[11px] font-mono uppercase text-[#00ffab] tracking-wider font-semibold">
                {group.title}
              </div>
              <div className="space-y-1.5">
                {group.shortcuts.map((s, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#0b1326] border border-[#222a3d] text-xs"
                  >
                    <span className="text-[#bbcabf] font-sans">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-0.5 rounded-md bg-[#171f33] border border-[#222a3d] text-[11px] font-mono font-bold text-[#00e5ff]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-[#222a3d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#171f33] hover:bg-[#222a3d] text-xs font-mono text-[#dae2fd] rounded-xl"
          >
            Закрыть (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
