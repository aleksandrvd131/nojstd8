# Graph Report - nojstd8  (2026-11-24)

## Corpus Check
- Corpus is ~33,320 words - fits in a single context window. You may not need a graph.

## Summary
- 301 nodes · 604 edges · 12 communities (10 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Engine Unit Tests & Validation Cases
- Simulation Engine & Execution Runtime
- NPM Package Dependencies
- UI Shell & Canvas Components
- Project Roadmap & Architecture Specs
- Graph Flow & Transition Edges
- Testing Strategy & Acceptance Criteria
- TypeScript Build Configuration
- Core Features & Overview Documentation
- Predefined Demo Turing Machines

## God Nodes (most connected - your core abstractions)
1. `useTuringStore` - 50 edges
2. `react` - 21 edges
3. `lucide-react` - 19 edges
4. `compilerOptions` - 16 edges
5. `App()` - 15 edges
6. `TuringStoreState` - 15 edges
7. `5.2 Manual Testing Script & Route` - 14 edges
8. `ProjectSession` - 9 edges
9. `@xyflow/react` - 8 edges
10. `ExportModal()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `CustomTransitionEdge` --calls--> `useTuringStore`  [EXTRACTED]
  src/components/canvas/CustomTransitionEdge.tsx → src/store/useTuringStore.ts
- `NodeInspector()` --calls--> `useTuringStore`  [EXTRACTED]
  src/components/canvas/NodeInspector.tsx → src/store/useTuringStore.ts
- `RuleModal()` --calls--> `useTuringStore`  [EXTRACTED]
  src/components/canvas/RuleModal.tsx → src/store/useTuringStore.ts
- `StateNode` --calls--> `useTuringStore`  [EXTRACTED]
  src/components/canvas/StateNode.tsx → src/store/useTuringStore.ts
- `TuringCanvasInner()` --calls--> `useTuringStore`  [EXTRACTED]
  src/components/canvas/TuringCanvas.tsx → src/store/useTuringStore.ts

## Import Cycles
- None detected.

## Communities (12 total, 2 thin omitted)

### Community 0 - "Engine Unit Tests & Validation Cases"
Cohesion: 0.03
Nodes (60): afterDragEndProject, afterDragStartProject, autoPos, backTo5, compiledOps, compiledSr, cycleIssues, cycleTestProject (+52 more)

### Community 1 - "Simulation Engine & Execution Runtime"
Cohesion: 0.11
Nodes (38): importProjectFromJSON(), initRuntimeState(), runTestCase(), RuntimeState, stepBackMachine(), stepMachine(), buildEdgesFromRules(), compileOperationalDiagramTo4Tuples() (+30 more)

### Community 2 - "NPM Package Dependencies"
Cohesion: 0.06
Nodes (41): dependencies, dagre@^0.8.5, html-to-image@^1.11.11, immer@^10.1.1, lucide-react@^0.460.0, react@^18.3.1, react-dom@^18.3.1, zustand@^5.0.1 (+33 more)

### Community 3 - "UI Shell & Canvas Components"
Cohesion: 0.14
Nodes (28): lucide-react, react, App(), OperationNode, TuringCanvas(), DiagnosticsPanel(), MatrixEditor(), TupleTableEditor() (+20 more)

### Community 4 - "Project Roadmap & Architecture Specs"
Cohesion: 0.07
Nodes (26): 1. Executive Summary, 2. Immediate Fixes & Status, 3.1 Canvas Diagrammers (TuringCanvas, StateNode, OperationNode), 3.2 Post-Turing 4-Tuple & VTM Operational Diagrams, 3.3 Matrix & Table Editors, 3.4 Engine & Simulation, 3.5 Tape & Debugger, 3.6 Batch Testing & Verification (+18 more)

### Community 5 - "Graph Flow & Transition Edges"
Cohesion: 0.12
Nodes (18): clsx@^2.1.1, @xyflow/react@^12.3.6, clsx, @xyflow/react, CustomTransitionEdge, NodeInspector(), RuleModal(), StateNode (+10 more)

### Community 6 - "Testing Strategy & Acceptance Criteria"
Cohesion: 0.10
Nodes (21): 5.1 Automated Testing Strategy, 5.2 Manual Testing Script & Route, 5.3 Acceptance Criteria by Subsystem, 5. Comprehensive Testing Guide, Current Test Coverage, Prerequisites, Recommended Test Framework Migration, Step 10: Export & Import (+13 more)

### Community 7 - "TypeScript Build Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 8 - "Core Features & Overview Documentation"
Cohesion: 0.18
Nodes (10): 1. Поддержка двух фундаментальных математических режимов, 2. Специализированный движок графов на `@xyflow/react`, 3. Менеджер алфавитов и живой рефакторинг, 4. Двусторонняя синхронизация представлений, 5. Бесконечная лента и пошаговый отладчик, 6. Персистентность сессий и модуль экспорта, Next-Gen Turing Machine IDE & Diagrammer (Интерактивный Диаграммер и Симулятор Машин Тьюринга), 🌟 Ключевые возможности (+2 more)

### Community 9 - "Predefined Demo Turing Machines"
Cohesion: 0.40
Nodes (4): DEMO_PROJECT_1, DEMO_PROJECT_2, DEMO_PROJECT_3, INITIAL_PROJECTS

## Knowledge Gaps
- **47 isolated node(s):** `1. Поддержка двух фундаментальных математических режимов`, `2. Специализированный движок графов на `@xyflow/react``, `3. Менеджер алфавитов и живой рефакторинг`, `4. Двусторонняя синхронизация представлений`, `5. Бесконечная лента и пошаговый отладчик` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 148 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTuringStore` connect `UI Shell & Canvas Components` to `Engine Unit Tests & Validation Cases`, `Simulation Engine & Execution Runtime`, `Graph Flow & Transition Edges`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `1. Поддержка двух фундаментальных математических режимов`, `2. Специализированный движок графов на `@xyflow/react``, `3. Менеджер алфавитов и живой рефакторинг` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Engine Unit Tests & Validation Cases` be split into smaller, more focused modules?**
  _Cohesion score 0.03225806451612903 - nodes in this community are weakly interconnected._
- **Why does `react` connect `UI Shell & Canvas Components` to `Simulation Engine & Execution Runtime`, `NPM Package Dependencies`, `Graph Flow & Transition Edges`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `Simulation Engine & Execution Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.1147086031452359 - nodes in this community are weakly interconnected._
- **Why does `@xyflow/react` connect `Graph Flow & Transition Edges` to `Simulation Engine & Execution Runtime`, `NPM Package Dependencies`, `UI Shell & Canvas Components`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Should `NPM Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06312292358803986 - nodes in this community are weakly interconnected._