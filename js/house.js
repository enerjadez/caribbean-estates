export const teams = [
  {
    id: "jamaica",
    name: "Jamaica",
    colour: "#e2b43a",
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
  { id: "blue-bird", name: "Blue bird", detail: "Any blue bird, on purpose." },
  { id: "sunset", name: "Four colours at sunset", detail: "All four team colours in one frame." },
  { id: "thatha", name: "Thatha laughing", detail: "A real laugh, not a pose he hates." },
  { id: "meal", name: "Meal mid-cook", detail: "The pot, the hands, the steam." },
  { id: "sea", name: "Feet in the sea", detail: "At least one pair of feet." },
  { id: "sign", name: "The estate sign", detail: "Caribbean Estates, readable." },
  { id: "shell", name: "A shell with a face", detail: "The face can be generous." },
  { id: "decoration", name: "Christmas, out of place", detail: "A decoration where it does not belong." },
  { id: "pose-photo", name: "Someone mid-pose", detail: "The hold, caught in the act." }
];

function game(partial) {
  return { entry: "rank", higher: true, ...partial };
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
