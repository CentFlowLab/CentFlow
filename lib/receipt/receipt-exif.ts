/**
 * Correcção de orientação a partir de metadados EXIF.
 * iOS/Android podem devolver pixels já rodados — só aplicamos rotação quando o tag EXIF o indica.
 */
export function getExifRotationDegrees(exif?: Record<string, unknown> | null): number {
  if (!exif) return 0;

  const raw = exif.Orientation ?? exif.orientation;
  const orientation =
    typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;

  if (!Number.isFinite(orientation)) return 0;

  switch (orientation) {
    case 3:
      return 180;
    case 6:
      return 90;
    case 8:
      return -90;
    default:
      return 0;
  }
}
