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
        'relative group min-w-[120px] rounded-xl px-4 py-2.5 transition-all duration-200 border-2 select-none shadow-md backdrop-blur-md',
        // Background & border
        isCurrent
          ? 'bg-amber-500/20 border-amber-400 ring-4 ring-amber-400/30 scale-105'
          : selected
          ? 'bg-sky-500/15 border-sky-400 ring-2 ring-sky-400/40'
          : 'bg-white/90 dark:bg-slate-900/90 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500',
        // Double ring effect for halt/final states
        isFinal && 'ring-2 ring-offset-2 ring-offset-slate-900 ring-slate-400 dark:ring-slate-500'
      )}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-3 !h-3 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-3 !h-3 !bg-sky-500 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-125"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900 !rounded-full transition-transform hover:!scale-125"
      />

      {/* Header with state indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isInitial && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Play className="w-3 h-3 fill-current" />
            </span>
          )}
          {isAccept && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          )}
          {isReject && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
              <XCircle className="w-3.5 h-3.5" />
            </span>
          )}
          {isHalt && !isAccept && !isReject && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <CircleDot className="w-3.5 h-3.5" />
            </span>
          )}

          <span
            className={clsx(
              'font-mono text-base font-bold tracking-tight',
              isCurrent
                ? 'text-amber-600 dark:text-amber-300'
                : 'text-slate-800 dark:text-slate-100'
            )}
          >
            {nodeData.label || id}
          </span>
        </div>

        {/* State type badge */}
        <span
          className={clsx(
            'text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded',
            isInitial && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            isHalt && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            isAccept && 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
            isReject && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
            !isInitial && !isFinal && 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          )}
        >
          {nodeData.stateType}
        </span>
      </div>

      {nodeData.description && (
        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
          {nodeData.description}
        </div>
      )}

      {/* Active runtime indicator dot */}
      {isCurrent && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
        </span>
      )}
    </div>
  );
});

StateNode.displayName = 'StateNode';
