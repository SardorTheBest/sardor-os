import React from 'react';

interface AppLayoutProps {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  mobileHeader?: React.ReactNode;
  children: React.ReactNode;
  bottomNav?: React.ReactNode;
  modals?: React.ReactNode;
  focusMode?: boolean;
}

/**
 * Adaptive Responsive Base Layout Component (Desktop / Tablet / Mobile)
 * - Desktop: Left sidebar rail, spacious header, multi-column workspace
 * - Tablet: Collapsible rail, 2-column bento grids
 * - Mobile (<768px): Dedicated MobileHeader (56-64px with safe-area),
 *   dedicated scrollable container (pb-28 for bottom nav clearance),
 *   zero horizontal overflow, fixed 5-tab Bottom Navigation Bar.
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  sidebar,
  header,
  mobileHeader,
  children,
  bottomNav,
  modals,
  focusMode = false,
}) => {
  return (
    <div
      id="app-root-shell"
      className={`w-screen h-screen h-[100dvh] overflow-x-hidden overflow-y-hidden flex flex-col md:flex-row bg-[#0B0C0E] text-[#F9FAFB] font-sans antialiased select-none ${
        focusMode ? 'focus-mode' : ''
      }`}
    >
      {/* Desktop & Tablet Left Sidebar Rail */}
      <div id="layout-sidebar" className="hidden md:flex h-full flex-shrink-0 z-30 overflow-hidden">
        {sidebar}
      </div>

      {/* Primary Workspace Viewport (Locked to exact screen height) */}
      <div id="layout-viewport" className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Desktop Header (hidden on mobile) */}
        <header
          id="layout-header-desktop"
          className="hidden md:flex h-14 md:h-16 flex-shrink-0 border-b border-[rgba(255,255,255,0.08)] bg-[#0B0C0E]/90 backdrop-blur-xl px-4 md:px-8 items-center justify-between z-20"
        >
          {header}
        </header>

        {/* Dedicated Native Mobile Header (< 768px) */}
        {mobileHeader ? (
          <div id="layout-header-mobile" className="md:hidden flex-shrink-0 z-20">
            {mobileHeader}
          </div>
        ) : (
          <header
            id="layout-header-fallback"
            className="md:hidden h-14 flex-shrink-0 border-b border-[rgba(255,255,255,0.08)] bg-[#0B0C0E]/90 backdrop-blur-xl px-3 flex items-center justify-between z-20 pt-[env(safe-area-inset-top)]"
          >
            {header}
          </header>
        )}

        {/* Dedicated Internal Scroll Area with safe clearance for bottom tab bar */}
        <main
          id="layout-main-scroll"
          className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col scroll-smooth overscroll-contain"
        >
          <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 pb-28 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop) */}
      {bottomNav && (
        <div id="layout-mobile-nav" className="md:hidden flex-shrink-0 z-40">
          {bottomNav}
        </div>
      )}

      {/* Global Modals, Drawers & Overlays */}
      {modals}
    </div>
  );
};

export default AppLayout;
