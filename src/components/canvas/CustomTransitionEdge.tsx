import React, { memo, useState, useRef } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { CustomEdgeData, EdgeRuleItem } from '../../types/turing';
import { useTuringStore } from '../../store/useTuringStore';
import { Plus, X, GripVertical } from 'lucide-react';
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

    const isSelfLoop = source === target;
    const isBiDirectional = !!edgeData?.isBiDirectional;

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
      // Normal vector (nx, ny) naturally reverses when source and target swap.
      // Using a constant curvature offsets each directed edge to its own right side,
      // avoiding duplicate offsetDir inversion that caused bidirectional edges to overlap.
      const curvature = 36;

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
      } else if (subMode === 'operational') {
        deleteEdgeRule(id, ruleId);
      } else {
        deleteFourTupleRule(ruleId);
      }
    };

    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragRef = useRef<{
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    } | null>(null);

    const handleDragStart = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, .group\\/pill')) return;
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: offset.x,
        originY: offset.y,
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        setOffset({
          x: dragRef.current.originX + (moveEvent.clientX - dragRef.current.startX),
          y: dragRef.current.originY + (moveEvent.clientY - dragRef.current.startY),
        });
      };

      const onMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const showActionWindow = !!(selected || isActive);

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          interactionWidth={24}
          style={{
            stroke: isActive
              ? '#f59e0b'
              : selected
              ? '#0284c7'
              : '#71717a',
            strokeWidth: isActive ? 2.5 : selected ? 2 : 1.5,
            strokeDasharray: isActive ? '5 4' : undefined,
            cursor: 'pointer',
            transition: 'stroke 0.15s, stroke-width 0.15s',
          }}
        />

        {showActionWindow && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX + offset.x}px,${labelY + offset.y}px)`,
                pointerEvents: 'all',
              }}
              className="flex flex-col items-center gap-1 z-20 animate-in fade-in zoom-in-95 duration-100"
            >
              <div
                onMouseDown={handleDragStart}
                className="flex flex-wrap items-center justify-center gap-1 max-w-[240px] p-1.5 rounded-md bg-white/95 dark:bg-zinc-900/95 border border-sky-400 dark:border-sky-500 shadow-md cursor-move select-none"
                title="Окно действий перехода. Перетащите для смещения"
              >
                <div
                  className="flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-grab active:cursor-grabbing px-0.5"
                  title="Перетащите окно действий"
                >
                  <GripVertical className="w-3 h-3" />
                </div>
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
                        'group/pill flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium cursor-pointer transition-colors',
                        isActive
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
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
                  className="flex items-center justify-center w-5 h-5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  title="Добавить правило перехода"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
);

CustomTransitionEdge.displayName = 'CustomTransitionEdge';
