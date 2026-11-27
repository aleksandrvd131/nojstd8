import { applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import {
  ProjectSession,
  TuringNode,
  TuringEdge,
  StateNodeType,
  OperationalNodeType,
  OperationNodeData,
  SubMachine,
} from '../../types/turing';
import {
  compileOperationalDiagramTo4Tuples,
  compileVTMCode,
} from '../../engine/transpiler';
import { pinnedSide, resolvePorts } from '../../engine/ports';
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
      subMachines: project.subMachines,
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
    subMachines: snapshot.subMachines ?? prev.subMachines,
  };
}

export const createGraphSlice: SliceCreator<GraphSlice> = (set, get) => {
  let pendingDragSnapshot: EditorSnapshot | null = null;
  let lastNodeEditMeta: { id: string; at: number } | null = null;

  return {
    editorUndoStack: [],
    editorRedoStack: [],
    portError: null,

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
        portError: null,
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
        portError: null,
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
      if (
        connection.source === connection.target &&
        connection.sourceHandle &&
        connection.targetHandle &&
        connection.sourceHandle === connection.targetHandle
      ) {
        set({
          portError:
            'Невозможно подключить узел к самому себе через одну и ту же точку. Выберите разные точки.',
        });
        return;
      }
      const project = get().getActiveProject();
      const previous = project.edges.find(
        (e) => e.source === connection.source && e.target === connection.target
      );
      const proposed: TuringEdge = {
        ...connection,
        source: connection.source,
        target: connection.target,
        id: previous?.id ?? 'pending',
        data: {
          ...(previous?.data ?? { mode: project.mode, subMode: project.subMode, rules: [] }),
          ...(connection.sourceHandle ? { sourcePortMode: 'manual' as const } : {}),
          ...(connection.targetHandle ? { targetPortMode: 'manual' as const } : {}),
        },
      };
      const check = resolvePorts(project.nodes, [
        ...project.edges.filter((e) => e !== previous),
        proposed,
      ]);
      if (check.conflicts.has(connection.source) || check.conflicts.has(connection.target)) {
        set({
          portError:
            'Эта точка уже закреплена в другом направлении. Выберите свободную точку или измените подключение.',
        });
        return;
      }
      set({ portError: null });
      get().openRuleModal({
        edgeId: previous?.id,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      });
    },

    reconnectEdge: (edgeId: string, connection: Connection, moved?: 'source' | 'target') => {
      if (!connection.source || !connection.target) return;
      const project = get().getActiveProject();
      const current = project.edges.find((e) => e.id === edgeId);
      if (!current) return;

      const nextSourceHandle =
        moved === 'target' ? pinnedSide(current, 'source') : connection.sourceHandle;
      const nextTargetHandle =
        moved === 'source' ? pinnedSide(current, 'target') : connection.targetHandle;

      if (
        connection.source === connection.target &&
        nextSourceHandle &&
        nextTargetHandle &&
        nextSourceHandle === nextTargetHandle
      ) {
        set({ portError: 'Невозможно совместить вход и выход в одной точке.' });
        return;
      }

      const replacement: TuringEdge = {
        ...current,
        source: connection.source,
        target: connection.target,
        sourceHandle: nextSourceHandle,
        targetHandle: nextTargetHandle,
        data: {
          ...(current.data ?? { mode: project.mode, rules: [] }),
          sourcePortMode:
            moved === 'target'
              ? current.data?.sourcePortMode
              : connection.sourceHandle
              ? 'manual'
              : 'auto',
          targetPortMode:
            moved === 'source'
              ? current.data?.targetPortMode
              : connection.targetHandle
              ? 'manual'
              : 'auto',
        },
      };

      const check = resolvePorts(
        project.nodes,
        project.edges.map((e) => (e.id === edgeId ? replacement : e))
      );
      if (check.conflicts.has(connection.source) || check.conflicts.has(connection.target)) {
        set({ portError: 'Невозможно совместить вход и выход в одной точке.' });
        return;
      }

      get().pushEditorSnapshot();
      set({ portError: null });

      get().updateActiveProject((prev) => {
        const oldEdge = prev.edges.find((edge) => edge.id === edgeId);
        if (!oldEdge) return prev;

        const edges = prev.edges.map((edge) => (edge.id === edgeId ? replacement : edge));
        const rules5 = prev.rules5.map((rule) =>
          rule.fromState === oldEdge.source && rule.toState === oldEdge.target
            ? { ...rule, fromState: connection.source!, toState: connection.target! }
            : rule
        );
        let rules4 = prev.rules4.map((rule) =>
          rule.fromState === oldEdge.source && rule.toState === oldEdge.target
            ? { ...rule, fromState: connection.source!, toState: connection.target! }
            : rule
        );

        if (prev.subMode === 'operational') {
          rules4 = compileOperationalDiagramTo4Tuples(
            prev.nodes,
            edges,
            prev.alphabet,
            prev.subMachines
          );
        }

        return { ...prev, edges, rules5, rules4 };
      });
    },

    addStateNode: (type: StateNodeType, label?: string, position?: { x: number; y: number }) => {
      get().pushEditorSnapshot();
      const project = get().getActiveProject();
      let idx = project.nodes.length;
      let newId = type === 'halt' ? 'q_halt' : `q${idx}`;
      const existingIds = new Set(project.nodes.map((n) => n.id));
      while (existingIds.has(newId)) {
        idx++;
        newId = type === 'halt' ? `q_halt_${idx}` : `q${idx}`;
      }

      const pos = position ?? computeNonOverlappingPosition(project.nodes);
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

    addOperationNode: (
      opType: OperationalNodeType,
      label?: string,
      symbolToWrite?: string,
      position?: { x: number; y: number }
    ) => {
      get().pushEditorSnapshot();
      const project = get().getActiveProject();
      let count = project.nodes.length;
      let newId = `op_${opType.toLowerCase()}_${count}`;
      const existingIds = new Set(project.nodes.map((n) => n.id));
      while (existingIds.has(newId)) {
        count++;
        newId = `op_${opType.toLowerCase()}_${count}`;
      }

      const pos = position ?? computeNonOverlappingPosition(project.nodes);
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

    insertVTMCode: (code: string) => {
      const project = get().getActiveProject();
      if (project.subMode !== 'operational') {
        return false;
      }

      const result = compileVTMCode(code, project.alphabet, {
        idPrefix: `vtm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        functions: project.subMachines,
      });

      if (result.errors.length > 0 || result.parsedOps.length === 0) {
        return false;
      }

      get().pushEditorSnapshot();
      const existingNodes = project.nodes;
      const startX = existingNodes.length
        ? Math.max(...existingNodes.map((n) => n.position.x)) + 220
        : 100;
      const shiftX = startX - 100;

      const insertedNodes = result.nodes.map((node) => ({
        ...node,
        position: { x: node.position.x + shiftX, y: node.position.y },
      }));

      const nodes = [...existingNodes, ...insertedNodes];
      const edges = [...project.edges, ...result.edges];
      const rules4 = compileOperationalDiagramTo4Tuples(
        nodes,
        edges,
        project.alphabet,
        project.subMachines
      );

      get().updateActiveProject((prev) => ({
        ...prev,
        nodes,
        edges,
        rules4,
      }));

      set({
        selectedNodeId: insertedNodes[0]?.id ?? null,
        selectedEdgeId: null,
      });

      return true;
    },

    addProjectFunction: (
      sourceProjectId: string,
      code: string,
      position?: { x: number; y: number },
      insertNode = true
    ) => {
      const { projects, activeProjectId } = get();
      const parent = get().getActiveProject();
      const source = projects.find((candidate) => candidate.id === sourceProjectId);
      const functionCode = code.trim().toUpperCase();

      if (
        !source ||
        source.id === activeProjectId ||
        source.subMode !== 'operational' ||
        !/^[A-Z]$/.test(functionCode) ||
        ['R', 'L'].includes(functionCode) ||
        parent.alphabet.symbols.includes(functionCode) ||
        parent.alphabet.blankSymbol === functionCode ||
        parent.subMachines.some((machine) => machine.code === functionCode) ||
        source.nodes.length === 0
      ) {
        return false;
      }

      get().pushEditorSnapshot();

      const functionId = `function_${source.id}_${Date.now().toString(36)}`;
      const dependencyIds = new Map(source.subMachines.map((machine, index) => [
        machine.id, `${functionId}_dependency_${index}`,
      ]));
      const copyNode = (node: TuringNode): TuringNode => {
        const data = { ...node.data };
        if (typeof data.subMachineId === 'string' && dependencyIds.has(data.subMachineId)) {
          data.subMachineId = dependencyIds.get(data.subMachineId);
        }
        return { ...node, position: { ...node.position }, data };
      };
      const dependencies = source.subMachines.map((machine) => ({
        ...machine,
        id: dependencyIds.get(machine.id)!,
        code: undefined,
        nodes: machine.nodes.map(copyNode),
        edges: machine.edges.map((edge) => ({
          ...edge,
          data: edge.data ? { ...edge.data, rules: edge.data.rules.map((rule) => ({ ...rule })) } : edge.data,
        })),
      }));
      const sourceNodes = source.nodes.map((node) => ({
        ...copyNode(node),
      }));
      const sourceEdges: TuringEdge[] = source.edges.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          mode: edge.data?.mode ?? source.mode,
          subMode: edge.data?.subMode ?? source.subMode,
          rules: [...(edge.data?.rules ?? [])],
        },
      }));
      let startNodeId = sourceNodes.find(
        (node) => (node.data as OperationNodeData).opType === 'START'
      )?.id;
      let finishNodeId = sourceNodes.find(
        (node) => (node.data as OperationNodeData).opType === 'FINISH'
      )?.id;

      if (!startNodeId) {
        startNodeId = `${functionId}_start`;
        sourceNodes.unshift({
          id: startNodeId,
          type: 'operationNode',
          position: { x: 0, y: 0 },
          data: { label: 'START', opType: 'START' },
        });
        const firstNode = source.nodes[0];
        sourceEdges.push({
          id: `${functionId}_entry`,
          source: startNodeId,
          target: firstNode.id,
          sourceHandle: 'right',
          targetHandle: 'left',
          type: 'customTransition',
          data: {
            mode: '4-tuple',
            subMode: 'operational',
            rules: [{ id: `${functionId}_entry_rule`, readSymbol: '*', isWildcard: true }],
          },
        });
      }

      if (!finishNodeId) {
        finishNodeId = `${functionId}_finish`;
        sourceNodes.push({
          id: finishNodeId,
          type: 'operationNode',
          position: { x: 900, y: 0 },
          data: { label: 'FINISH', opType: 'FINISH' },
        });
        const nodesWithOutgoing = new Set(sourceEdges.map((edge) => edge.source));
        const terminalNodes = source.nodes.filter(
          (node) =>
            (node.data as OperationNodeData).opType !== 'FINISH' &&
            !nodesWithOutgoing.has(node.id)
        );
        for (const node of terminalNodes) {
          sourceEdges.push({
            id: `${functionId}_exit_${node.id}`,
            source: node.id,
            target: finishNodeId,
            sourceHandle: 'right',
            targetHandle: 'left',
            type: 'customTransition',
            data: {
              mode: '4-tuple',
              subMode: 'operational',
              rules: [{ id: `${functionId}_exit_rule_${node.id}`, readSymbol: '*', isWildcard: true }],
            },
          });
        }
      }

      const sourceMachine: SubMachine = {
        id: functionId,
        name: source.name,
        code: functionCode,
        description: source.description,
        nodes: sourceNodes,
        edges: sourceEdges,
        rules4: compileOperationalDiagramTo4Tuples(
          sourceNodes,
          sourceEdges,
          source.alphabet,
          dependencies
        ),
      };

      let suffix = parent.nodes.length;
      let nodeId = `op_function_${functionCode}_${suffix}`;
      const existingIds = new Set(parent.nodes.map((node) => node.id));
      while (existingIds.has(nodeId)) nodeId = `op_function_${functionCode}_${++suffix}`;

      const functionNode: TuringNode = {
        id: nodeId,
        type: 'operationNode',
        position: position ?? computeNonOverlappingPosition(parent.nodes),
        data: {
          label: functionCode,
          opType: 'COMPLEX_MACHINE',
          subMachineId: functionId,
          subMachineName: source.name,
          description: `Функция ${functionCode}: ${source.name}`,
        },
      };

      get().updateActiveProject((prev) => ({
        ...prev,
        subMachines: [...prev.subMachines, sourceMachine, ...dependencies],
        nodes: insertNode ? [...prev.nodes, functionNode] : prev.nodes,
      }));
      if (insertNode) set({ selectedNodeId: nodeId, selectedEdgeId: null });
      return true;
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

    deleteGraphElements: (nodeIds, edgeIds) => {
      const project = get().getActiveProject();
      const removedNodes = new Set(nodeIds);
      const removedEdges = project.edges.filter((edge) =>
        edgeIds.includes(edge.id) || removedNodes.has(edge.source) || removedNodes.has(edge.target)
      );
      if (!project.nodes.some((node) => removedNodes.has(node.id)) && removedEdges.length === 0) return;
      get().pushEditorSnapshot();
      const removedEdgeIds = new Set(removedEdges.map((edge) => edge.id));
      const removedRuleIds = new Set(removedEdges.flatMap((edge) => (edge.data?.rules ?? []).map((rule) => rule.id)));
      const removedPairs = new Set(removedEdges.map((edge) => `${edge.source}->${edge.target}`));
      get().updateActiveProject((prev) => {
        const nodes = prev.nodes.filter((node) => !removedNodes.has(node.id));
        const edges = prev.edges.filter((edge) => !removedEdgeIds.has(edge.id));
        const keepRule = (rule: { id: string; fromState: string; toState: string }) =>
          !removedNodes.has(rule.fromState) && !removedNodes.has(rule.toState) &&
          !removedRuleIds.has(rule.id) && !removedPairs.has(`${rule.fromState}->${rule.toState}`);
        return {
          ...prev,
          nodes,
          edges,
          rules5: prev.rules5.filter(keepRule),
          rules4: prev.subMode === 'operational'
            ? compileOperationalDiagramTo4Tuples(nodes, edges, prev.alphabet, prev.subMachines)
            : prev.rules4.filter(keepRule),
        };
      });
      set({
        selectedNodeId: null,
        selectedEdgeId: null,
        runtime: initRuntimeState(get().getActiveProject()),
        isRunning: false,
        portError: null,
      });
    },

    clearCanvas: () => {
      const project = get().getActiveProject();
      if (!project.nodes.length && !project.edges.length && !project.rules4.length && !project.rules5.length) return;
      get().pushEditorSnapshot();
      get().updateActiveProject((prev) => ({ ...prev, nodes: [], edges: [], rules4: [], rules5: [] }));
      set({
        selectedNodeId: null,
        selectedEdgeId: null,
        runtime: initRuntimeState(get().getActiveProject()),
        isRunning: false,
        portError: null,
      });
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
