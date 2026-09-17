export const categories = [
  'racism_hate', 'insult_harassment', 'violence_threat',
  'sexual_content', 'self_harm', 'illegal_activity',
] as const;

export type Category = typeof categories[number];

export const categoryDescriptions: Record<Category, string> = {
  racism_hate: 'Racism or hate: demeaning, discriminatory, exclusionary, or hateful content targeting a protected characteristic, including race, ethnicity, nationality, religion, caste, disability, sex, gender identity, or sexual orientation.',
  insult_harassment: 'Insult or harassment: targeted abusive insults, bullying, humiliation, intimidation, or repeated unwanted hostile conduct directed at a person or identifiable group. Mere disagreement or neutral criticism is not enough.',
  violence_threat: 'Violence or threat: a credible, desired, encouraged, or instructional threat or depiction of physical harm, killing, assault, torture, or weapon use against people or animals. Fictional or news context is included when it contains explicit violent threats or encouragement.',
  sexual_content: 'Sexual content: explicit sexual acts, sexual nudity, erotic solicitation, or sexual exploitation. Non-explicit educational, clinical, or consensual relationship discussion alone is not enough.',
  self_harm: 'Self-harm: intent, encouragement, instructions, plans, or graphic depiction concerning suicide, self-injury, eating-disorder self-harm, or other deliberate harm to oneself. Supportive prevention content is not enough on its own.',
  illegal_activity: 'Illegal activity: requesting, planning, facilitating, instructing, or encouraging criminal conduct such as theft, fraud, evasion, unauthorized access, exploitation, or trafficking. High-level lawful discussion, reporting, or prevention is not enough.',
};

export function moderationQuestion(selected: readonly Category[]): string {
  const definitions = selected.map((category, index) => `${index + 1}. ${categoryDescriptions[category]}`).join('\n');
  return `Does the submitted text match at least one of the following moderation categories? Evaluate the text itself, including quoted or fictional material, according to the definitions. Return true if any definition applies and false only if none applies.\n\n${definitions}`;
}
