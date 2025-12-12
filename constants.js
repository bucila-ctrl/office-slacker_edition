// Updated coordinates for a more realistic cubicle layout
export const STATIONS = [
  { id: 'mine', name: 'Me', x: 150, y: 180, isMine: true, avatarSeed: 123 },
  { id: 'a', name: 'Alice', x: 450, y: 180, isMine: false, avatarSeed: 44 },
  { id: 'b', name: 'Bob', x: 750, y: 180, isMine: false, avatarSeed: 22 },
  { id: 'c', name: 'Charlie', x: 150, y: 420, isMine: false, avatarSeed: 65 },
  { id: 'd', name: 'David', x: 450, y: 420, isMine: false, avatarSeed: 12 },
  { id: 'e', name: 'Eve', x: 750, y: 420, isMine: false, avatarSeed: 89 },
];

export const FISH_TYPES = [
  { name: "Goldfish", emoji: "🐠", weight: 20, score: 5, type: 'normal' },
  { name: "Koi Carp", emoji: "🎏", weight: 15, score: 8, type: 'normal' },
  { name: "Sardine", emoji: "🐟", weight: 15, score: 2, type: 'normal' },
  { name: "Mackerel", emoji: "🐟", weight: 15, score: 4, type: 'normal' },
  { name: "Catfish", emoji: "🐟", weight: 10, score: 6, type: 'normal' },
  { name: "Guppy", emoji: "🐟", weight: 15, score: 1, type: 'normal' },

  { name: "Blue Tang", emoji: "🐠", weight: 10, score: 15, type: 'rare' },
  { name: "Clownfish", emoji: "🐠", weight: 10, score: 12, type: 'rare' },
  { name: "Pufferfish", emoji: "🐡", weight: 8, score: 20, type: 'rare' },
  { name: "Lionfish", emoji: "🐠", weight: 5, score: 25, type: 'rare' },
  { name: "Electric Eel", emoji: "🐍", weight: 5, score: 30, type: 'rare' },
  { name: "Anglerfish", emoji: "🔦", weight: 4, score: 35, type: 'rare' },

  { name: "Rainbow Trout", emoji: "🌈", weight: 3, score: 50, type: 'rare' },
  { name: "Great White Shark", emoji: "🦈", weight: 2, score: 100, type: 'rare' },
  { name: "Golden Salmon", emoji: "👑", weight: 2, score: 150, type: 'rare' },
  { name: "Cyber-Fish 2077", emoji: "🤖", weight: 1, score: 200, type: 'rare' },
  { name: "Flying Fish", emoji: "🕊️", weight: 5, score: 40, type: 'rare' },
  { name: "Office Whale", emoji: "🐋", weight: 1, score: 500, type: 'rare' },
  { name: "Squid Manager", emoji: "🦑", weight: 3, score: 60, type: 'rare' },
  { name: "Octopus Developer", emoji: "🐙", weight: 3, score: 55, type: 'rare' },
];

export const PLAYER_SPEED = 2.5;
export const BOSS_SPEED = 1.2;
export const BOSS_VISION_RADIUS = 140;
export const INTERACTION_RADIUS = 130;
