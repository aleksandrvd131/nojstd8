import React, { useMemo, useState } from 'react';
import { useTuringStore, useActiveProject } from '../../store/useTuringStore';
import { getVTMCodeOpLabel, parseVTMCodeDetailed } from '../../engine/transpiler';

const EXAMPLES = ['r^3 R 0', 'R 0', 'l L 1'];

type Message = { kind: 'ok' | 'error'; text: string } | null;

const primaryButtonClass =
  'w-full px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500';

const secondaryButtonClass =
  'w-full px-3 py-1.5 rounded text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:text-zinc-400 disabled:border-zinc-200 dark:disabled:border-zinc-800 dark:disabled:text-zinc-600';

export const VTMCodeInput: React.FC = () => {
  const project = useActiveProject();
  const addVTMCode = useTuringStore((s) => s.addVTMCode);
  const insertVTMCode = useTuringStore((s) => s.insertVTMCode);

  const [code, setCode] = useState('r^3 R 0');
  const [message, setMessage] = useState<Message>(null);

  const { ops, errors } = useMemo(
    () => parseVTMCodeDetailed(code, project.alphabet, project.subMachines),
    [code, project.alphabet, project.subMachines]
  );

  const canSubmit = ops.length > 0 && errors.length === 0;
  const canInsert = canSubmit && project.subMode === 'operational';

  const changeCode = (value: string) => {
    setCode(value);
    setMessage(null);
  };

  const handleInsert = () => {
    if (!canInsert) return;
    const ok = insertVTMCode(code.trim());
    setMessage(
      ok
        ? { kind: 'ok', text: 'Цепочка вставлена. Соедините её с существующими узлами.' }
        : { kind: 'error', text: 'Не удалось вставить цепочку.' }
    );
  };

  const handleCreate = () => {
    if (!canSubmit) return;
    const ok = addVTMCode(code.trim());
    setMessage(
      ok
        ? { kind: 'ok', text: 'Создан новый проект.' }
        : { kind: 'error', text: 'Не удалось создать проект.' }
    );
  };

  const preview = ops
    .map((op) =>
      op.opType === 'WRITE_SYM' ? op.symbolToWrite ?? '_' : getVTMCodeOpLabel(op)
    )
    .join(' → ');

  return (
    <div className="h-full overflow-y-auto p-4 text-xs">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        VTM-код
      </h3>
      <p className="mt-1 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">
        Последовательность операций. START и FINISH не добавляются: цепочку можно
        вставить в существующую схему или создать отдельный проект.
      </p>

      <div className="mt-4 space-y-1 font-mono text-[11px] leading-5 text-zinc-600 dark:text-zinc-300">
        <div>
          <span className="inline-block w-16 text-zinc-900 dark:text-zinc-100">r, l</span>
          сдвиг головки на 1
        </div>
        <div>
          <span className="inline-block w-16 text-zinc-900 dark:text-zinc-100">R, L</span>
          поиск до пустой клетки
        </div>
        <div>
          <span className="inline-block w-16 text-zinc-900 dark:text-zinc-100">^N</span>
          повторить N раз
        </div>
        <div>
          <span className="inline-block w-16 text-zinc-900 dark:text-zinc-100">0, 1, #</span>
          запись символа
        </div>
        {project.subMachines.length > 0 && (
          <div>
            <span className="inline-block w-16 text-zinc-900 dark:text-zinc-100">
              {project.subMachines.map((fn) => fn.code).filter(Boolean).join(', ')}
            </span>
            вызов функции из проекта
          </div>
        )}
      </div>

      <div className="mt-4">
        <label
          htmlFor="vtm-code"
          className="block mb-1 text-[11px] text-zinc-500 dark:text-zinc-400"
        >
          Код
        </label>
        <input
          id="vtm-code"
          type="text"
          value={code}
          onChange={(event) => changeCode(event.target.value)}
          spellCheck={false}
          autoComplete="off"
          placeholder="Например: r^3 R 0"
          className="w-full px-2.5 py-1.5 font-mono text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>Примеры:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => changeCode(example)}
            className="font-mono text-zinc-700 dark:text-zinc-300 underline decoration-zinc-300 dark:decoration-zinc-600 underline-offset-2 hover:decoration-zinc-600 dark:hover:decoration-zinc-300"
          >
            {example}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-[3.5rem]">
        {errors.length > 0 ? (
          <div className="space-y-1 text-[11px] text-red-600 dark:text-red-400">
            {errors.map((error, index) => (
              <div key={`${index}-${error}`}>{error}</div>
            ))}
          </div>
        ) : ops.length > 0 ? (
          <>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Последовательность
            </div>
            <div className="mt-1 font-mono text-[11px] leading-5 break-words text-zinc-800 dark:text-zinc-200">
              {preview}
            </div>
            <div className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
              {ops.length}{' '}
              {ops.length === 1
                ? 'операция'
                : ops.length < 5
                ? 'операции'
                : 'операций'}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Введите код для предпросмотра.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={handleInsert}
          disabled={!canInsert}
          className={primaryButtonClass}
        >
          Вставить в текущую схему
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canSubmit}
          className={secondaryButtonClass}
        >
          Создать новый проект
        </button>
      </div>

      {project.subMode !== 'operational' && (
        <p className="mt-2 text-[10px] leading-4 text-zinc-400 dark:text-zinc-500">
          Вставка доступна в операционной VTM-схеме.
        </p>
      )}

      {message && (
        <p
          className={`mt-3 text-[11px] ${
            message.kind === 'ok'
              ? 'text-zinc-600 dark:text-zinc-300'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 dark:text-zinc-500">
        Символы: {[...project.alphabet.symbols, project.alphabet.blankSymbol].join(' ')}
      </div>
    </div>
  );
};
