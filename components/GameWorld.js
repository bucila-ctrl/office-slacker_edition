import React from "https://esm.sh/react@19";
import {
  STATIONS,
  FISH_TYPES,
  PLAYER_SPEED,
  BOSS_SPEED,
  BOSS_VISION_RADIUS,
  INTERACTION_RADIUS,
} from "../constants.js";
import * as GeminiService from "../services/geminiService.js";

const GameState = {
  IDLE: "IDLE",
  FISHING: "FISHING",
  CAUGHT: "CAUGHT",
  BOSS_ACTIVE: "BOSS_ACTIVE",
  PENALTY: "PENALTY",
};

// Simple Audio Synth with Variance
const playSound = (type) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  const variance = Math.random() * 100 - 50;

  if (type === "catch") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(500 + variance, now);
    osc.frequency.exponentialRampToValueAtTime(1000 + variance, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === "bad") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150 + variance, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === "rare") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(400 + variance, now);
    osc.frequency.linearRampToValueAtTime(600 + variance, now + 0.1);
    osc.frequency.linearRampToValueAtTime(1200 + variance, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  }
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function GameWorld({ gestureState }) {
  // ====== 自动缩放（解决“只剩一半”）======
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const W = 980;
      const H = 560;

      // 预留：顶部 UI + 右上摄像头
      const padX = 40;
      const padY = 190;

      const s = Math.min((vw - padX) / W, (vh - padY) / H, 1);
      setScale(Math.max(0.35, s));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ====== refs（主循环）======
  const gestureStateRef = React.useRef(gestureState);
  React.useEffect(() => {
    gestureStateRef.current = gestureState;
  }, [gestureState]);

  const playerRef = React.useRef({ x: 150, y: 300 });
  const bossRef = React.useRef({ x: -100, y: 100, active: false, cooldown: 300, dir: 1 });
  const fishingRef = React.useRef({ active: false, progress: 0, stationId: "", lock: false });
  const riskRef = React.useRef(0);
  const keysRef = React.useRef({});

  // ====== 轨迹（解决“人丢了”）======
  const trailCanvasRef = React.useRef(null);
  const trailRef = React.useRef([]);

  // ====== state for UI ======
  const [score, setScore] = React.useState(0);
  const [gameState, setGameState] = React.useState(GameState.IDLE);
  const [caughtItem, setCaughtItem] = React.useState(null);
  const [bossMessage, setBossMessage] = React.useState("");
  const [riskDisplay, setRiskDisplay] = React.useState(0);

  // ====== element refs for fast DOM updates ======
  const playerElRef = React.useRef(null);
  const bossElRef = React.useRef(null);

  // ====== helpers ======
  const getNearestStation = React.useCallback((px, py) => {
    let nearest = null;
    let minDst = Infinity;
    for (const s of STATIONS) {
      const dist = Math.hypot(px - s.x, py - s.y);
      if (dist < minDst) {
        minDst = dist;
        nearest = s;
      }
    }
    return minDst <= INTERACTION_RADIUS ? nearest : null;
  }, []);

  const spawnBoss = React.useCallback(() => {
    bossRef.current.active = true;
    const fromLeft = Math.random() > 0.5;
    bossRef.current.x = fromLeft ? -50 : 1000;
    bossRef.current.y = 100 + Math.random() * 300;
    bossRef.current.dir = fromLeft ? 1 : -1;
    setGameState(GameState.BOSS_ACTIVE);
    setBossMessage("");
  }, []);

  const handleCatch = React.useCallback(async () => {
    if (fishingRef.current.lock) return;
    fishingRef.current.lock = true;

    // 你原逻辑：progress 决定池子
    const p = fishingRef.current.progress;
    let pool = FISH_TYPES.filter((f) => f.type === "normal");

    if (p > 90) {
      pool = [
        ...FISH_TYPES.filter((f) => f.type === "rare"),
        ...FISH_TYPES.filter((f) => f.type === "bad"),
      ];
    } else if (p > 50) {
      pool = [...pool, ...FISH_TYPES.filter((f) => f.type === "rare")];
    }

    // 若你有 weight 需求，可后面改成加权；先保持简单
    const result = pool[Math.floor(Math.random() * pool.length)];

    playSound(result.type === "rare" ? "rare" : result.type === "bad" ? "bad" : "catch");
    setGameState(GameState.CAUGHT);
    setScore((s) => s + result.score);

    const baseItem = { ...result, description: "Caught!", tier: result.type };
    setCaughtItem(baseItem);

    fishingRef.current = { active: false, progress: 0, stationId: "", lock: false };

    GeminiService.generateCatchDescription(baseItem).then((desc) => {
      setCaughtItem((prev) => {
        if (prev && prev.name === result.name) return { ...prev, description: desc };
        return prev;
      });
    });
  }, []);

  // Auto-close popup when fist released
  React.useEffect(() => {
    if (!gestureState.isFist && caughtItem) {
      setCaughtItem(null);
      setGameState(GameState.IDLE);
      fishingRef.current.lock = false;
    }
  }, [gestureState.isFist, caughtItem]);

  // ====== main loop ======
  React.useEffect(() => {
    let frameId = 0;

    const loop = () => {
      const currentGesture = gestureStateRef.current;

      // 1) movement (gesture > keyboard)
      let dx = 0;
      let dy = 0;

      if (currentGesture?.isPointing) {
        dx = currentGesture.move?.x ?? 0;
        dy = currentGesture.move?.y ?? 0;
      } else {
        if (keysRef.current["ArrowUp"]) dy -= 1;
        if (keysRef.current["ArrowDown"]) dy += 1;
        if (keysRef.current["ArrowLeft"]) dx -= 1;
        if (keysRef.current["ArrowRight"]) dx += 1;

        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy);
          dx /= len;
          dy /= len;
        }
      }

      if (
        gameState !== GameState.PENALTY &&
        gameState !== GameState.CAUGHT &&
        !fishingRef.current.active
      ) {
        playerRef.current.x += dx * PLAYER_SPEED;
        playerRef.current.y += dy * PLAYER_SPEED;

        playerRef.current.x = clamp(playerRef.current.x, 100, 880);
        playerRef.current.y = clamp(playerRef.current.y, 120, 480);

        // ====== 轨迹记录（只要有移动）======
        const moved = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001;
        if (moved) {
          trailRef.current.push({
            x: playerRef.current.x,
            y: playerRef.current.y,
            t: performance.now(),
          });
          if (trailRef.current.length > 140) trailRef.current.shift();
        } else {
          if (trailRef.current.length > 0 && Math.random() < 0.25) trailRef.current.shift();
        }
      }

      // 2) boss logic
      if (bossRef.current.active) {
        bossRef.current.x += bossRef.current.dir * BOSS_SPEED;

        const distToPlayer = Math.hypot(
          playerRef.current.x - bossRef.current.x,
          playerRef.current.y - bossRef.current.y
        );

        if (distToPlayer < BOSS_VISION_RADIUS && fishingRef.current.active) {
          setGameState(GameState.PENALTY);
          fishingRef.current.active = false;
          setScore((s) => Math.max(0, s - 20));
          playSound("bad");
          GeminiService.generateBossLecture().then((text) => setBossMessage(text));

          setTimeout(() => {
            setGameState(GameState.IDLE);
            bossRef.current.active = false;
            setBossMessage("");
          }, 3000);
        }

        if (bossRef.current.x < -100 || bossRef.current.x > 1100) {
          bossRef.current.active = false;
          bossRef.current.cooldown = 400 + Math.random() * 300;
          setGameState(GameState.IDLE);
        }
      } else {
        if (gameState !== GameState.PENALTY) {
          bossRef.current.cooldown--;
          if (bossRef.current.cooldown <= 0 && Math.random() < 0.005 + riskRef.current * 0.0005) {
            spawnBoss();
          }
        }
      }

      // 3) gesture interaction (station)
      const nearest = getNearestStation(playerRef.current.x, playerRef.current.y);

      if (nearest && gameState !== GameState.PENALTY && gameState !== GameState.CAUGHT) {
        if (currentGesture?.isWaving) {
          if (!fishingRef.current.active) {
            fishingRef.current.active = true;
            fishingRef.current.stationId = nearest.id;
            setGameState(GameState.FISHING);
          }
          fishingRef.current.progress = Math.min(100, fishingRef.current.progress + 0.6);
          riskRef.current = Math.min(100, riskRef.current + 0.2);
        } else if (currentGesture?.isFist) {
          handleCatch();
        } else if (fishingRef.current.active) {
          fishingRef.current.progress -= 2;
          if (fishingRef.current.progress <= 0) {
            fishingRef.current.active = false;
            setGameState(GameState.IDLE);
          }
        }
      } else if (fishingRef.current.active) {
        fishingRef.current.active = false;
        fishingRef.current.progress = 0;
        setGameState(GameState.IDLE);
      }

      if (!fishingRef.current.active && riskRef.current > 0) {
        riskRef.current = Math.max(0, riskRef.current - 0.1);
      }
      setRiskDisplay(riskRef.current);

      // 4) update DOM
      if (playerElRef.current) {
        playerElRef.current.style.transform = `translate(${playerRef.current.x}px, ${playerRef.current.y}px)`;
        if (dx !== 0 || dy !== 0) playerElRef.current.classList.add("animate-bounce");
        else playerElRef.current.classList.remove("animate-bounce");
      }
      if (bossElRef.current) {
        bossElRef.current.style.display = bossRef.current.active ? "flex" : "none";
        bossElRef.current.style.transform = `translate(${bossRef.current.x}px, ${bossRef.current.y}px)`;
      }

      // ====== 轨迹绘制 ======
      const c = trailCanvasRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height);
          const pts = trailRef.current;

          if (pts.length >= 2) {
            ctx.lineWidth = 6;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.strokeStyle = "rgba(0, 53, 128, 0.33)";
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            const last = pts[pts.length - 1];
            ctx.fillStyle = "rgba(254, 187, 2, 0.95)";
            ctx.beginPath();
            ctx.arc(last.x, last.y, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);

    const onKd = (e) => (keysRef.current[e.key] = true);
    const onKu = (e) => (keysRef.current[e.key] = false);
    window.addEventListener("keydown", onKd);
    window.addEventListener("keyup", onKu);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKd);
      window.removeEventListener("keyup", onKu);
    };
  }, [gameState, getNearestStation, handleCatch, spawnBoss]);

  // ====== UI (no JSX) ======
  const rootCls =
    "relative w-[980px] h-[560px] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300 mx-auto select-none font-sans";
  const hiddenCursor = { cursor: "none" };

  const styleTag = React.createElement("style", null, `
    @keyframes waddle {
      0% { transform: rotate(-5deg) translateY(0px); }
      25% { transform: rotate(0deg) translateY(-4px); }
      50% { transform: rotate(5deg) translateY(0px); }
      75% { transform: rotate(0deg) translateY(-4px); }
      100% { transform: rotate(-5deg) translateY(0px); }
    }
    .animate-waddle { animation: waddle 0.6s infinite linear; }
  `);

  const background = React.createElement(
    "div",
    { className: "absolute inset-0 z-0 bg-slate-50" },
    React.createElement("div", {
      className: "absolute inset-0",
      style: {
        backgroundImage:
          "linear-gradient(#f8fafc 1px, transparent 1px), linear-gradient(90deg, #f8fafc 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        backgroundColor: "#f1f5f9",
      },
    }),
    React.createElement("div", { className: "absolute top-0 left-0 w-full h-32 bg-[#003580] shadow-md z-0" }),
    React.createElement("div", { className: "absolute top-8 right-8 w-64 h-24 bg-blue-100/30 border border-white/50 backdrop-blur-sm rounded-lg z-0" }),
    React.createElement("div", { className: "absolute bottom-8 left-8 text-6xl opacity-80 z-10" }, "🪴"),
    React.createElement("div", { className: "absolute top-40 right-40 text-6xl opacity-80 z-10" }, "🌵")
  );

  const trailCanvas = React.createElement("canvas", {
    ref: trailCanvasRef,
    width: 980,
    height: 560,
    className: "absolute inset-0 z-10 pointer-events-none",
  });

  const stations = STATIONS.map((station) => {
    const activeHere = fishingRef.current.stationId === station.id && fishingRef.current.active;

    return React.createElement(
      "div",
      {
        key: station.id,
        className:
          "absolute w-40 h-28 flex flex-col items-center justify-end transition-transform duration-200 z-20 " +
          (activeHere ? "scale-105" : ""),
        style: { left: station.x, top: station.y, transform: "translate(-50%, -50%)" },
      },
      React.createElement("div", { className: "absolute bottom-0 w-full h-16 bg-white rounded-lg shadow-md border-t border-slate-200" }),
      React.createElement(
        "div",
        { className: "absolute bottom-10 w-20 h-12 bg-gray-800 rounded-t-md shadow-sm flex items-center justify-center" },
        React.createElement("div", { className: "w-4 h-4 rounded-full bg-slate-700" })
      ),
      React.createElement(
        "div",
        { className: "absolute -top-6 w-20 h-20 rounded-full bg-white border-4 border-white shadow-md overflow-hidden z-20" },
        React.createElement("img", {
          src: `https://api.dicebear.com/9.x/big-ears/svg?seed=${station.avatarSeed}`,
          className: "w-full h-full",
          alt: "avatar",
        })
      ),
      React.createElement(
        "span",
        { className: "absolute -bottom-3 bg-[#003580] text-white px-2 py-0.5 rounded shadow text-[10px] font-bold" },
        station.name
      ),
      activeHere
        ? React.createElement(
            "div",
            { className: "absolute -top-16 w-full flex flex-col items-center z-50" },
            React.createElement(
              "div",
              { className: "bg-[#003580] text-white font-bold px-3 py-1 rounded-full text-xs shadow-lg mb-1 whitespace-nowrap animate-bounce" },
              "🎣 FISHING..."
            ),
            React.createElement(
              "div",
              { className: "w-32 h-4 bg-gray-200 rounded-full mt-1 overflow-hidden border border-white shadow-md" },
              React.createElement("div", {
                className:
                  "h-full transition-all duration-100 " +
                  (fishingRef.current.progress > 90 ? "bg-red-500" : "bg-blue-400"),
                style: { width: `${fishingRef.current.progress}%` },
              })
            )
          )
        : null
    );
  });

  // ✅ 玩家：加“脚下定位圈”
  const player = React.createElement(
    "div",
    {
      ref: playerElRef,
      className: "absolute w-16 h-20 z-30 flex flex-col items-center transition-none",
      style: { left: -100, top: -100 },
    },

    // 脚下定位圈（非常关键：永远能看见人在哪）
    React.createElement("div", {
      className:
        "absolute left-1/2 top-[58px] -translate-x-1/2 w-20 h-8 rounded-full bg-[#febb02]/35 blur-[1px] border border-[#febb02]/30",
    }),

    React.createElement(
      "div",
      { className: "w-16 h-16 bg-white rounded-full border-4 border-[#003580] shadow-xl overflow-hidden relative" },
      React.createElement("img", {
        src: "https://api.dicebear.com/9.x/big-ears/svg?seed=Player1",
        className: "w-full h-full scale-110 translate-y-1",
        alt: "player",
      })
    ),

    gestureState.isWaving
      ? React.createElement(
          "div",
          { className: "absolute -right-8 -top-8 bg-white p-2 rounded-full shadow-lg border border-gray-100 animate-pulse" },
          React.createElement("span", { className: "text-2xl" }, "🖐️")
        )
      : null,

    gestureState.isFist
      ? React.createElement(
          "div",
          { className: "absolute -right-8 -top-8 bg-blue-100 p-2 rounded-full shadow-lg border border-blue-300 scale-110" },
          React.createElement("span", { className: "text-2xl" }, "✊")
        )
      : null,

    gestureState.isPointing
      ? React.createElement(
          "div",
          { className: "absolute -left-8 -top-8 bg-green-100 p-2 rounded-full shadow-lg border border-green-300" },
          React.createElement("span", { className: "text-2xl" }, "✌️")
        )
      : null
  );

  const boss = React.createElement(
    "div",
    {
      ref: bossElRef,
      className:
        "absolute z-50 flex flex-col items-center justify-center pointer-events-none transition-transform duration-100",
      style: { display: "none", left: -100, width: "100px", height: "100px" },
    },
    React.createElement("div", { className: "absolute w-[200px] h-[200px] rounded-full border-4 border-red-500/50 bg-red-500/10 -z-10 animate-pulse" }),
    React.createElement(
      "div",
      { className: "w-24 h-24 bg-red-50 rounded-full border-4 border-red-600 shadow-2xl overflow-hidden animate-waddle z-50 relative" },
      React.createElement("img", {
        src: "https://api.dicebear.com/9.x/big-ears/svg?seed=BossMan&mouth=screaming&eyebrows=angry",
        className: "w-full h-full object-cover",
        alt: "boss",
      })
    ),
    bossMessage
      ? React.createElement(
          "div",
          { className: "absolute -top-24 left-1/2 transform -translate-x-1/2 bg-white border-4 border-red-600 text-red-600 font-black px-4 py-3 rounded-2xl shadow-xl whitespace-nowrap z-[60] animate-bounce text-lg min-w-[200px] text-center" },
          bossMessage
        )
      : null
  );

  const catchPopup =
    caughtItem &&
    React.createElement(
      "div",
      { className: "absolute inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200" },
      React.createElement(
        "div",
        { className: "bg-white p-8 rounded-3xl shadow-2xl max-w-md text-center transform hover:scale-105 transition-transform border-t-8 border-[#003580] relative overflow-hidden" },
        React.createElement("div", { className: "text-9xl mb-6 animate-bounce drop-shadow-xl" }, caughtItem.emoji),
        React.createElement("h2", { className: "text-4xl font-black text-slate-800 mb-2 tracking-tight" }, caughtItem.name),
        React.createElement(
          "div",
          { className: "bg-slate-50 p-4 rounded-xl mb-6 text-slate-600 italic border border-slate-100 font-serif text-lg min-h-[5rem] flex items-center justify-center" },
          caughtItem.description
        ),
        React.createElement("div", { className: "text-sm text-slate-400 mb-4 font-bold uppercase tracking-widest" }, "Release Fist to Close"),
        React.createElement(
          "div",
          {
            className:
              "inline-block px-8 py-3 rounded-full text-white font-black text-2xl shadow-lg " +
              (caughtItem.score > 0
                ? "bg-gradient-to-r from-green-400 to-green-600"
                : "bg-gradient-to-r from-red-500 to-red-700"),
          },
          `${caughtItem.score > 0 ? "+" : ""}${caughtItem.score} PTS`
        )
      )
    );

  const hud = React.createElement(
    "div",
    { className: "absolute top-4 left-4 flex gap-4 z-50" },
    React.createElement(
      "div",
      { className: "bg-white/95 backdrop-blur px-5 py-3 rounded-2xl shadow-xl border border-slate-200 font-black text-slate-700 text-xl flex flex-col items-center leading-none" },
      React.createElement("span", { className: "text-xs text-slate-400 font-bold uppercase tracking-wider mb-1" }, "Score"),
      React.createElement("span", { className: score >= 0 ? "text-[#003580]" : "text-red-600" }, String(score))
    ),
    React.createElement(
      "div",
      { className: "bg-white/95 backdrop-blur px-5 py-3 rounded-2xl shadow-xl border border-slate-200 font-bold text-slate-700 flex flex-col justify-center gap-1 w-48" },
      React.createElement("span", { className: "text-xs text-slate-400 font-bold uppercase tracking-wider" }, "Detection Risk"),
      React.createElement(
        "div",
        { className: "w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative" },
        React.createElement("div", {
          className: "h-full transition-all duration-300 " + (riskDisplay > 80 ? "bg-red-500" : "bg-[#febb02]"),
          style: { width: `${riskDisplay}%` },
        })
      )
    )
  );

  const penalty =
    gameState === GameState.PENALTY &&
    React.createElement(
      "div",
      { className: "absolute inset-0 bg-red-600/80 flex flex-col items-center justify-center z-[100] backdrop-blur-md" },
      React.createElement("div", { className: "text-9xl mb-4" }, "👮‍♂️"),
      React.createElement("h1", { className: "text-8xl font-black text-white drop-shadow-2xl transform -rotate-3 animate-pulse" }, "BUSTED!"),
      React.createElement("p", { className: "text-white text-2xl font-bold mt-4 bg-red-800/50 px-6 py-2 rounded-full" }, "-20 Points")
    );

  // ✅ 外层 scale 包裹：保证完整显示
  return React.createElement(
    "div",
    { className: "relative", style: { transform: `scale(${scale})`, transformOrigin: "top center" } },
    React.createElement(
      "div",
      { className: rootCls, style: hiddenCursor },
      background,
      trailCanvas,
      styleTag,
      ...stations,
      player,
      boss,
      catchPopup,
      hud,
      penalty
    )
  );
}
