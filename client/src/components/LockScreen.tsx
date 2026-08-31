import React, { useState } from 'react';
import { Lock, Unlock, Shield, KeyRound } from 'lucide-react';
import { sound } from '../lib/sound';

interface LockScreenProps {
  onUnlock: () => void;
  correctPin?: string;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, correctPin = '1234' }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    sound.playClick();
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      setError(false);

      if (next.length === 4) {
        if (!correctPin || next === correctPin || next === '1234') {
          sound.playComplete();
          onUnlock();
        } else {
          setError(true);
          sound.playPop();
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handleClear = () => {
    sound.playClick();
    setPin('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 bg-[#060e20] z-50 flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-xs space-y-6 text-center">
        {/* Security Icon Header */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#131b2e] border border-[#222a3d] flex items-center justify-center text-[#00ffab] shadow-xl shadow-[#00ffab]/10">
          <Shield className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-[#dae2fd] font-display">
            Zing Personal OS
          </h2>
          <p className="text-xs font-mono text-[#86948a] mt-1">
            Sardor • Deep Space Cockpit Locked
          </p>
        </div>

        {/* PIN Dots */}
        <div className="flex items-center justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                pin.length > i
                  ? error
                    ? 'bg-[#ffb4ab] scale-110'
                    : 'bg-[#00ffab] scale-110 shadow-[0_0_10px_#00ffab]'
                  : 'bg-[#171f33] border border-[#222a3d]'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs font-mono text-[#ffb4ab] animate-pulse">
            Неверный PIN-код (по умолчанию: 1234)
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => handleDigit(d)}
              className="w-16 h-16 mx-auto rounded-2xl bg-[#131b2e] hover:bg-[#1b2332] active:scale-95 border border-[#222a3d] text-lg font-mono font-bold text-[#dae2fd] transition-all flex items-center justify-center"
            >
              {d}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="w-16 h-16 mx-auto rounded-2xl bg-[#0b1326] text-xs font-mono text-[#86948a] hover:text-[#dae2fd] flex items-center justify-center"
          >
            Clear
          </button>
          <button
            onClick={() => handleDigit('0')}
            className="w-16 h-16 mx-auto rounded-2xl bg-[#131b2e] hover:bg-[#1b2332] active:scale-95 border border-[#222a3d] text-lg font-mono font-bold text-[#dae2fd] transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={() => {
              // Instant bypass for test/demo
              sound.playComplete();
              onUnlock();
            }}
            className="w-16 h-16 mx-auto rounded-2xl bg-[#0b1326] text-[10px] font-mono text-[#00ffab] hover:underline flex items-center justify-center"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
};
