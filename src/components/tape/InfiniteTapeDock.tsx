import React, { useState, useRef, useEffect } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import {
  RotateCcw,
  Save,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const InfiniteTapeDock: React.FC = () => {
  const getActiveProject = useTuringStore((s) => s.getActiveProject);
  const runtime = useTuringStore((s) => s.runtime);
  const setTapeCell = useTuringStore((s) => s.setTapeCell);
  const setTapeString = useTuringStore((s) => s.setTapeString);
  const setHeadPosition = useTuringStore((s) => s.setHeadPosition);
  const saveTapeToInitialBuffer = useTuringStore((s) => s.saveTapeToInitialBuffer);
  const resetTapeFromInitialBuffer = useTuringStore((s) => s.resetTapeFromInitialBuffer);

  const project = getActiveProject();
  const { blankSymbol, symbols } = project.alphabet;
  const allSymbols = [...symbols, blankSymbol];

  const [inputWord, setInputWord] = useState('');
  const [editingPos, setEditingPos] = useState<number | null>(null);

  // Visible window range around head
  const [rangeOffset, setRangeOffset] = useState(0);
  const head = runtime.headPosition;

  // Auto-center view when head moves outside current window
  useEffect(() => {
    setRangeOffset(0);
  }, [head]);

  // Window of 25 cells centered on head + rangeOffset
  const centerPos = head + rangeOffset;
  const visibleCells: number[] = [];
  for (let i = centerPos - 12; i <= centerPos + 12; i++) {
    visibleCells.push(i);
  }

  const handleApplyInputWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputWord.length > 0) {
      setTapeString(inputWord, 0);
      setInputWord('');
    }
  };

  return (
    <div className="flex flex-col w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-xl select-none">
      {/* Tape Header Bar */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 text-xs">
        {/* Quick word input */}
        <form onSubmit={handleApplyInputWord} className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Ввести входное слово (например, 10110)..."
            value={inputWord}
            onChange={(e) => setInputWord(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs font-mono rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
          >
            <span>Загрузить</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Head position & Buffer controls */}
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-slate-500 font-mono">
            Позиция головки: <strong className="text-sky-600 dark:text-sky-400">{head}</strong>
          </div>

          <div className="w-[1px] h-4 bg-slate-200 dark:border-slate-800 mx-1" />

          <button
            type="button"
            onClick={saveTapeToInitialBuffer}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Зафиксировать текущую ленту как начальное состояние"
          >
            <Save className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">В буфер</span>
          </button>

          <button
            type="button"
            onClick={resetTapeFromInitialBuffer}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Восстановить ленту из буфера"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Сброс</span>
          </button>

          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={() => setRangeOffset((r) => r - 5)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Прокрутить ленту влево"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setRangeOffset((r) => r + 5)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title="Прокрутить ленту вправо"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Infinite Tape Cells Strip */}
      <div className="relative py-4 px-6 overflow-x-auto flex items-center justify-center gap-1.5 bg-slate-50/70 dark:bg-slate-950/70">
        {visibleCells.map((pos) => {
          const isHead = pos === head;
          const isVisited = runtime.visitedPositions.includes(pos);
          const cellValue = runtime.tape[pos] ?? blankSymbol;
          const isBlank = cellValue === blankSymbol;
          const isEditing = editingPos === pos;

          return (
            <div key={pos} className="flex flex-col items-center">
              {/* Pointer indicator over head */}
              <div className="h-4 flex items-center justify-center">
                {isHead && (
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-500 animate-bounce" />
                )}
              </div>

              {/* Cell Box */}
              <div
                onClick={() => {
                  setEditingPos(pos);
                  setHeadPosition(pos);
                }}
                className={`relative w-12 h-14 rounded-xl flex items-center justify-center font-mono font-bold text-lg cursor-pointer transition-all border-2 ${
                  isHead
                    ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300 ring-4 ring-amber-500/20 shadow-md scale-105 z-10'
                    : isVisited
                    ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 text-slate-800 dark:text-slate-100 hover:border-sky-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
                title={`Ячейка [${pos}]. Кликните для редактирования или перемещения головки.`}
              >
                {isEditing ? (
                  <select
                    value={cellValue}
                    onChange={(e) => {
                      setTapeCell(pos, e.target.value);
                      setEditingPos(null);
                    }}
                    onBlur={() => setEditingPos(null)}
                    autoFocus
                    className="w-full h-full bg-transparent text-center font-mono font-bold text-base focus:outline-none"
                  >
                    {allSymbols.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={isBlank ? 'text-slate-400 dark:text-slate-600 font-light' : ''}>
                    {cellValue}
                  </span>
                )}
              </div>

              {/* Cell coordinate number */}
              <span
                className={`mt-1 font-mono text-[10px] ${
                  isHead
                    ? 'font-bold text-amber-600 dark:text-amber-400'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {pos}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
