import { toPng, toSvg, toJpeg } from 'html-to-image';

export interface ExportImageOptions {
  format?: 'png' | 'svg' | 'jpeg';
  filename?: string;
  backgroundColor?: string;
  quality?: number;
  excludeControls?: boolean;
}

/**
 * Captures and downloads the Turing Machine canvas diagram as high-resolution PNG, SVG, or JPEG.
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
  } = options;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Image export is only available in a browser environment');
  }

  const element =
    typeof elementOrSelector === 'string'
      ? document.querySelector<HTMLElement>(elementOrSelector)
      : elementOrSelector;

  if (!element) {
    throw new Error(`Target canvas element not found: ${elementOrSelector}`);
  }

  const filter = (node: HTMLElement) => {
    if (!excludeControls || !node?.classList) return true;
    return (
      !node.classList.contains('react-flow__minimap') &&
      !node.classList.contains('react-flow__controls') &&
      !node.classList.contains('react-flow__panel')
    );
  };

  // Minimalist linear zinc neutral palette: #09090b (dark) or #fafafa (light)
  const isDark = document.documentElement.classList.contains('dark');
  const bg = backgroundColor ?? (isDark ? '#09090b' : '#fafafa');

  let dataUrl = '';
  if (format === 'svg') {
    dataUrl = await toSvg(element, { filter, backgroundColor: bg });
  } else if (format === 'jpeg') {
    dataUrl = await toJpeg(element, { quality, filter, backgroundColor: bg });
  } else {
    dataUrl = await toPng(element, { quality, filter, backgroundColor: bg });
  }

  // Trigger browser download
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${filename}.${format}`;
  link.click();

  return dataUrl;
}
