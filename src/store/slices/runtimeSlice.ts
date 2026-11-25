import {
  ProjectSession,
  RuntimeStats,
  TestCase,
  StateNodeData,
  OperationNodeData,
} from '../../types/turing';
import {
  RuntimeState,
  initRuntimeState,
  stepMachine,
  stepBackMachine,
  runTestCase,
  tokenizeTapeInput,
} from '../../engine/simulator';
import { INITIAL_PROJECTS } from '../demoProjects';
import { RuntimeSlice, SliceCreator } from '../types';

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

  let currentNode = project.nodes.find((n) => n.id === runtime.currentNodeId);
  if (!currentNode && runtime.callStack.length > 0) {
    const topFrame = runtime.callStack[runtime.callStack.length - 1];
    const sm = project.subMachines?.find((m) => m.id === topFrame.subMachineId);
    currentNode = sm?.nodes.find((n) => n.id === runtime.currentNodeId);
  }
  if (!currentNode && project.subMachines) {
    for (const sm of project.subMachines) {
      const found = sm.nodes.find((n) => n.id === runtime.currentNodeId);
      if (found) {
        currentNode = found;
        break;
      }
    }
  }
  const currentNodeLabel = currentNode?.data?.label ?? runtime.currentNodeId;
  const currentNodeData = currentNode?.data as
    | Partial<StateNodeData & OperationNodeData>
    | undefined;
  const currentNodeType = currentNodeData?.stateType ?? currentNodeData?.opType;
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

export const createRuntimeSlice: SliceCreator<RuntimeSlice> = (set, get) => ({
  runtime: initRuntimeState(INITIAL_PROJECTS[0]),

  setTapeCell: (pos: number, sym: string) => {
    set((state) => ({
      runtime: {
        ...state.runtime,
        tape: { ...state.runtime.tape, [pos]: sym },
        recentConfigs: undefined,
      },
    }));
  },

  setTapeString: (word: string, startPos = 0) => {
    const active = get().getActiveProject();
    const tokens = tokenizeTapeInput(word, active.alphabet);
    const newTape: Record<number, string> = {};
    for (let i = 0; i < tokens.length; i++) {
      newTape[startPos + i] = tokens[i];
    }
    const baseRuntime = initRuntimeState(active);
    set({
      runtime: {
        ...baseRuntime,
        tape: newTape,
        headPosition: startPos,
        visitedPositions: [startPos],
        recentConfigs: undefined,
      },
      isRunning: false,
    });
  },

  clearTape: () => {
    const active = get().getActiveProject();
    const baseRuntime = initRuntimeState(active);
    set({
      runtime: {
        ...baseRuntime,
        tape: {},
        headPosition: 0,
        visitedPositions: [0],
        recentConfigs: undefined,
      },
      isRunning: false,
    });
  },

  setHeadPosition: (pos: number) => {
    set((state) => ({
      runtime: {
        ...state.runtime,
        headPosition: pos,
        recentConfigs: undefined,
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
});
