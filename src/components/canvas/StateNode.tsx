import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { StateNodeData } from '../../types/turing';
import { useTuringStore } from '../../store/useTuringStore';
import { Play, CheckCircle2, XCircle, CircleDot } from 'lucide-react';
import clsx from 'clsx';

export const StateNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as StateNodeData;
  const runtimeCurrentNodeId = useTuringStore((s) => s.runtime.currentNodeId);
  const isCurrent = runtimeCurrentNodeId === id;

  const isInitial = nodeData.stateType === 'initial';
  const isHalt = nodeData.stateType === 'halt';
  const isAccept = nodeData.stateType === 'accept';
  const isReject = nodeData.stateType === 'reject';
  const isFinal = isHalt || isAccept || isReject;

  return (
    <div
      className={clsx(
        'relative group min-w-[110px] rounded-md px-3 py-2 select-none transition-colors border cursor-grab active:cursor-grabbing',
        // Background and border
        isCurrent
          ? 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500 dark:border-amber-400 shadow-xs ring-1 ring-amber-500/40'
          : selected
          ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-500 ring-1 ring-sky-500/30'
          : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 shadow-xs',
        // Classical Automata theory double-border for halt/accept/reject states
        isFinal && 'outline outline-1 outline-offset-2 outline-zinc-400 dark:outline-zinc-600'
      )}
    >
      {/* Precision Port Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-zinc-400 dark:!bg-zinc-500 !border !border-white dark:!border-zinc-900 !rounded-xs transition-colors hover:!bg-sky-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !bg-zinc-400 dark:!bg-zinc-500 !border !border-white dark:!border-zinc-900 !rounded-xs transition-colors hover:!bg-sky-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-zinc-400 dark:!bg-zinc-500 !border !border-white dark:!border-zinc-900 !rounded-xs transition-colors hover:!bg-sky-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-zinc-400 dark:!bg-zinc-500 !border !border-white dark:!border-zinc-900 !rounded-xs transition-colors hover:!bg-sky-500"
      />

      {/* Header with state indicator */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {isInitial && (
            <span className="flex-shrink-0 text-emerald-600 dark:text-emerald-400" title="Начальное состояние">
              <Play className="w-3 h-3 fill-current" />
            </span>
          )}
          {isAccept && (
            <span className="flex-shrink-0 text-teal-600 dark:text-teal-400" title="Допускающее состояние">
              <CheckCircle2 className="w-3 h-3" />
            </span>
          )}
          {isReject && (
            <span className="flex-shrink-0 text-rose-600 dark:text-rose-400" title="Отвергающее состояние">
              <XCircle className="w-3 h-3" />
            </span>
          )}
          {isHalt && !isAccept && !isReject && (
            <span className="flex-shrink-0 text-amber-600 dark:text-amber-400" title="Состояние останова">
              <CircleDot className="w-3 h-3" />
            </span>
          )}

          <span
            className={clsx(
              'font-mono text-xs font-bold tracking-tight truncate',
              isCurrent
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-zinc-900 dark:text-zinc-100'
            )}
          >
            {nodeData.label || id}
          </span>
        </div>

        {/* State type badge */}
        <span
          className={clsx(
            'text-[9px] uppercase font-mono font-medium px-1 py-0.2 rounded border flex-shrink-0',
            isInitial && 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
            isHalt && 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10',
            isAccept && 'border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/10',
            isReject && 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10',
            !isInitial && !isFinal && 'border-zinc-200 dark:border-zinc-700 text-zinc-500 bg-zinc-100 dark:bg-zinc-800'
          )}
        >
          {nodeData.stateType}
        </span>
      </div>

      {nodeData.description && (
        <div className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-sans">
          {nodeData.description}
        </div>
      )}

      {/* Discrete active execution badge */}
      {isCurrent && (
        <span className="absolute -top-2 right-2 px-1 py-0.2 rounded bg-amber-500 text-white font-mono text-[8px] font-bold tracking-wider shadow-xs">
          ACT
        </span>
      )}
    </div>
  );
});

StateNode.displayName = 'StateNode';
