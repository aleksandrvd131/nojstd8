import React, { useState } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import {
  exportProjectToJSON,
  exportToLaTeX,
  exportToPlantUML,
  exportToMarkdown,
} from '../../engine/exporter';
import { toPng } from 'html-to-image';
import {
  X,
  Copy,
  Download,
  Check,
  FileCode,
  FileText,
  Image as ImageIcon,
  Share2,
} from 'lucide-react';

export const ExportModal: React.FC = () => {
  const isExportModalOpen = useTuringStore((s) => s.isExportModalOpen);
  const setExportModalOpen = useTuringStore((s) => s.setExportModalOpen);
  const getActiveProject = useTuringStore((s) => s.getActiveProject);

  const project = getActiveProject();

  const [activeTab, setActiveTab] = useState<'json' | 'latex' | 'plantuml' | 'markdown' | 'png'>('json');
  const [copied, setCopied] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  if (!isExportModalOpen) return null;

  let exportContent = '';
  if (activeTab === 'json') {
    exportContent = exportProjectToJSON(project);
  } else if (activeTab === 'latex') {
    exportContent = exportToLaTeX(project);
  } else if (activeTab === 'plantuml') {
    exportContent = exportToPlantUML(project);
  } else if (activeTab === 'markdown') {
    exportContent = exportToMarkdown(project);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(exportContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = `${project.name.replace(/\s+/g, '_')}`;
    let mime = 'text/plain';

    if (activeTab === 'json') {
      filename += '.json';
      mime = 'application/json';
    } else if (activeTab === 'latex') {
      filename += '.tex';
    } else if (activeTab === 'plantuml') {
      filename += '.puml';
    } else if (activeTab === 'markdown') {
      filename += '.md';
    }

    const blob = new Blob([exportContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = async () => {
    const canvasElement = document.querySelector('.react-flow') as HTMLElement;
    if (!canvasElement) {
      alert('Не найден элемент холста для создания снимка.');
      return;
    }

    try {
      setIsCapturing(true);
      const dataUrl = await toPng(canvasElement, {
        backgroundColor: '#0f172a',
        quality: 0.95,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${project.name.replace(/\s+/g, '_')}_diagram.png`;
      a.click();
    } catch (err: any) {
      alert('Ошибка при экспорте PNG: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Экспорт проекта & Отчётов
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                JSON, LaTeX для лабораторных, PlantUML, Markdown и графический снимок PNG
              </p>
            </div>
          </div>
          <button
            onClick={() => setExportModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'json'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-4 h-4" />
            JSON Проект
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('latex')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'latex'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            LaTeX (Отчёт)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plantuml')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'plantuml'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-4 h-4" />
            PlantUML
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('markdown')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'markdown'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Markdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('png')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'png'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Снимок PNG
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-hidden p-5 flex flex-col">
          {activeTab === 'png' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="p-4 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <ImageIcon className="w-12 h-12" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Экспорт холста в формате высокого разрешения (PNG)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                  Формирует чёткий векторно-растровый снимок графа состояний или операционной диаграммы для вставки в презентацию или отчёт.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPNG}
                disabled={isCapturing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isCapturing ? 'Генерация изображения...' : 'Скачать изображение PNG'}</span>
              </button>
            </div>
          ) : (
            <>
              <div className="relative flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs">
                <textarea
                  readOnly
                  value={exportContent}
                  className="w-full h-full p-4 bg-transparent resize-none focus:outline-none text-slate-800 dark:text-slate-200 leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать файл</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
