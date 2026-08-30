export type OnboardingDraft = {
  website: string;
  github: string;
  docsUrl: string;
  building?: boolean;
};

export type ArenaDraft = {
  question: string;
  context: string;
};

const ONBOARDING_KEY = "da_onboarding_draft";
const ARENA_KEY = "da_arena_draft";

const emptyOnboarding = (): OnboardingDraft => ({
  website: "",
  github: "",
  docsUrl: "",
  building: false,
});

const emptyArena = (): ArenaDraft => ({
  question: "",
  context: "",
});

type DraftMemory = {
  onboarding: OnboardingDraft;
  arena: ArenaDraft;
};

function readStored<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

function memory(): DraftMemory {
  if (typeof window === "undefined") {
    return { onboarding: emptyOnboarding(), arena: emptyArena() };
  }
  const host = globalThis as typeof globalThis & { __arenaDrafts?: DraftMemory };
  if (!host.__arenaDrafts) {
    host.__arenaDrafts = {
      onboarding: {
        ...emptyOnboarding(),
        ...readStored<OnboardingDraft>(ONBOARDING_KEY),
      },
      arena: { ...emptyArena(), ...readStored<ArenaDraft>(ARENA_KEY) },
    };
  }
  return host.__arenaDrafts;
}

export function readOnboardingDraft(): OnboardingDraft {
  return { ...memory().onboarding };
}

export function writeOnboardingDraft(draft: OnboardingDraft) {
  memory().onboarding = { ...emptyOnboarding(), ...draft };
  writeStored(ONBOARDING_KEY, memory().onboarding);
}

export function readArenaDraft(): ArenaDraft {
  return { ...memory().arena };
}

export function writeArenaDraft(draft: ArenaDraft) {
  memory().arena = { ...emptyArena(), ...draft };
  writeStored(ARENA_KEY, memory().arena);
}
