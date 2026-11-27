import React, { useEffect, useRef, useState } from 'react';
import { useTuringStore, useActiveProject } from '../../store/useTuringStore';
import { tokenizeTapeInput } from '../../engine/simulator';
import {
  Save,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eraser,
} from 'lucide-react';

export const InfiniteTapeDock: React.FC = () => {
  const runtime = useTuringStore((s) => s.runtime);
  const setTapeCell = useTuringStore((s) => s.setTapeCell);
  const setTapeString = useTuringStore((s) => s.setTapeString);
  const clearTape = useTuringStore((s) => s.clearTape);
  const setHeadPosition = useTuringStore((s) => s.setHeadPosition);
  const saveTapeToInitialBuffer = useTuringStore((s) => s.saveTapeToInitialBuffer);
  const setTapeError = useTuringStore((s) => s.setTapeError);

  const project = useActiveProject();
  const { blankSymbol, symbols } = project.alphabet;
  const allSymbols = [...symbols, blankSymbol];

  const [inputWord, setInputWord] = useState('');
  const [rangeOffset, setRangeOffset] = useState(0);
  const [crowbar, setCrowbar] = useState(0);
  const tapeStripRef = useRef<HTMLDivElement>(null);

  const head = runtime.headPosition;

  // Auto-center view when head moves
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
    if (/^(?:hl\s*3|half[\s-]*life\s*3)$/i.test(inputWord.trim())) {
      setCrowbar((count) => count + 1);
    }
    if (inputWord.length > 0) {
      const tokens = tokenizeTapeInput(inputWord, project.alphabet);
      const invalid = tokens.find((symbol) => !allSymbols.includes(symbol));
      if (invalid) {
        setTapeError(`Символ «${invalid}» отсутствует в алфавите.`);
        return;
      }
      setTapeString(inputWord, 0);
      setInputWord('');
      setTapeError(null);
      tapeStripRef.current?.focus();
    }
  };

  const handleTapeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      setHeadPosition(head + (event.key === 'ArrowLeft' ? -1 : 1));
      setTapeError(null);
      tapeStripRef.current?.focus();
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      setTapeCell(head, blankSymbol);
      setTapeError(null);
      tapeStripRef.current?.focus();
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
      event.preventDefault();
      if (allSymbols.includes(event.key)) {
        setTapeCell(head, event.key);
        setTapeError(null);
        tapeStripRef.current?.focus();
      } else {
        setTapeError(`Символ «${event.key}» отсутствует в алфавите.`);
      }
    }
  };

  return (
    <div className="flex flex-col w-full bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 select-none text-xs">
      {crowbar > 0 && (
        <div key={crowbar} className="crowbar-easter-egg" aria-hidden="true" data-testid="falling-crowbar"
          onAnimationEnd={() => setCrowbar(0)}>
          <svg width="240" height="120" viewBox="0 0 240 120" fill="none">
            {/* Curved claw, long steel shaft, and flattened chisel tip. */}
            <path d="M20 41 C9 31 7 18 15 10 C23 2 35 4 48 10 L184 79 Q194 84 205 85 L229 88 L234 91 L229 103 Q228 106 223 106 L199 101 Q188 100 178 95 L43 25 C31 19 25 20 22 24 C19 28 21 34 25 38 L30 50 L28 57 L22 50 Z"
              fill="#3f464b" stroke="#202529" strokeWidth="2" strokeLinejoin="round" />
            <path d="M20 41 L25 38 L30 50 L28 57 L22 50 Z" fill="#a6aaad" stroke="#73797c" strokeWidth="1" />
            <path d="M203 86 L229 88 L234 91 L229 103 Q228 106 223 106 L199 101 Z"
              fill="#a8abad" stroke="#73797c" strokeWidth="1.5" />
            <path d="M15 18 C20 9 30 9 43 15 L181 85 Q190 90 201 91"
              stroke="#798187" strokeWidth="3" strokeLinecap="round" opacity=".8" />
            <path d="M48 24 L177 91" stroke="#252b2f" strokeWidth="2" opacity=".7" />
          </svg>
        </div>
      )}
      {/* Tape Sub-toolbar */}
      <div className="px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/60 dark:bg-zinc-950/60">
        {/* Quick word input */}
        <form onSubmit={handleApplyInputWord} className="flex items-center gap-1.5 flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Входное слово на ленту (напр. 10110)..."
            value={inputWord}
            onChange={(e) => {
              setInputWord(e.target.value);
              setTapeError(null);
            }}
            className="flex-1 px-2.5 py-1 text-xs font-mono rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-white text-white dark:text-zinc-900 transition-colors"
          >
            <span>Загрузить</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </form>

        {/* Head position & Buffer controls */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
            <Crosshair className="w-3 h-3 text-amber-500" />
            <span>HEAD:</span>
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{head}</strong>
          </div>

          <div className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-800" />

          <button
            type="button"
            onClick={saveTapeToInitialBuffer}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
            title="Зафиксировать текущую ленту как начальное состояние (Save Buffer)"
          >
            <Save className="w-3 h-3 text-zinc-500" />
            <span className="hidden sm:inline font-sans">В буфер</span>
          </button>

          <button
            type="button"
            onClick={clearTape}
            className="p-1 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-rose-500 border border-zinc-200 dark:border-zinc-700 transition-colors"
            title="Очистить ленту"
            aria-label="Очистить ленту"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center ml-1 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setRangeOffset((r) => r - 5)}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-l transition-colors"
              title="Прокрутить ленту влево (−5 ячеек)"
              aria-label="Прокрутить ленту влево"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {rangeOffset !== 0 && (
              <button
                type="button"
                onClick={() => setRangeOffset(0)}
                className="px-1.5 py-0.5 text-[10px] font-sans hover:bg-zinc-200 dark:hover:bg-zinc-700 text-amber-600 dark:text-amber-400 border-x border-zinc-200 dark:border-zinc-700 transition-colors"
                title="Вернуть вид к головке"
              >
                К головке
              </button>
            )}
            <button
              type="button"
              onClick={() => setRangeOffset((r) => r + 5)}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-r transition-colors"
              title="Прокрутить ленту вправо (+5 ячеек)"
              aria-label="Прокрутить ленту вправо"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CAD Precision Tape Strip */}
      <div
        ref={tapeStripRef}
        data-tape-strip
        tabIndex={0}
        onMouseEnter={() => {
          const active = document.activeElement as HTMLElement | null;
          if (active && (active.matches('input, textarea, select') || active.isContentEditable)) return;
          tapeStripRef.current?.focus({ preventScroll: true });
        }}
        onKeyDown={handleTapeKeyDown}
        onWheel={(e) => {
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          if (delta !== 0) {
            setRangeOffset((r) => r + (delta > 0 ? 1 : -1));
          }
        }}
        aria-label="Лента Тьюринга. Стрелки перемещают головку, Backspace очищает ячейку, символ алфавита записывает его."
        className="py-2.5 px-4 overflow-x-auto flex items-center justify-center gap-1 bg-zinc-100/60 dark:bg-zinc-950 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sky-500/50"
      >
        {visibleCells.map((pos) => {
          const isHead = pos === head;
          const isVisited = runtime.visitedPositions.includes(pos);
          const cellValue = runtime.tape[pos] ?? blankSymbol;
          const isBlank = cellValue === blankSymbol;

          return (
            <div key={pos} className="flex flex-col items-center group">
              {/* Head pointer notch (sharp CAD indicator, no bounce) */}
              <div className="h-2 flex items-center justify-center">
                {isHead && (
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-amber-500" />
                )}
              </div>

              {/* Cell Box */}
              <div
                onClick={() => {
                  setHeadPosition(pos);
                  setTapeError(null);
                  tapeStripRef.current?.focus();
                }}
                className={`relative w-9 h-11 rounded-sm flex items-center justify-center font-mono text-sm cursor-pointer transition-colors border select-none ${
                  isHead
                    ? 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500 text-amber-700 dark:text-amber-300 font-extrabold shadow-sm'
                    : isVisited
                    ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold hover:border-zinc-400 dark:hover:border-zinc-500'
                    : 'bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
                title={`Ячейка [${pos}]. Кликните и введите символ с клавиатуры (Backspace — очистить).`}
              >
                <span className={isBlank ? 'text-zinc-400 dark:text-zinc-600 font-light' : 'font-bold'}>
                  {cellValue}
                </span>
              </div>

              {/* Cell coordinate number */}
              <span
                className={`mt-1 font-mono text-[9px] ${
                  isHead
                    ? 'font-bold text-amber-600 dark:text-amber-400'
                    : 'text-zinc-400 dark:text-zinc-500'
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
