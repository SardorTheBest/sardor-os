import React from 'react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-4 z-50 flex items-center gap-2.5 bg-[#1a0f12] border border-[#ff5370]/40 px-3.5 py-2 rounded-xl text-xs font-mono text-[#ffb4ab] shadow-2xl backdrop-blur-md animate-fade-in">
      <WifiOff className="w-4 h-4 text-[#ff5370] animate-pulse" />
      <span>Автономный режим — используются локальные данные</span>
    </div>
  );
};
