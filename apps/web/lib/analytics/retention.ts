const DAY_MS = 86_400_000;

/**
 * The oldest timestamp a plan still shows, or null when history is kept
 * forever. Lives outside the components that use it: React's lint treats a
 * clock read inside a component body as impure, and it is shared anyway.
 */
export function retentionCutoff(days: number | null): string | null {
  return days === null ? null : new Date(Date.now() - days * DAY_MS).toISOString();
}

/** Coarse relative time — precision past "yesterday" helps nobody here. */
export function timeAgo(iso: string): string {
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}
