export interface WowFact {
  emoji: string;
  text: string;
}

export const SURPRISED_FACTS: WowFact[] = [
  { emoji: "🦒", text: "Giraffes have the same number of neck bones as humans!" },
  { emoji: "🐙", text: "Octopuses have 3 hearts and blue blood!" },
  { emoji: "🍓", text: "Strawberries are not actually berries — bananas are!" },
  { emoji: "🍯", text: "Honey never goes bad, even after thousands of years!" },
  { emoji: "🦋", text: "Butterflies taste food with their feet!" },
  { emoji: "🦈", text: "Sharks were swimming before trees existed on Earth!" },
  { emoji: "☁️", text: "A fluffy cloud can weigh more than a million pounds!" },
  { emoji: "🦩", text: "A group of flamingos is called a flamboyance!" },
  { emoji: "🐌", text: "A snail can sleep for three whole years!" },
  { emoji: "🐘", text: "Elephants cannot jump, but they can swim really well!" },
  { emoji: "🌙", text: "The Moon is slowly moving away from the Earth every year!" },
  { emoji: "🐝", text: "Bees can recognize human faces!" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandomFacts(count = 3): WowFact[] {
  return shuffle(SURPRISED_FACTS).slice(0, count);
}