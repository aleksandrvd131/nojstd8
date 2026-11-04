import { ProjectSession, FiveTupleRule, FourTupleRule } from '../types/turing';

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
  const parsed = JSON.parse(jsonString) as ProjectSession;
  if (!parsed.id || !parsed.mode || !parsed.alphabet) {
    throw new Error('Некорректный формат файла проекта Машины Тьюринга.');
  }
  return parsed;
}

/**
 * Generate LaTeX code for university lab reports
 */
export function exportToLaTeX(project: ProjectSession): string {
  const { mode, subMode, alphabet, rules5, rules4, nodes } = project;
  const blank = alphabet.blankSymbol;
  const symbols = alphabet.symbols.join(', ');
  const states = nodes.map((n) => n.data.label || n.id).join(', ');

  let latex = `% Отчет по Машине Тьюринга: ${project.name}\n`;
  latex += `% Сгенерировано в Next-Gen Turing Machine IDE\n\n`;
  latex += `\\subsection*{Формальное определение машины Тьюринга}\n`;
  latex += `Формально машина Тьюринга задается кортежем:\n`;
  latex += `\\[ M = \\langle Q, \\Sigma, \\Gamma, \\delta, q_0, B, F \\rangle \\]\n`;
  latex += `\\begin{itemize}\n`;
  latex += `  \\item Множество состояний: $Q = \\{ ${states} \\}$\n`;
  latex += `  \\item Входной алфавит: $\\Sigma = \\{ ${symbols} \\}$\n`;
  latex += `  \\item Алфавит ленты: $\\Gamma = \\{ ${symbols}, ${blank} \\}$\n`;
  latex += `  \\item Пустой символ: $B = '${blank}'$\n`;
  latex += `  \\item Режим работы: ${mode === '5-tuple' ? 'Пятёрки $(q, a, a\', d, q\')$' : 'Четвёрки $(q, a, C, q\')$'}\n`;
  latex += `\\end{itemize}\n\n`;

  latex += `\\subsection*{Таблица команд и переходов}\n`;

  if (mode === '5-tuple') {
    latex += `\\begin{table}[h!]\n\\centering\n`;
    latex += `\\begin{tabular}{|c|c|c|c|c|}\n\\hline\n`;
    latex += `\\textbf{Текущее сост.} & \\textbf{Символ} & \\textbf{Новый символ} & \\textbf{Сдвиг} & \\textbf{След. сост.} \\\\ \\hline\n`;
    for (const r of rules5) {
      latex += `$${r.fromState}$ & '$${r.readSymbol}$' & '$${r.writeSymbol}$' & $${r.move}$ & $${r.toState}$ \\\\ \\hline\n`;
    }
    latex += `\\end{tabular}\n\\caption{Таблица переходов в 5-кортежах}\n\\end{table}\n`;
  } else {
    latex += `\\begin{table}[h!]\n\\centering\n`;
    latex += `\\begin{tabular}{|c|c|c|c|}\n\\hline\n`;
    latex += `\\textbf{Текущее сост.} & \\textbf{Символ} & \\textbf{Команда} & \\textbf{След. сост.} \\\\ \\hline\n`;
    for (const r of rules4) {
      latex += `$${r.fromState}$ & '$${r.readSymbol}$' & '$${r.command}$' & $${r.toState}$ \\\\ \\hline\n`;
    }
    latex += `\\end{tabular}\n\\caption{Таблица переходов в 4-кортежах}\n\\end{table}\n`;
  }

  return latex;
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
      ? (n.data as any).stateType === 'initial'
      : (n.data as any).opType === 'START'
  );
  if (startNode) {
    puml += `[*] --> ${cleanId(startNode.id)}\n`;
  }

  // Node definitions
  for (const n of nodes) {
    const label = n.data.label || n.id;
    puml += `state "${label}" as ${cleanId(n.id)}\n`;
    if ((n.data as any).stateType === 'halt' || (n.data as any).opType === 'FINISH') {
      puml += `${cleanId(n.id)} --> [*]\n`;
    }
  }

  puml += `\n`;

  // Edges
  for (const e of edges) {
    const rules = e.data?.rules || [];
    const labels = rules
      .map((r: any) => {
        if (mode === '5-tuple') {
          return `${r.readSymbol} -> ${r.writeSymbol}, ${r.move}`;
        }
        return `${r.readSymbol} : ${r.command || 'N'}`;
      })
      .join(' \\n ');

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
