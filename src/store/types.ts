import { StateCreator } from 'zustand';
import {
  ProjectSession,
  TuringMode,
  FourTupleSubMode,
  BlankSymbolType,
  AlphabetConfig,
  FiveTupleRule,
  FourTupleRule,
  TuringNode,
  TuringEdge,
  TestCase,
  StateNodeType,
  OperationalNodeType,
  RuntimeStats,
  SubMachine,
} from '../types/turing';
import { RuntimeState } from '../engine/simulator';
import { ExportImageOptions } from '../utils/exportImage';
import { NodeChange, EdgeChange, Connection } from '@xyflow/react';

export interface EditorSnapshot {
  mode: TuringMode;
  subMode: FourTupleSubMode;
  alphabet: AlphabetConfig;
  nodes: TuringNode[];
  edges: TuringEdge[];
  rules5: FiveTupleRule[];
  rules4: FourTupleRule[];
  subMachines?: SubMachine[];
}

export interface RuleModalData {
  edgeId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  ruleId?: string;
}

export interface ConfirmModalData {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export interface UiSlice {
  theme: 'light' | 'dark';
  activeTab: 'check' | 'tests';
  isInspectorOpen: boolean;
  tapeError: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isSessionDrawerOpen: boolean;
  isAlphabetModalOpen: boolean;
  isExportModalOpen: boolean;
  isRuleModalOpen: boolean;
  ruleModalData: RuleModalData | null;
  confirmModal: ConfirmModalData | null;
  executionSpeedMs: number;
  isRunning: boolean;
  keyboardShortcutsEnabled: boolean;

  toggleTheme: () => void;
  setActiveTab: (tab: 'check' | 'tests') => void;
  setInspectorOpen: (open: boolean) => void;
  setTapeError: (error: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  setSessionDrawerOpen: (open: boolean) => void;
  setAlphabetModalOpen: (open: boolean) => void;
  setExportModalOpen: (open: boolean) => void;
  openRuleModal: (data: RuleModalData) => void;
  closeRuleModal: () => void;
  openConfirmModal: (data: ConfirmModalData) => void;
  closeConfirmModal: () => void;
  setExecutionSpeedMs: (speed: number) => void;
  toggleKeyboardShortcuts: () => void;
  setKeyboardShortcutsEnabled: (enabled: boolean) => void;
}

export interface ProjectSlice {
  projects: ProjectSession[];
  activeProjectId: string;

  getActiveProject: () => ProjectSession;
  updateActiveProject: (updater: (prev: ProjectSession) => ProjectSession) => void;
  switchProject: (id: string) => void;
  createProject: (mode?: TuringMode, subMode?: FourTupleSubMode, name?: string) => void;
  duplicateProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  updateProjectDescription: (id: string, description: string) => void;
  deleteProject: (id: string) => void;
  importProject: (project: ProjectSession) => void;
  addVTMCode: (code: string, name?: string) => boolean;
  exportDiagramImage: (options?: ExportImageOptions) => Promise<string | null>;
}

export interface GraphSlice {
  editorUndoStack: EditorSnapshot[];
  editorRedoStack: EditorSnapshot[];
  portError: string | null;

  pushEditorSnapshot: (snapshot?: EditorSnapshot) => void;
  clearEditorHistory: () => void;
  undoEditor: () => void;
  redoEditor: () => void;

  onNodesChange: (changes: NodeChange<TuringNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<TuringEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  reconnectEdge: (edgeId: string, connection: Connection, moved?: 'source' | 'target') => void;
  addStateNode: (type: StateNodeType, label?: string, position?: { x: number; y: number }) => void;
  addOperationNode: (
    opType: OperationalNodeType,
    label?: string,
    symbolToWrite?: string,
    position?: { x: number; y: number }
  ) => void;
  insertVTMCode: (code: string) => boolean;
  addProjectFunction: (
    sourceProjectId: string,
    code: string,
    position?: { x: number; y: number },
    insertNode?: boolean
  ) => boolean;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  updateEdgeLabelOffset: (edgeId: string, labelOffset: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  deleteGraphElements: (nodeIds: string[], edgeIds: string[]) => void;
  clearCanvas: () => void;
  applyAutoLayout: () => void;
}

export interface RulesSlice {
  setMode: (mode: TuringMode) => void;
  setSubMode: (subMode: FourTupleSubMode, force?: boolean) => void;
  switchMode: (mode: TuringMode, subMode?: FourTupleSubMode, force?: boolean) => void;

  setAlphabetSymbols: (symbols: string[]) => void;
  setBlankSymbol: (blank: BlankSymbolType) => void;
  applyAlphabetPreset: (presetKey: string) => void;
  refactorSymbol: (oldSymbol: string, newSymbol: string) => void;

  addFiveTupleRule: (rule: Omit<FiveTupleRule, 'id'>) => void;
  updateFiveTupleRule: (id: string, rule: Partial<FiveTupleRule>) => void;
  deleteFiveTupleRule: (id: string) => void;

  addFourTupleRule: (rule: Omit<FourTupleRule, 'id'>) => void;
  updateFourTupleRule: (id: string, rule: Partial<FourTupleRule>) => void;
  deleteFourTupleRule: (id: string) => void;
  deleteEdgeRule: (edgeId: string, ruleId: string) => void;
  upsertOperationalEdgeRule: (params: {
    edgeId?: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    ruleId?: string;
    readSymbol: string;
    isWildcard: boolean;
    isComplement: boolean;
  }) => void;
}

export interface RuntimeSlice {
  runtime: RuntimeState;

  setTapeCell: (pos: number, sym: string) => void;
  setTapeString: (word: string, startPos?: number) => void;
  clearTape: () => void;
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

  addTestCase: (tc: Omit<TestCase, 'id'>) => void;
  updateTestCase: (id: string, tc: Partial<TestCase>) => void;
  deleteTestCase: (id: string) => void;
  runAllTestCases: () => void;
  runSingleTestCase: (id: string) => void;
}

export type TuringStoreState = UiSlice & ProjectSlice & GraphSlice & RulesSlice & RuntimeSlice;

export type SliceCreator<T> = StateCreator<TuringStoreState, [], [], T>;
