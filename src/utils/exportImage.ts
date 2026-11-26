import { toPng, toSvg, toJpeg } from 'html-to-image';
import { getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { TuringNode } from '../types/turing';

export interface ExportImageOptions {
  format?: 'png' | 'svg' | 'jpeg';
  filename?: string;
  backgroundColor?: string;
  quality?: number;
  excludeControls?: boolean;
  nodes?: TuringNode[];
  theme?: 'light' | 'dark';
  highlightCurrentStep?: boolean;
}

/**
 * Captures and downloads the Turing Machine canvas diagram as high-resolution PNG, SVG, or JPEG.
 * When nodes are provided and `.react-flow__viewport` is mounted, automatically fits the full graph bounds.
 */
export async function exportDiagramAsImage(
  elementOrSelector: HTMLElement | string = '.react-flow',
  options: ExportImageOptions = {}
): Promise<string> {
  const {
    format = 'png',
    filename = 'turing_diagram',
    backgroundColor,
    quality = 0.95,
    excludeControls = true,
    nodes,
    theme,
    highlightCurrentStep = false,
  } = options;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Image export is only available in a browser environment');
  }

  const bg = backgroundColor ?? (format === 'jpeg' ? '#ffffff' : 'transparent');

  const viewportEl =
    typeof elementOrSelector === 'string' && nodes && nodes.length > 0
      ? document.querySelector<HTMLElement>('.react-flow__viewport')
      : null;

  let targetEl: HTMLElement | null = viewportEl;
  let captureOptions: Parameters<typeof toPng>[1] = {
    backgroundColor: bg,
    quality,
    style: { backgroundColor: bg },
    filter: (node: HTMLElement) => {
      if (node?.classList?.contains('react-flow__background')) return false;
      if (node?.hasAttribute?.('data-export-control')) return false;
      if (!highlightCurrentStep && node?.hasAttribute?.('data-export-current-badge')) return false;
      if (!excludeControls || !node?.classList) return true;
      return (
        !node.classList.contains('react-flow__minimap') &&
        !node.classList.contains('react-flow__controls') &&
        !node.classList.contains('react-flow__panel')
      );
    },
  };

  if (viewportEl && nodes && nodes.length > 0) {
    const nodesBounds = getNodesBounds(nodes);
    const width = Math.max(640, Math.ceil(nodesBounds.width + 200));
    const height = Math.max(380, Math.ceil(nodesBounds.height + 200));
    const viewport = getViewportForBounds(nodesBounds, width, height, 0.2, 2, 0.15);

    captureOptions = {
      ...captureOptions,
      width,
      height,
      style: {
        ...captureOptions.style,
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    };
  } else {
    targetEl =
      typeof elementOrSelector === 'string'
        ? document.querySelector<HTMLElement>(elementOrSelector)
        : elementOrSelector;
  }

  if (!targetEl) {
    throw new Error(`Target canvas element not found: ${elementOrSelector}`);
  }

  const root = document.documentElement;
  const wasDark = root.classList.contains('dark');
  const exportDark = theme ? theme === 'dark' : wasDark;
  const exportStyle = document.createElement('style');
  exportStyle.textContent = `
    html.exporting-diagram .react-flow * { transition: none !important; }
    html.exporting-diagram [data-export-control],
    html.exporting-diagram [title="Добавить правило перехода"] { display: none !important; }
    ${!highlightCurrentStep ? `
      html.exporting-diagram [data-export-current-node] {
        background: ${exportDark ? '#18181b' : '#fff'} !important;
        border-color: ${exportDark ? '#3f3f46' : '#d4d4d8'} !important;
        box-shadow: 0 1px 2px rgba(0,0,0,.05) !important;
      }
      html.exporting-diagram [data-export-current-node] .text-amber-700 {
        color: ${exportDark ? '#f4f4f5' : '#18181b'} !important;
      }
      html.exporting-diagram .export-active-edge {
        stroke: #71717a !important; stroke-width: 1.5 !important; stroke-dasharray: none !important;
      }
      html.exporting-diagram [data-export-active-label] {
        border-color: ${exportDark ? '#3f3f46' : 'rgba(228,228,231,.9)'} !important;
      }
      html.exporting-diagram [data-export-active-rule] {
        background: ${exportDark ? '#27272a' : '#f4f4f5'} !important;
        color: ${exportDark ? '#e4e4e7' : '#27272a'} !important;
        font-weight: 500 !important;
      }
    ` : ''}
  `;
  document.head.appendChild(exportStyle);
  root.classList.add('exporting-diagram');
  root.classList.toggle('dark', exportDark);
  let dataUrl = '';
  try {
    if (format === 'svg') {
      dataUrl = await toSvg(targetEl, captureOptions);
    } else if (format === 'jpeg') {
      dataUrl = await toJpeg(targetEl, captureOptions);
    } else {
      dataUrl = await toPng(targetEl, captureOptions);
    }
  } finally {
    root.classList.toggle('dark', wasDark);
    root.classList.remove('exporting-diagram');
    exportStyle.remove();
  }

  // Trigger browser download
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${filename}.${format}`;
  link.click();

  return dataUrl;
}
