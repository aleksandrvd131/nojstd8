import React, { useEffect } from 'react';
import { useTuringStore, useKeyboardShortcuts } from './store/useTuringStore';
import { HeaderNavbar } from './components/navbar/HeaderNavbar';
import { TuringCanvas } from './components/canvas/TuringCanvas';
import { TupleTableEditor } from './components/inspector/TupleTableEditor';
import { MatrixEditor } from './components/inspector/MatrixEditor';
import { DiagnosticsPanel } from './components/inspector/DiagnosticsPanel';
import { BatchTestRunner } from './components/tape/BatchTestRunner';
import { InfiniteTapeDock } from './components/tape/InfiniteTapeDock';
import { DebuggerControls } from './components/tape/DebuggerControls';
import { SessionManagerDrawer } from './components/sidebar/SessionManagerDrawer';
import { AlphabetBuilder } from './components/sidebar/AlphabetBuilder';
import { ExportModal } from './components/navbar/ExportModal';

import {
  Table2,
  Grid3X3,
  ShieldCheck,
  CheckSquare,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

export const App: React.FC = () => {
  // Global debugger keyboard shortcuts (Space / ->, Shift+Space / <-, R, Esc)
  useKeyboardShortcuts();

  const theme = useTuringStore((s) => s.theme);
  const activeTab = useTuringStore((s) => s.activeTab);
  const setActiveTab = useTuringStore((s) => s.setActiveTab);

  const [isInspectorOpen, setIsInspectorOpen] = React.useState(true);

  // Sync dark mode class on root HTML element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* 1. Header Navigation Bar (Compact 48px) */}
      <HeaderNavbar />

      {/* Main Workspace (Canvas + Inspector) */}
      <div className="flex-1 flex min-h-0 relative">
        {/* 2. Visual Diagrammer Canvas */}
        <main className="flex-1 h-full min-w-0 relative">
          <TuringCanvas />

          {/* Toggle button to collapse/expand inspector panel */}
          <button
            type="button"
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-md bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-sm transition-colors"
            title={isInspectorOpen ? 'Скрыть боковую панель' : 'Показать боковую панель'}
          >
            {isInspectorOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>
        </main>

        {/* 3. Right Inspector & Diagnostics Panel */}
        {isInspectorOpen && (
          <aside className="w-96 lg:w-[420px] h-full flex flex-col bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-sm z-10 animate-in slide-in-from-right-2 duration-150">
            {/* Inspector Tab Bar */}
            <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('tuples')}
                className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'tuples'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Таблица</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('matrix')}
                className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'matrix'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Матрица</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('check')}
                className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
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
                className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'tests'
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Тесты</span>
              </button>
            </div>

            {/* Tab content area */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {activeTab === 'tuples' && <TupleTableEditor />}
              {activeTab === 'matrix' && <MatrixEditor />}
              {activeTab === 'check' && <DiagnosticsPanel />}
              {activeTab === 'tests' && <BatchTestRunner />}
            </div>
          </aside>
        )}
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
    </div>
  );
};

export default App;
