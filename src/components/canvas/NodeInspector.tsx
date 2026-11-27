import React, { useEffect, useRef, useState } from 'react';
import { useTuringStore, useActiveProject } from '../../store/useTuringStore';
import { StateNodeType, OperationalNodeType, StateNodeData, OperationNodeData } from '../../types/turing';
import {
  X,
  Trash2,
  Sliders,
  GripHorizontal,
} from 'lucide-react';

export const NodeInspector: React.FC = () => {
  const selectedNodeId = useTuringStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useTuringStore((s) => s.setSelectedNodeId);
  const updateNodeData = useTuringStore((s) => s.updateNodeData);
  const deleteNode = useTuringStore((s) => s.deleteNode);
  const project = useActiveProject();

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  const labelInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key (only when Check/Tests dropdown is not open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useTuringStore.getState().isInspectorOpen) {
        setSelectedNodeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedNodeId]);

  if (!selectedNodeId) return null;

  const node = project.nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const isStateNode = node.type === 'stateNode' || !node.type;
  const isOperationNode = node.type === 'operationNode';

  const stateData = isStateNode ? (node.data as unknown as StateNodeData) : null;
  const opData = isOperationNode ? (node.data as unknown as OperationNodeData) : null;

  const allSymbols = [...project.alphabet.symbols, project.alphabet.blankSymbol];

  const handleDelete = () => {
    deleteNode(node.id);
    setSelectedNodeId(null);
  };

  const handleClose = () => {
    setSelectedNodeId(null);
  };

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    const currentX = position ? position.x : 0;
    const currentY = position ? position.y : 0;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.posX + dx,
        y: dragRef.current.posY + dy,
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      style={position ? { transform: `translate(${position.x}px, ${position.y}px)` } : undefined}
      className="absolute top-14 right-3 z-20 w-72 max-w-[calc(100%-1.5rem)] rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg p-3.5 text-xs"
    >
      {/* Draggable Header */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="flex items-center justify-between pb-2.5 border-b border-zinc-200 dark:border-zinc-800 cursor-move select-none"
        title="Зажмите и перетащите для перемещения окна"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" />
          <Sliders className="w-3.5 h-3.5 text-zinc-500" />
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
              Свойства узла
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px]">
              <span className="text-zinc-600 dark:text-zinc-400 font-bold">
                {node.id}
              </span>
              <span className="text-zinc-400 dark:text-zinc-500">
                • {isStateNode ? 'State' : 'Op'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDelete}
            className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Удалить этот узел и связанные переходы"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Закрыть панель (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* State Node Editor */}
      {isStateNode && stateData && (
        <div className="mt-3 space-y-2.5">
          {/* Label field */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Название / Метка
            </label>
            <input
              ref={labelInputRef}
              type="text"
              value={stateData.label ?? node.id}
              onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
              className="w-full px-2 py-1 font-mono text-xs rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-sky-500"
              placeholder={node.id}
            />
          </div>

          {/* State Type dropdown */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Тип состояния
            </label>
            <select
              value={stateData.stateType || 'normal'}
              onChange={(e) =>
                updateNodeData(node.id, { stateType: e.target.value as StateNodeType })
              }
              className="w-full px-2 py-1 text-xs rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-sky-500 font-mono"
            >
              <option value="normal">normal — Промежуточное</option>
              <option value="initial">initial — Начальное (Start)</option>
              <option value="halt">halt — Останов (Halt)</option>
              <option value="accept">accept — Допускающее (Accept)</option>
              <option value="reject">reject — Отвергающее (Reject)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Примечание
            </label>
            <textarea
              rows={2}
              value={stateData.description || ''}
              onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
              className="w-full px-2 py-1 text-xs rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-sky-500 resize-none font-sans"
              placeholder="Необязательное описание..."
            />
          </div>
        </div>
      )}

      {/* Operation Node Editor */}
      {isOperationNode && opData && (
        <div className="mt-3 space-y-2.5">
          {/* Op Type */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Тип операции
            </label>
            <select
              value={opData.opType}
              onChange={(e) => {
                const newOp = e.target.value as OperationalNodeType;
                const updates: Record<string, unknown> = { opType: newOp };
                if (newOp === 'WRITE_SYM' && !opData.symbolToWrite) {
                  const firstSym = allSymbols[0] || '1';
                  updates.symbolToWrite = firstSym;
                  updates.label = `[${firstSym}]`;
                }
                updateNodeData(node.id, updates);
              }}
              className="w-full px-2 py-1 text-xs rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-sky-500 font-mono font-medium"
            >
              <option value="START">START — Точка входа</option>
              <option value="FINISH">FINISH — Останов</option>
              <option value="SHIFT_L">SHIFT_L — Сдвиг влево (l)</option>
              <option value="SHIFT_R">SHIFT_R — Сдвиг вправо (r)</option>
              <option value="SEARCH_L">SEARCH_L — Поиск влево (L)</option>
              <option value="SEARCH_R">SEARCH_R — Поиск вправо (R)</option>
              <option value="WRITE_SYM">WRITE_SYM — Запись [a]</option>
              <option value="COMPLEX_MACHINE">COMPLEX_MACHINE — Подмашина</option>
            </select>
          </div>

          {/* Label field */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Метка узла
            </label>
            <input
              ref={labelInputRef}
              type="text"
              value={opData.label ?? ''}
              onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
              className="w-full px-2 py-1 font-mono text-xs rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-sky-500"
              placeholder="Метка..."
            />
          </div>

          {/* symbolToWrite for WRITE_SYM */}
          {opData.opType === 'WRITE_SYM' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Записываемый символ
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={opData.symbolToWrite ?? allSymbols[0]}
                  onChange={(e) =>
                    updateNodeData(node.id, {
                      symbolToWrite: e.target.value,
                      label: `[${e.target.value}]`,
                    })
                  }
                  className="flex-1 px-2 py-1 font-mono text-xs rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-sky-500 font-bold"
                >
                  {allSymbols.map((s) => (
                    <option key={s} value={s}>
                      {s === project.alphabet.blankSymbol ? `${s} (blank)` : s}
                    </option>
                  ))}
                </select>
                <span className="font-mono text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-bold">
                  [{opData.symbolToWrite ?? allSymbols[0]}]
                </span>
              </div>
            </div>
          )}

          {/* SubMachine selection for COMPLEX_MACHINE */}
          {opData.opType === 'COMPLEX_MACHINE' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Подмашина
              </label>
              {project.subMachines && project.subMachines.length > 0 ? (
                <select
                  value={opData.subMachineId || ''}
                  onChange={(e) => {
                    const sm = project.subMachines?.find((m) => m.id === e.target.value);
                    updateNodeData(node.id, {
                      subMachineId: e.target.value,
                      subMachineName: sm?.name || e.target.value,
                      label: sm?.name || e.target.value,
                    });
                  }}
                  className="w-full px-2 py-1 text-xs rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-sky-500 font-mono"
                >
                  <option value="">-- Выберите подмашину --</option>
                  {project.subMachines.map((sm) => (
                    <option key={sm.id} value={sm.id}>
                      {sm.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-[11px] text-zinc-400 p-2 rounded bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  Нет подмашин в проекте.
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Примечание
            </label>
            <textarea
              rows={2}
              value={opData.description || ''}
              onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
              className="w-full px-2 py-1 text-xs rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-sky-500 resize-none font-sans"
              placeholder="Необязательное описание..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
