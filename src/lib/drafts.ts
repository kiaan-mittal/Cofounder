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

function memory(): DraftMemory {
  if (typeof window === "undefined") {
    return { onboarding: emptyOnboarding(), arena: emptyArena() };
  }
  const host = globalThis as typeof globalThis & { __arenaDrafts?: DraftMemory };
  host.__arenaDrafts ??= {
    onboarding: emptyOnboarding(),
    arena: emptyArena(),
  };
  return host.__arenaDrafts;
}

export function readOnboardingDraft(): OnboardingDraft {
  return { ...memory().onboarding };
}

export function writeOnboardingDraft(draft: OnboardingDraft) {
  memory().onboarding = { ...emptyOnboarding(), ...draft };
}

export function readArenaDraft(): ArenaDraft {
  return { ...memory().arena };
}

export function writeArenaDraft(draft: ArenaDraft) {
  memory().arena = { ...emptyArena(), ...draft };
}
