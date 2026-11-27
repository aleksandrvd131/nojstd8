import {
  ProjectSession,
  ValidationIssue,
  StateNodeData,
  OperationNodeData,
} from '../types/turing';
import { tokenizeTapeInput } from './simulator';

const RESERVED_SYMBOLS = new Set(['L', 'R', 'N', '<', '>', '.']);
const TERMINAL_STATE_TYPES = new Set(['halt', 'accept', 'reject']);

export function validateMachine(session: ProjectSession): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { mode, subMode, nodes, edges, rules5, rules4, alphabet, subMachines } = session;

  // 1. Alphabet Validation
  const seenSymbols = new Set<string>();
  for (const sym of alphabet.symbols) {
    if (sym === alphabet.blankSymbol) {
      issues.push({
        id: `alpha_blank_dup_${sym}`,
        severity: 'error',
        message: `Символ '${sym}' совпадает с пустым символом (blank).`,
      });
    }
    if (RESERVED_SYMBOLS.has(sym)) {
      issues.push({
        id: `alpha_reserved_${sym}`,
        severity: 'error',
        message: `Символ '${sym}' является зарезервированным служебным обозначением (L, R, N, <, >, .).`,
      });
    }
    if (seenSymbols.has(sym)) {
      issues.push({
        id: `alpha_dup_${sym}`,
        severity: 'warning',
        message: `Символ '${sym}' дублируется в алфавите.`,
      });
    }
    seenSymbols.add(sym);
  }

  // 2. Initial / START Node Check
  if (mode === '5-tuple' || (mode === '4-tuple' && subMode === 'state-graph')) {
    const initialNodes = nodes.filter(
      (n) => (n.data as StateNodeData).stateType === 'initial'
    );
    if (initialNodes.length === 0) {
      issues.push({
        id: 'no_initial_state',
        severity: 'error',
        message: 'Отсутствует начальное состояние (initial state). Отметьте одно из состояний как начальное.',
      });
    } else if (initialNodes.length > 1) {
      issues.push({
        id: 'multiple_initial_states',
        severity: 'error',
        message: `Обнаружено ${initialNodes.length} начальных состояний. Должно быть ровно одно.`,
      });
    }

    // Halt / Accept node check
    const haltNodes = nodes.filter((n) => {
      const type = (n.data as StateNodeData).stateType;
      return type === 'halt' || type === 'accept' || type === 'reject';
    });
    if (haltNodes.length === 0) {
      issues.push({
        id: 'no_halt_state',
        severity: 'warning',
        message: 'Не задано ни одного конечного состояния (Halt / Accept / Reject). Машина может зациклиться.',
      });
    }
  } else {
    // Operational diagram mode
    const startNodes = nodes.filter(
      (n) => (n.data as OperationNodeData).opType === 'START'
    );
    if (startNodes.length === 0) {
      issues.push({
        id: 'no_start_op',
        severity: 'error',
        message: 'На операционной диаграмме отсутствует узел START (точка входа).',
      });
    } else if (startNodes.length > 1) {
      issues.push({
        id: 'multiple_start_ops',
        severity: 'error',
        message: `Обнаружено ${startNodes.length} узлов START. На диаграмме должна быть ровно одна точка входа.`,
      });
    }

    const finishNodes = nodes.filter(
      (n) => (n.data as OperationNodeData).opType === 'FINISH'
    );
    if (finishNodes.length === 0) {
      issues.push({
        id: 'no_finish_op',
        severity: 'warning',
        message: 'На операционной диаграмме отсутствует узел FINISH (точка останова).',
      });
    }
  }

  // 2.5. Terminal Nodes Must Not Have Outgoing Transitions
  if (mode === '5-tuple' || (mode === '4-tuple' && subMode === 'state-graph')) {
    const outgoingRules = mode === '5-tuple' ? rules5 : rules4;
    for (const node of nodes) {
      const stateData = node.data as StateNodeData;
      if (!TERMINAL_STATE_TYPES.has(stateData.stateType)) continue;
      const outgoingEdge = edges.find((e) => e.source === node.id);
      const hasOutgoingRule = outgoingRules.some((r) => r.fromState === node.id);
      if (outgoingEdge || hasOutgoingRule) {
        issues.push({
          id: `terminal_outgoing_${node.id}`,
          severity: 'error',
          message: `Из конечного состояния '${stateData.label || node.id}' (${stateData.stateType}) не могут выходить переходы.`,
          nodeId: node.id,
          edgeId: outgoingEdge?.id,
        });
      }
    }
  } else {
    for (const node of nodes) {
      const opData = node.data as OperationNodeData;
      if (opData.opType !== 'FINISH') continue;
      const outgoing = edges.filter((e) => e.source === node.id);
      if (outgoing.length > 0) {
        issues.push({
          id: `finish_outgoing_${node.id}`,
          severity: 'error',
          message: `Из конечного узла FINISH ('${opData.label || node.id}') не могут выходить переходы.`,
          nodeId: node.id,
          edgeId: outgoing[0].id,
        });
      }
    }
  }

  // 3. Determinism Check
  if (mode === '5-tuple') {
    const ruleKeys = new Map<string, string[]>();
    for (const r of rules5) {
      const key = `${r.fromState}:::${r.readSymbol}`;
      const existing = ruleKeys.get(key) || [];
      existing.push(r.id);
      ruleKeys.set(key, existing);
    }
    for (const [key, ids] of ruleKeys.entries()) {
      if (ids.length > 1) {
        const [from, sym] = key.split(':::');
        issues.push({
          id: `non_det_${key}`,
          severity: 'error',
          message: `Нарушение детерминированности: из состояния '${from}' задано ${ids.length} перехода(ов) по символу '${sym}'.`,
          nodeId: from,
        });
      }
    }
  } else if (mode === '4-tuple' && subMode === 'state-graph') {
    const ruleKeys = new Map<string, string[]>();
    for (const r of rules4) {
      const key = `${r.fromState}:::${r.readSymbol}`;
      const existing = ruleKeys.get(key) || [];
      existing.push(r.id);
      ruleKeys.set(key, existing);
    }
    for (const [key, ids] of ruleKeys.entries()) {
      if (ids.length > 1) {
        const [from, sym] = key.split(':::');
        issues.push({
          id: `non_det_${key}`,
          severity: 'error',
          message: `Нарушение детерминированности: из состояния '${from}' задано ${ids.length} перехода(ов) по символу '${sym}'.`,
          nodeId: from,
        });
      }
    }
  } else {
    // Operational diagram determinism
    for (const node of nodes) {
      const outgoing = edges.filter((e) => e.source === node.id);
      const conditionMap = new Map<string, number>();
      for (const e of outgoing) {
        for (const r of e.data?.rules || []) {
          const isWild =
            r.isWildcard === true || (r.isWildcard === undefined && !r.isComplement && r.readSymbol === '*');
          const key = isWild ? '*' : r.isComplement ? `¬${r.readSymbol}` : r.readSymbol;
          conditionMap.set(key, (conditionMap.get(key) || 0) + 1);
        }
      }
      for (const [cond, count] of conditionMap.entries()) {
        if (count > 1) {
          issues.push({
            id: `non_det_op_${node.id}_${cond}`,
            severity: 'error',
            message: `Из узла '${node.id}' выходит ${count} ветвления по условию '${cond}'.`,
            nodeId: node.id,
          });
        }
      }

      // Check overlapping complement (¬a vs ¬b) across different outgoing edges
      const complementEdges = outgoing
        .map((e) => ({
          edgeId: e.id,
          syms: (e.data?.rules || []).filter((r) => !!r.isComplement).map((r) => r.readSymbol),
        }))
        .filter((item) => item.syms.length > 0);
      if (complementEdges.length > 1) {
        const distinctComps = new Set(complementEdges.flatMap((c) => c.syms));
        if (distinctComps.size > 1) {
          issues.push({
            id: `overlap_complement_${node.id}`,
            severity: 'warning',
            message: `У узла '${node.data.label || node.id}' несколько рёбер с условием '¬' (${Array.from(distinctComps).map((s) => `¬${s}`).join(', ')}) — они пересекаются на остальных символах.`,
            nodeId: node.id,
          });
        }
      }
    }
  }

  // 4. Isolated / BFS Reachability Check
  const initialNodes = nodes.filter((n) =>
    mode === '5-tuple' || subMode === 'state-graph'
      ? (n.data as StateNodeData).stateType === 'initial'
      : (n.data as OperationNodeData).opType === 'START'
  );

  const reachableNodeIds = new Set<string>();
  if (initialNodes.length > 0) {
    const queue: string[] = [];
    for (const initNode of initialNodes) {
      reachableNodeIds.add(initNode.id);
      queue.push(initNode.id);
    }

    // Build adjacency list from edges and rules
    const adj = new Map<string, Set<string>>();
    for (const edge of edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, new Set());
      adj.get(edge.source)!.add(edge.target);
    }
    if (mode === '5-tuple') {
      for (const r of rules5) {
        if (!adj.has(r.fromState)) adj.set(r.fromState, new Set());
        adj.get(r.fromState)!.add(r.toState);
      }
    } else if (mode === '4-tuple' && subMode === 'state-graph') {
      for (const r of rules4) {
        if (!adj.has(r.fromState)) adj.set(r.fromState, new Set());
        adj.get(r.fromState)!.add(r.toState);
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const neighbors = adj.get(curr);
      if (neighbors) {
        for (const nextId of neighbors) {
          if (!reachableNodeIds.has(nextId)) {
            reachableNodeIds.add(nextId);
            queue.push(nextId);
          }
        }
      }
    }
  }

  for (const node of nodes) {
    const isInitial =
      mode === '5-tuple' || subMode === 'state-graph'
        ? (node.data as StateNodeData).stateType === 'initial'
        : (node.data as OperationNodeData).opType === 'START';

    const incoming = edges.some((e) => e.target === node.id);
    const outgoing = edges.some((e) => e.source === node.id);

    if (!incoming && !outgoing) {
      issues.push({
        id: `isolated_${node.id}`,
        severity: 'warning',
        message: `Узел '${node.data.label || node.id}' полностью изолирован (нет входящих и исходящих связей).`,
        nodeId: node.id,
      });
    } else if (!isInitial && initialNodes.length > 0 && !reachableNodeIds.has(node.id)) {
      issues.push({
        id: `unreachable_${node.id}`,
        severity: 'info',
        message: `Узел '${node.data.label || node.id}' недостижим из начального состояния.`,
        nodeId: node.id,
      });
    }
  }

  // 5. Complex Sub-machine Integrity Check
  for (const node of nodes) {
    const opData = node.data as OperationNodeData;
    if (opData.opType === 'COMPLEX_MACHINE') {
      if (!opData.subMachineId) {
        issues.push({
          id: `missing_submachine_${node.id}`,
          severity: 'error',
          message: `Вложенный блок '${opData.label}' не привязан к подмашине.`,
          nodeId: node.id,
        });
      } else {
        const found = subMachines.find((sm) => sm.id === opData.subMachineId);
        if (!found) {
          issues.push({
            id: `submachine_not_found_${node.id}`,
            severity: 'error',
            message: `Подмашина с ID '${opData.subMachineId}' не найдена в проекте.`,
            nodeId: node.id,
          });
        } else {
          const hasStart = found.nodes.some((sn) => (sn.data as OperationNodeData).opType === 'START');
          if (!hasStart) {
            issues.push({
              id: `submachine_no_start_${node.id}`,
              severity: 'error',
              message: `В подмашине '${found.name}' отсутствует узел START.`,
              nodeId: node.id,
            });
          }
          const hasFinish = found.nodes.some((sn) => (sn.data as OperationNodeData).opType === 'FINISH');
          if (!hasFinish) {
            issues.push({
              id: `submachine_no_finish_${node.id}`,
              severity: 'warning',
              message: `В подмашине '${found.name}' отсутствует узел FINISH.`,
              nodeId: node.id,
            });
          }
          const finishWithOutgoing = found.nodes.some(
            (sn) =>
              (sn.data as OperationNodeData).opType === 'FINISH' &&
              (found.edges || []).some((se) => se.source === sn.id)
          );
          if (finishWithOutgoing) {
            issues.push({
              id: `submachine_finish_outgoing_${node.id}`,
              severity: 'error',
              message: `В подмашине '${found.name}' из узла FINISH выходят переходы.`,
              nodeId: node.id,
            });
          }
        }
      }
    }
  }

  // 6. Completeness Check (missing transitions for alphabet symbols)
  const allSymbols = [...alphabet.symbols, alphabet.blankSymbol];
  if (mode === '5-tuple' || (mode === '4-tuple' && subMode === 'state-graph')) {
    for (const node of nodes) {
      const stateData = node.data as StateNodeData;
      if (
        stateData.stateType === 'halt' ||
        stateData.stateType === 'accept' ||
        stateData.stateType === 'reject'
      ) {
        continue;
      }

      const coveredSymbols = new Set<string>();
      if (mode === '5-tuple') {
        for (const r of rules5) {
          if (r.fromState === node.id) {
            coveredSymbols.add(r.readSymbol);
          }
        }
      } else {
        for (const r of rules4) {
          if (r.fromState === node.id) {
            coveredSymbols.add(r.readSymbol);
          }
        }
      }

      const missing = allSymbols.filter((s) => !coveredSymbols.has(s));
      if (missing.length > 0) {
        issues.push({
          id: `incomplete_${node.id}`,
          severity: 'warning',
          message: `Состояние '${stateData.label || node.id}' не содержит правил для символов: ${missing.join(', ')}.`,
          nodeId: node.id,
        });
      }
    }
  } else {
    // Operational diagram completeness
    for (const node of nodes) {
      const opData = node.data as OperationNodeData;
      if (
        opData.opType === 'FINISH' ||
        opData.opType === 'SEARCH_L' ||
        opData.opType === 'SEARCH_R'
      ) {
        continue;
      }
      const outgoing = edges.filter((e) => e.source === node.id);
      const hasWildcard = outgoing.some((e) =>
        e.data?.rules?.some(
          (r) => r.isWildcard === true || (r.isWildcard === undefined && !r.isComplement && r.readSymbol === '*')
        )
      );
      if (hasWildcard) continue;

      const coveredSymbols = new Set<string>();
      for (const e of outgoing) {
        for (const r of e.data?.rules || []) {
          if (r.isComplement) {
            for (const s of allSymbols) {
              if (s !== r.readSymbol) coveredSymbols.add(s);
            }
          } else {
            coveredSymbols.add(r.readSymbol);
          }
        }
      }

        const missing = allSymbols.filter((s) => !coveredSymbols.has(s));
      if (missing.length > 0) {
        issues.push({
          id: `incomplete_op_${node.id}`,
          severity: 'warning',
          message: `Узел '${opData.label || node.id}' не имеет переходов для символов: ${missing.join(', ')}.`,
          nodeId: node.id,
        });
      }
    }
  }

  // 7. Sub-machine call cycle detection
  if (subMachines && subMachines.length > 0) {
    const subAdj = new Map<string, string[]>();
    for (const sm of subMachines) {
      const callees = sm.nodes
        .map((n) => (n.data as OperationNodeData).subMachineId)
        .filter((id): id is string => !!id);
      subAdj.set(sm.id, callees);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const hasCycle = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      for (const nextId of subAdj.get(id) || []) {
        if (hasCycle(nextId)) return true;
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };

    for (const sm of subMachines) {
      if (hasCycle(sm.id)) {
        issues.push({
          id: `submachine_cycle_${sm.id}`,
          severity: 'error',
          message: `Обнаружена циклическая рекурсия в подмашине '${sm.name}'.`,
        });
        break;
      }
    }
  }

  // 8. Tape & test case symbol check against current alphabet
  const knownSymbolSet = new Set(allSymbols);
  const invalidTapeSymbols = new Set<string>();
  for (const sym of Object.values(session.initialTape || {})) {
    if (!knownSymbolSet.has(sym)) {
      invalidTapeSymbols.add(sym);
    }
  }
  if (invalidTapeSymbols.size > 0) {
    issues.push({
      id: 'unknown_initial_tape_symbols',
      severity: 'warning',
      message: `На начальной ленте есть символы вне алфавита: ${Array.from(invalidTapeSymbols).join(', ')}.`,
    });
  }

  for (const tc of session.testCases || []) {
    const tokens = tokenizeTapeInput(tc.inputTape, alphabet);
    const unknown = Array.from(new Set(tokens.filter((t) => !knownSymbolSet.has(t))));
    if (unknown.length > 0) {
      issues.push({
        id: `unknown_test_symbols_${tc.id}`,
        severity: 'warning',
        message: `В тесте '${tc.name}' есть символы вне алфавита: ${unknown.join(', ')}.`,
      });
    }
  }

  return issues;
}
