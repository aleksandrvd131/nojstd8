import { afterEach, describe, expect, it, vi } from 'vitest';
import { toJpeg, toPng, toSvg } from 'html-to-image';
import { exportDiagramAsImage } from './exportImage';

vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,test'),
  toSvg: vi.fn().mockResolvedValue('data:image/svg+xml,test'),
  toJpeg: vi.fn().mockResolvedValue('data:image/jpeg;base64,test'),
}));

describe('diagram image export', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it.each(['png', 'svg'] as const)('exports %s with a transparent background and no grid', async (format) => {
    const canvas = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'react-flow__background';
    canvas.appendChild(grid);
    document.body.appendChild(canvas);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await exportDiagramAsImage(canvas, { format });

    const capture = format === 'png' ? toPng : toSvg;
    const options = vi.mocked(capture).mock.lastCall?.[1];
    expect(options?.backgroundColor).toBe('transparent');
    expect(options?.style?.backgroundColor).toBe('transparent');
    expect(options?.filter?.(grid)).toBe(false);
  });

  it('uses a white background for JPEG', async () => {
    const canvas = document.createElement('div');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await exportDiagramAsImage(canvas, { format: 'jpeg' });
    expect(vi.mocked(toJpeg).mock.lastCall?.[1]?.backgroundColor).toBe('#ffffff');
  });

  it('applies the export theme temporarily and excludes editing controls and the current-step badge', async () => {
    const canvas = document.createElement('div');
    const control = document.createElement('button');
    control.setAttribute('data-export-control', '');
    const badge = document.createElement('span');
    badge.setAttribute('data-export-current-badge', '');
    document.documentElement.classList.remove('dark');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.mocked(toPng).mockImplementationOnce(async (_element, options) => {
      expect(document.documentElement).toHaveClass('dark', 'exporting-diagram');
      expect(options?.filter?.(control)).toBe(false);
      expect(options?.filter?.(badge)).toBe(false);
      expect(document.head.textContent).toContain('[title="Добавить правило перехода"] { display: none !important; }');
      return 'data:image/png;base64,test';
    });
    await exportDiagramAsImage(canvas, { theme: 'dark' });
    expect(document.documentElement).not.toHaveClass('dark', 'exporting-diagram');
  });

  it('keeps the current-step badge when highlighting is enabled and restores theme on failure', async () => {
    const canvas = document.createElement('div');
    const badge = document.createElement('span');
    badge.setAttribute('data-export-current-badge', '');
    document.documentElement.classList.add('dark');
    vi.mocked(toPng).mockImplementationOnce(async (_element, options) => {
      expect(document.documentElement).not.toHaveClass('dark');
      expect(options?.filter?.(badge)).toBe(true);
      throw new Error('capture failed');
    });
    await expect(exportDiagramAsImage(canvas, { theme: 'light', highlightCurrentStep: true })).rejects.toThrow('capture failed');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).not.toHaveClass('exporting-diagram');
    document.documentElement.classList.remove('dark');
  });
});
