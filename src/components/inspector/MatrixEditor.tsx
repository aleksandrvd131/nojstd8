import React, { useState } from 'react';
import { useTuringStore, useActiveProject } from '../../store/useTuringStore';
import { MoveDirection } from '../../types/turing';
import { Grid3X3, Plus, AlertTriangle } from 'lucide-react';

export const MatrixEditor: React.FC = () => {
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
  const stateNodes = nodes.filter((n) => n.type === 'stateNode' || !n.type);

  // Cell editor popup / inline state
  const [editingCell, setEditingCell] = useState<{
    stateId: string;
    symbol: string;
    ruleId?: string;
  } | null>(null);
  const [editWrite, setEditWrite] = useState(allSymbols[0]);
  const [editMove, setEditMove] = useState<MoveDirection>('R');
  const [editTargetState, setEditTargetState] = useState(stateNodes[0]?.id || 'q0');
  const [editCommand, setEditCommand] = useState('R');

  // P2-3: Operational VTM mode empty state
  if (mode === '4-tuple' && subMode === 'operational') {
    return (
      <div className="flex flex-col h-full overflow-hidden text-xs">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            Матрица Переходов
          </span>
          <span className="text-[11px] text-zinc-400">
            Операционный режим (VTM)
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 dark:text-zinc-400">
          <Grid3X3 className="w-10 h-10 mb-3 text-zinc-400 dark:text-zinc-600" />
          <h4 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 mb-1">
            Операционный режим (Блок-схема VTM)
          </h4>
          <p className="max-w-xs text-xs text-zinc-500">
            Матрица переходов неприменима к операционным блок-схемам. Переходы определяются условиями на ребрах между функциональными блоками.
          </p>
        </div>
      </div>
    );
  }

  // Empty state when there are no state nodes in graph
  if (stateNodes.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden text-xs">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            Матрица Переходов (A × Q)
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 dark:text-zinc-400">
          <Grid3X3 className="w-10 h-10 mb-3 text-zinc-400 dark:text-zinc-600" />
          <h4 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 mb-1">
            Нет состояний
          </h4>
          <p className="max-w-xs text-xs text-zinc-500">
            Добавьте состояния (q) на холсте для отображения матрицы переходов.
          </p>
        </div>
      </div>
    );
  }

  const handleCellClick = (stateId: string, sym: string, targetRuleId?: string) => {
    if (mode === '5-tuple') {
      const matching = rules5.filter((r) => r.fromState === stateId && r.readSymbol === sym);
      const target = targetRuleId ? matching.find((r) => r.id === targetRuleId) : matching[0];
      if (target) {
        setEditingCell({ stateId, symbol: sym, ruleId: target.id });
        setEditWrite(target.writeSymbol);
        setEditMove(target.move);
        setEditTargetState(target.toState);
      } else {
        setEditingCell({ stateId, symbol: sym });
        setEditWrite(sym);
        setEditMove('R');
        setEditTargetState(stateId);
      }
    } else {
      const matching = rules4.filter((r) => r.fromState === stateId && r.readSymbol === sym);
      const target = targetRuleId ? matching.find((r) => r.id === targetRuleId) : matching[0];
      if (target) {
        setEditingCell({ stateId, symbol: sym, ruleId: target.id });
        setEditCommand(target.command);
        setEditTargetState(target.toState);
      } else {
        setEditingCell({ stateId, symbol: sym });
        setEditCommand('R');
        setEditTargetState(stateId);
      }
    }
  };

  const handleSaveCell = () => {
    if (!editingCell) return;
    const { stateId, symbol, ruleId } = editingCell;

    if (mode === '5-tuple') {
      if (ruleId) {
        updateFiveTupleRule(ruleId, {
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
      if (ruleId) {
        updateFourTupleRule(ruleId, {
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

  const handleAddNewRuleBranch = () => {
    if (!editingCell) return;
    const { stateId, symbol } = editingCell;
    if (mode === '5-tuple') {
      addFiveTupleRule({
        fromState: stateId,
        readSymbol: symbol,
        writeSymbol: editWrite,
        move: editMove,
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
    setEditingCell(null);
  };

  const handleDeleteActiveRule = () => {
    if (!editingCell?.ruleId) return;
    if (mode === '5-tuple') {
      deleteFiveTupleRule(editingCell.ruleId);
    } else {
      deleteFourTupleRule(editingCell.ruleId);
    }
    setEditingCell(null);
  };

  const handleClearAllCellRules = () => {
    if (!editingCell) return;
    const { stateId, symbol } = editingCell;
    if (mode === '5-tuple') {
      const existing = rules5.filter((r) => r.fromState === stateId && r.readSymbol === symbol);
      existing.forEach((r) => deleteFiveTupleRule(r.id));
    } else {
      const existing = rules4.filter((r) => r.fromState === stateId && r.readSymbol === symbol);
      existing.forEach((r) => deleteFourTupleRule(r.id));
    }
    setEditingCell(null);
  };

  // Find rules for currently selected cell in editing panel
  const currentCellRules = editingCell
    ? mode === '5-tuple'
      ? rules5.filter((r) => r.fromState === editingCell.stateId && r.readSymbol === editingCell.symbol)
      : rules4.filter((r) => r.fromState === editingCell.stateId && r.readSymbol === editingCell.symbol)
    : [];

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          Матрица Переходов (Символы ленты A × Состояния Q)
        </span>
        <span className="text-[11px] text-zinc-400">
          Кликните по ячейке для редактирования
        </span>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <table className="w-full border-collapse border border-zinc-200 dark:border-zinc-800 text-center font-mono">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
              <th className="p-2.5 border border-zinc-200 dark:border-zinc-700 bg-zinc-200/50 dark:bg-zinc-800/80">
                A \ Q
              </th>
              {stateNodes.map((n) => {
                const isCurrent = runtime.currentNodeId === n.id;
                return (
                  <th
                    key={n.id}
                    className={`p-2.5 border border-zinc-200 dark:border-zinc-700 min-w-[90px] ${
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
              <tr key={sym} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <td className="p-2 font-bold bg-zinc-100/70 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
                  {sym === alphabet.blankSymbol ? `${sym} (blank)` : sym}
                </td>

                {stateNodes.map((n) => {
                  let isCurrentCell = false;
                  let cellRules: { id: string; display: string }[] = [];

                  if (mode === '5-tuple') {
                    const matching = rules5.filter((r) => r.fromState === n.id && r.readSymbol === sym);
                    cellRules = matching.map((r) => ({
                      id: r.id,
                      display: `${r.writeSymbol}, ${r.move}, ${r.toState}`,
                    }));
                    if (matching.some((r) => runtime.activeRuleId === r.id)) {
                      isCurrentCell = true;
                    }
                  } else {
                    const matching = rules4.filter((r) => r.fromState === n.id && r.readSymbol === sym);
                    cellRules = matching.map((r) => ({
                      id: r.id,
                      display: `${r.command}, ${r.toState}`,
                    }));
                    if (matching.some((r) => runtime.activeRuleId === r.id)) {
                      isCurrentCell = true;
                    }
                  }

                  const isNonDeterministic = cellRules.length > 1;
                  const isSelectedForEdit =
                    editingCell?.stateId === n.id && editingCell?.symbol === sym;
                  const tooltipText = isNonDeterministic
                    ? `Недетерминированный переход (${cellRules.length} правил):\n` +
                      cellRules.map((r, i) => `${i + 1}) ${r.display}`).join('\n')
                    : cellRules[0]?.display;

                  return (
                    <td
                      key={n.id}
                      onClick={() => handleCellClick(n.id, sym)}
                      title={tooltipText}
                      className={`p-2 border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors text-xs ${
                        isCurrentCell
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                          : isSelectedForEdit
                          ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500'
                          : cellRules.length > 0
                          ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                          : 'text-zinc-300 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      {cellRules.length === 0 ? (
                        '—'
                      ) : cellRules.length === 1 ? (
                        cellRules[0].display
                      ) : (
                        <div className="flex flex-col gap-0.5 items-center">
                          <span className="truncate max-w-[120px] font-semibold text-[11px]">
                            {cellRules.map((r) => r.display).join(' | ')}
                          </span>
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/40">
                            Недетерм. ({cellRules.length})
                          </span>
                        </div>
                      )}
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
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Ячейка: <span className="font-mono text-sky-600">Q = {editingCell.stateId}</span>,{' '}
                <span className="font-mono text-sky-600">a = {editingCell.symbol}</span>
              </span>
              {currentCellRules.length > 1 && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  {currentCellRules.length} правил (недетерминизм)
                </span>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {editingCell.ruleId && (
                <button
                  type="button"
                  onClick={handleDeleteActiveRule}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-medium"
                  title="Удалить выбранное правило"
                >
                  Удалить правило
                </button>
              )}
              {currentCellRules.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearAllCellRules}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-medium"
                  title="Удалить все правила для этой ячейки"
                >
                  Очистить все
                </button>
              )}
              {currentCellRules.length <= 1 && (
                <button
                  type="button"
                  onClick={handleClearAllCellRules}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-medium"
                >
                  Очистить
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 font-medium"
              >
                Закрыть
              </button>
            </div>
          </div>

          {/* Rule switch tabs if multiple rules exist in this cell */}
          {currentCellRules.length > 1 && (
            <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1">
              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Правило:</span>
              {currentCellRules.map((r, idx) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleCellClick(editingCell.stateId, editingCell.symbol, r.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                    editingCell.ruleId === r.id
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300'
                  }`}
                >
                  #{idx + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setEditingCell({ stateId: editingCell.stateId, symbol: editingCell.symbol });
                  setEditWrite(editingCell.symbol);
                  setEditMove('R');
                  setEditCommand('R');
                  setEditTargetState(editingCell.stateId);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-colors ${
                  !editingCell.ruleId
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300'
                }`}
              >
                <Plus className="w-3 h-3" />
                <span>Новая ветвь</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 font-mono text-xs">
            {mode === '5-tuple' ? (
              <>
                <select
                  value={editWrite}
                  onChange={(e) => setEditWrite(e.target.value)}
                  className="px-2 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
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
                  className="px-2 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold"
                >
                  <option value="L">Сдвиг: L</option>
                  <option value="R">Сдвиг: R</option>
                  <option value="N">Сдвиг: N</option>
                </select>

                <select
                  value={editTargetState}
                  onChange={(e) => setEditTargetState(e.target.value)}
                  className="px-2 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
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
                  className="w-20 px-2 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-bold"
                />

                <select
                  value={editTargetState}
                  onChange={(e) => setEditTargetState(e.target.value)}
                  className="px-2 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                >
                  {stateNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      В сост: {n.data.label || n.id}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="ml-auto flex items-center gap-2">
              {currentCellRules.length > 0 && editingCell.ruleId && (
                <button
                  type="button"
                  onClick={handleAddNewRuleBranch}
                  className="px-2.5 py-1.5 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-sans font-medium text-xs transition-colors flex items-center gap-1"
                  title="Добавить как дополнительную ветвь (недетерминизм)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Ветвь</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveCell}
                className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-sans font-semibold text-xs transition-colors shadow-sm"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
