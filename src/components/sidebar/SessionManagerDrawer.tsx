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
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { ProjectSession } from '../../types/turing';
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
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // New project modal state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

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
    createProject('4-tuple', 'operational', newProjectName.trim() || undefined);
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
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importProjectFromJSON(content);
        importProject(imported);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setImportError(`Ошибка при импорте JSON: ${msg}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl h-full bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Менеджер Проектов & Сессий
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Автосохранение в localStorage • {projects.length} сохранено
              </p>
            </div>
          </div>
          <button
            onClick={() => setSessionDrawerOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search, New Project, Import */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 space-y-2.5">
          <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-sky-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
            />
          </div>

          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors">
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
          {importError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{importError}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportError(null)}
                className="text-rose-500 hover:text-rose-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
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
                className="text-zinc-400 hover:text-zinc-600 text-xs"
              >
                Отмена
              </button>
            </div>

            <input
              type="text"
              placeholder="Название проекта (например, Сложение унарных чисел)"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              autoFocus
            />

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
                    : 'bg-white dark:bg-zinc-800/70 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
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
                          className="px-2 py-1 text-sm font-bold rounded bg-zinc-100 dark:bg-zinc-700 border border-sky-500 text-zinc-900 dark:text-zinc-100"
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
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {p.name}
                        </h4>
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            Активен
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {p.description || 'Нет описания'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(e, p)}
                      className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
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
                      className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      title="Дублировать (Копия)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleExportJSON(e, p)}
                      className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      title="Экспорт в JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {projects.length > 1 &&
                      (confirmDeleteId === p.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              deleteProject(p.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-semibold"
                          >
                            Удалить?
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-[10px]"
                          >
                            Нет
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(p.id);
                          }}
                          className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-500"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ))}
                  </div>
                </div>

                {/* Badges / Stats */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    VTM
                  </span>
                  <span>•</span>
                  <span>{p.nodes.length} узлов</span>
                  <span>•</span>
                  <span>{p.edges.length} связей</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[10px]">
                    <Calendar className="w-3 h-3 text-zinc-400" />
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
