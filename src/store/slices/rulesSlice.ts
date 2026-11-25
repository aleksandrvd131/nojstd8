import {
  ProjectSession,
  TuringMode,
  FourTupleSubMode,
  BlankSymbolType,
  FiveTupleRule,
  FourTupleRule,
  TuringNode,
  TuringEdge,
  OperationNodeData,
} from '../../types/turing';
import { initRuntimeState } from '../../engine/simulator';
import {
  convert5TupleTo4Tuple,
  convert4TupleTo5Tuple,
  compileOperationalDiagramTo4Tuples,
  buildEdgesFromRules,
} from '../../engine/transpiler';
import { convertOperationNodesToStateNodes } from '../../utils/autoLayout';
import { RulesSlice, SliceCreator } from '../types';

export const ALPHABET_PRESETS: Record<string, { name: string; symbols: string[]; blank: BlankSymbolType }> = {
  binary: {
    name: 'Бинарный',
    symbols: ['0', '1'],
    blank: '_',
  },
  unary: {
    name: 'Унарный с маркерами',
    symbols: ['1', '*', 'x', '='],
    blank: '_',
  },
  decimal: {
    name: 'Десятичный',
    symbols: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    blank: '_',
  },
  hexadecimal: {
    name: 'Шестнадцатеричный',
    symbols: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'],
    blank: '_',
  },
  symbolic: {
    name: 'Символьно-логический',
    symbols: ['a', 'b', 'c', '#', '$', 'T', 'F'],
    blank: '_',
  },
};

export const createRulesSlice: SliceCreator<RulesSlice> = (set, get) => ({
  setMode: (newMode: TuringMode) => {
    const project = get().getActiveProject();
    if (project.mode === newMode) return;
    get().pushEditorSnapshot();

    let updatedProject: ProjectSession;
    if (newMode === '4-tuple') {
      const existingIds = new Set(project.nodes.map((n) => n.id));
      const { rules4, auxiliaryNodes } = convert5TupleTo4Tuple(project.rules5, existingIds);
      const auxTuringNodes: TuringNode[] = auxiliaryNodes.map((aux, idx) => ({
        id: aux.id,
        type: 'stateNode',
        position: { x: 250 + idx * 80, y: 300 },
        data: { label: aux.label, stateType: 'normal' },
      }));

      const allNodes = [...project.nodes, ...auxTuringNodes];
      const newEdges = buildEdgesFromRules(rules4, '4-tuple', 'state-graph', project.edges);

      updatedProject = {
        ...project,
        mode: '4-tuple',
        subMode: 'state-graph',
        nodes: allNodes,
        edges: newEdges,
        rules4,
      };
    } else {
      const sourceRules4 =
        project.subMode === 'operational'
          ? compileOperationalDiagramTo4Tuples(
              project.nodes,
              project.edges,
              project.alphabet,
              project.subMachines
            )
          : project.rules4;
      const rules5 = convert4TupleTo5Tuple(sourceRules4);
      const stateNodes = convertOperationNodesToStateNodes(project.nodes);
      const newEdges = buildEdgesFromRules(rules5, '5-tuple', 'state-graph', project.edges);

      updatedProject = {
        ...project,
        mode: '5-tuple',
        subMode: 'state-graph',
        nodes: stateNodes,
        edges: newEdges,
        rules4: sourceRules4,
        rules5,
      };
    }

    get().updateActiveProject(() => updatedProject);
    set({ runtime: initRuntimeState(updatedProject), isRunning: false });
  },

  setSubMode: (newSubMode: FourTupleSubMode, force = false) => {
    const project = get().getActiveProject();
    if (project.mode !== '4-tuple' || project.subMode === newSubMode) return;

    let updatedProject: ProjectSession;
    if (newSubMode === 'operational') {
      const hasUserContent =
        project.nodes.some((n) => n.type === 'stateNode') ||
        project.rules4.length > 0 ||
        project.rules5.length > 0;

      if (hasUserContent && !force && typeof window !== 'undefined') {
        get().openConfirmModal({
          title: 'Переключение в режим VTM',
          message:
            'Переключение в режим операционной диаграммы (VTM) заменит текущий граф состояний на схему VTM. Продолжить?',
          confirmLabel: 'Переключить',
          onConfirm: () => get().setSubMode('operational', true),
        });
        return;
      }

      get().pushEditorSnapshot();

      const existingOpNodes = project.nodes.filter((n) => n.type === 'operationNode');
      if (existingOpNodes.length >= 2 && existingOpNodes.some((n) => (n.data as OperationNodeData).opType === 'START')) {
        const rules4 = compileOperationalDiagramTo4Tuples(
          project.nodes,
          project.edges,
          project.alphabet,
          project.subMachines
        );
        updatedProject = {
          ...project,
          subMode: 'operational',
          rules4,
        };
      } else {
        const defaultTemplateEdges: TuringEdge[] = [
          {
            id: 'e_start_r',
            source: 'op_start',
            target: 'op_step_r',
            type: 'customTransition',
            data: {
              mode: '4-tuple',
              subMode: 'operational',
              rules: [{ id: 'r_start', readSymbol: '*', isWildcard: true }],
            },
          },
          {
            id: 'e_r_finish',
            source: 'op_step_r',
            target: 'op_finish',
            type: 'customTransition',
            data: {
              mode: '4-tuple',
              subMode: 'operational',
              rules: [{ id: 'r_fin', readSymbol: project.alphabet.blankSymbol }],
            },
          },
        ];

        const defaultTemplateNodes: TuringNode[] = [
          {
            id: 'op_start',
            type: 'operationNode',
            position: { x: 120, y: 150 },
            data: { label: 'START', opType: 'START' },
          },
          {
            id: 'op_step_r',
            type: 'operationNode',
            position: { x: 300, y: 150 },
            data: { label: 'r', opType: 'SHIFT_R' },
          },
          {
            id: 'op_finish',
            type: 'operationNode',
            position: { x: 500, y: 150 },
            data: { label: 'FINISH', opType: 'FINISH' },
          },
        ];

        const compiledRules = compileOperationalDiagramTo4Tuples(
          defaultTemplateNodes,
          defaultTemplateEdges,
          project.alphabet
        );

        updatedProject = {
          ...project,
          subMode: 'operational',
          nodes: defaultTemplateNodes,
          edges: defaultTemplateEdges,
          rules4: compiledRules,
        };
      }
    } else {
      get().pushEditorSnapshot();
      const compiledRules = compileOperationalDiagramTo4Tuples(
        project.nodes,
        project.edges,
        project.alphabet,
        project.subMachines
      );
      const edges = buildEdgesFromRules(compiledRules, '4-tuple', 'state-graph', project.edges);
      const stateNodes = convertOperationNodesToStateNodes(project.nodes);

      updatedProject = {
        ...project,
        subMode: 'state-graph',
        nodes: stateNodes,
        rules4: compiledRules,
        edges,
      };
    }

    get().updateActiveProject(() => updatedProject);
    set({ runtime: initRuntimeState(updatedProject), isRunning: false });
  },

  switchMode: (targetMode: TuringMode, targetSubMode: FourTupleSubMode = 'state-graph', force = false) => {
    const project = get().getActiveProject();
    if (targetMode === '5-tuple') {
      get().setMode('5-tuple');
      return;
    }

    if (project.mode === '5-tuple') {
      if (targetSubMode === 'operational') {
        const hasUserContent =
          project.nodes.some((n) => n.type === 'stateNode') ||
          project.rules5.length > 0;
        if (hasUserContent && !force && typeof window !== 'undefined') {
          get().openConfirmModal({
            title: 'Переключение в режим VTM',
            message:
              'Переключение в режим операционной диаграммы (VTM) заменит текущий граф состояний на схему VTM. Продолжить?',
            confirmLabel: 'Переключить',
            onConfirm: () => get().switchMode('4-tuple', 'operational', true),
          });
          return;
        }
        get().pushEditorSnapshot();
        get().updateActiveProject((prev) => ({
          ...prev,
          mode: '4-tuple',
          subMode: 'state-graph',
        }));
        get().setSubMode('operational', true);
      } else {
        get().setMode('4-tuple');
      }
      return;
    }

    get().setSubMode(targetSubMode, force);
  },

  setAlphabetSymbols: (symbols: string[]) => {
    get().pushEditorSnapshot();
    get().updateActiveProject((prev) => ({
      ...prev,
      alphabet: { ...prev.alphabet, symbols },
    }));
  },

  setBlankSymbol: (blankSymbol: BlankSymbolType) => {
    get().pushEditorSnapshot();
    get().updateActiveProject((prev) => ({
      ...prev,
      alphabet: { ...prev.alphabet, blankSymbol },
    }));
  },

  applyAlphabetPreset: (presetKey: string) => {
    const preset = ALPHABET_PRESETS[presetKey];
    if (!preset) return;
    get().pushEditorSnapshot();
    get().updateActiveProject((prev) => ({
      ...prev,
      alphabet: {
        symbols: [...preset.symbols],
        blankSymbol: preset.blank,
      },
    }));
  },

  refactorSymbol: (oldSymbol: string, newSymbol: string) => {
    if (!oldSymbol || !newSymbol || oldSymbol === newSymbol) return;
    const current = get().getActiveProject();
    if (
      current.alphabet.symbols.includes(newSymbol) ||
      current.alphabet.blankSymbol === newSymbol
    ) {
      return;
    }

    get().pushEditorSnapshot();
    get().updateActiveProject((prev) => {
      const symbols = prev.alphabet.symbols.map((s) => (s === oldSymbol ? newSymbol : s));
      const blankSymbol =
        prev.alphabet.blankSymbol === oldSymbol
          ? (newSymbol as BlankSymbolType)
          : prev.alphabet.blankSymbol;

      const nodes = prev.nodes.map((node) => {
        if (node.type === 'operationNode') {
          const opData = node.data as OperationNodeData;
          if (opData.opType === 'WRITE_SYM' && opData.symbolToWrite === oldSymbol) {
            const updatedLabel =
              opData.label === `[${oldSymbol}]` || opData.label === oldSymbol
                ? `[${newSymbol}]`
                : opData.label;
            return {
              ...node,
              data: {
                ...opData,
                symbolToWrite: newSymbol,
                label: updatedLabel,
              },
            };
          }
        }
        return node;
      });

      const rules5 = prev.rules5.map((r) => ({
        ...r,
        readSymbol: r.readSymbol === oldSymbol ? newSymbol : r.readSymbol,
        writeSymbol: r.writeSymbol === oldSymbol ? newSymbol : r.writeSymbol,
      }));

      let rules4 = prev.rules4.map((r) => ({
        ...r,
        readSymbol: r.readSymbol === oldSymbol ? newSymbol : r.readSymbol,
        command: r.command === oldSymbol ? newSymbol : r.command,
      }));

      const edges = prev.edges.map((e) => ({
        ...e,
        data: {
          ...e.data,
          mode: e.data?.mode || prev.mode,
          subMode: e.data?.subMode || prev.subMode,
          rules: (e.data?.rules || []).map((r) => ({
            ...r,
            readSymbol: r.readSymbol === oldSymbol ? newSymbol : r.readSymbol,
            writeSymbol: r.writeSymbol === oldSymbol ? newSymbol : r.writeSymbol,
            command: r.command === oldSymbol ? newSymbol : r.command,
          })),
        },
      }));

      if (prev.subMode === 'operational') {
        rules4 = compileOperationalDiagramTo4Tuples(nodes, edges, { symbols, blankSymbol });
      }

      const initialTape: Record<number, string> = {};
      for (const [pos, val] of Object.entries(prev.initialTape)) {
        initialTape[Number(pos)] = val === oldSymbol ? newSymbol : val;
      }

      const testCases = prev.testCases.map((tc) => ({
        ...tc,
        inputTape: tc.inputTape.split(oldSymbol).join(newSymbol),
        expectedTape: tc.expectedTape
          ? tc.expectedTape.split(oldSymbol).join(newSymbol)
          : undefined,
      }));

      const subMachines = (prev.subMachines || []).map((sm) => ({
        ...sm,
        nodes: sm.nodes.map((node) => {
          if (node.type === 'operationNode') {
            const opData = node.data as OperationNodeData;
            if (opData.opType === 'WRITE_SYM' && opData.symbolToWrite === oldSymbol) {
              return {
                ...node,
                data: {
                  ...opData,
                  symbolToWrite: newSymbol,
                  label: opData.label === `[${oldSymbol}]` ? `[${newSymbol}]` : opData.label,
                },
              };
            }
          }
          return node;
        }),
        rules4: (sm.rules4 || []).map((r) => ({
          ...r,
          readSymbol: r.readSymbol === oldSymbol ? newSymbol : r.readSymbol,
          command: r.command === oldSymbol ? newSymbol : r.command,
        })),
        edges: (sm.edges || []).map((e) => ({
          ...e,
          data: {
            ...e.data,
            mode: e.data?.mode || prev.mode,
            subMode: e.data?.subMode || prev.subMode,
            rules: (e.data?.rules || []).map((r) => ({
              ...r,
              readSymbol: r.readSymbol === oldSymbol ? newSymbol : r.readSymbol,
              writeSymbol: r.writeSymbol === oldSymbol ? newSymbol : r.writeSymbol,
              command: r.command === oldSymbol ? newSymbol : r.command,
            })),
          },
        })),
      }));

      return {
        ...prev,
        alphabet: { symbols, blankSymbol },
        nodes,
        rules5,
        rules4,
        edges,
        initialTape,
        testCases,
        subMachines,
      };
    });

    const active = get().getActiveProject();
    set({ runtime: initRuntimeState(active), isRunning: false });
  },

  addFiveTupleRule: (rule) => {
    get().pushEditorSnapshot();
    const newRule: FiveTupleRule = {
      ...rule,
      id: `r5_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    get().updateActiveProject((prev) => {
      const rules5 = [...prev.rules5, newRule];
      const edges = buildEdgesFromRules(rules5, '5-tuple', 'state-graph', prev.edges);
      return { ...prev, rules5, edges };
    });
  },

  updateFiveTupleRule: (id, partial) => {
    get().pushEditorSnapshot();
    get().updateActiveProject((prev) => {
      const rules5 = prev.rules5.map((r) => (r.id === id ? { ...r, ...partial } : r));
      const edges = buildEdgesFromRules(rules5, '5-tuple', 'state-graph', prev.edges);
      return { ...prev, rules5, edges };
    });
  },

  deleteFiveTupleRule: (id) => {
    get().pushEditorSnapshot();
    get().updateActiveProject((prev) => {
      const rules5 = prev.rules5.filter((r) => r.id !== id);
      const edges = buildEdgesFromRules(rules5, '5-tuple', 'state-graph', prev.edges);
      return { ...prev, rules5, edges };
    });
  },

  addFourTupleRule: (rule) => {
    get().pushEditorSnapshot();
    const newRule: FourTupleRule = {
      ...rule,
      id: `r4_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    get().updateActiveProject((prev) => {
      const rules4 = [...prev.rules4, newRule];
      const edges = buildEdgesFromRules(rules4, '4-tuple', prev.subMode, prev.edges);
      return { ...prev, rules4, edges };
    });
  },

  updateFourTupleRule: (id, partial) => {
    get().pushEditorSnapshot();
    get().updateActiveProject((prev) => {
      const rules4 = prev.rules4.map((r) => (r.id === id ? { ...r, ...partial } : r));
      const edges = buildEdgesFromRules(rules4, '4-tuple', prev.subMode, prev.edges);
      return { ...prev, rules4, edges };
    });
  },

  deleteFourTupleRule: (id) => {
    get().pushEditorSnapshot();
    get().updateActiveProject((prev) => {
      if (prev.subMode === 'operational') {
        const newEdges: TuringEdge[] = prev.edges.map((e) => {
          const rules = e.data?.rules || [];
          if (rules.some((r) => r.id === id)) {
            return {
              ...e,
              data: {
                ...e.data,
                mode: e.data?.mode ?? prev.mode,
                rules: rules.filter((r) => r.id !== id),
              },
            };
          }
          return e;
        });
        const rules4 = compileOperationalDiagramTo4Tuples(
          prev.nodes,
          newEdges,
          prev.alphabet,
          prev.subMachines
        );
        return {
          ...prev,
          edges: newEdges,
          rules4,
        };
      }

      const rules4 = prev.rules4.filter((r) => r.id !== id);
      const edges = buildEdgesFromRules(rules4, '4-tuple', prev.subMode, prev.edges);
      return { ...prev, rules4, edges };
    });
  },

  deleteEdgeRule: (edgeId: string, ruleId: string) => {
    get().pushEditorSnapshot();
    get().updateActiveProject((prev) => {
      const newEdges: TuringEdge[] = prev.edges.map((e) => {
        if (e.id === edgeId || (e.data?.rules || []).some((r) => r.id === ruleId)) {
          const rules = (e.data?.rules || []).filter((r) => r.id !== ruleId);
          return {
            ...e,
            data: {
              ...e.data,
              mode: e.data?.mode ?? prev.mode,
              rules,
            },
          };
        }
        return e;
      });

      const rules5 = prev.rules5.filter((r) => r.id !== ruleId);
      let rules4 = prev.rules4.filter((r) => r.id !== ruleId);

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

  upsertOperationalEdgeRule: ({
    edgeId: providedEdgeId,
    sourceNodeId,
    targetNodeId,
    sourceHandle,
    targetHandle,
    ruleId,
    readSymbol,
    isWildcard,
    isComplement,
  }) => {
    get().pushEditorSnapshot();
    get().updateActiveProject((prev) => {
      const matchedEdge = prev.edges.find(
        (e) =>
          (providedEdgeId && e.id === providedEdgeId) ||
          (e.source === sourceNodeId && e.target === targetNodeId)
      );
      const edgeId = matchedEdge?.id || providedEdgeId || `edge_${sourceNodeId}_${targetNodeId}`;

      const newRuleItem = {
        id: ruleId || `r_op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        readSymbol: isWildcard ? '*' : readSymbol,
        isWildcard,
        isComplement,
      };

      const isSelfLoop = sourceNodeId === targetNodeId;
      const hasReverse =
        !isSelfLoop &&
        prev.edges.some((e) => e.source === targetNodeId && e.target === sourceNodeId);

      let updatedEdges: TuringEdge[];
      if (matchedEdge) {
        updatedEdges = prev.edges.map((e) => {
          if (e.id === matchedEdge.id) {
            const rules = e.data?.rules || [];
            const updatedRules = ruleId
              ? rules.map((r) => (r.id === ruleId ? newRuleItem : r))
              : [...rules, newRuleItem];
            return {
              ...e,
              data: {
                ...e.data,
                mode: e.data?.mode || prev.mode,
                subMode: e.data?.subMode || prev.subMode,
                rules: updatedRules,
              },
            };
          }
          return e;
        });
      } else {
        const newEdge: TuringEdge = {
          id: edgeId,
          source: sourceNodeId,
          target: targetNodeId,
          ...(sourceHandle ? { sourceHandle } : {}),
          ...(targetHandle ? { targetHandle } : {}),
          type: 'customTransition',
          data: {
            mode: prev.mode,
            subMode: prev.subMode,
            isBiDirectional: hasReverse,
            rules: [newRuleItem],
          },
        };
        updatedEdges = prev.edges.map((e) =>
          !isSelfLoop && e.source === targetNodeId && e.target === sourceNodeId
            ? {
                ...e,
                data: {
                  ...e.data,
                  mode: e.data?.mode || prev.mode,
                  rules: e.data?.rules || [],
                  isBiDirectional: true,
                },
              }
            : e
        );
        updatedEdges.push(newEdge);
      }

      const compiledRules4 = compileOperationalDiagramTo4Tuples(
        prev.nodes,
        updatedEdges,
        prev.alphabet,
        prev.subMachines
      );

      return {
        ...prev,
        edges: updatedEdges,
        rules4: compiledRules4,
      };
    });
  },
});
