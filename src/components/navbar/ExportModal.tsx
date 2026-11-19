import React, { useState } from 'react';
import { useTuringStore } from '../../store/useTuringStore';
import {
  exportProjectToJSON,
  exportToLaTeX,
  exportToPlantUML,
  exportToMarkdown,
} from '../../engine/exporter';
import {
  X,
  Copy,
  Download,
  Check,
  FileCode,
  FileText,
  Image as ImageIcon,
  Share2,
  FileBox,
} from 'lucide-react';

export const ExportModal: React.FC = () => {
  const isExportModalOpen = useTuringStore((s) => s.isExportModalOpen);
  const setExportModalOpen = useTuringStore((s) => s.setExportModalOpen);
  const getActiveProject = useTuringStore((s) => s.getActiveProject);
  const exportDiagramImage = useTuringStore((s) => s.exportDiagramImage);

  const project = getActiveProject();

  const [activeTab, setActiveTab] = useState<'json' | 'latex' | 'plantuml' | 'markdown' | 'image'>('json');
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

  const handleDownloadText = () => {
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

  const handleExportImage = async (format: 'png' | 'svg') => {
    try {
      setIsCapturing(true);
      await exportDiagramImage({
        format,
        filename: `${project.name.replace(/\s+/g, '_')}_diagram`,
      });
    } catch (err: any) {
      alert(`Ошибка при экспорте ${format.toUpperCase()}: ` + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 text-xs">
      <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-zinc-500" />
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Экспорт проекта и отчётов
              </h3>
              <p className="text-[11px] text-zinc-500">
                LaTeX для лабораторных, JSON, PlantUML, Markdown и векторный/растровый снимок
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExportModalOpen(false)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-4 gap-4 text-xs font-medium bg-zinc-50/50 dark:bg-zinc-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'json'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            JSON
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('latex')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'latex'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            LaTeX
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plantuml')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'plantuml'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            PlantUML
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('markdown')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'markdown'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Markdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'image'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Снимок (PNG / SVG)
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0">
          {activeTab === 'image' ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  Графический экспорт диаграммы
                </h4>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
                  Снимок графа состояний или операционной блок-схемы без управляющих панелей, подходящий для отчётов и презентаций.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleExportImage('png')}
                  disabled={isCapturing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold shadow-xs disabled:opacity-40 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isCapturing ? 'Экспорт...' : 'Скачать PNG'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportImage('svg')}
                  disabled={isCapturing}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-semibold disabled:opacity-40 transition-colors"
                >
                  <FileBox className="w-3.5 h-3.5" />
                  <span>Векторный SVG</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative flex-1 overflow-hidden rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs">
                <textarea
                  readOnly
                  value={exportContent}
                  className="w-full h-full p-3 bg-transparent resize-none focus:outline-none text-zinc-800 dark:text-zinc-200 leading-relaxed font-mono select-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 font-medium rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadText}
                  className="flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
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
