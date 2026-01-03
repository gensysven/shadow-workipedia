import type { KnowledgeItem } from './types';
import { formatKnowledgeItemMeta } from './knowledgeFormat';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderKnowledgeEntry(entry: KnowledgeItem): string {
  return `
    <div class="knowledge-entry">
      <span class="pill pill-muted">${escapeHtml(entry.item)}</span>
      <div class="knowledge-entry-meta">${formatKnowledgeItemMeta(entry)}</div>
    </div>
  `;
}

export function renderKnowledgeEntryList(entries: KnowledgeItem[] | undefined, fallback: string[]): string {
  if (entries && entries.length) {
    return `<div class="knowledge-entry-list">${entries.map(renderKnowledgeEntry).join('')}</div>`;
  }
  if (fallback.length) {
    return `<div class="knowledge-entry-list">${fallback.map(item => `
      <div class="knowledge-entry">
        <span class="pill pill-muted">${escapeHtml(item)}</span>
      </div>
    `).join('')}</div>`;
  }
  return `<span class="agent-inline-muted">—</span>`;
}
