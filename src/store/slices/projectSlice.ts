import { ProjectSession, TuringMode, FourTupleSubMode } from '../../types/turing';
import { initRuntimeState } from '../../engine/simulator';
import { exportDiagramAsImage, ExportImageOptions } from '../../utils/exportImage';
import { INITIAL_PROJECTS } from '../demoProjects';
import { ProjectSlice, SliceCreator } from '../types';

export const createProjectSlice: SliceCreator<ProjectSlice> = (set, get) => ({
  projects: INITIAL_PROJECTS,
  activeProjectId: INITIAL_PROJECTS[0].id,

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find((p) => p.id === activeProjectId) || projects[0] || INITIAL_PROJECTS[0];
  },

  updateActiveProject: (updater) => {
    const { activeProjectId, projects } = get();
    const updatedProjects = projects.map((p) => {
      if (p.id === activeProjectId) {
        const updated = updater(p);
        return { ...updated, updatedAt: Date.now() };
      }
      return p;
    });
    set({ projects: updatedProjects });
  },

  switchProject: (id: string) => {
    const project = get().projects.find((p) => p.id === id);
    if (project) {
      set({
        activeProjectId: id,
        runtime: initRuntimeState(project),
        selectedNodeId: null,
        selectedEdgeId: null,
        isRunning: false,
        editorUndoStack: [],
        editorRedoStack: [],
      });
    }
  },

  createProject: (mode: TuringMode = '5-tuple', subMode: FourTupleSubMode = 'state-graph', name?: string) => {
    const newId = `project_${Date.now()}`;
    const newProject: ProjectSession = {
      id: newId,
      name: name || `Новая машина Тьюринга (${mode})`,
      description: 'Описание и условие задачи...',
      mode,
      subMode,
      alphabet: {
        symbols: ['0', '1'],
        blankSymbol: '_',
      },
      nodes:
        mode === '5-tuple' || subMode === 'state-graph'
          ? [
              {
                id: 'q0',
                type: 'stateNode',
                position: { x: 150, y: 150 },
                data: { label: 'q0', stateType: 'initial' },
              },
              {
                id: 'q_halt',
                type: 'stateNode',
                position: { x: 400, y: 150 },
                data: { label: 'q_halt', stateType: 'halt' },
              },
            ]
          : [
              {
                id: 'op_start',
                type: 'operationNode',
                position: { x: 150, y: 150 },
                data: { label: 'START', opType: 'START' },
              },
              {
                id: 'op_finish',
                type: 'operationNode',
                position: { x: 400, y: 150 },
                data: { label: 'FINISH', opType: 'FINISH' },
              },
            ],
      edges: [],
      rules5: [],
      rules4: [],
      subMachines: [],
      initialTape: { 0: '1', 1: '0', 2: '1' },
      initialHeadPosition: 0,
      testCases: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      projects: [newProject, ...state.projects],
      activeProjectId: newId,
      runtime: initRuntimeState(newProject),
      isSessionDrawerOpen: false,
      selectedNodeId: null,
      selectedEdgeId: null,
      isRunning: false,
      editorUndoStack: [],
      editorRedoStack: [],
    }));
  },

  duplicateProject: (id: string) => {
    const target = get().projects.find((p) => p.id === id);
    if (!target) return;
    const copyId = `project_copy_${Date.now()}`;
    const duplicated: ProjectSession = {
      ...JSON.parse(JSON.stringify(target)),
      id: copyId,
      name: `${target.name} (Копия)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      projects: [duplicated, ...state.projects],
      activeProjectId: copyId,
      runtime: initRuntimeState(duplicated),
      selectedNodeId: null,
      selectedEdgeId: null,
      isRunning: false,
      editorUndoStack: [],
      editorRedoStack: [],
    }));
  },

  renameProject: (id: string, name: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, name, updatedAt: Date.now() } : p
      ),
    }));
  },

  updateProjectDescription: (id: string, description: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, description, updatedAt: Date.now() } : p
      ),
    }));
  },

  deleteProject: (id: string) => {
    const { projects, activeProjectId } = get();
    if (projects.length <= 1) return;
    const remaining = projects.filter((p) => p.id !== id);
    const nextActiveId = activeProjectId === id ? remaining[0].id : activeProjectId;
    const nextActive = remaining.find((p) => p.id === nextActiveId) || remaining[0];
    set({
      projects: remaining,
      activeProjectId: nextActiveId,
      runtime: initRuntimeState(nextActive),
      selectedNodeId: null,
      selectedEdgeId: null,
      isRunning: false,
      editorUndoStack: [],
      editorRedoStack: [],
    });
  },

  importProject: (project: ProjectSession) => {
    const newProject: ProjectSession = {
      ...project,
      id: `imported_${Date.now()}`,
      updatedAt: Date.now(),
    };
    set((state) => ({
      projects: [newProject, ...state.projects],
      activeProjectId: newProject.id,
      runtime: initRuntimeState(newProject),
      selectedNodeId: null,
      selectedEdgeId: null,
      isRunning: false,
      editorUndoStack: [],
      editorRedoStack: [],
    }));
  },

  exportDiagramImage: async (options?: ExportImageOptions) => {
    try {
      const project = get().getActiveProject();
      const filename = options?.filename ?? `${project.name.replace(/\s+/g, '_')}_diagram`;
      return await exportDiagramAsImage('.react-flow', {
        ...options,
        nodes: project.nodes,
        filename,
      });
    } catch (err) {
      console.error('Failed to export diagram image:', err);
      return null;
    }
  },
});
