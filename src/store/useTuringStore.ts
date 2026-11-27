import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ProjectSession, RuntimeStats } from '../types/turing';
import { INITIAL_PROJECTS } from './demoProjects';
import { debouncedPersistStorage, safeStorage } from './storage';
import { TuringStoreState } from './types';
import { createUiSlice } from './slices/uiSlice';
import { createProjectSlice } from './slices/projectSlice';
import { createGraphSlice } from './slices/graphSlice';
import { createRulesSlice, ALPHABET_PRESETS } from './slices/rulesSlice';
import { createRuntimeSlice, getRuntimeStats } from './slices/runtimeSlice';
import { autoLayoutGraph } from '../utils/autoLayout';
import {
  handleDebuggerKeyboardShortcut,
  useKeyboardShortcuts,
} from '../hooks/useKeyboardShortcuts';

export {
  ALPHABET_PRESETS,
  autoLayoutGraph,
  safeStorage,
  debouncedPersistStorage,
  getRuntimeStats,
  handleDebuggerKeyboardShortcut,
  useKeyboardShortcuts,
};
export type { TuringStoreState } from './types';

export const useTuringStore = create<TuringStoreState>()(
  persist(
    (set, get, store) => ({
      ...createUiSlice(set, get, store),
      ...createProjectSlice(set, get, store),
      ...createGraphSlice(set, get, store),
      ...createRulesSlice(set, get, store),
      ...createRuntimeSlice(set, get, store),
    }),
    {
      name: 'turing_diagrammer_storage_v1',
      storage: createJSONStorage(() => debouncedPersistStorage),
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        theme: state.theme,
        executionSpeedMs: state.executionSpeedMs,
        keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<TuringStoreState>;
        const rawProjects = Array.isArray(persisted.projects) ? persisted.projects : [];
        const vtmProjects = rawProjects.filter(
          (p) => p.mode === '4-tuple' && p.subMode === 'operational'
        );
        const projects = vtmProjects.length > 0 ? vtmProjects : INITIAL_PROJECTS;
        const activeProjectId = projects.some((p) => p.id === persisted.activeProjectId)
          ? (persisted.activeProjectId as string)
          : projects[0].id;
        return {
          ...currentState,
          ...persisted,
          projects,
          activeProjectId,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.resetExecution();
      },
    }
  )
);

export const useActiveProject = (): ProjectSession => {
  return useTuringStore((s) => {
    return (
      s.projects.find((p) => p.id === s.activeProjectId) ||
      s.projects[0] ||
      INITIAL_PROJECTS[0]
    );
  });
};

export const useRuntimeStats = (): RuntimeStats => {
  return useTuringStore((state) => {
    const project =
      state.projects.find((p) => p.id === state.activeProjectId) ||
      state.projects[0] ||
      INITIAL_PROJECTS[0];
    return getRuntimeStats(project, state.runtime);
  });
};
