import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectSession } from '../types/turing';
import { INITIAL_PROJECTS } from './demoProjects';
import { initRuntimeState } from '../engine/simulator';
import { createDebouncedStorage } from './storage';
import {
  useTuringStore,
  handleDebuggerKeyboardShortcut,
} from './useTuringStore';

function resetStore() {
  const freshProjects: ProjectSession[] = JSON.parse(JSON.stringify(INITIAL_PROJECTS));
  useTuringStore.setState({
    projects: freshProjects,
    activeProjectId: freshProjects[0].id,
    runtime: initRuntimeState(freshProjects[0]),
    isRunning: false,
    selectedNodeId: null,
    selectedEdgeId: null,
    editorUndoStack: [],
    editorRedoStack: [],
    keyboardShortcutsEnabled: true,
  });
}

describe('Editor Undo/Redo & Debounced Storage', () => {
  beforeEach(() => {
    resetStore();
  });

  it('undoes and redoes node addition, deletion, and rule mutations', () => {
    const store = useTuringStore.getState();
    const initialCount = store.getActiveProject().nodes.length;

    store.addStateNode('normal', 'q_new');
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount + 1);
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(1);

    store.addFiveTupleRule({
      fromState: 'q0',
      readSymbol: '0',
      writeSymbol: '1',
      move: 'R',
      toState: 'q_halt',
    });
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(2);

    // Undo rule addition
    useTuringStore.getState().undoEditor();
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount + 1);
    expect(useTuringStore.getState().editorRedoStack).toHaveLength(1);

    // Undo node addition
    useTuringStore.getState().undoEditor();
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount);
    expect(useTuringStore.getState().editorRedoStack).toHaveLength(2);

    // Redo node addition
    useTuringStore.getState().redoEditor();
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount + 1);
  });

  it('groups multi-frame node drag into a single undo step', () => {
    const store = useTuringStore.getState();
    const origPos = { ...store.getActiveProject().nodes[0].position };

    store.onNodesChange([
      { id: 'q0', type: 'position', position: { x: origPos.x + 20, y: origPos.y + 10 }, dragging: true },
    ]);
    store.onNodesChange([
      { id: 'q0', type: 'position', position: { x: origPos.x + 60, y: origPos.y + 30 }, dragging: true },
    ]);
    // Still dragging -> undo stack should not grow yet
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(0);

    // Drag finishes
    store.onNodesChange([
      { id: 'q0', type: 'position', position: { x: origPos.x + 100, y: origPos.y + 50 }, dragging: false },
    ]);
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(1);

    useTuringStore.getState().undoEditor();
    const restoredPos = useTuringStore.getState().getActiveProject().nodes[0].position;
    expect(restoredPos.x).toBe(origPos.x);
    expect(restoredPos.y).toBe(origPos.y);
  });

  it('handles Ctrl+Z and Ctrl+Shift+Z keyboard shortcuts for editor history', () => {
    const store = useTuringStore.getState();
    const initialCount = store.getActiveProject().nodes.length;
    store.addStateNode('normal');
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount + 1);

    const undoEvent = new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true });
    expect(handleDebuggerKeyboardShortcut(undoEvent)).toBe(true);
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount);

    const redoEvent = new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true, shiftKey: true });
    expect(handleDebuggerKeyboardShortcut(redoEvent)).toBe(true);
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount + 1);
  });

  it('clears editor undo/redo history when switching projects', () => {
    useTuringStore.getState().addStateNode('normal');
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(1);

    useTuringStore.getState().switchProject(INITIAL_PROJECTS[1].id);
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(0);
    expect(useTuringStore.getState().editorRedoStack).toHaveLength(0);
  });

  it('coalesces rapid writes in createDebouncedStorage and supports flush()', () => {
    vi.useFakeTimers();
    const backing = new Map<string, string>();
    const setSpy = vi.fn((k: string, v: string) => {
      backing.set(k, v);
    });
    const debounced = createDebouncedStorage(
      {
        getItem: (k) => backing.get(k) ?? null,
        setItem: setSpy,
        removeItem: (k) => {
          backing.delete(k);
        },
      },
      250
    );

    debounced.setItem('k1', 'v1');
    debounced.setItem('k1', 'v2');
    debounced.setItem('k1', 'v3');

    // Immediate getItem returns freshest pending value before flush
    expect(debounced.getItem('k1')).toBe('v3');
    expect(setSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith('k1', 'v3');

    debounced.setItem('k1', 'v4');
    debounced.flush();
    expect(setSpy).toHaveBeenCalledTimes(2);
    expect(backing.get('k1')).toBe('v4');

    vi.useRealTimers();
  });

  it('persists edge labelOffset across rule table updates', () => {
    const store = useTuringStore.getState();
    const edge = store.getActiveProject().edges.find((e) => e.source === 'q0' && e.target === 'q_halt')!;
    store.updateEdgeLabelOffset(edge.id, { x: 42, y: -18 });

    store.addFiveTupleRule({
      fromState: 'q0',
      readSymbol: '0',
      writeSymbol: '1',
      move: 'R',
      toState: 'q_halt',
    });

    const updatedEdge = useTuringStore
      .getState()
      .getActiveProject()
      .edges.find((e) => e.source === 'q0' && e.target === 'q_halt');
    expect(updatedEdge?.data?.labelOffset).toEqual({ x: 42, y: -18 });
  });

  it('deletes the selected node on Delete key and supports Undo, while respecting open modals', () => {
    const store = useTuringStore.getState();
    store.addStateNode('normal', 'q_temp');
    const targetNode = useTuringStore
      .getState()
      .getActiveProject()
      .nodes.find((n) => n.data.label === 'q_temp');
    expect(targetNode).toBeDefined();

    store.setSelectedNodeId(targetNode!.id);

    // Should ignore Delete when a modal is open
    useTuringStore.setState({ isRuleModalOpen: true });
    expect(
      handleDebuggerKeyboardShortcut(new KeyboardEvent('keydown', { code: 'Delete' }))
    ).toBe(false);
    expect(
      useTuringStore
        .getState()
        .getActiveProject()
        .nodes.some((n) => n.id === targetNode!.id)
    ).toBe(true);

    // Close modal and press Delete
    useTuringStore.setState({ isRuleModalOpen: false });
    expect(
      handleDebuggerKeyboardShortcut(new KeyboardEvent('keydown', { code: 'Delete' }))
    ).toBe(true);

    expect(
      useTuringStore
        .getState()
        .getActiveProject()
        .nodes.some((n) => n.id === targetNode!.id)
    ).toBe(false);
    expect(useTuringStore.getState().selectedNodeId).toBeNull();

    // Ctrl+Z restores the deleted node
    expect(
      handleDebuggerKeyboardShortcut(new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true }))
    ).toBe(true);
    expect(
      useTuringStore
        .getState()
        .getActiveProject()
        .nodes.some((n) => n.id === targetNode!.id)
    ).toBe(true);
  });
});
