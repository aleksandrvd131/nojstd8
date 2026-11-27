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
import { SessionManagerDrawer } from './sidebar/SessionManagerDrawer';
import { VTMCodeInput } from './inspector/VTMCodeInput';
import { HeaderNavbar } from './navbar/HeaderNavbar';
import { App } from '../App';

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
    isSessionDrawerOpen: false,
    keyboardShortcutsEnabled: true,
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
});
