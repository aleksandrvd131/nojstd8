import { roundedWire, type Wire } from '../../engine/wireLayout';
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
    const deleteEdgeRule = useTuringStore((s) => s.deleteEdgeRule);
    const mode = edgeData?.mode || '5-tuple';
    const subMode = edgeData?.subMode;
    const isActive = runtimeActiveEdgeId === id;

    const wire = edgeData?.wire as Wire | undefined;
    const [edgePath, labelX, labelY] = wire ? [
      roundedWire([{ x: sourceX, y: sourceY }, ...wire.points.slice(1, -1), { x: targetX, y: targetY }]),
      wire.label.x, wire.label.y,
    ] : getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

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
      } else if (subMode === 'operational') {
        deleteEdgeRule(id, ruleId);
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
              : '#71717a',
            strokeWidth: isActive ? 2.5 : selected ? 2 : 1.5,
            strokeDasharray: isActive ? '5 4' : undefined,
            transition: 'stroke 0.15s, stroke-width 0.15s',
          }}
        />

        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="flex items-center justify-center z-20"
          >
            <div className="flex max-w-[240px] flex-wrap items-center justify-center gap-1 rounded-full border border-zinc-200/90 bg-white/95 px-1.5 py-1 shadow-md backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
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
                      'group/pill flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono font-medium cursor-pointer transition-colors',
                      isActive
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-bold'
                        : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                    )}
                    title="Нажмите для редактирования правила"
                  >
                    <span>{text}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRule(e, rule.id)}
                      className="opacity-0 group-hover/pill:opacity-100 text-zinc-400 hover:text-rose-500 transition-opacity ml-0.5"
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
                className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                title="Добавить правило перехода"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);

CustomTransitionEdge.displayName = 'CustomTransitionEdge';
