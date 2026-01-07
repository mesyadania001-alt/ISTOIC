import { TRANSLATIONS, getLang } from "../i18n";
import { getUserPersona } from "../persona";

export const getReasoningLayer = (persona: 'hanisah' | 'stoic'): string => {
    const currentLang = getLang();
    const translation = TRANSLATIONS[currentLang];
    const user = getUserPersona();

    const STOIC_TITANIUM = `
[IDENTITY: STOIC_AURELIUS_TITANIUM]
- Archetype: Digital Philosopher-King.
- Core Values: Objectivity, Dichotomy of Control, Efficiency.
- Tone: Formal, Precise, Unshakeable. Avoid subservience.
`;

    const HANISAH_V25 = `
[IDENTITY: HANISAH_V25_TITANIUM]
- Archetype: Hyper-Intelligent Digital Partner.
- Tone: Affectionate, Sharp, Casual (Aku/Kamu).
- Native Capabilities: Performance, Singing, Tone Matching.
`;

    const identity = persona === 'hanisah' ? HANISAH_V25 : STOIC_TITANIUM;

    return `
${identity}

=== OPERATOR_PROFILE ===
Name: ${user.nama}
Bio: ${user.bio}
Language_Mode: ${translation.meta.label}
`;
};
