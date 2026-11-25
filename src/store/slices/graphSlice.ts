import { applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import {
  ProjectSession,
  TuringNode,
  TuringEdge,
  StateNodeType,
  OperationalNodeType,
} from '../../types/turing';
import { compileOperationalDiagramTo4Tuples } from '../../engine/transpiler';
import { initRuntimeState } from '../../engine/simulator';
import { autoLayoutGraph, computeNonOverlappingPosition } from '../../utils/autoLayout';
import { EditorSnapshot, GraphSlice, SliceCreator } from '../types';

const MAX_EDITOR_HISTORY = 50;

function captureEditorSnapshot(project: ProjectSession): EditorSnapshot {
  return JSON.parse(
    JSON.stringify({
      mode: project.mode,
      subMode: project.subMode,
      alphabet: project.alphabet,
      nodes: project.nodes,
      edges: project.edges,
      rules5: project.rules5,
      rules4: project.rules4,
    })
  );
}

function applyEditorSnapshot(prev: ProjectSession, snapshot: EditorSnapshot): ProjectSession {
  return {
    ...prev,
    mode: snapshot.mode,
    subMode: snapshot.subMode,
    alphabet: snapshot.alphabet,
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    rules5: snapshot.rules5,
    rules4: snapshot.rules4,
  };
}

export const createGraphSlice: SliceCreator<GraphSlice> = (set, get) => {
  let pendingDragSnapshot: EditorSnapshot | null = null;
  let lastNodeEditMeta: { id: string; at: number } | null = null;

  return {
    editorUndoStack: [],
    editorRedoStack: [],

    pushEditorSnapshot: (snapshot?: EditorSnapshot) => {
      const snap = snapshot ?? captureEditorSnapshot(get().getActiveProject());
      set((state) => {
        const nextStack = [...state.editorUndoStack, snap];
        if (nextStack.length > MAX_EDITOR_HISTORY) {
          nextStack.shift();
        }
        return {
          editorUndoStack: nextStack,
          editorRedoStack: [],
        };
      });
    },

    clearEditorHistory: () => {
      pendingDragSnapshot = null;
      lastNodeEditMeta = null;
      set({ editorUndoStack: [], editorRedoStack: [] });
    },

    undoEditor: () => {
      const { editorUndoStack, editorRedoStack } = get();
      if (editorUndoStack.length === 0) return;

      const previous = editorUndoStack[editorUndoStack.length - 1];
      const currentSnapshot = captureEditorSnapshot(get().getActiveProject());

      get().updateActiveProject((prev) => applyEditorSnapshot(prev, previous));
      const updatedProject = get().getActiveProject();

      set({
        editorUndoStack: editorUndoStack.slice(0, -1),
        editorRedoStack: [...editorRedoStack, currentSnapshot].slice(-MAX_EDITOR_HISTORY),
        runtime: initRuntimeState(updatedProject),
        isRunning: false,
        selectedNodeId: null,
        selectedEdgeId: null,
      });
    },

    redoEditor: () => {
      const { editorUndoStack, editorRedoStack } = get();
      if (editorRedoStack.length === 0) return;

      const next = editorRedoStack[editorRedoStack.length - 1];
      const currentSnapshot = captureEditorSnapshot(get().getActiveProject());

      get().updateActiveProject((prev) => applyEditorSnapshot(prev, next));
      const updatedProject = get().getActiveProject();

      set({
        editorUndoStack: [...editorUndoStack, currentSnapshot].slice(-MAX_EDITOR_HISTORY),
        editorRedoStack: editorRedoStack.slice(0, -1),
        runtime: initRuntimeState(updatedProject),
        isRunning: false,
        selectedNodeId: null,
        selectedEdgeId: null,
      });
    },

    onNodesChange: (changes: NodeChange<TuringNode>[]) => {
      const hasRemove = changes.some((c) => c.type === 'remove');
      const isDragStart = changes.some((c) => c.type === 'position' && c.dragging === true);
      const isDragEnd = changes.some((c) => c.type === 'position' && c.dragging === false);

      if (hasRemove) {
        get().pushEditorSnapshot();
      } else if (isDragStart && !pendingDragSnapshot) {
        pendingDragSnapshot = captureEditorSnapshot(get().getActiveProject());
      } else if (isDragEnd && pendingDragSnapshot) {
        get().pushEditorSnapshot(pendingDragSnapshot);
        pendingDragSnapshot = null;
      }

      get().updateActiveProject((prev) => {
        const newNodes = applyNodeChanges(changes, prev.nodes);
        const removedIds = new Set(
          changes.filter((c) => c.type === 'remove').map((c) => c.id)
        );
        if (removedIds.size === 0) {
          return {
            ...prev,
            nodes: newNodes,
          };
        }
        const newEdges = prev.edges.filter(
          (e) => !removedIds.has(e.source) && !removedIds.has(e.target)
        );
        const rules5 = prev.rules5.filter(
          (r) => !removedIds.has(r.fromState) && !removedIds.has(r.toState)
        );
        let rules4 = prev.rules4.filter(
          (r) => !removedIds.has(r.fromState) && !removedIds.has(r.toState)
        );
        if (prev.subMode === 'operational') {
          rules4 = compileOperationalDiagramTo4Tuples(
            newNodes,
            newEdges,
            prev.alphabet,
            prev.subMachines
          );
        }
        return {
          ...prev,
          nodes: newNodes,
          edges: newEdges,
          rules5,
          rules4,
        };
      });
      const currentSelectedNodeId = get().selectedNodeId;
      if (
        currentSelectedNodeId &&
        changes.some((c) => c.type === 'remove' && c.id === currentSelectedNodeId)
      ) {
        get().setSelectedNodeId(null);
      }
    },

    onEdgesChange: (changes: EdgeChange<TuringEdge>[]) => {
      const removedChanges = changes.filter((c) => c.type === 'remove');
      if (removedChanges.length > 0) {
        get().pushEditorSnapshot();
      }

      get().updateActiveProject((prev) => {
        if (removedChanges.length === 0) {
          return {
            ...prev,
            edges: applyEdgeChanges(changes, prev.edges),
          };
        }

        const removedIds = new Set(removedChanges.map((c) => c.id));
        const removedEdges = prev.edges.filter((e) => removedIds.has(e.id));
        const newEdges = applyEdgeChanges(changes, prev.edges);

        const removedPairs = new Set(removedEdges.map((e) => `${e.source}->${e.target}`));
        const removedRuleIds = new Set<string>();
        for (const e of removedEdges) {
          for (const r of e.data?.rules || []) {
            if (r.id) removedRuleIds.add(r.id);
          }
        }

        const rules5 = prev.rules5.filter(
          (r) => !removedPairs.has(`${r.fromState}->${r.toState}`) && !removedRuleIds.has(r.id)
        );

        let rules4 = prev.rules4.filter(
          (r) => !removedPairs.has(`${r.fromState}->${r.toState}`) && !removedRuleIds.has(r.id)
        );

        if (prev.subMode === 'operational') {
          rules4 = compileOperationalDiagramTo4Tuples(
            prev.nodes,
            newEdges,
            prev.alphabet,
            prev.subMachines
          );
        }

        return {
          ...prev,
          edges: newEdges,
          rules5,
          rules4,
        };
      });
    },

    onConnect: (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      get().openRuleModal({
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      });
    },

    addStateNode: (type: StateNodeType, label?: string) => {
      get().pushEditorSnapshot();
      const project = get().getActiveProject();
      let idx = project.nodes.length;
      let newId = type === 'halt' ? 'q_halt' : `q${idx}`;
      const existingIds = new Set(project.nodes.map((n) => n.id));
      while (existingIds.has(newId)) {
        idx++;
        newId = type === 'halt' ? `q_halt_${idx}` : `q${idx}`;
      }

      const pos = computeNonOverlappingPosition(project.nodes);
      const newNode: TuringNode = {
        id: newId,
        type: 'stateNode',
        position: pos,
        data: {
          label: label || newId,
          stateType: type,
        },
      };

      get().updateActiveProject((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
      }));
    },

    addOperationNode: (opType: OperationalNodeType, label?: string, symbolToWrite?: string) => {
      get().pushEditorSnapshot();
      const project = get().getActiveProject();
      let count = project.nodes.length;
      let newId = `op_${opType.toLowerCase()}_${count}`;
      const existingIds = new Set(project.nodes.map((n) => n.id));
      while (existingIds.has(newId)) {
        count++;
        newId = `op_${opType.toLowerCase()}_${count}`;
      }

      const pos = computeNonOverlappingPosition(project.nodes);
      const newNode: TuringNode = {
        id: newId,
        type: 'operationNode',
        position: pos,
        data: {
          label: label || opType,
          opType,
          symbolToWrite,
        },
      };

      get().updateActiveProject((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
      }));
    },

    updateNodeData: (id: string, data: Record<string, unknown>) => {
      const now = Date.now();
      if (!lastNodeEditMeta || lastNodeEditMeta.id !== id || now - lastNodeEditMeta.at > 800) {
        get().pushEditorSnapshot();
      }
      lastNodeEditMeta = { id, at: now };

      get().updateActiveProject((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        ),
      }));
    },

    updateEdgeLabelOffset: (edgeId: string, labelOffset: { x: number; y: number }) => {
      get().updateActiveProject((prev) => ({
        ...prev,
        edges: prev.edges.map((e) =>
          e.id === edgeId
            ? {
                ...e,
                data: {
                  ...e.data,
                  mode: e.data?.mode ?? prev.mode,
                  rules: e.data?.rules ?? [],
                  labelOffset,
                },
              }
            : e
        ),
      }));
    },

    deleteNode: (id: string) => {
      get().pushEditorSnapshot();
      get().updateActiveProject((prev) => {
        const newNodes = prev.nodes.filter((n) => n.id !== id);
        const newEdges = prev.edges.filter((e) => e.source !== id && e.target !== id);
        const rules5 = prev.rules5.filter((r) => r.fromState !== id && r.toState !== id);
        let rules4 = prev.rules4.filter((r) => r.fromState !== id && r.toState !== id);
        if (prev.subMode === 'operational') {
          rules4 = compileOperationalDiagramTo4Tuples(
            newNodes,
            newEdges,
            prev.alphabet,
            prev.subMachines
          );
        }
        return {
          ...prev,
          nodes: newNodes,
          edges: newEdges,
          rules5,
          rules4,
        };
      });
      if (get().selectedNodeId === id) {
        get().setSelectedNodeId(null);
      }
    },

    applyAutoLayout: () => {
      get().pushEditorSnapshot();
      const project = get().getActiveProject();
      const newNodes = autoLayoutGraph(project.nodes, project.edges);
      get().updateActiveProject((prev) => ({
        ...prev,
        nodes: newNodes,
      }));
    },
  };
};
