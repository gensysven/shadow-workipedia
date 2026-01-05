import type { CopingEntry, EmotionEntry, ThoughtEntry } from './types';
import { formatFixed01k, clampSigned01k } from './utils';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSigned01k(value: number): string {
  const clamped = clampSigned01k(value);
  const pct = Math.round(Math.abs(clamped) / 10);
  return `${clamped >= 0 ? '+' : '-'}${pct}%`;
}

export function formatThoughtMeta(entry: ThoughtEntry): string {
  return `${entry.valence} · ${formatFixed01k(entry.intensity01k)} · ${entry.recencyDays}d`;
}

export function formatEmotionMeta(entry: EmotionEntry): string {
  return `${formatFixed01k(entry.intensity01k)} · ${entry.durationHours}h · ${entry.behaviorTilt} · ${formatSigned01k(entry.moodImpact01k)} mood`;
}

export function formatCopingMeta(entry: CopingEntry): string {
  return `${formatFixed01k(entry.effectiveness01k)} · ${entry.recencyDays}d`;
}

export function renderPsychologyEntry(entry: { item: string; meta?: string }, align: 'left' | 'right' = 'left'): string {
  const alignClass = align === 'left' ? 'psychology-entry-left' : 'psychology-entry-right';
  return `
    <div class="psychology-entry ${alignClass}">
      <span class="pill pill-muted">${escapeHtml(entry.item)}</span>
      <div class="psychology-entry-meta">${escapeHtml(entry.meta ?? '')}</div>
    </div>
  `;
}

export function renderPsychologyEntryList(
  entries: Array<{ item: string; meta?: string }> | undefined,
  align: 'left' | 'right' = 'left',
): string {
  const listAlignClass = align === 'left' ? 'psychology-entry-list-left' : 'psychology-entry-list-right';
  const entryAlignClass = align === 'left' ? 'psychology-entry-left' : 'psychology-entry-right';
  if (entries && entries.length) {
    return `<div class="psychology-entry-list ${listAlignClass}">${entries.map(entry => renderPsychologyEntry(entry, align)).join('')}</div>`;
  }
  return `<div class="psychology-entry-list ${listAlignClass}"><div class="psychology-entry ${entryAlignClass}"><span class="agent-inline-muted">—</span></div></div>`;
}
