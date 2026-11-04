import React, { useState } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import {
  FolderOpen,
  Plus,
  Copy,
  Trash2,
  Edit2,
  X,
  Search,
  Upload,
  Download,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { TuringMode, FourTupleSubMode, ProjectSession } from '../../types/turing';
import { exportProjectToJSON, importProjectFromJSON } from '../../engine/exporter';

export const SessionManagerDrawer: React.FC = () => {
  const isSessionDrawerOpen = useTuringStore((s) => s.isSessionDrawerOpen);
  const setSessionDrawerOpen = useTuringStore((s) => s.setSessionDrawerOpen);
  const projects = useTuringStore((s) => s.projects);
  const activeProjectId = useTuringStore((s) => s.activeProjectId);
  const switchProject = useTuringStore((s) => s.switchProject);
  const createProject = useTuringStore((s) => s.createProject);
  const duplicateProject = useTuringStore((s) => s.duplicateProject);
  const renameProject = useTuringStore((s) => s.renameProject);
  const deleteProject = useTuringStore((s) => s.deleteProject);
  const importProject = useTuringStore((s) => s.importProject);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // New project modal state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectMode, setNewProjectMode] = useState<TuringMode>('5-tuple');
  const [newProjectSubMode, setNewProjectSubMode] = useState<FourTupleSubMode>('state-graph');

  if (!isSessionDrawerOpen) return null;

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartRename = (e: React.MouseEvent, p: ProjectSession) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditingName(p.name);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      renameProject(id, editingName.trim());
    }
    setEditingId(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProject(newProjectMode, newProjectSubMode, newProjectName.trim() || undefined);
    setIsCreatingNew(false);
    setNewProjectName('');
  };

  const handleExportJSON = (e: React.MouseEvent, p: ProjectSession) => {
    e.stopPropagation();
    const json = exportProjectToJSON(p);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name.replace(/\s+/g, '_')}_turing.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importProjectFromJSON(content);
        importProject(imported);
      } catch (err: any) {
        alert('Ошибка при импорте JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Менеджер Проектов & Сессий
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Автосохранение в localStorage • {projects.length} сохранено
              </p>
            </div>
          </div>
          <button
            onClick={() => setSessionDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search, New Project, Import */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Импорт</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </label>

          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Новый проект</span>
          </button>
        </div>

        {/* New Project Inline Modal / Form */}
        {isCreatingNew && (
          <form
            onSubmit={handleCreateSubmit}
            className="p-4 bg-sky-50/50 dark:bg-sky-950/20 border-b border-sky-200 dark:border-sky-900 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Создание новой машины Тьюринга
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                Отмена
              </button>
            </div>

            <input
              type="text"
              placeholder="Название проекта (например, Сложение унарных чисел)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              autoFocus
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Математический режим
                </label>
                <select
                  value={newProjectMode}
                  onChange={(e) => setNewProjectMode(e.target.value as TuringMode)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="5-tuple">5-кортежи (q, a, a', d, q')</option>
                  <option value="4-tuple">4-кортежи (q, a, C, q')</option>
                </select>
              </div>

              {newProjectMode === '4-tuple' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Визуальное представление
                  </label>
                  <select
                    value={newProjectSubMode}
                    onChange={(e) => setNewProjectSubMode(e.target.value as FourTupleSubMode)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    <option value="state-graph">Граф состояний</option>
                    <option value="operational">Операционная диаграмма VTM</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white"
            >
              Создать и открыть
            </button>
          </form>
        )}

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredProjects.map((p) => {
            const isActive = p.id === activeProjectId;
            const ruleCount = p.mode === '5-tuple' ? p.rules5.length : p.rules4.length;
            const dateStr = new Date(p.updatedAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={p.id}
                onClick={() => {
                  switchProject(p.id);
                  setSessionDrawerOpen(false);
                }}
                className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-400 dark:border-sky-600 ring-2 ring-sky-400/20'
                    : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="px-2 py-1 text-sm font-bold rounded bg-slate-100 dark:bg-slate-700 border border-sky-500 text-slate-900 dark:text-slate-100"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(p.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(p.id)}
                          className="px-2 py-1 text-xs bg-sky-600 text-white rounded font-medium"
                        >
                          ОК
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {p.name}
                        </h4>
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            Активен
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {p.description || 'Нет описания'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(e, p)}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Переименовать"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateProject(p.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Дублировать (Копия)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleExportJSON(e, p)}
                      className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Экспорт в JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Удалить проект "${p.name}"?`)) {
                            deleteProject(p.id);
                          }
                        }}
                        className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Badges / Stats */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {p.mode === '5-tuple' ? 'Пятёрки (5-tuple)' : `Четвёрки (${p.subMode})`}
                  </span>
                  <span>•</span>
                  <span>{p.nodes.length} состояний/узлов</span>
                  <span>•</span>
                  <span>{ruleCount} правил</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[10px]">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {dateStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
