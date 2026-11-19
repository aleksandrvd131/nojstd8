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
  keyboardShortcutsEnabled: boolean;

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
          const edges = buildEdgesFromRules(compiledRules, '4-tuple', 'state-graph');

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

      onConnect: (connection: Connection) => {
        if (!connection.source || !connection.target) return;
        get().openRuleModal({
          sourceNodeId: connection.source,
          targetNodeId: connection.target,
        });
      },

      addStateNode: (type: StateNodeType, label?: string) => {
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
          const edges = buildEdgesFromRules(rules4, '4-tuple', prev.subMode);
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
      target.isContentEditable)
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
