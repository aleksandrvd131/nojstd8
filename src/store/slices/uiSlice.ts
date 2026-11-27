import { SliceCreator, UiSlice } from '../types';

export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  theme: 'dark',
  activeTab: 'check',
  isInspectorOpen: false,
  tapeError: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  isSessionDrawerOpen: false,
  isAlphabetModalOpen: false,
  isExportModalOpen: false,
  isRuleModalOpen: false,
  ruleModalData: null,
  confirmModal: null,
  executionSpeedMs: 250,
  isRunning: false,
  keyboardShortcutsEnabled: true,

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setInspectorOpen: (open) => set({ isInspectorOpen: open }),
  setTapeError: (error) => set({ tapeError: error }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id }),
  setSessionDrawerOpen: (open) => set({ isSessionDrawerOpen: open }),
  setAlphabetModalOpen: (open) => set({ isAlphabetModalOpen: open }),
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  openRuleModal: (data) => set({ isRuleModalOpen: true, ruleModalData: data }),
  closeRuleModal: () => set({ isRuleModalOpen: false, ruleModalData: null }),
  openConfirmModal: (data) => set({ confirmModal: data }),
  closeConfirmModal: () => set({ confirmModal: null }),
  setExecutionSpeedMs: (speed) => set({ executionSpeedMs: speed }),
  toggleKeyboardShortcuts: () =>
    set((state) => ({ keyboardShortcutsEnabled: !state.keyboardShortcutsEnabled })),
  setKeyboardShortcutsEnabled: (enabled) => set({ keyboardShortcutsEnabled: enabled }),
});
