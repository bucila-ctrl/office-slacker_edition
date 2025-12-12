import React, { useEffect, useRef, useState } from 'react';
import { Station, GameState, CatchResult, GestureState } from '../types';
import { STATIONS, FISH_TYPES, PLAYER_SPEED, BOSS_SPEED, BOSS_VISION_RADIUS, INTERACTION_RADIUS } from '../constants';
import * as GeminiService from '../services/geminiService';

interface GameWorldProps {
  gestureState: GestureState;
}

// Simple Audio Synth with Variance
const playSound = (type: 'catch' | 'bad' | 'rare') => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  // Add slight random pitch variance so it doesn't sound robotic
  const variance = Math.random() * 100 - 50; 

  if (type === 'catch') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500 + variance, now);
    osc.frequency.exponentialRampToValueAtTime(1000 + variance, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === 'bad') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150 + variance, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'rare') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400 + variance, now);
    osc.frequency.linearRampToValueAtTime(600 + variance, now + 0.1);
    osc.frequency.linearRampToValueAtTime(1200 + variance, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  }
};

export const GameWorld: React.FC<GameWorldProps> = ({ gestureState }) => {
  const gestureStateRef = useRef(gestureState);
  useEffect(() => {
    gestureStateRef.current = gestureState;
  }, [gestureState]);

  const playerRef = useRef({ x: 150, y: 300 });
  const bossRef = useRef({ x: -100, y: 100, active: false, cooldown: 300, dir: 1 });
  const fishingRef = useRef({ active: false, progress: 0, stationId: '', lock: false });
  const riskRef = useRef(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [caughtItem, setCaughtItem] = useState<CatchResult | null>(null);
  const [bossMessage, setBossMessage] = useState<string>("");
  const [riskDisplay, setRiskDisplay] = useState(0);

  const playerElRef = useRef<HTMLDivElement>(null);
  const bossElRef = useRef<HTMLDivElement>(null);
  
  // --- Helpers ---

  const getNearestStation = (px: number, py: number): Station | null => {
    let nearest = null;
    let minDst = Infinity;
    STATIONS.forEach(s => {
      const dist = Math.hypot(px - s.x, py - s.y);
      if (dist < minDst) {
        minDst = dist;
        nearest = s;
      }
    });
    return (minDst <= INTERACTION_RADIUS) ? nearest : null;
  };

  const spawnBoss = () => {
    bossRef.current.active = true;
    const fromLeft = Math.random() > 0.5;
    bossRef.current.x = fromLeft ? -50 : 1000;
    bossRef.current.y = 100 + Math.random() * 300;
    bossRef.current.dir = fromLeft ? 1 : -1;
    setGameState(GameState.BOSS_ACTIVE);
    setBossMessage(""); 
  };

  const handleCatch = async () => {
    if (fishingRef.current.lock) return;
    fishingRef.current.lock = true;

    // Determine result pool. Even with low progress, give a common fish for instant gratification.
    const p = fishingRef.current.progress;
    let pool = FISH_TYPES.filter(f => f.type === 'normal');
    
    if (p > 90) {
        pool = [...FISH_TYPES.filter(f => f.type === 'rare'), ...FISH_TYPES.filter(f => f.type === 'bad')];
    } else if (p > 50) {
        pool = [...pool, ...FISH_TYPES.filter(f => f.type === 'rare')];
    }
    
    const result = pool[Math.floor(Math.random() * pool.length)];
    
    playSound(result.type === 'rare' ? 'rare' : result.type === 'bad' ? 'bad' : 'catch');
    setGameState(GameState.CAUGHT);
    setScore(s => s + result.score);
    
    setCaughtItem({ ...result, description: "Caught!", tier: result.type as any });

    fishingRef.current = { active: false, progress: 0, stationId: '', lock: false };
    
    // Only fetch description if it's interesting
    GeminiService.generateCatchDescription({ ...result, tier: result.type as any }).then((desc) => {
        setCaughtItem(prev => {
            if (prev && prev.name === result.name) {
                return { ...prev, description: desc };
            }
            return prev;
        });
    });
  };

  // --- Auto-Close Popup Logic ---
  useEffect(() => {
    // IMMEDIATE close when hand is released
    if (!gestureState.isFist && caughtItem) {
        setCaughtItem(null);
        setGameState(GameState.IDLE);
        fishingRef.current.lock = false; // Reset lock so they can catch again immediately
    }
  }, [gestureState.isFist, caughtItem]);

  // --- Main Loop ---

  useEffect(() => {
    let frameId: number;

    const loop = () => {
      const currentGesture = gestureStateRef.current;

      // 1. Player Movement (Priority: Gesture > Keys)
      let dx = 0;
      let dy = 0;

      // Gesture Control (One Finger Slide)
      if (currentGesture.isPointing) {
          dx = currentGesture.move.x;
          dy = currentGesture.move.y;
      } 
      // Fallback: Keyboard
      else {
          if (keysRef.current['ArrowUp']) dy -= 1;
          if (keysRef.current['ArrowDown']) dy += 1;
          if (keysRef.current['ArrowLeft']) dx -= 1;
          if (keysRef.current['ArrowRight']) dx += 1;
          
          if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;
          }
      }

      if (gameState !== GameState.PENALTY && gameState !== GameState.CAUGHT && !fishingRef.current.active) {
          playerRef.current.x += dx * PLAYER_SPEED;
          playerRef.current.y += dy * PLAYER_SPEED;
          
          // Strict Bounds - Keep player near the station area (100-900 X, 100-500 Y)
          // Prevent walking too far into the empty void
          playerRef.current.x = Math.max(100, Math.min(880, playerRef.current.x));
          playerRef.current.y = Math.max(120, Math.min(480, playerRef.current.y));
      }

      // 2. Boss Logic
      if (bossRef.current.active) {
        bossRef.current.x += bossRef.current.dir * BOSS_SPEED;
        const distToPlayer = Math.hypot(playerRef.current.x - bossRef.current.x, playerRef.current.y - bossRef.current.y);
        
        if (distToPlayer < BOSS_VISION_RADIUS && fishingRef.current.active) {
             setGameState(GameState.PENALTY);
             fishingRef.current.active = false;
             setScore(s => Math.max(0, s - 20));
             playSound('bad');
             GeminiService.generateBossLecture().then(text => setBossMessage(text));
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
            if (bossRef.current.cooldown <= 0 && Math.random() < (0.005 + riskRef.current * 0.0005)) {
                spawnBoss();
            }
          }
      }

      // 3. Gesture Interaction Logic
      const nearest = getNearestStation(playerRef.current.x, playerRef.current.y);
      
      if (nearest && gameState !== GameState.PENALTY && gameState !== GameState.CAUGHT) {
          // OPEN PALM (5 Fingers) -> Start/Continue Fishing
          if (currentGesture.isWaving) { 
             if (!fishingRef.current.active) {
                 fishingRef.current.active = true;
                 fishingRef.current.stationId = nearest.id;
                 setGameState(GameState.FISHING);
             }
             // Fast progress
             fishingRef.current.progress = Math.min(100, fishingRef.current.progress + 0.6);
             riskRef.current = Math.min(100, riskRef.current + 0.2);
          } 
          // FIST -> Catch
          else if (currentGesture.isFist) {
             // Allow instant catch even if not previously 'fishing' for long, as long as near station
             handleCatch();
          } 
          // No Gesture -> Decay
          else if (fishingRef.current.active) {
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

      // 4. Update DOM
      if (playerElRef.current) {
        playerElRef.current.style.transform = `translate(${playerRef.current.x}px, ${playerRef.current.y}px)`;
        if (dx !== 0 || dy !== 0) playerElRef.current.classList.add('animate-bounce');
        else playerElRef.current.classList.remove('animate-bounce');
      }
      if (bossElRef.current) {
          bossElRef.current.style.display = bossRef.current.active ? 'flex' : 'none';
          bossElRef.current.style.transform = `translate(${bossRef.current.x}px, ${bossRef.current.y}px)`;
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    
    const onKd = (e: KeyboardEvent) => keysRef.current[e.code] = true;
    const onKu = (e: KeyboardEvent) => keysRef.current[e.code] = false;
    window.addEventListener('keydown', onKd);
    window.addEventListener('keyup', onKu);

    return () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener('keydown', onKd);
        window.removeEventListener('keyup', onKu);
    };
  }, [gameState]); 

  return (
    <div className="relative w-[980px] h-[560px] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300 mx-auto mt-8 select-none font-sans" style={{ cursor: 'none' }}>
      
      {/* Booking.com Style Modern Office Background */}
      <div className="absolute inset-0 z-0 bg-slate-50">
          {/* Floor */}
          <div className="absolute inset-0" style={{ 
              backgroundImage: 'linear-gradient(#f8fafc 1px, transparent 1px), linear-gradient(90deg, #f8fafc 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              backgroundColor: '#f1f5f9' 
          }}></div>
          {/* Accent Wall */}
          <div className="absolute top-0 left-0 w-full h-32 bg-[#003580] shadow-md z-0"></div>
          {/* Glass Meeting Room */}
          <div className="absolute top-8 right-8 w-64 h-24 bg-blue-100/30 border border-white/50 backdrop-blur-sm rounded-lg z-0"></div>
          {/* Plants */}
          <div className="absolute bottom-8 left-8 text-6xl opacity-80 z-10">🪴</div>
          <div className="absolute top-40 right-40 text-6xl opacity-80 z-10">🌵</div>
      </div>
      
      {/* Styles for Boss Animation */}
      <style>{`
        @keyframes waddle {
          0% { transform: rotate(-5deg) translateY(0px); }
          25% { transform: rotate(0deg) translateY(-4px); }
          50% { transform: rotate(5deg) translateY(0px); }
          75% { transform: rotate(0deg) translateY(-4px); }
          100% { transform: rotate(-5deg) translateY(0px); }
        }
        .animate-waddle {
          animation: waddle 0.6s infinite linear;
        }
      `}</style>

      {/* Stations / Desks */}
      {STATIONS.map(station => (
        <div 
            key={station.id} 
            className={`absolute w-40 h-28 flex flex-col items-center justify-end transition-transform duration-200 z-20
                ${fishingRef.current.stationId === station.id && fishingRef.current.active ? 'scale-105' : ''}
            `}
            style={{ left: station.x, top: station.y, transform: 'translate(-50%, -50%)' }}
        >
            {/* Modern Desk Surface */}
            <div className="absolute bottom-0 w-full h-16 bg-white rounded-lg shadow-md border-t border-slate-200"></div>
            {/* Laptop */}
            <div className="absolute bottom-10 w-20 h-12 bg-gray-800 rounded-t-md shadow-sm flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-slate-700"></div>
            </div>
            {/* Cartoon Avatar */}
            <div className="absolute -top-6 w-20 h-20 rounded-full bg-white border-4 border-white shadow-md overflow-hidden z-20">
                <img src={`https://api.dicebear.com/9.x/big-ears/svg?seed=${station.avatarSeed}`} className="w-full h-full" alt="avatar" />
            </div>
            {/* Name Tag */}
            <span className="absolute -bottom-3 bg-[#003580] text-white px-2 py-0.5 rounded shadow text-[10px] font-bold">{station.name}</span>
            
            {/* Visual Feedback for Slacking */}
            {fishingRef.current.stationId === station.id && fishingRef.current.active && (
                <div className="absolute -top-16 w-full flex flex-col items-center z-50">
                     <div className="bg-[#003580] text-white font-bold px-3 py-1 rounded-full text-xs shadow-lg mb-1 whitespace-nowrap animate-bounce">
                        🎣 FISHING...
                     </div>
                     <div className="w-32 h-4 bg-gray-200 rounded-full mt-1 overflow-hidden border border-white shadow-md">
                        <div 
                            className={`h-full transition-all duration-100 ${fishingRef.current.progress > 90 ? 'bg-red-500' : 'bg-blue-400'}`}
                            style={{ width: `${fishingRef.current.progress}%` }}
                        ></div>
                     </div>
                </div>
            )}
        </div>
      ))}

      {/* Player (Cute Cartoon) */}
      <div 
        ref={playerElRef} 
        className="absolute w-16 h-20 z-30 flex flex-col items-center transition-none"
        style={{ left: -100, top: -100 }}
      >
        <div className="w-16 h-16 bg-white rounded-full border-4 border-[#003580] shadow-xl overflow-hidden relative">
             <img src="https://api.dicebear.com/9.x/big-ears/svg?seed=Player1" className="w-full h-full scale-110 translate-y-1" alt="player" />
        </div>
        
        {/* Hand Indicators */}
        {gestureState.isWaving && (
            <div className="absolute -right-8 -top-8 bg-white p-2 rounded-full shadow-lg border border-gray-100 animate-pulse">
                <span className="text-2xl">🖐️</span>
            </div>
        )}
        {gestureState.isFist && (
            <div className="absolute -right-8 -top-8 bg-blue-100 p-2 rounded-full shadow-lg border border-blue-300 scale-110">
                <span className="text-2xl">✊</span>
            </div>
        )}
         {gestureState.isPointing && (
            <div className="absolute -left-8 -top-8 bg-green-100 p-2 rounded-full shadow-lg border border-green-300">
                <span className="text-2xl">☝️</span>
            </div>
        )}
      </div>

      {/* Boss (Fixed Visibility) */}
      <div 
        ref={bossElRef}
        className="absolute z-50 flex flex-col items-center justify-center pointer-events-none transition-transform duration-100"
        style={{ display: 'none', left: -100, width: '100px', height: '100px' }} 
      >
        {/* Boss Aura */}
        <div className="absolute w-[200px] h-[200px] rounded-full border-4 border-red-500/50 bg-red-500/10 -z-10 animate-pulse"></div>
        {/* Boss Avatar */}
        <div className="w-24 h-24 bg-red-50 rounded-full border-4 border-red-600 shadow-2xl overflow-hidden animate-waddle z-50 relative">
             <img src="https://api.dicebear.com/9.x/big-ears/svg?seed=BossMan&mouth=screaming&eyebrows=angry" className="w-full h-full object-cover" alt="boss" />
        </div>
        {bossMessage && (
            <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-white border-4 border-red-600 text-red-600 font-black px-4 py-3 rounded-2xl shadow-xl whitespace-nowrap z-[60] animate-bounce text-lg min-w-[200px] text-center">
                {bossMessage}
            </div>
        )}
      </div>

      {/* Catch Reward Popup */}
      {caughtItem && (
        <div className="absolute inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md text-center transform hover:scale-105 transition-transform border-t-8 border-[#003580] relative overflow-hidden">
                <div className="text-9xl mb-6 animate-bounce drop-shadow-xl">{caughtItem.emoji}</div>
                <h2 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">{caughtItem.name}</h2>
                <div className="bg-slate-50 p-4 rounded-xl mb-6 text-slate-600 italic border border-slate-100 font-serif text-lg min-h-[5rem] flex items-center justify-center">
                   {caughtItem.description}
                </div>
                <div className="text-sm text-slate-400 mb-4 font-bold uppercase tracking-widest">Release Fist to Close</div>
                <div className={`inline-block px-8 py-3 rounded-full text-white font-black text-2xl shadow-lg
                    ${caughtItem.score > 0 ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-700'}
                `}>
                    {caughtItem.score > 0 ? '+' : ''}{caughtItem.score} PTS
                </div>
            </div>
        </div>
      )}

      {/* HUD */}
      <div className="absolute top-4 left-4 flex gap-4 z-50">
        <div className="bg-white/95 backdrop-blur px-5 py-3 rounded-2xl shadow-xl border border-slate-200 font-black text-slate-700 text-xl flex flex-col items-center leading-none">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Score</span>
            <span className={score >= 0 ? "text-[#003580]" : "text-red-600"}>{score}</span>
        </div>
        <div className="bg-white/95 backdrop-blur px-5 py-3 rounded-2xl shadow-xl border border-slate-200 font-bold text-slate-700 flex flex-col justify-center gap-1 w-48">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Detection Risk</span>
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 relative">
                <div 
                    className={`h-full transition-all duration-300 ${riskDisplay > 80 ? 'bg-red-500' : 'bg-[#febb02]'}`}
                    style={{ width: `${riskDisplay}%` }}
                ></div>
            </div>
        </div>
      </div>
      
      {/* Penalty Screen */}
      {gameState === GameState.PENALTY && (
          <div className="absolute inset-0 bg-red-600/80 flex flex-col items-center justify-center z-[100] backdrop-blur-md">
              <div className="text-9xl mb-4">👮‍♂️</div>
              <h1 className="text-8xl font-black text-white drop-shadow-2xl transform -rotate-3 animate-pulse">
                  BUSTED!
              </h1>
              <p className="text-white text-2xl font-bold mt-4 bg-red-800/50 px-6 py-2 rounded-full">-20 Points</p>
          </div>
      )}

    </div>
  );
};