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
  } = options;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Image export is only available in a browser environment');
  }

  const isDark = document.documentElement.classList.contains('dark');
  const bg = backgroundColor ?? (isDark ? '#09090b' : '#fafafa');

  const viewportEl =
    typeof elementOrSelector === 'string' && nodes && nodes.length > 0
      ? document.querySelector<HTMLElement>('.react-flow__viewport')
      : null;

  let targetEl: HTMLElement | null = viewportEl;
  let captureOptions: Parameters<typeof toPng>[1] = {
    backgroundColor: bg,
    quality,
    filter: (node: HTMLElement) => {
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

  let dataUrl = '';
  if (format === 'svg') {
    dataUrl = await toSvg(targetEl, captureOptions);
  } else if (format === 'jpeg') {
    dataUrl = await toJpeg(targetEl, captureOptions);
  } else {
    dataUrl = await toPng(targetEl, captureOptions);
  }

  // Trigger browser download
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${filename}.${format}`;
  link.click();

  return dataUrl;
}
