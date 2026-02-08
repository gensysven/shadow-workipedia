import { generateAgent, randomSeedString, type AgentPriorsV1, type AgentVocabV1, type GeneratedAgent, type TierBand } from './agent';
import { isAgentProfileTab, migrateOldTabName, type AgentProfileTab } from './agent/profileTabs';
import { renderAgent } from './agentsView/renderAgent';
import { escapeHtml, toTitleCaseWords } from './agentsView/formatting';
import { loadRoster, saveRoster, type RosterItem } from './agentsView/rosterStorage';

const COGNITIVE_DETAILS_KEY = 'profile:cognitive:details';
const PSYCHOLOGY_DETAILS_KEY = 'profile:psychology:details';

let agentVocabPromise: Promise<AgentVocabV1> | null = null;
let agentPriorsPromise: Promise<AgentPriorsV1> | null = null;
let shadowCountryMapPromise: Promise<Array<{ real: string; shadow: string; iso3?: string; continent?: string }>> | null = null;

type AgentsPerfEntry = { name: string; ms: number; meta?: Record<string, string | number> };
type AgentsPerfStore = { entries: AgentsPerfEntry[]; last?: AgentsPerfEntry };

let agentsPerfEnabled = false;

const exposePerfApi = () => {
  if (!agentsPerfEnabled) return;
  const w = window as Window & {
    __agentsPerfSpan?: typeof measureSpan;
    __agentsPerfAsyncSpan?: typeof measureAsyncSpan;
  };
  w.__agentsPerfSpan = (name, fn, meta) => measureSpan(name, fn, meta);
  w.__agentsPerfAsyncSpan = (name, fn, meta) => measureAsyncSpan(name, fn, meta);
};

const setAgentsPerfEnabled = (params?: URLSearchParams | null) => {
  agentsPerfEnabled = isPerfEnabled(params);
  exposePerfApi();
};

const isPerfEnabled = (params?: URLSearchParams | null) => {
  const raw = params?.get('perf') ?? '';
  if (raw === '1' || raw === 'true' || raw === 'yes') return true;
  try {
    const stored = window.localStorage.getItem('agentsPerf');
    return stored === '1' || stored === 'true' || stored === 'yes';
  } catch {
    return false;
  }
};

const getPerfStore = (): AgentsPerfStore | null => {
  if (!agentsPerfEnabled) return null;
  const w = window as Window & { __agentsPerf?: AgentsPerfStore };
  if (!w.__agentsPerf) w.__agentsPerf = { entries: [] };
  return w.__agentsPerf;
};

const recordPerf = (name: string, ms: number, meta?: Record<string, string | number>) => {
  const store = getPerfStore();
  if (!store) return;
  const entry: AgentsPerfEntry = { name, ms, meta };
  store.entries.push(entry);
  store.last = entry;
  if (store.entries.length > 200) store.entries.shift();
  // eslint-disable-next-line no-console
  console.log(`[agents-perf] ${name}: ${ms.toFixed(1)}ms`, meta ?? '');
};

const measureSpan = <T>(name: string, fn: () => T, meta?: Record<string, string | number>) => {
  if (!agentsPerfEnabled) return fn();
  const start = performance.now();
  try {
    return fn();
  } finally {
    recordPerf(name, performance.now() - start, meta);
  }
};

const measureAsyncSpan = async <T>(name: string, fn: () => Promise<T>, meta?: Record<string, string | number>) => {
  if (!agentsPerfEnabled) return fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordPerf(name, performance.now() - start, meta);
  }
};

function getAgentVocabV1(): Promise<AgentVocabV1> {
  if (agentVocabPromise) return agentVocabPromise;
  agentVocabPromise = measureAsyncSpan('agents:load:vocab', async () => {
    const res = await fetch('agent-vocab.v1.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load agent vocab (${res.status})`);
    const parseStart = agentsPerfEnabled ? performance.now() : 0;
    const parsed = (await res.json()) as unknown;
    if (agentsPerfEnabled) recordPerf('agents:parse:vocab', performance.now() - parseStart);
    if (!parsed || typeof parsed !== 'object') throw new Error('Agent vocab JSON is not an object');
    const version = (parsed as { version?: unknown }).version;
    if (version !== 1) throw new Error(`Unsupported agent vocab version: ${String(version)}`);
    return parsed as AgentVocabV1;
  });
  return agentVocabPromise;
}

function getAgentPriorsV1(): Promise<AgentPriorsV1> {
  if (agentPriorsPromise) return agentPriorsPromise;
  agentPriorsPromise = measureAsyncSpan('agents:load:priors', async () => {
    const res = await fetch('agent-priors.v1.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load agent priors (${res.status})`);
    const parseStart = agentsPerfEnabled ? performance.now() : 0;
    const parsed = (await res.json()) as unknown;
    if (agentsPerfEnabled) recordPerf('agents:parse:priors', performance.now() - parseStart);
    if (!parsed || typeof parsed !== 'object') throw new Error('Agent priors JSON is not an object');
    const version = (parsed as { version?: unknown }).version;
    if (version !== 1) throw new Error(`Unsupported agent priors version: ${String(version)}`);
    return parsed as AgentPriorsV1;
  });
  return agentPriorsPromise;
}

function getShadowCountryMap(): Promise<Array<{ real: string; shadow: string; iso3?: string; continent?: string }>> {
  if (shadowCountryMapPromise) return shadowCountryMapPromise;
  shadowCountryMapPromise = measureAsyncSpan('agents:load:countries', async () => {
    const res = await fetch('shadow-country-map.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load shadow country map (${res.status})`);
    const parseStart = agentsPerfEnabled ? performance.now() : 0;
    const parsed = (await res.json()) as unknown;
    if (agentsPerfEnabled) recordPerf('agents:parse:countries', performance.now() - parseStart);
    if (!Array.isArray(parsed)) throw new Error('Shadow country map JSON is not an array');
    return parsed as Array<{ real: string; shadow: string; iso3?: string; continent?: string }>;
  });
  return shadowCountryMapPromise;
}

async function copyJsonToClipboard(value: unknown): Promise<boolean> {
  const text = JSON.stringify(value, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for restricted clipboard contexts.
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function readSeedFromHash(): string | null {
  const hash = window.location.hash;
  const m = hash.match(/^#\/agents\/([^?]+)(?:\?.*)?$/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1] ?? '').trim() || null;
  } catch {
    return (m[1] ?? '').trim() || null;
  }
}

function readAgentsParamsFromHash(): URLSearchParams {
  const hash = window.location.hash;
  if (hash.startsWith('#/agents/')) {
    const m = hash.match(/^#\/agents\/[^?]+(?:\?(.*))?$/);
    return new URLSearchParams(m?.[1] ?? '');
  }
  if (hash.startsWith('#/agents?')) {
    const m = hash.match(/^#\/agents\?(.*)$/);
    return new URLSearchParams(m?.[1] ?? '');
  }
  if (hash === '#/agents') return new URLSearchParams();
  return new URLSearchParams();
}

function setTemporaryButtonLabel(btn: HTMLButtonElement, nextLabel: string, ms = 1200) {
  const prev = btn.textContent ?? '';
  btn.textContent = nextLabel;
  btn.disabled = true;
  window.setTimeout(() => {
    btn.textContent = prev;
    btn.disabled = false;
  }, ms);
}

const MAX_SEED_LENGTH = 64;

function normalizeSeedInput(raw: string): string {
  return raw.replace(/\t+/g, ' ').replace(/ {2,}/g, ' ').trim();
}

function getSeedError(seed: string): string | null {
  if (!/^[\x00-\x7F]*$/.test(seed)) return 'ASCII only';
  if (seed.length > MAX_SEED_LENGTH) return 'Max 64 chars.';
  return null;
}

function buildRecentHook(agent: GeneratedAgent): string {
  const role = toTitleCaseWords(agent.identity.roleSeedTags[0] ?? 'operative');
  const topSkill = Object.entries(agent.capabilities.skills)
    .sort((a, b) => (b[1].value - a[1].value) || a[0].localeCompare(b[0]))[0]?.[0] ?? 'adaptability';
  const topSkillLabel = toTitleCaseWords(topSkill.replace(/([a-z0-9])([A-Z])/g, '$1 $2'));
  const risk = toTitleCaseWords(agent.deepSimPreview.breakRiskBand);
  return `${role} · ${topSkillLabel} · ${risk} risk`;
}

type DetailsOpenReader = (key: string, defaultOpen: boolean) => boolean;

export function initializeAgentsView(container: HTMLElement) {
  setAgentsPerfEnabled(readAgentsParamsFromHash());
  let roster = loadRoster();
  let activeRecentId: string | null = roster[0]?.id ?? null;
  let activeAgent: GeneratedAgent | null = null;
  let agentVocab: AgentVocabV1 | null = null;
  let agentVocabError: string | null = null;
  let agentPriors: AgentPriorsV1 | null = null;
  let agentPriorsError: string | null = null;
  let shadowCountries: Array<{ shadow: string; iso3: string; continent?: string }> | null = null;
  let shadowCountriesError: string | null = null;
  let shadowByIso3 = new Map<string, { shadow: string; continent?: string }>();
  let useOverrides = false;
  let overrideRoleTags: string[] = [];
  let asOfYear = 2025;
  let homeCountryMode: 'random' | 'fixed' = 'random';
  let homeCountryIso3: string | null = null;
  let seedDraft = normalizeSeedInput(roster.find(x => x.id === activeRecentId)?.seed ?? '');
  let seedError: string | null = getSeedError(seedDraft);
  let isGenerating = false;
  let pendingHashSeed: string | null = readSeedFromHash();
  let pendingHashParams: URLSearchParams | null = pendingHashSeed ? readAgentsParamsFromHash() : null;
  if (pendingHashParams) setAgentsPerfEnabled(pendingHashParams);

  const PROFILE_TAB_KEY = 'agentsProfileTab:v2';
  const readProfileTab = (): AgentProfileTab | null => {
    try {
      const raw = window.localStorage.getItem(PROFILE_TAB_KEY);
      if (!raw) {
        // Try migrating from v1
        const oldRaw = window.localStorage.getItem('agentsProfileTab:v1');
        if (oldRaw) {
          const migrated = migrateOldTabName(oldRaw);
          window.localStorage.setItem(PROFILE_TAB_KEY, migrated);
          window.localStorage.removeItem('agentsProfileTab:v1');
          return migrated;
        }
        return null;
      }
      if (isAgentProfileTab(raw)) return raw;
      // Handle old tab names in URL params or localStorage
      return migrateOldTabName(raw);
    } catch {
      return null;
    }
  };
  const writeProfileTab = (next: AgentProfileTab) => {
    try {
      window.localStorage.setItem(PROFILE_TAB_KEY, next);
    } catch {
      // ignore
    }
  };
  let profileTab: AgentProfileTab = readProfileTab() ?? 'overview';

  const DETAILS_OPEN_KEY = 'agentsDetailsOpen:v1';
  type DetailsOpenMap = Record<string, boolean>;
  const readDetailsOpen = (): DetailsOpenMap => {
    try {
      const raw = window.localStorage.getItem(DETAILS_OPEN_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return {};
      const out: DetailsOpenMap = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'boolean') out[String(k)] = v;
      }
      return out;
    } catch {
      return {};
    }
  };
  const writeDetailsOpen = (next: DetailsOpenMap) => {
    try {
      window.localStorage.setItem(DETAILS_OPEN_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };
  let detailsOpen = readDetailsOpen();
  const isDetailsOpen: DetailsOpenReader = (key, defaultOpen) => {
    const v = detailsOpen[key];
    return typeof v === 'boolean' ? v : defaultOpen;
  };

  if (pendingHashParams) {
    const asOfRaw = pendingHashParams.get('asOf');
    if (asOfRaw != null && asOfRaw.trim()) {
      const asOf = Number(asOfRaw);
      if (Number.isFinite(asOf)) asOfYear = Math.max(1800, Math.min(2525, Math.round(asOf)));
    }
    const home = (pendingHashParams.get('home') ?? '').trim().toUpperCase();
    if (home) {
      homeCountryMode = 'fixed';
      homeCountryIso3 = home;
    }
  }

  if (pendingHashSeed) {
    activeRecentId = null;
    activeAgent = null;
    seedDraft = normalizeSeedInput(pendingHashSeed);
    seedError = getSeedError(seedDraft);
  } else if (!seedDraft) {
    seedDraft = randomSeedString();
    seedError = null;
  }

  const buildGenerateInput = (
    seed: string,
    opts?: { includeOverrides?: boolean; includeTrace?: boolean },
  ) => {
    if (!agentVocab || !shadowCountries || !agentPriors) return null;
    const includeOverrides = opts?.includeOverrides ?? useOverrides;
    const includeTrace = opts?.includeTrace ?? true;
    const birthYearEl = container.querySelector('#agents-birthyear') as HTMLInputElement | null;
    const tierEl = container.querySelector('#agents-tier') as HTMLSelectElement | null;

    const baseInput = {
      seed,
      vocab: agentVocab,
      countries: shadowCountries,
      priors: agentPriors,
      asOfYear,
      homeCountryIso3: homeCountryMode === 'fixed' ? homeCountryIso3 ?? undefined : undefined,
      includeTrace,
    };

    if (!includeOverrides) return baseInput;
    const fallbackBirthYear = activeAgent?.identity.birthYear ?? 1990;
    const fallbackTier = (activeAgent?.identity.tierBand ?? 'middle') as TierBand;
    return {
      ...baseInput,
      birthYear: Number(birthYearEl?.value || fallbackBirthYear),
      tierBand: (tierEl?.value as TierBand) ?? fallbackTier,
      roleSeedTags: overrideRoleTags,
    };
  };

  const rememberAgent = (agent: GeneratedAgent) => {
    const item: RosterItem = {
      id: agent.id,
      name: agent.identity.name,
      seed: agent.seed,
      createdAtIso: agent.createdAtIso,
      agent: { ...agent, generationTrace: undefined },
    };
    roster = [item, ...roster.filter(x => x.id !== item.id)].slice(0, 5);
    activeRecentId = item.id;
    saveRoster(roster);
  };

  const maybeInitAgent = () => {
    if (!agentVocab || !shadowCountries || !agentPriors) return;

    if (pendingHashSeed) {
      const input = buildGenerateInput(pendingHashSeed, { includeTrace: true, includeOverrides: false });
      if (!input) return;
      activeAgent = measureSpan('agents:generate', () => generateAgent(input), { source: 'init-hash' });
      seedDraft = activeAgent.seed;
      seedError = null;
      rememberAgent(activeAgent);
      pendingHashSeed = null;
      pendingHashParams = null;
    } else if (!activeAgent) {
      const input = buildGenerateInput(seedDraft, { includeTrace: true, includeOverrides: false });
      if (!input) return;
      activeAgent = measureSpan('agents:generate', () => generateAgent(input), { source: 'init' });
      seedDraft = activeAgent.seed;
      seedError = null;
      rememberAgent(activeAgent);
    }
  };

  void getAgentVocabV1()
    .then((v) => {
      agentVocab = v;
      agentVocabError = null;
      maybeInitAgent();
      render();
    })
    .catch((err: unknown) => {
      agentVocab = null;
      agentVocabError = err instanceof Error ? err.message : String(err);
      render();
    });

  void getAgentPriorsV1()
    .then((p) => {
      agentPriors = p;
      agentPriorsError = null;
      maybeInitAgent();
      render();
    })
    .catch((err: unknown) => {
      agentPriors = null;
      agentPriorsError = err instanceof Error ? err.message : String(err);
      render();
    });

  void getShadowCountryMap()
    .then((rows) => {
      shadowCountries = rows
        .map((r) => ({
          shadow: String(r.shadow ?? '').trim(),
          iso3: String(r.iso3 ?? '').trim().toUpperCase(),
          continent: r.continent ? String(r.continent).trim() : undefined,
        }))
        .filter((r) => r.shadow && r.iso3.length === 3);
      shadowByIso3 = new Map(shadowCountries.map((r) => [r.iso3, { shadow: r.shadow, continent: r.continent }]));
      shadowCountriesError = null;

      if (homeCountryMode === 'fixed' && homeCountryIso3) {
        const ok = shadowCountries.some(c => c.iso3 === homeCountryIso3);
        if (!ok) {
          homeCountryMode = 'random';
          homeCountryIso3 = null;
        }
      }

      maybeInitAgent();
      render();
    })
    .catch((err: unknown) => {
      shadowCountries = null;
      shadowByIso3 = new Map();
      shadowCountriesError = err instanceof Error ? err.message : String(err);
      render();
    });

  function render() {
    const perfStore = getPerfStore();
    const perfEntries = perfStore?.entries ?? [];
    const perfRecent = perfEntries.slice(-8).reverse();
    const perfLines = perfRecent.length
      ? perfRecent.map((e) => {
        const ms = Number.isFinite(e.ms) ? e.ms.toFixed(1) : String(e.ms);
        return `<div class="agents-panel-summary-meta agent-muted"><code>${escapeHtml(e.name)}</code> ${escapeHtml(ms)}ms</div>`;
      }).join('')
      : `<div class="agent-muted">No spans yet.</div>`;
    const perfPanel = agentsPerfEnabled
      ? `
                <details class="agents-actions" data-agents-details="sidebar:perf" ${isDetailsOpen('sidebar:perf', true) ? 'open' : ''}>
                  <summary class="agents-actions-summary">
                    Perf
                    <span class="agents-actions-hint">${perfEntries.length} spans</span>
                  </summary>
                  <div class="agents-actions-body">
                    <div class="agent-muted">perf=1 enabled. Latest timings:</div>
                    <div class="agents-panel-summary-meta">
                      ${perfLines}
                    </div>
                    <div class="agents-btn-row">
                      <button id="agents-perf-copy" class="agents-btn">Copy timings</button>
                      <button id="agents-perf-clear" class="agents-btn danger">Clear</button>
                    </div>
                  </div>
                </details>
              `
      : '';

    // Only show status when loading or error - hide when all loaded successfully
    const hintLines: string[] = [];
    if (agentVocabError) hintLines.push('Vocabulary missing — run `pnpm extract-data` in `shadow-workipedia`.');
    else if (!agentVocab) hintLines.push('Loading vocabulary…');

    if (agentPriorsError) hintLines.push('Priors missing — run `pnpm extract-data` in `shadow-workipedia`.');
    else if (!agentPriors) hintLines.push('Loading priors…');

    if (shadowCountriesError) hintLines.push('Country map missing — run `pnpm extract-data` in `shadow-workipedia`.');
    else if (!shadowCountries) hintLines.push('Loading country map…');

    const vocabHint = hintLines.length > 0
      ? `<div class="agents-sidebar-subtitle agent-muted agents-hide-mobile">${escapeHtml(hintLines.join(' '))}</div>`
      : '';
    const generationReady = !!(agentVocab && agentPriors && shadowCountries);
    const canGenerate = generationReady && !seedError && !isGenerating;
    const recentRows = roster
      .map(item => {
        const hook = item.agent ? buildRecentHook(item.agent) : 'Generated profile';
        return `
          <button
            type="button"
            class="agents-roster-item agents-recent-item"
            data-roster-id="${escapeHtml(item.id)}"
            aria-label="${escapeHtml(`Load ${item.name}`)}"
          >
            <span class="agents-recent-line">
              <span class="agents-recent-name">${escapeHtml(item.name)}</span>
              <span class="agents-recent-sep"> — </span>
              <span class="agents-recent-hook">${escapeHtml(hook)}</span>
            </span>
          </button>
        `;
      })
      .join('');

    container.innerHTML = `
      <div class="agents-view">
        <div class="agents-body">
          <aside class="agents-sidebar">
            <section class="agents-sidebar-card">
              <div class="agents-sidebar-title">
                <h2>Generator</h2>
              </div>
              ${vocabHint}
              <label class="agents-label agents-label-seed">
                Seed
                <input
                  id="agents-seed"
                  class="agents-input"
                  type="text"
                  value="${escapeHtml(seedDraft)}"
                  placeholder="Seed..."
                  spellcheck="false"
                  ${isGenerating ? 'readonly aria-disabled="true"' : ''}
                />
              </label>
              <div class="agents-seed-error" aria-live="polite">${seedError ? escapeHtml(seedError) : '&nbsp;'}</div>
              <div class="agents-btn-row agents-btn-row-primary agents-btn-row-inline">
                <button id="agents-generate" class="agents-btn primary" ${canGenerate ? '' : 'disabled'}>${isGenerating ? 'Generating...' : 'Generate'}</button>
                <button id="agents-random" class="agents-btn" ${generationReady && !isGenerating ? '' : 'disabled'}>Random</button>
              </div>
              <div class="agents-recent-header">Recent</div>
              <div class="agents-roster-list">
                ${recentRows}
              </div>
              ${perfPanel}
            </section>
          </aside>

          <main class="agents-main">
            ${activeAgent ? renderAgent(activeAgent, shadowByIso3, profileTab, isDetailsOpen, asOfYear, agentVocab) : `<div class="agent-muted">Generate an agent to begin.</div>`}
          </main>
        </div>
      </div>
    `;

    const seedEl = container.querySelector('#agents-seed') as HTMLInputElement | null;
    const seedErrorEl = container.querySelector('.agents-seed-error') as HTMLElement | null;
    const btnRandom = container.querySelector('#agents-random') as HTMLButtonElement | null;
    const btnGenerate = container.querySelector('#agents-generate') as HTMLButtonElement | null;
    const btnPerfCopy = container.querySelector('#agents-perf-copy') as HTMLButtonElement | null;
    const btnPerfClear = container.querySelector('#agents-perf-clear') as HTMLButtonElement | null;
    const btnTraceCopy = container.querySelector('[data-agent-trace-copy]') as HTMLButtonElement | null;

    const syncSeedUi = () => {
      if (seedErrorEl) seedErrorEl.textContent = seedError ?? ' ';
      if (btnGenerate) btnGenerate.disabled = !(agentVocab && agentPriors && shadowCountries) || !!seedError || isGenerating;
    };

    seedEl?.addEventListener('focus', () => {
      seedEl.select();
    });
    seedEl?.addEventListener('input', () => {
      const normalized = normalizeSeedInput(seedEl.value);
      if (seedEl.value !== normalized) seedEl.value = normalized;
      seedDraft = normalized;
      seedError = getSeedError(seedDraft);
      syncSeedUi();
    });
    seedEl?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (btnGenerate && !btnGenerate.disabled) btnGenerate.click();
    });

    for (const btn of Array.from(container.querySelectorAll<HTMLButtonElement>('[data-agent-tab]'))) {
      btn.addEventListener('click', () => {
        const rawNext = (btn.dataset.agentTab ?? '').trim();
        if (!rawNext) return;
        const next = isAgentProfileTab(rawNext) ? rawNext : migrateOldTabName(rawNext);
        if (next === profileTab) return;
        profileTab = next;
        writeProfileTab(profileTab);
        render();
      });
    }

    for (const d of Array.from(container.querySelectorAll<HTMLDetailsElement>('details[data-agents-details]'))) {
      const key = (d.dataset.agentsDetails ?? '').trim();
      if (!key) continue;
      d.addEventListener('toggle', () => {
        detailsOpen = { ...detailsOpen, [key]: d.open };
        writeDetailsOpen(detailsOpen);
      });
    }

    const cognitiveDetailsToggle = container.querySelector('[data-cognitive-details-toggle]') as HTMLButtonElement | null;
    cognitiveDetailsToggle?.addEventListener('click', () => {
      const next = !isDetailsOpen(COGNITIVE_DETAILS_KEY, false);
      detailsOpen = { ...detailsOpen, [COGNITIVE_DETAILS_KEY]: next };
      writeDetailsOpen(detailsOpen);
      render();
    });

    const psychologyDetailsToggle = container.querySelector('[data-psychology-details-toggle]') as HTMLButtonElement | null;
    psychologyDetailsToggle?.addEventListener('click', () => {
      const next = !isDetailsOpen(PSYCHOLOGY_DETAILS_KEY, false);
      detailsOpen = { ...detailsOpen, [PSYCHOLOGY_DETAILS_KEY]: next };
      writeDetailsOpen(detailsOpen);
      render();
    });

    const runGenerate = (source: 'generate' | 'random') => {
      if (!agentVocab || !agentPriors || !shadowCountries || isGenerating) return;
      let seed = source === 'random' ? randomSeedString() : seedDraft;
      seed = normalizeSeedInput(seed);
      if (!seed) seed = randomSeedString();
      seedError = getSeedError(seed);
      seedDraft = seed;
      if (seedError) {
        if (seedEl) seedEl.value = seedDraft;
        syncSeedUi();
        return;
      }

      isGenerating = true;
      render();
      const input = buildGenerateInput(seedDraft, { includeOverrides: false, includeTrace: true });
      if (input) {
        activeAgent = measureSpan('agents:generate', () => generateAgent(input), { source });
        seedDraft = activeAgent.seed;
        seedError = null;
        rememberAgent(activeAgent);
        profileTab = 'overview';
        writeProfileTab(profileTab);
      }
      isGenerating = false;
      render();
    };

    btnRandom?.addEventListener('click', () => runGenerate('random'));
    btnGenerate?.addEventListener('click', () => runGenerate('generate'));

    btnPerfCopy?.addEventListener('click', async () => {
      if (!btnPerfCopy) return;
      const store = getPerfStore();
      const ok = await copyJsonToClipboard(store?.entries ?? []);
      setTemporaryButtonLabel(btnPerfCopy, ok ? 'Copied' : 'Copy failed', ok ? 1100 : 1600);
    });

    btnPerfClear?.addEventListener('click', () => {
      const store = getPerfStore();
      if (!store) return;
      store.entries = [];
      store.last = undefined;
      render();
    });

    btnTraceCopy?.addEventListener('click', async () => {
      if (!btnTraceCopy || !activeAgent?.generationTrace) return;
      const ok = await copyJsonToClipboard(activeAgent.generationTrace);
      setTemporaryButtonLabel(btnTraceCopy, ok ? 'Copied' : 'Copy failed', ok ? 1100 : 1600);
    });

    for (const el of Array.from(container.querySelectorAll<HTMLElement>('[data-roster-id]'))) {
      el.addEventListener('click', () => {
        const id = el.dataset.rosterId ?? '';
        const found = roster.find(x => x.id === id);
        if (!found) return;
        activeRecentId = found.id;
        seedDraft = normalizeSeedInput(found.seed);
        seedError = getSeedError(seedDraft);
        pendingHashSeed = null;
        if (found.agent) activeAgent = found.agent;
        else {
          const input = buildGenerateInput(seedDraft, { includeOverrides: false, includeTrace: true });
          activeAgent = input ? measureSpan('agents:generate', () => generateAgent(input), { source: 'recent' }) : null;
        }
        if (activeAgent) rememberAgent(activeAgent);
        profileTab = 'overview';
        writeProfileTab(profileTab);
        render();
        window.requestAnimationFrame(() => {
          const header = container.querySelector('.agent-profile-header');
          header?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      el.addEventListener('keydown', (e) => {
        if (!(e.key === 'Enter' || e.key === ' ')) return;
        e.preventDefault();
        (el as HTMLElement).click();
      });
    }
  }

  window.addEventListener('hashchange', () => {
    if (!window.location.hash.startsWith('#/agents')) return;
    const seed = readSeedFromHash();
    if (seed) {
      setAgentsPerfEnabled(readAgentsParamsFromHash());
      activeRecentId = null;
      seedDraft = normalizeSeedInput(seed);
      seedError = getSeedError(seedDraft);
      const params = readAgentsParamsFromHash();
      const asOfRaw = params.get('asOf');
      if (asOfRaw != null && asOfRaw.trim()) {
        const asOf = Number(asOfRaw);
        if (Number.isFinite(asOf)) asOfYear = Math.max(1800, Math.min(2525, Math.round(asOf)));
      }
      const home = (params.get('home') ?? '').trim().toUpperCase();
      if (home) {
        homeCountryMode = 'fixed';
        homeCountryIso3 = home;
      } else {
        homeCountryMode = 'random';
        homeCountryIso3 = null;
      }

      const input = buildGenerateInput(seed, { includeOverrides: false, includeTrace: true });
      if (input) {
        activeAgent = measureSpan('agents:generate', () => generateAgent(input), { source: 'hash' });
        rememberAgent(activeAgent);
      }
      else {
        pendingHashSeed = seed;
        pendingHashParams = params;
      }
      render();
    }
  });

  render();
}
