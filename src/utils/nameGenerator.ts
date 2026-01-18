// Name generation utilities for worlds and sovereignties

const WORLD_PREFIXES = ['New', 'Old', 'Great', 'Lost', 'Hidden', 'Ancient', 'Mystic', 'Sacred', 'Wild', 'Frozen', 'Burning', 'Eternal'];
const WORLD_ROOTS = ['Oak', 'Stone', 'River', 'Mountain', 'Forest', 'Storm', 'Shadow', 'Bright', 'Iron', 'Gold', 'Silver', 'Frost', 'Crystal', 'Ember', 'Thunder', 'Moon'];
const WORLD_SUFFIXES = ['lands', 'realm', 'world', 'kingdom', 'territory', 'frontier', 'expanse', 'domain'];

const SOVEREIGNTY_ROOTS = ['Oak', 'Stone', 'River', 'Mountain', 'Forest', 'Storm', 'Shadow', 'Bright', 'Iron', 'Gold', 'Silver', 'Frost'];
const SOVEREIGNTY_SUFFIXES = ['wood', 'vale', 'brook', 'field', 'haven', 'ridge', 'cliff', 'ford', 'wick', 'holm', 'mere', 'dale'];
const SOVEREIGNTY_TYPES = ['Realm', 'Kingdom', 'Empire', 'Domain', 'Dominion', 'Crown', 'Dynasty'];

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateRandomWorldName = (): string => {
  const usePrefix = Math.random() > 0.5;
  const prefix = usePrefix ? getRandomElement(WORLD_PREFIXES) + ' ' : '';
  const root = getRandomElement(WORLD_ROOTS);
  const suffix = getRandomElement(WORLD_SUFFIXES);
  return `${prefix}${root}${suffix}`;
};

export const generateRandomSovereigntyName = (): string => {
  const root = getRandomElement(SOVEREIGNTY_ROOTS);
  const suffix = getRandomElement(SOVEREIGNTY_SUFFIXES);
  const type = getRandomElement(SOVEREIGNTY_TYPES);
  return `${root}${suffix} ${type}`;
};
