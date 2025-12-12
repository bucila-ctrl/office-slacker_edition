export const PLAYER_SPEED = 2.2;
export const BOSS_SPEED = 1.8;
export const BOSS_VISION_RADIUS = 140;
export const INTERACTION_RADIUS = 110;

// 站点（坐标按你原来的 980x560 场景）
export const STATIONS = [
  { id: "s1", name: "Alice", x: 260, y: 220, avatarSeed: "Alice" },
  { id: "s2", name: "Bob",   x: 520, y: 220, avatarSeed: "Bob" },
  { id: "s3", name: "Cici",  x: 780, y: 220, avatarSeed: "Cici" },
  { id: "s4", name: "Derek", x: 320, y: 410, avatarSeed: "Derek" },
  { id: "s5", name: "Evan",  x: 640, y: 410, avatarSeed: "Evan" },
];

export const FISH_TYPES = [
  { name: "普通小鱼", emoji: "🐟", score: 10, type: "normal" },
  { name: "咖啡鱼", emoji: "☕🐟", score: 15, type: "normal" },
  { name: "摸鱼王", emoji: "👑🐟", score: 60, type: "rare" },
  { name: "Bug 鱼", emoji: "🐛🐟", score: -15, type: "bad" },
  { name: "老板鱼", emoji: "😡🐟", score: -25, type: "bad" },
];
