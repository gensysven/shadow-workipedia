import type { GeneratedAgent } from '../agent';

export type RosterItem = {
  id: string;
  name: string;
  seed: string;
  createdAtIso: string;
  agent?: GeneratedAgent;
};

const ROSTER_STORAGE_KEY = 'swp.agents.roster.v1';

export function loadRoster(): RosterItem[] {
  try {
    const raw = localStorage.getItem(ROSTER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RosterItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(x =>
      x &&
      typeof x === 'object' &&
      typeof (x as { id?: unknown }).id === 'string' &&
      typeof (x as { seed?: unknown }).seed === 'string' &&
      typeof (x as { name?: unknown }).name === 'string'
    );
  } catch {
    return [];
  }
}

export function saveRoster(items: RosterItem[]) {
  localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(items));
}
