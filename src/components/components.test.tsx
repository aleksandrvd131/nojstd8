import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { INITIAL_PROJECTS } from '../store/demoProjects';
import { useTuringStore } from '../store/useTuringStore';
import { initRuntimeState } from '../engine/simulator';
import { ProjectSession } from '../types/turing';
import { RuleModal } from './canvas/RuleModal';
import { NodeInspector } from './canvas/NodeInspector';
import { DiagnosticsPanel } from './inspector/DiagnosticsPanel';
import { MatrixEditor } from './inspector/MatrixEditor';
import { BatchTestRunner } from './tape/BatchTestRunner';
import { InfiniteTapeDock } from './tape/InfiniteTapeDock';
import { ExportModal } from './navbar/ExportModal';
import { ConfirmModal } from './navbar/ConfirmModal';
import { SessionManagerDrawer } from './sidebar/SessionManagerDrawer';

function resetStore(projectId = INITIAL_PROJECTS[0].id) {
  const freshProjects: ProjectSession[] = JSON.parse(JSON.stringify(INITIAL_PROJECTS));
  const active = freshProjects.find((p) => p.id === projectId) || freshProjects[0];
  useTuringStore.setState({
    projects: freshProjects,
    activeProjectId: active.id,
    runtime: initRuntimeState(active),
    isRunning: false,
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

  it('DiagnosticsPanel reacts to store mutations via useActiveProject', () => {
    render(<DiagnosticsPanel />);
    expect(screen.getByText('Корректна')).toBeInTheDocument();

    // Remove initial state designation -> DiagnosticsPanel must reactively show error
    act(() => {
      useTuringStore.getState().updateNodeData('q0', { stateType: 'normal' });
    });
    expect(screen.getByText(/Отсутствует начальное состояние/i)).toBeInTheDocument();
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
    fireEvent.change(screen.getByPlaceholderText('Вход (Input)'), { target: { value: '1#0' } });
    fireEvent.change(screen.getByPlaceholderText('Ожидание (Exp)'), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Добавить тест в набор'));

    expect(screen.getByText('Новый тест')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Запустить все тесты'));
    expect(screen.getByText('4')).toBeInTheDocument();

    // Add a test requiring accept halt
    fireEvent.change(screen.getByPlaceholderText('Название (опц.)'), { target: { value: 'Accept тест' } });
    fireEvent.change(screen.getByLabelText('Ожидаемый останов'), { target: { value: 'accept' } });
    fireEvent.change(screen.getByPlaceholderText('Вход (Input)'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Добавить тест в набор'));
    expect(screen.getByText('accept')).toBeInTheDocument();

    const loadButtons = screen.getAllByText('На ленту');
    fireEvent.click(loadButtons[0]);
    expect(useTuringStore.getState().runtime.tape[0]).toBe('#');
    expect(useTuringStore.getState().runtime.headPosition).toBe(0);
  });

  it('MatrixEditor shows VTM empty state in operational mode and non-determinism badge in 5-tuple', () => {
    render(<MatrixEditor />);
    expect(screen.getByText(/Матрица Переходов/i)).toBeInTheDocument();

    // Add duplicate (q0, '0') rule -> non-determinism indicator appears
    act(() => {
      useTuringStore.getState().addFiveTupleRule({
        fromState: 'q0',
        readSymbol: '0',
        writeSymbol: '1',
        move: 'L',
        toState: 'q_halt',
      });
    });
    expect(screen.getByText(/Недетерм\. \(2\)/)).toBeInTheDocument();

    // Switch to operational VTM project
    act(() => {
      useTuringStore.getState().switchProject('demo-project-vtm-copy');
    });
    expect(screen.getByText(/Матрица переходов неприменима к операционным блок-схемам/i)).toBeInTheDocument();
  });

  it('InfiniteTapeDock loads input word, centers head, and clears tape', () => {
    render(<InfiniteTapeDock />);
    const input = screen.getByPlaceholderText(/Входное слово на ленту/i);
    fireEvent.change(input, { target: { value: '110' } });
    fireEvent.submit(input.closest('form')!);

    const rt = useTuringStore.getState().runtime;
    expect(rt.tape[0]).toBe('1');
    expect(rt.tape[1]).toBe('1');
    expect(rt.tape[2]).toBe('0');

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
    useTuringStore.getState().setSelectedNodeId('q0');
    render(<NodeInspector />);

    const labelInput = screen.getByDisplayValue('q0');
    fireEvent.change(labelInput, { target: { value: 'q_start' } });

    const node = useTuringStore.getState().getActiveProject().nodes.find((n) => n.id === 'q0');
    expect(node?.data.label).toBe('q_start');
  });

  it('ExportModal renders TikZ tab with tikzpicture output', () => {
    useTuringStore.getState().setExportModalOpen(true);
    render(<ExportModal />);

    fireEvent.click(screen.getByText('TikZ'));
    expect(screen.getByDisplayValue(/\\begin\{tikzpicture\}/)).toBeInTheDocument();
  });

  it('ConfirmModal opens on destructive VTM switch and applies switch on confirm', () => {
    render(<ConfirmModal />);
    act(() => {
      useTuringStore.getState().switchMode('4-tuple', 'operational');
    });

    expect(screen.getByText('Переключение в режим VTM')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Переключить'));
    expect(useTuringStore.getState().getActiveProject().subMode).toBe('operational');
  });

  it('SessionManagerDrawer confirms deletion inline without native confirm', () => {
    useTuringStore.getState().setSessionDrawerOpen(true);
    render(<SessionManagerDrawer />);

    const initialCount = useTuringStore.getState().projects.length;
    const deleteButtons = screen.getAllByTitle('Удалить');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Удалить?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Удалить?'));
    expect(useTuringStore.getState().projects.length).toBe(initialCount - 1);
  });
});
