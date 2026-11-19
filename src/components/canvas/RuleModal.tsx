import React, { useState, useEffect } from 'react';
import { useTuringStore, useActiveProject } from '../../store/useTuringStore';
import { MoveDirection } from '../../types/turing';
import { X, Trash2, Check } from 'lucide-react';

export const RuleModal: React.FC = () => {
  const isRuleModalOpen = useTuringStore((s) => s.isRuleModalOpen);
  const ruleModalData = useTuringStore((s) => s.ruleModalData);
  const closeRuleModal = useTuringStore((s) => s.closeRuleModal);

  const addFiveTupleRule = useTuringStore((s) => s.addFiveTupleRule);
  const updateFiveTupleRule = useTuringStore((s) => s.updateFiveTupleRule);
  const deleteFiveTupleRule = useTuringStore((s) => s.deleteFiveTupleRule);

  const addFourTupleRule = useTuringStore((s) => s.addFourTupleRule);
  const updateFourTupleRule = useTuringStore((s) => s.updateFourTupleRule);
  const deleteFourTupleRule = useTuringStore((s) => s.deleteFourTupleRule);
  const deleteEdgeRule = useTuringStore((s) => s.deleteEdgeRule);

  const project = useActiveProject();
  const { mode, subMode, alphabet } = project;
  const allSymbols = [...alphabet.symbols, alphabet.blankSymbol];

  const [readSymbol, setReadSymbol] = useState(allSymbols[0] || '0');
  const [writeSymbol, setWriteSymbol] = useState(allSymbols[0] || '0');
  const [move, setMove] = useState<MoveDirection>('R');

  // For 4-tuple
  const [fourCommandType, setFourCommandType] = useState<'move' | 'write'>('move');
  const [fourMove, setFourMove] = useState<MoveDirection>('R');
  const [fourWriteSym, setFourWriteSym] = useState(allSymbols[0] || '0');

  // For operational
  const [isWildcard, setIsWildcard] = useState(false);

  useEffect(() => {
    if (!ruleModalData) return;

    if (ruleModalData.ruleId) {
      if (mode === '5-tuple') {
        const existing = project.rules5.find((r) => r.id === ruleModalData.ruleId);
        if (existing) {
          setReadSymbol(existing.readSymbol);
          setWriteSymbol(existing.writeSymbol);
          setMove(existing.move);
        }
      } else {
        const existing = project.rules4.find((r) => r.id === ruleModalData.ruleId);
        if (existing) {
          setReadSymbol(existing.readSymbol);
          if (existing.command === 'L' || existing.command === 'R' || existing.command === 'N') {
            setFourCommandType('move');
            setFourMove(existing.command as MoveDirection);
          } else {
            setFourCommandType('write');
            setFourWriteSym(existing.command);
          }
        }
      }
    } else {
      // Default to first symbol
      setReadSymbol(allSymbols[0] || '0');
      setWriteSymbol(allSymbols[0] || '0');
      setMove('R');
      setFourMove('R');
      setFourWriteSym(allSymbols[0] || '0');
      setIsWildcard(false);
    }
  }, [ruleModalData, project, mode]);

  if (!isRuleModalOpen || !ruleModalData) return null;

  const sourceNode = project.nodes.find((n) => n.id === ruleModalData.sourceNodeId);
  const targetNode = project.nodes.find((n) => n.id === ruleModalData.targetNodeId);
  const sourceLabel = sourceNode?.data.label || ruleModalData.sourceNodeId;
  const targetLabel = targetNode?.data.label || ruleModalData.targetNodeId;

  const handleSave = () => {
    if (!ruleModalData.sourceNodeId || !ruleModalData.targetNodeId) return;

    if (mode === '5-tuple') {
      if (ruleModalData.ruleId) {
        updateFiveTupleRule(ruleModalData.ruleId, {
          readSymbol,
          writeSymbol,
          move,
          toState: ruleModalData.targetNodeId,
        });
      } else {
        addFiveTupleRule({
          fromState: ruleModalData.sourceNodeId,
          readSymbol,
          writeSymbol,
          move,
          toState: ruleModalData.targetNodeId,
        });
      }
    } else if (mode === '4-tuple' && subMode === 'state-graph') {
      const command = fourCommandType === 'move' ? fourMove : fourWriteSym;
      if (ruleModalData.ruleId) {
        updateFourTupleRule(ruleModalData.ruleId, {
          readSymbol,
          command,
          toState: ruleModalData.targetNodeId,
        });
      } else {
        addFourTupleRule({
          fromState: ruleModalData.sourceNodeId,
          readSymbol,
          command,
          toState: ruleModalData.targetNodeId,
        });
      }
    } else {
      // Operational diagram: update edge rule item
      const edge = project.edges.find((e) => e.id === ruleModalData.edgeId);
      const symbolCondition = isWildcard ? '*' : readSymbol;

      useTuringStore.getState().updateActiveProject((prev) => {
        const edgeId = ruleModalData.edgeId || `e_${ruleModalData.sourceNodeId}_${ruleModalData.targetNodeId}`;
        const existingEdge = prev.edges.find((e) => e.id === edgeId);

        const newRuleItem = {
          id: ruleModalData.ruleId || `r_op_${Date.now()}`,
          readSymbol: symbolCondition,
          isWildcard,
        };

        if (existingEdge) {
          return {
            ...prev,
            edges: prev.edges.map((e) => {
              if (e.id === edgeId) {
                const rules = e.data?.rules || [];
                const updatedRules = ruleModalData.ruleId
                  ? rules.map((r) => (r.id === ruleModalData.ruleId ? newRuleItem : r))
                  : [...rules, newRuleItem];
                return {
                  ...e,
                  data: {
                    ...e.data,
                    mode: e.data?.mode || prev.mode,
                    subMode: e.data?.subMode || prev.subMode,
                    rules: updatedRules,
                  },
                };
              }
              return e;
            }),
          };
        } else {
          return {
            ...prev,
            edges: [
              ...prev.edges,
              {
                id: edgeId,
                source: ruleModalData.sourceNodeId!,
                target: ruleModalData.targetNodeId!,
                type: 'customTransition',
                data: {
                  mode: prev.mode,
                  subMode: prev.subMode,
                  rules: [newRuleItem],
                },
              },
            ],
          };
        }
      });
    }

    closeRuleModal();
  };

  const handleDelete = () => {
    if (!ruleModalData.ruleId) return;
    if (mode === '5-tuple') {
      deleteFiveTupleRule(ruleModalData.ruleId);
    } else if (subMode === 'operational') {
      if (ruleModalData.edgeId) {
        deleteEdgeRule(ruleModalData.edgeId, ruleModalData.ruleId);
      } else {
        deleteFourTupleRule(ruleModalData.ruleId);
      }
    } else {
      deleteFourTupleRule(ruleModalData.ruleId);
    }
    closeRuleModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 text-xs">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {ruleModalData.ruleId ? 'Редактирование правила' : 'Новый переход'}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
              <span>{sourceLabel}</span> → <span>{targetLabel}</span>
            </p>
          </div>
          <button
            onClick={closeRuleModal}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="mt-4 space-y-4">
          {/* Read symbol */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Считанный символ (Read Symbol)
            </label>
            {subMode === 'operational' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="wildcard"
                    checked={isWildcard}
                    onChange={(e) => setIsWildcard(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                  <label htmlFor="wildcard" className="text-sm text-zinc-700 dark:text-zinc-300">
                    Любой символ ленты (<span className="font-mono font-bold">*</span>)
                  </label>
                </div>
                {!isWildcard && (
                  <select
                    value={readSymbol}
                    onChange={(e) => setReadSymbol(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {allSymbols.map((sym) => (
                      <option key={sym} value={sym}>
                        {sym === alphabet.blankSymbol ? `${sym} (blank)` : sym}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <select
                value={readSymbol}
                onChange={(e) => setReadSymbol(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {allSymbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym === alphabet.blankSymbol ? `${sym} (пустой / blank)` : sym}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 5-Tuple specifics */}
          {mode === '5-tuple' && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Записываемый символ (Write Symbol)
                </label>
                <select
                  value={writeSymbol}
                  onChange={(e) => setWriteSymbol(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {allSymbols.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym === alphabet.blankSymbol ? `${sym} (пустой / blank)` : sym}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Сдвиг головки (Move)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['L', 'N', 'R'] as MoveDirection[]).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => setMove(dir)}
                      className={`py-2 text-sm font-mono font-bold rounded-lg border transition-all ${
                        move === dir
                          ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-sky-300'
                      }`}
                    >
                      {dir === 'L' ? '← L (Влево)' : dir === 'R' ? '→ R (Вправо)' : '• N (Стоять)'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 4-Tuple specifics (State Graph) */}
          {mode === '4-tuple' && subMode === 'state-graph' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Команда (Command: Сдвиг или Запись)
              </label>

              <div className="flex rounded-lg p-1 bg-zinc-100 dark:bg-zinc-800 mb-3">
                <button
                  type="button"
                  onClick={() => setFourCommandType('move')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    fourCommandType === 'move'
                      ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Сдвиг головки (L / R / N)
                </button>
                <button
                  type="button"
                  onClick={() => setFourCommandType('write')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    fourCommandType === 'write'
                      ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  Запись символа
                </button>
              </div>

              {fourCommandType === 'move' ? (
                <div className="grid grid-cols-3 gap-2">
                  {(['L', 'N', 'R'] as MoveDirection[]).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => setFourMove(dir)}
                      className={`py-2 text-sm font-mono font-bold rounded-lg border transition-all ${
                        fourMove === dir
                          ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-sky-300'
                      }`}
                    >
                      {dir === 'L' ? '← L' : dir === 'R' ? '→ R' : '• N'}
                    </button>
                  ))}
                </div>
              ) : (
                <select
                  value={fourWriteSym}
                  onChange={(e) => setFourWriteSym(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {allSymbols.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym === alphabet.blankSymbol ? `${sym} (пустой / blank)` : sym}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          {ruleModalData.ruleId ? (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Удалить
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeRuleModal}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
