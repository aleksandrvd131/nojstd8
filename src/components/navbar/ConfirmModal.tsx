import React, { useEffect } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmModal: React.FC = () => {
  const confirmModal = useTuringStore((s) => s.confirmModal);
  const closeConfirmModal = useTuringStore((s) => s.closeConfirmModal);

  useEffect(() => {
    if (!confirmModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeConfirmModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmModal, closeConfirmModal]);

  if (!confirmModal) return null;

  const handleConfirm = () => {
    const action = confirmModal.onConfirm;
    closeConfirmModal();
    action();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-xs">
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-4">
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {confirmModal.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeConfirmModal}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {confirmModal.message}
        </p>

        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={closeConfirmModal}
            className="px-3 py-1.5 rounded font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-3 py-1.5 rounded font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors"
          >
            {confirmModal.confirmLabel || 'Продолжить'}
          </button>
        </div>
      </div>
    </div>
  );
};
