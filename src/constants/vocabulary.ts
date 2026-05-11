export const VOCAB_AR = ['لا', 'نعم', 'حمام', 'إنذار', 'عطش', 'جوع', 'دواء'] as const;

export type VocabArWord = (typeof VOCAB_AR)[number];

