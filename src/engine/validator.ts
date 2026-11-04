import {
  ProjectSession,
  ValidationIssue,
  StateNodeData,
  OperationNodeData,
} from '../types/turing';

const RESERVED_SYMBOLS = new Set(['L', 'R', 'N', '<', '>', '.']);

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
      const symbolMap = new Map<string, number>();
      for (const e of outgoing) {
        for (const r of e.data?.rules || []) {
          const sym = r.readSymbol;
          symbolMap.set(sym, (symbolMap.get(sym) || 0) + 1);
        }
      }
      for (const [sym, count] of symbolMap.entries()) {
        if (count > 1) {
          issues.push({
            id: `non_det_op_${node.id}_${sym}`,
            severity: 'error',
            message: `Из узла '${node.id}' выходит ${count} ветвления по символу '${sym}'.`,
            nodeId: node.id,
          });
        }
      }
    }
  }

  // 4. Isolated / Dangling Nodes Check
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
    } else if (!incoming && !isInitial) {
      issues.push({
        id: `unreachable_${node.id}`,
        severity: 'info',
        message: `Узел '${node.data.label || node.id}' недостижим из начального состояния (нет входящих стрелок).`,
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
        }
      }
    }
  }

  return issues;
}
