# Graph Report - nojstd8  (2026-11-25)

## Corpus Check
- 55 files · ~53,083 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 378 nodes · 953 edges · 23 communities (20 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Canvas UI & React Shell
- Core Types & Test Runner
- Engine Architecture & Simulation
- Diagram Editing & Export UI
- NPM Dev Dependencies
- TypeScript Compiler Configuration
- Document & LaTeX Exporters
- Canvas Nodes & Bug Tracker
- Validation, Export & Testing Docs
- NPM Runtime Dependencies
- Zustand Store & IDE Shell Docs
- Turing Formalisms & Tape Model
- Vitest Setup & DOM Mocks
- Vite & Vitest Tooling
- Project Architecture & QA Roadmap
- Rule Transpiler & VTM Compiler
- NPM Package Scripts
- Simulator Cycle & Submachine Runtime
- Entrypoint & State Docs
- Two-Way Table-Matrix Sync
- Browser & App Bootstrapping

## God Nodes (most connected - your core abstractions)
1. `useTuringStore` - 49 edges
2. `react` - 22 edges
3. `useActiveProject()` - 22 edges
4. `lucide-react` - 20 edges
5. `useTuringStore (Zustand Hub)` - 19 edges
6. `initRuntimeState()` - 18 edges
7. `useTuringStore (src/store/useTuringStore.ts)` - 17 edges
8. `App()` - 16 edges
9. `ProjectSession` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Bidirectional 5-Tuple/4-Tuple Transpiler` --semantically_similar_to--> `transpiler.ts Reductor & VTM Compiler`  [INFERRED] [semantically similar]
  README.md → PROJECT_MAP.md
- `Academic Export Formats` --semantically_similar_to--> `exporter.ts Format Exporters`  [INFERRED] [semantically similar]
  README.md → PROJECT_MAP.md
- `Multi-Rule Edge Bundling & Custom Curves` --semantically_similar_to--> `CustomTransitionEdge Component`  [INFERRED] [semantically similar]
  README.md → PROJECT_MAP.md
- `Live Alphabet Refactoring` --semantically_similar_to--> `AlphabetBuilder Component`  [INFERRED] [semantically similar]
  README.md → PROJECT_MAP.md
- `Bidirectional Infinite Sparse Tape` --semantically_similar_to--> `InfiniteTapeDock Component`  [INFERRED] [semantically similar]
  README.md → PROJECT_MAP.md

## Import Cycles
- 2-file cycle: `src/hooks/useKeyboardShortcuts.ts -> src/store/useTuringStore.ts -> src/hooks/useKeyboardShortcuts.ts`

## Hyperedges (group relationships)
- **Interactive Step Simulation and Tape Debugging Flow** — project_map_use_turing_store, project_map_simulator_engine, project_map_infinite_tape_dock, project_map_debugger_controls [EXTRACTED 1.00]
- **Bidirectional Graph, Table, and Matrix Synchronization** — project_map_turing_canvas, project_map_tuple_table_editor, project_map_matrix_editor, project_map_transpiler_engine, project_map_use_turing_store [EXTRACTED 1.00]
- **VTM Operational Diagram Compilation and Execution** — project_map_operation_node, project_map_custom_transition_edge, project_map_transpiler_engine, project_map_simulator_engine [EXTRACTED 1.00]
- **Bidirectional Canvas-Rules-Editor Synchronization** — docs_map_components_turingcanvas, docs_map_components_tupletableeditor, docs_map_components_matrixeditor, docs_map_state_and_types_use_turing_store, docs_map_engine_buildedgesfromrules [EXTRACTED 1.00]
- **Multimodal Turing Machine Transpilation Pipeline** — docs_map_engine_convert5tupleto4tuple, docs_map_engine_convert4tupleto5tuple, docs_map_engine_compileoperationaldiagramto4tuples, docs_map_engine_multimodal_formalism [EXTRACTED 1.00]
- **Step-by-Step Simulation & Undo Loop** — docs_map_components_debuggercontrols, docs_map_components_infinitetapedock, docs_map_engine_stepmachine, docs_map_engine_stepbackmachine, docs_map_state_and_types_executionsnapshot [EXTRACTED 1.00]

## Communities (23 total, 3 thin omitted)

### Community 0 - "Canvas UI & React Shell"
Cohesion: 0.12
Nodes (38): DebuggerControls, SessionManagerDrawer, clsx, lucide-react, react, App(), CustomTransitionEdge, NodeInspector() (+30 more)

### Community 1 - "Core Types & Test Runner"
Cohesion: 0.10
Nodes (50): BatchTestRunner, Multimodal Turing Formalism (5-tuple, 4-tuple, VTM), AlphabetConfig, FiveTupleRule, FourTupleRule, ProjectSession, TestCase, TuringEdge (+42 more)

### Community 2 - "Engine Architecture & Simulation"
Cohesion: 0.07
Nodes (42): DiagnosticsPanel, InfiniteTapeDock, RuntimeState, validateMachine, DEMO_PROJECT_1 (5-tuple symbol replacement), DEMO_PROJECT_2 (4-tuple binary increment), DEMO_PROJECT_3 (VTM word copy), resetStore() (+34 more)

### Community 3 - "Diagram Editing & Export UI"
Cohesion: 0.05
Nodes (35): AlphabetBuilder, CustomTransitionEdge, Dagre Auto-Layout, exportImage (src/utils/exportImage.ts), ExportModal, HeaderNavbar, html-to-image, NodeInspector (+27 more)

### Community 4 - "NPM Dev Dependencies"
Cohesion: 0.13
Nodes (21): devDependencies, autoprefixer@^10.4.20, jsdom@^25.0.1, postcss@^8.4.49, tailwindcss@^3.4.15, @types/dagre@^0.7.52, @types/react@^18.3.12, @types/react-dom@^18.3.1 (+13 more)

### Community 5 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 6 - "Document & LaTeX Exporters"
Cohesion: 0.27
Nodes (14): exportProjectToJSON, exportToLaTeX, exportToMarkdown, exportToPlantUML, importProjectFromJSON, ExportModal(), cleanId(), escapeLatex() (+6 more)

### Community 7 - "Canvas Nodes & Bug Tracker"
Cohesion: 0.18
Nodes (9): Canvas Drag Reactivity Bug (P0), Operational Edge Rule Deletion Bug (P0), Alphabet Refactor WRITE_SYM Gap (P1), CustomTransitionEdge Component, NodeInspector Component, OperationNode Component, RuleModal Component, StateNode Component (+1 more)

### Community 8 - "Validation, Export & Testing Docs"
Cohesion: 0.20
Nodes (10): Demo 3 False-Positive Halt Test (P1), LaTeX Special Character Escaping Bug (P1), demoProjects.ts Reference Sessions, DiagnosticsPanel Component, engine.test.ts Integration Suite, ExportModal Component, exporter.ts Format Exporters, validator.ts Static Analyzer (+2 more)

### Community 9 - "NPM Runtime Dependencies"
Cohesion: 0.18
Nodes (11): dependencies, clsx@^2.1.1, dagre@^0.8.5, html-to-image@^1.11.11, lucide-react@^0.460.0, react@^18.3.1, @xyflow/react@^12.3.6, zustand@^5.0.1 (+3 more)

### Community 10 - "Zustand Store & IDE Shell Docs"
Cohesion: 0.20
Nodes (10): Edge Deletion Rules Desync (P1), Batch Test Load-to-Tape Reset Bug (P0), BatchTestRunner Component, DebuggerControls Component, HeaderNavbar Component, MatrixEditor Component, SessionManagerDrawer Component, TupleTableEditor Component (+2 more)

### Community 11 - "Turing Formalisms & Tape Model"
Cohesion: 0.25
Nodes (7): AlphabetBuilder Component, InfiniteTapeDock Component, 5-Tuple Turing Machine Mode, 4-Tuple Post-Turing Mode, Bidirectional Infinite Sparse Tape, Next-Gen Turing Machine IDE & Diagrammer, VTM Operational Diagram

### Community 12 - "Vitest Setup & DOM Mocks"
Cohesion: 0.25
Nodes (4): @testing-library/jest-dom@^6.9.1, @testing-library/react@^16.3.3, @testing-library/jest-dom, @testing-library/react

### Community 13 - "Vite & Vitest Tooling"
Cohesion: 0.25
Nodes (6): vite@^5.4.11, @vitejs/plugin-react@^4.3.3, vitest@^2.1.9, vite, @vitejs/plugin-react, vitest

### Community 14 - "Project Architecture & QA Roadmap"
Cohesion: 0.33
Nodes (5): 12-Step Manual QA Verification Route, 4-Phase Priority Execution Order, Turing Machine IDE Check Route & QA Roadmap, PROJECT_MAP Architecture Master Map, Graphify Architectural Knowledge Graph

### Community 15 - "Rule Transpiler & VTM Compiler"
Cohesion: 0.40
Nodes (6): 5-Tuple to 4-Tuple Roundtrip Equivalence, SEARCH_L/R Macro Transpilation Bug (P1), FiveTupleRule Type, FourTupleRule Type, ProjectSession Data Model, transpiler.ts Reductor & VTM Compiler

### Community 16 - "NPM Package Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, preview, test, test:watch

### Community 17 - "Simulator Cycle & Submachine Runtime"
Cohesion: 0.50
Nodes (4): Submachine Runtime Crash (P0), RuntimeState Simulation Context, simulator.ts Execution Engine, Submachine CallStack Mechanism

### Community 19 - "Two-Way Table-Matrix Sync"
Cohesion: 0.50
Nodes (3): MatrixEditor, TupleTableEditor, Two-Way Canvas-Inspector Synchronization

### Community 20 - "Browser & App Bootstrapping"
Cohesion: 0.67
Nodes (3): index.html Browser Entry, src/main.tsx Module Entrypoint, App() Root Workspace Layout

## Knowledge Gaps
- **40 isolated node(s):** `TuringStoreState Interface`, `StateNode Component`, `NodeInspector Component`, `DebuggerControls Component`, `TupleTableEditor Component` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 99 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@xyflow/react` connect `Core Types & Test Runner` to `Canvas UI & React Shell`, `NPM Runtime Dependencies`, `NPM Dev Dependencies`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `TuringStoreState Interface`, `StateNode Component`, `NodeInspector Component` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Canvas UI & React Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.12185792349726776 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Vite & Vitest Tooling` to `Canvas UI & React Shell`, `Engine Architecture & Simulation`, `NPM Dev Dependencies`, `Vitest Setup & DOM Mocks`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `Core Types & Test Runner` be split into smaller, more focused modules?**
  _Cohesion score 0.09877264757451783 - nodes in this community are weakly interconnected._
- **Why does `useTuringStore` connect `Canvas UI & React Shell` to `Core Types & Test Runner`, `Engine Architecture & Simulation`, `Document & LaTeX Exporters`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `Engine Architecture & Simulation` be split into smaller, more focused modules?**
  _Cohesion score 0.07329462989840348 - nodes in this community are weakly interconnected._