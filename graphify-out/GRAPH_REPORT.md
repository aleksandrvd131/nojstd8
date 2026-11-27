# Graph Report - nojstd8  (2026-11-27)

## Corpus Check
- 62 files · ~64,959 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 501 nodes · 1187 edges · 19 communities (14 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dd4e05be`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Canvas Routing, VTM Code & Ports
- Store Slices & Inspector Sync
- Engine Simulation, Validation & Tape
- wireLayout.ts
- Diagram Editing & Canvas Docs
- GitHub Pages Deploy Workflow
- Component Architecture & Reference Docs
- CI Verification Pipeline
- package.json
- check-graph-freshness.mjs
- TypeScript Compiler Config
- QA Roadmap & Turing Formalisms
- LaTeX, TikZ & Document Exporters
- Project Map & Graphify Docs
- Browser Entrypoint
- Bi-directional Binding (Canvas <-> Tables/Matrix)

## God Nodes (most connected - your core abstractions)
1. `useTuringStore` - 47 edges
2. `react` - 22 edges
3. `useActiveProject()` - 20 edges
4. `initRuntimeState()` - 18 edges
5. `lucide-react` - 18 edges
6. `useTuringStore (src/store/useTuringStore.ts)` - 17 edges
7. `useTuringStore (Zustand Hub)` - 17 edges
8. `ProjectSession` - 16 edges
9. `compilerOptions` - 16 edges
10. `TuringNode` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Prior Graphify Review Query (2026-11-25)` --conceptually_related_to--> `nojstd Turing Machine IDE & Simulator`  [INFERRED]
  graphify-out/memory/query_20261125_092734_709079ac_просмотри_проект_и_расскажи__что_в_нем_хорошо__а_ч.md → README.md
- `Bi-directional Binding (Canvas <-> Tables/Matrix)` --semantically_similar_to--> `Two-Way Canvas-Inspector Synchronization`  [INFERRED] [semantically similar]
  docs/MAP_COMPONENTS.md → docs/MAP_STATE_AND_TYPES.md
- `CustomTransitionEdge` --calls--> `useTuringStore`  [EXTRACTED]
  src/components/canvas/CustomTransitionEdge.tsx → src/store/useTuringStore.ts
- `resetStore()` --calls--> `initRuntimeState()`  [EXTRACTED]
  src/components/components.test.tsx → src/engine/simulator.ts
- `ProjectSlice` --references--> `ProjectSession`  [EXTRACTED]
  src/store/types.ts → src/types/turing.ts

## Import Cycles
- 2-file cycle: `src/hooks/useKeyboardShortcuts.ts -> src/store/useTuringStore.ts -> src/hooks/useKeyboardShortcuts.ts`

## Hyperedges (group relationships)
- **Bidirectional Canvas-Rules-Editor Synchronization** — docs_map_components_turingcanvas, docs_map_components_tupletableeditor, docs_map_components_matrixeditor, docs_map_state_and_types_use_turing_store, docs_map_engine_buildedgesfromrules [EXTRACTED 1.00]
- **Bidirectional Graph, Table, and Matrix Synchronization** — project_map_turing_canvas, project_map_tuple_table_editor, project_map_matrix_editor, project_map_transpiler_engine, project_map_use_turing_store [EXTRACTED 1.00]
- **Interactive Step Simulation and Tape Debugging Flow** — project_map_use_turing_store, project_map_simulator_engine, project_map_infinite_tape_dock, project_map_debugger_controls [EXTRACTED 1.00]
- **Multimodal Turing Machine Transpilation Pipeline** — docs_map_engine_convert5tupleto4tuple, docs_map_engine_convert4tupleto5tuple, docs_map_engine_compileoperationaldiagramto4tuples, docs_map_engine_multimodal_formalism [EXTRACTED 1.00]
- **Step-by-Step Simulation & Undo Loop** — docs_map_components_debuggercontrols, docs_map_components_infinitetapedock, docs_map_engine_stepmachine, docs_map_engine_stepbackmachine, docs_map_state_and_types_executionsnapshot [EXTRACTED 1.00]
- **VTM Operational Diagram Compilation and Execution** — project_map_operation_node, project_map_custom_transition_edge, project_map_transpiler_engine, project_map_simulator_engine [EXTRACTED 1.00]

## Communities (19 total, 5 thin omitted)

### Community 0 - "Canvas Routing, VTM Code & Ports"
Cohesion: 0.08
Nodes (62): Multimodal Turing Formalism (5-tuple, 4-tuple, VTM), html-to-image, @xyflow/react, End, Endpoint, ends, nodeBox(), normals (+54 more)

### Community 1 - "Store Slices & Inspector Sync"
Cohesion: 0.09
Nodes (52): DebuggerControls, SessionManagerDrawer, lucide-react, react, App(), NodeInspector(), NodePorts(), PortRoles (+44 more)

### Community 2 - "Engine Simulation, Validation & Tape"
Cohesion: 0.07
Nodes (47): BatchTestRunner, DiagnosticsPanel, InfiniteTapeDock, RuntimeState, stepBackMachine, validateMachine, AlphabetConfig, DEMO_PROJECT_1 (5-tuple symbol replacement) (+39 more)

### Community 3 - "wireLayout.ts"
Cohesion: 0.09
Nodes (28): dependencies, clsx@^2.1.1, dagre@^0.8.5, html-to-image@^1.11.11, lucide-react@^0.460.0, react@^18.3.1, @xyflow/react@^12.3.6, zustand@^5.0.1 (+20 more)

### Community 4 - "Diagram Editing & Canvas Docs"
Cohesion: 0.05
Nodes (35): AlphabetBuilder, CustomTransitionEdge, Dagre Auto-Layout, exportImage (src/utils/exportImage.ts), ExportModal, HeaderNavbar, html-to-image, NodeInspector (+27 more)

### Community 5 - "GitHub Pages Deploy Workflow"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, environment, if, name, needs, runs-on (+27 more)

### Community 6 - "Component Architecture & Reference Docs"
Cohesion: 0.07
Nodes (30): AlphabetBuilder Component, App() Root Workspace Layout, BatchTestRunner Component, CustomTransitionEdge Component, DebuggerControls Component, demoProjects.ts Reference Sessions, DiagnosticsPanel Component, engine.test.ts Integration Suite (+22 more)

### Community 7 - "CI Verification Pipeline"
Cohesion: 0.08
Nodes (24): concurrency, cancel-in-progress, group, jobs, verify, name, on, pull_request (+16 more)

### Community 8 - "package.json"
Cohesion: 0.06
Nodes (40): devDependencies, autoprefixer@^10.4.20, jsdom@^25.0.1, postcss@^8.4.49, tailwindcss@^3.4.15, @testing-library/jest-dom@^6.9.1, @testing-library/react@^16.3.3, @types/dagre@^0.7.52 (+32 more)

### Community 9 - "check-graph-freshness.mjs"
Cohesion: 0.16
Nodes (16): CODE_EXTENSIONS, DOC_EXTENSIONS, gitBytes(), gitText(), isStagedMode, isTrackedGraphifyInput(), listFilesFromDisk(), loadStagedCorpus() (+8 more)

### Community 10 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 11 - "QA Roadmap & Turing Formalisms"
Cohesion: 0.27
Nodes (11): exportProjectToJSON, exportToLaTeX, exportToMarkdown, exportToPlantUML, importProjectFromJSON, cleanId(), escapeLatex(), exportToLaTeX() (+3 more)

### Community 12 - "LaTeX, TikZ & Document Exporters"
Cohesion: 0.17
Nodes (12): 12-Step Manual QA Verification Route, Future Work & Out-of-Scope Features (Multi-tape, NTM BFS, Conditional Breakpoints), Turing Machine IDE Check Route & QA Roadmap (Verified e6d601a), Resolved P0/P1/P2 Fixes (Drag, Submachine, Load-to-Tape, Edge Delete, SEARCH_L/R, LaTeX, Wire Routing, BFS Reachability, NodeInspector), Prior Graphify Review Query (2026-11-25), 4-Tuple Post-Turing & VTM Operational Mode, 5-Tuple Turing Machine Mode, Export Formats (JSON, LaTeX, TikZ, PlantUML, Markdown, PNG/SVG/JPEG) (+4 more)

### Community 24 - "Bi-directional Binding (Canvas <-> Tables/Matrix)"
Cohesion: 0.50
Nodes (3): MatrixEditor, TupleTableEditor, Two-Way Canvas-Inspector Synchronization

## Knowledge Gaps
- **49 isolated node(s):** `Multimodal Turing Formalism (5-tuple, 4-tuple, VTM)`, `SessionManagerDrawer`, `exportProjectToJSON`, `exportToLaTeX`, `exportToMarkdown` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 176 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@xyflow/react` connect `Canvas Routing, VTM Code & Ports` to `package.json`, `Store Slices & Inspector Sync`, `Engine Simulation, Validation & Tape`, `wireLayout.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `Multimodal Turing Formalism (5-tuple, 4-tuple, VTM)`, `SessionManagerDrawer`, `exportProjectToJSON` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Canvas Routing, VTM Code & Ports` be split into smaller, more focused modules?**
  _Cohesion score 0.07534246575342465 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Engine Simulation, Validation & Tape` to `package.json`, `Store Slices & Inspector Sync`, `Canvas Routing, VTM Code & Ports`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `Store Slices & Inspector Sync` be split into smaller, more focused modules?**
  _Cohesion score 0.09405405405405405 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Store Slices & Inspector Sync` to `package.json`, `wireLayout.ts`, `Diagram Editing & Canvas Docs`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Engine Simulation, Validation & Tape` be split into smaller, more focused modules?**
  _Cohesion score 0.06892655367231638 - nodes in this community are weakly interconnected._