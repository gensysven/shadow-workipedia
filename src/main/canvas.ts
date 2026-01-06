export function createCanvasContext(doc: Document = document) {
  const canvas = doc.getElementById('graph-canvas') as HTMLCanvasElement | null;
  if (!canvas) throw new Error('Canvas not found');

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  return { canvas, ctx };
}
