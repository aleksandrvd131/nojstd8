import React, { useState } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import {
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const BatchTestRunner: React.FC = () => {
  const getActiveProject = useTuringStore((s) => s.getActiveProject);
  const addTestCase = useTuringStore((s) => s.addTestCase);
  const updateTestCase = useTuringStore((s) => s.updateTestCase);
  const deleteTestCase = useTuringStore((s) => s.deleteTestCase);
  const runAllTestCases = useTuringStore((s) => s.runAllTestCases);
  const runSingleTestCase = useTuringStore((s) => s.runSingleTestCase);
  const setTapeString = useTuringStore((s) => s.setTapeString);

  const project = getActiveProject();
  const testCases = project.testCases;

  const [newName, setNewName] = useState('');
  const [newInput, setNewInput] = useState('');
  const [newExpected, setNewExpected] = useState('');

  const handleAddTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInput.trim()) return;

    addTestCase({
      name: newName.trim() || `Тест ${testCases.length + 1}`,
      inputTape: newInput.trim(),
      expectedTape: newExpected.trim() || undefined,
    });

    setNewName('');
    setNewInput('');
    setNewExpected('');
  };

  const handleLoadToMainTape = (input: string) => {
    setTapeString(input, 0);
  };

  const passedCount = testCases.filter((tc) => tc.status === 'passed').length;

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Header bar */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
            Пакетное тестирование (Multiple Run)
          </h3>
          <p className="text-[11px] text-zinc-500">
            Успешно пройдено: <strong className="text-emerald-600">{passedCount}</strong> из {testCases.length}
          </p>
        </div>

        <button
          type="button"
          onClick={runAllTestCases}
          disabled={testCases.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm disabled:opacity-40 transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Запустить все тесты</span>
        </button>
      </div>

      {/* Tests List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {testCases.length === 0 ? (
          <div className="py-8 text-center text-zinc-400">
            Нет тестовых наборов. Добавьте входную строку ниже для автоматической проверки.
          </div>
        ) : (
          testCases.map((tc) => (
            <div
              key={tc.id}
              className={`p-3 rounded-xl border transition-all ${
                tc.status === 'passed'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                  : tc.status === 'failed'
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                  : 'bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {tc.status === 'passed' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                  {tc.status === 'failed' && (
                    <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  )}
                  {(!tc.status || tc.status === 'idle') && (
                    <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0" />
                  )}

                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {tc.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLoadToMainTape(tc.inputTape)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-[10px] font-semibold"
                    title="Загрузить входные данные на ленту холста"
                  >
                    <ExternalLink className="w-3 h-3" />
                    На ленту
                  </button>

                  <button
                    type="button"
                    onClick={() => runSingleTestCase(tc.id)}
                    className="p-1 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-600 hover:bg-sky-100"
                    title="Запустить тест"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTestCase(tc.id)}
                    className="p-1 rounded text-zinc-400 hover:text-rose-500"
                    title="Удалить тест"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tape In/Out comparison */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 font-mono text-[11px]">
                <div>
                  <span className="text-zinc-400 text-[10px] block font-sans">Вход:</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-bold bg-zinc-100 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded">
                    "{tc.inputTape}"
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 text-[10px] block font-sans">Ожидается:</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-bold bg-zinc-100 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded">
                    {tc.expectedTape !== undefined ? `"${tc.expectedTape}"` : 'любой'}
                  </span>
                </div>
              </div>

              {/* Actual result if executed */}
              {tc.lastActualTape !== undefined && (
                <div className="mt-2 text-[11px] pt-1.5 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
                  <div className="font-mono">
                    Получено:{' '}
                    <strong
                      className={
                        tc.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'
                      }
                    >
                      "{tc.lastActualTape}"
                    </strong>
                  </div>
                  <div className="text-zinc-400 text-[10px] flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {tc.lastStepsCount} тактов
                  </div>
                </div>
              )}

              {tc.errorMessage && (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {tc.errorMessage}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add new test form */}
      <form
        onSubmit={handleAddTest}
        className="p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 space-y-2"
      >
        <span className="font-semibold text-zinc-700 dark:text-zinc-300 block text-[11px]">
          Добавить тестовый пример
        </span>
        <div className="grid grid-cols-3 gap-2 font-mono text-xs">
          <input
            type="text"
            placeholder="Название (опц.)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-2 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
          />
          <input
            type="text"
            placeholder="Вход (Input)"
            value={newInput}
            onChange={(e) => setNewInput(e.target.value)}
            className="px-2 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
            required
          />
          <input
            type="text"
            placeholder="Ожидание (Exp)"
            value={newExpected}
            onChange={(e) => setNewExpected(e.target.value)}
            className="px-2 py-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
          />
        </div>
        <button
          type="submit"
          className="w-full py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Добавить тест в набор</span>
        </button>
      </form>
    </div>
  );
};
