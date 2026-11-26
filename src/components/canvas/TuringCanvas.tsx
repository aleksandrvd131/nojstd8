import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ConnectionMode,
  ConnectionLineType,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useTuringStore } from '../../store/useTuringStore';
import { pinnedSide, resolvePorts, sides } from '../../engine/ports';
import { layoutWires } from '../../engine/wireLayout';
import { PortRoles } from './NodePorts';
import { TuringNode, TuringEdge, StateNodeData } from '../../types/turing';
import { StateNode } from './StateNode';
import { OperationNode } from './OperationNode';
import { CustomTransitionEdge } from './CustomTransitionEdge';
import { RuleModal } from './RuleModal';
import { NodeInspector } from './NodeInspector';
import { VTMCodeInput } from '../inspector/VTMCodeInput';
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
  Undo2,
  Redo2,
  Code2,
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

const miniMapNodeColor = (n: TuringNode) => {
  if (n.type === 'stateNode') {
    const data = n.data as StateNodeData;
    if (data?.stateType === 'initial') return '#10b981';
    if (data?.stateType === 'halt') return '#f59e0b';
    return '#71717a';
  }
  return '#6366f1';
};

interface CanvasContextMenuState {
  screenX: number;
  screenY: number;
  flowX: number;
  flowY: number;
  nodeId?: string;
}

const menuItemClass =
  'block w-full px-3 py-1.5 text-left text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800';

const menuSeparator = 'my-1 h-px bg-zinc-200 dark:bg-zinc-800';

const TuringCanvasInner: React.FC = () => {
  const activeProjectId = useTuringStore((s) => s.activeProjectId);
  const theme = useTuringStore((s) => s.theme);
  const onNodesChange = useTuringStore((s) => s.onNodesChange);
  const onEdgesChange = useTuringStore((s) => s.onEdgesChange);
  const onConnect = useTuringStore((s) => s.onConnect);
  const reconnectEdge = useTuringStore((s) => s.reconnectEdge);
  const setSelectedNodeId = useTuringStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useTuringStore((s) => s.setSelectedEdgeId);
  const deleteNode = useTuringStore((s) => s.deleteNode);

  const addStateNode = useTuringStore((s) => s.addStateNode);
  const addOperationNode = useTuringStore((s) => s.addOperationNode);
  const addProjectFunction = useTuringStore((s) => s.addProjectFunction);
  const projects = useTuringStore((s) => s.projects);
  const applyAutoLayout = useTuringStore((s) => s.applyAutoLayout);
  const undoEditor = useTuringStore((s) => s.undoEditor);
  const redoEditor = useTuringStore((s) => s.redoEditor);
  const canUndoEditor = useTuringStore((s) => s.editorUndoStack.length > 0);
  const canRedoEditor = useTuringStore((s) => s.editorRedoStack.length > 0);

  const nodes = useTuringStore((s) => {
    const p = s.projects.find((proj) => proj.id === s.activeProjectId);
    return p ? p.nodes : EMPTY_NODES;
  });
  const edges = useTuringStore((s) => {
    const p = s.projects.find((proj) => proj.id === s.activeProjectId);
    return p ? p.edges : EMPTY_EDGES;
  });
  const view = useMemo(() => resolvePorts(nodes, edges), [nodes, edges]);
  const displayEdges = useMemo(() => {
    const wires = layoutWires(nodes, view.edges);
    return view.edges.map((edge) => ({
      ...edge,
      data: {
        ...(edge.data ?? { rules: [], mode: '5-tuple' as const }),
        wire: wires.get(edge.id),
      },
    }));
  },
    [nodes, view]
  );
  const selectedEdgeId = useTuringStore(s => s.selectedEdgeId);
  const chosenEdge = edges.find(e => e.id === selectedEdgeId);
  const portError = useTuringStore(s => s.portError);
  const moved = React.useRef<'source' | 'target'>();
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

  const { fitView, screenToFlowPosition } = useReactFlow();
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);
  const [isVTMCodeOpen, setIsVTMCodeOpen] = useState(false);
  const [functionDialogOpen, setFunctionDialogOpen] = useState(false);
  const [functionProjectId, setFunctionProjectId] = useState('');
  const [functionCode, setFunctionCode] = useState('K');
  const [functionPosition, setFunctionPosition] = useState<{ x: number; y: number } | undefined>();

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const flow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({
        screenX: event.clientX,
        screenY: event.clientY,
        flowX: flow.x,
        flowY: flow.y,
      });
    },
    [screenToFlowPosition]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: TuringNode) => {
      event.preventDefault();
      event.stopPropagation();
      const flow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({
        screenX: event.clientX,
        screenY: event.clientY,
        flowX: flow.x,
        flowY: flow.y,
        nodeId: node.id,
      });
    },
    [screenToFlowPosition]
  );

  const addOperationAt = useCallback(
    (opType: Parameters<typeof addOperationNode>[0], label?: string, symbolToWrite?: string) => {
      if (!contextMenu) return;
      addOperationNode(opType, label, symbolToWrite, {
        x: contextMenu.flowX,
        y: contextMenu.flowY,
      });
      setContextMenu(null);
    },
    [addOperationNode, contextMenu]
  );

  const addStateAt = useCallback(
    (stateType: Parameters<typeof addStateNode>[0], label?: string) => {
      if (!contextMenu) return;
      addStateNode(stateType, label, {
        x: contextMenu.flowX,
        y: contextMenu.flowY,
      });
      setContextMenu(null);
    },
    [addStateNode, contextMenu]
  );

  // Re-fit view when switching active project
  useEffect(() => {
    setContextMenu(null);
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

  const handleReconnect = useCallback(
    (edge: TuringEdge, connection: Connection) => {
      reconnectEdge(edge.id, connection, moved.current);
    },
    [reconnectEdge]
  );

  const importProjectFunction = () => {
    if (addProjectFunction(functionProjectId, functionCode, functionPosition)) {
      setFunctionDialogOpen(false);
      setFunctionPosition(undefined);
    }
  };

  return (
    <div className="relative w-full h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Precision Floating Action Bar */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1 p-1 rounded-md bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-sm text-xs">
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
          onClick={() => setIsVTMCodeOpen((open) => !open)}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          title="Создать или вставить цепочку VTM-кода"
        >
          <Code2 className="h-3.5 w-3.5" />
          <span>VTM-код</span>
        </button>

        <button
          type="button"
          onClick={handleAutoLayout}
          className="flex items-center gap-1 px-2 py-1 font-medium rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
          title="Автоматически расположить узлы (Dagre)"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-zinc-500" />
          <span>Раскладка</span>
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

        <button
          type="button"
          onClick={undoEditor}
          disabled={!canUndoEditor}
          className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Отменить изменение графа (Ctrl+Z)"
          aria-label="Отменить изменение графа"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={redoEditor}
          disabled={!canRedoEditor}
          className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Повторить изменение графа (Ctrl+Shift+Z)"
          aria-label="Повторить изменение графа"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        {chosenEdge && (
          <>
            <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />
            {(['source', 'target'] as const).map((end) => (
              <label key={end} className="flex items-center gap-1 px-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                <span>{end === 'source' ? 'Выход' : 'Вход'}</span>
                <select
                  value={pinnedSide(chosenEdge, end) ?? ''}
                  onChange={(event) => {
                    reconnectEdge(
                      chosenEdge.id,
                      {
                        source: chosenEdge.source,
                        target: chosenEdge.target,
                        sourceHandle: chosenEdge.sourceHandle ?? null,
                        targetHandle: chosenEdge.targetHandle ?? null,
                        [`${end}Handle`]: event.target.value || null,
                      },
                      end
                    );
                  }}
                  className="rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1 py-0.5 text-[11px]"
                >
                  <option value="">Авто</option>
                  {sides.map((side, i) => (
                    <option key={side} value={side}>
                      {['Слева', 'Справа', 'Сверху', 'Снизу'][i]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </>
        )}
      </div>
      {(portError || view.conflicts.size > 0) && <div role="alert" className="absolute bottom-4 left-14 z-20 rounded bg-amber-100 px-3 py-2 text-xs text-amber-950">
        {portError ?? `Конфликт направлений (${[...view.conflicts].join(', ')}). Выберите переход и измените точку.`}
      </div>}
      {isVTMCodeOpen && (
        <div className="absolute left-3 top-14 z-20 w-80 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 text-xs font-medium dark:border-zinc-800">
            <span>VTM-код</span>
            <button
              type="button"
              onClick={() => setIsVTMCodeOpen(false)}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              aria-label="Закрыть VTM-код"
            >
              ×
            </button>
          </div>
          <VTMCodeInput />
        </div>
      )}

      <PortRoles.Provider value={view.roles}><ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={handleReconnect}
        onReconnectStart={(_, __, fixed) => { moved.current = fixed === 'source' ? 'target' : 'source'; }}
        edgesReconnectable
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: '#2563eb', strokeWidth: 2.5 }}
        deleteKeyCode={null}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={(event) => event.preventDefault()}
        onMoveStart={() => setContextMenu(null)}
        onNodeClick={(_, node) => {
          setSelectedNodeId(node.id);
          setSelectedEdgeId(null);
          setContextMenu(null);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
          setSelectedNodeId(null);
          setContextMenu(null);
        }}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          setContextMenu(null);
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
          className="!bg-white/95 dark:!bg-zinc-900/95 !border-zinc-200 dark:!border-zinc-800 !shadow-sm !rounded-md overflow-hidden"
        />
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor={theme === 'dark' ? 'rgba(9, 9, 11, 0.75)' : 'rgba(244, 244, 245, 0.75)'}
          className="!bg-white/95 dark:!bg-zinc-900/95 !border-zinc-200 dark:!border-zinc-800 !shadow-sm !rounded-md overflow-hidden"
        />
      </ReactFlow></PortRoles.Provider>

      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onMouseDown={() => setContextMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 w-52 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-md text-xs"
            style={{
              left: Math.min(contextMenu.screenX, window.innerWidth - 220),
              top: Math.min(contextMenu.screenY, window.innerHeight - 320),
            }}
          >
            {contextMenu.nodeId ? (
              <>
                <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Узел
                </div>
                <button
                  type="button"
                  className={`${menuItemClass} text-red-600 dark:text-red-400`}
                  onClick={() => {
                    deleteNode(contextMenu.nodeId!);
                    setSelectedNodeId(null);
                    setContextMenu(null);
                  }}
                >
                  Удалить узел
                </button>
                <div className={menuSeparator} />
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => {
                    setIsVTMCodeOpen(true);
                    setContextMenu(null);
                  }}
                >
                  Ввести VTM-код…
                </button>
              </>
            ) : (
              <>
                <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Добавить
                </div>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => {
                    setIsVTMCodeOpen(true);
                    setContextMenu(null);
                  }}
                >
                  Ввести VTM-код…
                </button>
                <div className={menuSeparator} />
              </>
            )}

            {!contextMenu.nodeId && (mode === '5-tuple' || subMode === 'state-graph') ? (
              <>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => addStateAt('normal')}
                >
                  Состояние
                </button>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => addStateAt('halt')}
                >
                  Состояние останова
                </button>
              </>
            ) : !contextMenu.nodeId ? (
              <>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => addOperationAt('START', 'START')}
                >
                  START
                </button>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => addOperationAt('FINISH', 'FINISH')}
                >
                  FINISH
                </button>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => {
                    const sources = projects.filter(
                      (p) =>
                        p.id !== activeProjectId &&
                        p.subMode === 'operational' &&
                        p.nodes.length > 0
                    );
                    setFunctionProjectId(sources[0]?.id ?? '');
                    setFunctionCode('K');
                    setFunctionPosition({ x: contextMenu.flowX, y: contextMenu.flowY });
                    setFunctionDialogOpen(true);
                    setContextMenu(null);
                  }}
                >
                  Добавить функцию из проекта…
                </button>
                <div className={menuSeparator} />
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => addOperationAt('SHIFT_L', 'l')}
                >
                  Сдвиг влево (l)
                </button>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => addOperationAt('SHIFT_R', 'r')}
                >
                  Сдвиг вправо (r)
                </button>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => addOperationAt('SEARCH_L', 'L')}
                >
                  Поиск влево (L)
                </button>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => addOperationAt('SEARCH_R', 'R')}
                >
                  Поиск вправо (R)
                </button>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() =>
                    addOperationAt(
                      'WRITE_SYM',
                      `[${firstAlphabetSymbol}]`,
                      firstAlphabetSymbol
                    )
                  }
                >
                  Запись «{firstAlphabetSymbol}»
                </button>
              </>
            ) : null}
          </div>
        </>
      )}

      {functionDialogOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFunctionDialogOpen(false);
          }}
        >
          <section className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-4 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
              Создать функцию из проекта
            </h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Выберите операционный проект. Если в схеме нет START или FINISH, они будут добавлены только в функцию.
            </p>
            <label className="mt-4 block text-xs text-zinc-600 dark:text-zinc-300">
              Проект
              <select
                value={functionProjectId}
                onChange={(event) => setFunctionProjectId(event.target.value)}
                className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {projects
                  .filter(
                    (p) =>
                      p.id !== activeProjectId &&
                      p.subMode === 'operational' &&
                      p.nodes.length > 0
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="mt-3 block text-xs text-zinc-600 dark:text-zinc-300">
              Буква функции
              <input
                value={functionCode}
                onChange={(event) => setFunctionCode(event.target.value.toUpperCase().slice(0, 1))}
                maxLength={1}
                className="mt-1 w-20 rounded border border-zinc-300 bg-white px-2 py-1.5 font-mono text-sm uppercase dark:border-zinc-700 dark:bg-zinc-950"
                aria-label="Буква функции"
              />
              <span className="ml-2 text-[11px] text-zinc-400">
                Потом её можно вызвать в VTM-коде, например: K r^2
              </span>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFunctionDialogOpen(false)}
                className="rounded px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={importProjectFunction}
                disabled={!functionProjectId || !/^[A-Z]$/.test(functionCode)}
                className="rounded bg-zinc-900 px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Добавить
              </button>
            </div>
          </section>
        </div>
      )}

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
