export async function generateCatchDescription(result) {
  // 占位：避免白屏/报错；后面再接 Gemini
  const base = result?.type === "rare"
    ? "这条鱼看起来非常稀有，摸鱼界的传说。"
    : result?.type === "bad"
    ? "糟糕！这条鱼有点不对劲，感觉要背锅。"
    : "标准摸鱼收获，稳稳加分。";
  await new Promise(r => setTimeout(r, 200));
  return base;
}

export async function generateBossLecture() {
  const pool = [
    "你在干什么？！",
    "别摸了！回去工作！",
    "绩效还要不要了？",
    "开会！马上！",
  ];
  await new Promise(r => setTimeout(r, 150));
  return pool[Math.floor(Math.random() * pool.length)];
}
