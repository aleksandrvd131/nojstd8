import { DEMO_PROJECT_1, DEMO_PROJECT_2, DEMO_PROJECT_3 } from '../store/demoProjects';
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

console.log('\nALL ENGINE AND SIMULATION TESTS PASSED SUCCESSFULLY! 🚀');
