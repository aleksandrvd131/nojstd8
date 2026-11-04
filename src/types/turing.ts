import { Node, Edge } from '@xyflow/react';

export type TuringMode = '5-tuple' | '4-tuple';
export type FourTupleSubMode = 'state-graph' | 'operational';

export type MoveDirection = 'L' | 'R' | 'N';

export type BlankSymbolType = 'λ' | '_' | '␣' | 'a0';

export interface AlphabetConfig {
  symbols: string[]; // e.g. ['0', '1']
  blankSymbol: BlankSymbolType;
}

export type StateNodeType = 'initial' | 'normal' | 'halt' | 'accept' | 'reject';

export type OperationalNodeType =
  | 'START'
  | 'FINISH'
  | 'SHIFT_L'    // l
  | 'SHIFT_R'    // r
  | 'SEARCH_L'   // L (until blank)
  | 'SEARCH_R'   // R (until blank)
  | 'WRITE_SYM'  // [a]
  | 'COMPLEX_MACHINE'; // Nested sub-machine call

export interface FiveTupleRule {
  id: string;
  fromState: string;
  readSymbol: string;
  writeSymbol: string;
  move: MoveDirection;
  toState: string;
}

export interface FourTupleRule {
  id: string;
  fromState: string;
  readSymbol: string;
  command: string; // writeSymbol or 'L' | 'R' | 'N'
  toState: string;
}

export interface StateNodeData extends Record<string, unknown> {
  label: string;
  stateType: StateNodeType;
  description?: string;
  isCurrent?: boolean;
}

export interface OperationNodeData extends Record<string, unknown> {
  label: string;
  opType: OperationalNodeType;
  symbolToWrite?: string;
  subMachineId?: string;
  subMachineName?: string;
  description?: string;
  isCurrent?: boolean;
}

export type TuringNode = Node<StateNodeData | OperationNodeData>;

export interface EdgeRuleItem {
  id: string;
  readSymbol: string;
  // For 5-tuple
  writeSymbol?: string;
  move?: MoveDirection;
  // For 4-tuple state graph
  command?: string;
  // For operational diagram (VTM)
  isWildcard?: boolean; // '*'
  isComplement?: boolean; // '¬a'
}

export interface CustomEdgeData extends Record<string, unknown> {
  rules: EdgeRuleItem[];
  mode: TuringMode;
  subMode?: FourTupleSubMode;
  isBiDirectional?: boolean;
  offsetDirection?: 1 | -1;
  isActive?: boolean;
}

export type TuringEdge = Edge<CustomEdgeData>;

export interface SubMachine {
  id: string;
  name: string;
  description?: string;
  nodes: TuringNode[];
  edges: TuringEdge[];
  rules4: FourTupleRule[];
}

export interface TestCase {
  id: string;
  name: string;
  inputTape: string;
  initialHeadPos?: number;
  expectedTape?: string;
  expectedHeadPos?: number;
  lastActualTape?: string;
  lastActualHeadPos?: number;
  lastStepsCount?: number;
  status?: 'idle' | 'passed' | 'failed' | 'error';
  errorMessage?: string;
}

export type SparseTape = Record<number, string>;

export interface CallStackFrame {
  subMachineId: string;
  subMachineName: string;
  returnNodeId: string;
}

export interface ExecutionSnapshot {
  currentNodeId: string;
  headPosition: number;
  tape: SparseTape;
  stepCount: number;
  visitedPositions: number[];
  callStack: CallStackFrame[];
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ProjectSession {
  id: string;
  name: string;
  description: string;
  mode: TuringMode;
  subMode: FourTupleSubMode;
  alphabet: AlphabetConfig;
  nodes: TuringNode[];
  edges: TuringEdge[];
  rules5: FiveTupleRule[];
  rules4: FourTupleRule[];
  subMachines: SubMachine[];
  initialTape: SparseTape;
  initialHeadPosition: number;
  testCases: TestCase[];
  createdAt: number;
  updatedAt: number;
}
