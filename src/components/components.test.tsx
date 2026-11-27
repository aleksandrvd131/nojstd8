import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { INITIAL_PROJECTS } from '../store/demoProjects';
import { useTuringStore } from '../store/useTuringStore';
import { initRuntimeState } from '../engine/simulator';
import { ProjectSession } from '../types/turing';
import { RuleModal } from './canvas/RuleModal';
import { NodeInspector } from './canvas/NodeInspector';
import { DiagnosticsPanel } from './inspector/DiagnosticsPanel';
import { BatchTestRunner } from './tape/BatchTestRunner';
import { InfiniteTapeDock } from './tape/InfiniteTapeDock';
import { DebuggerControls } from './tape/DebuggerControls';
import { ExportModal } from './navbar/ExportModal';
import { ConfirmModal } from './navbar/ConfirmModal';
import { DiagramSettingsModal } from './navbar/DiagramSettingsModal';
import { SessionManagerDrawer } from './sidebar/SessionManagerDrawer';
import { VTMCodeInput } from './inspector/VTMCodeInput';
import { HeaderNavbar } from './navbar/HeaderNavbar';
import { App } from '../App';
import { ReactFlow, ReactFlowProvider, Position } from '@xyflow/react';
import { OperationNode } from './canvas/OperationNode';
import { CustomTransitionEdge } from './canvas/CustomTransitionEdge';

function resetStore(projectId = INITIAL_PROJECTS[0].id) {
  const freshProjects: ProjectSession[] = JSON.parse(JSON.stringify(INITIAL_PROJECTS));
  const active = freshProjects.find((p) => p.id === projectId) || freshProjects[0];
  useTuringStore.setState({
    projects: freshProjects,
    activeProjectId: active.id,
    runtime: initRuntimeState(active),
    isRunning: false,
    isInspectorOpen: false,
    activeTab: 'check',
    selectedNodeId: null,
    selectedEdgeId: null,
    isRuleModalOpen: false,
    ruleModalData: null,
    confirmModal: null,
    isExportModalOpen: false,
    isSettingsModalOpen: false,
    isSessionDrawerOpen: false,
    keyboardShortcutsEnabled: true,
    theme: 'dark',
    hideEdgeRules: false,
    showMiniMap: true,
    showCanvasControls: true,
    canvasBackground: 'dots',
  });
}

describe('React UI Components', () => {
  beforeEach(() => {
    resetStore();
  });

  it('imports an operational project as a VTM code function without adding a canvas node', () => {
    resetStore('demo-project-vtm-copy');
    const source = { ...INITIAL_PROJECTS[0], id: 'vtm-source', name: 'Моя машина' };
    useTuringStore.setState((state) => ({ projects: [...state.projects, source] }));
    const before = useTuringStore.getState().getActiveProject().nodes.length;
    render(<VTMCodeInput />);

    fireEvent.click(screen.getByText('Импорт машины в код'));
    fireEvent.change(screen.getByLabelText('Проект'), { target: { value: source.id } });
    fireEvent.change(screen.getByLabelText('Буква функции'), { target: { value: 'K' } });
    fireEvent.click(screen.getByRole('button', { name: 'Импортировать в код' }));

    expect(useTuringStore.getState().getActiveProject().nodes).toHaveLength(before);
    expect(screen.getByText(/K — Моя машина/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Код'), { target: { value: 'K r' } });
    expect(screen.getByRole('button', { name: 'Вставить в текущую схему' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Вставить в текущую схему' }));
    const project = useTuringStore.getState().getActiveProject();
    expect(project.nodes.some((node) => node.data.subMachineId === project.subMachines.find((sm) => sm.code === 'K')?.id)).toBe(true);
  });

  it('DiagnosticsPanel reacts to store mutations via useActiveProject', () => {
    render(<DiagnosticsPanel />);
    expect(screen.getByText('Корректна')).toBeInTheDocument();

    // Remove START designation -> DiagnosticsPanel must reactively show error
    act(() => {
      useTuringStore.getState().updateNodeData('vtm_start', { opType: 'SHIFT_R' });
    });
    expect(screen.getByText(/отсутствует узел START/i)).toBeInTheDocument();

    // Outgoing edge from FINISH -> DiagnosticsPanel must show error and clicking it selects the offending edge
    act(() => {
      useTuringStore.getState().updateNodeData('vtm_start', { opType: 'START' });
      useTuringStore.getState().upsertOperationalEdgeRule({
        sourceNodeId: 'vtm_finish',
        targetNodeId: 'vtm_start',
        readSymbol: '0',
        isWildcard: false,
        isComplement: true,
      });
    });
    const finishErr = screen.getByText(/Из конечного узла FINISH/i);
    expect(finishErr).toBeInTheDocument();
    fireEvent.click(finishErr);
    expect(useTuringStore.getState().selectedEdgeId).toBe('edge_vtm_finish_vtm_start');
    expect(useTuringStore.getState().selectedNodeId).toBeNull();
  });

  it('RuleModal loads and edits VTM operational edge rules including complement (¬a)', () => {
    resetStore('demo-project-vtm-copy');
    useTuringStore.getState().openRuleModal({
      edgeId: 'e_vtm_2',
      sourceNodeId: 'vtm_check_char',
      targetNodeId: 'vtm_mark_x',
      ruleId: 'r2',
    });

    render(<RuleModal />);
    expect(screen.getByText('Редактирование правила')).toBeInTheDocument();

    // Switch condition to complement (¬a) and save
    fireEvent.click(screen.getByText('Кроме (¬a)'));
    fireEvent.click(screen.getByText('Сохранить'));

    const edge = useTuringStore
      .getState()
      .getActiveProject()
      .edges.find((e) => e.id === 'e_vtm_2');
    const rule = edge?.data?.rules.find((r) => r.id === 'r2');
    expect(rule?.isComplement).toBe(true);
    expect(rule?.isWildcard).toBe(false);
    expect(rule?.readSymbol).toBe('1');
  });

  it('RuleModal appends to existing edge on onConnect instead of creating duplicate edge', () => {
    resetStore('demo-project-vtm-copy');
    const initialEdgeCount = useTuringStore.getState().getActiveProject().edges.length;

    // Simulate onConnect between vtm_check_char -> vtm_mark_x (e_vtm_2 already exists)
    useTuringStore.getState().onConnect({
      source: 'vtm_check_char',
      target: 'vtm_mark_x',
      sourceHandle: null,
      targetHandle: null,
    });

    render(<RuleModal />);
    fireEvent.click(screen.getByText('Сохранить'));

    const afterEdges = useTuringStore.getState().getActiveProject().edges;
    expect(afterEdges.length).toBe(initialEdgeCount);
    const updated = afterEdges.find((e) => e.id === 'e_vtm_2');
    expect(updated?.data?.rules.length).toBe(2);
  });

  it('BatchTestRunner adds a test case, runs all tests, and loads input onto tape', () => {
    render(<BatchTestRunner />);

    fireEvent.change(screen.getByPlaceholderText('Название (опц.)'), { target: { value: 'Новый тест' } });
    fireEvent.change(screen.getByPlaceholderText('Вход (Input)'), { target: { value: '111#' } });
    fireEvent.change(screen.getByPlaceholderText('Ожидание (Exp)'), { target: { value: '111#111' } });
    fireEvent.click(screen.getByText('Добавить тест в набор'));

    expect(screen.getByText('Новый тест')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Запустить все тесты'));
    expect(screen.getByText('3')).toBeInTheDocument();

    // Add a test requiring accept halt
    fireEvent.change(screen.getByPlaceholderText('Название (опц.)'), { target: { value: 'Accept тест' } });
    fireEvent.change(screen.getByLabelText('Ожидаемый останов'), { target: { value: 'accept' } });
    fireEvent.change(screen.getByPlaceholderText('Вход (Input)'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Добавить тест в набор'));
    expect(screen.getByText('accept')).toBeInTheDocument();

    const loadButtons = screen.getAllByText('На ленту');
    fireEvent.click(loadButtons[0]);
    expect(useTuringStore.getState().runtime.tape[0]).toBe('1');
    expect(useTuringStore.getState().runtime.headPosition).toBe(2);
  });

  it('HeaderNavbar omits mode switcher and App opens Check/Tests dropdown closing on X or Escape', () => {
    render(<App />);

    // Mode switcher and Table/Matrix tabs are removed
    expect(screen.queryByText('5-Tuple')).not.toBeInTheDocument();
    expect(screen.queryByText('4-Tuple (Граф)')).not.toBeInTheDocument();
    expect(screen.queryByText('4-Tuple (VTM)')).not.toBeInTheDocument();
    expect(screen.queryByText('Таблица')).not.toBeInTheDocument();
    expect(screen.queryByText('Матрица')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Check и Тесты' })).not.toBeInTheDocument();

    // Click Check in header -> opens dropdown on Check
    fireEvent.click(screen.getByRole('button', { name: /Check/i }));
    const dialog = screen.getByRole('dialog', { name: 'Check и Тесты' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Статический Анализатор/i)).toBeInTheDocument();

    // Switch to Тесты inside dropdown
    const testsButtons = screen.getAllByRole('button', { name: /Тесты/i });
    fireEvent.click(testsButtons[testsButtons.length - 1]);
    expect(screen.getByText(/Пакетное тестирование/i)).toBeInTheDocument();

    // Pressing Escape even inside an input closes the dropdown
    const input = screen.getByPlaceholderText('Вход (Input)');
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Check и Тесты' })).not.toBeInTheDocument();

    // Re-open via Тесты button in HeaderNavbar and close with X button
    fireEvent.click(screen.getByRole('button', { name: /Тесты/i }));
    expect(screen.getByRole('dialog', { name: 'Check и Тесты' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Закрыть меню'));
    expect(screen.queryByRole('dialog', { name: 'Check и Тесты' })).not.toBeInTheDocument();
  });

  it('HeaderNavbar renders Check and Tests buttons without mode switcher', () => {
    render(<HeaderNavbar />);
    expect(screen.queryByText('5-Tuple')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Тесты/i })).toBeInTheDocument();
  });

  it('opens and closes the project credits from the brand', () => {
    render(<HeaderNavbar />);
    const brand = screen.getByRole('button', { name: 'nojstd' });
    fireEvent.click(brand);
    expect(screen.getByText(/Александр Ведышев и Иван Харьков/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Репозиторий на GitHub/ })).toHaveAttribute('href', 'https://github.com/aleksandrvd131/nojstd8');
    fireEvent.keyDown(brand, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'О проекте nojstd' })).not.toBeInTheDocument();
  });

  it('shows an unsuccessful halt in red and places fast run after step', () => {
    useTuringStore.setState((state) => ({
      runtime: { ...state.runtime, status: 'halted', statusMessage: "Останов: из узла 'r' нет перехода для символа '_'." },
    }));
    render(<DebuggerControls />);
    expect(screen.getByRole('alert')).toHaveClass('text-rose-700');
    const step = screen.getByRole('button', { name: /Шаг Space/ });
    const fast = screen.getByRole('button', { name: /Быстрый запуск/ });
    expect(step.compareDocumentPosition(fast) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each(['hl3', 'half-life 3'])('drops a crowbar for %s without bypassing tape validation', (word) => {
    render(<InfiniteTapeDock />);
    const input = screen.getByPlaceholderText(/Входное слово на ленту/i);
    fireEvent.change(input, { target: { value: word } });
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByTestId('falling-crowbar')).toBeInTheDocument();
    expect(useTuringStore.getState().tapeError).toBeTruthy();
    fireEvent.animationEnd(screen.getByTestId('falling-crowbar'));
    expect(screen.queryByTestId('falling-crowbar')).not.toBeInTheDocument();
  });

  it('InfiniteTapeDock sets head after word, supports keyboard-only cell editing, routes errors to DebuggerControls, and hides Reset Tape', () => {
    render(
      <>
        <InfiniteTapeDock />
        <DebuggerControls />
      </>
    );

    expect(screen.queryByText('Сброс ленты')).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Входное слово на ленту/i);
    fireEvent.change(input, { target: { value: '110' } });
    fireEvent.submit(input.closest('form')!);

    const rt = useTuringStore.getState().runtime;
    expect(rt.tape[0]).toBe('1');
    expect(rt.tape[1]).toBe('1');
    expect(rt.tape[2]).toBe('0');
    expect(rt.headPosition).toBe(3);

    // Typing a valid symbol immediately updates the highlighted head cell without an extra click
    const strip = screen.getByLabelText(/Лента Тьюринга/i);
    fireEvent.keyDown(strip, { key: '1' });
    expect(useTuringStore.getState().runtime.tape[3]).toBe('1');

    // Typing an invalid symbol puts the error into DebuggerControls status bar
    fireEvent.keyDown(strip, { key: 'Z' });
    expect(screen.getByRole('alert')).toHaveTextContent('Символ «Z» отсутствует в алфавите.');

    // Single click on a cell selects it without opening any popup menu and allows immediate keyboard edit
    fireEvent.click(screen.getByTitle(/Ячейка \[0\]/));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.keyDown(strip, { key: '0' });
    expect(useTuringStore.getState().runtime.tape[0]).toBe('0');

    // Scroll right shows "К головке" button and clicking resets offset
    fireEvent.click(screen.getByTitle(/Прокрутить ленту вправо/i));
    const centerBtn = screen.getByText('К головке');
    fireEvent.click(centerBtn);
    expect(screen.queryByText('К головке')).not.toBeInTheDocument();

    // Clear tape empties cells
    fireEvent.click(screen.getByLabelText('Очистить ленту'));
    expect(Object.keys(useTuringStore.getState().runtime.tape)).toHaveLength(0);
  });

  it('focuses the tape on pointer entry without stealing focus from text input', () => {
    render(<InfiniteTapeDock />);
    const strip = screen.getByLabelText(/Лента Тьюринга/i);
    const input = screen.getByPlaceholderText(/Входное слово на ленту/i);
    fireEvent.mouseEnter(strip);
    expect(strip).toHaveFocus();
    const head = useTuringStore.getState().runtime.headPosition;
    fireEvent.keyDown(strip, { key: 'ArrowLeft' });
    expect(useTuringStore.getState().runtime.headPosition).toBe(head - 1);
    input.focus();
    fireEvent.mouseEnter(strip);
    expect(input).toHaveFocus();
  });

  it('fast-runs until the first execution error and shows the failing node', () => {
    act(() => {
      useTuringStore.getState().resetExecution();
      const id = useTuringStore.getState().runtime.currentNodeId;
      useTuringStore.getState().updateActiveProject((project) => ({
        ...project,
        nodes: project.nodes.map((node) => node.id === id
          ? { ...node, data: { ...node.data, opType: 'COMPLEX_MACHINE', subMachineId: 'missing' } }
          : node),
      }));
    });
    const startId = useTuringStore.getState().runtime.currentNodeId;
    render(<DebuggerControls />);
    fireEvent.click(screen.getByRole('button', { name: /Быстрый запуск/i }));
    expect(useTuringStore.getState().runtime.status).toBe('error');
    expect(useTuringStore.getState().runtime.currentNodeId).toBe(startId);
    expect(useTuringStore.getState().isFastRunning).toBe(false);
  });

  it('shows imported function code and project description on its node', () => {
    const source = { ...INITIAL_PROJECTS[0], id: 'source-for-s', name: 'Source', description: 'Описание исходной машины' };
    useTuringStore.setState((state) => ({ projects: [...state.projects, source] }));
    expect(useTuringStore.getState().addProjectFunction(source.id, 'S')).toBe(true);
    const node = useTuringStore.getState().getActiveProject().nodes.find((n) => n.data.subMachineName === source.name)!;
    render(
      <ReactFlowProvider>
        <OperationNode {...({ id: node.id, data: node.data, selected: false } as any)} />
      </ReactFlowProvider>
    );
    expect(screen.getAllByText('S').length).toBeGreaterThan(0);
    expect(screen.getByText('Описание исходной машины')).toBeInTheDocument();
    expect(screen.queryByText('K')).not.toBeInTheDocument();
  });

  it('NodeInspector updates selected node label', () => {
    useTuringStore.getState().setSelectedNodeId('vtm_mark_x');
    render(<NodeInspector />);

    const labelInput = screen.getByDisplayValue('Запись [*]');
    fireEvent.change(labelInput, { target: { value: 'Маркер [*]' } });

    const node = useTuringStore.getState().getActiveProject().nodes.find((n) => n.id === 'vtm_mark_x');
    expect(node?.data.label).toBe('Маркер [*]');
  });

  it('ExportModal renders TikZ tab with tikzpicture output', () => {
    useTuringStore.getState().setExportModalOpen(true);
    render(<ExportModal />);

    fireEvent.click(screen.getByText('TikZ'));
    expect(screen.getByDisplayValue(/\\begin\{tikzpicture\}/)).toBeInTheDocument();
  });

  it('ConfirmModal opens on openConfirmModal and runs callback on confirm', () => {
    let confirmed = false;
    render(<ConfirmModal />);
    act(() => {
      useTuringStore.getState().openConfirmModal({
        title: 'Подтверждение',
        message: 'Продолжить действие?',
        confirmLabel: 'Подтвердить',
        onConfirm: () => {
          confirmed = true;
        },
      });
    });

    expect(screen.getByText('Подтверждение')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Подтвердить'));
    expect(confirmed).toBe(true);
  });

  it('SessionManagerDrawer confirms deletion inline without native confirm and creates VTM projects', () => {
    useTuringStore.getState().createProject('4-tuple', 'operational', 'Вторая ВТМ');
    useTuringStore.getState().setSessionDrawerOpen(true);
    render(<SessionManagerDrawer />);

    expect(screen.queryByText(/5-кортежи/)).not.toBeInTheDocument();
    const initialCount = useTuringStore.getState().projects.length;
    const deleteButtons = screen.getAllByTitle('Удалить');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Удалить?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Удалить?'));
    expect(useTuringStore.getState().projects.length).toBe(initialCount - 1);
  });

  it('opens cosmetic settings popup from HeaderNavbar and updates theme, canvas, and edge rule visibility', () => {
    render(
      <>
        <HeaderNavbar />
        <DiagramSettingsModal />
        <ReactFlowProvider>
          <ReactFlow nodes={[]} edges={[]} />
          <svg>
            <CustomTransitionEdge
              {...({
                id: 'e_test',
                source: 'a',
                target: 'b',
                sourceX: 0,
                sourceY: 0,
                targetX: 100,
                targetY: 0,
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
                selected: false,
                data: {
                  mode: '4-tuple',
                  subMode: 'operational',
                  rules: [{ id: 'r_test', readSymbol: '*', isWildcard: true }],
                },
              } as any)}
            />
          </svg>
        </ReactFlowProvider>
      </>
    );

    expect(screen.queryByRole('dialog', { name: 'Настройки оформления диаграммера' })).not.toBeInTheDocument();
    expect(screen.getByTitle('Нажмите для редактирования правила')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Настройки оформления диаграммера' }));
    expect(screen.getByRole('dialog', { name: 'Настройки оформления диаграммера' })).toBeInTheDocument();

    // Theme switching
    fireEvent.click(screen.getByRole('button', { name: 'Светлая' }));
    expect(useTuringStore.getState().theme).toBe('light');

    // Canvas background switching
    fireEvent.click(screen.getByRole('button', { name: 'Сетка' }));
    expect(useTuringStore.getState().canvasBackground).toBe('lines');

    // MiniMap and Canvas Controls toggles
    const miniMapToggle = screen.getByRole('switch', { name: 'Показывать миникарту' });
    fireEvent.click(miniMapToggle);
    expect(useTuringStore.getState().showMiniMap).toBe(false);

    const controlsToggle = screen.getByRole('switch', { name: 'Показывать панель масштаба' });
    fireEvent.click(controlsToggle);
    expect(useTuringStore.getState().showCanvasControls).toBe(false);

    // Hide edge rules toggle
    const rulesToggle = screen.getByRole('switch', { name: 'Скрывать правила переходов' });
    expect(rulesToggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(rulesToggle);
    expect(rulesToggle).toHaveAttribute('aria-checked', 'true');
    expect(useTuringStore.getState().hideEdgeRules).toBe(true);
    expect(screen.queryByTitle('Нажмите для редактирования правила')).not.toBeInTheDocument();

    act(() => {
      useTuringStore.getState().setSelectedEdgeId('e_test');
    });
    expect(screen.getByTitle('Нажмите для редактирования правила')).toBeInTheDocument();

    act(() => {
      useTuringStore.getState().setSelectedEdgeId(null);
    });
    expect(screen.queryByTitle('Нажмите для редактирования правила')).not.toBeInTheDocument();

    // Reset restores defaults
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
    expect(useTuringStore.getState().theme).toBe('dark');
    expect(useTuringStore.getState().canvasBackground).toBe('dots');
    expect(useTuringStore.getState().showMiniMap).toBe(true);
    expect(useTuringStore.getState().showCanvasControls).toBe(true);
    expect(useTuringStore.getState().hideEdgeRules).toBe(false);

    // Escape closes the settings popup
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Настройки оформления диаграммера' })).not.toBeInTheDocument();
  });
});
