import { restoreEdgePorts, pinnedSide, resolvePorts, nodeBox } from '../engine/ports';
import React, { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  ProjectSession,
  TuringMode,
  FourTupleSubMode,
  BlankSymbolType,
  FiveTupleRule,
  FourTupleRule,
  TuringNode,
  TuringEdge,
  TestCase,
  StateNodeType,
  OperationalNodeType,
  OperationNodeData,
  SubMachine,
  RuntimeStats,
} from '../types/turing';
import {
  RuntimeState,
  initRuntimeState,
  stepMachine,
  stepBackMachine,
  runTestCase,
} from '../engine/simulator';
import {
  convert5TupleTo4Tuple,
  convert4TupleTo5Tuple,
  compileOperationalDiagramTo4Tuples,
  buildEdgesFromRules,
  compileVTMCode,
  findFeedbackEdgeIds,
} from '../engine/transpiler';
import { exportDiagramAsImage, ExportImageOptions } from '../utils/exportImage';
import { INITIAL_PROJECTS } from './demoProjects';
import dagre from 'dagre';
import { applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Connection } from '@xyflow/react';

export const ALPHABET_PRESETS: Record<string, { name: string; symbols: string[]; blank: BlankSymbolType }> = {
  binary: {
    name: 'Бинарный',
    symbols: ['0', '1'],
    blank: '_',
  },
  unary: {
    name: 'Унарный с маркерами',
    symbols: ['1', '*', 'x', '='],
    blank: '_',
  },
  decimal: {
    name: 'Десятичный',
    symbols: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    blank: '_',
  },
  hexadecimal: {
    name: 'Шестнадцатеричный',
    symbols: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'],
    blank: '_',
  },
  symbolic: {
    name: 'Символьно-логический',
    symbols: ['a', 'b', 'c', '#', '$', 'T', 'F'],
    blank: '_',
  },
};

export function autoLayoutGraph(nodes: TuringNode[], edges: TuringEdge[], direction = 'LR'): TuringNode[] {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    ranksep: 125,
    nodesep: 88,
    edgesep: 36,
    marginx: 36,
    marginy: 36,
  });
  const feedbackEdges = findFeedbackEdgeIds(nodes, edges);
  // A leaf whose only transition returns immediately to its parent is a
  // side trip, not the next stage of the machine's forward path.
  const branches = new Map<string, string>();
  const neighbors = new Map(nodes.map(n => [n.id, new Set<string>()]));
  for (const e of edges) if (e.source !== e.target) {
    neighbors.get(e.source)?.add(e.target);
    neighbors.get(e.target)?.add(e.source);
  }
  if (direction === 'LR') for (const e of edges) {
    if (feedbackEdges.has(e.id) && neighbors.get(e.source)?.size === 1 &&
        (neighbors.get(e.target)?.size ?? 0) > 1 && e.source !== e.target) branches.set(e.source, e.target);
  }

  nodes.forEach((n) => {
    if (branches.has(n.id)) return;
    const { width, height } = nodeBox(n);
    g.setNode(n.id, { width, height });
  });

  edges.forEach((e, index) => {
    // Back-edges describe cycles, not forward flow. Leaving them out keeps a
    // small return transition from pulling an entire branch into a wide loop.
    if (feedbackEdges.has(e.id) || branches.has(e.source) || branches.has(e.target)) return;
    g.setEdge(e.source, e.target, {}, `${e.id}-${index}`);
  });

  dagre.layout(g);
  const placed = nodes.filter(n => !branches.has(n.id)).map(n => g.node(n.id));
  const branchCount = new Map<string, number>();
  for (const n of nodes) {
    const parent = branches.get(n.id);
    if (!parent) continue;
    const hub = g.node(parent);
    const count = branchCount.get(parent) ?? 0, sign = count % 2 ? 1 : -1;
    branchCount.set(parent, count + 1);
    const { width, height } = nodeBox(n);
    const x = hub.x + hub.width / 2 + 62;
    let y = hub.y + sign * ((height + hub.height) / 2 + 72);
    for (const p of [...placed].sort((a, b) => sign * (a.y - b.y))) {
      if (Math.abs(x - p.x) < (width + p.width) / 2 + 24 &&
          Math.abs(y - p.y) < (height + p.height) / 2 + 48) {
        y = p.y + sign * ((height + p.height) / 2 + 72);
      }
    }
    const pos = { x, y, width, height };
    g.setNode(n.id, pos);
    placed.push(g.node(n.id));
  }

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const { width, height } = nodeBox(n);
    return {
      ...n,
      position: {
        x: pos ? pos.x - width / 2 : n.position.x,
        y: pos ? pos.y - height / 2 : n.position.y,
      },
    };
  });
}

interface TuringStoreState {
  projects: ProjectSession[];
  activeProjectId: string;
  runtime: RuntimeState;

  // UI state
  theme: 'light' | 'dark';
  activeTab: 'tuples' | 'matrix' | 'check' | 'tests';
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isSessionDrawerOpen: boolean;
  isAlphabetModalOpen: boolean;
  isExportModalOpen: boolean;
  isRuleModalOpen: boolean;
  ruleModalData: {
    edgeId?: string;
    sourceNodeId?: string;
    targetNodeId?: string;
    ruleId?: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  } | null;
  executionSpeedMs: number;
  isRunning: boolean;
  keyboardShortcutsEnabled: boolean;

  // Actions
  toggleTheme: () => void;
  setActiveTab: (tab: 'tuples' | 'matrix' | 'check' | 'tests') => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setSessionDrawerOpen: (open: boolean) => void;
  setAlphabetModalOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  openRuleModal: (data: {
    edgeId?: string;
    sourceNodeId?: string;
    targetNodeId?: string;
    ruleId?: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => void;
  closeRuleModal: () => void;
  addVTMCode: (code: string, name?: string) => boolean;
  insertVTMCode: (code: string) => boolean;
  addProjectFunction: (
    sourceProjectId: string,
    code: string,
    position?: { x: number; y: number }
  ) => boolean;
  setExecutionSpeedMs: (speed: number) => void;
  toggleKeyboardShortcuts: () => void;
  setKeyboardShortcutsEnabled: (enabled: boolean) => void;

  // Active Project Getters & Setters
  getActiveProject: () => ProjectSession;
  updateActiveProject: (updater: (prev: ProjectSession) => ProjectSession) => void;

  // Session Management
  switchProject: (id: string) => void;
  createProject: (mode?: TuringMode, subMode?: FourTupleSubMode, name?: string) => void;
  duplicateProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  updateProjectDescription: (id: string, description: string) => void;
  deleteProject: (id: string) => void;
  importProject: (project: ProjectSession) => void;

  // Mode & SubMode Conversion
  setMode: (mode: TuringMode) => void;
  setSubMode: (subMode: FourTupleSubMode, force?: boolean) => void;

  // Alphabet Management
  setAlphabetSymbols: (symbols: string[]) => void;
  setBlankSymbol: (blank: BlankSymbolType) => void;
  applyAlphabetPreset: (presetKey: string) => void;
  refactorSymbol: (oldSymbol: string, newSymbol: string) => void;

  // Graph / Canvas
  onNodesChange: (changes: NodeChange<TuringNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<TuringEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  reconnectEdge: (edgeId: string, connection: Connection, moved?: 'source' | 'target') => void;
  portError: string | null;
  addStateNode: (type: StateNodeType, label?: string, position?: { x: number; y: number }) => void;
  addOperationNode: (
    opType: OperationalNodeType,
    label?: string,
    symbolToWrite?: string,
    position?: { x: number; y: number }
  ) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  deleteNode: (id: string) => void;
  applyAutoLayout: () => void;

  // Rules Sync
  addFiveTupleRule: (rule: Omit<FiveTupleRule, 'id'>) => void;
  updateFiveTupleRule: (id: string, rule: Partial<FiveTupleRule>) => void;
  deleteFiveTupleRule: (id: string) => void;

  addFourTupleRule: (rule: Omit<FourTupleRule, 'id'>) => void;
  updateFourTupleRule: (id: string, rule: Partial<FourTupleRule>) => void;
  deleteFourTupleRule: (id: string) => void;
  deleteEdgeRule: (edgeId: string, ruleId: string) => void;

  // Tape & Debugger
  setTapeCell: (pos: number, sym: string) => void;
  setTapeString: (word: string, startPos?: number) => void;
  setHeadPosition: (pos: number) => void;
  saveTapeToInitialBuffer: () => void;
  resetTapeFromInitialBuffer: () => void;

  resetExecution: () => void;
  stepForward: () => void;
  stepBack: () => void;
  startRunning: () => void;
  pauseRunning: () => void;
  toggleRunning: () => void;
  getRuntimeStats: () => RuntimeStats;
  exportDiagramImage: (options?: ExportImageOptions) => Promise<string | null>;

  // Tests
  addTestCase: (tc: Omit<TestCase, 'id'>) => void;
  updateTestCase: (id: string, tc: Partial<TestCase>) => void;
  deleteTestCase: (id: string) => void;
  runAllTestCases: () => void;
  runSingleTestCase: (id: string) => void;
}

const memoryStorage = new Map<string, string>();

export const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
    } catch {}
    return memoryStorage.get(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
        return;
      }
    } catch {}
    memoryStorage.set(name, value);
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
        return;
      }
    } catch {}
    memoryStorage.delete(name);
  },
};

export const useTuringStore = create<TuringStoreState>()(
  persist(
    (set, get) => ({
      projects: INITIAL_PROJECTS,
      activeProjectId: INITIAL_PROJECTS[0].id,
      runtime: initRuntimeState(INITIAL_PROJECTS[0]),

      theme: 'dark',
      activeTab: 'tuples',
      selectedNodeId: null,
      selectedEdgeId: null,
      isSessionDrawerOpen: false,
      isAlphabetModalOpen: false,
      isExportModalOpen: false,
      isRuleModalOpen: false,
      ruleModalData: null,
      executionSpeedMs: 250,
      isRunning: false,
      keyboardShortcutsEnabled: true,

      addVTMCode: (code: string, name?: string) => {
        const project = get().getActiveProject();
        const alphabet = project.alphabet;

        const result = compileVTMCode(code, alphabet, {
          name,
          functions: project.subMachines,
        });

        // Do not create a broken machine if the code could not be parsed.
        if (result.errors.length > 0 || result.parsedOps.length === 0) {
          return false;
        }

        const newId = `project_vtm_${Date.now()}`;
        const newProject: ProjectSession = {
          id: newId,
          name: name?.trim() || result.projectName,
          description: `Операционная диаграмма ВТМ, сгенерированная из кода: "${code}"`,
          mode: '4-tuple',
          subMode: 'operational',
          alphabet: { ...alphabet, symbols: [...alphabet.symbols] },
          nodes: result.nodes,
          edges: result.edges,
          rules4: result.rules4,
          rules5: [],
          subMachines: project.subMachines.map((machine) => ({
            ...machine,
            nodes: machine.nodes.map((node) => ({ ...node, data: { ...node.data } })),
            edges: machine.edges.map((edge) => ({
              ...edge,
              data: {
                ...edge.data,
                mode: edge.data?.mode ?? '4-tuple',
                subMode: edge.data?.subMode ?? 'operational',
                rules: [...(edge.data?.rules ?? [])],
              },
            })),
          })),
          // New code projects start with a clean tape; users can load an input explicitly.
          initialTape: {},
          initialHeadPosition: 0,
          testCases: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          projects: [newProject, ...state.projects],
          activeProjectId: newId,
          runtime: initRuntimeState(newProject),
          isSessionDrawerOpen: false,
        }));

        return true;
      },

      insertVTMCode: (code: string) => {
        const project = get().getActiveProject();

        // Operation nodes only make sense inside an operational VTM diagram.
        if (project.subMode !== 'operational') {
          return false;
        }

        const result = compileVTMCode(code, project.alphabet, {
          idPrefix: `vtm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          functions: project.subMachines,
        });

        if (result.errors.length > 0 || result.parsedOps.length === 0) {
          return false;
        }

        const existingNodes = project.nodes;
        const startX = existingNodes.length
          ? Math.max(...existingNodes.map((n) => n.position.x)) + 220
          : 100;
        const shiftX = startX - 100;

        const insertedNodes = result.nodes.map((node) => ({
          ...node,
          position: { x: node.position.x + shiftX, y: node.position.y },
        }));

        const nodes = [...existingNodes, ...insertedNodes];
        const edges = [...project.edges, ...result.edges];
        const rules4 = compileOperationalDiagramTo4Tuples(nodes, edges, project.alphabet);

        get().updateActiveProject((prev) => ({
          ...prev,
          nodes,
          edges,
          rules4,
        }));

        set({
          selectedNodeId: insertedNodes[0]?.id ?? null,
          selectedEdgeId: null,
        });

        return true;
      },

      addProjectFunction: (
        sourceProjectId: string,
        code: string,
        position?: { x: number; y: number }
      ) => {
        const { projects, activeProjectId } = get();
        const parent = get().getActiveProject();
        const source = projects.find((candidate) => candidate.id === sourceProjectId);
        const functionCode = code.trim().toUpperCase();

        if (
          !source ||
          source.id === activeProjectId ||
          source.subMode !== 'operational' ||
          !/^[A-Z]$/.test(functionCode) ||
          ['R', 'L'].includes(functionCode) ||
          parent.alphabet.symbols.includes(functionCode) ||
          parent.subMachines.some((machine) => machine.code === functionCode) ||
          source.nodes.length === 0
        ) {
          return false;
        }

        const functionId = `function_${source.id}_${Date.now().toString(36)}`;
        const sourceNodes = source.nodes.map((node) => ({
          ...node,
          position: { ...node.position },
          data: { ...node.data },
        }));
        const sourceEdges: TuringEdge[] = source.edges.map((edge) => ({
          ...edge,
          data: {
            ...edge.data,
            mode: edge.data?.mode ?? source.mode,
            subMode: edge.data?.subMode ?? source.subMode,
            rules: [...(edge.data?.rules ?? [])],
          },
        }));
        let startNodeId = sourceNodes.find(
          (node) => (node.data as OperationNodeData).opType === 'START'
        )?.id;
        let finishNodeId = sourceNodes.find(
          (node) => (node.data as OperationNodeData).opType === 'FINISH'
        )?.id;

        if (!startNodeId) {
          startNodeId = `${functionId}_start`;
          sourceNodes.unshift({
            id: startNodeId,
            type: 'operationNode',
            position: { x: 0, y: 0 },
            data: { label: 'START', opType: 'START' },
          });
          const firstNode = source.nodes[0];
          sourceEdges.push({
            id: `${functionId}_entry`,
            source: startNodeId,
            target: firstNode.id,
            sourceHandle: 'right',
            targetHandle: 'left',
            type: 'customTransition',
            data: {
              mode: '4-tuple',
              subMode: 'operational',
              rules: [{ id: `${functionId}_entry_rule`, readSymbol: '*', isWildcard: true }],
            },
          });
        }

        if (!finishNodeId) {
          finishNodeId = `${functionId}_finish`;
          sourceNodes.push({
            id: finishNodeId,
            type: 'operationNode',
            position: { x: 900, y: 0 },
            data: { label: 'FINISH', opType: 'FINISH' },
          });
          const nodesWithOutgoing = new Set(sourceEdges.map((edge) => edge.source));
          const terminalNodes = source.nodes.filter(
            (node) =>
              (node.data as OperationNodeData).opType !== 'FINISH' &&
              !nodesWithOutgoing.has(node.id)
          );
          for (const node of terminalNodes) {
            sourceEdges.push({
              id: `${functionId}_exit_${node.id}`,
              source: node.id,
              target: finishNodeId,
              sourceHandle: 'right',
              targetHandle: 'left',
              type: 'customTransition',
              data: {
                mode: '4-tuple',
                subMode: 'operational',
                rules: [{ id: `${functionId}_exit_rule_${node.id}`, readSymbol: '*', isWildcard: true }],
              },
            });
          }
        }

        const sourceMachine: SubMachine = {
          id: functionId,
          name: source.name,
          code: functionCode,
          description: source.description,
          nodes: sourceNodes,
          edges: sourceEdges,
          rules4: compileOperationalDiagramTo4Tuples(sourceNodes, sourceEdges, source.alphabet),
        };

        let suffix = parent.nodes.length;
        let nodeId = `op_function_${functionCode}_${suffix}`;
        const existingIds = new Set(parent.nodes.map((node) => node.id));
        while (existingIds.has(nodeId)) nodeId = `op_function_${functionCode}_${++suffix}`;

        const functionNode: TuringNode = {
          id: nodeId,
          type: 'operationNode',
          position: position ?? { x: 160 + (suffix % 4) * 180, y: 140 + Math.floor(suffix / 4) * 140 },
          data: {
            label: functionCode,
            opType: 'COMPLEX_MACHINE',
            subMachineId: functionId,
            subMachineName: source.name,
            description: `Функция ${functionCode}: ${source.name}`,
          },
        };

        get().updateActiveProject((prev) => ({
          ...prev,
          subMachines: [...prev.subMachines, sourceMachine],
          nodes: [...prev.nodes, functionNode],
        }));
        set({ selectedNodeId: nodeId, selectedEdgeId: null });
        return true;
      },

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
      setSessionDrawerOpen: (open) => set({ isSessionDrawerOpen: open }),
      setAlphabetModalOpen: (open) => set({ isAlphabetModalOpen: open }),
      setExportModalOpen: (open) => set({ isExportModalOpen: open }),
      openRuleModal: (data) => set({ isRuleModalOpen: true, ruleModalData: data }),
      closeRuleModal: () => set({ isRuleModalOpen: false, ruleModalData: null }),
      setExecutionSpeedMs: (speed) => set({ executionSpeedMs: speed }),
      toggleKeyboardShortcuts: () =>
        set((state) => ({ keyboardShortcutsEnabled: !state.keyboardShortcutsEnabled })),
      setKeyboardShortcutsEnabled: (enabled) => set({ keyboardShortcutsEnabled: enabled }),

      getActiveProject: () => {
        const { projects, activeProjectId } = get();
        return projects.find((p) => p.id === activeProjectId) || projects[0] || INITIAL_PROJECTS[0];
      },

      updateActiveProject: (updater) => {
        const { activeProjectId, projects } = get();
        const updatedProjects = projects.map((p) => {
          if (p.id === activeProjectId) {
            const updated = updater(p);
            return { ...updated, updatedAt: Date.now() };
          }
          return p;
        });
        set({ projects: updatedProjects });
      },

      switchProject: (id: string) => {
        const project = get().projects.find((p) => p.id === id);
        if (project) {
          set({
            activeProjectId: id,
            runtime: initRuntimeState(project),
            selectedNodeId: null,
            selectedEdgeId: null,
            isRunning: false,
          });
        }
      },

      createProject: (mode = '5-tuple', subMode = 'state-graph', name) => {
        const newId = `project_${Date.now()}`;
        const newProject: ProjectSession = {
          id: newId,
          name: name || `Новая машина Тьюринга (${mode})`,
          description: 'Описание и условие задачи...',
          mode,
          subMode,
          alphabet: {
            symbols: ['0', '1'],
            blankSymbol: '_',
          },
          nodes:
            mode === '5-tuple' || subMode === 'state-graph'
              ? [
                  {
                    id: 'q0',
                    type: 'stateNode',
                    position: { x: 150, y: 150 },
                    data: { label: 'q0', stateType: 'initial' },
                  },
                  {
                    id: 'q_halt',
                    type: 'stateNode',
                    position: { x: 400, y: 150 },
                    data: { label: 'q_halt', stateType: 'halt' },
                  },
                ]
              : [
                  {
                    id: 'op_start',
                    type: 'operationNode',
                    position: { x: 150, y: 150 },
                    data: { label: 'START', opType: 'START' },
                  },
                  {
                    id: 'op_finish',
                    type: 'operationNode',
                    position: { x: 400, y: 150 },
                    data: { label: 'FINISH', opType: 'FINISH' },
                  },
                ],
          edges: [],
          rules5: [],
          rules4: [],
          subMachines: [],
          initialTape: {},
          initialHeadPosition: 0,
          testCases: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          projects: [newProject, ...state.projects],
          activeProjectId: newId,
          runtime: initRuntimeState(newProject),
          isSessionDrawerOpen: false,
        }));
      },

      duplicateProject: (id: string) => {
        const target = get().projects.find((p) => p.id === id);
        if (!target) return;
        const copyId = `project_copy_${Date.now()}`;
        const duplicated: ProjectSession = {
          ...JSON.parse(JSON.stringify(target)),
          id: copyId,
          name: `${target.name} (Копия)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          projects: [duplicated, ...state.projects],
          activeProjectId: copyId,
          runtime: initRuntimeState(duplicated),
        }));
      },

      renameProject: (id: string, name: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
        }));
      },

      updateProjectDescription: (id: string, description: string) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, description, updatedAt: Date.now() } : p
          ),
        }));
      },

      deleteProject: (id: string) => {
        const { projects, activeProjectId } = get();
        if (projects.length <= 1) return; // Keep at least one
        const remaining = projects.filter((p) => p.id !== id);
        const nextActiveId = activeProjectId === id ? remaining[0].id : activeProjectId;
        const nextActive = remaining.find((p) => p.id === nextActiveId) || remaining[0];
        set({
          projects: remaining,
          activeProjectId: nextActiveId,
          runtime: initRuntimeState(nextActive),
        });
      },

      importProject: (project: ProjectSession) => {
        const newProject = {
          ...project,
          id: `imported_${Date.now()}`,
          updatedAt: Date.now(),
        };
        set((state) => ({
          projects: [newProject, ...state.projects],
          activeProjectId: newProject.id,
          runtime: initRuntimeState(newProject),
        }));
      },

      // --- Mode & SubMode Conversion ---
      setMode: (newMode: TuringMode) => {
        const project = get().getActiveProject();
        if (project.mode === newMode) return;

        let updatedProject: ProjectSession;
        if (newMode === '4-tuple') {
          // Convert 5-tuple -> 4-tuple
          const { rules4, auxiliaryNodes } = convert5TupleTo4Tuple(project.rules5);
          const auxTuringNodes: TuringNode[] = auxiliaryNodes.map((aux, idx) => ({
            id: aux.id,
            type: 'stateNode',
            position: { x: 250 + idx * 80, y: 300 },
            data: { label: aux.label, stateType: 'normal' },
          }));

          const allNodes = [...project.nodes, ...auxTuringNodes];
          const newEdges = restoreEdgePorts(
            buildEdgesFromRules(rules4, '4-tuple', project.subMode),
            project.edges
          );

          updatedProject = {
            ...project,
            mode: '4-tuple',
            nodes: allNodes,
            edges: newEdges,
            rules4,
          };
        } else {
          // Convert 4-tuple -> 5-tuple
          const rules5 = convert4TupleTo5Tuple(project.rules4);
          const newEdges = restoreEdgePorts(
            buildEdgesFromRules(rules5, '5-tuple'),
            project.edges
          );

          updatedProject = {
            ...project,
            mode: '5-tuple',
            edges: newEdges,
            rules5,
          };
        }

        get().updateActiveProject(() => updatedProject);
        set({ runtime: initRuntimeState(updatedProject) });
      },

      setSubMode: (newSubMode: FourTupleSubMode, force = false) => {
        const project = get().getActiveProject();
        if (project.mode !== '4-tuple' || project.subMode === newSubMode) return;

        let updatedProject: ProjectSession;
        if (newSubMode === 'operational') {
          // Check if switching will overwrite user graph content
          const hasUserContent =
            project.nodes.some((n) => n.type === 'stateNode') ||
            project.rules4.length > 0 ||
            project.rules5.length > 0;

          if (hasUserContent && !force && typeof window !== 'undefined' && typeof window.confirm === 'function') {
            const confirmed = window.confirm(
              'Переключение в режим операционной диаграммы (VTM) заменит текущий граф состояний на схему VTM. Продолжить?'
            );
            if (!confirmed) return;
          }

          // If the project already has operational nodes, preserve them
          const existingOpNodes = project.nodes.filter((n) => n.type === 'operationNode');
          if (existingOpNodes.length >= 2 && existingOpNodes.some((n) => (n.data as OperationNodeData).opType === 'START')) {
            const rules4 = compileOperationalDiagramTo4Tuples(project.nodes, project.edges, project.alphabet);
            updatedProject = {
              ...project,
              subMode: 'operational',
              rules4,
            };
          } else {
            // Operational VTM Diagram default template
            const defaultTemplateEdges: TuringEdge[] = [
              {
                id: 'e_start_r',
                source: 'op_start',
                target: 'op_step_r',
                type: 'customTransition',
                data: {
                  mode: '4-tuple',
                  subMode: 'operational',
                  rules: [{ id: 'r_start', readSymbol: '*', isWildcard: true }],
                },
              },
              {
                id: 'e_r_finish',
                source: 'op_step_r',
                target: 'op_finish',
                type: 'customTransition',
                data: {
                  mode: '4-tuple',
                  subMode: 'operational',
                  rules: [{ id: 'r_fin', readSymbol: '_' }],
                },
              },
            ];

            const defaultTemplateNodes: TuringNode[] = [
              {
                id: 'op_start',
                type: 'operationNode',
                position: { x: 120, y: 150 },
                data: { label: 'START', opType: 'START' },
              },
              {
                id: 'op_step_r',
                type: 'operationNode',
                position: { x: 300, y: 150 },
                data: { label: 'r', opType: 'SHIFT_R' },
              },
              {
                id: 'op_finish',
                type: 'operationNode',
                position: { x: 500, y: 150 },
                data: { label: 'FINISH', opType: 'FINISH' },
              },
            ];

            const compiledRules = compileOperationalDiagramTo4Tuples(
              defaultTemplateNodes,
              defaultTemplateEdges,
              project.alphabet
            );

            updatedProject = {
              ...project,
              subMode: 'operational',
              nodes: defaultTemplateNodes,
              edges: defaultTemplateEdges,
              rules4: compiledRules,
            };
          }
        } else {
          // State graph
          const compiledRules = compileOperationalDiagramTo4Tuples(
            project.nodes,
            project.edges,
            project.alphabet
          );
          const edges = restoreEdgePorts(
            buildEdgesFromRules(compiledRules, '4-tuple', 'state-graph'),
            project.edges
          );

          // Convert operational nodes into state nodes if needed
          const stateNodes: TuringNode[] = project.nodes.map((n) => {
            if (n.type === 'operationNode') {
              const opData = n.data as OperationNodeData;
              const isInitial = opData.opType === 'START';
              const isHalt = opData.opType === 'FINISH';
              return {
                id: n.id,
                type: 'stateNode' as const,
                position: { ...n.position },
                data: {
                  label: opData.label || n.id,
                  stateType: isInitial ? 'initial' : isHalt ? 'halt' : 'normal',
                  description: opData.description,
                },
              };
            }
            return n;
          });

          updatedProject = {
            ...project,
            subMode: 'state-graph',
            nodes: stateNodes,
            rules4: compiledRules,
            edges,
          };
        }

        get().updateActiveProject(() => updatedProject);
        set({ runtime: initRuntimeState(updatedProject) });
      },

      // --- Alphabet Management ---
      setAlphabetSymbols: (symbols: string[]) => {
        get().updateActiveProject((prev) => ({
          ...prev,
          alphabet: { ...prev.alphabet, symbols },
        }));
      },

      setBlankSymbol: (blankSymbol: BlankSymbolType) => {
        get().updateActiveProject((prev) => ({
          ...prev,
          alphabet: { ...prev.alphabet, blankSymbol },
        }));
      },

      applyAlphabetPreset: (presetKey: string) => {
        const preset = ALPHABET_PRESETS[presetKey];
        if (!preset) return;
        get().updateActiveProject((prev) => ({
          ...prev,
          alphabet: {
            symbols: [...preset.symbols],
            blankSymbol: preset.blank,
          },
        }));
      },

      refactorSymbol: (oldSymbol: string, newSymbol: string) => {
        get().updateActiveProject((prev) => {
          // Update alphabet
          const symbols = prev.alphabet.symbols.map((s) => (s === oldSymbol ? newSymbol : s));
          const blankSymbol =
            prev.alphabet.blankSymbol === oldSymbol
              ? (newSymbol as BlankSymbolType)
              : prev.alphabet.blankSymbol;

          // Update nodes (specifically OperationNode with opType === 'WRITE_SYM')
          const nodes = prev.nodes.map((node) => {
            if (node.type === 'operationNode') {
              const opData = node.data as OperationNodeData;
              if (opData.opType === 'WRITE_SYM' && opData.symbolToWrite === oldSymbol) {
                const updatedLabel =
                  opData.label === `[${oldSymbol}]` || opData.label === oldSymbol
                    ? `[${newSymbol}]`
                    : opData.label;
                return {
                  ...node,
                  data: {
                    ...opData,
                    symbolToWrite: newSymbol,
                    label: updatedLabel,
                  },
                };
              }
            }
            return node;
          });

          // Update rules5
          const rules5 = prev.rules5.map((r) => ({
            ...r,
            readSymbol: r.readSymbol === oldSymbol ? newSymbol : r.readSymbol,
            writeSymbol: r.writeSymbol === oldSymbol ? newSymbol : r.writeSymbol,
          }));

          // Update rules4
          let rules4 = prev.rules4.map((r) => ({
            ...r,
            readSymbol: r.readSymbol === oldSymbol ? newSymbol : r.readSymbol,
            command: r.command === oldSymbol ? newSymbol : r.command,
          }));

          // Update edges
          const edges = prev.edges.map((e) => ({
            ...e,
            data: {
              ...e.data,
              mode: e.data?.mode || prev.mode,
              subMode: e.data?.subMode || prev.subMode,
              rules: (e.data?.rules || []).map((r) => ({
                ...r,
                readSymbol: r.readSymbol === oldSymbol ? newSymbol : r.readSymbol,
                writeSymbol: r.writeSymbol === oldSymbol ? newSymbol : r.writeSymbol,
                command: r.command === oldSymbol ? newSymbol : r.command,
              })),
            },
          }));

          // If operational mode, re-derive rules4 with the new symbols and nodes
          if (prev.subMode === 'operational') {
            rules4 = compileOperationalDiagramTo4Tuples(nodes, edges, { symbols, blankSymbol });
          }

          // Update initial tape
          const initialTape: Record<number, string> = {};
          for (const [pos, val] of Object.entries(prev.initialTape)) {
            initialTape[Number(pos)] = val === oldSymbol ? newSymbol : val;
          }

          // Update test cases
          const testCases = prev.testCases.map((tc) => ({
            ...tc,
            inputTape: tc.inputTape.split(oldSymbol).join(newSymbol),
            expectedTape: tc.expectedTape
              ? tc.expectedTape.split(oldSymbol).join(newSymbol)
              : undefined,
          }));

          // Update subMachines if any
          const subMachines = (prev.subMachines || []).map((sm) => ({
            ...sm,
            nodes: sm.nodes.map((node) => {
              if (node.type === 'operationNode') {
                const opData = node.data as OperationNodeData;
                if (opData.opType === 'WRITE_SYM' && opData.symbolToWrite === oldSymbol) {
                  return {
                    ...node,
                    data: {
                      ...opData,
                      symbolToWrite: newSymbol,
                      label: opData.label === `[${oldSymbol}]` ? `[${newSymbol}]` : opData.label,
                    },
                  };
                }
              }
              return node;
            }),
            rules4: (sm.rules4 || []).map((r) => ({
              ...r,
              readSymbol: r.readSymbol === oldSymbol ? newSymbol : r.readSymbol,
              command: r.command === oldSymbol ? newSymbol : r.command,
            })),
          }));

          return {
            ...prev,
            alphabet: { symbols, blankSymbol },
            nodes,
            rules5,
            rules4,
            edges,
            initialTape,
            testCases,
            subMachines,
          };
        });

        // Re-initialize runtime
        const active = get().getActiveProject();
        set({ runtime: initRuntimeState(active) });
      },

      // --- Graph / React Flow ---
      onNodesChange: (changes: NodeChange<TuringNode>[]) => {
        get().updateActiveProject((prev) => {
          const newNodes = applyNodeChanges(changes, prev.nodes);
          const removedIds = new Set(
            changes.filter((c) => c.type === 'remove').map((c) => c.id)
          );
          if (removedIds.size === 0) {
            return {
              ...prev,
              nodes: newNodes,
            };
          }
          const newEdges = prev.edges.filter(
            (e) => !removedIds.has(e.source) && !removedIds.has(e.target)
          );
          const rules5 = prev.rules5.filter(
            (r) => !removedIds.has(r.fromState) && !removedIds.has(r.toState)
          );
          let rules4 = prev.rules4.filter(
            (r) => !removedIds.has(r.fromState) && !removedIds.has(r.toState)
          );
          if (prev.subMode === 'operational') {
            rules4 = compileOperationalDiagramTo4Tuples(newNodes, newEdges, prev.alphabet);
          }
          return {
            ...prev,
            nodes: newNodes,
            edges: newEdges,
            rules5,
            rules4,
          };
        });
      },

      onEdgesChange: (changes: EdgeChange<TuringEdge>[]) => {
        get().updateActiveProject((prev) => {
          const removedChanges = changes.filter((c) => c.type === 'remove');
          if (removedChanges.length === 0) {
            return {
              ...prev,
              edges: applyEdgeChanges(changes, prev.edges),
            };
          }

          const removedIds = new Set(removedChanges.map((c) => c.id));
          const removedEdges = prev.edges.filter((e) => removedIds.has(e.id));
          const newEdges = applyEdgeChanges(changes, prev.edges);

          const removedPairs = new Set(removedEdges.map((e) => `${e.source}->${e.target}`));
          const removedRuleIds = new Set<string>();
          for (const e of removedEdges) {
            for (const r of e.data?.rules || []) {
              if (r.id) removedRuleIds.add(r.id);
            }
          }

          const rules5 = prev.rules5.filter(
            (r) => !removedPairs.has(`${r.fromState}->${r.toState}`) && !removedRuleIds.has(r.id)
          );

          let rules4 = prev.rules4.filter(
            (r) => !removedPairs.has(`${r.fromState}->${r.toState}`) && !removedRuleIds.has(r.id)
          );

          if (prev.subMode === 'operational') {
            rules4 = compileOperationalDiagramTo4Tuples(prev.nodes, newEdges, prev.alphabet);
          }

          return {
            ...prev,
            edges: newEdges,
            rules5,
            rules4,
          };
        });
      },

      portError: null,
      onConnect: (connection: Connection) => {
        if (!connection.source || !connection.target) return;
        const project = get().getActiveProject();
        const previous = project.edges.find(e => e.source === connection.source && e.target === connection.target);
        const proposed = { ...connection, id: previous?.id ?? 'pending' };
        const check = resolvePorts(project.nodes, [...project.edges.filter(e => e !== previous), proposed]);
        if (check.conflicts.has(connection.source) || check.conflicts.has(connection.target)) {
          set({ portError: 'Эта точка уже закреплена в другом направлении. Выберите свободную точку или измените подключение.' });
          return;
        }
        set({ portError: null });
        get().openRuleModal({
          edgeId: previous?.id,
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        });
      },

      reconnectEdge: (edgeId, connection, moved) => {
        if (!connection.source || !connection.target) return;
        const project = get().getActiveProject();
        const current = project.edges.find(e => e.id === edgeId);
        if (!current) return;
        const replacement: TuringEdge = {
          ...current, source: connection.source, target: connection.target,
          sourceHandle: moved === 'target' ? pinnedSide(current, 'source') : connection.sourceHandle,
          targetHandle: moved === 'source' ? pinnedSide(current, 'target') : connection.targetHandle,
          data: {
            ...(current.data ?? { mode: project.mode, rules: [] }),
            sourcePortMode: moved === 'target' ? current.data?.sourcePortMode : 'manual',
            targetPortMode: moved === 'source' ? current.data?.targetPortMode : 'manual',
          },
        };
        const check = resolvePorts(project.nodes, project.edges.map(e => e.id === edgeId ? replacement : e));
        if (check.conflicts.has(connection.source) || check.conflicts.has(connection.target)) {
          set({ portError: 'Невозможно совместить вход и выход в одной точке.' });
          return;
        }
        set({ portError: null });
        get().updateActiveProject((prev) => {
          const oldEdge = prev.edges.find((edge) => edge.id === edgeId);
          if (!oldEdge) return prev;

          const edges = prev.edges.map((edge) =>
            edge.id === edgeId
              ? replacement
              : edge
          );
          const rules5 = prev.rules5.map((rule) =>
            rule.fromState === oldEdge.source && rule.toState === oldEdge.target
              ? { ...rule, fromState: connection.source!, toState: connection.target! }
              : rule
          );
          let rules4 = prev.rules4.map((rule) =>
            rule.fromState === oldEdge.source && rule.toState === oldEdge.target
              ? { ...rule, fromState: connection.source!, toState: connection.target! }
              : rule
          );

          if (prev.subMode === 'operational') {
            rules4 = compileOperationalDiagramTo4Tuples(prev.nodes, edges, prev.alphabet);
          }

          return { ...prev, edges, rules5, rules4 };
        });
      },

      addStateNode: (type: StateNodeType, label?: string, position?: { x: number; y: number }) => {
        const project = get().getActiveProject();
        let idx = project.nodes.length;
        let newId = type === 'halt' ? 'q_halt' : `q${idx}`;
        const existingIds = new Set(project.nodes.map((n) => n.id));
        while (existingIds.has(newId)) {
          idx++;
          newId = type === 'halt' ? `q_halt_${idx}` : `q${idx}`;
        }
        const count = project.nodes.length;
        const newNode: TuringNode = {
          id: newId,
          type: 'stateNode',
          position:
            position ?? {
              x: 100 + (count % 4) * 180,
              y: 100 + Math.floor(count / 4) * 140,
            },
          data: {
            label: label || newId,
            stateType: type,
          },
        };

        get().updateActiveProject((prev) => ({
          ...prev,
          nodes: [...prev.nodes, newNode],
        }));
      },

      addOperationNode: (
        opType: OperationalNodeType,
        label?: string,
        symbolToWrite?: string,
        position?: { x: number; y: number }
      ) => {
        const project = get().getActiveProject();
        let count = project.nodes.length;
        let newId = `op_${opType.toLowerCase()}_${count}`;
        const existingIds = new Set(project.nodes.map((n) => n.id));
        while (existingIds.has(newId)) {
          count++;
          newId = `op_${opType.toLowerCase()}_${count}`;
        }
        const newNode: TuringNode = {
          id: newId,
          type: 'operationNode',
          position:
            position ?? {
              x: 100 + (count % 4) * 180,
              y: 100 + Math.floor(count / 4) * 140,
            },
          data: {
            label: label || opType,
            opType,
            symbolToWrite,
          },
        };

        get().updateActiveProject((prev) => ({
          ...prev,
          nodes: [...prev.nodes, newNode],
        }));
      },

      updateNodeData: (id: string, data: Record<string, unknown>) => {
        get().updateActiveProject((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          ),
        }));
      },

      deleteNode: (id: string) => {
        get().updateActiveProject((prev) => {
          const newNodes = prev.nodes.filter((n) => n.id !== id);
          const newEdges = prev.edges.filter((e) => e.source !== id && e.target !== id);
          const rules5 = prev.rules5.filter((r) => r.fromState !== id && r.toState !== id);
          let rules4 = prev.rules4.filter((r) => r.fromState !== id && r.toState !== id);
          if (prev.subMode === 'operational') {
            rules4 = compileOperationalDiagramTo4Tuples(newNodes, newEdges, prev.alphabet);
          }
          return {
            ...prev,
            nodes: newNodes,
            edges: newEdges,
            rules5,
            rules4,
          };
        });
      },

      applyAutoLayout: () => {
        const project = get().getActiveProject();
        const newNodes = autoLayoutGraph(project.nodes, project.edges);
        get().updateActiveProject((prev) => ({
          ...prev,
          nodes: newNodes,
        }));
      },

      // --- Rule Sync ---
      addFiveTupleRule: (rule) => {
        const newRule: FiveTupleRule = {
          ...rule,
          id: `r5_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        };
        get().updateActiveProject((prev) => {
          const rules5 = [...prev.rules5, newRule];
          const pendingConnection = get().ruleModalData;
          const edges = restoreEdgePorts(
            buildEdgesFromRules(rules5, '5-tuple'),
            prev.edges
          ).map((edge) =>
            pendingConnection?.sourceNodeId === edge.source &&
            pendingConnection?.targetNodeId === edge.target
              ? {
                  ...edge,
                  sourceHandle:
                    pendingConnection.sourceHandle ??
                    prev.edges.find((old) => old.source === edge.source && old.target === edge.target)
                      ?.sourceHandle,
                  targetHandle:
                    pendingConnection.targetHandle ??
                    prev.edges.find((old) => old.source === edge.source && old.target === edge.target)
                      ?.targetHandle,
                }
              : edge
          );
          return { ...prev, rules5, edges };
        });
      },

      updateFiveTupleRule: (id, partial) => {
        get().updateActiveProject((prev) => {
          const rules5 = prev.rules5.map((r) => (r.id === id ? { ...r, ...partial } : r));
          const edges = restoreEdgePorts(
            buildEdgesFromRules(rules5, '5-tuple'),
            prev.edges
          );
          return { ...prev, rules5, edges };
        });
      },

      deleteFiveTupleRule: (id) => {
        get().updateActiveProject((prev) => {
          const rules5 = prev.rules5.filter((r) => r.id !== id);
          const edges = restoreEdgePorts(
            buildEdgesFromRules(rules5, '5-tuple'),
            prev.edges
          );
          return { ...prev, rules5, edges };
        });
      },

      addFourTupleRule: (rule) => {
        const newRule: FourTupleRule = {
          ...rule,
          id: `r4_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        };
        get().updateActiveProject((prev) => {
          const rules4 = [...prev.rules4, newRule];
          const pendingConnection = get().ruleModalData;
          const edges = restoreEdgePorts(
            buildEdgesFromRules(rules4, '4-tuple', prev.subMode),
            prev.edges
          ).map((edge) =>
            pendingConnection?.sourceNodeId === edge.source &&
            pendingConnection?.targetNodeId === edge.target
              ? {
                  ...edge,
                  sourceHandle:
                    pendingConnection.sourceHandle ??
                    prev.edges.find((old) => old.source === edge.source && old.target === edge.target)
                      ?.sourceHandle,
                  targetHandle:
                    pendingConnection.targetHandle ??
                    prev.edges.find((old) => old.source === edge.source && old.target === edge.target)
                      ?.targetHandle,
                }
              : edge
          );
          return { ...prev, rules4, edges };
        });
      },

      updateFourTupleRule: (id, partial) => {
        get().updateActiveProject((prev) => {
          const rules4 = prev.rules4.map((r) => (r.id === id ? { ...r, ...partial } : r));
          const edges = restoreEdgePorts(
            buildEdgesFromRules(rules4, '4-tuple', prev.subMode),
            prev.edges
          );
          return { ...prev, rules4, edges };
        });
      },

      deleteFourTupleRule: (id) => {
        get().updateActiveProject((prev) => {
          if (prev.subMode === 'operational') {
            const newEdges: TuringEdge[] = prev.edges.map((e) => {
              const rules = e.data?.rules || [];
              if (rules.some((r) => r.id === id)) {
                return {
                  ...e,
                  data: {
                    ...e.data,
                    mode: e.data?.mode ?? prev.mode,
                    rules: rules.filter((r) => r.id !== id),
                  },
                };
              }
              return e;
            });
            const rules4 = compileOperationalDiagramTo4Tuples(
              prev.nodes,
              newEdges,
              prev.alphabet
            );
            return {
              ...prev,
              edges: newEdges,
              rules4,
            };
          }

          const rules4 = prev.rules4.filter((r) => r.id !== id);
          const edges = restoreEdgePorts(
            buildEdgesFromRules(rules4, '4-tuple', prev.subMode),
            prev.edges
          );
          return { ...prev, rules4, edges };
        });
      },

      deleteEdgeRule: (edgeId: string, ruleId: string) => {
        get().updateActiveProject((prev) => {
          const newEdges: TuringEdge[] = prev.edges.map((e) => {
            if (e.id === edgeId || (e.data?.rules || []).some((r) => r.id === ruleId)) {
              const rules = (e.data?.rules || []).filter((r) => r.id !== ruleId);
              return {
                ...e,
                data: {
                  ...e.data,
                  mode: e.data?.mode ?? prev.mode,
                  rules,
                },
              };
            }
            return e;
          });

          const rules5 = prev.rules5.filter((r) => r.id !== ruleId);
          let rules4 = prev.rules4.filter((r) => r.id !== ruleId);

          if (prev.subMode === 'operational') {
            rules4 = compileOperationalDiagramTo4Tuples(
              prev.nodes,
              newEdges,
              prev.alphabet
            );
          }

          return {
            ...prev,
            edges: newEdges,
            rules5,
            rules4,
          };
        });
      },

      // --- Tape & Debugger ---
      setTapeCell: (pos: number, sym: string) => {
        set((state) => ({
          runtime: {
            ...state.runtime,
            tape: { ...state.runtime.tape, [pos]: sym },
          },
        }));
      },

      setTapeString: (word: string, startPos = 0) => {
        const newTape: Record<number, string> = {};
        for (let i = 0; i < word.length; i++) {
          newTape[startPos + i] = word[i];
        }
        set((state) => ({
          runtime: {
            ...state.runtime,
            tape: newTape,
            headPosition: startPos,
          },
        }));
      },

      setHeadPosition: (pos: number) => {
        set((state) => ({
          runtime: {
            ...state.runtime,
            headPosition: pos,
          },
        }));
      },

      saveTapeToInitialBuffer: () => {
        const currentTape = { ...get().runtime.tape };
        const currentHead = get().runtime.headPosition;
        get().updateActiveProject((prev) => ({
          ...prev,
          initialTape: currentTape,
          initialHeadPosition: currentHead,
        }));
      },

      resetTapeFromInitialBuffer: () => {
        const active = get().getActiveProject();
        set({
          runtime: initRuntimeState(active),
          isRunning: false,
        });
      },

      resetExecution: () => {
        const active = get().getActiveProject();
        set({
          runtime: initRuntimeState(active),
          isRunning: false,
        });
      },

      stepForward: () => {
        const project = get().getActiveProject();
        const nextRuntime = stepMachine(project, get().runtime);
        set({ runtime: nextRuntime });
      },

      stepBack: () => {
        const prevRuntime = stepBackMachine(get().runtime);
        set({ runtime: prevRuntime, isRunning: false });
      },

      startRunning: () => {
        set({ isRunning: true });
      },

      pauseRunning: () => {
        set({ isRunning: false });
      },

      toggleRunning: () => {
        const { isRunning, startRunning, pauseRunning } = get();
        if (isRunning) pauseRunning();
        else startRunning();
      },

      getRuntimeStats: () => {
        const project = get().getActiveProject();
        return getRuntimeStats(project, get().runtime);
      },

      exportDiagramImage: async (options?: ExportImageOptions) => {
        try {
          const project = get().getActiveProject();
          const filename = options?.filename ?? `${project.name.replace(/\s+/g, '_')}_diagram`;
          return await exportDiagramAsImage('.react-flow', {
            ...options,
            filename,
          });
        } catch (err) {
          console.error('Failed to export diagram image:', err);
          return null;
        }
      },

      // --- Tests ---
      addTestCase: (tc) => {
        const newTc: TestCase = {
          ...tc,
          id: `tc_${Date.now()}`,
          status: 'idle',
        };
        get().updateActiveProject((prev) => ({
          ...prev,
          testCases: [...prev.testCases, newTc],
        }));
      },

      updateTestCase: (id, partial) => {
        get().updateActiveProject((prev) => ({
          ...prev,
          testCases: prev.testCases.map((tc) => (tc.id === id ? { ...tc, ...partial } : tc)),
        }));
      },

      deleteTestCase: (id) => {
        get().updateActiveProject((prev) => ({
          ...prev,
          testCases: prev.testCases.filter((tc) => tc.id !== id),
        }));
      },

      runAllTestCases: () => {
        const project = get().getActiveProject();
        const updated = project.testCases.map((tc) => runTestCase(project, tc));
        get().updateActiveProject((prev) => ({
          ...prev,
          testCases: updated,
        }));
      },

      runSingleTestCase: (id: string) => {
        const project = get().getActiveProject();
        const target = project.testCases.find((tc) => tc.id === id);
        if (!target) return;
        const result = runTestCase(project, target);
        get().updateActiveProject((prev) => ({
          ...prev,
          testCases: prev.testCases.map((tc) => (tc.id === id ? result : tc)),
        }));
      },
    }),
    {
      name: 'turing_diagrammer_storage_v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        theme: state.theme,
        executionSpeedMs: state.executionSpeedMs,
        keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
      }),
    }
  )
);

export const useActiveProject = (): ProjectSession => {
  return useTuringStore((s) => {
    return s.projects.find((p) => p.id === s.activeProjectId) || s.projects[0] || INITIAL_PROJECTS[0];
  });
};

export function getRuntimeStats(
  project: ProjectSession,
  runtime: RuntimeState
): RuntimeStats {
  const blank = project.alphabet.blankSymbol;
  const indices = Object.keys(runtime.tape).map(Number);
  const nonBlankIndices = indices.filter(
    (i) => runtime.tape[i] !== undefined && runtime.tape[i] !== blank
  );

  const minTapeIndex =
    indices.length > 0 ? Math.min(...indices, runtime.headPosition) : runtime.headPosition;
  const maxTapeIndex =
    indices.length > 0 ? Math.max(...indices, runtime.headPosition) : runtime.headPosition;

  const currentNode = project.nodes.find((n) => n.id === runtime.currentNodeId);
  const currentNodeLabel = currentNode?.data?.label ?? runtime.currentNodeId;
  const currentNodeType =
    (currentNode?.data as any)?.stateType ?? (currentNode?.data as any)?.opType;
  const currentSymbol = runtime.tape[runtime.headPosition] ?? blank;

  return {
    stepCount: runtime.stepCount,
    headPosition: runtime.headPosition,
    minTapeIndex,
    maxTapeIndex,
    tapeSpan: Math.max(1, maxTapeIndex - minTapeIndex + 1),
    nonBlankCellsCount: nonBlankIndices.length,
    currentNodeId: runtime.currentNodeId,
    currentNodeLabel,
    currentNodeType,
    status: runtime.status,
    statusMessage: runtime.statusMessage,
    visitedPositionsCount: runtime.visitedPositions.length,
    callStackDepth: runtime.callStack.length,
    currentSymbol,
  };
}

export function handleDebuggerKeyboardShortcut(
  e: KeyboardEvent,
  store = useTuringStore.getState()
): boolean {
  if (!store.keyboardShortcutsEnabled) return false;

  // Ignore keystrokes when typing into input fields
  const target = e.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      target.closest?.('[data-tape-strip]'))
  ) {
    return false;
  }

  // Space: Step forward (Shift+Space: Step back)
  if (e.code === 'Space') {
    e.preventDefault();
    if (e.shiftKey) {
      store.stepBack();
    } else {
      store.stepForward();
    }
    return true;
  }

  // Right Arrow: Step forward
  if (e.code === 'ArrowRight' && !e.altKey) {
    e.preventDefault();
    store.stepForward();
    return true;
  }

  // Left Arrow: Step back
  if (e.code === 'ArrowLeft' && !e.altKey) {
    e.preventDefault();
    store.stepBack();
    return true;
  }

  // Key R: Toggle run/pause
  if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    store.toggleRunning();
    return true;
  }

  // Delete / Backspace: remove the selected node or edge
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedNodeId) {
      e.preventDefault();
      store.deleteNode(store.selectedNodeId);
      store.setSelectedNodeId(null);
      store.setSelectedEdgeId(null);
      return true;
    }
    if (store.selectedEdgeId) {
      e.preventDefault();
      store.onEdgesChange([{ type: 'remove', id: store.selectedEdgeId }]);
      store.setSelectedEdgeId(null);
      return true;
    }
  }

  // Escape: Reset execution
  if (e.code === 'Escape') {
    e.preventDefault();
    store.resetExecution();
    return true;
  }

  return false;
}

export function useKeyboardShortcuts(): void {
  const keyboardShortcutsEnabled = useTuringStore((s) => s.keyboardShortcutsEnabled);
  const isRunning = useTuringStore((s) => s.isRunning);
  const stepForward = useTuringStore((s) => s.stepForward);
  const stepBack = useTuringStore((s) => s.stepBack);
  const toggleRunning = useTuringStore((s) => s.toggleRunning);
  const resetExecution = useTuringStore((s) => s.resetExecution);

  useEffect(() => {
    if (!keyboardShortcutsEnabled || typeof window === 'undefined') return;

    const listener = (e: KeyboardEvent) => {
      handleDebuggerKeyboardShortcut(e);
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [keyboardShortcutsEnabled, isRunning, stepForward, stepBack, toggleRunning, resetExecution]);
}

export const useRuntimeStats = (): RuntimeStats => {
  return useTuringStore((state) => {
    const project =
      state.projects.find((p) => p.id === state.activeProjectId) ||
      state.projects[0] ||
      INITIAL_PROJECTS[0];
    return getRuntimeStats(project, state.runtime);
  });
};
