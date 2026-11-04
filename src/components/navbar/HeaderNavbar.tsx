import React, { useState } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import {
  Cpu,
  FolderOpen,
  BookOpen,
  Share2,
  Sun,
  Moon,
  ChevronDown,
  Info,
  Check,
} from 'lucide-react';
import { TuringMode, FourTupleSubMode } from '../../types/turing';

export const HeaderNavbar: React.FC = () => {
  const getActiveProject = useTuringStore((s) => s.getActiveProject);
  const theme = useTuringStore((s) => s.theme);
  const toggleTheme = useTuringStore((s) => s.toggleTheme);
  const setSessionDrawerOpen = useTuringStore((s) => s.setSessionDrawerOpen);
  const setAlphabetModalOpen = useTuringStore((s) => s.setAlphabetModalOpen);
  const setExportModalOpen = useTuringStore((s) => s.setExportModalOpen);
  const setMode = useTuringStore((s) => s.setMode);
  const setSubMode = useTuringStore((s) => s.setSubMode);
  const renameProject = useTuringStore((s) => s.renameProject);
  const updateProjectDescription = useTuringStore((s) => s.updateProjectDescription);
  const projects = useTuringStore((s) => s.projects);

  const project = getActiveProject();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [descInput, setDescInput] = useState(project.description);

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      renameProject(project.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    updateProjectDescription(project.id, descInput);
    setIsDescriptionOpen(false);
  };

  return (
    <header className="h-14 px-4 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 backdrop-blur-md select-none z-20">
      {/* Brand & Project Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>TuringIDE</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                Next-Gen
              </span>
            </h1>
          </div>
        </div>

        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        {/* Project Name & Condition description */}
        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 border border-sky-500 text-slate-900 dark:text-slate-100"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
              />
              <button
                type="button"
                onClick={handleTitleSubmit}
                className="p-1 rounded bg-sky-600 text-white"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTitleInput(project.name);
                setIsEditingTitle(true);
              }}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-sky-600 truncate text-left max-w-[200px] md:max-w-[280px]"
              title="Нажмите для переименования проекта"
            >
              {project.name}
            </button>
          )}

          {/* Condition / Description popup button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDescInput(project.description);
                setIsDescriptionOpen(!isDescriptionOpen);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Условие задачи и комментарии к состояниям"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {isDescriptionOpen && (
              <div className="absolute top-8 left-0 w-80 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Условие задачи и комментарии
                </h4>
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Запишите сюда текст лабораторной работы, формулировку алгоритма или заметки..."
                  rows={4}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsDescriptionOpen(false)}
                    className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDescription}
                    className="px-3 py-1 text-xs font-semibold bg-sky-600 text-white rounded-lg"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Mode Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMode('5-tuple')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            project.mode === '5-tuple'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          title="Классический режим в пятёрках: одновременная запись и сдвиг головки"
        >
          Пятёрки (5-tuple)
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('4-tuple');
            setSubMode('state-graph');
          }}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            project.mode === '4-tuple' && project.subMode === 'state-graph'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          title="Режим в четвёрках: граф состояний с разделением сдвига и записи"
        >
          Четвёрки (Граф)
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('4-tuple');
            setSubMode('operational');
          }}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            project.mode === '4-tuple' && project.subMode === 'operational'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          title="Режим в четвёрках: Операционная диаграмма VTM с примитивными блоками"
        >
          Четвёрки (VTM)
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Alphabet Trigger */}
        <button
          type="button"
          onClick={() => setAlphabetModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          title="Настройка алфавита"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden md:inline">Алфавит:</span>
          <span className="font-mono text-sky-600 dark:text-sky-400">
            {`{${project.alphabet.symbols.slice(0, 3).join(',')}${
              project.alphabet.symbols.length > 3 ? '...' : ''
            },${project.alphabet.blankSymbol}}`}
          </span>
        </button>

        {/* Sessions Drawer Trigger */}
        <button
          type="button"
          onClick={() => setSessionDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          title="Список проектов и лабораторных работ"
        >
          <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden lg:inline">Проекты</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {projects.length}
          </span>
        </button>

        {/* Export Trigger */}
        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors"
          title="Экспорт проекта (LaTeX, JSON, PlantUML, PNG)"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Экспорт</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>
    </header>
  );
};
