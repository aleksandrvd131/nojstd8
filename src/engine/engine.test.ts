import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectSession, TuringNode, TuringEdge } from '../types/turing';
import { DEMO_PROJECT_1, DEMO_PROJECT_2, DEMO_PROJECT_3 } from '../store/demoProjects';
import {
  useTuringStore,
  autoLayoutGraph,
  handleDebuggerKeyboardShortcut,
} from '../store/useTuringStore';
import { runTestCase, initRuntimeState, stepMachine, stepBackMachine } from './simulator';
import {
  convert5TupleTo4Tuple,
  convert4TupleTo5Tuple,
  compileOperationalDiagramTo4Tuples,
  buildEdgesFromRules,
  compileVTMCode,
  parseVTMCodeDetailed,
  assignNearestEdgeHandles,
  findFeedbackEdgeIds,
} from './transpiler';
import { validateMachine, validateMachineCached } from './validator';
import {
  exportToLaTeX,
  exportToTikZ,
  exportToPlantUML,
  exportToMarkdown,
  exportProjectToJSON,
  importProjectFromJSON,
} from './exporter';

function resetStore() {
  const freshProjects: ProjectSession[] = JSON.parse(
    JSON.stringify([DEMO_PROJECT_1, DEMO_PROJECT_2, DEMO_PROJECT_3])
  );
  useTuringStore.setState({
    projects: freshProjects,
    activeProjectId: freshProjects[0].id,
    runtime: initRuntimeState(freshProjects[0]),
    isRunning: false,
    selectedNodeId: null,
    selectedEdgeId: null,
    isRuleModalOpen: false,
    ruleModalData: null,
    portError: null,
    editorUndoStack: [],
    editorRedoStack: [],
    keyboardShortcutsEnabled: true,
  });
}

describe('compact operation repetition', () => {
  it('keeps repetitions in one node and compiles the intermediate operations', () => {
    const result = compileVTMCode('r^5 R^5 0^2', DEMO_PROJECT_1.alphabet);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map(node => node.data.repeatCount)).toEqual([5, 5, 2]);
    expect(result.rules4.some(rule => rule.fromState.includes('__repeat_'))).toBe(true);
    expect(parseVTMCodeDetailed('R^101', DEMO_PROJECT_1.alphabet).errors).toHaveLength(1);
  });
});

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

describe('Simulator & Demo Projects', () => {
  it('repeats a submachine call without falsely detecting a cycle', () => {
    const project = {
      ...subMachineProject,
      nodes: subMachineProject.nodes.map(node => node.id === 'main_complex'
        ? { ...node, data: { ...node.data, repeatCount: 3 } } : node),
    };
    let state = initRuntimeState(project, '00', 0);
    for (let i = 0; i < 30 && state.status !== 'halted' && state.status !== 'error'; i++) {
      state = stepMachine(project, state);
    }
    expect(state.status).toBe('halted');
    expect(state.headPosition).toBe(3);
    expect(state.tape[1]).toBe('1');
    expect(state.tape[3]).toBe('1');
  });
  it('passes all test cases for Demo Project 1 (5-Tuple)', () => {
    for (const tc of DEMO_PROJECT_1.testCases) {
      const result = runTestCase(DEMO_PROJECT_1, tc);
      expect(result.status).toBe('passed');
    }
  });

  it('passes all test cases for Demo Project 2 (4-Tuple Increment)', () => {
    for (const tc of DEMO_PROJECT_2.testCases) {
      const result = runTestCase(DEMO_PROJECT_2, tc);
      expect(result.status).toBe('passed');
    }
  });

  it('executes Demo Project 3 (Operational VTM) and passes all its copy test cases', () => {
    let entryState = initRuntimeState(DEMO_PROJECT_3);
    expect(entryState.headPosition).toBe(3);
    let entrySteps = 0;
    while (entryState.status !== 'halted' && entryState.status !== 'error' && entrySteps < 150) {
      entryState = stepMachine(DEMO_PROJECT_3, entryState);
      entrySteps++;
    }
    expect(entryState.status).toBe('halted');
    expect(entryState.currentNodeId).toBe('vtm_finish');
    expect(entryState.tape[3]).toBe('1');
    expect(entryState.tape[4]).toBe('1');

    let state = initRuntimeState(DEMO_PROJECT_3, '1#');
    let steps = 0;
    while (state.status !== 'halted' && state.status !== 'error' && steps < 100) {
      state = stepMachine(DEMO_PROJECT_3, state);
      steps++;
    }
    expect(state.status).toBe('halted');
    expect(state.statusMessage).not.toContain('нет перехода');
    expect(state.currentNodeId).toBe('vtm_finish');

    for (const tc of DEMO_PROJECT_3.testCases) {
      const result = runTestCase(DEMO_PROJECT_3, tc);
      expect(result.status).toBe('passed');
    }
  });

  it('executes COMPLEX_MACHINE submachine and returns to caller finish node', () => {
    let state = initRuntimeState(subMachineProject, '00', 0);
    let steps = 0;
    while (state.status !== 'halted' && state.status !== 'error' && steps < 30) {
      state = stepMachine(subMachineProject, state);
      steps++;
    }
    expect(state.status).toBe('halted');
    expect(state.tape[1]).toBe('1');
    expect(state.currentNodeId).toBe('main_finish');
  });

  it('runs SEARCH_R across non-blank cells and records visited positions', () => {
    let state = initRuntimeState(searchProject, '111_', 0);
    let steps = 0;
    while (state.status !== 'halted' && state.status !== 'error' && steps < 20) {
      state = stepMachine(searchProject, state);
      steps++;
    }
    expect(state.status).toBe('halted');
    expect(state.headPosition).toBe(3);
    expect(state.visitedPositions.length).toBeGreaterThanOrEqual(4);
  });

  it('prioritizes exact operational matches over wildcard edges regardless of edge order', () => {
    const wildcardOrderProject: ProjectSession = {
      ...searchProject,
      id: 'wildcard-order-test',
      nodes: [
        { id: 'w_start', type: 'operationNode', position: { x: 0, y: 0 }, data: { label: 'START', opType: 'START' } },
        { id: 'w_fin_wild', type: 'operationNode', position: { x: 100, y: 0 }, data: { label: 'FINISH', opType: 'FINISH' } },
        { id: 'w_fin_exact', type: 'operationNode', position: { x: 100, y: 80 }, data: { label: 'FINISH', opType: 'FINISH' } },
      ],
      edges: [
        {
          id: 'e_wild',
          source: 'w_start',
          target: 'w_fin_wild',
          type: 'customTransition',
          data: { mode: '4-tuple', subMode: 'operational', rules: [{ id: 'rw', readSymbol: '*', isWildcard: true }] },
        },
        {
          id: 'e_exact',
          source: 'w_start',
          target: 'w_fin_exact',
          type: 'customTransition',
          data: { mode: '4-tuple', subMode: 'operational', rules: [{ id: 're', readSymbol: '1' }] },
        },
      ],
    };

    const nextState = stepMachine(wildcardOrderProject, initRuntimeState(wildcardOrderProject, '1', 0));
    expect(nextState.currentNodeId).toBe('w_fin_exact');
  });

  it('checks expectedHalt in runTestCase', () => {
    const acceptRejectProj: ProjectSession = {
      ...DEMO_PROJECT_1,
      id: 'accept-reject-test',
      nodes: [
        { id: 'q0', type: 'stateNode', position: { x: 0, y: 0 }, data: { label: 'q0', stateType: 'initial' } },
        { id: 'q_acc', type: 'stateNode', position: { x: 100, y: 0 }, data: { label: 'q_acc', stateType: 'accept' } },
      ],
      edges: [],
      rules5: [
        { id: 'ar1', fromState: 'q0', readSymbol: '1', writeSymbol: '1', move: 'N', toState: 'q_acc' },
      ],
    };

    const acceptPass = runTestCase(acceptRejectProj, {
      id: 't_acc',
      name: 'Accept check',
      inputTape: '1',
      expectedHalt: 'accept',
    });
    const acceptFail = runTestCase(acceptRejectProj, {
      id: 't_rej',
      name: 'Reject check',
      inputTape: '1',
      expectedHalt: 'reject',
    });

    expect(acceptPass.status).toBe('passed');
    expect(acceptFail.status).toBe('failed');
  });

  it('detects repeating configuration cycles early in stepMachine and runTestCase', () => {
    const loopProj: ProjectSession = {
      ...DEMO_PROJECT_1,
      id: 'loop-cycle-proj',
      nodes: [
        { id: 'q0', type: 'stateNode', position: { x: 0, y: 0 }, data: { label: 'q0', stateType: 'initial' } },
      ],
      edges: [],
      rules5: [
        { id: 'l1', fromState: 'q0', readSymbol: '1', writeSymbol: '1', move: 'N', toState: 'q0' },
      ],
    };

    const st0 = initRuntimeState(loopProj, '1', 0);
    const st1 = stepMachine(loopProj, st0);
    expect(st1.status).toBe('error');
    expect(st1.statusMessage).toContain('зацикливание');

    const recovered = stepBackMachine(st1);
    expect(recovered.status).toBe('paused');
    expect(recovered.stepCount).toBe(0);

    const tcRes = runTestCase(loopProj, { id: 'tc_loop', name: 'Loop', inputTape: '1' });
    expect(tcRes.status).toBe('failed');
    expect(tcRes.errorMessage).toContain('зацикливание');
    expect(tcRes.lastStepsCount).toBeLessThan(10);
  });
});

describe('Transpiler', () => {
  it('converts 5-tuple <-> 4-tuple and avoids aux ID collisions', () => {
    const existing = new Set(['q_aux_1']);
    const { rules4, auxiliaryNodes } = convert5TupleTo4Tuple(DEMO_PROJECT_1.rules5, existing);
    expect(rules4.length).toBeGreaterThan(0);
    expect(auxiliaryNodes.some((n) => n.id === 'q_aux_1')).toBe(false);

    const backTo5 = convert4TupleTo5Tuple(rules4);
    expect(backTo5.length).toBe(rules4.length);
  });

  it('compiles operational VTM diagrams including SEARCH_R loops', () => {
    const compiledOps = compileOperationalDiagramTo4Tuples(
      DEMO_PROJECT_3.nodes,
      DEMO_PROJECT_3.edges,
      DEMO_PROJECT_3.alphabet
    );
    expect(compiledOps.length).toBeGreaterThan(0);

    const compiledSr = compileOperationalDiagramTo4Tuples(
      searchProject.nodes,
      searchProject.edges,
      searchProject.alphabet
    );
    const loopRules = compiledSr.filter((r) => r.command === 'R');
    expect(loopRules.length).toBeGreaterThanOrEqual(2);
  });

  it('inlines COMPLEX_MACHINE submachines during operational 4-tuple compilation', () => {
    const compiledRules4 = compileOperationalDiagramTo4Tuples(
      subMachineProject.nodes,
      subMachineProject.edges,
      subMachineProject.alphabet,
      subMachineProject.subMachines
    );
    expect(compiledRules4.some((r) => r.toState.includes('__sub_inc__sub_start'))).toBe(true);

    const stateIds = new Set<string>();
    for (const r of compiledRules4) {
      stateIds.add(r.fromState);
      stateIds.add(r.toState);
    }
    const compiledAsStateGraph: ProjectSession = {
      ...subMachineProject,
      mode: '4-tuple',
      subMode: 'state-graph',
      nodes: Array.from(stateIds).map((id) => ({
        id,
        type: 'stateNode',
        position: { x: 0, y: 0 },
        data: {
          label: id,
          stateType: id === 'main_start' ? 'initial' : id === 'main_finish' ? 'halt' : 'normal',
        },
      })),
      edges: buildEdgesFromRules(compiledRules4, '4-tuple', 'state-graph'),
      rules4: compiledRules4,
      subMachines: [],
    };

    const res = runTestCase(compiledAsStateGraph, {
      id: 'tc_inlined',
      name: 'Inlined submachine',
      inputTape: '00',
      expectedTape: '01',
    });
    expect(res.status).toBe('passed');
  });

  it('preserves existing edge handles, IDs, and labelOffset in buildEdgesFromRules', () => {
    const existing = [
      {
        id: 'custom_edge_id',
        source: 'q0',
        target: 'q_halt',
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'customTransition',
        data: {
          mode: '5-tuple' as const,
          rules: [],
          labelOffset: { x: 24, y: -16 },
        },
      },
    ];

    const rebuilt = buildEdgesFromRules(DEMO_PROJECT_1.rules5, '5-tuple', 'state-graph', existing);
    const preserved = rebuilt.find((e) => e.source === 'q0' && e.target === 'q_halt')!;
    expect(preserved.id).toBe('custom_edge_id');
    expect(preserved.sourceHandle).toBe('right');
    expect(preserved.targetHandle).toBe('left');
    expect(preserved.data?.labelOffset).toEqual({ x: 24, y: -16 });
  });
});

describe('Validator', () => {
  it('reuses diagnostics for geometry changes but invalidates semantic edits', () => {
    const project = subMachineProject;
    const first = validateMachineCached(project);
    const moved = { ...project, nodes: project.nodes.map(node => ({
      ...node, position: { x: node.position.x + 20, y: node.position.y },
    })) };
    expect(validateMachineCached(moved)).toBe(first);
    const edited = { ...moved, nodes: moved.nodes.map((node, index) => index === 0
      ? { ...node, data: { ...node.data, label: 'Changed' } } : node) };
    expect(validateMachineCached(edited)).not.toBe(first);
  });
  it('validates clean demo projects with 0 errors', () => {
    expect(validateMachine(DEMO_PROJECT_1).filter((i) => i.severity === 'error')).toHaveLength(0);
    expect(validateMachine(DEMO_PROJECT_2).filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('detects missing initial state and non-determinism', () => {
    const invalidProject: ProjectSession = {
      ...DEMO_PROJECT_1,
      nodes: [],
      rules5: [
        { id: '1', fromState: 'q0', readSymbol: '0', writeSymbol: '1', move: 'R', toState: 'q1' },
        { id: '2', fromState: 'q0', readSymbol: '0', writeSymbol: '0', move: 'L', toState: 'q2' },
      ],
    };
    const issues = validateMachine(invalidProject);
    expect(issues.some((i) => i.id === 'no_initial_state')).toBe(true);
    expect(issues.some((i) => i.id.startsWith('non_det_'))).toBe(true);
  });

  it('flags disconnected cycle states as unreachable via BFS', () => {
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
    const issues = validateMachine(cycleTestProject);
    expect(
      issues.some((i) => (i.id.includes('cycle_a') || i.id.includes('cycle_b')) && i.id.includes('unreachable'))
    ).toBe(true);
  });

  it('detects missing START in submachine and duplicate wildcard edges', () => {
    const badSubProj: ProjectSession = {
      ...subMachineProject,
      edges: [
        ...subMachineProject.edges,
        {
          id: 'e_dup_wild',
          source: 'main_start',
          target: 'main_finish',
          type: 'customTransition',
          data: { mode: '4-tuple', subMode: 'operational', rules: [{ id: 'rw2', readSymbol: '*', isWildcard: true }] },
        },
      ],
      subMachines: [
        {
          id: 'sub_inc',
          name: 'Broken Sub',
          nodes: [{ id: 's_fin', type: 'operationNode', position: { x: 0, y: 0 }, data: { label: 'FINISH', opType: 'FINISH' } }],
          edges: [],
        },
      ],
    };
    const issues = validateMachine(badSubProj);
    expect(issues.some((i) => i.id.startsWith('submachine_no_start_'))).toBe(true);
    expect(issues.some((i) => i.id.startsWith('non_det_op_main_start_*'))).toBe(true);
  });

  it('detects overlapping VTM complements, recursive submachines, and unknown tape/test symbols', () => {
    const complexBadProj: ProjectSession = {
      ...subMachineProject,
      edges: [
        {
          id: 'e_c1',
          source: 'main_start',
          target: 'main_complex',
          type: 'customTransition',
          data: { mode: '4-tuple', subMode: 'operational', rules: [{ id: 'rc1', readSymbol: '0', isComplement: true }] },
        },
        {
          id: 'e_c2',
          source: 'main_start',
          target: 'main_finish',
          type: 'customTransition',
          data: { mode: '4-tuple', subMode: 'operational', rules: [{ id: 'rc2', readSymbol: '1', isComplement: true }] },
        },
      ],
      subMachines: [
        {
          id: 'sub_inc',
          name: 'Recursive Sub',
          nodes: [
            { id: 's0', type: 'operationNode', position: { x: 0, y: 0 }, data: { label: 'START', opType: 'START' } },
            { id: 's1', type: 'operationNode', position: { x: 50, y: 0 }, data: { label: 'Self', opType: 'COMPLEX_MACHINE', subMachineId: 'sub_inc' } },
          ],
          edges: [],
        },
      ],
      initialTape: { 0: 'Z' },
      testCases: [{ id: 'tc_bad', name: 'BadSym', inputTape: 'Q' }],
    };

    const issues = validateMachine(complexBadProj);
    expect(issues.some((i) => i.id === 'overlap_complement_main_start')).toBe(true);
    expect(issues.some((i) => i.id === 'submachine_cycle_sub_inc')).toBe(true);
    expect(issues.some((i) => i.id === 'unknown_initial_tape_symbols')).toBe(true);
    expect(issues.some((i) => i.id === 'unknown_test_symbols_tc_bad')).toBe(true);
  });

  it('flags outgoing transitions from FINISH and terminal halt/accept/reject states as errors', () => {
    const finishOutgoingProj: ProjectSession = {
      ...DEMO_PROJECT_3,
      edges: [
        ...DEMO_PROJECT_3.edges,
        {
          id: 'e_finish_back',
          source: 'vtm_finish',
          target: 'vtm_start',
          type: 'customTransition',
          data: {
            mode: '4-tuple',
            subMode: 'operational',
            rules: [{ id: 'r_fin_bad', readSymbol: '0', isComplement: true }],
          },
        },
      ],
    };
    const opIssues = validateMachine(finishOutgoingProj);
    const finishIssue = opIssues.find((i) => i.id === 'finish_outgoing_vtm_finish');
    expect(finishIssue).toBeDefined();
    expect(finishIssue?.severity).toBe('error');
    expect(finishIssue?.edgeId).toBe('e_finish_back');

    const haltOutgoingProj: ProjectSession = {
      ...DEMO_PROJECT_1,
      edges: [
        ...DEMO_PROJECT_1.edges,
        {
          id: 'e_halt_back',
          source: 'q_halt',
          target: 'q0',
          type: 'customTransition',
          data: { mode: '5-tuple', subMode: 'state-graph', rules: [] },
        },
      ],
    };
    const stateIssues = validateMachine(haltOutgoingProj);
    const haltIssue = stateIssues.find((i) => i.id === 'terminal_outgoing_q_halt');
    expect(haltIssue).toBeDefined();
    expect(haltIssue?.severity).toBe('error');
  });
});

describe('Exporters', () => {
  it('supports JSON round-trip, LaTeX escaping, PlantUML, and Markdown', () => {
    const jsonStr = exportProjectToJSON(DEMO_PROJECT_1);
    const reimported = importProjectFromJSON(jsonStr);
    expect(reimported.name).toBe(DEMO_PROJECT_1.name);

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
    expect(specialLatex).toContain('\\begin{table}');
    expect(specialLatex).toContain('\\#');
    expect(specialLatex).toContain('\\$');
    expect(specialLatex).toContain('\\%');
    expect(specialLatex).toContain('\\&');
    expect(specialLatex).toContain('\\_');

    const puml = exportToPlantUML(DEMO_PROJECT_1);
    expect(puml).toContain('@startuml');
    expect(puml).toContain('@enduml');

    const md = exportToMarkdown(DEMO_PROJECT_1);
    expect(md).toContain('| Состояние $q$ |');

    const vtmLatex = exportToLaTeX(DEMO_PROJECT_3);
    expect(vtmLatex).toContain('Операционная диаграмма VTM');
    expect(vtmLatex).toContain('\\neg');

    const tikz = exportToTikZ(DEMO_PROJECT_1);
    expect(tikz).toContain('\\begin{tikzpicture}');
    expect(tikz).toContain('\\end{tikzpicture}');
    expect(tikz).toContain('loop above');
  });
});

describe('Zustand Store Reactivity & Mutations', () => {
  beforeEach(() => {
    resetStore();
  });

  it('updates node position reactively on drag and after auto-layout', () => {
    const store = useTuringStore.getState();
    const initialQ0 = store.getActiveProject().nodes.find((n) => n.id === 'q0')!;
    const initialPos = { ...initialQ0.position };

    let subscriptionFired = false;
    let subscribedX = 0;
    const unsubscribe = useTuringStore.subscribe((state) => {
      const p = state.projects.find((proj) => proj.id === state.activeProjectId);
      const q0 = p?.nodes.find((n) => n.id === 'q0');
      if (q0) {
        subscriptionFired = true;
        subscribedX = q0.position.x;
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
    unsubscribe();

    expect(subscriptionFired).toBe(true);
    expect(subscribedX).toBe(initialPos.x + 150);

    store.applyAutoLayout();
    const autoPos = { ...useTuringStore.getState().getActiveProject().nodes.find((n) => n.id === 'q0')!.position };
    store.onNodesChange([
      {
        id: 'q0',
        type: 'position',
        position: { x: autoPos.x + 50, y: autoPos.y + 50 },
        dragging: false,
      },
    ]);
    const q0After = useTuringStore.getState().getActiveProject().nodes.find((n) => n.id === 'q0')!;
    expect(q0After.position.x).toBe(autoPos.x + 50);
    expect(q0After.position.y).toBe(autoPos.y + 50);
  });

  it('generates unique node IDs and cleans up edges/rules on deletion', () => {
    const store = useTuringStore.getState();
    store.addStateNode('normal');
    store.addStateNode('halt');

    const ids = useTuringStore.getState().getActiveProject().nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);

    const edgeToDelete = useTuringStore
      .getState()
      .getActiveProject()
      .edges.find((e) => e.source === 'q0' && e.target === 'q_halt')!;
    store.onEdgesChange([{ id: edgeToDelete.id, type: 'remove' }]);

    const after = useTuringStore.getState().getActiveProject();
    expect(after.edges.some((e) => e.id === edgeToDelete.id)).toBe(false);
    expect(after.rules5.filter((r) => r.fromState === 'q0' && r.toState === 'q_halt')).toHaveLength(0);
  });

  it('deletes operational edge rule and refactors WRITE_SYM nodes', () => {
    const store = useTuringStore.getState();
    store.switchProject('demo-project-vtm-copy');

    const opEdge = useTuringStore
      .getState()
      .getActiveProject()
      .edges.find((e) => e.data?.rules && e.data.rules.length > 0)!;
    const ruleToDelete = opEdge.data!.rules[0];
    store.deleteEdgeRule(opEdge.id, ruleToDelete.id);

    const updatedEdge = useTuringStore.getState().getActiveProject().edges.find((e) => e.id === opEdge.id);
    expect(updatedEdge?.data?.rules?.some((r) => r.id === ruleToDelete.id)).toBe(false);

    store.refactorSymbol('*', 'X');
    const writeNodeAfter = useTuringStore
      .getState()
      .getActiveProject()
      .nodes.find((n) => n.id === 'vtm_mark_x');
    expect((writeNodeAfter?.data as any).symbolToWrite).toBe('X');
  });

  it('tokenizes multi-char symbols in setTapeString and resets stepCount', () => {
    const store = useTuringStore.getState();
    store.setBlankSymbol('a0');
    store.setTapeString('1a01', 0);

    const rt = useTuringStore.getState().runtime;
    expect(rt.tape[0]).toBe('1');
    expect(rt.tape[1]).toBe('a0');
    expect(rt.tape[2]).toBe('1');
    expect(rt.headPosition).toBe(3);
    expect(rt.stepCount).toBe(0);
  });

  it('converts operationNodes to stateNodes when switching VTM -> 5-tuple', () => {
    const store = useTuringStore.getState();
    store.switchProject('demo-project-vtm-copy');
    store.switchMode('5-tuple');

    const converted = useTuringStore.getState().getActiveProject();
    expect(converted.mode).toBe('5-tuple');
    expect(converted.subMode).toBe('state-graph');
    expect(converted.nodes.every((n) => n.type === 'stateNode')).toBe(true);
    expect(converted.rules5.length).toBeGreaterThan(0);
  });

  it('computes runtime stats and keeps keyboard shortcuts enabled by default', () => {
    const store = useTuringStore.getState();
    store.resetExecution();
    const stats = store.getRuntimeStats();
    expect(stats.stepCount).toBe(0);
    expect(typeof stats.minTapeIndex).toBe('number');
    expect(typeof stats.maxTapeIndex).toBe('number');
    expect(stats.status).toBe('idle');
    expect(store.keyboardShortcutsEnabled).toBe(true);
  });

  it('prevents node card overlaps during auto-layout', () => {
    const store = useTuringStore.getState();
    store.applyAutoLayout();
    const projectAfterAutoLayout = useTuringStore.getState().getActiveProject();
    const wideCards = projectAfterAutoLayout.nodes.map((n) => ({
      ...n,
      measured: { width: 250, height: 116 },
    }));
    const noOverlaps = autoLayoutGraph(wideCards, projectAfterAutoLayout.edges).every(
      (node, index, all) => {
        const size = node.measured!;
        return all.slice(index + 1).every((other) => {
          const otherSize = other.measured!;
          return (
            node.position.x + size.width! <= other.position.x ||
            other.position.x + otherSize.width! <= node.position.x ||
            node.position.y + size.height! <= other.position.y ||
            other.position.y + otherSize.height! <= node.position.y
          );
        });
      }
    );
    expect(noOverlaps).toBe(true);
  });

  it('uses vertical space for an excessively wide branching diagram', () => {
    const nodes = ['start', 'shift', 'branch', 'finish'].map((id, index) => ({
      id, type: 'operationNode', position: { x: index * 300, y: 0 },
      measured: { width: 190, height: 52 }, data: { label: id, opType: 'SHIFT_R' },
    })) as TuringNode[];
    const edges = [
      ['start', 'shift'], ['shift', 'finish'], ['shift', 'branch'], ['branch', 'finish'],
    ].map(([source, target], i) => ({
      id: `e${i}`, source, target, data: { mode: '4-tuple', rules: [] },
    })) as TuringEdge[];
    const horizontal = autoLayoutGraph(nodes, edges, 'LR');
    const balanced = autoLayoutGraph(nodes, edges);
    const width = (layout: TuringNode[]) => Math.max(...layout.map((n) => n.position.x)) - Math.min(...layout.map((n) => n.position.x));
    expect(width(balanced)).toBeLessThan(width(horizontal));
    expect(new Set(balanced.map((n) => n.position.y)).size).toBeGreaterThan(1);
    expect(balanced.find((n) => n.id === 'start')!.position.x).toBeLessThan(balanced.find((n) => n.id === 'shift')!.position.x);
  });

  it('wraps a long linear machine into horizontal rows', () => {
    const nodes = Array.from({ length: 7 }, (_, i) => ({
      id: `n${i}`, type: 'operationNode', position: { x: 0, y: 0 },
      measured: { width: 190, height: 52 }, data: { label: `n${i}`, opType: 'SHIFT_R' },
    })) as TuringNode[];
    const edges = nodes.slice(1).map((node, i) => ({
      id: `e${i}`, source: nodes[i].id, target: node.id, data: { mode: '4-tuple', rules: [] },
    })) as TuringEdge[];
    const layout = autoLayoutGraph(nodes, edges);
    expect(new Set(layout.map((node) => node.position.y)).size).toBe(2);
    expect(layout[0].position.x).toBeLessThan(layout[1].position.x);
    expect(layout[3].position.x).toBe(layout[4].position.x);
    expect(layout[4].position.x).toBeGreaterThan(layout[5].position.x);
  });

  it('parses, compiles, creates, inserts VTM code fragments and handles Delete/Backspace', () => {
    const store = useTuringStore.getState();
    const parsedVtm = parseVTMCodeDetailed('r^3 R 0', DEMO_PROJECT_1.alphabet);
    expect(parsedVtm.errors).toHaveLength(0);
    expect(parsedVtm.ops).toHaveLength(3);
    expect(parsedVtm.ops.map((o) => o.opType).join(',')).toBe(
      'SHIFT_R,SEARCH_R,WRITE_SYM'
    );
    expect(parsedVtm.ops[0].repeatCount).toBe(3);
    expect(parsedVtm.ops[2].symbolToWrite).toBe('0');

    const invalidVtm = parseVTMCodeDetailed('r^0 X', DEMO_PROJECT_1.alphabet);
    expect(invalidVtm.errors).toHaveLength(2);

    const compiledVtm = compileVTMCode('r^3 R 0', DEMO_PROJECT_1.alphabet);
    expect(compiledVtm.nodes).toHaveLength(3);
    expect(compiledVtm.edges).toHaveLength(2);
    expect(
      compiledVtm.edges.every((edge) => edge.sourceHandle === 'right' && edge.targetHandle === 'left')
    ).toBe(true);
    expect(
      compiledVtm.nodes.every((n) => {
        const opType = (n.data as any).opType;
        return opType !== 'START' && opType !== 'FINISH';
      })
    ).toBe(true);
    expect(compiledVtm.rules4.length).toBeGreaterThan(0);

    const vtmStartNode: TuringNode = {
      id: 'test_vtm_start',
      type: 'operationNode',
      position: { x: 0, y: 0 },
      data: { label: 'START', opType: 'START' },
    };
    const vtmFinishNode: TuringNode = {
      id: 'test_vtm_finish',
      type: 'operationNode',
      position: { x: 1200, y: 0 },
      data: { label: 'FINISH', opType: 'FINISH' },
    };
    const vtmFirstNode = compiledVtm.nodes[0];
    const vtmLastNode = compiledVtm.nodes[compiledVtm.nodes.length - 1];
    const vtmStartEdge: TuringEdge = {
      id: 'e_test_vtm_start',
      source: vtmStartNode.id,
      target: vtmFirstNode.id,
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r_test_vtm_start', readSymbol: '*', isWildcard: true }],
      },
    };
    const vtmFinishEdge: TuringEdge = {
      id: 'e_test_vtm_finish',
      source: vtmLastNode.id,
      target: vtmFinishNode.id,
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r_test_vtm_finish', readSymbol: '*', isWildcard: true }],
      },
    };
    const vtmFullNodes = [vtmStartNode, ...compiledVtm.nodes, vtmFinishNode];
    const vtmFullEdges = [vtmStartEdge, ...compiledVtm.edges, vtmFinishEdge];
    const vtmCodeProject: ProjectSession = {
      ...DEMO_PROJECT_1,
      id: 'test-vtm-code-project',
      mode: '4-tuple',
      subMode: 'operational',
      nodes: vtmFullNodes,
      edges: vtmFullEdges,
      rules4: compileOperationalDiagramTo4Tuples(vtmFullNodes, vtmFullEdges, DEMO_PROJECT_1.alphabet),
      rules5: [],
      subMachines: [],
      initialTape: { 0: '1', 1: '1', 2: '1', 3: '1' },
      initialHeadPosition: 0,
    };
    let vtmCodeState = initRuntimeState(vtmCodeProject, undefined, 0);
    let vtmCodeSteps = 0;
    while (vtmCodeState.status !== 'halted' && vtmCodeState.status !== 'error' && vtmCodeSteps < 50) {
      vtmCodeState = stepMachine(vtmCodeProject, vtmCodeState);
      vtmCodeSteps++;
    }
    expect(vtmCodeState.status).toBe('halted');
    expect(vtmCodeState.headPosition).toBe(4);
    expect(vtmCodeState.tape[4]).toBe('0');
    expect(vtmCodeState.tape[0]).toBe('1');
    expect(vtmCodeState.tape[3]).toBe('1');

    const projectsBeforeVtm = useTuringStore.getState().projects.length;
    expect(store.addVTMCode('r^3 R 0', 'VTM Code Test')).toBe(true);
    expect(useTuringStore.getState().projects).toHaveLength(projectsBeforeVtm + 1);
    const createdVtmProject = useTuringStore.getState().getActiveProject();
    expect(createdVtmProject.name).toBe('VTM Code Test');
    expect(createdVtmProject.subMode).toBe('operational');
    expect(createdVtmProject.nodes).toHaveLength(3);
    expect(Object.keys(createdVtmProject.initialTape)).toHaveLength(0);
    expect(useTuringStore.getState().runtime.currentNodeId).toBe(createdVtmProject.nodes[0].id);

    expect(store.addVTMCode('r^3 X')).toBe(false);
    expect(useTuringStore.getState().projects).toHaveLength(projectsBeforeVtm + 1);

    store.switchProject(DEMO_PROJECT_3.id);
    const insertProjectBefore = useTuringStore.getState().getActiveProject();
    const nodesBeforeInsert = insertProjectBefore.nodes.length;
    const edgesBeforeInsert = insertProjectBefore.edges.length;
    expect(store.insertVTMCode('r R 1')).toBe(true);
    const insertProjectAfter = useTuringStore.getState().getActiveProject();
    expect(insertProjectAfter.nodes).toHaveLength(nodesBeforeInsert + 3);
    expect(insertProjectAfter.edges).toHaveLength(edgesBeforeInsert + 2);
    expect(new Set(insertProjectAfter.nodes.map((n) => n.id)).size).toBe(
      insertProjectAfter.nodes.length
    );
    const firstInsertedVtmNode = insertProjectAfter.nodes.find(
      (n) => n.id === useTuringStore.getState().selectedNodeId
    );
    expect((firstInsertedVtmNode?.data as any)?.opType).toBe('SHIFT_R');

    expect(store.insertVTMCode('r ?')).toBe(false);
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(nodesBeforeInsert + 3);

    store.setSelectedNodeId(firstInsertedVtmNode!.id);
    const nodesBeforeDeleteKey = useTuringStore.getState().getActiveProject().nodes.length;
    expect(
      handleDebuggerKeyboardShortcut({
        key: 'Delete',
        target: { tagName: 'BODY' },
        preventDefault() {},
      } as any)
    ).toBe(true);
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(
      nodesBeforeDeleteKey - 1
    );

    store.setSelectedNodeId(null);
    const edgeForBackspace = useTuringStore.getState().getActiveProject().edges[0];
    store.setSelectedEdgeId(edgeForBackspace.id);
    const edgesBeforeBackspace = useTuringStore.getState().getActiveProject().edges.length;
    expect(
      handleDebuggerKeyboardShortcut({
        key: 'Backspace',
        target: { tagName: 'BODY' },
        preventDefault() {},
      } as any)
    ).toBe(true);
    expect(useTuringStore.getState().getActiveProject().edges).toHaveLength(
      edgesBeforeBackspace - 1
    );
  });

  it('supports positioned node creation, edge reconnection, project functions, and nearest edge ports', () => {
    const store = useTuringStore.getState();

    store.switchProject(DEMO_PROJECT_3.id);
    store.addOperationNode('SHIFT_R', 'r', undefined, { x: 777, y: 333 });
    const positionedOperation = useTuringStore.getState().getActiveProject().nodes.slice(-1)[0];
    expect(positionedOperation.position).toEqual({ x: 777, y: 333 });

    store.addStateNode('normal', 'q_ctx', { x: 888, y: 444 });
    const positionedState = useTuringStore.getState().getActiveProject().nodes.slice(-1)[0];
    expect(positionedState.position).toEqual({ x: 888, y: 444 });

    store.switchProject(DEMO_PROJECT_1.id);
    store.reconnectEdge('edge_q0_q0', {
      source: 'q0',
      target: 'q_halt',
      sourceHandle: null,
      targetHandle: null,
    });
    const reconnectedProject = useTuringStore.getState().getActiveProject();
    const reconnectedEdge = reconnectedProject.edges.find((edge) => edge.id === 'edge_q0_q0');
    expect(reconnectedEdge?.source).toBe('q0');
    expect(reconnectedEdge?.target).toBe('q_halt');
    expect(
      reconnectedProject.rules5
        .filter((rule) => rule.id.startsWith('r'))
        .every((rule) => rule.toState === 'q_halt')
    ).toBe(true);

    store.onConnect({
      source: 'q0',
      target: 'q_halt',
      sourceHandle: 'bottom',
      targetHandle: 'left',
    });
    store.addFiveTupleRule({
      fromState: 'q0',
      readSymbol: '0',
      writeSymbol: '0',
      move: 'R',
      toState: 'q_halt',
    });
    const positionedWire = useTuringStore
      .getState()
      .getActiveProject()
      .edges.find((edge) => edge.source === 'q0' && edge.target === 'q_halt');
    expect(positionedWire?.sourceHandle).toBe('bottom');
    expect(positionedWire?.targetHandle).toBe('left');
    store.closeRuleModal();

    store.createProject('4-tuple', 'operational', 'Function host');
    const functionHostId = useTuringStore.getState().activeProjectId;
    expect(Object.keys(useTuringStore.getState().getActiveProject().initialTape)).toHaveLength(0);
    expect(store.addProjectFunction(DEMO_PROJECT_3.id, 'K', { x: 420, y: 240 })).toBe(true);
    const functionHost = useTuringStore.getState().getActiveProject();
    const importedFunction = functionHost.subMachines.find((fn) => fn.code === 'K');
    const functionNode = functionHost.nodes.find(
      (node) => (node.data as any).opType === 'COMPLEX_MACHINE'
    );
    expect(Boolean(importedFunction)).toBe(true);
    expect((functionNode?.data as any)?.subMachineId).toBe(importedFunction?.id);

    const functionCodeResult = compileVTMCode('K r', functionHost.alphabet, {
      functions: functionHost.subMachines,
    });
    expect(functionCodeResult.errors).toHaveLength(0);
    expect((functionCodeResult.nodes[0]?.data as any)?.opType).toBe('COMPLEX_MACHINE');
    expect((functionCodeResult.nodes[0]?.data as any)?.subMachineId).toBe(importedFunction?.id);
    expect(useTuringStore.getState().activeProjectId).toBe(functionHostId);

    const nearestPorts = assignNearestEdgeHandles(
      [
        { id: 'left_node', type: 'stateNode', position: { x: 0, y: 0 }, data: { label: 'left', stateType: 'normal' } },
        { id: 'right_node', type: 'stateNode', position: { x: 300, y: 0 }, data: { label: 'right', stateType: 'normal' } },
        { id: 'lower_node', type: 'stateNode', position: { x: 0, y: 240 }, data: { label: 'lower', stateType: 'normal' } },
      ] as TuringNode[],
      [
        {
          id: 'horizontal',
          source: 'left_node',
          target: 'right_node',
          type: 'customTransition',
          data: { mode: '5-tuple', rules: [] },
        },
        {
          id: 'vertical',
          source: 'left_node',
          target: 'lower_node',
          type: 'customTransition',
          data: { mode: '5-tuple', rules: [] },
        },
      ] as TuringEdge[]
    );
    expect(nearestPorts[0].sourceHandle).toBe('right');
    expect(nearestPorts[0].targetHandle).toBe('left');
    expect(nearestPorts[1].sourceHandle).toBe('bottom');
    expect(nearestPorts[1].targetHandle).toBe('top');

    const diagonalPorts = assignNearestEdgeHandles(
      [
        { id: 'a', type: 'operationNode', position: { x: 0, y: 400 }, data: {} },
        { id: 'b', type: 'operationNode', position: { x: 200, y: 0 }, data: {} },
      ] as TuringNode[],
      [{ id: 'diagonal', source: 'a', target: 'b', data: { mode: '4-tuple', rules: [] } }] as TuringEdge[]
    );
    expect(diagonalPorts[0].sourceHandle).toBe('right');
    expect(diagonalPorts[0].targetHandle).toBe('left');

    const fanOutPorts = assignNearestEdgeHandles(
      [
        { id: 'fan_source', type: 'operationNode', position: { x: 0, y: 0 }, data: {} },
        { id: 'fan_upper', type: 'operationNode', position: { x: 300, y: -100 }, data: {} },
        { id: 'fan_lower', type: 'operationNode', position: { x: 300, y: 100 }, data: {} },
      ] as TuringNode[],
      [
        { id: 'fan_upper_edge', source: 'fan_source', target: 'fan_upper', data: {} },
        { id: 'fan_lower_edge', source: 'fan_source', target: 'fan_lower', data: {} },
      ] as TuringEdge[]
    );
    expect(fanOutPorts[0].sourceHandle).toBe(fanOutPorts[1].sourceHandle);

    const reciprocalNodes = [
      { id: 'left', type: 'operationNode', position: { x: 0, y: 0 }, data: {} },
      { id: 'right', type: 'operationNode', position: { x: 420, y: 0 }, data: {} },
    ] as TuringNode[];
    const reciprocalEdges = [
      { id: 'forward', source: 'left', target: 'right', data: {} },
      { id: 'return', source: 'right', target: 'left', data: {} },
    ] as TuringEdge[];
    const reciprocalPorts = assignNearestEdgeHandles(reciprocalNodes, reciprocalEdges);
    expect(reciprocalPorts[0].sourceHandle).not.toBe(reciprocalPorts[1].targetHandle);
    expect(reciprocalPorts[0].targetHandle).not.toBe(reciprocalPorts[1].sourceHandle);
    expect(findFeedbackEdgeIds(reciprocalNodes, reciprocalEdges).has('return')).toBe(true);

    // Self-loop on the same handle must be rejected by onConnect and reconnectEdge
    store.switchProject(DEMO_PROJECT_3.id);
    store.onConnect({
      source: 'vtm_mark_x',
      target: 'vtm_mark_x',
      sourceHandle: 'right',
      targetHandle: 'right',
    });
    expect(useTuringStore.getState().isRuleModalOpen).toBe(false);
    expect(useTuringStore.getState().portError).toBeTruthy();

    store.reconnectEdge('e_vtm_find_loop', {
      source: 'vtm_find_mark',
      target: 'vtm_find_mark',
      sourceHandle: 'right',
      targetHandle: 'right',
    });
    expect(useTuringStore.getState().portError).toBeTruthy();

    // Outgoing connections from FINISH (and halt states) must be rejected with portError
    store.clearPortError();
    store.onConnect({
      source: 'vtm_finish',
      target: 'vtm_start',
      sourceHandle: 'left',
      targetHandle: 'right',
    });
    expect(useTuringStore.getState().isRuleModalOpen).toBe(false);
    expect(useTuringStore.getState().portError).toMatch(/FINISH/i);

    store.reconnectEdge('e_vtm_1', {
      source: 'vtm_finish',
      target: 'vtm_mark_x',
      sourceHandle: null,
      targetHandle: null,
    });
    expect(useTuringStore.getState().portError).toMatch(/FINISH/i);
    expect(
      useTuringStore.getState().getActiveProject().edges.find((e) => e.id === 'e_vtm_1')?.source
    ).toBe('vtm_start');

    store.switchProject(DEMO_PROJECT_1.id);
    store.onConnect({
      source: 'q_halt',
      target: 'q0',
      sourceHandle: 'left',
      targetHandle: 'right',
    });
    expect(useTuringStore.getState().isRuleModalOpen).toBe(false);
    expect(useTuringStore.getState().portError).toMatch(/q_halt/);
  });
});
