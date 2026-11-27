import React, { useEffect } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import { CanvasBackgroundVariant } from '../../store/types';
import {
  X,
  Sun,
  Moon,
  SlidersHorizontal,
  RotateCcw,
  Grid,
  CircleDot,
  EyeOff,
} from 'lucide-react';

interface SettingSwitchRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

const SettingSwitchRow: React.FC<SettingSwitchRowProps> = ({
  label,
  description,
  checked,
  onChange,
}) => (
  <div className="flex items-center justify-between gap-3 py-2.5">
    <div className="min-w-0">
      <div className="font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{description}</div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex-shrink-0 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      <span
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
          checked ? 'bg-sky-500' : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  </div>
);

const BACKGROUND_OPTIONS: {
  value: CanvasBackgroundVariant;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'dots', label: 'Точки', icon: <CircleDot className="w-3.5 h-3.5" /> },
  { value: 'lines', label: 'Сетка', icon: <Grid className="w-3.5 h-3.5" /> },
  { value: 'none', label: 'Без фона', icon: <EyeOff className="w-3.5 h-3.5" /> },
];

/**
 * Modal popup containing all cosmetic appearance settings of the diagrammer.
 */
export const DiagramSettingsModal: React.FC = () => {
  const isSettingsModalOpen = useTuringStore((s) => s.isSettingsModalOpen);
  const setSettingsModalOpen = useTuringStore((s) => s.setSettingsModalOpen);
  const theme = useTuringStore((s) => s.theme);
  const setTheme = useTuringStore((s) => s.setTheme);
  const hideEdgeRules = useTuringStore((s) => s.hideEdgeRules);
  const setHideEdgeRules = useTuringStore((s) => s.setHideEdgeRules);
  const showMiniMap = useTuringStore((s) => s.showMiniMap);
  const setShowMiniMap = useTuringStore((s) => s.setShowMiniMap);
  const showCanvasControls = useTuringStore((s) => s.showCanvasControls);
  const setShowCanvasControls = useTuringStore((s) => s.setShowCanvasControls);
  const canvasBackground = useTuringStore((s) => s.canvasBackground);
  const setCanvasBackground = useTuringStore((s) => s.setCanvasBackground);
  const resetCosmeticSettings = useTuringStore((s) => s.resetCosmeticSettings);

  useEffect(() => {
    if (!isSettingsModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setSettingsModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSettingsModalOpen, setSettingsModalOpen]);

  if (!isSettingsModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setSettingsModalOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Настройки оформления диаграммера"
        className="w-full max-w-md rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Настройки оформления
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Косметические параметры отображения диаграммера
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettingsModalOpen(false)}
            aria-label="Закрыть настройки оформления"
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Theme selector */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Тема оформления
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md border font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300'
                    : 'bg-zinc-50 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Светлая</span>
              </button>
              <button
                type="button"
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md border font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300'
                    : 'bg-zinc-50 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span>Тёмная</span>
              </button>
            </div>
          </div>

          {/* Canvas background selector */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Фон холста
            </div>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={canvasBackground === opt.value}
                  onClick={() => setCanvasBackground(opt.value)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md border font-medium transition-colors ${
                    canvasBackground === opt.value
                      ? 'bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300'
                      : 'bg-zinc-50 dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800 pt-1">
            <SettingSwitchRow
              label="Скрывать правила переходов"
              description="Показывать условия на рёбрах только при выборе перехода"
              checked={hideEdgeRules}
              onChange={setHideEdgeRules}
            />
            <SettingSwitchRow
              label="Показывать миникарту"
              description="Панель навигации в правом нижнем углу холста"
              checked={showMiniMap}
              onChange={setShowMiniMap}
            />
            <SettingSwitchRow
              label="Показывать панель масштаба"
              description="Кнопки масштабирования и центрирования на холсте"
              checked={showCanvasControls}
              onChange={setShowCanvasControls}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={resetCosmeticSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Сбросить</span>
          </button>
          <button
            type="button"
            onClick={() => setSettingsModalOpen(false)}
            className="px-4 py-1.5 rounded font-semibold bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
