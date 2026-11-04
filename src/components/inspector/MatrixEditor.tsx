import React, { useState } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import { MoveDirection } from '../../types/turing';

export const MatrixEditor: React.FC = () => {
  const getActiveProject = useTuringStore((s) => s.getActiveProject);
  const runtime = useTuringStore((s) => s.runtime);

  const addFiveTupleRule = useTuringStore((s) => s.addFiveTupleRule);
  const updateFiveTupleRule = useTuringStore((s) => s.updateFiveTupleRule);
  const deleteFiveTupleRule = useTuringStore((s) => s.deleteFiveTupleRule);

  const addFourTupleRule = useTuringStore((s) => s.addFourTupleRule);
  const updateFourTupleRule = useTuringStore((s) => s.updateFourTupleRule);
  const deleteFourTupleRule = useTuringStore((s) => s.deleteFourTupleRule);

  const project = getActiveProject();
  const { mode, rules5, rules4, alphabet, nodes } = project;
  const allSymbols = [...alphabet.symbols, alphabet.blankSymbol];
  const stateNodes = nodes.filter((n) => n.type === 'stateNode' || !n.type);

  // Cell editor popup / inline state
  const [editingCell, setEditingCell] = useState<{ stateId: string; symbol: string } | null>(null);
  const [editWrite, setEditWrite] = useState(allSymbols[0]);
  const [editMove, setEditMove] = useState<MoveDirection>('R');
  const [editTargetState, setEditTargetState] = useState(stateNodes[0]?.id || 'q0');
  const [editCommand, setEditCommand] = useState('R');

  const handleCellClick = (stateId: string, sym: string) => {
    setEditingCell({ stateId, symbol: sym });

    if (mode === '5-tuple') {
      const existing = rules5.find((r) => r.fromState === stateId && r.readSymbol === sym);
      if (existing) {
        setEditWrite(existing.writeSymbol);
        setEditMove(existing.move);
        setEditTargetState(existing.toState);
      } else {
        setEditWrite(sym);
        setEditMove('R');
        setEditTargetState(stateId);
      }
    } else {
      const existing = rules4.find((r) => r.fromState === stateId && r.readSymbol === sym);
      if (existing) {
        setEditCommand(existing.command);
        setEditTargetState(existing.toState);
      } else {
        setEditCommand('R');
        setEditTargetState(stateId);
      }
    }
  };

  const handleSaveCell = () => {
    if (!editingCell) return;
    const { stateId, symbol } = editingCell;

    if (mode === '5-tuple') {
      const existing = rules5.find((r) => r.fromState === stateId && r.readSymbol === symbol);
      if (existing) {
        updateFiveTupleRule(existing.id, {
          writeSymbol: editWrite,
          move: editMove,
          toState: editTargetState,
        });
      } else {
        addFiveTupleRule({
          fromState: stateId,
          readSymbol: symbol,
          writeSymbol: editWrite,
          move: editMove,
          toState: editTargetState,
        });
      }
    } else {
      const existing = rules4.find((r) => r.fromState === stateId && r.readSymbol === symbol);
      if (existing) {
        updateFourTupleRule(existing.id, {
          command: editCommand,
          toState: editTargetState,
        });
      } else {
        addFourTupleRule({
          fromState: stateId,
          readSymbol: symbol,
          command: editCommand,
          toState: editTargetState,
        });
      }
    }

    setEditingCell(null);
  };

  const handleClearCell = () => {
    if (!editingCell) return;
    const { stateId, symbol } = editingCell;
    if (mode === '5-tuple') {
      const existing = rules5.find((r) => r.fromState === stateId && r.readSymbol === symbol);
      if (existing) deleteFiveTupleRule(existing.id);
    } else {
      const existing = rules4.find((r) => r.fromState === stateId && r.readSymbol === symbol);
      if (existing) deleteFourTupleRule(existing.id);
    }
    setEditingCell(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Матрица Переходов (Символы ленты A × Состояния Q)
        </span>
        <span className="text-[11px] text-slate-400">
          Кликните по ячейке для редактирования
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <table className="w-full border-collapse border border-slate-200 dark:border-slate-800 text-center font-mono">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              <th className="p-2.5 border border-slate-200 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-800/80">
                A \ Q
              </th>
              {stateNodes.map((n) => {
                const isCurrent = runtime.currentNodeId === n.id;
                return (
                  <th
                    key={n.id}
                    className={`p-2.5 border border-slate-200 dark:border-slate-700 min-w-[90px] ${
                      isCurrent ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold' : ''
                    }`}
                  >
                    {n.data.label || n.id}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {allSymbols.map((sym) => (
              <tr key={sym} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-2 font-bold bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  {sym === alphabet.blankSymbol ? `${sym} (blank)` : sym}
                </td>

                {stateNodes.map((n) => {
                  let cellContent = '—';
                  let isCurrentCell = false;

                  if (mode === '5-tuple') {
                    const rule = rules5.find((r) => r.fromState === n.id && r.readSymbol === sym);
                    if (rule) {
                      cellContent = `${rule.writeSymbol}, ${rule.move}, ${rule.toState}`;
                      if (runtime.activeRuleId === rule.id) isCurrentCell = true;
                    }
                  } else {
                    const rule = rules4.find((r) => r.fromState === n.id && r.readSymbol === sym);
                    if (rule) {
                      cellContent = `${rule.command}, ${rule.toState}`;
                      if (runtime.activeRuleId === rule.id) isCurrentCell = true;
                    }
                  }

                  const isSelectedForEdit =
                    editingCell?.stateId === n.id && editingCell?.symbol === sym;

                  return (
                    <td
                      key={n.id}
                      onClick={() => handleCellClick(n.id, sym)}
                      className={`p-2 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors text-xs ${
                        isCurrentCell
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                          : isSelectedForEdit
                          ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500'
                          : cellContent !== '—'
                          ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                          : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline editor panel when a cell is selected */}
      {editingCell && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Ячейка: <span className="font-mono text-sky-600">Q = {editingCell.stateId}</span>,{' '}
              <span className="font-mono text-sky-600">a = {editingCell.symbol}</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearCell}
                className="text-[11px] text-rose-500 hover:text-rose-600 font-medium"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-medium"
              >
                Закрыть
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            {mode === '5-tuple' ? (
              <>
                <select
                  value={editWrite}
                  onChange={(e) => setEditWrite(e.target.value)}
                  className="px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                >
                  {allSymbols.map((s) => (
                    <option key={s} value={s}>
                      Запись: {s}
                    </option>
                  ))}
                </select>

                <select
                  value={editMove}
                  onChange={(e) => setEditMove(e.target.value as MoveDirection)}
                  className="px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                >
                  <option value="L">Сдвиг: L</option>
                  <option value="R">Сдвиг: R</option>
                  <option value="N">Сдвиг: N</option>
                </select>

                <select
                  value={editTargetState}
                  onChange={(e) => setEditTargetState(e.target.value)}
                  className="px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                >
                  {stateNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      В сост: {n.data.label || n.id}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Команда"
                  value={editCommand}
                  onChange={(e) => setEditCommand(e.target.value)}
                  className="w-20 px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                />

                <select
                  value={editTargetState}
                  onChange={(e) => setEditTargetState(e.target.value)}
                  className="px-2 py-1.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                >
                  {stateNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      В сост: {n.data.label || n.id}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              type="button"
              onClick={handleSaveCell}
              className="ml-auto px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-sans font-semibold text-xs transition-colors"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
