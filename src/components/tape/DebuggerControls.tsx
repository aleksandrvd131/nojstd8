import React, { useEffect, useRef } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Gauge,
  Layers,
  Clock,
  HardDrive,
} from 'lucide-react';

export const DebuggerControls: React.FC = () => {
  const runtime = useTuringStore((s) => s.runtime);
  const tapeError = useTuringStore((s) => s.tapeError);
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

  const isHaltedOrError = runtime.status === 'halted' || runtime.status === 'error';
  const displayStatus = tapeError ? 'error' : runtime.status;
  const displayMessage = tapeError || runtime.statusMessage || 'Готов к исполнению';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-xs">
      {/* Playback Controls & Shortcuts */}
      <div className="flex items-center gap-1.5">
        {/* Reset Button */}
        <button
          type="button"
          onClick={resetExecution}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
          title="Сброс в начальное состояние [Esc]"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
          <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            Esc
          </span>
        </button>

        {/* Step Back Button */}
        <button
          type="button"
          onClick={stepBack}
          disabled={runtime.history.length === 0}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Шаг назад [←]"
        >
          <SkipBack className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            ←
          </span>
        </button>

        {/* Run / Pause Toggle */}
        {isRunning ? (
          <button
            type="button"
            onClick={pauseRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm transition-colors"
            title="Пауза [R]"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Пауза</span>
            <span className="font-mono text-[10px] opacity-80">[R]</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startRunning}
            disabled={isHaltedOrError}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-medium shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Непрерывное выполнение [R]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Запуск</span>
            <span className="font-mono text-[10px] opacity-80">[R]</span>
          </button>
        )}

        {/* Step Forward Button */}
        <button
          type="button"
          onClick={stepForward}
          disabled={isHaltedOrError}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Один такт вперед [Space / →]"
        >
          <SkipForward className="w-3.5 h-3.5" />
          <span>Шаг</span>
          <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            Space
          </span>
        </button>

        {/* Speed Slider */}
        <div className="flex items-center gap-2 ml-2 px-2.5 py-1 rounded bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
          <Gauge className="w-3 h-3 text-zinc-400" />
          <input
            type="range"
            min={30}
            max={800}
            step={20}
            value={830 - executionSpeedMs}
            onChange={(e) => setExecutionSpeedMs(830 - Number(e.target.value))}
            className="w-16 accent-zinc-700 dark:accent-zinc-300 h-1 cursor-pointer"
            title={`Интервал шага: ${executionSpeedMs} мс`}
          />
          <span className="font-mono text-[10px] text-zinc-500 w-10 text-right">
            {executionSpeedMs}ms
          </span>
        </div>
      </div>

      {/* Center: Status Message / Readout */}
      <div
        role={tapeError ? 'alert' : undefined}
        className={`flex-1 max-w-lg min-w-0 truncate px-2.5 py-1 rounded border flex items-center gap-2 ${
          tapeError
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            : 'bg-zinc-50 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            displayStatus === 'running'
              ? 'bg-sky-500 animate-pulse'
              : displayStatus === 'halted'
              ? 'bg-emerald-500'
              : displayStatus === 'error'
              ? 'bg-rose-500'
              : 'bg-zinc-400'
          }`}
        />
        <span
          className={`font-mono text-[10px] font-bold uppercase ${
            tapeError ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          [{displayStatus}]
        </span>
        <span className="truncate font-mono text-[11px]">
          {displayMessage}
        </span>
      </div>

      {/* Right: Technical Metrics */}
      <div className="flex items-center gap-2 font-mono text-[11px]">
        {runtime.callStack.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold">
            <Layers className="w-3 h-3" />
            <span>STACK:{runtime.callStack.length}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span>TICK:</span>
          <strong className="text-zinc-900 dark:text-zinc-100">{runtime.stepCount}</strong>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
          <HardDrive className="w-3 h-3 text-zinc-400" />
          <span>CELLS:</span>
          <strong className="text-zinc-900 dark:text-zinc-100">{runtime.visitedPositions.length}</strong>
        </div>
      </div>
    </div>
  );
};
