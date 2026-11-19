if (typeof globalThis.localStorage === 'undefined') {
  const memStore = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => memStore.get(k) ?? null,
    setItem: (k: string, v: string) => { memStore.set(k, v); },
    removeItem: (k: string) => { memStore.delete(k); },
    clear: () => { memStore.clear(); },
  };
}

import { ProjectSession } from '../types/turing';
import { DEMO_PROJECT_1, DEMO_PROJECT_2, DEMO_PROJECT_3 } from '../store/demoProjects';
import { useTuringStore, autoLayoutGraph } from '../store/useTuringStore';
import { runTestCase, initRuntimeState, stepMachine } from './simulator';
import {
  convert5TupleTo4Tuple,
  convert4TupleTo5Tuple,
  compileOperationalDiagramTo4Tuples,
} from './transpiler';
import { validateMachine } from './validator';
import { exportToLaTeX, exportToPlantUML, exportToMarkdown, exportProjectToJSON, importProjectFromJSON } from './exporter';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAILED: ${msg}`);
    throw new Error(`Test failed: ${msg}`);
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

console.log('--- 1. Testing Demo Project 1 (5-Tuple Mode) ---');
for (const tc of DEMO_PROJECT_1.testCases) {
  const result = runTestCase(DEMO_PROJECT_1, tc);
  assert(result.status === 'passed', `Test Case "${tc.name}" -> Actual: "${result.lastActualTape}", Expected: "${tc.expectedTape}"`);
}

console.log('--- 2. Testing Demo Project 2 (4-Tuple Mode - Increment) ---');
for (const tc of DEMO_PROJECT_2.testCases) {
  const result = runTestCase(DEMO_PROJECT_2, tc);
  assert(result.status === 'passed', `Test Case "${tc.name}" -> Actual: "${result.lastActualTape}", Expected: "${tc.expectedTape}"`);
}

console.log('--- 3. Testing Demo Project 3 (Operational VTM Diagram) ---');
const vtmState = initRuntimeState(DEMO_PROJECT_3, '1#');
let current = vtmState;
let steps = 0;
while (current.status !== 'halted' && current.status !== 'error' && steps < 100) {
  current = stepMachine(DEMO_PROJECT_3, current);
  steps++;
}
assert(current.status === 'halted', `VTM diagram halted successfully in ${steps} steps`);

console.log('--- 4. Testing Transpiler (5-Tuple <-> 4-Tuple) ---');
const { rules4, auxiliaryNodes } = convert5TupleTo4Tuple(DEMO_PROJECT_1.rules5);
assert(rules4.length > 0, `Converted ${DEMO_PROJECT_1.rules5.length} 5-tuples into ${rules4.length} 4-tuples with ${auxiliaryNodes.length} aux states`);

const backTo5 = convert4TupleTo5Tuple(rules4);
assert(backTo5.length === rules4.length, `Converted ${rules4.length} 4-tuples back to ${backTo5.length} 5-tuples`);

const compiledOps = compileOperationalDiagramTo4Tuples(DEMO_PROJECT_3.nodes, DEMO_PROJECT_3.edges, DEMO_PROJECT_3.alphabet);
assert(compiledOps.length > 0, `Compiled operational diagram into ${compiledOps.length} 4-tuple rules`);

console.log('--- 5. Testing Validator (Static Checker) ---');
const issues1 = validateMachine(DEMO_PROJECT_1);
const errors1 = issues1.filter((i) => i.severity === 'error');
assert(errors1.length === 0, `Demo Project 1 has 0 validation errors (found ${issues1.length} total info/warns)`);

const issues2 = validateMachine(DEMO_PROJECT_2);
const errors2 = issues2.filter((i) => i.severity === 'error');
assert(errors2.length === 0, `Demo Project 2 has 0 validation errors`);

// Test invalid machine detection
const invalidProject = {
  ...DEMO_PROJECT_1,
  nodes: [], // No initial state
  rules5: [
    { id: '1', fromState: 'q0', readSymbol: '0', writeSymbol: '1', move: 'R' as const, toState: 'q1' },
    { id: '2', fromState: 'q0', readSymbol: '0', writeSymbol: '0', move: 'L' as const, toState: 'q2' }, // Non-deterministic!
  ],
};
const invalidIssues = validateMachine(invalidProject);
assert(invalidIssues.some((i) => i.id === 'no_initial_state'), 'Validator correctly detected missing initial state');
assert(invalidIssues.some((i) => i.id.startsWith('non_det_')), 'Validator correctly detected non-determinism');

console.log('--- 6. Testing Exporters ---');
const jsonStr = exportProjectToJSON(DEMO_PROJECT_1);
const reimported = importProjectFromJSON(jsonStr);
assert(reimported.name === DEMO_PROJECT_1.name, 'JSON export & import round-trip preserved project name');

const latex = exportToLaTeX(DEMO_PROJECT_1);
assert(latex.includes('\\begin{table}') && latex.includes('q0'), 'LaTeX export generates valid table');

const puml = exportToPlantUML(DEMO_PROJECT_1);
assert(puml.includes('@startuml') && puml.includes('@enduml'), 'PlantUML export generates valid diagram syntax');

const md = exportToMarkdown(DEMO_PROJECT_1);
assert(md.includes('| Состояние $q$ |'), 'Markdown export generates valid markdown table');

console.log('--- 7. Testing Graph Canvas & Node Dragging Reactivity ---');

// 7.1 Verify active project nodes initially exist
const store = useTuringStore.getState();
const initialProject = store.getActiveProject();
const initialQ0 = initialProject.nodes.find((n) => n.id === 'q0');
assert(!!initialQ0, 'Initial node q0 exists in active project');
const initialPos = { ...initialQ0!.position };

// 7.2 Test dragging q0 via onNodesChange
let subscriptionFired = false;
let updatedNodesInSubscription: any[] = [];
const unsubscribe = useTuringStore.subscribe((state) => {
  const p = state.projects.find((proj) => proj.id === state.activeProjectId);
  if (p) {
    subscriptionFired = true;
    updatedNodesInSubscription = p.nodes;
  }
});

store.onNodesChange([
  {
    id: 'q0',
    type: 'position',
    position: { x: initialPos.x + 150, y: initialPos.y + 200 },
    dragging: true,
  },
]);

const afterDragStartProject = useTuringStore.getState().getActiveProject();
const draggedQ0Start = afterDragStartProject.nodes.find((n) => n.id === 'q0');
assert(draggedQ0Start?.position.x === initialPos.x + 150, `Node q0 x updated during drag: ${draggedQ0Start?.position.x}`);
assert(draggedQ0Start?.position.y === initialPos.y + 200, `Node q0 y updated during drag: ${draggedQ0Start?.position.y}`);
assert(subscriptionFired, 'Store subscriber was notified when node position changed');
assert(
  updatedNodesInSubscription.find((n) => n.id === 'q0')?.position.x === initialPos.x + 150,
  'Subscriber received updated node positions directly'
);

// 7.3 Release drag (dragging: false)
store.onNodesChange([
  {
    id: 'q0',
    type: 'position',
    position: { x: initialPos.x + 150, y: initialPos.y + 200 },
    dragging: false,
  },
]);
const afterDragEndProject = useTuringStore.getState().getActiveProject();
const draggedQ0End = afterDragEndProject.nodes.find((n) => n.id === 'q0');
assert(draggedQ0End?.position.x === initialPos.x + 150, 'Node q0 position persisted in active project state');

unsubscribe();

// 7.4 Test adding state node and ensuring unique IDs
store.addStateNode('normal');
store.addStateNode('halt');
const projectAfterAdd = useTuringStore.getState().getActiveProject();
const nodeIds = projectAfterAdd.nodes.map((n) => n.id);
const uniqueIds = new Set(nodeIds);
assert(uniqueIds.size === nodeIds.length, `All node IDs are strictly unique: ${nodeIds.join(', ')}`);

// 7.5 Test dragging newly added node
const lastNode = projectAfterAdd.nodes[projectAfterAdd.nodes.length - 1];
store.onNodesChange([
  {
    id: lastNode.id,
    type: 'position',
    position: { x: 777, y: 888 },
    dragging: false,
  },
]);
const projectAfterMoveAdded = useTuringStore.getState().getActiveProject();
const movedAddedNode = projectAfterMoveAdded.nodes.find((n) => n.id === lastNode.id);
assert(movedAddedNode?.position.x === 777 && movedAddedNode?.position.y === 888, 'Newly added node dragged and position persisted');

// 7.6 Test auto-layout & manual movement seamless integration
store.applyAutoLayout();
const projectAfterAutoLayout = useTuringStore.getState().getActiveProject();
const q0Auto = projectAfterAutoLayout.nodes.find((n) => n.id === 'q0');
assert(!!q0Auto, 'q0 exists after auto-layout');
const autoPos = { ...q0Auto!.position };

// Now manually move q0 after auto-layout
store.onNodesChange([
  {
    id: 'q0',
    type: 'position',
    position: { x: autoPos.x + 50, y: autoPos.y + 50 },
    dragging: false,
  },
]);
const projectAfterManualAfterAuto = useTuringStore.getState().getActiveProject();
const q0ManualAfterAuto = projectAfterManualAfterAuto.nodes.find((n) => n.id === 'q0');
assert(
  q0ManualAfterAuto?.position.x === autoPos.x + 50 && q0ManualAfterAuto?.position.y === autoPos.y + 50,
  'Manual moving works seamlessly after auto-layout'
);

// 7.7 Test operational node dragging in operational mode
store.switchProject('demo-project-vtm-copy');
const vtmProject = useTuringStore.getState().getActiveProject();
assert(vtmProject.subMode === 'operational', 'Switched to operational VTM project');
const opStartNode = vtmProject.nodes.find((n) => n.type === 'operationNode');
assert(!!opStartNode, 'Operational node found in VTM project');
const origOpPos = { ...opStartNode!.position };

store.onNodesChange([
  {
    id: opStartNode!.id,
    type: 'position',
    position: { x: origOpPos.x + 123, y: origOpPos.y + 234 },
    dragging: false,
  },
]);
const vtmAfterDrag = useTuringStore.getState().getActiveProject();
const movedOpNode = vtmAfterDrag.nodes.find((n) => n.id === opStartNode!.id);
assert(
  movedOpNode?.position.x === origOpPos.x + 123 && movedOpNode?.position.y === origOpPos.y + 234,
  'Operational node dragged and position persisted in state'
);

// 7.8 Test removing node cleans up edges
const edgeBefore = vtmAfterDrag.edges[0];
if (edgeBefore) {
  const targetId = edgeBefore.target;
  store.onNodesChange([{ id: targetId, type: 'remove' }]);
  const vtmAfterRemove = useTuringStore.getState().getActiveProject();
  assert(!vtmAfterRemove.nodes.some((n) => n.id === targetId), 'Target node removed from nodes');
  assert(!vtmAfterRemove.edges.some((e) => e.target === targetId), 'Orphan edge removed when node was deleted');
}

console.log('--- 8. Testing Submachine Execution (P0-2) ---');
const subMachineProject: ProjectSession = {
  id: 'test-submachine-project',
  name: 'Submachine Runtime Test',
  description: 'Test submachine execution and return',
  mode: '4-tuple',
  subMode: 'operational',
  alphabet: {
    symbols: ['0', '1'],
    blankSymbol: '_',
  },
  nodes: [
    {
      id: 'main_start',
      type: 'operationNode',
      position: { x: 0, y: 0 },
      data: { label: 'START', opType: 'START' },
    },
    {
      id: 'main_complex',
      type: 'operationNode',
      position: { x: 100, y: 0 },
      data: {
        label: 'SubCall',
        opType: 'COMPLEX_MACHINE',
        subMachineId: 'sub_inc',
      },
    },
    {
      id: 'main_finish',
      type: 'operationNode',
      position: { x: 200, y: 0 },
      data: { label: 'FINISH', opType: 'FINISH' },
    },
  ],
  edges: [
    {
      id: 'e_main_1',
      source: 'main_start',
      target: 'main_complex',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r1', readSymbol: '*', isWildcard: true }],
      },
    },
    {
      id: 'e_main_2',
      source: 'main_complex',
      target: 'main_finish',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r2', readSymbol: '*', isWildcard: true }],
      },
    },
  ],
  subMachines: [
    {
      id: 'sub_inc',
      name: 'Sub Increment',
      nodes: [
        {
          id: 'sub_start',
          type: 'operationNode',
          position: { x: 0, y: 0 },
          data: { label: 'START', opType: 'START' },
        },
        {
          id: 'sub_shift',
          type: 'operationNode',
          position: { x: 80, y: 0 },
          data: { label: 'R', opType: 'SHIFT_R' },
        },
        {
          id: 'sub_write',
          type: 'operationNode',
          position: { x: 160, y: 0 },
          data: { label: 'Write 1', opType: 'WRITE_SYM', symbolToWrite: '1' },
        },
        {
          id: 'sub_finish',
          type: 'operationNode',
          position: { x: 240, y: 0 },
          data: { label: 'FINISH', opType: 'FINISH' },
        },
      ],
      edges: [
        {
          id: 'e_sub_1',
          source: 'sub_start',
          target: 'sub_shift',
          type: 'customTransition',
          data: {
            mode: '4-tuple',
            subMode: 'operational',
            rules: [{ id: 'sr1', readSymbol: '*', isWildcard: true }],
          },
        },
        {
          id: 'e_sub_2',
          source: 'sub_shift',
          target: 'sub_write',
          type: 'customTransition',
          data: {
            mode: '4-tuple',
            subMode: 'operational',
            rules: [{ id: 'sr2', readSymbol: '*', isWildcard: true }],
          },
        },
        {
          id: 'e_sub_3',
          source: 'sub_write',
          target: 'sub_finish',
          type: 'customTransition',
          data: {
            mode: '4-tuple',
            subMode: 'operational',
            rules: [{ id: 'sr3', readSymbol: '*', isWildcard: true }],
          },
        },
      ],
    },
  ],
  rules5: [],
  rules4: [],
  initialTape: { 0: '0', 1: '0' },
  initialHeadPosition: 0,
  testCases: [],
  createdAt: 0,
  updatedAt: 0,
};

let subState = initRuntimeState(subMachineProject, '00');
let subSteps = 0;
while (subState.status !== 'halted' && subState.status !== 'error' && subSteps < 30) {
  subState = stepMachine(subMachineProject, subState);
  subSteps++;
}
assert(subState.status === 'halted', `Submachine executed and halted cleanly (status=${subState.status}, message=${subState.statusMessage})`);
assert(subState.tape[1] === '1', `Submachine wrote '1' at head 1: actual=${subState.tape[1]}`);
assert(subState.currentNodeId === 'main_finish', `Machine successfully returned to caller finish node: ${subState.currentNodeId}`);

console.log('--- 9. Testing SEARCH_L and SEARCH_R Transpilation & Looping (P1-1) ---');
const searchProject: ProjectSession = {
  id: 'test-search-project',
  name: 'SEARCH_R Transpilation Test',
  description: 'Test SEARCH_R looping compilation',
  mode: '4-tuple',
  subMode: 'operational',
  alphabet: {
    symbols: ['0', '1'],
    blankSymbol: '_',
  },
  nodes: [
    {
      id: 'sr_start',
      type: 'operationNode',
      position: { x: 0, y: 0 },
      data: { label: 'START', opType: 'START' },
    },
    {
      id: 'sr_search',
      type: 'operationNode',
      position: { x: 100, y: 0 },
      data: { label: 'SEARCH_R', opType: 'SEARCH_R' },
    },
    {
      id: 'sr_finish',
      type: 'operationNode',
      position: { x: 200, y: 0 },
      data: { label: 'FINISH', opType: 'FINISH' },
    },
  ],
  edges: [
    {
      id: 'e_sr_1',
      source: 'sr_start',
      target: 'sr_search',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'sr_r1', readSymbol: '*', isWildcard: true }],
      },
    },
    {
      id: 'e_sr_2',
      source: 'sr_search',
      target: 'sr_finish',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'sr_r2', readSymbol: '_' }],
      },
    },
  ],
  rules5: [],
  rules4: [],
  subMachines: [],
  initialTape: {},
  initialHeadPosition: 0,
  testCases: [],
  createdAt: 0,
  updatedAt: 0,
};

// 1. Direct operational simulation: tape 111_ -> head must move 3 steps to index 3
let srState = initRuntimeState(searchProject, '111_');
let srSteps = 0;
while (srState.status !== 'halted' && srState.status !== 'error' && srSteps < 20) {
  srState = stepMachine(searchProject, srState);
  srSteps++;
}
assert(srState.status === 'halted', `SEARCH_R direct operational halted (status=${srState.status})`);
assert(srState.headPosition === 3, `SEARCH_R positioned head at blank index 3 (actual=${srState.headPosition})`);

// 2. Transpilation test: compileOperationalDiagramTo4Tuples must produce loop rules
const compiledSr = compileOperationalDiagramTo4Tuples(
  searchProject.nodes,
  searchProject.edges,
  searchProject.alphabet
);
const loopRules = compiledSr.filter((r) => r.command === 'R');
assert(loopRules.length >= 2, `Compiled 4-tuples contain looping 'R' rules for non-blank symbols (${loopRules.length} rules found)`);

console.log('--- 10. Testing Demo 3 VTM Execution and Correct Halt (P1-2) ---');
let d3State = initRuntimeState(DEMO_PROJECT_3, '1#');
let d3Steps = 0;
while (d3State.status !== 'halted' && d3State.status !== 'error' && d3Steps < 100) {
  d3State = stepMachine(DEMO_PROJECT_3, d3State);
  d3Steps++;
}
assert(d3State.status === 'halted', `Demo 3 halted cleanly in ${d3Steps} steps`);
assert(!d3State.statusMessage?.includes('нет перехода'), `Demo 3 did not halt on missing transition error: ${d3State.statusMessage}`);
assert(d3State.currentNodeId === 'vtm_finish', `Demo 3 reached vtm_finish node successfully`);

console.log('--- 11. Testing LaTeX Special Character Escaping (P1-3) ---');
const specialProject: ProjectSession = {
  ...DEMO_PROJECT_1,
  id: 'special-char-project',
  name: 'Test # $ % & _ in LaTeX',
  alphabet: {
    symbols: ['0', '1', '#', '$', '%', '&'],
    blankSymbol: '_',
  },
  rules5: [
    { id: 'sp1', fromState: 'q0', readSymbol: '#', writeSymbol: '$', move: 'R', toState: 'q0' },
    { id: 'sp2', fromState: 'q0', readSymbol: '%', writeSymbol: '&', move: 'L', toState: 'q_halt' },
    { id: 'sp3', fromState: 'q0', readSymbol: '_', writeSymbol: '_', move: 'N', toState: 'q_halt' },
  ],
};
const specialLatex = exportToLaTeX(specialProject);
assert(specialLatex.includes('\\#'), 'LaTeX contains escaped \\#');
assert(specialLatex.includes('\\$'), 'LaTeX contains escaped \\$');
assert(specialLatex.includes('\\%'), 'LaTeX contains escaped \\%');
assert(specialLatex.includes('\\&'), 'LaTeX contains escaped \\&');
assert(specialLatex.includes('\\_'), 'LaTeX contains escaped \\_');

console.log('--- 12. Testing Edge Deletion and Rule Cleanup (P0-4, P1-4) ---');
store.switchProject(DEMO_PROJECT_1.id);
const proj1Before = useTuringStore.getState().getActiveProject();
const edgeToDelete = proj1Before.edges.find((e) => e.source === 'q0' && e.target === 'q_halt');
if (edgeToDelete) {
  store.onEdgesChange([{ id: edgeToDelete.id, type: 'remove' }]);
  const proj1After = useTuringStore.getState().getActiveProject();
  assert(!proj1After.edges.some((e) => e.id === edgeToDelete.id), 'Edge removed from project edges');
  const orphanRules = proj1After.rules5.filter((r) => r.fromState === 'q0' && r.toState === 'q_halt');
  assert(orphanRules.length === 0, `Associated 5-tuple rules deleted on edge removal (left: ${orphanRules.length})`);
}

// Operational edge rule deletion
store.switchProject('demo-project-vtm-copy');
const opProjectBefore = useTuringStore.getState().getActiveProject();
const opEdge = opProjectBefore.edges.find((e) => e.data?.rules && e.data.rules.length > 0);
if (opEdge && opEdge.data?.rules) {
  const ruleToDelete = opEdge.data.rules[0];
  if (typeof (store as any).deleteEdgeRule === 'function') {
    (store as any).deleteEdgeRule(opEdge.id, ruleToDelete.id);
    const opProjectAfter = useTuringStore.getState().getActiveProject();
    const updatedEdge = opProjectAfter.edges.find((e) => e.id === opEdge.id);
    assert(!updatedEdge?.data?.rules?.some((r: any) => r.id === ruleToDelete.id), 'Operational rule removed from edge.data.rules');
  }
}

console.log('--- 13. Testing Alphabet Refactor for OperationNode (P1-6) ---');
store.switchProject('demo-project-vtm-copy');
const opProjBeforeRefactor = useTuringStore.getState().getActiveProject();
const writeNodeBefore = opProjBeforeRefactor.nodes.find(
  (n) => n.type === 'operationNode' && (n.data as any).opType === 'WRITE_SYM' && (n.data as any).symbolToWrite === '*'
);
if (writeNodeBefore) {
  store.refactorSymbol('*', 'X');
  const opProjAfterRefactor = useTuringStore.getState().getActiveProject();
  const writeNodeAfter = opProjAfterRefactor.nodes.find((n) => n.id === writeNodeBefore.id);
  assert((writeNodeAfter?.data as any).symbolToWrite === 'X', `WRITE_SYM symbolToWrite refactored to 'X' (actual: ${(writeNodeAfter?.data as any).symbolToWrite})`);
}

console.log('--- 14. Testing Validator BFS Cycle Reachability & Completeness (P2-6, P2-7) ---');
const cycleTestProject: ProjectSession = {
  ...DEMO_PROJECT_1,
  id: 'cycle-project',
  nodes: [
    ...DEMO_PROJECT_1.nodes,
    { id: 'cycle_a', type: 'stateNode', position: { x: 0, y: 0 }, data: { label: 'cycle_a', stateType: 'normal' } },
    { id: 'cycle_b', type: 'stateNode', position: { x: 10, y: 10 }, data: { label: 'cycle_b', stateType: 'normal' } },
  ],
  edges: [
    ...DEMO_PROJECT_1.edges,
    { id: 'e_ca_cb', source: 'cycle_a', target: 'cycle_b', type: 'customTransition', data: { mode: '5-tuple', rules: [] } },
    { id: 'e_cb_ca', source: 'cycle_b', target: 'cycle_a', type: 'customTransition', data: { mode: '5-tuple', rules: [] } },
  ],
};
const cycleIssues = validateMachine(cycleTestProject);
const unreachableFound = cycleIssues.some(
  (i) => (i.id.includes('cycle_a') || i.id.includes('cycle_b')) && (i.id.includes('unreachable') || i.message.includes('недостижим'))
);
assert(unreachableFound, 'Validator BFS flagged disconnected cycle states as unreachable');

console.log('--- 15. Testing Batch Test Load to Tape (P0-3) ---');
store.switchProject(DEMO_PROJECT_1.id);
store.setTapeString('10110', 0);
const loadedState = useTuringStore.getState().runtime;
assert(
  loadedState.tape[0] === '1' &&
  loadedState.tape[1] === '0' &&
  loadedState.tape[2] === '1' &&
  loadedState.tape[3] === '1' &&
  loadedState.tape[4] === '0',
  'setTapeString correctly loaded word "10110" onto tape without being wiped'
);
assert(loadedState.headPosition === 0, 'Head position set to 0');

console.log('--- 16. Testing Runtime Stats & Shortcuts (Phase 2) ---');
store.switchProject(DEMO_PROJECT_1.id);
store.resetExecution();
const stats = store.getRuntimeStats();
assert(stats.stepCount === 0, `Stats stepCount initialized at 0: ${stats.stepCount}`);
assert(typeof stats.minTapeIndex === 'number' && typeof stats.maxTapeIndex === 'number', 'Tape bounds numeric');
assert(stats.status === 'idle', `Runtime stats status is idle: ${stats.status}`);
assert(store.keyboardShortcutsEnabled === true, 'Keyboard shortcuts enabled by default');

console.log('\nALL ENGINE AND SIMULATION TESTS PASSED SUCCESSFULLY! 🚀');
