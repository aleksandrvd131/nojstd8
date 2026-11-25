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
      target.isContentEditable)
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

  // Delete: Remove currently selected node (when no modal/drawer blocks the editor)
  const hasBlockingOverlay =
    store.isRuleModalOpen ||
    store.isAlphabetModalOpen ||
    store.isExportModalOpen ||
    store.isSessionDrawerOpen ||
    store.confirmModal !== null;

  if (
    e.code === 'Delete' &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    !hasBlockingOverlay &&
    store.selectedNodeId
  ) {
    e.preventDefault();
    store.deleteNode(store.selectedNodeId);
    store.setSelectedNodeId(null);
    return true;
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
