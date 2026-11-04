import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { CustomEdgeData, EdgeRuleItem } from '../../types/turing';
import { useTuringStore } from '../../store/useTuringStore';
import { Plus, X } from 'lucide-react';
import clsx from 'clsx';

export const CustomTransitionEdge = memo(
  ({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
    markerEnd,
  }: EdgeProps) => {
    const edgeData = data as unknown as CustomEdgeData;
    const runtimeActiveEdgeId = useTuringStore((s) => s.runtime.activeEdgeId);
    const openRuleModal = useTuringStore((s) => s.openRuleModal);
    const deleteFiveTupleRule = useTuringStore((s) => s.deleteFiveTupleRule);
    const deleteFourTupleRule = useTuringStore((s) => s.deleteFourTupleRule);
    const mode = edgeData?.mode || '5-tuple';
    const subMode = edgeData?.subMode;
    const isActive = runtimeActiveEdgeId === id;

    const isSelfLoop = source === target;
    const isBiDirectional = !!edgeData?.isBiDirectional;
    const offsetDir = edgeData?.offsetDirection || 1;

    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    if (isSelfLoop) {
      // Loop curve above the node
      const loopHeight = 70;
      const loopWidth = 40;
      edgePath = `M ${sourceX - 12} ${sourceY} C ${sourceX - loopWidth} ${
        sourceY - loopHeight
      }, ${sourceX + loopWidth} ${sourceY - loopHeight}, ${sourceX + 12} ${sourceY}`;
      labelX = sourceX;
      labelY = sourceY - loopHeight + 8;
    } else if (isBiDirectional) {
      // Offset curved path for bi-directional transitions
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const curvature = 36 * offsetDir;

      const midX = (sourceX + targetX) / 2 + nx * curvature;
      const midY = (sourceY + targetY) / 2 + ny * curvature;

      edgePath = `M ${sourceX} ${sourceY} Q ${midX} ${midY} ${targetX} ${targetY}`;
      labelX = midX;
      labelY = midY;
    } else {
      const [bezierPath, bx, by] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
      edgePath = bezierPath;
      labelX = bx;
      labelY = by;
    }

    const rules: EdgeRuleItem[] = edgeData?.rules || [];

    const handleRuleClick = (e: React.MouseEvent, rule: EdgeRuleItem) => {
      e.stopPropagation();
      openRuleModal({
        edgeId: id,
        sourceNodeId: source,
        targetNodeId: target,
        ruleId: rule.id,
      });
    };

    const handleAddRuleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      openRuleModal({
        edgeId: id,
        sourceNodeId: source,
        targetNodeId: target,
      });
    };

    const handleDeleteRule = (e: React.MouseEvent, ruleId: string) => {
      e.stopPropagation();
      if (mode === '5-tuple') {
        deleteFiveTupleRule(ruleId);
      } else {
        deleteFourTupleRule(ruleId);
      }
    };

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            stroke: isActive
              ? '#f59e0b'
              : selected
              ? '#0284c7'
              : '#64748b',
            strokeWidth: isActive ? 3 : selected ? 2.5 : 1.8,
            strokeDasharray: isActive ? '6 4' : undefined,
            transition: 'stroke 0.2s, stroke-width 0.2s',
          }}
        />

        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="flex flex-col items-center gap-1 z-10"
          >
            <div className="flex flex-wrap items-center justify-center gap-1 max-w-[200px] p-1 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 shadow-md backdrop-blur-sm">
              {rules.map((rule) => {
                let text = '';
                if (mode === '5-tuple') {
                  const write = rule.writeSymbol ?? rule.readSymbol;
                  const move = rule.move ?? 'N';
                  text = `${rule.readSymbol} → ${write}, ${move}`;
                } else if (subMode === 'operational') {
                  text = rule.isWildcard ? '*' : rule.readSymbol;
                } else {
                  text = `${rule.readSymbol} : ${rule.command || 'N'}`;
                }

                return (
                  <div
                    key={rule.id}
                    onClick={(e) => handleRuleClick(e, rule)}
                    className={clsx(
                      'group/pill flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium cursor-pointer transition-all',
                      isActive
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400'
                        : 'bg-slate-100 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-sky-950 text-slate-700 dark:text-slate-200 border border-transparent hover:border-sky-300 dark:hover:border-sky-700'
                    )}
                    title="Нажмите для редактирования правила"
                  >
                    <span>{text}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRule(e, rule.id)}
                      className="opacity-0 group-hover/pill:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity ml-0.5"
                      title="Удалить правило"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddRuleClick}
                className="flex items-center justify-center w-5 h-5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-sky-500 transition-colors"
                title="Добавить правило перехода"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);

CustomTransitionEdge.displayName = 'CustomTransitionEdge';
