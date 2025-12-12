export async function generateCatchDescription(result) {
  const base =
    result?.type === "rare"
      ? "稀有摸鱼战利品！今天运气爆棚。"
      : result?.type === "bad"
      ? "糟糕的收获……感觉要被扣绩效。"
      : "标准摸鱼收获，稳稳加分。";
  await new Promise((r) => setTimeout(r, 150));
  return base;
}

export async function generateBossLecture() {
  const pool = ["你在干什么？！", "别摸了！回去工作！", "绩效还要不要了？", "开会！马上！"];
  await new Promise((r) => setTimeout(r, 120));
  return pool[Math.floor(Math.random() * pool.length)];
}
