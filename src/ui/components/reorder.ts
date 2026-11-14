/**
 * Posição de destino de um elemento arrastado numa lista vertical, a partir das alturas de cada
 * linha e da deslocação do gesto. O elemento troca de lugar quando o seu centro passa o centro do
 * vizinho. Sem efeitos: testável sem React.
 */
export function reorderTarget(heights: readonly number[], from: number, dy: number): number {
  if (heights.length === 0 || from < 0 || from >= heights.length) return from;
  const tops: number[] = [];
  let y = 0;
  for (const height of heights) {
    tops.push(y);
    y += height;
  }
  const center = (tops[from] ?? 0) + (heights[from] ?? 0) / 2 + dy;
  let target = from;
  if (dy > 0) {
    for (let index = from + 1; index < heights.length; index += 1) {
      if (center > (tops[index] ?? 0) + (heights[index] ?? 0) / 2) target = index;
      else break;
    }
  } else if (dy < 0) {
    for (let index = from - 1; index >= 0; index -= 1) {
      if (center < (tops[index] ?? 0) + (heights[index] ?? 0) / 2) target = index;
      else break;
    }
  }
  return target;
}

/** Desloca o elemento `from` para `to`, sem alterar o array original. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return next;
  next.splice(to, 0, moved);
  return next;
}

/**
 * Scroll automático ao arrastar perto das margens da área visível: px a deslocar por frame
 * (negativo para cima, positivo para baixo, 0 longe das margens), maior quanto mais perto da
 * margem e nunca acima de `maxStep`.
 */
export function autoScrollStep(
  pointerY: number,
  viewportTop: number,
  viewportHeight: number,
  edge = 64,
  maxStep = 14,
): number {
  if (viewportHeight <= 0) return 0;
  const fromTop = pointerY - viewportTop;
  const fromBottom = viewportTop + viewportHeight - pointerY;
  if (fromTop < edge) {
    const strength = Math.min(1, (edge - Math.max(fromTop, 0)) / edge);
    return -Math.round(maxStep * strength);
  }
  if (fromBottom < edge) {
    const strength = Math.min(1, (edge - Math.max(fromBottom, 0)) / edge);
    return Math.round(maxStep * strength);
  }
  return 0;
}
