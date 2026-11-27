# Graph Report - nojstd8  (2026-11-27)

## Corpus Check
- 3 files · ~61,405 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 496 nodes · 1092 edges · 23 communities (18 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Canvas Routing, VTM Code & Ports
- Store Slices & Inspector Sync
- Engine Simulation, Validation & Tape
- Canvas Nodes, Edges & UI Shell
- Diagram Editing & Canvas Docs
- GitHub Pages Deploy Workflow
- Component Architecture & Reference Docs
- CI Verification Pipeline
- NPM Dev Dependencies
- Community 9
- TypeScript Compiler Config
- QA Roadmap & Turing Formalisms
- LaTeX, TikZ & Document Exporters
- NPM Runtime Dependencies
- NPM Package Scripts
- Vitest & DOM Testing Setup
- Vite & Vitest Tooling
- Canvas Image Export (PNG/SVG)
- Project Map & Graphify Docs
- Browser Entrypoint

## God Nodes (most connected - your core abstractions)
1. `useTuringStore` - 35 edges
2. `react` - 22 edges
3. `lucide-react` - 18 edges
4. `useTuringStore (src/store/useTuringStore.ts)` - 17 edges
5. `useTuringStore (Zustand Hub)` - 17 edges
6. `useActiveProject()` - 16 edges
7. `compilerOptions` - 16 edges
8. `ProjectSession` - 15 edges
9. `initRuntimeState()` - 14 edges
10. `TuringNode` - 12 edges

## Surprising Connections (you probably didn't know these)
- `html-to-image@^1.11.11` --declares--> `html-to-image`  [EXTRACTED]
  package.json → docs/MAP_COMPONENTS.md
- `Prior Graphify Review Query (2026-11-25)` --conceptually_related_to--> `nojstd Turing Machine IDE & Simulator`  [INFERRED]
  graphify-out/memory/query_20261125_092734_709079ac_просмотри_проект_и_расскажи__что_в_нем_хорошо__а_ч.md → README.md
- `Bi-directional Binding (Canvas <-> Tables/Matrix)` --semantically_similar_to--> `Two-Way Canvas-Inspector Synchronization`  [INFERRED] [semantically similar]
  docs/MAP_COMPONENTS.md → docs/MAP_STATE_AND_TYPES.md
- `layoutWires()` --calls--> `nodeBox()`  [EXTRACTED]
  src/engine/wireLayout.ts → src/engine/ports.ts
- `exportToLaTeX()` --calls--> `compileOperationalDiagramTo4Tuples()`  [EXTRACTED]
  src/engine/exporter.ts → src/engine/transpiler.ts

## Import Cycles
- 2-file cycle: `src/hooks/useKeyboardShortcuts.ts -> src/store/useTuringStore.ts -> src/hooks/useKeyboardShortcuts.ts`

## Hyperedges (group relationships)
- **Bidirectional Canvas-Rules-Editor Synchronization** — docs_map_components_turingcanvas, docs_map_components_tupletableeditor, docs_map_components_matrixeditor, docs_map_state_and_types_use_turing_store, docs_map_engine_buildedgesfromrules [EXTRACTED 1.00]
- **Bidirectional Graph, Table, and Matrix Synchronization** — project_map_turing_canvas, project_map_tuple_table_editor, project_map_matrix_editor, project_map_transpiler_engine, project_map_use_turing_store [EXTRACTED 1.00]
- **Interactive Step Simulation and Tape Debugging Flow** — project_map_use_turing_store, project_map_simulator_engine, project_map_infinite_tape_dock, project_map_debugger_controls [EXTRACTED 1.00]
- **Multimodal Turing Machine Transpilation Pipeline** — docs_map_engine_convert5tupleto4tuple, docs_map_engine_convert4tupleto5tuple, docs_map_engine_compileoperationaldiagramto4tuples, docs_map_engine_multimodal_formalism [EXTRACTED 1.00]
- **Step-by-Step Simulation & Undo Loop** — docs_map_components_debuggercontrols, docs_map_components_infinitetapedock, docs_map_engine_stepmachine, docs_map_engine_stepbackmachine, docs_map_state_and_types_executionsnapshot [EXTRACTED 1.00]
- **VTM Operational Diagram Compilation and Execution** — project_map_operation_node, project_map_custom_transition_edge, project_map_transpiler_engine, project_map_simulator_engine [EXTRACTED 1.00]

## Communities (23 total, 5 thin omitted)

### Community 0 - "Canvas Routing, VTM Code & Ports"
Cohesion: 0.07
Nodes (63): html-to-image, Multimodal Turing Formalism (5-tuple, 4-tuple, VTM), AlphabetConfig, FiveTupleRule, FourTupleRule, ProjectSession, TuringEdge, TuringNode (+55 more)

### Community 1 - "Store Slices & Inspector Sync"
Cohesion: 0.11
Nodes (34): BatchTestRunner, DebuggerControls, MatrixEditor, SessionManagerDrawer, TupleTableEditor, TestCase, Two-Way Canvas-Inspector Synchronization, lucide-react (+26 more)

### Community 2 - "Engine Simulation, Validation & Tape"
Cohesion: 0.09
Nodes (31): DiagnosticsPanel, InfiniteTapeDock, RuntimeState, validateMachine, DEMO_PROJECT_1 (5-tuple symbol replacement), DEMO_PROJECT_2 (4-tuple binary increment), DEMO_PROJECT_3 (VTM word copy), resetStore() (+23 more)

### Community 3 - "Canvas Nodes, Edges & UI Shell"
Cohesion: 0.08
Nodes (36): clsx, @xyflow/react, CustomTransitionEdge, NodePorts(), PortRoles, positions, OperationNode, StateNode (+28 more)

### Community 4 - "Diagram Editing & Canvas Docs"
Cohesion: 0.05
Nodes (34): AlphabetBuilder, CustomTransitionEdge, Dagre Auto-Layout, exportImage (src/utils/exportImage.ts), ExportModal, HeaderNavbar, NodeInspector, OperationNode (+26 more)

### Community 5 - "GitHub Pages Deploy Workflow"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, environment, if, name, needs, runs-on (+27 more)

### Community 6 - "Component Architecture & Reference Docs"
Cohesion: 0.07
Nodes (30): AlphabetBuilder Component, App() Root Workspace Layout, BatchTestRunner Component, CustomTransitionEdge Component, DebuggerControls Component, demoProjects.ts Reference Sessions, DiagnosticsPanel Component, engine.test.ts Integration Suite (+22 more)

### Community 7 - "CI Verification Pipeline"
Cohesion: 0.08
Nodes (24): concurrency, cancel-in-progress, group, jobs, verify, name, on, pull_request (+16 more)

### Community 8 - "NPM Dev Dependencies"
Cohesion: 0.13
Nodes (21): devDependencies, autoprefixer@^10.4.20, jsdom@^25.0.1, postcss@^8.4.49, tailwindcss@^3.4.15, @types/dagre@^0.7.52, @types/react@^18.3.12, @types/react-dom@^18.3.1 (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (16): CODE_EXTENSIONS, DOC_EXTENSIONS, gitBytes(), gitText(), isStagedMode, isTrackedGraphifyInput(), listFilesFromDisk(), loadStagedCorpus() (+8 more)

### Community 10 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 11 - "QA Roadmap & Turing Formalisms"
Cohesion: 0.27
Nodes (14): exportProjectToJSON, exportToLaTeX, exportToMarkdown, exportToPlantUML, importProjectFromJSON, ExportModal(), cleanId(), escapeLatex() (+6 more)

### Community 12 - "LaTeX, TikZ & Document Exporters"
Cohesion: 0.17
Nodes (12): 12-Step Manual QA Verification Route, Future Work & Out-of-Scope Features (Multi-tape, NTM BFS, Conditional Breakpoints), Turing Machine IDE Check Route & QA Roadmap (Verified e6d601a), Resolved P0/P1/P2 Fixes (Drag, Submachine, Load-to-Tape, Edge Delete, SEARCH_L/R, LaTeX, Wire Routing, BFS Reachability, NodeInspector), Prior Graphify Review Query (2026-11-25), 4-Tuple Post-Turing & VTM Operational Mode, 5-Tuple Turing Machine Mode, Export Formats (JSON, LaTeX, TikZ, PlantUML, Markdown, PNG/SVG/JPEG) (+4 more)

### Community 13 - "NPM Runtime Dependencies"
Cohesion: 0.20
Nodes (10): dependencies, clsx@^2.1.1, dagre@^0.8.5, html-to-image@^1.11.11, lucide-react@^0.460.0, react@^18.3.1, react-dom@^18.3.1, @xyflow/react@^12.3.6 (+2 more)

### Community 14 - "NPM Package Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check, check:graph, dev, prepare, preview, test (+2 more)

### Community 15 - "Vitest & DOM Testing Setup"
Cohesion: 0.25
Nodes (7): zustand@^5.0.1, zustand, createDebouncedStorage(), debouncedPersistStorage, DebouncedStateStorage, memoryStorage, safeStorage

### Community 16 - "Vite & Vitest Tooling"
Cohesion: 0.25
Nodes (4): @testing-library/jest-dom@^6.9.1, @testing-library/react@^16.3.3, @testing-library/jest-dom, @testing-library/react

### Community 17 - "Canvas Image Export (PNG/SVG)"
Cohesion: 0.25
Nodes (6): vite@^5.4.11, @vitejs/plugin-react@^4.3.3, vitest@^2.1.9, vite, @vitejs/plugin-react, vitest

## Knowledge Gaps
- **48 isolated node(s):** `Multimodal Turing Formalism (5-tuple, 4-tuple, VTM)`, `SessionManagerDrawer`, `Two-Way Canvas-Inspector Synchronization`, `exportProjectToJSON`, `exportToLaTeX` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 175 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@xyflow/react` connect `Canvas Nodes, Edges & UI Shell` to `NPM Dev Dependencies`, `Canvas Routing, VTM Code & Ports`, `NPM Runtime Dependencies`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `Multimodal Turing Formalism (5-tuple, 4-tuple, VTM)`, `SessionManagerDrawer`, `Two-Way Canvas-Inspector Synchronization` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Canvas Routing, VTM Code & Ports` be split into smaller, more focused modules?**
  _Cohesion score 0.0669710806697108 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Canvas Image Export (PNG/SVG)` to `Canvas Routing, VTM Code & Ports`, `Store Slices & Inspector Sync`, `Engine Simulation, Validation & Tape`, `NPM Dev Dependencies`, `Vite & Vitest Tooling`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `Store Slices & Inspector Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.11038961038961038 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Store Slices & Inspector Sync` to `NPM Dev Dependencies`, `QA Roadmap & Turing Formalisms`, `Canvas Nodes, Edges & UI Shell`, `NPM Runtime Dependencies`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Engine Simulation, Validation & Tape` be split into smaller, more focused modules?**
  _Cohesion score 0.09393939393939393 - nodes in this community are weakly interconnected._