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
  SubMachine,
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
} from '../engine/transpiler';
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
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 100, nodesep: 60 });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: 140, height: 75 });
  });

  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos ? pos.x - 70 : n.position.x,
        y: pos ? pos.y - 37 : n.position.y,
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
  } | null;
  executionSpeedMs: number;
  isRunning: boolean;

  // Actions
  toggleTheme: () => void;
  setActiveTab: (tab: 'tuples' | 'matrix' | 'check' | 'tests') => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setSessionDrawerOpen: (open: boolean) => void;
  setAlphabetModalOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  openRuleModal: (data: { edgeId?: string; sourceNodeId?: string; targetNodeId?: string; ruleId?: string }) => void;
  closeRuleModal: () => void;
  setExecutionSpeedMs: (speed: number) => void;

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
  setSubMode: (subMode: FourTupleSubMode) => void;

  // Alphabet Management
  setAlphabetSymbols: (symbols: string[]) => void;
  setBlankSymbol: (blank: BlankSymbolType) => void;
  applyAlphabetPreset: (presetKey: string) => void;
  refactorSymbol: (oldSymbol: string, newSymbol: string) => void;

  // Graph / Canvas
  onNodesChange: (changes: NodeChange<TuringNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<TuringEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addStateNode: (type: StateNodeType, label?: string) => void;
  addOperationNode: (opType: OperationalNodeType, label?: string, symbolToWrite?: string) => void;
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

  // Tests
  addTestCase: (tc: Omit<TestCase, 'id'>) => void;
  updateTestCase: (id: string, tc: Partial<TestCase>) => void;
  deleteTestCase: (id: string) => void;
  runAllTestCases: () => void;
  runSingleTestCase: (id: string) => void;
}

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
          initialTape: { 0: '1', 1: '0', 2: '1' },
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
          const newEdges = buildEdgesFromRules(rules4, '4-tuple', project.subMode);

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
          const newEdges = buildEdgesFromRules(rules5, '5-tuple');

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

      setSubMode: (newSubMode: FourTupleSubMode) => {
        const project = get().getActiveProject();
        if (project.mode !== '4-tuple' || project.subMode === newSubMode) return;

        let updatedProject: ProjectSession;
        if (newSubMode === 'operational') {
          // Operational VTM Diagram
          updatedProject = {
            ...project,
            subMode: 'operational',
            nodes: [
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
            ],
            edges: [
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
            ],
          };
        } else {
          // State graph
          const compiledRules = compileOperationalDiagramTo4Tuples(
            project.nodes,
            project.edges,
            project.alphabet
          );
          const edges = buildEdgesFromRules(compiledRules, '4-tuple', 'state-graph');
          updatedProject = {
            ...project,
            subMode: 'state-graph',
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

          // Update rules5
          const rules5 = prev.rules5.map((r) => ({
            ...r,
            readSymbol: r.readSymbol === oldSymbol ? newSymbol : r.readSymbol,
            writeSymbol: r.writeSymbol === oldSymbol ? newSymbol : r.writeSymbol,
          }));

          // Update rules4
          const rules4 = prev.rules4.map((r) => ({
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

          return {
            ...prev,
            alphabet: { symbols, blankSymbol },
            rules5,
            rules4,
            edges,
            initialTape,
            testCases,
          };
        });

        // Re-initialize runtime
        const active = get().getActiveProject();
        set({ runtime: initRuntimeState(active) });
      },

      // --- Graph / React Flow ---
      onNodesChange: (changes: NodeChange<TuringNode>[]) => {
        get().updateActiveProject((prev) => ({
          ...prev,
          nodes: applyNodeChanges(changes, prev.nodes),
        }));
      },

      onEdgesChange: (changes: EdgeChange<TuringEdge>[]) => {
        get().updateActiveProject((prev) => ({
          ...prev,
          edges: applyEdgeChanges(changes, prev.edges),
        }));
      },

      onConnect: (connection: Connection) => {
        if (!connection.source || !connection.target) return;
        get().openRuleModal({
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
        });
      },

      addStateNode: (type: StateNodeType, label?: string) => {
        const project = get().getActiveProject();
        const count = project.nodes.filter((n) => n.type === 'stateNode').length;
        const newId = `q${count}`;
        const newNode: TuringNode = {
          id: newId,
          type: 'stateNode',
          position: {
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

      addOperationNode: (opType: OperationalNodeType, label?: string, symbolToWrite?: string) => {
        const project = get().getActiveProject();
        const count = project.nodes.length;
        const newId = `op_${opType.toLowerCase()}_${count}`;
        const newNode: TuringNode = {
          id: newId,
          type: 'operationNode',
          position: {
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
        get().updateActiveProject((prev) => ({
          ...prev,
          nodes: prev.nodes.filter((n) => n.id !== id),
          edges: prev.edges.filter((e) => e.source !== id && e.target !== id),
          rules5: prev.rules5.filter((r) => r.fromState !== id && r.toState !== id),
          rules4: prev.rules4.filter((r) => r.fromState !== id && r.toState !== id),
        }));
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
          const edges = buildEdgesFromRules(rules5, '5-tuple');
          return { ...prev, rules5, edges };
        });
      },

      updateFiveTupleRule: (id, partial) => {
        get().updateActiveProject((prev) => {
          const rules5 = prev.rules5.map((r) => (r.id === id ? { ...r, ...partial } : r));
          const edges = buildEdgesFromRules(rules5, '5-tuple');
          return { ...prev, rules5, edges };
        });
      },

      deleteFiveTupleRule: (id) => {
        get().updateActiveProject((prev) => {
          const rules5 = prev.rules5.filter((r) => r.id !== id);
          const edges = buildEdgesFromRules(rules5, '5-tuple');
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
          const edges = buildEdgesFromRules(rules4, '4-tuple', prev.subMode);
          return { ...prev, rules4, edges };
        });
      },

      updateFourTupleRule: (id, partial) => {
        get().updateActiveProject((prev) => {
          const rules4 = prev.rules4.map((r) => (r.id === id ? { ...r, ...partial } : r));
          const edges = buildEdgesFromRules(rules4, '4-tuple', prev.subMode);
          return { ...prev, rules4, edges };
        });
      },

      deleteFourTupleRule: (id) => {
        get().updateActiveProject((prev) => {
          const rules4 = prev.rules4.filter((r) => r.id !== id);
          const edges = buildEdgesFromRules(rules4, '4-tuple', prev.subMode);
          return { ...prev, rules4, edges };
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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        theme: state.theme,
        executionSpeedMs: state.executionSpeedMs,
      }),
    }
  )
);
