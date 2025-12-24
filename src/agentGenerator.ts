export type TierBand = 'elite' | 'middle' | 'mass';

export type Band5 = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

export type Fixed = number; // fixed-point int, typically 0..1000

export type GeneratedAgent = {
  version: 1;
  id: string;
  seed: string;
  createdAtIso: string;

  identity: {
    name: string;
    homeCulture: string;
    birthYear: number;
    tierBand: TierBand;
    roleSeedTags: string[];
    languages: string[];
  };

  appearance: {
    heightBand: 'very_short' | 'short' | 'average' | 'tall' | 'very_tall';
    buildTag: string;
    hair: { color: string; texture: string };
    eyes: { color: string };
    voiceTag: string;
    distinguishingMarks: string[];
  };

  capabilities: {
    aptitudes: {
      strength: Fixed;
      endurance: Fixed;
      dexterity: Fixed;
      reflexes: Fixed;
      handEyeCoordination: Fixed;

      cognitiveSpeed: Fixed;
      attentionControl: Fixed;
      workingMemory: Fixed;
      riskCalibration: Fixed;

      charisma: Fixed;
      empathy: Fixed;
      assertiveness: Fixed;
      deceptionAptitude: Fixed;
    };
    skills: Record<string, { value: Fixed; xp: Fixed; lastUsedDay: number | null }>;
  };

  preferences: {
    food: {
      comfortFoods: string[];
      dislikes: string[];
      restrictions: string[];
      ritualDrink: string;
    };
    media: {
      platformDiet: Record<string, Fixed>;
      genreTopK: string[];
      attentionResilience: Fixed;
      doomscrollingRisk: Fixed;
      epistemicHygiene: Fixed;
    };
    fashion: {
      styleTags: string[];
      formality: Fixed;
      conformity: Fixed;
      statusSignaling: Fixed;
    };
  };

  routines: {
    chronotype: string;
    sleepWindow: string;
    recoveryRituals: string[];
  };

  vices: Array<{
    vice: string;
    severity: Band5;
    triggers: string[];
  }>;

  logistics: {
    identityKit: Array<{ item: string; security: Band5; compromised: boolean }>;
  };
};

export type GenerateAgentInput = {
  seed: string;
  birthYear?: number;
  tierBand?: TierBand;
  homeCulture?: string;
  roleSeedTags?: string[];
};

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampFixed01k(value: number): Fixed {
  return clampInt(value, 0, 1000);
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

type Rng = {
  nextU32: () => number;
  next01: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  pickK: <T>(items: readonly T[], k: number) => T[];
};

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    nextU32: () => (next() * 0x1_0000_0000) >>> 0,
    next01: () => next(),
    int: (min, max) => {
      const a = Math.ceil(min);
      const b = Math.floor(max);
      return a + Math.floor(next() * (b - a + 1));
    },
    pick: (items) => items[Math.floor(next() * items.length)]!,
    pickK: (items, k) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      }
      return copy.slice(0, Math.max(0, Math.min(k, copy.length)));
    },
  };
}

function facetSeed(seed: string, facet: string): number {
  return fnv1a32(`${seed}::${facet}`);
}

function normalizeSeed(seed: string): string {
  return seed.trim().replace(/\s+/g, ' ').slice(0, 200);
}

export function randomSeedString(): string {
  const cryptoObj = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(8);
    cryptoObj.getRandomValues(bytes);
    let n = 0n;
    for (const b of bytes) n = (n << 8n) | BigInt(b);
    return n.toString(36);
  }

  // Fallback for contexts where WebCrypto isn't available (e.g. some file:// environments).
  const a = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
  const b = Date.now().toString(36);
  return `${a}${b}`;
}

function band5From01k(value: Fixed): Band5 {
  if (value < 200) return 'very_low';
  if (value < 400) return 'low';
  if (value < 600) return 'medium';
  if (value < 800) return 'high';
  return 'very_high';
}

function topKByScore(items: readonly string[], score: (item: string) => number, k: number): string[] {
  return [...items]
    .map(item => ({ item, score: score(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, k))
    .map(x => x.item);
}

export function generateAgent(input: GenerateAgentInput): GeneratedAgent {
  const seed = normalizeSeed(input.seed);
  const base = makeRng(facetSeed(seed, 'base'));

  const birthYear = clampInt(input.birthYear ?? base.int(1960, 2006), 1800, 2525);
  const tierBand: TierBand = input.tierBand ?? base.pick(['elite', 'middle', 'mass'] as const);
  const homeCulture = (input.homeCulture ?? base.pick(['Global', 'Americas', 'Europe', 'MENA', 'Sub‑Saharan Africa', 'South Asia', 'East Asia', 'Oceania'] as const)) as string;
  const roleSeedTags = (input.roleSeedTags?.length ? input.roleSeedTags : base.pickK(['operative', 'analyst', 'diplomat', 'organizer', 'technocrat', 'security', 'media', 'logistics'], 2))
    .slice(0, 4);

  const nameRng = makeRng(facetSeed(seed, 'name'));
  const firstNames = ['Amina', 'Ilya', 'Noor', 'Sofia', 'Mateo', 'Aya', 'Jun', 'Leila', 'Hugo', 'Zara', 'Samir', 'Mira', 'Kaito', 'Nadia', 'Daniel', 'Priya'] as const;
  const lastNames = ['Khan', 'Novak', 'Silva', 'Haddad', 'Kim', 'Garcia', 'Dubois', 'Okoye', 'Ibrahim', 'Nakamura', 'Rossi', 'Patel', 'Mensah', 'Santos', 'Sato', 'Nguyen'] as const;
  const name = `${nameRng.pick(firstNames)} ${nameRng.pick(lastNames)}`;

  const langRng = makeRng(facetSeed(seed, 'languages'));
  const languages = langRng.pickK(
    ['English', 'Spanish', 'French', 'Arabic', 'Hindi', 'Mandarin', 'Russian', 'Portuguese', 'Japanese', 'Swahili', 'Turkish', 'German'] as const,
    langRng.int(1, 3)
  );

  const appearanceRng = makeRng(facetSeed(seed, 'appearance'));
  const heightBand = appearanceRng.pick(['very_short', 'short', 'average', 'tall', 'very_tall'] as const);
  const buildTag = appearanceRng.pick(['lean', 'athletic', 'stocky', 'lanky', 'compact'] as const);
  const hair = { color: appearanceRng.pick(['black', 'brown', 'blonde', 'auburn', 'gray'] as const), texture: appearanceRng.pick(['straight', 'wavy', 'curly', 'coily'] as const) };
  const eyes = { color: appearanceRng.pick(['brown', 'hazel', 'green', 'blue', 'gray'] as const) };
  const voiceTag = appearanceRng.pick(['soft-spoken', 'measured', 'fast-talking', 'commanding', 'warm'] as const);
  const distinguishingMarks = appearanceRng.pickK(['scar', 'freckles', 'tattoo', 'piercing', 'birthmark', 'callused hands'] as const, appearanceRng.int(0, 2));

  const capRng = makeRng(facetSeed(seed, 'capabilities'));
  const physical = capRng.int(200, 900);
  const coordination = capRng.int(200, 900);
  const cognitive = capRng.int(200, 900);
  const social = capRng.int(200, 900);

  const aptitudes = {
    strength: clampFixed01k(0.75 * physical + 0.25 * capRng.int(0, 1000) - (tierBand === 'elite' ? 30 : 0)),
    endurance: clampFixed01k(0.70 * physical + 0.30 * capRng.int(0, 1000)),
    dexterity: clampFixed01k(0.60 * coordination + 0.40 * capRng.int(0, 1000)),
    reflexes: clampFixed01k(0.75 * coordination + 0.25 * capRng.int(0, 1000)),
    handEyeCoordination: clampFixed01k(0.80 * coordination + 0.20 * capRng.int(0, 1000)),

    cognitiveSpeed: clampFixed01k(0.70 * cognitive + 0.30 * capRng.int(0, 1000)),
    attentionControl: clampFixed01k(0.55 * cognitive + 0.45 * capRng.int(0, 1000)),
    workingMemory: clampFixed01k(0.65 * cognitive + 0.35 * capRng.int(0, 1000)),
    riskCalibration: clampFixed01k(0.45 * cognitive + 0.55 * capRng.int(0, 1000)),

    charisma: clampFixed01k(0.75 * social + 0.25 * capRng.int(0, 1000)),
    empathy: clampFixed01k(0.55 * social + 0.45 * capRng.int(0, 1000)),
    assertiveness: clampFixed01k(0.50 * social + 0.50 * capRng.int(0, 1000)),
    deceptionAptitude: clampFixed01k(0.40 * social + 0.60 * capRng.int(0, 1000)),
  };

  const skillRng = makeRng(facetSeed(seed, 'skills'));
  const baseSkillValue = (min: number, max: number) => clampFixed01k(skillRng.int(min, max));

  const skillKeys = [
    'driving',
    'shooting',
    'surveillance',
    'tradecraft',
    'firstAid',
    'negotiation',
    'mediaHandling',
    'bureaucracy',
    'financeOps',
    'legalOps',
  ] as const;

  const skills: GeneratedAgent['capabilities']['skills'] = Object.fromEntries(
    skillKeys.map((k) => [k, { value: baseSkillValue(120, 720), xp: clampFixed01k(skillRng.int(0, 500)), lastUsedDay: null }])
  ) as GeneratedAgent['capabilities']['skills'];

  // Role seed nudges (bounded)
  const bump = (key: keyof typeof skills, delta: number) => {
    skills[key].value = clampFixed01k(skills[key].value + delta);
  };

  for (const tag of roleSeedTags) {
    if (tag === 'operative') {
      bump('tradecraft', 150);
      bump('surveillance', 120);
      bump('driving', 80);
    } else if (tag === 'security') {
      bump('shooting', 140);
      bump('firstAid', 80);
      bump('tradecraft', 60);
    } else if (tag === 'diplomat') {
      bump('negotiation', 180);
      bump('bureaucracy', 80);
    } else if (tag === 'media') {
      bump('mediaHandling', 200);
      bump('negotiation', 60);
    } else if (tag === 'technocrat') {
      bump('bureaucracy', 140);
      bump('financeOps', 90);
      bump('legalOps', 60);
    } else if (tag === 'logistics') {
      bump('driving', 160);
      bump('firstAid', 60);
    } else if (tag === 'analyst') {
      bump('surveillance', 120);
      bump('bureaucracy', 60);
    } else if (tag === 'organizer') {
      bump('negotiation', 120);
      bump('mediaHandling', 80);
    }
  }

  const prefsRng = makeRng(facetSeed(seed, 'preferences'));
  const cuisines = ['street food', 'home cooking', 'fine dining', 'spicy food', 'seafood', 'grilled meats', 'vegetarian dishes', 'desserts'] as const;
  const comfortFoods = prefsRng.pickK(cuisines, 2);
  const dislikes = prefsRng.pickK(['bitter greens', 'sweet drinks', 'oily food', 'raw fish', 'very spicy', 'dairy', 'red meat'] as const, prefsRng.int(1, 3));
  const restrictions = prefsRng.pickK(['halal', 'kosher', 'vegetarian', 'lactose-sensitive', 'gluten-sensitive'] as const, prefsRng.int(0, 1));
  const ritualDrink = prefsRng.pick(['tea', 'coffee', 'mate', 'sparkling water', 'black espresso'] as const);

  const genres = ['political thriller', 'hard sci-fi', 'romance', 'crime', 'history', 'tech podcasts', 'sports', 'strategy games', 'documentaries'] as const;
  const genreTopK = prefsRng.pickK(genres, 5);
  const platforms = ['print', 'radio', 'tv', 'social', 'closed'] as const;
  const platformDietRaw = platforms.map(p => ({ p, w: prefsRng.int(1, 100) }));
  const totalW = platformDietRaw.reduce((s, x) => s + x.w, 0);
  const platformDiet: Record<string, Fixed> = Object.fromEntries(platformDietRaw.map(({ p, w }) => [p, clampInt((w / totalW) * 1000, 0, 1000)]));

  const fashionRng = makeRng(facetSeed(seed, 'fashion'));
  const styleTags = fashionRng.pickK(['minimalist', 'formal', 'utilitarian', 'streetwear', 'heritage', 'avant-garde', 'classic', 'sporty'] as const, 3);
  const formality = clampFixed01k(fashionRng.int(0, 1000));
  const conformity = clampFixed01k(fashionRng.int(0, 1000));
  const statusSignaling = clampFixed01k(fashionRng.int(0, 1000));

  const routinesRng = makeRng(facetSeed(seed, 'routines'));
  const chronotype = routinesRng.pick(['early', 'standard', 'night'] as const);
  const sleepWindow = chronotype === 'early' ? '22:00–06:00' : chronotype === 'night' ? '02:00–10:00' : '00:00–08:00';
  const recoveryRituals = routinesRng.pickK(['long walk', 'journaling', 'quiet music', 'gym session', 'cook a meal', 'call a friend', 'meditation'] as const, 2);

  const vicesRng = makeRng(facetSeed(seed, 'vices'));
  const vicePool = ['alcohol', 'stims', 'doomscrolling', 'gambling', 'workaholism'] as const;
  const viceCount = vicesRng.int(0, 2);
  const vices = vicesRng.pickK(vicePool, viceCount).map((vice) => {
    const severityValue = clampFixed01k(vicesRng.int(100, 950));
    const triggers = vicesRng.pickK(['sleep debt', 'humiliation', 'loneliness', 'mission failure', 'public backlash', 'moral injury'] as const, vicesRng.int(1, 3));
    return { vice, severity: band5From01k(severityValue), triggers };
  });

  const logisticsRng = makeRng(facetSeed(seed, 'logistics'));
  const kitItems = logisticsRng.pickK(['passport set', 'burner phone', 'laptop', 'cover documents', 'keepsake', 'cash stash', 'keys'] as const, 5)
    .map((item) => {
      const security = band5From01k(clampFixed01k(logisticsRng.int(150, 900)));
      return { item, security, compromised: false };
    });

  const id = fnv1a32(`${seed}::${birthYear}::${homeCulture}::${tierBand}`).toString(16);

  return {
    version: 1,
    id,
    seed,
    createdAtIso: new Date().toISOString(),
    identity: {
      name,
      homeCulture,
      birthYear,
      tierBand,
      roleSeedTags,
      languages,
    },
    appearance: {
      heightBand,
      buildTag,
      hair,
      eyes,
      voiceTag,
      distinguishingMarks,
    },
    capabilities: {
      aptitudes,
      skills,
    },
    preferences: {
      food: { comfortFoods, dislikes, restrictions, ritualDrink },
      media: {
        platformDiet,
        genreTopK,
        attentionResilience: clampFixed01k(prefsRng.int(0, 1000)),
        doomscrollingRisk: clampFixed01k(prefsRng.int(0, 1000)),
        epistemicHygiene: clampFixed01k(prefsRng.int(0, 1000)),
      },
      fashion: { styleTags, formality, conformity, statusSignaling },
    },
    routines: {
      chronotype,
      sleepWindow,
      recoveryRituals,
    },
    vices,
    logistics: {
      identityKit: kitItems,
    },
  };
}

export function formatFixed01k(value: Fixed): string {
  const pct = clampInt((value / 1000) * 100, 0, 100);
  return `${pct}%`;
}

export function formatBand5(value: Fixed): Band5 {
  return band5From01k(value);
}

export function topGenres(agent: GeneratedAgent): string[] {
  const genres = agent.preferences.media.genreTopK;
  return topKByScore(genres, (g) => fnv1a32(`${agent.seed}::genre::${g}`), Math.min(5, genres.length));
}
