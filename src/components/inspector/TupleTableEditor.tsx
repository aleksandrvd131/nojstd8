import React, { useState } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import { MoveDirection } from '../../types/turing';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

export const TupleTableEditor: React.FC = () => {
  const getActiveProject = useTuringStore((s) => s.getActiveProject);
  const runtime = useTuringStore((s) => s.runtime);

  const addFiveTupleRule = useTuringStore((s) => s.addFiveTupleRule);
  const updateFiveTupleRule = useTuringStore((s) => s.updateFiveTupleRule);
  const deleteFiveTupleRule = useTuringStore((s) => s.deleteFiveTupleRule);

  const addFourTupleRule = useTuringStore((s) => s.addFourTupleRule);
  const updateFourTupleRule = useTuringStore((s) => s.updateFourTupleRule);
  const deleteFourTupleRule = useTuringStore((s) => s.deleteFourTupleRule);

  const project = getActiveProject();
  const { mode, subMode, rules5, rules4, alphabet, nodes } = project;
  const allSymbols = [...alphabet.symbols, alphabet.blankSymbol];
  const stateLabels = nodes.map((n) => n.id);

  // New rule draft state
  const [newFrom, setNewFrom] = useState(stateLabels[0] || 'q0');
  const [newRead, setNewRead] = useState(allSymbols[0] || '0');
  const [newWrite, setNewWrite] = useState(allSymbols[0] || '0');
  const [newMove, setNewMove] = useState<MoveDirection>('R');
  const [newTo, setNewTo] = useState(stateLabels[1] || stateLabels[0] || 'q_halt');
  const [newCommand, setNewCommand] = useState('R');

  const handleAddFiveTuple = (e: React.FormEvent) => {
    e.preventDefault();
    addFiveTupleRule({
      fromState: newFrom,
      readSymbol: newRead,
      writeSymbol: newWrite,
      move: newMove,
      toState: newTo,
    });
  };

  const handleAddFourTuple = (e: React.FormEvent) => {
    e.preventDefault();
    addFourTupleRule({
      fromState: newFrom,
      readSymbol: newRead,
      command: newCommand,
      toState: newTo,
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Table Header / Action Info */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {mode === '5-tuple'
            ? `Таблица пятёрок (${rules5.length} правил)`
            : `Таблица четвёрок (${rules4.length} правил)`}
        </span>
        <span className="text-[11px] text-slate-400">
          Синхронизировано с холстом
        </span>
      </div>

      {/* Rules Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider backdrop-blur-sm z-10">
            <tr>
              <th className="py-2 px-2.5">Состояние q</th>
              <th className="py-2 px-2">Чтение a</th>
              {mode === '5-tuple' ? (
                <>
                  <th className="py-2 px-2">Запись a'</th>
                  <th className="py-2 px-2">Сдвиг d</th>
                </>
              ) : (
                <th className="py-2 px-2">Команда C</th>
              )}
              <th className="py-2 px-2.5">След. сост. q'</th>
              <th className="py-2 px-2 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {mode === '5-tuple' ? (
              rules5.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    Нет правил переходов. Добавьте правило ниже или соедините узлы на холсте.
                  </td>
                </tr>
              ) : (
                rules5.map((r) => {
                  const isActive = runtime.activeRuleId === r.id;

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isActive ? 'bg-amber-500/15 font-bold text-amber-700 dark:text-amber-300' : ''
                      }`}
                    >
                      <td className="py-1.5 px-2.5">
                        <input
                          type="text"
                          value={r.fromState}
                          onChange={(e) => updateFiveTupleRule(r.id, { fromState: e.target.value })}
                          className="w-full bg-transparent px-1 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={r.readSymbol}
                          onChange={(e) => updateFiveTupleRule(r.id, { readSymbol: e.target.value })}
                          className="bg-transparent px-1 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                        >
                          {allSymbols.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={r.writeSymbol}
                          onChange={(e) => updateFiveTupleRule(r.id, { writeSymbol: e.target.value })}
                          className="bg-transparent px-1 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                        >
                          {allSymbols.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={r.move}
                          onChange={(e) =>
                            updateFiveTupleRule(r.id, { move: e.target.value as MoveDirection })
                          }
                          className="bg-transparent px-1 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none font-bold"
                        >
                          <option value="L">L</option>
                          <option value="R">R</option>
                          <option value="N">N</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <input
                          type="text"
                          value={r.toState}
                          onChange={(e) => updateFiveTupleRule(r.id, { toState: e.target.value })}
                          className="w-full bg-transparent px-1 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => deleteFiveTupleRule(r.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                          title="Удалить правило"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )
            ) : rules4.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                  Нет правил четвёрок.
                </td>
              </tr>
            ) : (
              rules4.map((r) => {
                const isActive = runtime.activeRuleId === r.id;

                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      isActive ? 'bg-amber-500/15 font-bold text-amber-700 dark:text-amber-300' : ''
                    }`}
                  >
                    <td className="py-1.5 px-2.5">
                      <input
                        type="text"
                        value={r.fromState}
                        onChange={(e) => updateFourTupleRule(r.id, { fromState: e.target.value })}
                        className="w-full bg-transparent px-1 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={r.readSymbol}
                        onChange={(e) => updateFourTupleRule(r.id, { readSymbol: e.target.value })}
                        className="bg-transparent px-1 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                      >
                        {allSymbols.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={r.command}
                        onChange={(e) => updateFourTupleRule(r.id, { command: e.target.value })}
                        className="w-16 bg-transparent px-1 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none font-bold"
                      />
                    </td>
                    <td className="py-1.5 px-2.5">
                      <input
                        type="text"
                        value={r.toState}
                        onChange={(e) => updateFourTupleRule(r.id, { toState: e.target.value })}
                        className="w-full bg-transparent px-1 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteFourTupleRule(r.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                        title="Удалить правило"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Add Rule Form */}
      <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form
          onSubmit={mode === '5-tuple' ? handleAddFiveTuple : handleAddFourTuple}
          className="flex items-center gap-1.5 font-mono text-[11px]"
        >
          <input
            type="text"
            placeholder="q_src"
            value={newFrom}
            onChange={(e) => setNewFrom(e.target.value)}
            className="w-16 px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            required
          />

          <select
            value={newRead}
            onChange={(e) => setNewRead(e.target.value)}
            className="px-1.5 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
          >
            {allSymbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />

          {mode === '5-tuple' ? (
            <>
              <select
                value={newWrite}
                onChange={(e) => setNewWrite(e.target.value)}
                className="px-1.5 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              >
                {allSymbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={newMove}
                onChange={(e) => setNewMove(e.target.value as MoveDirection)}
                className="px-1.5 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
              >
                <option value="L">L</option>
                <option value="R">R</option>
                <option value="N">N</option>
              </select>
            </>
          ) : (
            <input
              type="text"
              placeholder="Cmd"
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              className="w-12 px-1.5 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
              required
            />
          )}

          <input
            type="text"
            placeholder="q_dst"
            value={newTo}
            onChange={(e) => setNewTo(e.target.value)}
            className="w-16 px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            required
          />

          <button
            type="submit"
            className="ml-auto p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-sans font-semibold flex items-center gap-1 shadow-sm transition-colors"
            title="Добавить правило в таблицу"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Добавить</span>
          </button>
        </form>
      </div>
    </div>
  );
};
