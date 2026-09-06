import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  accentColor?: 'emerald' | 'cyan' | 'amber' | 'purple';
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  accentColor = 'emerald',
  compact = false,
  className = '',
}) => {
  const accentStyles = {
    emerald: {
      aura: 'bg-[#10B981]/15',
      iconBox: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25',
      button: 'bg-[#10B981] hover:bg-[#10B981]/90 text-[#0B0C0E] shadow-[#10B981]/20',
      ring: 'shadow-[0_0_24px_rgba(16,185,129,0.15)]',
    },
    cyan: {
      aura: 'bg-[#0EA5E9]/15',
      iconBox: 'bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/25',
      button: 'bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-[#0B0C0E] shadow-[#0EA5E9]/20',
      ring: 'shadow-[0_0_24px_rgba(14,165,233,0.15)]',
    },
    amber: {
      aura: 'bg-[#F59E0B]/15',
      iconBox: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25',
      button: 'bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-[#0B0C0E] shadow-[#F59E0B]/20',
      ring: 'shadow-[0_0_24px_rgba(245,158,11,0.15)]',
    },
    purple: {
      aura: 'bg-[#A78BFA]/15',
      iconBox: 'bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/25',
      button: 'bg-[#A78BFA] hover:bg-[#A78BFA]/90 text-[#0B0C0E] shadow-[#A78BFA]/20',
      ring: 'shadow-[0_0_24px_rgba(167,139,250,0.15)]',
    },
  }[accentColor];

  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center select-none ${
        compact ? 'py-8 px-4' : 'py-16 px-6'
      } ${className}`}
    >
      {/* Icon with Backlight Glow Halo */}
      <div className="relative mb-4 flex items-center justify-center">
        {/* Soft diffused glow */}
        <div
          className={`absolute w-16 h-16 rounded-full blur-xl pointer-events-none transition-all duration-300 ${accentStyles.aura}`}
        />

        {/* Crisp icon container */}
        <div
          className={`relative w-12 h-12 rounded-xl border flex items-center justify-center transition-transform duration-300 hover:scale-105 ${accentStyles.iconBox} ${accentStyles.ring}`}
        >
          <Icon className="w-6 h-6 stroke-[1.5]" />
        </div>
      </div>

      {/* Short concise title */}
      <h3 className="text-sm md:text-base font-semibold text-[#F9FAFB] tracking-tight">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-xs text-[#9CA3AF] max-w-sm mt-1.5 leading-relaxed">
          {description}
        </p>
      )}

      {/* Action Buttons */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer ${accentStyles.button}`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2]" />
              <span>{actionLabel}</span>
            </button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-[#9CA3AF] hover:text-[#F9FAFB] bg-[#16171A] hover:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
