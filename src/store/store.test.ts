import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectSession } from '../types/turing';
import { DEMO_PROJECT_1, DEMO_PROJECT_2, DEMO_PROJECT_3, INITIAL_PROJECTS } from './demoProjects';
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
    isInspectorOpen: false,
    activeTab: 'check',
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

    store.addOperationNode('SHIFT_R', 'r');
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount + 1);
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(1);

    store.upsertOperationalEdgeRule({
      sourceNodeId: 'vtm_start',
      targetNodeId: 'vtm_finish',
      readSymbol: '0',
      isWildcard: false,
      isComplement: false,
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
    const targetId = store.getActiveProject().nodes[0].id;
    const origPos = { ...store.getActiveProject().nodes[0].position };

    store.onNodesChange([
      { id: targetId, type: 'position', position: { x: origPos.x + 20, y: origPos.y + 10 }, dragging: true },
    ]);
    store.onNodesChange([
      { id: targetId, type: 'position', position: { x: origPos.x + 60, y: origPos.y + 30 }, dragging: true },
    ]);
    // Still dragging -> undo stack should not grow yet
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(0);

    // Drag finishes
    store.onNodesChange([
      { id: targetId, type: 'position', position: { x: origPos.x + 100, y: origPos.y + 50 }, dragging: false },
    ]);
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(1);

    useTuringStore.getState().undoEditor();
    const restoredPos = useTuringStore.getState().getActiveProject().nodes[0].position;
    expect(restoredPos.x).toBe(origPos.x);
    expect(restoredPos.y).toBe(origPos.y);
  });

  it('deletes a selected group and connected edges in one undo step', () => {
    const project = useTuringStore.getState().getActiveProject();
    const ids = project.nodes.slice(0, 2).map((node) => node.id);
    useTuringStore.getState().onNodesChange(ids.map((id) => ({ id, type: 'select', selected: true })));
    const key = new KeyboardEvent('keydown', { key: 'Delete', code: 'Delete', cancelable: true });
    expect(handleDebuggerKeyboardShortcut(key)).toBe(true);
    const result = useTuringStore.getState().getActiveProject();
    expect(result.nodes.some((node) => ids.includes(node.id))).toBe(false);
    expect(result.edges.some((edge) => ids.includes(edge.source) || ids.includes(edge.target))).toBe(false);
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(1);
    useTuringStore.getState().undoEditor();
    expect(useTuringStore.getState().getActiveProject().edges).toHaveLength(project.edges.length);
  });

  it('clears the canvas while preserving the project and restores it with undo', () => {
    const before = useTuringStore.getState().getActiveProject();
    useTuringStore.getState().clearCanvas();
    const cleared = useTuringStore.getState().getActiveProject();
    expect(cleared.id).toBe(before.id);
    expect(cleared.nodes).toEqual([]);
    expect(cleared.edges).toEqual([]);
    expect(cleared.rules4).toEqual([]);
    expect(cleared.rules5).toEqual([]);
    expect(cleared.alphabet).toEqual(before.alphabet);
    expect(cleared.testCases).toEqual(before.testCases);
    useTuringStore.getState().undoEditor();
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(before.nodes.length);
  });

  it('handles Ctrl+Z and Ctrl+Shift+Z keyboard shortcuts for editor history', () => {
    const store = useTuringStore.getState();
    const initialCount = store.getActiveProject().nodes.length;
    store.addOperationNode('SHIFT_R', 'r');
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount + 1);

    const undoEvent = new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true });
    expect(handleDebuggerKeyboardShortcut(undoEvent)).toBe(true);
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount);

    const redoEvent = new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true, shiftKey: true });
    expect(handleDebuggerKeyboardShortcut(redoEvent)).toBe(true);
    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(initialCount + 1);
  });

  it('clears editor undo/redo history when switching projects', () => {
    useTuringStore.getState().createProject(undefined, undefined, 'Вторая VTM');
    const secondId = useTuringStore.getState().activeProjectId;
    useTuringStore.getState().addOperationNode('SHIFT_L', 'l');
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(1);

    useTuringStore.getState().switchProject(DEMO_PROJECT_3.id);
    expect(useTuringStore.getState().activeProjectId).toBe(DEMO_PROJECT_3.id);
    expect(useTuringStore.getState().editorUndoStack).toHaveLength(0);
    expect(useTuringStore.getState().editorRedoStack).toHaveLength(0);
    expect(secondId).not.toBe(DEMO_PROJECT_3.id);
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

  it('persists edge labelOffset across rule updates', () => {
    const store = useTuringStore.getState();
    const edge = store.getActiveProject().edges.find((e) => e.id === 'e_vtm_1')!;
    store.updateEdgeLabelOffset(edge.id, { x: 42, y: -18 });

    store.upsertOperationalEdgeRule({
      edgeId: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      readSymbol: '0',
      isWildcard: false,
      isComplement: false,
    });

    const updatedEdge = useTuringStore
      .getState()
      .getActiveProject()
      .edges.find((e) => e.id === 'e_vtm_1');
    expect(updatedEdge?.data?.labelOffset).toEqual({ x: 42, y: -18 });
  });

  it('deletes the selected node on Delete key and supports Undo, while respecting open modals', () => {
    const store = useTuringStore.getState();
    store.addOperationNode('SHIFT_R', 'r_temp');
    const targetNode = useTuringStore
      .getState()
      .getActiveProject()
      .nodes.find((n) => n.data.label === 'r_temp');
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

  it('closes the Check/Tests dropdown on Escape without resetting runtime execution', () => {
    const store = useTuringStore.getState();
    store.stepForward();
    expect(useTuringStore.getState().runtime.stepCount).toBe(1);

    useTuringStore.setState({ isInspectorOpen: true });
    const esc = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', cancelable: true });
    expect(handleDebuggerKeyboardShortcut(esc)).toBe(true);
    expect(useTuringStore.getState().isInspectorOpen).toBe(false);
    expect(useTuringStore.getState().runtime.stepCount).toBe(1);

    // Keep legacy fixture references valid
    expect(DEMO_PROJECT_1.mode).toBe('5-tuple');
    expect(DEMO_PROJECT_2.mode).toBe('4-tuple');
  });

  it('deletes a selected edge on Delete even when Check/Tests dropdown is open unless focus is inside the dropdown', () => {
    const store = useTuringStore.getState();
    const edge = store.getActiveProject().edges[0];
    const edgesBefore = store.getActiveProject().edges.length;

    useTuringStore.setState({ isInspectorOpen: true, selectedEdgeId: edge.id });

    // Focus inside the dropdown -> Delete must not delete graph elements
    const dropdown = document.createElement('div');
    dropdown.setAttribute('data-inspector-dropdown', '');
    const innerBtn = document.createElement('button');
    dropdown.appendChild(innerBtn);
    document.body.appendChild(dropdown);
    try {
      const blockedDel = new KeyboardEvent('keydown', { key: 'Delete', code: 'Delete', bubbles: true });
      innerBtn.dispatchEvent(blockedDel);
      expect(handleDebuggerKeyboardShortcut(blockedDel)).toBe(false);
      expect(useTuringStore.getState().getActiveProject().edges).toHaveLength(edgesBefore);
    } finally {
      dropdown.remove();
    }

    // Focus on canvas/body while Check is open -> Delete deletes the selected edge
    const del = new KeyboardEvent('keydown', { key: 'Delete', code: 'Delete', cancelable: true });
    expect(handleDebuggerKeyboardShortcut(del)).toBe(true);
    expect(useTuringStore.getState().getActiveProject().edges).toHaveLength(edgesBefore - 1);
    expect(useTuringStore.getState().selectedEdgeId).toBeNull();
  });
});
