import React, { useEffect, useRef } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Gauge,
  Activity,
  Layers,
  Clock,
  HardDrive,
} from 'lucide-react';

export const DebuggerControls: React.FC = () => {
  const runtime = useTuringStore((s) => s.runtime);
  const isRunning = useTuringStore((s) => s.isRunning);
  const executionSpeedMs = useTuringStore((s) => s.executionSpeedMs);

  const resetExecution = useTuringStore((s) => s.resetExecution);
  const stepForward = useTuringStore((s) => s.stepForward);
  const stepBack = useTuringStore((s) => s.stepBack);
  const startRunning = useTuringStore((s) => s.startRunning);
  const pauseRunning = useTuringStore((s) => s.pauseRunning);
  const setExecutionSpeedMs = useTuringStore((s) => s.setExecutionSpeedMs);

  const timerRef = useRef<number | null>(null);

  // Auto-runner interval effect
  useEffect(() => {
    if (isRunning) {
      if (runtime.status === 'halted' || runtime.status === 'error') {
        pauseRunning();
        return;
      }

      timerRef.current = window.setInterval(() => {
        stepForward();
      }, executionSpeedMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, executionSpeedMs, runtime.status, stepForward, pauseRunning]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-slate-100/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 text-xs">
      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={resetExecution}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
          title="Сбросить в начальное состояние"
        >
          <RotateCcw className="w-4 h-4 text-amber-500" />
        </button>

        <button
          type="button"
          onClick={stepBack}
          disabled={runtime.history.length === 0}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Шаг назад (Step Back)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {isRunning ? (
          <button
            type="button"
            onClick={pauseRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md transition-all scale-100 hover:scale-105"
            title="Пауза"
          >
            <Pause className="w-4 h-4 fill-current" />
            <span>Пауза</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startRunning}
            disabled={runtime.status === 'halted' || runtime.status === 'error'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all scale-100 hover:scale-105"
            title="Непрерывный запуск"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Запуск</span>
          </button>
        )}

        <button
          type="button"
          onClick={stepForward}
          disabled={runtime.status === 'halted' || runtime.status === 'error'}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          title="Один такт вперед (Step)"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed Slider */}
        <div className="flex items-center gap-2 ml-3 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <Gauge className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="range"
            min={30}
            max={800}
            step={20}
            value={830 - executionSpeedMs}
            onChange={(e) => setExecutionSpeedMs(830 - Number(e.target.value))}
            className="w-20 accent-sky-500 h-1.5 cursor-pointer"
            title={`Скорость: шаг каждые ${executionSpeedMs} мс`}
          />
          <span className="font-mono text-[10px] text-slate-500 w-12 text-right">
            {executionSpeedMs}мс
          </span>
        </div>
      </div>

      {/* Status Message */}
      <div className="flex-1 max-w-md truncate px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <Activity
          className={`w-4 h-4 flex-shrink-0 ${
            runtime.status === 'running'
              ? 'text-sky-500 animate-spin'
              : runtime.status === 'halted'
              ? 'text-emerald-500'
              : runtime.status === 'error'
              ? 'text-rose-500'
              : 'text-slate-400'
          }`}
        />
        <span className="truncate font-mono text-[11px]">
          {runtime.statusMessage || 'Ожидание действий'}
        </span>
      </div>

      {/* Complexity Metrics */}
      <div className="flex items-center gap-3">
        {/* Call Stack badge if nested machine */}
        {runtime.callStack.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold text-[11px]">
            <Layers className="w-3.5 h-3.5" />
            <span>Стек: {runtime.callStack.length}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-sky-500" />
          <span>Такты: <strong className="text-slate-900 dark:text-slate-100">{runtime.stepCount}</strong></span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">
          <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
          <span>Ячейки: <strong className="text-slate-900 dark:text-slate-100">{runtime.visitedPositions.length}</strong></span>
        </div>
      </div>
    </div>
  );
};
