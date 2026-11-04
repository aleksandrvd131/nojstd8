import React, { useMemo, useCallback } from 'react';
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
import { StateNode } from './StateNode';
import { OperationNode } from './OperationNode';
import { CustomTransitionEdge } from './CustomTransitionEdge';
import { RuleModal } from './RuleModal';
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
  StopCircle,
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
    width: 18,
    height: 18,
    color: '#64748b',
  },
};

const TuringCanvasInner: React.FC = () => {
  const getActiveProject = useTuringStore((s) => s.getActiveProject);
  const theme = useTuringStore((s) => s.theme);
  const onNodesChange = useTuringStore((s) => s.onNodesChange);
  const onEdgesChange = useTuringStore((s) => s.onEdgesChange);
  const onConnect = useTuringStore((s) => s.onConnect);
  const setSelectedNodeId = useTuringStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useTuringStore((s) => s.setSelectedEdgeId);

  const addStateNode = useTuringStore((s) => s.addStateNode);
  const addOperationNode = useTuringStore((s) => s.addOperationNode);
  const applyAutoLayout = useTuringStore((s) => s.applyAutoLayout);

  const project = getActiveProject();
  const { fitView } = useReactFlow();

  const handleAutoLayout = useCallback(() => {
    applyAutoLayout();
    setTimeout(() => {
      fitView({ duration: 300, padding: 0.2 });
    }, 50);
  }, [applyAutoLayout, fitView]);

  return (
    <div className="relative w-full h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Floating Canvas Action Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-lg backdrop-blur-md">
        {project.mode === '5-tuple' || project.subMode === 'state-graph' ? (
          <>
            <button
              type="button"
              onClick={() => addStateNode('normal')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 transition-colors"
              title="Добавить обычное состояние"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Состояние (q)</span>
            </button>
            <button
              type="button"
              onClick={() => addStateNode('halt')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-colors"
              title="Добавить конечное состояние останова"
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
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800"
              title="Точка входа START"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>START</span>
            </button>
            <button
              type="button"
              onClick={() => addOperationNode('SHIFT_L', 'l')}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              title="Сдвиг влево на 1 ячейку"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>l</span>
            </button>
            <button
              type="button"
              onClick={() => addOperationNode('SHIFT_R', 'r')}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              title="Сдвиг вправо на 1 ячейку"
            >
              <ArrowRight className="w-3 h-3" />
              <span>r</span>
            </button>
            <button
              type="button"
              onClick={() => addOperationNode('SEARCH_L', 'L')}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              title="Сдвиг влево до пробела"
            >
              <ChevronsLeft className="w-3 h-3" />
              <span>L</span>
            </button>
            <button
              type="button"
              onClick={() => addOperationNode('SEARCH_R', 'R')}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              title="Сдвиг вправо до пробела"
            >
              <ChevronsRight className="w-3 h-3" />
              <span>R</span>
            </button>
            <button
              type="button"
              onClick={() =>
                addOperationNode('WRITE_SYM', `[${project.alphabet.symbols[0] || '1'}]`, project.alphabet.symbols[0] || '1')
              }
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100 border border-violet-200 dark:border-violet-800"
              title="Запись символа"
            >
              <PenTool className="w-3 h-3" />
              <span>[a]</span>
            </button>
            <button
              type="button"
              onClick={() => addOperationNode('FINISH', 'FINISH')}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-800"
              title="Точка останова FINISH"
            >
              <StopCircle className="w-3 h-3" />
              <span>FINISH</span>
            </button>
          </>
        )}

        <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

        <button
          type="button"
          onClick={handleAutoLayout}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          title="Автоматическая укладка графа (Dagre Auto-Layout)"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-sky-500" />
          <span>Авто-раскладка</span>
        </button>
      </div>

      <ReactFlow
        nodes={project.nodes}
        edges={project.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
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
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        colorMode={theme}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.5}
          color={theme === 'dark' ? '#334155' : '#cbd5e1'}
        />
        <Controls
          showInteractive={false}
          className="!bg-white/90 dark:!bg-slate-900/90 !border-slate-200 dark:!border-slate-800 !shadow-lg !rounded-xl overflow-hidden"
        />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'stateNode') {
              const data = n.data as any;
              if (data?.stateType === 'initial') return '#10b981';
              if (data?.stateType === 'halt') return '#f59e0b';
              return '#0284c7';
            }
            return '#8b5cf6';
          }}
          maskColor={theme === 'dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.7)'}
          className="!bg-white/90 dark:!bg-slate-900/90 !border-slate-200 dark:!border-slate-800 !shadow-lg !rounded-xl overflow-hidden"
        />
      </ReactFlow>

      <RuleModal />
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
