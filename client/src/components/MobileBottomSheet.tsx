import React from 'react';
import { Drawer } from 'vaul';

export interface MobileBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  dismissible?: boolean;
  headerActions?: React.ReactNode;
}

/**
 * Native iOS / Android Feel Bottom Sheet built on top of Vaul
 * Supports drag-to-dismiss, touch gestures, momentum, safe-area-inset-bottom
 */
export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  dismissible = true,
  headerActions,
}) => {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 transition-opacity" />
        <Drawer.Content
          aria-describedby={description ? undefined : undefined}
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[24px] bg-[#121316] border-t border-[rgba(255,255,255,0.12)] outline-none max-h-[88dvh] shadow-2xl focus:outline-none"
        >
          {/* Visual Drag Handle Pill */}
          <div className="pt-3 pb-2 flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing select-none">
            <div className="w-10 h-1.5 rounded-full bg-[rgba(255,255,255,0.25)]" />
          </div>

          {/* Optional Header */}
          {(title || headerActions) && (
            <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 pr-2">
                {title && (
                  <Drawer.Title className="text-base font-semibold text-[#F9FAFB] truncate">
                    {title}
                  </Drawer.Title>
                )}
                {description && (
                  <Drawer.Description className="text-xs text-[#9CA3AF] mt-0.5 truncate">
                    {description}
                  </Drawer.Description>
                )}
              </div>
              {headerActions && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {headerActions}
                </div>
              )}
            </div>
          )}

          {/* Scrollable Body with bottom safe-area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
