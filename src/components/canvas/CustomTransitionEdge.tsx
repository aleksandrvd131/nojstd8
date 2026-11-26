import React, { memo, useState, useRef, useEffect } from 'react';
import { roundedWire, type Wire } from '../../engine/wireLayout';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  Position,
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
    const updateEdgeLabelOffset = useTuringStore((s) => s.updateEdgeLabelOffset);
    const mode = edgeData?.mode || '5-tuple';
    const subMode = edgeData?.subMode;
    const isActive = runtimeActiveEdgeId === id;

    const wire = edgeData?.wire as Wire | undefined;
    const isSelfLoop = source === target;
    const isBiDirectional = !!edgeData?.isBiDirectional;

    let edgePath = '';
    let labelX = 0;
    let labelY = 0;

    if (wire && !isSelfLoop) {
      edgePath = roundedWire([
        { x: sourceX, y: sourceY },
        ...wire.points.slice(1, -1),
        { x: targetX, y: targetY },
      ]);
      labelX = wire.label.x;
      labelY = wire.label.y;
    } else if (isSelfLoop) {
      const loopHeight = 70;
      const loopWidth = 40;
      if (sourcePosition === Position.Bottom) {
        edgePath = `M ${sourceX - 12} ${sourceY} C ${sourceX - loopWidth} ${
          sourceY + loopHeight
        }, ${sourceX + loopWidth} ${sourceY + loopHeight}, ${sourceX + 12} ${sourceY}`;
        labelX = sourceX;
        labelY = sourceY + loopHeight - 8;
      } else if (sourcePosition === Position.Left) {
        edgePath = `M ${sourceX} ${sourceY - 12} C ${sourceX - loopHeight} ${
          sourceY - loopWidth
        }, ${sourceX - loopHeight} ${sourceY + loopWidth}, ${sourceX} ${sourceY + 12}`;
        labelX = sourceX - loopHeight + 8;
        labelY = sourceY;
      } else if (sourcePosition === Position.Right) {
        edgePath = `M ${sourceX} ${sourceY - 12} C ${sourceX + loopHeight} ${
          sourceY - loopWidth
        }, ${sourceX + loopHeight} ${sourceY + loopWidth}, ${sourceX} ${sourceY + 12}`;
        labelX = sourceX + loopHeight - 8;
        labelY = sourceY;
      } else {
        edgePath = `M ${sourceX - 12} ${sourceY} C ${sourceX - loopWidth} ${
          sourceY - loopHeight
        }, ${sourceX + loopWidth} ${sourceY - loopHeight}, ${sourceX + 12} ${sourceY}`;
        labelX = sourceX;
        labelY = sourceY - loopHeight + 8;
      }
    } else if (isBiDirectional) {
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
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

    const savedOffset = edgeData?.labelOffset;
    const [offset, setOffset] = useState(savedOffset ?? { x: 0, y: 0 });
    const latestOffsetRef = useRef(offset);
    useEffect(() => {
      const next = savedOffset ?? { x: 0, y: 0 };
      setOffset(next);
      latestOffsetRef.current = next;
    }, [savedOffset?.x, savedOffset?.y]);

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
        const nextOffset = {
          x: dragRef.current.originX + (moveEvent.clientX - dragRef.current.startX),
          y: dragRef.current.originY + (moveEvent.clientY - dragRef.current.startY),
        };
        latestOffsetRef.current = nextOffset;
        setOffset(nextOffset);
      };

      const onMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        updateEdgeLabelOffset(id, latestOffsetRef.current);
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

        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX + offset.x}px,${labelY + offset.y}px)`,
              pointerEvents: 'all',
            }}
            className="flex items-center justify-center z-20"
          >
            <div
              onMouseDown={handleDragStart}
              className={clsx(
                'flex max-w-[240px] flex-wrap items-center justify-center gap-1 rounded-full border bg-white/95 px-1.5 py-1 shadow-md backdrop-blur-sm dark:bg-zinc-900/95 cursor-move select-none',
                showActionWindow
                  ? 'border-sky-400 dark:border-sky-500'
                  : 'border-zinc-200/90 dark:border-zinc-700'
              )}
              title="Окно действий перехода. Перетащите для смещения"
            >
              {showActionWindow && (
                <div
                  className="flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-grab active:cursor-grabbing px-0.5"
                  title="Перетащите окно действий"
                >
                  <GripVertical className="w-3 h-3" />
                </div>
              )}
              {rules.map((rule) => {
                let text = '';
                if (mode === '5-tuple') {
                  const write = rule.writeSymbol ?? rule.readSymbol;
                  const move = rule.move ?? 'N';
                  text = `${rule.readSymbol} → ${write}, ${move}`;
                } else if (subMode === 'operational') {
                  const isWild =
                    rule.isWildcard === true ||
                    (rule.isWildcard === undefined && !rule.isComplement && rule.readSymbol === '*');
                  text = isWild
                    ? '*'
                    : rule.isComplement
                    ? `¬${rule.readSymbol}`
                    : rule.readSymbol;
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
