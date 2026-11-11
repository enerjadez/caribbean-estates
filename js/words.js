const words = `
towel shell mango lime curry chair spoon cup bird palm sand dusk lamp bread cake boat gate wave lemon rice naan milk honey salt pepper onion garlic ginger chilli clove cinnamon sugar butter cream yoghurt cheese egg flour oil vinegar honey tea coffee juice water glass plate bowl fork knife napkin table bench cushion pillow sheet blanket fan window door step path grass flower leaf stone shell coral fish crab gull heron stork parrot dove pigeon sparrow robin lizard frog butterfly moth cricket lantern candle match torch bucket sponge rope balloon sock bean lime spoon parade cheer medal ribbon trophy crown star moon sun cloud rain wind tide foam reef bay coast hill road car key map ticket photo album story song dance laugh smile clap whisper secret recipe chutney roti bread pudding trifle custard jelly biscuit samoosa pie roast gravy mint coriander parsley basil thyme rosemary bay leaf nutmeg vanilla cocoa pepper mill kettle pot pan lid steam flame smoke oven grill braai fire wood coal ash ember spark lantern porch veranda hammock swing shade umbrella hat scarf shirt dress sock sandal slipper towel mat rug carpet curtain blind mirror clock watch phone charger plug switch light bulb candle book page pen pencil paper note list score whistle cone tape medal badge flag colour yellow blue red teal gold island sea sky night dawn noon dusk evening morning family cousin uncle aunt sister brother mother father child elder judge captain team point round turn guess draw act sing hum clap count stack flip toss catch drop walk stop look listen quiet still pose bird photo sunset meal shell sign feet laugh
`.trim().split(/\s+/);

const unique = [];
const seen = new Set();
for (const word of words) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length < 3 || seen.has(clean)) continue;
  seen.add(clean);
  unique.push(clean);
}

export const wordList = unique;

export function wordForDate(dateKey) {
  let hash = 0;
  for (const char of dateKey) hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0;
  return wordList[hash % wordList.length];
}
