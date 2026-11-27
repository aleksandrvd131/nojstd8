import { CanvasBackgroundVariant, SliceCreator, UiSlice } from '../types';

export const DEFAULT_COSMETIC_SETTINGS: {
  theme: 'light' | 'dark';
  hideEdgeRules: boolean;
  showMiniMap: boolean;
  showCanvasControls: boolean;
  canvasBackground: CanvasBackgroundVariant;
} = {
  theme: 'dark',
  hideEdgeRules: false,
  showMiniMap: true,
  showCanvasControls: true,
  canvasBackground: 'dots',
};

export const createUiSlice: SliceCreator<UiSlice> = (set) => ({
  ...DEFAULT_COSMETIC_SETTINGS,
  activeTab: 'check',
  isInspectorOpen: false,
  tapeError: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  isSessionDrawerOpen: false,
  isAlphabetModalOpen: false,
  isExportModalOpen: false,
  isSettingsModalOpen: false,
  isRuleModalOpen: false,
  ruleModalData: null,
  confirmModal: null,
  executionSpeedMs: 250,
  isRunning: false,
  keyboardShortcutsEnabled: true,

  setTheme: (theme) => set({ theme }),
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
  setSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
  openRuleModal: (data) => set({ isRuleModalOpen: true, ruleModalData: data }),
  closeRuleModal: () => set({ isRuleModalOpen: false, ruleModalData: null }),
  openConfirmModal: (data) => set({ confirmModal: data }),
  closeConfirmModal: () => set({ confirmModal: null }),
  setExecutionSpeedMs: (speed) => set({ executionSpeedMs: speed }),
  toggleKeyboardShortcuts: () =>
    set((state) => ({ keyboardShortcutsEnabled: !state.keyboardShortcutsEnabled })),
  setKeyboardShortcutsEnabled: (enabled) => set({ keyboardShortcutsEnabled: enabled }),
  toggleHideEdgeRules: () =>
    set((state) => ({ hideEdgeRules: !state.hideEdgeRules })),
  setHideEdgeRules: (hide) => set({ hideEdgeRules: hide }),
  setShowMiniMap: (show) => set({ showMiniMap: show }),
  setShowCanvasControls: (show) => set({ showCanvasControls: show }),
  setCanvasBackground: (canvasBackground) => set({ canvasBackground }),
  resetCosmeticSettings: () => set({ ...DEFAULT_COSMETIC_SETTINGS }),
});
