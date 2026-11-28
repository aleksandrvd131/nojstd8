import React, { useMemo } from 'react';
import { useTuringStore, useActiveProject } from '../../store/useTuringStore';
import { validateMachineCached } from '../../engine/validator';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';

export const DiagnosticsPanel: React.FC = () => {
  const setSelectedNodeId = useTuringStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useTuringStore((s) => s.setSelectedEdgeId);

  const project = useActiveProject();
  const issues = useMemo(() => validateMachineCached(project), [project]);

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const handleIssueClick = (nodeId?: string, edgeId?: string) => {
    if (edgeId) {
      setSelectedEdgeId(edgeId);
      setSelectedNodeId(null);
    } else if (nodeId) {
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Header status */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-500" />
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
              Статический Анализатор (Check)
            </h3>
          </div>

          {errors.length === 0 ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Корректна
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[11px] border border-rose-500/20">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.length} {errors.length === 1 ? 'ошибка' : 'ошибок'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Ошибки: <strong className="text-zinc-800 dark:text-zinc-200">{errors.length}</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Предупреждения:{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">{warnings.length}</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Инфо: <strong className="text-zinc-800 dark:text-zinc-200">{infos.length}</strong>
          </span>
        </div>
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">
              Инварианты диаграммы соблюдены
            </p>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">
              Задана точка входа, есть состояние останова, нет конфликтующих недетерминированных правил.
            </p>
          </div>
        ) : (
          issues.map((issue) => {
            const isError = issue.severity === 'error';
            const isWarning = issue.severity === 'warning';

            return (
              <div
                key={issue.id}
                onClick={() => handleIssueClick(issue.nodeId, issue.edgeId)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isError
                    ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
                    : isWarning
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 hover:border-amber-400'
                    : 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/60 hover:border-sky-400'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex-shrink-0">
                    {isError && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    {isWarning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    {!isError && !isWarning && <Info className="w-4 h-4 text-sky-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold ${
                        isError
                          ? 'text-rose-900 dark:text-rose-200'
                          : isWarning
                          ? 'text-amber-900 dark:text-amber-200'
                          : 'text-sky-900 dark:text-sky-200'
                      }`}
                    >
                      {issue.message}
                    </p>

                    {issue.nodeId && (
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Узел: <span className="font-mono font-bold text-sky-600">{issue.nodeId}</span>{' '}
                        (нажмите для перехода)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
