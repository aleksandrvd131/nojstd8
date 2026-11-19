import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTuringStore } from '../../store/useTuringStore';
import { TuringNode, TuringEdge } from '../../types/turing';
import { StateNode } from './StateNode';
import { OperationNode } from './OperationNode';
import { CustomTransitionEdge } from './CustomTransitionEdge';
import { RuleModal } from './RuleModal';
import { NodeInspector } from './NodeInspector';
import {
  Plus,
  Play,
  CircleDot,
  LayoutGrid,
  ArrowLeft,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  PenTool,
  Square,
} from 'lucide-react';

const nodeTypes = {
  stateNode: StateNode,
  operationNode: OperationNode,
};

const edgeTypes = {
  customTransition: CustomTransitionEdge,
};

const defaultEdgeOptions = {
  type: 'customTransition',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 14,
    height: 14,
    color: '#71717a',
  },
};

const EMPTY_NODES: TuringNode[] = [];
const EMPTY_EDGES: TuringEdge[] = [];
const defaultFitViewOptions = { padding: 0.2 };

const miniMapNodeColor = (n: any) => {
  if (n.type === 'stateNode') {
    const data = n.data as any;
    if (data?.stateType === 'initial') return '#10b981';
    if (data?.stateType === 'halt') return '#f59e0b';
    return '#71717a';
  }
  return '#6366f1';
};

const TuringCanvasInner: React.FC = () => {
  const activeProjectId = useTuringStore((s) => s.activeProjectId);
  const theme = useTuringStore((s) => s.theme);
  const onNodesChange = useTuringStore((s) => s.onNodesChange);
  const onEdgesChange = useTuringStore((s) => s.onEdgesChange);
  const onConnect = useTuringStore((s) => s.onConnect);
  const setSelectedNodeId = useTuringStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useTuringStore((s) => s.setSelectedEdgeId);

  const addStateNode = useTuringStore((s) => s.addStateNode);
  const addOperationNode = useTuringStore((s) => s.addOperationNode);
  const applyAutoLayout = useTuringStore((s) => s.applyAutoLayout);

  const nodes = useTuringStore((s) => {
    const p = s.projects.find((proj) => proj.id === s.activeProjectId);
    return p ? p.nodes : EMPTY_NODES;
  });
  const edges = useTuringStore((s) => {
    const p = s.projects.find((proj) => proj.id === s.activeProjectId);
    return p ? p.edges : EMPTY_EDGES;
  });
  const mode = useTuringStore((s) => {
    const p = s.projects.find((proj) => proj.id === s.activeProjectId);
    return p ? p.mode : '5-tuple';
  });
  const subMode = useTuringStore((s) => {
    const p = s.projects.find((proj) => proj.id === s.activeProjectId);
    return p ? p.subMode : 'state-graph';
  });
  const firstAlphabetSymbol = useTuringStore((s) => {
    const p = s.projects.find((proj) => proj.id === s.activeProjectId);
    return p?.alphabet.symbols[0] || '1';
  });

  const { fitView } = useReactFlow();

  // Re-fit view when switching active project
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ duration: 300, padding: 0.2 });
    }, 50);
    return () => clearTimeout(timer);
  }, [activeProjectId, fitView]);

  const handleAutoLayout = useCallback(() => {
    applyAutoLayout();
    setTimeout(() => {
      fitView({ duration: 300, padding: 0.2 });
    }, 50);
  }, [applyAutoLayout, fitView]);

  return (
    <div className="relative w-full h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Precision Floating Action Bar */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 p-1 rounded-md bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-xs text-xs">
        {mode === '5-tuple' || subMode === 'state-graph' ? (
          <>
            <button
              type="button"
              onClick={() => addStateNode('normal')}
              className="flex items-center gap-1 px-2 py-1 font-medium rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-colors"
              title="Добавить промежуточное состояние (q)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Состояние</span>
            </button>
            <button
              type="button"
              onClick={() => addStateNode('halt')}
              className="flex items-center gap-1 px-2 py-1 font-medium rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-amber-700 dark:text-amber-400 border border-zinc-200 dark:border-zinc-700 transition-colors"
              title="Добавить состояние останова (Halt)"
            >
              <CircleDot className="w-3.5 h-3.5" />
              <span>+ Halt</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => addOperationNode('START', 'START')}
              className="flex items-center gap-1 px-2 py-1 font-medium rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800 transition-colors"
              title="Точка входа START"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>START</span>
            </button>
            <button
              type="button"
              onClick={() => addOperationNode('SHIFT_L', 'l')}
              className="flex items-center gap-1 px-2 py-1 font-mono font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
              title="Сдвиг влево на 1 ячейку (l)"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>l</span>
            </button>
            <button
              type="button"
              onClick={() => addOperationNode('SHIFT_R', 'r')}
              className="flex items-center gap-1 px-2 py-1 font-mono font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
              title="Сдвиг вправо на 1 ячейку (r)"
            >
              <ArrowRight className="w-3 h-3" />
              <span>r</span>
            </button>
            <button
              type="button"
              onClick={() => addOperationNode('SEARCH_L', 'L')}
              className="flex items-center gap-1 px-2 py-1 font-mono font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
              title="Поиск влево до пробела (L)"
            >
              <ChevronsLeft className="w-3 h-3" />
              <span>L</span>
            </button>
            <button
              type="button"
              onClick={() => addOperationNode('SEARCH_R', 'R')}
              className="flex items-center gap-1 px-2 py-1 font-mono font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
              title="Поиск вправо до пробела (R)"
            >
              <ChevronsRight className="w-3 h-3" />
              <span>R</span>
            </button>
            <button
              type="button"
              onClick={() =>
                addOperationNode('WRITE_SYM', `[${firstAlphabetSymbol}]`, firstAlphabetSymbol)
              }
              className="flex items-center gap-1 px-2 py-1 font-mono font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
              title="Запись символа"
            >
              <PenTool className="w-3 h-3" />
              <span>[a]</span>
            </button>
            <button
              type="button"
              onClick={() => addOperationNode('FINISH', 'FINISH')}
              className="flex items-center gap-1 px-2 py-1 font-medium rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-300 dark:border-rose-800 transition-colors"
              title="Точка останова FINISH"
            >
              <Square className="w-3 h-3" />
              <span>FINISH</span>
            </button>
          </>
        )}

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

        <button
          type="button"
          onClick={handleAutoLayout}
          className="flex items-center gap-1 px-2 py-1 font-medium rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
          title="Автоматическая раскладка графа (Dagre)"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-zinc-500" />
          <span>Раскладка</span>
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        onNodeClick={(_, node) => {
          setSelectedNodeId(node.id);
          setSelectedEdgeId(null);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
          setSelectedNodeId(null);
        }}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        fitView
        fitViewOptions={defaultFitViewOptions}
        minZoom={0.2}
        maxZoom={2.5}
        colorMode={theme}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1.2}
          color={theme === 'dark' ? '#27272a' : '#d4d4d8'}
        />
        <Controls
          showInteractive={false}
          className="!bg-white/95 dark:!bg-zinc-900/95 !border-zinc-200 dark:!border-zinc-800 !shadow-xs !rounded-md overflow-hidden"
        />
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor={theme === 'dark' ? 'rgba(9, 9, 11, 0.75)' : 'rgba(244, 244, 245, 0.75)'}
          className="!bg-white/95 dark:!bg-zinc-900/95 !border-zinc-200 dark:!border-zinc-800 !shadow-xs !rounded-md overflow-hidden"
        />
      </ReactFlow>

      <RuleModal />
      <NodeInspector />
    </div>
  );
};

export const TuringCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <TuringCanvasInner />
    </ReactFlowProvider>
  );
};
