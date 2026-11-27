import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { NodePorts } from './NodePorts';
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
  const subMachine = useTuringStore((s) =>
    s.projects.find((project) => project.id === s.activeProjectId)
      ?.subMachines.find((machine) => machine.id === nodeData.subMachineId)
  );
  const isCurrent = runtimeCurrentNodeId === id;

  const isFinish = nodeData.opType === 'FINISH';

  const getOpBadge = () => {
    switch (nodeData.opType) {
      case 'START':
        return {
          icon: <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-current" />,
          label: 'Начало',
          code: '.',
          color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        };
      case 'FINISH':
        return {
          icon: <Square className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 fill-current" />,
          label: 'Конец',
          code: 'HALT',
          color: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
        };
      case 'SHIFT_L':
        return {
          icon: <ArrowLeft className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
          label: 'Сдвиг влево',
          code: 'l',
          color: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
        };
      case 'SHIFT_R':
        return {
          icon: <ArrowRight className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
          label: 'Сдвиг вправо',
          code: 'r',
          color: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
        };
      case 'SEARCH_L':
        return {
          icon: <ChevronsLeft className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
          label: 'Влево на слово',
          code: 'L',
          color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        };
      case 'SEARCH_R':
        return {
          icon: <ChevronsRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />,
          label: 'Вправо на слово',
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
          label: subMachine?.description || nodeData.description || nodeData.subMachineName || 'Подмашина',
          code: subMachine?.code || '?',
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
      data-export-current-node={isCurrent ? '' : undefined}
      className={clsx(
        'relative group w-[190px] rounded-md px-2.5 py-1.5 select-none transition-colors border cursor-grab active:cursor-grabbing',
        isCurrent
          ? 'bg-amber-500/10 dark:bg-amber-400/10 border-amber-500 dark:border-amber-400 shadow-sm ring-1 ring-amber-500/40'
          : selected
          ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-500 ring-1 ring-sky-500/30'
          : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 shadow-sm',
        isFinish && 'outline outline-1 outline-offset-2 outline-rose-500/50'
      )}
    >
      <NodePorts id={id} />
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">{badge.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-xs font-bold truncate text-zinc-900 dark:text-zinc-100">
              {nodeData.label || badge.label}
            </span>
            <span
              className={clsx(
                'font-mono text-[10px] font-bold px-1 py-0.5 rounded border',
                badge.color
              )}
            >
              {badge.code}
            </span>
          </div>

          <div title={badge.label} className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
            {badge.label}
          </div>
        </div>
      </div>

      {/* Discrete active execution badge */}
      {isCurrent && (
        <span data-export-current-badge="" className="absolute -top-2 right-2 px-1 py-0.5 rounded bg-amber-500 text-white font-mono text-[8px] font-bold tracking-wider shadow-sm">
          ACT
        </span>
      )}
    </div>
  );
});

OperationNode.displayName = 'OperationNode';
