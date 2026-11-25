import React, { useState, useEffect } from 'react';
import { useTuringStore, useActiveProject } from '../../store/useTuringStore';
import { MoveDirection } from '../../types/turing';
import { Plus, Trash2, ArrowRight, Table2 } from 'lucide-react';

export const TupleTableEditor: React.FC = () => {
  const runtime = useTuringStore((s) => s.runtime);

  const addFiveTupleRule = useTuringStore((s) => s.addFiveTupleRule);
  const updateFiveTupleRule = useTuringStore((s) => s.updateFiveTupleRule);
  const deleteFiveTupleRule = useTuringStore((s) => s.deleteFiveTupleRule);

  const addFourTupleRule = useTuringStore((s) => s.addFourTupleRule);
  const updateFourTupleRule = useTuringStore((s) => s.updateFourTupleRule);
  const deleteFourTupleRule = useTuringStore((s) => s.deleteFourTupleRule);

  const project = useActiveProject();
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

  // Synchronize draft state if nodes change or project switches
  useEffect(() => {
    if (stateLabels.length > 0) {
      if (!stateLabels.includes(newFrom)) {
        setNewFrom(stateLabels[0]);
      }
      if (!stateLabels.includes(newTo)) {
        setNewTo(stateLabels[1] || stateLabels[0]);
      }
    }
  }, [project.id, stateLabels.join(',')]);

  // Operational VTM mode empty state
  if (mode === '4-tuple' && subMode === 'operational') {
    return (
      <div className="flex flex-col h-full overflow-hidden text-xs">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            Таблица правил
          </span>
          <span className="text-[11px] text-zinc-400">
            Операционный режим (VTM)
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 dark:text-zinc-400">
          <Table2 className="w-10 h-10 mb-3 text-zinc-400 dark:text-zinc-600" />
          <h4 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 mb-1">
            Операционный режим (Блок-схема VTM)
          </h4>
          <p className="max-w-xs text-xs text-zinc-500">
            Таблица правил неприменима в операционном режиме блок-схем. Переходы задаются условиями на связях между функциональными узлами графа.
          </p>
        </div>
      </div>
    );
  }

  const handleAddFiveTuple = (e: React.FormEvent) => {
    e.preventDefault();
    if (stateLabels.length === 0) return;
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
    if (stateLabels.length === 0) return;
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
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          {mode === '5-tuple'
            ? `Таблица пятёрок (${rules5.length} правил)`
            : `Таблица четвёрок (${rules4.length} правил)`}
        </span>
        <span className="text-[11px] text-zinc-400">
          Синхронизировано с холстом
        </span>
      </div>

      {/* Rules Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider backdrop-blur-sm z-10">
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
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
            {mode === '5-tuple' ? (
              rules5.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400 font-sans">
                    Нет правил переходов. Добавьте правило ниже или соедините узлы на холсте.
                  </td>
                </tr>
              ) : (
                rules5.map((r) => {
                  const isActive = runtime.activeRuleId === r.id;

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                        isActive ? 'bg-amber-500/15 font-bold text-amber-700 dark:text-amber-300' : ''
                      }`}
                    >
                      <td className="py-1.5 px-2.5">
                        <select
                          value={r.fromState}
                          onChange={(e) => updateFiveTupleRule(r.id, { fromState: e.target.value })}
                          className="w-full bg-transparent px-1 py-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none"
                        >
                          {!stateLabels.includes(r.fromState) && (
                            <option value={r.fromState}>{r.fromState} (не существует)</option>
                          )}
                          {nodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.data.label && n.data.label !== n.id ? `${n.id} (${n.data.label})` : n.id}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <select
                          value={r.readSymbol}
                          onChange={(e) => updateFiveTupleRule(r.id, { readSymbol: e.target.value })}
                          className="bg-transparent px-1 py-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none"
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
                          className="bg-transparent px-1 py-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none"
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
                          className="bg-transparent px-1 py-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none font-bold"
                        >
                          <option value="L">L</option>
                          <option value="R">R</option>
                          <option value="N">N</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2.5">
                        <select
                          value={r.toState}
                          onChange={(e) => updateFiveTupleRule(r.id, { toState: e.target.value })}
                          className="w-full bg-transparent px-1 py-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none"
                        >
                          {!stateLabels.includes(r.toState) && (
                            <option value={r.toState}>{r.toState} (не существует)</option>
                          )}
                          {nodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.data.label && n.data.label !== n.id ? `${n.id} (${n.data.label})` : n.id}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => deleteFiveTupleRule(r.id)}
                          className="text-zinc-400 hover:text-rose-500 p-1 rounded transition-colors"
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
                <td colSpan={5} className="py-8 text-center text-zinc-400 font-sans">
                  Нет правил четвёрок.
                </td>
              </tr>
            ) : (
              rules4.map((r) => {
                const isActive = runtime.activeRuleId === r.id;

                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                      isActive ? 'bg-amber-500/15 font-bold text-amber-700 dark:text-amber-300' : ''
                    }`}
                  >
                    <td className="py-1.5 px-2.5">
                      <select
                        value={r.fromState}
                        onChange={(e) => updateFourTupleRule(r.id, { fromState: e.target.value })}
                        className="w-full bg-transparent px-1 py-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none"
                      >
                        {!stateLabels.includes(r.fromState) && (
                          <option value={r.fromState}>{r.fromState} (не существует)</option>
                        )}
                        {nodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.data.label && n.data.label !== n.id ? `${n.id} (${n.data.label})` : n.id}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={r.readSymbol}
                        onChange={(e) => updateFourTupleRule(r.id, { readSymbol: e.target.value })}
                        className="bg-transparent px-1 py-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none"
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
                        className="w-16 bg-transparent px-1 py-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none font-bold"
                      />
                    </td>
                    <td className="py-1.5 px-2.5">
                      <select
                        value={r.toState}
                        onChange={(e) => updateFourTupleRule(r.id, { toState: e.target.value })}
                        className="w-full bg-transparent px-1 py-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none"
                      >
                        {!stateLabels.includes(r.toState) && (
                          <option value={r.toState}>{r.toState} (не существует)</option>
                        )}
                        {nodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.data.label && n.data.label !== n.id ? `${n.id} (${n.data.label})` : n.id}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteFourTupleRule(r.id)}
                        className="text-zinc-400 hover:text-rose-500 p-1 rounded transition-colors"
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
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <form
          onSubmit={mode === '5-tuple' ? handleAddFiveTuple : handleAddFourTuple}
          className="flex items-center gap-1.5 font-mono text-[11px]"
        >
          <select
            value={newFrom}
            onChange={(e) => setNewFrom(e.target.value)}
            className="w-20 px-2 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
            required
            disabled={stateLabels.length === 0}
          >
            {stateLabels.length === 0 ? (
              <option value="" disabled>Нет узлов</option>
            ) : (
              nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}
                </option>
              ))
            )}
          </select>

          <select
            value={newRead}
            onChange={(e) => setNewRead(e.target.value)}
            className="px-1.5 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
          >
            {allSymbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <ArrowRight className="w-3 h-3 text-zinc-400 flex-shrink-0" />

          {mode === '5-tuple' ? (
            <>
              <select
                value={newWrite}
                onChange={(e) => setNewWrite(e.target.value)}
                className="px-1.5 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
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
                className="px-1.5 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold"
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
              className="w-12 px-1.5 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold"
              required
            />
          )}

          <select
            value={newTo}
            onChange={(e) => setNewTo(e.target.value)}
            className="w-20 px-2 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
            required
            disabled={stateLabels.length === 0}
          >
            {stateLabels.length === 0 ? (
              <option value="" disabled>Нет узлов</option>
            ) : (
              nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id}
                </option>
              ))
            )}
          </select>

          <button
            type="submit"
            disabled={stateLabels.length === 0}
            className="ml-auto p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-sans font-semibold flex items-center gap-1 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
