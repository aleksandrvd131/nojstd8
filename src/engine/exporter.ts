import {
  ProjectSession,
  StateNodeData,
  OperationNodeData,
  EdgeRuleItem,
  TuringMode,
  FourTupleSubMode,
  TuringNode,
  operationRepeatCount,
} from '../types/turing';
import { compileOperationalDiagramTo4Tuples } from './transpiler';

function nodeLabel(node: TuringNode): string {
  const data = node.data as Partial<OperationNodeData>;
  const count = data.opType && data.opType !== 'START' && data.opType !== 'FINISH'
    ? operationRepeatCount(data.repeatCount) : 1;
  const superscript = (n: number) => String(n).replace(/\d/g, digit => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)]);
  return `${node.data.label || node.id}${count > 1 ? superscript(count) : ''}`;
}

function latexNodeLabel(node: TuringNode, inMath = false): string {
  const data = node.data as Partial<OperationNodeData>;
  const count = data.opType && data.opType !== 'START' && data.opType !== 'FINISH'
    ? operationRepeatCount(data.repeatCount) : 1;
  return `${escapeLatex(String(node.data.label || node.id))}${count > 1 ? inMath ? `^{${count}}` : `$^{${count}}$` : ''}`;
}
/**
 * Export project to JSON string
 */
export function exportProjectToJSON(project: ProjectSession): string {
  return JSON.stringify(project, null, 2);
}

/**
 * Parse project from JSON string
 */
export function importProjectFromJSON(jsonString: string): ProjectSession {
  const parsed = JSON.parse(jsonString) as Partial<ProjectSession>;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !parsed.id ||
    !parsed.mode ||
    !parsed.alphabet ||
    !Array.isArray(parsed.alphabet.symbols) ||
    !Array.isArray(parsed.nodes) ||
    !Array.isArray(parsed.edges)
  ) {
    throw new Error('Некорректный формат файла проекта Машины Тьюринга.');
  }
  return {
    ...parsed,
    subMode: parsed.subMode || 'state-graph',
    rules5: Array.isArray(parsed.rules5) ? parsed.rules5 : [],
    rules4: Array.isArray(parsed.rules4) ? parsed.rules4 : [],
    subMachines: Array.isArray(parsed.subMachines) ? parsed.subMachines : [],
    initialTape: parsed.initialTape && typeof parsed.initialTape === 'object' ? parsed.initialTape : {},
    initialHeadPosition: typeof parsed.initialHeadPosition === 'number' ? parsed.initialHeadPosition : 0,
    testCases: Array.isArray(parsed.testCases) ? parsed.testCases : [],
    description: parsed.description || '',
    name: parsed.name || 'Импортированный проект',
    createdAt: parsed.createdAt || Date.now(),
    updatedAt: parsed.updatedAt || Date.now(),
  } as ProjectSession;
}

/**
 * Escape LaTeX special characters (#, $, _, %, &, {, })
 */
export function escapeLatex(text: string): string {
  if (!text) return '';
  return text.replace(/[\\#$_%&{}]/g, (char) => {
    switch (char) {
      case '\\': return '\\textbackslash{}';
      case '#': return '\\#';
      case '$': return '\\$';
      case '_': return '\\_';
      case '%': return '\\%';
      case '&': return '\\&';
      case '{': return '\\{';
      case '}': return '\\}';
      default: return char;
    }
  });
}

function formatRuleCondition(
  r: EdgeRuleItem,
  mode: TuringMode,
  subMode?: FourTupleSubMode
): string {
  if (mode === '5-tuple') {
    return `${r.readSymbol} -> ${r.writeSymbol ?? r.readSymbol}, ${r.move ?? 'N'}`;
  }
  if (subMode === 'operational') {
    const isWild =
      r.isWildcard === true ||
      (r.isWildcard === undefined && !r.isComplement && r.readSymbol === '*');
    if (isWild) return '*';
    if (r.isComplement) return `¬${r.readSymbol}`;
    return `${r.readSymbol}`;
  }
  return `${r.readSymbol} : ${r.command || 'N'}`;
}

/**
 * Generate LaTeX code for university lab reports
 */
export function exportToLaTeX(project: ProjectSession): string {
  const { mode, subMode, alphabet, rules5, rules4, nodes, edges, subMachines } = project;
  const blank = escapeLatex(alphabet.blankSymbol);
  const symbols = alphabet.symbols.map(escapeLatex).join(', ');
  const states = nodes.map((n) => latexNodeLabel(n, true)).join(', ');

  let latex = `% Отчет по Машине Тьюринга: ${project.name}\n`;
  latex += `% Сгенерировано в nojstd\n\n`;
  latex += `\\subsection*{Формальное определение машины Тьюринга}\n`;
  latex += `Формально машина Тьюринга задается кортежем:\n`;
  latex += `\\[ M = \\langle Q, \\Sigma, \\Gamma, \\delta, q_0, B, F \\rangle \\]\n`;
  latex += `\\begin{itemize}\n`;
  latex += `  \\item Множество состояний: $Q = \\{ ${states} \\}$\n`;
  latex += `  \\item Входной алфавит: $\\Sigma = \\{ ${symbols} \\}$\n`;
  latex += `  \\item Алфавит ленты: $\\Gamma = \\{ ${symbols}, ${blank} \\}$\n`;
  latex += `  \\item Пустой символ: $B = '${blank}'$\n`;
  latex += `  \\item Режим работы: ${
    mode === '5-tuple'
      ? "Пятёрки $(q, a, a', d, q')$"
      : subMode === 'operational'
      ? 'Операционная диаграмма VTM (четвёрки)'
      : "Четвёрки $(q, a, C, q')$"
  }\n`;
  latex += `\\end{itemize}\n\n`;

  latex += `\\subsection*{Таблица команд и переходов}\n`;

  if (mode === '5-tuple') {
    latex += `\\begin{table}[h!]\n\\centering\n`;
    latex += `\\begin{tabular}{|c|c|c|c|c|}\n\\hline\n`;
    latex += `\\textbf{Текущее сост.} & \\textbf{Символ} & \\textbf{Новый символ} & \\textbf{Сдвиг} & \\textbf{След. сост.} \\\\ \\hline\n`;
    for (const r of rules5) {
      latex += `$${escapeLatex(r.fromState)}$ & '$${escapeLatex(r.readSymbol)}$' & '$${escapeLatex(r.writeSymbol)}$' & $${escapeLatex(r.move)}$ & $${escapeLatex(r.toState)}$ \\\\ \\hline\n`;
    }
    latex += `\\end{tabular}\n\\caption{Таблица переходов в 5-кортежах}\n\\end{table}\n`;
  } else if (subMode === 'operational') {
    const compiled =
      rules4.length > 0
        ? rules4
        : compileOperationalDiagramTo4Tuples(nodes, edges, alphabet, subMachines);
    latex += `\\begin{table}[h!]\n\\centering\n`;
    latex += `\\begin{tabular}{|c|c|c|}\n\\hline\n`;
    latex += `\\textbf{Узел} & \\textbf{Условие перехода} & \\textbf{След. узел} \\\\ \\hline\n`;
    for (const e of edges) {
      const conds = (e.data?.rules || [])
        .map((r) => escapeLatex(formatRuleCondition(r, mode, subMode)).replace(/¬/g, '$\\neg$'))
        .join(', ');
      latex += `$${escapeLatex(e.source)}$ & ${conds || '$\\varepsilon$'} & $${escapeLatex(e.target)}$ \\\\ \\hline\n`;
    }
    latex += `\\end{tabular}\n\\caption{Переходы операционной диаграммы VTM (${compiled.length} скомпилированных 4-кортежей)}\n\\end{table}\n`;
  } else {
    latex += `\\begin{table}[h!]\n\\centering\n`;
    latex += `\\begin{tabular}{|c|c|c|c|}\n\\hline\n`;
    latex += `\\textbf{Текущее сост.} & \\textbf{Символ} & \\textbf{Команда} & \\textbf{След. сост.} \\\\ \\hline\n`;
    for (const r of rules4) {
      latex += `$${escapeLatex(r.fromState)}$ & '$${escapeLatex(r.readSymbol)}$' & '$${escapeLatex(r.command)}$' & $${escapeLatex(r.toState)}$ \\\\ \\hline\n`;
    }
    latex += `\\end{tabular}\n\\caption{Таблица переходов в 4-кортежах}\n\\end{table}\n`;
  }

  return latex;
}

/**
 * Generate LaTeX TikZ diagram for Overleaf / reports
 */
export function exportToTikZ(project: ProjectSession): string {
  const { mode, subMode, nodes, edges } = project;
  let tikz = `% TikZ диаграмма для Машины Тьюринга: ${project.name}\n`;
  tikz += `% Требует: \\usepackage{tikz} и \\usetikzlibrary{automata, positioning, arrows.meta}\n\n`;
  tikz += `\\begin{tikzpicture}[->, >=Stealth, shorten >=1pt, auto, semithick]\n`;
  tikz += `  \\tikzstyle{every state}=[fill=white, draw=black, text=black, minimum size=1.1cm]\n\n`;

  const minX = nodes.length > 0 ? Math.min(...nodes.map((n) => n.position.x)) : 0;
  const minY = nodes.length > 0 ? Math.min(...nodes.map((n) => n.position.y)) : 0;

  for (const n of nodes) {
    const x = ((n.position.x - minX) / 80).toFixed(2);
    const y = (-((n.position.y - minY) / 80)).toFixed(2);
    const label = latexNodeLabel(n);
    const isState = mode === '5-tuple' || subMode === 'state-graph';
    const stateData = n.data as StateNodeData;
    const opData = n.data as OperationNodeData;

    const opts = ['state'];
    if (isState ? stateData.stateType === 'initial' : opData.opType === 'START') {
      opts.push('initial');
    }
    if (
      isState
        ? stateData.stateType === 'halt' ||
          stateData.stateType === 'accept' ||
          stateData.stateType === 'reject'
        : opData.opType === 'FINISH'
    ) {
      opts.push('accepting');
    }

    tikz += `  \\node[${opts.join(', ')}] (${cleanId(n.id)}) at (${x}, ${y}) {$${label}$};\n`;
  }

  if (edges.length > 0) {
    tikz += `\n  \\path\n`;
    for (const e of edges) {
      const rules = e.data?.rules || [];
      const labelText = rules
        .map((r) => escapeLatex(formatRuleCondition(r, mode, subMode)).replace(/¬/g, '\\neg '))
        .join(', ');
      const isSelf = e.source === e.target;
      const edgeOpt = isSelf
        ? 'loop above'
        : e.data?.isBiDirectional
        ? 'bend left=18'
        : '';
      const optStr = edgeOpt ? `[${edgeOpt}]` : '';
      tikz += `    (${cleanId(e.source)}) edge ${optStr} node {\\footnotesize $${labelText}$} (${cleanId(e.target)})\n`;
    }
    tikz += `  ;\n`;
  }

  tikz += `\\end{tikzpicture}\n`;
  return tikz;
}

/**
 * Generate PlantUML State Diagram code
 */
export function exportToPlantUML(project: ProjectSession): string {
  const { mode, subMode, edges, nodes } = project;
  let puml = `@startuml\n`;
  puml += `' Turing Machine: ${project.name}\n`;
  puml += `skinparam state {\n`;
  puml += `  BackgroundColor White\n`;
  puml += `  BorderColor Black\n`;
  puml += `  ArrowColor DarkBlue\n`;
  puml += `}\n\n`;

  // Start state notation
  const startNode = nodes.find((n) =>
    mode === '5-tuple' || subMode === 'state-graph'
      ? (n.data as StateNodeData).stateType === 'initial'
      : (n.data as OperationNodeData).opType === 'START'
  );
  if (startNode) {
    puml += `[*] --> ${cleanId(startNode.id)}\n`;
  }

  // Node definitions
  for (const n of nodes) {
    const label = nodeLabel(n).replace(/"/g, '\\"');
    puml += `state "${label}" as ${cleanId(n.id)}\n`;
    const isEnd =
      (n.data as StateNodeData).stateType === 'halt' ||
      (n.data as StateNodeData).stateType === 'accept' ||
      (n.data as StateNodeData).stateType === 'reject' ||
      (n.data as OperationNodeData).opType === 'FINISH';
    if (isEnd) {
      puml += `${cleanId(n.id)} --> [*]\n`;
    }
  }

  puml += `\n`;

  // Edges
  for (const e of edges) {
    const rules = e.data?.rules || [];
    const labels = rules
      .map((r) => formatRuleCondition(r, mode, subMode))
      .join(' \\n ')
      .replace(/"/g, '\\"');

    puml += `${cleanId(e.source)} --> ${cleanId(e.target)} : "${labels}"\n`;
  }

  puml += `@enduml\n`;
  return puml;
}

/**
 * Generate Markdown Table
 */
export function exportToMarkdown(project: ProjectSession): string {
  const { mode, rules5, rules4 } = project;
  let md = `### Таблица переходов машины Тьюринга: ${project.name}\n\n`;

  if (mode === '5-tuple') {
    md += `| Состояние $q$ | Символ $a$ | Запись $a'$ | Сдвиг $d$ | След. сост. $q'$ |\n`;
    md += `| :---: | :---: | :---: | :---: | :---: |\n`;
    for (const r of rules5) {
      md += `| \`${r.fromState}\` | \`${r.readSymbol}\` | \`${r.writeSymbol}\` | \`${r.move}\` | \`${r.toState}\` |\n`;
    }
  } else {
    md += `| Состояние $q$ | Символ $a$ | Команда $C$ | След. сост. $q'$ |\n`;
    md += `| :---: | :---: | :---: | :---: |\n`;
    for (const r of rules4) {
      md += `| \`${r.fromState}\` | \`${r.readSymbol}\` | \`${r.command}\` | \`${r.toState}\` |\n`;
    }
  }

  return md;
}

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}
