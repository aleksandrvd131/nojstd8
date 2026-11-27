import React, { useEffect } from 'react';
import { useTuringStore, useKeyboardShortcuts } from './store/useTuringStore';
import { HeaderNavbar } from './components/navbar/HeaderNavbar';
import { TuringCanvas } from './components/canvas/TuringCanvas';
import { DiagnosticsPanel } from './components/inspector/DiagnosticsPanel';
import { BatchTestRunner } from './components/tape/BatchTestRunner';
import { InfiniteTapeDock } from './components/tape/InfiniteTapeDock';
import { DebuggerControls } from './components/tape/DebuggerControls';
import { SessionManagerDrawer } from './components/sidebar/SessionManagerDrawer';
import { AlphabetBuilder } from './components/sidebar/AlphabetBuilder';
import { ExportModal } from './components/navbar/ExportModal';
import { ConfirmModal } from './components/navbar/ConfirmModal';
import { DiagramSettingsModal } from './components/navbar/DiagramSettingsModal';

import {
  ShieldCheck,
  CheckSquare,
  X,
} from 'lucide-react';

export const App: React.FC = () => {
  // Global debugger keyboard shortcuts (Space / ->, Shift+Space / <-, R, Esc)
  useKeyboardShortcuts();

  const theme = useTuringStore((s) => s.theme);
  const activeTab = useTuringStore((s) => s.activeTab);
  const setActiveTab = useTuringStore((s) => s.setActiveTab);
  const isInspectorOpen = useTuringStore((s) => s.isInspectorOpen);
  const setInspectorOpen = useTuringStore((s) => s.setInspectorOpen);

  // Sync dark mode class on root HTML element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Guard against legacy persisted tabs.
  useEffect(() => {
    if (activeTab !== 'check' && activeTab !== 'tests') setActiveTab('check');
  }, [activeTab, setActiveTab]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* 1. Header Navigation Bar (Compact 48px) */}
      <HeaderNavbar />

      {/* Main Workspace (Full-width VTM Canvas + Check/Tests Dropdown) */}
      <div className="flex-1 flex min-h-0 relative">
        {/* 2. Visual Diagrammer Canvas */}
        <main className="flex-1 h-full min-w-0 relative">
          <TuringCanvas />

          {/* 3. Dropdown Check & Tests Panel */}
          {isInspectorOpen && (
            <div
              data-inspector-dropdown=""
              role="dialog"
              aria-label="Check и Тесты"
              className="absolute top-2 right-2.5 z-30 w-[420px] max-w-[calc(100%-1.25rem)] h-[480px] max-h-[calc(100%-1rem)] flex flex-col rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl overflow-hidden"
            >
              {/* Dropdown Tab Bar & Close Button */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 px-2 text-xs font-medium">
                <div className="flex items-center overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('check')}
                    className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap transition-colors ${
                      activeTab === 'check'
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Check</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('tests')}
                    className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap transition-colors ${
                      activeTab === 'tests'
                        ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Тесты</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  aria-label="Закрыть меню"
                  title="Закрыть (Esc)"
                  className="p-1.5 mr-0.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab content area */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === 'check' && <DiagnosticsPanel />}
                {activeTab === 'tests' && <BatchTestRunner />}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 4. Bottom Dock: Infinite Tape & Debugger Controls */}
      <footer className="flex-shrink-0 z-20">
        <InfiniteTapeDock />
        <DebuggerControls />
      </footer>

      {/* 5. Drawers and Modals */}
      <SessionManagerDrawer />
      <AlphabetBuilder />
      <ExportModal />
      <DiagramSettingsModal />
      <ConfirmModal />
    </div>
  );
};

export default App;
