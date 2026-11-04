import React, { useState } from 'react';
import { useTuringStore, ALPHABET_PRESETS } from '../../store/useTuringStore';
import { BlankSymbolType } from '../../types/turing';
import { X, Plus, Trash2, Edit3, Check, BookOpen, AlertCircle } from 'lucide-react';

const RESERVED_SYMBOLS = new Set(['L', 'R', 'N', '<', '>', '.']);

export const AlphabetBuilder: React.FC = () => {
  const isAlphabetModalOpen = useTuringStore((s) => s.isAlphabetModalOpen);
  const setAlphabetModalOpen = useTuringStore((s) => s.setAlphabetModalOpen);
  const getActiveProject = useTuringStore((s) => s.getActiveProject);
  const setAlphabetSymbols = useTuringStore((s) => s.setAlphabetSymbols);
  const setBlankSymbol = useTuringStore((s) => s.setBlankSymbol);
  const applyAlphabetPreset = useTuringStore((s) => s.applyAlphabetPreset);
  const refactorSymbol = useTuringStore((s) => s.refactorSymbol);

  const project = getActiveProject();
  const { symbols, blankSymbol } = project.alphabet;

  const [newChar, setNewChar] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rename / Refactor state
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [renamedValue, setRenamedValue] = useState('');

  if (!isAlphabetModalOpen) return null;

  const handleAddSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmed = newChar.trim();
    if (!trimmed) return;

    if (RESERVED_SYMBOLS.has(trimmed)) {
      setErrorMessage(`Символ '${trimmed}' зарезервирован для команд сдвига (L, R, N, <, >, .).`);
      return;
    }

    if (trimmed === blankSymbol) {
      setErrorMessage(`Символ '${trimmed}' уже используется как пустой символ.`);
      return;
    }

    if (symbols.includes(trimmed)) {
      setErrorMessage(`Символ '${trimmed}' уже есть в алфавите.`);
      return;
    }

    setAlphabetSymbols([...symbols, trimmed]);
    setNewChar('');
  };

  const handleRemoveSymbol = (sym: string) => {
    if (symbols.length <= 1) {
      setErrorMessage('В алфавите должен оставаться как минимум один рабочий символ.');
      return;
    }
    setAlphabetSymbols(symbols.filter((s) => s !== sym));
  };

  const handleStartRename = (sym: string) => {
    setEditingSymbol(sym);
    setRenamedValue(sym);
    setErrorMessage(null);
  };

  const handleSaveRename = (oldSym: string) => {
    const trimmed = renamedValue.trim();
    if (!trimmed || trimmed === oldSym) {
      setEditingSymbol(null);
      return;
    }

    if (RESERVED_SYMBOLS.has(trimmed)) {
      setErrorMessage(`Символ '${trimmed}' зарезервирован.`);
      return;
    }

    if (symbols.includes(trimmed) && trimmed !== oldSym) {
      setErrorMessage(`Символ '${trimmed}' уже присутствует в алфавите.`);
      return;
    }

    refactorSymbol(oldSym, trimmed);
    setEditingSymbol(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Конструктор & Валидатор Алфавита
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Внешний алфавит ленты с авторефакторингом правил
              </p>
            </div>
          </div>
          <button
            onClick={() => setAlphabetModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Presets */}
        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Готовые академические пресеты
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(ALPHABET_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyAlphabetPreset(key)}
                className="p-2.5 text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-all group"
              >
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-600">
                  {preset.name}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                  {preset.symbols.join(', ')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Blank symbol configuration */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Обозначение пустого символа (Blank Symbol)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['λ', '_', '␣', 'a0'] as BlankSymbolType[]).map((blank) => (
              <button
                key={blank}
                type="button"
                onClick={() => setBlankSymbol(blank)}
                className={`py-2 px-3 text-sm font-mono font-bold rounded-xl border transition-all text-center ${
                  blankSymbol === blank
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-300'
                }`}
              >
                {blank === '_' ? '_ (подчерк)' : blank === 'λ' ? 'λ (лямбда)' : blank === '␣' ? '␣ (пробел)' : 'a0'}
              </button>
            ))}
          </div>
        </div>

        {/* Active alphabet symbols */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Рабочие символы ({symbols.length})
          </label>

          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Blank symbol badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-mono font-bold">
              <span>{blankSymbol}</span>
              <span className="text-[10px] font-sans font-normal opacity-80">(blank)</span>
            </div>

            {symbols.map((sym) => {
              const isEditing = editingSymbol === sym;

              return (
                <div
                  key={sym}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={renamedValue}
                        onChange={(e) => setRenamedValue(e.target.value)}
                        className="w-8 px-1 py-0.5 text-xs font-mono bg-sky-50 dark:bg-sky-950 border border-sky-500 rounded text-center"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(sym);
                          if (e.key === 'Escape') setEditingSymbol(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(sym)}
                        className="text-emerald-500 hover:text-emerald-600"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>{sym}</span>
                      <button
                        type="button"
                        onClick={() => handleStartRename(sym)}
                        className="text-slate-400 hover:text-sky-500 transition-colors"
                        title="Переименовать символ с авторефакторингом правил"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSymbol(sym)}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                        title="Удалить символ"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add custom symbol input */}
          <form onSubmit={handleAddSymbol} className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Добавить символ (букву, цифру, спецзнак)..."
              value={newChar}
              onChange={(e) => setNewChar(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Добавить
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setAlphabetModalOpen(false)}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
