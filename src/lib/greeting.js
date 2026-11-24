// Home-screen greeting that changes with the time of day. One line is picked
// at random from the current slot each time the home screen opens.

const SLOTS = [
  {
    from: 0, to: 4, // midnight to 5am
    titles: [
      'Burning the midnight oil, {name}?',
      'Night owl mode: on',
      'Still up, {name}? Me too',
      'The quiet hours are the best for thinking',
      "Midnight snack for the brain? I've got facts",
    ],
    subs: [
      'Everyone else is asleep. Ask away.',
      "I don't sleep, so you're in good company.",
      'The documents are all here, even at this hour.',
    ],
  },
  {
    from: 5, to: 11,
    titles: [
      'Good morning, {name}',
      'Rise and shine, {name}',
      "Morning, {name}. Coffee's on you, answers are on me",
      "Fresh day, fresh questions. What's first?",
      "Top of the morning, {name}",
    ],
    subs: [
      'Ask about documents, facts, numbers or applications.',
      "Let's get the day moving.",
      'What do you need before the first meeting?',
    ],
  },
  {
    from: 12, to: 16,
    titles: [
      'Good afternoon, {name}',
      'Afternoon, {name}. What are we cracking?',
      'Post-lunch brain boost, coming up',
      "Halfway through the day. Let's make it count",
    ],
    subs: [
      'Ask about documents, facts, numbers or applications.',
      "Throw me the tricky one you've been putting off.",
      'Deadlines, decks, details: ask me.',
    ],
  },
  {
    from: 17, to: 20,
    titles: [
      'Good evening, {name}',
      "Evening, {name}. Let's wrap the day up",
      'Golden hour, golden answers',
      'One more thing before you log off?',
    ],
    subs: [
      "Tie up loose ends. I'll find the facts.",
      'Ask about documents, facts, numbers or applications.',
      'Quick question before dinner?',
    ],
  },
  {
    from: 21, to: 23,
    titles: [
      'Working late, {name}?',
      'Good evening, {name}. The office is quiet',
      'Night shift, activated',
      "Late one? Let's make it quick",
    ],
    subs: [
      "Ask me, then go get some rest.",
      'Ask about documents, facts, numbers or applications.',
      "I'll keep it short so you can log off.",
    ],
  },
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export function greeting(fullName, date = new Date()) {
  const h = date.getHours()
  const slot = SLOTS.find((s) => h >= s.from && h <= s.to) || SLOTS[1]
  const first = (fullName || '').trim().split(/\s+/)[0] || 'there'
  const fill = (t) => t.replace('{name}', first)
  return { title: fill(pick(slot.titles)), sub: fill(pick(slot.subs)) }
}
