export const teams = [
  {
    id: "jamaica",
    name: "Jamaica",
    colour: "#e2b43a",
    crest: "assets/jamaica.jpg",
    ink: "#1a1404",
    players: [
      { id: "mike", name: "Mike" },
      { id: "lenny", name: "Lenny" },
      { id: "mahi", name: "Mahi" },
      { id: "ma", name: "Ma" },
      { id: "shireen", name: "Shireen" }
    ]
  },
  {
    id: "barbados",
    name: "Barbados",
    colour: "#3d7ec4",
    crest: "assets/barbados.jpg",
    ink: "#f4f8ff",
    players: [
      { id: "lee", name: "Lee" },
      { id: "kaily", name: "Kaily" },
      { id: "losh", name: "Losh" },
      { id: "vassi", name: "Vassi" },
      { id: "trivesh", name: "Trivesh" }
    ]
  },
  {
    id: "trinidad",
    name: "Trinidad",
    colour: "#d4534c",
    crest: "assets/trinidad.jpg",
    ink: "#fff6f5",
    players: [
      { id: "seshni", name: "Seshni" },
      { id: "tracy", name: "Tracy" },
      { id: "sadhana", name: "Sadhana" },
      { id: "angath", name: "Angath" },
      { id: "jaden", name: "Jaden" }
    ]
  },
  {
    id: "bahamas",
    name: "Bahamas",
    colour: "#1f9a90",
    crest: "assets/bahamas.jpg",
    ink: "#04211e",
    players: [
      { id: "premie", name: "Premie" },
      { id: "liyah", name: "Liyah" },
      { id: "shanelle", name: "Shanelle" },
      { id: "antan", name: "Antan" },
      { id: "thatha", name: "Thatha" }
    ]
  }
];

export const notes = [
  "Mahi plays with a partner, or takes the easier mark.",
  "Ma, Losh and Thatha take the short course or a chair.",
  "Spoon snap pairs people of a similar age."
];

export const poses = [
  { id: "wall-sit", name: "Wall-sit", seated: "Seated march, knees lifting" },
  { id: "tree", name: "Tree pose", seated: "Seated ankle alphabet" },
  { id: "warrior", name: "Warrior II", seated: "Seated twist" },
  { id: "chair", name: "Chair pose", seated: "Hands on knees, slow breath count" },
  { id: "flamingo", name: "Flamingo", seated: "Seated heel lifts" },
  { id: "hero", name: "Superhero", seated: "Arms wide, hold the smile" }
];

export const bounties = [
  { id: "thatha", name: "Thatha laughing", detail: "A real laugh, not a pose he hates." },
  { id: "cheer", name: "The veranda cheer", detail: "The whole team in one frame. Chairs count. One wave at the camera." },
  { id: "generations", name: "Oldest and youngest", detail: "The oldest and the youngest on your team, side by side." },
  { id: "shadow", name: "Shadow animal", detail: "Hands on a wall. Make your team's animal if you can." },
  { id: "sky", name: "The sky right now", detail: "Point the phone up. Cloud, moon, or just blue." },
  { id: "blue-bird", name: "Blue bird", detail: "Any blue bird, on purpose." },
  { id: "sunset", name: "Four colours at sunset", detail: "Gold, blue, red, and teal in one frame." },
  { id: "meal", name: "Meal mid-cook", detail: "The pot, the hands, the steam." },
  { id: "shell", name: "A shell with a face", detail: "The face can be generous." },
  { id: "decoration", name: "Christmas, out of place", detail: "A decoration where it does not belong." },
  { id: "sign", name: "The estate sign", detail: "Caribbean Estates, readable." },
  { id: "pose-photo", name: "Someone mid-pose", detail: "The hold, caught in the act." }
];

const play = {
  "sock-toss": {
    blurb: "Ten throws at a bucket. Each sock that stays in is a point.",
    about: "Set a bucket or a bowl on the floor and mark a throwing line. Each team gets ten throws. A sock that stays in the bucket counts as 1. One that bounces out does not. Elders step closer to the bucket. Mahi throws at a wider bucket. The captain writes how many went in. The fullest bucket takes first place."
  },
  "parade": {
    blurb: "Dress in your colour and give one short cheer.",
    about: "Each team puts on its colour, gold, blue, red, or teal, and walks in together. Then you do one cheer, a chant, a clap, or a line of a song, for about fifteen seconds. The rest of the house, or the elders, decide the order they loved. First gets 4 cup points, then 3, 2, and 1. Type those points straight onto the sheet."
  },
  trivia: {
    blurb: "Ten questions on the Caribbean, Christmas, and this family.",
    about: "Someone reads ten questions. They can be about the islands, Christmas, or stories this family actually knows. The team huddles and gives one answer. Elders can captain the huddle so nobody talks over them. A right answer is 1. Write how many the team got, out of 10. Most right wins."
  },
  "egg-spoon": {
    blurb: "Carry an egg on a spoon. The fastest team wins.",
    about: "Balance an egg, or a ping-pong ball, on a spoon and walk the course. If it drops, only that person restarts their own leg. Everyone else keeps their place. Ma, Losh, and Thatha walk a shorter leg. Mahi goes with a partner. Time the whole team in seconds. The fastest team wins, so a smaller time is better."
  },
  balloons: {
    blurb: "Toss a balloon and step back after every catch.",
    about: "Two people face each other and toss a water balloon. A soft ball works if you want to stay dry. After each catch, both take one step back. Continue until the balloon breaks or someone misses. Sitting and tossing is allowed. Pair people of a similar size. Write how many steps apart they were on the last good catch. Further is better."
  },
  beanbag: {
    blurb: "Three throws into zones worth 1, 3, and 5.",
    about: "Mark three patches on the ground, or three bowls, worth 1, 3, and 5. Each person gets three throws with a beanbag, a rolled sock, or a small ball. Younger players stand further back. Add the team's points and write the total. The highest total wins."
  },
  "cup-stack": {
    blurb: "Build a cup pyramid and unstack it before the minute ends.",
    about: "Two people and a pile of plastic cups. They have sixty seconds to build a pyramid and then unstack it back into one pile. That finished up-and-down is one stack. Sitting is fine. When the minute ends, the next pair can go. Write how many full stacks the team finished. More stacks wins."
  },
  charades: {
    blurb: "Act a word in silence. The team guesses.",
    about: "One person acts a word. No talking, and no pointing at the real object. The rest of the team shouts guesses. Use Christmas, the estate, films, and family jokes. Take turns acting, about a minute each. Write how many the team guessed. Most guessed wins."
  },
  thirty: {
    blurb: "Describe names for thirty seconds. Do not say the word.",
    about: "One player talks for thirty seconds and tries to get the team to say as many names as possible. They can describe, but they cannot say the name itself. Use this house: the food, the drive down, the beach, Christmas with Ma. The team calls the answers out. Play five rounds and rotate who describes. Write the total the team got right. This page only keeps the score. It does not deal a deck."
  },
  impostor: {
    blurb: "Give clues. Find the person whose word is different.",
    about: "Most players share one secret word. One or two impostors get a different word, or no word at all. You go around the circle and each say a clue, without saying the word. Then you talk and vote someone out. Eight to ten people play. Everyone else watches. A vote only removes you from that round. When a side wins, the captain types cup points for the teams on the winning side. This page does not hand out the words."
  },
  pictionary: {
    blurb: "Draw a word in sixty seconds. The team guesses.",
    about: "One person draws. Their team guesses. They have sixty seconds. No letters, and the drawer does not talk. Elders can describe the word out loud instead of drawing if they would rather. Rotate who draws. Write how many the team guessed."
  },
  sponge: {
    blurb: "Pass a soaked sponge down the line into a bucket.",
    about: "Soak a sponge in a bowl. Pass it hand to hand along the team and squeeze what is left into a bucket at the end. Elders can sit and receive the sponge. Younger players do the carrying. Look at the bucket together and agree a fill score from 0 to 10. Write that number. The fullest bucket wins."
  },
  limbo: {
    blurb: "Optional. Lean under a bar that starts high.",
    about: "Optional. Hold a broom or a pool noodle level. People lean back and pass under it. Start the bar high so elders, and anyone who wants an easy go, can pass. Lower it only while people are still laughing. Having a go matters as much as getting low. Agree a team score out of 10. Stop if anyone is uncomfortable."
  },
  tug: {
    blurb: "Optional. Best of three pulls, three people a side.",
    about: "Optional. Use a rope or a rolled towel. Best of three pulls. No more than three people hold the rope. Someone may sit and be the anchor. Match people by size. Stop the moment it feels like a strain. Write how many rounds the team won."
  },
  "green-light": {
    blurb: "Thumb up only when the caller really says green.",
    about: "Everyone stays seated. A caller says green light or red light, and sometimes slips in another colour. You raise a thumb only when the call is truly green. A thumb on red, or a thumb that comes too late, misses. Play thirty seconds a round, five rounds. Write the team's total correct."
  },
  "spoon-snap": {
    blurb: "First hand on the spoon when the real word is called.",
    about: "Put one spoon in the middle. Two people face each other. A caller reads words, and most of them are decoys. When the agreed word lands, the first hand on the spoon takes the round. Pair people of a similar age. Thatha is never across from Mahi. Write how many rounds each team won."
  },
  "stop-on-ten": {
    blurb: "Eyes closed. Say stop when you think ten seconds are up.",
    about: "This is a quiet timing game. Everyone closes their eyes. Someone says go. You count in your head and say stop when you believe ten seconds have passed. A phone timer shows the truth. Stop at 8 seconds and you were 2 off. Stop at 13 and you were 3 off. Each team sends the person who landed closest. Write how many seconds they were off 10. A smaller number is better, because closer to ten wins."
  },
  "slow-race": {
    blurb: "Last to finish wins, but your feet must keep moving.",
    about: "The last person to arrive wins. Feet have to keep moving the whole way. No freezing, and no waiting it out. The course is about five metres, or three slow steps on the short line for Ma, Losh, and Thatha. Time the last walker. Write the seconds. A longer time wins."
  },
  "odd-one": {
    blurb: "Four words. The team names the one that does not belong.",
    about: "Read four words. Three belong together and one does not. Mango, banana, hammer, litchi: hammer is the odd one. The team has ten seconds to confer and name it. Play eight rounds. Write how many the team got right."
  },
  "count-jar": {
    blurb: "Guess how many are in the jar. Closest wins.",
    about: "Fill a jar with sweets, shells, or bottle tops. Each person writes one guess and keeps it hidden. Then tip the jar and count for real. The team's score is how far their best guess was from the true number. Off by 4 beats off by 20. Write that gap. A smaller gap wins."
  },
  "memory-tray": {
    blurb: "Look at ten objects, then name the ones you remember.",
    about: "Put about ten small things on a tray. A spoon, a key, a shell, a clip. The team looks for twenty seconds. Cover the tray. They name what they remember. Mahi can build the list with a partner. Write how many the team named. More is better."
  },
  "the-route": {
    blurb: "Hear five silly steps once, then do them in order.",
    about: "One person reads five silly steps a single time, then stays in the chair. Touch the door, spin, clap twice, name a fruit, sit. Another player does the steps in that order. A point for each step done in the right place, up to 5. Write the team's score."
  },
  "silent-captain": {
    blurb: "One person talks. Everyone else stays quiet and follows.",
    about: "Pick one voice. That person directs a small job: build a cup tower, or pass a balloon down the line without hands. Nobody else may speak. Score out of 5. Full marks if the job gets done and the rest of the team stays silent. Write that score."
  },
  "who-goes": {
    blurb: "Twenty seconds to choose who takes the next turn.",
    about: "The team has twenty seconds to pick who does the next little challenge. Then that person does it. You score a point if they manage it, and another point if they had not already had a turn. The aim is to share the go, not to send the same person every time. Write the team's points."
  },
  "know-your-people": {
    blurb: "Write your team's finishing order before they start.",
    about: "Before a tiny task, the captain writes the order they think their own teammates will finish in. Then you run the task. Stack three cups, or walk to the gate and back. Compare the written order with what happened. A point for each place the captain got right. Write that number."
  },
  "the-briefing": {
    blurb: "Study a sketch, describe it, and a teammate redraws it.",
    about: "One person studies a simple sketch for fifteen seconds. Six shapes are enough: a house, a sun, a zigzag. They hand the paper back and describe what they saw. A teammate draws what they heard. A point for each shape that lands in roughly the right place. Write how many landed."
  },
  "wrong-hand": {
    blurb: "Draw a star with the hand you do not write with.",
    about: "Everyone draws a star using the other hand. If you write with the right, use the left. Everybody is bad at this, and that is the game. The other teams' elders judge the stars for charm, not for a perfect shape. Agree a score out of 10 for the team and write it."
  },
  "name-five": {
    blurb: "One person names five things in a category, in twenty seconds.",
    about: "Call a category someone can answer from the chair. Five green things you can see. Five Christmas foods. Five sounds outside. One person, twenty seconds. Rotate who answers so the same voice does not take every turn. Write how many good answers the team landed."
  },
  "sound-map": {
    blurb: "Go quiet, then list every sound you actually heard.",
    about: "The team goes quiet for twenty seconds and listens. Then you list every sound: a bird, the fridge, the road, someone in the kitchen. Only count sounds that were really there. Write how many true sounds the team caught."
  },
  "house-minute": {
    blurb: "Volunteer only. Thirty seconds of something only you can do.",
    about: "Volunteer only. Nobody is pushed into a turn. One person has about thirty seconds to do something only they can do. A step of a recipe, a chorus, a knot, four lines of a story. The elders judge the delight, not the polish. Score out of 10. Skip the turn if someone would rather watch."
  }
};

function game(partial) {
  return { entry: "rank", higher: true, ...partial, ...(play[partial.id] || {}) };
}

export const games = [
  game({
    id: "sock-toss",
    name: "Sock toss",
    group: "Yard",
    unit: "Socks in",
    blurb: "Ten throws. Each sock in the bucket counts as 1.",
    how: "Ten throws per team. Elders step closer. Mahi gets a wider bucket. Write the number that went in."
  }),
  game({
    id: "parade",
    name: "Parade and cheer",
    group: "Talk",
    entry: "points",
    unit: "Cup points",
    blurb: "Colours on. A fifteen-second cheer. Judges give 4, 3, 2 and 1.",
    how: "Each team walks in wearing its colour and does one short cheer. Type the cup points you are giving them. 4 is first."
  }),
  game({
    id: "trivia",
    name: "Trivia",
    group: "Talk",
    unit: "Correct",
    blurb: "Ten questions. Elders captain. Most right wins.",
    how: "Caribbean, Christmas, and this family. Teams confer. Write how many they got right, out of 10."
  }),
  game({
    id: "egg-spoon",
    name: "Egg and spoon",
    group: "Yard",
    higher: false,
    unit: "Seconds",
    blurb: "Fastest team. A drop restarts that person's leg only.",
    how: "Short course. Ma, Losh and Thatha walk a shorter leg. Mahi goes with a partner. Write the team's time in seconds. Lower is better."
  }),
  game({
    id: "balloons",
    name: "Water balloons",
    group: "Yard",
    unit: "Steps apart",
    blurb: "Pairs toss and step back. Last whole balloon wins.",
    how: "Seated tossing counts. Match pairs loosely by size, not by age. Write how many steps apart the last catch was."
  }),
  game({
    id: "beanbag",
    name: "Beanbag",
    group: "Yard",
    unit: "Points",
    blurb: "Three throws. Zones can be worth 1, 3 and 5.",
    how: "Younger players stand further back. Write the team's total."
  }),
  game({
    id: "cup-stack",
    name: "Cup stack",
    group: "Yard",
    unit: "Stacks won",
    blurb: "Sixty seconds. Two people a round. Seated is fine.",
    how: "Stack the cups before the minute ends. Rotate who plays. Write how many stacks the team won."
  }),
  game({
    id: "charades",
    name: "Charades",
    group: "Talk",
    unit: "Guessed",
    blurb: "Family prompts. Most guessed.",
    how: "Christmas, the estate, and inside jokes. Rotate actors. Write how many the team got."
  }),
  game({
    id: "thirty",
    name: "30 Seconds",
    group: "Talk",
    unit: "Correct",
    blurb: "Family deck. Five rounds.",
    how: "This house, the food, the drive, Christmas with Ma. Five rounds. Write the team's total correct."
  }),
  game({
    id: "impostor",
    name: "Impostor",
    group: "Talk",
    entry: "points",
    unit: "Cup points",
    blurb: "Pass the phone. The winning side's teams get the points you type.",
    how: "Eight to ten play. Everyone else is the chorus. A round can knock you out of the round only. Type cup points for each team you want to reward."
  }),
  game({
    id: "pictionary",
    name: "Pictionary",
    group: "Talk",
    unit: "Guessed",
    blurb: "One drawer, sixty seconds. Elders may describe instead of draw.",
    how: "Rotate the drawer. Write how many the team guessed."
  }),
  game({
    id: "sponge",
    name: "Sponge and bucket",
    group: "Yard",
    unit: "Fill score",
    blurb: "Pass a soaked sponge. Most water in the bucket.",
    how: "Elders can sit and receive. Younger players carry. Agree a fill score, 0 to 10, and write it."
  }),
  game({
    id: "limbo",
    name: "Limbo",
    group: "Yard",
    unit: "Score",
    blurb: "Optional. The bar starts high.",
    how: "Points for having a go matter as much as winning. Agree a team score out of 10."
  }),
  game({
    id: "tug",
    name: "Tug of war",
    group: "Yard",
    unit: "Rounds won",
    blurb: "Optional. Stop if it feels wrong.",
    how: "Best of three. Max three on the rope. A seated anchor is allowed. Match people by size. Write rounds won."
  }),
  game({
    id: "green-light",
    name: "Green light",
    group: "Mind",
    unit: "Correct",
    blurb: "Thumbs up only when the call is green.",
    how: "Thirty seconds a round, five rounds. Seated. Write the team's total correct."
  }),
  game({
    id: "spoon-snap",
    name: "Spoon snap",
    group: "Mind",
    unit: "Rounds won",
    blurb: "First hand on the spoon. Pair similar ages.",
    how: "A word is called. First hand on the spoon takes the round. Thatha is not across from Mahi. Write rounds won."
  }),
  game({
    id: "stop-on-ten",
    name: "Stop on ten",
    group: "Mind",
    higher: false,
    unit: "Seconds off",
    blurb: "Eyes closed. Say stop at ten seconds.",
    how: "Each team enters their best attempt, as how many seconds they were off 10. Lower is better."
  }),
  game({
    id: "slow-race",
    name: "Slow race",
    group: "Yard",
    unit: "Seconds",
    blurb: "Last to arrive wins. Feet must keep moving.",
    how: "Five metres, or three steps on the short line. Write the time. Higher is better."
  }),
  game({
    id: "odd-one",
    name: "Odd one out",
    group: "Mind",
    unit: "Correct",
    blurb: "Four words. Ten seconds to confer.",
    how: "Eight rounds. Write how many the team got."
  }),
  game({
    id: "count-jar",
    name: "Count the jar",
    group: "Mind",
    higher: false,
    unit: "Sweets off",
    blurb: "One written guess each. Closest scores.",
    how: "After you count the jar, write how far the team's best guess was. Lower is better."
  }),
  game({
    id: "memory-tray",
    name: "Memory tray",
    group: "Mind",
    unit: "Items named",
    blurb: "Ten things. Twenty seconds of looking.",
    how: "Cover the tray. Mahi can share a list with a partner. Write how many the team named."
  }),
  game({
    id: "the-route",
    name: "The route",
    group: "Mind",
    unit: "Steps remembered",
    blurb: "Five silly steps, read once.",
    how: "One player walks them in order. The reader can stay in the chair. A point per step, max 5."
  }),
  game({
    id: "silent-captain",
    name: "Silent captain",
    group: "Lead",
    unit: "Score",
    blurb: "One voice directs the team.",
    how: "Build a cup tower or pass a balloon. Score out of 5. Full marks if it gets done and nobody else speaks."
  }),
  game({
    id: "who-goes",
    name: "Who goes",
    group: "Lead",
    unit: "Points",
    blurb: "Twenty seconds to pick the person.",
    how: "A point for the result of the little challenge, and a point if that person had not had a turn yet."
  }),
  game({
    id: "know-your-people",
    name: "Know your people",
    group: "Lead",
    unit: "Places right",
    blurb: "Predict your own team's order before they start.",
    how: "The captain writes the finishing order, then you run the tiny task. A point per place they got right."
  }),
  game({
    id: "the-briefing",
    name: "The briefing",
    group: "Lead",
    unit: "Shapes landed",
    blurb: "Fifteen seconds with a sketch, then describe it.",
    how: "A teammate redraws six shapes. A point per shape that lands."
  }),
  game({
    id: "wrong-hand",
    name: "Wrong-hand star",
    group: "Person",
    unit: "Judge score",
    blurb: "Draw a star with the other hand.",
    how: "Everyone is bad at this. The other teams' elders judge. Write a score out of 10."
  }),
  game({
    id: "name-five",
    name: "Name five",
    group: "Person",
    unit: "Good answers",
    blurb: "One person, one category, twenty seconds.",
    how: "Something they can see from the chair. Rotate who answers. Write the count."
  }),
  game({
    id: "sound-map",
    name: "Sound map",
    group: "Person",
    unit: "Sounds",
    blurb: "Twenty seconds of quiet. List every sound.",
    how: "Birds, the fridge, the road. Write how many true sounds the team caught."
  }),
  game({
    id: "house-minute",
    name: "House minute",
    group: "Person",
    unit: "Judge score",
    blurb: "Volunteer only. Thirty seconds of something only they can do.",
    how: "A recipe step, a chorus, a knot, four lines of a story. Elders judge the delight. Score out of 10."
  })
];

export const groups = ["All", "Yard", "Talk", "Mind", "Lead", "Person"];

export function players() {
  return teams.flatMap((team) => team.players.map((player) => ({ ...player, teamId: team.id, teamName: team.name })));
}

export function teamById(id) {
  return teams.find((team) => team.id === id);
}

export function gameById(id) {
  return games.find((item) => item.id === id);
}
