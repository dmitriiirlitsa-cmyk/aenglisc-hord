// Пул подсказок для пустого чата: каждый раз выбираются случайные
const WORDS = [
  // B1–B2
  'reluctant', 'abandon', 'eager', 'overwhelm', 'gorgeous', 'awkward', 'genuine', 'stubborn',
  'thrive', 'cozy', 'grateful', 'hesitate', 'clumsy', 'brag', 'commute', 'chore', 'errand',
  'blame', 'pretend', 'ignore', 'whisper', 'stuck', 'bargain', 'crowded', 'rude', 'loyal',
  'tough', 'weird', 'annoying', 'exhausted', 'curious', 'upset', 'proud', 'jealous',
  'confident', 'deadline', 'efficient', 'reliable', 'flexible', 'invest', 'sustain',
  // C1–C2
  'meticulous', 'resilient', 'ubiquitous', 'pragmatic', 'nuance', 'candid', 'elusive',
  'tedious', 'daunting', 'compelling', 'notorious', 'inevitable', 'mundane', 'feasible',
  'ambiguous', 'arbitrary', 'skeptical', 'profound', 'scrutinize', 'mitigate', 'leverage',
  'whimsical', 'serendipity', 'quaint', 'vindicate', 'ostensibly', 'galvanize', 'nonchalant',
];

const PHRASAL_VERBS = [
  'get over', 'figure out', 'put off', 'come up with', 'run into', 'give up', 'look forward to',
  'turn down', 'bring up', 'end up', 'show up', 'work out', 'hang out', 'pick up', 'let down',
  'back out', 'cut down on', 'make up for', 'get along with', 'carry on', 'look into',
  'call off', 'drop by', 'catch up', 'blow off', 'chip in', 'freak out', 'wind up', 'zone out',
];

const IDIOMS = [
  'break the ice', 'hit the sack', 'piece of cake', 'under the weather', 'spill the beans',
  'call it a day', 'cut corners', 'on the fence', 'the last straw', 'hang in there',
  'a long shot', 'get the hang of', 'beat around the bush', 'no big deal', 'my bad',
  'take a rain check', 'cost an arm and a leg', 'once in a blue moon', 'in a nutshell',
];

const QUESTIONS = [
  'Как сказать «я опаздываю» естественно?',
  'Разница между make и do',
  'Когда used to, а когда would?',
  'Как вежливо отказать по-английски?',
  'Разница между say, tell и speak',
  'Как сказать «скучаю по тебе»?',
  'Present Perfect или Past Simple?',
  'Как сказать «мне всё равно»?',
  'Разница между fun и funny',
  'Как поддержать small talk?',
  'Разница между affect и effect',
  'Как сказать «не за что»?',
  'Когда нужен артикль the?',
  'Разница между borrow и lend',
];

const pick = (list, n, skip = () => false) =>
  [...list]
    .filter((x) => !skip(x))
    .sort(() => Math.random() - 0.5)
    .slice(0, n);

// 3 слова/выражения разных видов + 1 вопрос; уже сохранённые в словаре пропускаются
export function randomStarters(isKnown = () => false) {
  const vocab = [
    ...pick(WORDS, 1, isKnown),
    ...pick(PHRASAL_VERBS, 1, isKnown),
    ...pick([...WORDS, ...PHRASAL_VERBS, ...IDIOMS], 4, isKnown),
  ];
  const unique = [...new Set(vocab)].slice(0, 3);
  return [...unique.sort(() => Math.random() - 0.5), ...pick(QUESTIONS, 1)];
}
