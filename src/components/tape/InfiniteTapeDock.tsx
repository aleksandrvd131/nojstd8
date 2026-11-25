import React, { useRef, useState } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import {
  RotateCcw,
  Save,
  ArrowRight,
  ArrowLeft,
  Crosshair,
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
  const [tapeWarning, setTapeWarning] = useState('');
  const tapeStripRef = useRef<HTMLDivElement>(null);

  const head = runtime.headPosition;

  // Keep the active head cell near the center of the visible strip.
  const centerPos = head;
  const visibleCells: number[] = [];
  for (let i = centerPos - 12; i <= centerPos + 12; i++) {
    visibleCells.push(i);
  }

  const handleApplyInputWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputWord.length > 0) {
      const invalid = [...inputWord].find((symbol) => !allSymbols.includes(symbol));
      if (invalid) {
        setTapeWarning(`Символ «${invalid}» отсутствует в алфавите.`);
        return;
      }
      setTapeString(inputWord, 0);
      setHeadPosition(inputWord.length);
      setInputWord('');
      setTapeWarning('');
    }
  };

  const handleTapeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      setEditingPos(null);
      setHeadPosition(head + (event.key === 'ArrowLeft' ? -1 : 1));
      setTapeWarning('');
      tapeStripRef.current?.focus();
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      setTapeCell(head, blankSymbol);
      setEditingPos(null);
      setTapeWarning('');
      tapeStripRef.current?.focus();
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      if (allSymbols.includes(event.key)) {
        setTapeCell(head, event.key);
        setEditingPos(null);
        setTapeWarning('');
        tapeStripRef.current?.focus();
      } else {
        setTapeWarning(`Символ «${event.key}» отсутствует в алфавите.`);
      }
    }
  };

  return (
    <div className="flex flex-col w-full bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 select-none text-xs">
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
                  setTapeWarning('');
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
            onClick={resetTapeFromInitialBuffer}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
            title="Восстановить ленту из буфера (Reset Tape)"
          >
            <RotateCcw className="w-3 h-3 text-zinc-500" />
            <span className="hidden sm:inline font-sans">Сброс ленты</span>
          </button>

          <div className="flex items-center ml-1 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => {
                setEditingPos(null);
                setHeadPosition(head - 1);
                setTapeWarning('');
              }}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-l transition-colors"
              title="Переместить головку на одну ячейку влево"
              aria-label="Переместить головку влево"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPos(null);
                setHeadPosition(head + 1);
                setTapeWarning('');
              }}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-r transition-colors"
              title="Переместить головку на одну ячейку вправо"
              aria-label="Переместить головку вправо"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {tapeWarning && (
        <p role="status" className="px-4 pt-1 text-[11px] text-rose-600 dark:text-rose-400">
          {tapeWarning}
        </p>
      )}

      {/* CAD Precision Tape Strip */}
      <div
        ref={tapeStripRef}
        data-tape-strip
        tabIndex={0}
        onKeyDown={handleTapeKeyDown}
        aria-label="Лента Тьюринга. Стрелки перемещают головку, Backspace очищает ячейку, символ алфавита записывает его."
        className="py-2.5 px-4 overflow-x-auto flex items-center justify-center gap-1 bg-zinc-100/60 dark:bg-zinc-950 outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sky-500/50"
      >
        {visibleCells.map((pos) => {
          const isHead = pos === head;
          const isVisited = runtime.visitedPositions.includes(pos);
          const cellValue = runtime.tape[pos] ?? blankSymbol;
          const isBlank = cellValue === blankSymbol;
          const isEditing = editingPos === pos;

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
                  setEditingPos(pos);
                  setHeadPosition(pos);
                }}
                className={`relative w-9 h-11 rounded-sm flex items-center justify-center font-mono text-sm cursor-pointer transition-colors border select-none ${
                  isHead
                    ? 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500 text-amber-700 dark:text-amber-300 font-extrabold shadow-xs'
                    : isVisited
                    ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold hover:border-zinc-400 dark:hover:border-zinc-500'
                    : 'bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
                title={`Ячейка [${pos}]. Кликните для выбора символа или перемещения головки.`}
              >
                {isEditing ? (
                  <select
                    value={cellValue}
                    onChange={(e) => {
                      setTapeCell(pos, e.target.value);
                      setEditingPos(null);
                      tapeStripRef.current?.focus();
                    }}
                    onBlur={() => setEditingPos(null)}
                    autoFocus
                    className="w-full h-full bg-transparent text-center font-mono font-bold text-sm focus:outline-none cursor-pointer"
                  >
                    {allSymbols.map((s) => (
                      <option key={s} value={s} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={isBlank ? 'text-zinc-400 dark:text-zinc-600 font-light' : 'font-bold'}>
                    {cellValue}
                  </span>
                )}
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
