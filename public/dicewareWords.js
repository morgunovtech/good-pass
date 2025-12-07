const DICEWARE_PREFIXES = [
  'ba',
  'be',
  'bi',
  'bo',
  'ca',
  'ce',
  'ci',
  'co',
  'da',
  'de',
  'di',
  'do',
  'fa',
  'fe',
  'fi',
  'fo',
  'ga',
  'ge',
  'gi',
  'go',
  'la',
  'le',
  'li',
  'lo',
  'ma',
  'me',
  'mi',
  'mo',
  'ra',
  're',
  'ri',
  'ro'
];

const SUFFIX_CONSONANTS = ['l', 'n', 'r', 's', 't', 'm', 'p', 'k', 'g', 'd', 'h', 'v', 'z', 'f', 'c', 'b'];
const SUFFIX_VOWELS = ['a', 'e', 'i', 'o'];

const DICEWARE_SUFFIXES = SUFFIX_CONSONANTS.flatMap((consonant) =>
  SUFFIX_VOWELS.map((vowel) => `${consonant}${vowel}`)
);

export const dicewareWords = Object.freeze(
  DICEWARE_PREFIXES.flatMap((prefix) => DICEWARE_SUFFIXES.map((suffix) => `${prefix}${suffix}`))
);

export const DICEWARE_WORD_COUNT = dicewareWords.length;
