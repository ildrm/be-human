export const STANDARD_CLASSES = [
  'SAFETY_CONSTRAINT', 'EVIDENCE_BASED_GUIDELINE', 'VALIDATED_MEASUREMENT', 'SCREENING_INSTRUMENT',
  'CONTEXTUAL_BENCHMARK', 'PHYSIOLOGICAL_MODEL', 'ERGONOMIC_STANDARD', 'PERSONAL_BASELINE',
  'USER_PREFERENCE_VALUE', 'INSUFFICIENT_EVIDENCE_NO_UNIVERSAL_STANDARD',
] as const;

export type StandardClass = (typeof STANDARD_CLASSES)[number];

export type EvidenceStandard = {
  id: string;
  version: string;
  title: string;
  authority: string;
  classification: StandardClass;
  sourceUrl: string;
  publishedOn: string;
  lastVerifiedOn: string;
  population: string;
  jurisdiction: string;
  unit: string | null;
  rule: Record<string, unknown>;
  strength: string;
  limitations: string;
  license: string;
  status: 'active' | 'retired' | 'review';
};

export const evidenceRegistry: readonly EvidenceStandard[] = [
  {
    id: 'who-pa-adults-2020', version: '2020.1', title: 'Physical activity and sedentary behaviour — adults', authority: 'World Health Organization',
    classification: 'EVIDENCE_BASED_GUIDELINE', sourceUrl: 'https://www.who.int/publications/i/item/9789240015128', publishedOn: '2020-11-25', lastVerifiedOn: '2026-09-25',
    population: 'Adults aged 18–64; separate applicability review required for other populations', jurisdiction: 'Global', unit: 'minutes/week',
    rule: { moderateRange: [150, 300], vigorousRange: [75, 150], strengthDaysMinimum: 2, vigorousMultiplier: 2 }, strength: 'Strong recommendation; moderate-certainty evidence',
    limitations: 'Population guidance, not an individual prescription. Activity should be adapted for ability, pregnancy/postpartum, chronic conditions, and professional restrictions.', license: 'WHO publication terms', status: 'active',
  },
  {
    id: 'who5-2024', version: '2024.1', title: 'WHO-5 Well-Being Index scoring', authority: 'World Health Organization', classification: 'VALIDATED_MEASUREMENT',
    sourceUrl: 'https://www.who.int/publications/m/item/WHO-UCN-MSD-MHE-2024.01', publishedOn: '2024-10-02', lastVerifiedOn: '2026-09-25', population: 'Self-report; localized validation and safeguarding policy required', jurisdiction: 'Global', unit: '0–100',
    rule: { items: 5, responseMin: 0, responseMax: 5, normalizedMultiplier: 4 }, strength: 'Validated measurement', limitations: 'Not a diagnosis. A low score is a prompt for attention or further assessment, not a conclusion.', license: 'CC BY-NC-SA 3.0 IGO', status: 'active',
  },
  {
    id: 'aasm-srs-adult-sleep-2015', version: '2015.1', title: 'Recommended sleep duration for healthy adults', authority: 'American Academy of Sleep Medicine and Sleep Research Society', classification: 'EVIDENCE_BASED_GUIDELINE',
    sourceUrl: 'https://doi.org/10.5664/jcsm.4758', publishedOn: '2015-06', lastVerifiedOn: '2026-09-25', population: 'Healthy adults aged 18–60', jurisdiction: 'General clinical consensus', unit: 'hours/night', rule: { minimum: 7 }, strength: 'Expert consensus informed by systematic evidence review', limitations: 'Need varies. More than nine hours may be appropriate for young adults, recovery, and illness. Does not diagnose sleep disorders.', license: 'Citation and summary only', status: 'active',
  },
  {
    id: 'who-healthy-diet-2026', version: '2026.09', title: 'Healthy diet reference limits', authority: 'World Health Organization', classification: 'EVIDENCE_BASED_GUIDELINE',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet', publishedOn: '2026-01-26', lastVerifiedOn: '2026-09-25', population: 'General population; age and clinical applicability required', jurisdiction: 'Global', unit: 'mixed', rule: { freeSugarEnergyFractionMax: 0.1, totalFatEnergyFractionMax: 0.3, sodiumMgMax: 2000, fruitVegetableGramsMinAdults: 400 }, strength: 'WHO guidance summary', limitations: 'Not individualized medical nutrition advice. Access, culture, allergies, pregnancy, illness, and professional restrictions affect applicability.', license: 'WHO website terms', status: 'active',
  },
  {
    id: 'no-universal-life-purpose', version: '1.0', title: 'Life purpose and worldview', authority: 'Be Human scientific governance policy', classification: 'INSUFFICIENT_EVIDENCE_NO_UNIVERSAL_STANDARD',
    sourceUrl: 'urn:be-human:governance:no-universal-standard', publishedOn: '2026-09-18', lastVerifiedOn: '2026-09-18', population: 'All users', jurisdiction: 'All', unit: null, rule: { userDefined: true }, strength: 'Normative safeguard', limitations: 'The system may compare desired and actual alignment but must not rank worldviews or impose a preferred purpose.', license: 'Project policy', status: 'active',
  },
] as const;

export function applicableStandards(input: { age: number; hasProfessionalRestriction?: boolean }): Array<{ standard: EvidenceStandard; applicable: boolean; reason: string }> {
  return evidenceRegistry.map((standard) => {
    if (input.hasProfessionalRestriction && ['who-pa-adults-2020', 'aasm-srs-adult-sleep-2015', 'who-healthy-diet-2026'].includes(standard.id)) {
      return { standard, applicable: false, reason: 'A recorded professional restriction has precedence over this population guideline.' };
    }
    if (standard.id === 'who-pa-adults-2020' && (input.age < 18 || input.age > 64)) return { standard, applicable: false, reason: 'This version is limited to adults aged 18–64.' };
    if (standard.id === 'aasm-srs-adult-sleep-2015' && (input.age < 18 || input.age > 60)) return { standard, applicable: false, reason: 'This consensus statement is limited to healthy adults aged 18–60.' };
    return { standard, applicable: true, reason: 'The recorded age/context is within this standard’s stated scope; individual constraints still take precedence.' };
  });
}
