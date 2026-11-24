import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { OperationNodeData } from '../../types/turing';
import { useTuringStore } from '../../store/useTuringStore';
import {
  ArrowLeft,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  PenTool,
  Boxes,
  Play,
  Square,
} from 'lucide-react';
import clsx from 'clsx';

export const OperationNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as OperationNodeData;
  const runtimeCurrentNodeId = useTuringStore((s) => s.runtime.currentNodeId);
  const isCurrent = runtimeCurrentNodeId === id;

  const isStart = nodeData.opType === 'START';
  const isFinish = nodeData.opType === 'FINISH';

  const getOpBadge = () => {
    switch (nodeData.opType) {
      case 'START':
        return {
          icon: <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-current" />,
          label: 'START',
          code: '.',
          color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        };
      case 'FINISH':
        return {
          icon: <Square className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 fill-current" />,
          label: 'FINISH',
          code: 'HALT',
          color: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
        };
      case 'SHIFT_L':
        return {
          icon: <ArrowLeft className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
          label: 'Сдвиг L',
          code: 'l',
          color: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
        };
      case 'SHIFT_R':
        return {
          icon: <ArrowRight className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
          label: 'Сдвиг R',
          code: 'r',
          color: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
        };
      case 'SEARCH_L':
        return {
          icon: <ChevronsLeft className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
          label: 'Поиск L',
          code: 'L',
          color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        };
      case 'SEARCH_R':
        return {
          icon: <ChevronsRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
          label: 'Поиск R',
          code: 'R',
          color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        };
      case 'WRITE_SYM':
        return {
          icon: <PenTool className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />,
          label: `Запись [${nodeData.symbolToWrite ?? 'λ'}]`,
          code: `[${nodeData.symbolToWrite ?? 'λ'}]`,
          color: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400',
        };
      case 'COMPLEX_MACHINE':
        return {
          icon: <Boxes className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          label: nodeData.subMachineName || 'Подмашина',
          code: 'K',
          color: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        };
      default:
        return {
          icon: null,
          label: nodeData.label,
          code: '?',
          color: 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
        };
    }
  };

  const badge = getOpBadge();

  return (
    <div
      className={clsx(
        'relative group min-w-[120px] rounded-md px-3 py-2 select-none transition-colors border',
        isCurrent
          ? 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500 dark:border-amber-400 shadow-xs ring-1 ring-amber-500/40'
          : selected
          ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-500 ring-1 ring-sky-500/30'
          : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 shadow-xs',
        isFinish && 'outline outline-1 outline-offset-2 outline-rose-500/50'
      )}
    >
      {/* All four ports can start or receive wires (React Flow loose mode). */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!w-2.5 !h-2.5 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-white dark:!border-zinc-900 !rounded-full transition-all hover:!bg-sky-500 hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2.5 !h-2.5 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-white dark:!border-zinc-900 !rounded-full transition-all hover:!bg-sky-500 hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2.5 !h-2.5 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-white dark:!border-zinc-900 !rounded-full transition-all hover:!bg-sky-500 hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-2.5 !h-2.5 !bg-zinc-400 dark:!bg-zinc-500 !border-2 !border-white dark:!border-zinc-900 !rounded-full transition-all hover:!bg-sky-500 hover:!scale-125"
      />
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">{badge.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-xs font-bold truncate text-zinc-900 dark:text-zinc-100">
              {nodeData.label || badge.label}
            </span>
            <span
              className={clsx(
                'font-mono text-[10px] font-bold px-1 py-0.2 rounded border',
                badge.color
              )}
            >
              {badge.code}
            </span>
          </div>

          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            {badge.label}
          </div>
        </div>
      </div>

      {/* Discrete active execution badge */}
      {isCurrent && (
        <span className="absolute -top-2 right-2 px-1 py-0.2 rounded bg-amber-500 text-white font-mono text-[8px] font-bold tracking-wider shadow-xs">
          ACT
        </span>
      )}
    </div>
  );
});

OperationNode.displayName = 'OperationNode';
