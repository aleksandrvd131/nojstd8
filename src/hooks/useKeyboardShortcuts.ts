import { useEffect } from 'react';
import { useTuringStore } from '../store/useTuringStore';

export function handleDebuggerKeyboardShortcut(
  e: KeyboardEvent,
  store = useTuringStore.getState()
): boolean {
  const target = e.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      target.closest?.('[data-tape-strip]'))
  ) {
    return false;
  }

  // Editor Undo / Redo: Ctrl+Z / Cmd+Z, Ctrl+Shift+Z / Cmd+Shift+Z, Ctrl+Y
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    if (e.code === 'KeyZ') {
      e.preventDefault();
      if (e.shiftKey) {
        store.redoEditor();
      } else {
        store.undoEditor();
      }
      return true;
    }
    if (e.code === 'KeyY' && !e.shiftKey) {
      e.preventDefault();
      store.redoEditor();
      return true;
    }
  }

  // Delete / Backspace: Remove currently selected node or edge (when no modal/drawer blocks the editor)
  const hasBlockingOverlay =
    store.isRuleModalOpen ||
    store.isAlphabetModalOpen ||
    store.isExportModalOpen ||
    store.isSessionDrawerOpen ||
    store.confirmModal !== null;

  const isDeleteKey =
    e.code === 'Delete' ||
    e.code === 'Backspace' ||
    e.key === 'Delete' ||
    e.key === 'Backspace';

  if (isDeleteKey && !e.ctrlKey && !e.metaKey && !e.altKey && !hasBlockingOverlay) {
    const project = store.getActiveProject();
    const selectedNodes = project.nodes.filter((node) => node.selected).map((node) => node.id);
    const selectedEdges = project.edges.filter((edge) => edge.selected).map((edge) => edge.id);
    if ((selectedNodes.length || selectedEdges.length) && !store.selectedNodeId && !store.selectedEdgeId ||
        selectedNodes.length > 1 || (selectedNodes.length > 0 && selectedEdges.length > 0)) {
      e.preventDefault();
      store.deleteGraphElements(selectedNodes, selectedEdges);
      return true;
    }
    if (store.selectedNodeId) {
      e.preventDefault();
      store.deleteNode(store.selectedNodeId);
      store.setSelectedNodeId(null);
      store.setSelectedEdgeId(null);
      return true;
    }
    if (store.selectedEdgeId) {
      e.preventDefault();
      store.onEdgesChange([{ type: 'remove', id: store.selectedEdgeId }]);
      store.setSelectedEdgeId(null);
      return true;
    }
  }

  if (!store.keyboardShortcutsEnabled) return false;

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const listener = (e: KeyboardEvent) => {
      handleDebuggerKeyboardShortcut(e);
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [keyboardShortcutsEnabled]);
}
