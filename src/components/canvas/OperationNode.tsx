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
  PlayCircle,
  StopCircle,
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
          icon: <PlayCircle className="w-4 h-4 text-emerald-500" />,
          label: 'START',
          code: '.',
          color: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        };
      case 'FINISH':
        return {
          icon: <StopCircle className="w-4 h-4 text-rose-500" />,
          label: 'FINISH',
          code: 'HALT',
          color: 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400',
        };
      case 'SHIFT_L':
        return {
          icon: <ArrowLeft className="w-4 h-4 text-sky-500" />,
          label: 'Сдвиг L',
          code: 'l',
          color: 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400',
        };
      case 'SHIFT_R':
        return {
          icon: <ArrowRight className="w-4 h-4 text-sky-500" />,
          label: 'Сдвиг R',
          code: 'r',
          color: 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400',
        };
      case 'SEARCH_L':
        return {
          icon: <ChevronsLeft className="w-4 h-4 text-indigo-500" />,
          label: 'Поиск влево',
          code: 'L',
          color: 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        };
      case 'SEARCH_R':
        return {
          icon: <ChevronsRight className="w-4 h-4 text-indigo-500" />,
          label: 'Поиск вправо',
          code: 'R',
          color: 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        };
      case 'WRITE_SYM':
        return {
          icon: <PenTool className="w-4 h-4 text-violet-500" />,
          label: `Запись [${nodeData.symbolToWrite ?? 'λ'}]`,
          code: `[${nodeData.symbolToWrite ?? 'λ'}]`,
          color: 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400',
        };
      case 'COMPLEX_MACHINE':
        return {
          icon: <Boxes className="w-4 h-4 text-amber-500" />,
          label: nodeData.subMachineName || 'Подмашина',
          code: 'K',
          color: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        };
      default:
        return {
          icon: null,
          label: nodeData.label,
          code: '?',
          color: 'border-slate-500 bg-slate-500/10 text-slate-600 dark:text-slate-400',
        };
    }
  };

  const badge = getOpBadge();

  return (
    <div
      className={clsx(
        'relative group min-w-[130px] rounded-xl px-3.5 py-2.5 transition-all duration-200 border-2 select-none shadow-md backdrop-blur-md',
        isCurrent
          ? 'bg-amber-500/20 border-amber-400 ring-4 ring-amber-400/30 scale-105'
          : selected
          ? 'bg-sky-500/15 border-sky-400 ring-2 ring-sky-400/40'
          : 'bg-white/95 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500',
        isFinish && 'ring-2 ring-offset-2 ring-offset-slate-900 ring-rose-500/50'
      )}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900 !rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-white dark:!border-slate-900 !rounded-full"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-white dark:!border-slate-900 !rounded-full"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900 !rounded-full"
      />

      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">{badge.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-xs font-bold truncate text-slate-800 dark:text-slate-100">
              {nodeData.label || badge.label}
            </span>
            <span
              className={clsx(
                'font-mono text-[11px] font-extrabold px-1.5 py-0.2 rounded border',
                badge.color
              )}
            >
              {badge.code}
            </span>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {badge.label}
          </div>
        </div>
      </div>

      {isCurrent && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
        </span>
      )}
    </div>
  );
});

OperationNode.displayName = 'OperationNode';
