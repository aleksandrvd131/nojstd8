import React, { useState } from 'react';
import { useTuringStore, useActiveProject } from '../../store/useTuringStore';
import {
  Cpu,
  FolderOpen,
  BookOpen,
  Share2,
  Sun,
  Moon,
  Info,
  Check,
  Edit2,
} from 'lucide-react';

export const HeaderNavbar: React.FC = () => {
  const theme = useTuringStore((s) => s.theme);
  const toggleTheme = useTuringStore((s) => s.toggleTheme);
  const setSessionDrawerOpen = useTuringStore((s) => s.setSessionDrawerOpen);
  const setAlphabetModalOpen = useTuringStore((s) => s.setAlphabetModalOpen);
  const setExportModalOpen = useTuringStore((s) => s.setExportModalOpen);
  const switchMode = useTuringStore((s) => s.switchMode);
  const renameProject = useTuringStore((s) => s.renameProject);
  const updateProjectDescription = useTuringStore((s) => s.updateProjectDescription);
  const projects = useTuringStore((s) => s.projects);

  const project = useActiveProject();

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
    <header className="h-12 px-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 select-none z-20 text-xs">
      {/* Left: Brand & Project Name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-xs font-mono uppercase">
              Turing<span className="text-sky-500">IDE</span>
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
              v1.0
            </span>
          </div>
        </div>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

        {/* Project Name & Description */}
        <div className="flex items-center gap-1.5 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="px-2 py-0.5 text-xs font-semibold rounded bg-zinc-100 dark:bg-zinc-800 border border-sky-500 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
              />
              <button
                type="button"
                onClick={handleTitleSubmit}
                className="p-1 rounded bg-sky-600 hover:bg-sky-500 text-white"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <button
                type="button"
                onClick={() => {
                  setTitleInput(project.name);
                  setIsEditingTitle(true);
                }}
                className="font-medium text-zinc-800 dark:text-zinc-200 hover:text-sky-600 dark:hover:text-sky-400 truncate text-left max-w-[180px] md:max-w-[260px] transition-colors"
                title="Нажмите для переименования"
              >
                {project.name}
              </button>
              <Edit2 className="w-2.5 h-2.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Condition / Description popover button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDescInput(project.description);
                setIsDescriptionOpen(!isDescriptionOpen);
              }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Условие задачи и примечания"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {isDescriptionOpen && (
              <div className="absolute top-8 left-0 w-80 p-3.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50">
                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Условие задачи и заметки
                </h4>
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Запишите сюда текст лабораторной работы, формулировку алгоритма или заметки..."
                  rows={4}
                  className="w-full p-2 text-xs rounded bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:border-sky-500 font-sans"
                />
                <div className="flex justify-end gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsDescriptionOpen(false)}
                    className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDescription}
                    className="px-3 py-1 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors shadow-sm"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Minimalist Mode Switcher */}
      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/90 p-0.5 rounded border border-zinc-200 dark:border-zinc-700/80 font-mono text-[11px]">
        <button
          type="button"
          onClick={() => switchMode('5-tuple')}
          className={`px-2.5 py-1 rounded transition-colors ${
            project.mode === '5-tuple'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold shadow-sm border border-zinc-200 dark:border-zinc-700'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          title="Классический режим 5-tuples: (q, a, a', d, q')"
        >
          5-Tuple
        </button>

        <button
          type="button"
          onClick={() => switchMode('4-tuple', 'state-graph')}
          className={`px-2.5 py-1 rounded transition-colors ${
            project.mode === '4-tuple' && project.subMode === 'state-graph'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold shadow-sm border border-zinc-200 dark:border-zinc-700'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          title="Режим 4-tuples: Граф состояний с раздельным сдвигом/записью"
        >
          4-Tuple (Граф)
        </button>

        <button
          type="button"
          onClick={() => switchMode('4-tuple', 'operational')}
          className={`px-2.5 py-1 rounded transition-colors ${
            project.mode === '4-tuple' && project.subMode === 'operational'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold shadow-sm border border-zinc-200 dark:border-zinc-700'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          title="Режим 4-tuples: Операционная блок-схема VTM"
        >
          4-Tuple (VTM)
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        {/* Alphabet Trigger */}
        <button
          type="button"
          onClick={() => setAlphabetModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-xs transition-colors"
          title="Настройка алфавита машины"
        >
          <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
          <span className="hidden md:inline font-sans">A:</span>
          <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">
            {`{${project.alphabet.symbols.slice(0, 3).join(',')}${
              project.alphabet.symbols.length > 3 ? '…' : ''
            },${project.alphabet.blankSymbol}}`}
          </span>
        </button>

        {/* Sessions Drawer Trigger */}
        <button
          type="button"
          onClick={() => setSessionDrawerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-xs transition-colors"
          title="Список проектов и демонстраций"
        >
          <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
          <span className="hidden lg:inline font-sans">Проекты</span>
          <span className="text-[10px] px-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono">
            {projects.length}
          </span>
        </button>

        {/* Export Trigger */}
        <button
          type="button"
          onClick={() => setExportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-colors"
          title="Экспорт проекта (LaTeX, JSON, PlantUML, Markdown, PNG)"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Экспорт</span>
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-zinc-600" />}
        </button>
      </div>
    </header>
  );
};
