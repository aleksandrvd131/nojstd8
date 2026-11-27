import { ProjectSession } from '../types/turing';

export const DEMO_PROJECT_1: ProjectSession = {
  id: 'demo-project-5tuple-replace',
  name: 'Замена # и $ на нули (5-tuple)',
  description: 'Программа считывает цепочку из символов {#, $, 1, 0} и заменяет все служебные маркеры (# и $) на нули. При достижении пустого символа работа завершается.',
  mode: '5-tuple',
  subMode: 'state-graph',
  alphabet: {
    symbols: ['0', '1', '#', '$'],
    blankSymbol: '_',
  },
  nodes: [
    {
      id: 'q0',
      type: 'stateNode',
      position: { x: 150, y: 180 },
      data: {
        label: 'q0',
        stateType: 'initial',
        description: 'Сканирование ленты слева направо и замена маркеров',
      },
    },
    {
      id: 'q_halt',
      type: 'stateNode',
      position: { x: 480, y: 180 },
      data: {
        label: 'q_halt',
        stateType: 'halt',
        description: 'Успешный останов при обнаружении конца слова',
      },
    },
  ],
  edges: [
    {
      id: 'edge_q0_q0',
      source: 'q0',
      target: 'q0',
      type: 'customTransition',
      data: {
        mode: '5-tuple',
        subMode: 'state-graph',
        rules: [
          { id: 'r1', readSymbol: '#', writeSymbol: '0', move: 'R' },
          { id: 'r2', readSymbol: '$', writeSymbol: '0', move: 'R' },
          { id: 'r3', readSymbol: '0', writeSymbol: '0', move: 'R' },
          { id: 'r4', readSymbol: '1', writeSymbol: '1', move: 'R' },
        ],
      },
    },
    {
      id: 'edge_q0_q_halt',
      source: 'q0',
      target: 'q_halt',
      type: 'customTransition',
      data: {
        mode: '5-tuple',
        subMode: 'state-graph',
        rules: [
          { id: 'r5', readSymbol: '_', writeSymbol: '_', move: 'N' },
        ],
      },
    },
  ],
  rules5: [
    { id: 'r1', fromState: 'q0', readSymbol: '#', writeSymbol: '0', move: 'R', toState: 'q0' },
    { id: 'r2', fromState: 'q0', readSymbol: '$', writeSymbol: '0', move: 'R', toState: 'q0' },
    { id: 'r3', fromState: 'q0', readSymbol: '0', writeSymbol: '0', move: 'R', toState: 'q0' },
    { id: 'r4', fromState: 'q0', readSymbol: '1', writeSymbol: '1', move: 'R', toState: 'q0' },
    { id: 'r5', fromState: 'q0', readSymbol: '_', writeSymbol: '_', move: 'N', toState: 'q_halt' },
  ],
  rules4: [],
  subMachines: [],
  initialTape: {},
  initialHeadPosition: 0,
  testCases: [
    {
      id: 'tc1',
      name: 'Маркеры и цифры',
      inputTape: '#10$1#$',
      expectedTape: '0100100',
      expectedHeadPos: 7,
      status: 'idle',
    },
    {
      id: 'tc2',
      name: 'Только цифры',
      inputTape: '1010',
      expectedTape: '1010',
      expectedHeadPos: 4,
      status: 'idle',
    },
    {
      id: 'tc3',
      name: 'Только маркеры',
      inputTape: '##$$',
      expectedTape: '0000',
      expectedHeadPos: 4,
      status: 'idle',
    },
  ],
  createdAt: 1730764800000,
  updatedAt: 1730764800000,
};

export const DEMO_PROJECT_2: ProjectSession = {
  id: 'demo-project-4tuple-increment',
  name: 'Инкремент двоичного числа (4-tuple)',
  description: 'Прибавление единицы к двоичному числу без знака в режиме четвёрок. Разделяет сдвиг и запись на отдельные такты автомата.',
  mode: '4-tuple',
  subMode: 'state-graph',
  alphabet: {
    symbols: ['0', '1'],
    blankSymbol: '_',
  },
  nodes: [
    {
      id: 'q_find_end',
      type: 'stateNode',
      position: { x: 100, y: 180 },
      data: {
        label: 'q_find_end',
        stateType: 'initial',
        description: 'Поиск правого конца двоичного слова',
      },
    },
    {
      id: 'q_step_back',
      type: 'stateNode',
      position: { x: 350, y: 180 },
      data: {
        label: 'q_step_back',
        stateType: 'normal',
        description: 'Возврат на младший разряд числа',
      },
    },
    {
      id: 'q_add',
      type: 'stateNode',
      position: { x: 600, y: 180 },
      data: {
        label: 'q_add',
        stateType: 'normal',
        description: 'Прибавление единицы в младший разряд с учётом переноса',
      },
    },
    {
      id: 'q_shift_left',
      type: 'stateNode',
      position: { x: 600, y: 360 },
      data: {
        label: 'q_shift_left',
        stateType: 'normal',
        description: 'Сдвиг влево при распространении переноса',
      },
    },
    {
      id: 'q_halt',
      type: 'stateNode',
      position: { x: 850, y: 180 },
      data: {
        label: 'q_halt',
        stateType: 'halt',
        description: 'Завершение вычислений',
      },
    },
  ],
  edges: [
    {
      id: 'edge_find_end_loop',
      source: 'q_find_end',
      target: 'q_find_end',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'state-graph',
        rules: [
          { id: 'r1', readSymbol: '0', command: 'R' },
          { id: 'r2', readSymbol: '1', command: 'R' },
        ],
      },
    },
    {
      id: 'edge_find_to_back',
      source: 'q_find_end',
      target: 'q_step_back',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'state-graph',
        rules: [{ id: 'r3', readSymbol: '_', command: 'L' }],
      },
    },
    {
      id: 'edge_back_to_add',
      source: 'q_step_back',
      target: 'q_add',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'state-graph',
        rules: [
          { id: 'r4', readSymbol: '0', command: 'N' },
          { id: 'r5', readSymbol: '1', command: 'N' },
          { id: 'r6', readSymbol: '_', command: 'N' },
        ],
      },
    },
    {
      id: 'edge_add_to_halt',
      source: 'q_add',
      target: 'q_halt',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'state-graph',
        rules: [
          { id: 'r7', readSymbol: '0', command: '1' },
          { id: 'r8', readSymbol: '_', command: '1' },
        ],
      },
    },
    {
      id: 'edge_add_to_carry',
      source: 'q_add',
      target: 'q_shift_left',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'state-graph',
        rules: [{ id: 'r9', readSymbol: '1', command: '0' }],
      },
    },
    {
      id: 'edge_carry_to_add',
      source: 'q_shift_left',
      target: 'q_add',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'state-graph',
        rules: [
          { id: 'r10', readSymbol: '0', command: 'L' },
          { id: 'r11', readSymbol: '1', command: 'L' },
          { id: 'r12', readSymbol: '_', command: 'L' },
        ],
      },
    },
  ],
  rules5: [],
  rules4: [
    { id: 'r1', fromState: 'q_find_end', readSymbol: '0', command: 'R', toState: 'q_find_end' },
    { id: 'r2', fromState: 'q_find_end', readSymbol: '1', command: 'R', toState: 'q_find_end' },
    { id: 'r3', fromState: 'q_find_end', readSymbol: '_', command: 'L', toState: 'q_step_back' },
    { id: 'r4', fromState: 'q_step_back', readSymbol: '0', command: 'N', toState: 'q_add' },
    { id: 'r5', fromState: 'q_step_back', readSymbol: '1', command: 'N', toState: 'q_add' },
    { id: 'r6', fromState: 'q_step_back', readSymbol: '_', command: 'N', toState: 'q_add' },
    { id: 'r7', fromState: 'q_add', readSymbol: '0', command: '1', toState: 'q_halt' },
    { id: 'r8', fromState: 'q_add', readSymbol: '_', command: '1', toState: 'q_halt' },
    { id: 'r9', fromState: 'q_add', readSymbol: '1', command: '0', toState: 'q_shift_left' },
    { id: 'r10', fromState: 'q_shift_left', readSymbol: '0', command: 'L', toState: 'q_add' },
    { id: 'r11', fromState: 'q_shift_left', readSymbol: '1', command: 'L', toState: 'q_add' },
    { id: 'r12', fromState: 'q_shift_left', readSymbol: '_', command: 'L', toState: 'q_add' },
  ],
  subMachines: [],
  initialTape: {
    0: '1',
    1: '0',
    2: '1',
    3: '1',
  },
  initialHeadPosition: 0,
  testCases: [
    {
      id: 'tc_inc1',
      name: 'Число 1011 (11) -> 1100 (12)',
      inputTape: '1011',
      expectedTape: '1100',
      status: 'idle',
    },
    {
      id: 'tc_inc2',
      name: 'Число 111 (7) -> 1000 (8)',
      inputTape: '111',
      expectedTape: '1000',
      status: 'idle',
    },
    {
      id: 'tc_inc3',
      name: 'Число 0 -> 1',
      inputTape: '0',
      expectedTape: '1',
      status: 'idle',
    },
  ],
  createdAt: 1730764800000,
  updatedAt: 1730764800000,
};

export const DEMO_PROJECT_3: ProjectSession = {
  id: 'demo-project-vtm-copy',
  name: 'Копирование слова через # (VTM Диаграмма)',
  description: 'Академическая операционная диаграмма Тьюринга в стандарте VTM. Циклически копирует унарное слово из единиц слева от # вправо от # с маркировкой обработанных символов.',
  mode: '4-tuple',
  subMode: 'operational',
  alphabet: {
    symbols: ['0', '1', '#', '*'],
    blankSymbol: '_',
  },
  nodes: [
    {
      id: 'vtm_start',
      type: 'operationNode',
      position: { x: 60, y: 150 },
      data: {
        label: 'START',
        opType: 'START',
        description: 'Точка входа на операционную диаграмму',
      },
    },
    {
      id: 'vtm_seek_left',
      type: 'operationNode',
      position: { x: 60, y: -30 },
      data: {
        label: 'Шаг к слову [l]',
        opType: 'SHIFT_L',
        description: 'Сдвиг влево с пустой клетки после слова',
      },
    },
    {
      id: 'vtm_rewind',
      type: 'operationNode',
      position: { x: 240, y: -30 },
      data: {
        label: 'В начало [L]',
        opType: 'SEARCH_L',
        description: 'Переход к левой границе слова',
      },
    },
    {
      id: 'vtm_to_first',
      type: 'operationNode',
      position: { x: 420, y: -30 },
      data: {
        label: 'На первый [r]',
        opType: 'SHIFT_R',
        description: 'Установка головки на первый символ слова',
      },
    },
    {
      id: 'vtm_mark_x',
      type: 'operationNode',
      position: { x: 260, y: 90 },
      data: {
        label: 'Запись [*]',
        opType: 'WRITE_SYM',
        symbolToWrite: '*',
        description: 'Временная маркировка обработанного символа',
      },
    },
    {
      id: 'vtm_search_right',
      type: 'operationNode',
      position: { x: 460, y: 90 },
      data: {
        label: 'Поиск R (_)',
        opType: 'SEARCH_R',
        description: 'Переход вправо до свободного места ленты',
      },
    },
    {
      id: 'vtm_write_copy',
      type: 'operationNode',
      position: { x: 660, y: 90 },
      data: {
        label: 'Копия [1]',
        opType: 'WRITE_SYM',
        symbolToWrite: '1',
        description: 'Запись скопированного символа',
      },
    },
    {
      id: 'vtm_return_left',
      type: 'operationNode',
      position: { x: 660, y: 240 },
      data: {
        label: 'Поиск L (_)',
        opType: 'SEARCH_L',
        description: 'Возврат влево до левого пробела перед словом',
      },
    },
    {
      id: 'vtm_find_mark',
      type: 'operationNode',
      position: { x: 460, y: 240 },
      data: {
        label: 'К маркеру [*]',
        opType: 'SHIFT_R',
        description: 'Поиск маркера * слева направо',
      },
    },
    {
      id: 'vtm_restore_char',
      type: 'operationNode',
      position: { x: 260, y: 240 },
      data: {
        label: 'Восст. [1]',
        opType: 'WRITE_SYM',
        symbolToWrite: '1',
        description: 'Восстановление исходного символа',
      },
    },
    {
      id: 'vtm_check_char',
      type: 'operationNode',
      position: { x: 60, y: 310 },
      data: {
        label: 'След. [a]',
        opType: 'SHIFT_R',
        description: 'Переход к следующему символу исходного слова',
      },
    },
    {
      id: 'vtm_finish',
      type: 'operationNode',
      position: { x: 260, y: 390 },
      data: {
        label: 'FINISH',
        opType: 'FINISH',
        description: 'Успешное завершение алгоритма копирования',
      },
    },
  ],
  edges: [
    {
      id: 'e_vtm_1',
      source: 'vtm_start',
      target: 'vtm_mark_x',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r1', readSymbol: '1' }],
      },
    },
    {
      id: 'e_vtm_start_finish',
      source: 'vtm_start',
      target: 'vtm_finish',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [
          { id: 'r1_hash', readSymbol: '#' },
        ],
      },
    },
    {
      id: 'e_vtm_start_seek',
      source: 'vtm_start',
      target: 'vtm_seek_left',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [
          { id: 'r1_blank', readSymbol: '_' },
        ],
      },
    },
    {
      id: 'e_vtm_seek_rewind',
      source: 'vtm_seek_left',
      target: 'vtm_rewind',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r_seek_rewind', readSymbol: '*', isWildcard: true }],
      },
    },
    {
      id: 'e_vtm_rewind_first',
      source: 'vtm_rewind',
      target: 'vtm_to_first',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r_rewind_first', readSymbol: '_', isWildcard: true }],
      },
    },
    {
      id: 'e_vtm_first_mark',
      source: 'vtm_to_first',
      target: 'vtm_mark_x',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r_first_mark', readSymbol: '1' }],
      },
    },
    {
      id: 'e_vtm_first_finish',
      source: 'vtm_to_first',
      target: 'vtm_finish',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r_first_finish', readSymbol: '*', isWildcard: true }],
      },
    },
    {
      id: 'e_vtm_4',
      source: 'vtm_mark_x',
      target: 'vtm_search_right',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r4', readSymbol: '*', isWildcard: true }],
      },
    },
    {
      id: 'e_vtm_5',
      source: 'vtm_search_right',
      target: 'vtm_write_copy',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r5', readSymbol: '_' }],
      },
    },
    {
      id: 'e_vtm_6',
      source: 'vtm_write_copy',
      target: 'vtm_return_left',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r6', readSymbol: '*', isWildcard: true }],
      },
    },
    {
      id: 'e_vtm_7',
      source: 'vtm_return_left',
      target: 'vtm_find_mark',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r7', readSymbol: '_', isWildcard: true }],
      },
    },
    {
      id: 'e_vtm_find_loop',
      source: 'vtm_find_mark',
      target: 'vtm_find_mark',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r7_loop', readSymbol: '*', isComplement: true, isWildcard: false }],
      },
    },
    {
      id: 'e_vtm_find_hit',
      source: 'vtm_find_mark',
      target: 'vtm_restore_char',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r7_hit', readSymbol: '*', isWildcard: false }],
      },
    },
    {
      id: 'e_vtm_8',
      source: 'vtm_restore_char',
      target: 'vtm_check_char',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r8', readSymbol: '*', isWildcard: true }],
      },
    },
    {
      id: 'e_vtm_2',
      source: 'vtm_check_char',
      target: 'vtm_mark_x',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [{ id: 'r2', readSymbol: '1' }],
      },
    },
    {
      id: 'e_vtm_3',
      source: 'vtm_check_char',
      target: 'vtm_finish',
      type: 'customTransition',
      data: {
        mode: '4-tuple',
        subMode: 'operational',
        rules: [
          { id: 'r3', readSymbol: '_' },
          { id: 'r3_hash', readSymbol: '#' },
          { id: 'r3_wildcard', readSymbol: '*', isWildcard: true },
        ],
      },
    },
  ],
  rules5: [],
  rules4: [],
  subMachines: [],
  initialTape: {
    0: '1',
    1: '1',
    2: '#',
  },
  initialHeadPosition: 3,
  testCases: [
    {
      id: 'tc_vtm_1',
      name: 'Копирование единицы',
      inputTape: '1#',
      expectedTape: '1#1',
      status: 'idle',
    },
    {
      id: 'tc_vtm_2',
      name: 'Копирование слова 11#',
      inputTape: '11#',
      expectedTape: '11#11',
      status: 'idle',
    },
  ],
  createdAt: 1730764800000,
  updatedAt: 1730764800000,
};

export const INITIAL_PROJECTS: ProjectSession[] = [
  DEMO_PROJECT_3,
];
