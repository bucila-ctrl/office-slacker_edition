import React, { useState, useCallback } from 'react';
import { GameWorld } from './components/GameWorld';
import { GestureController } from './components/GestureController';
import { ApiKeySettings } from './components/ApiKeySettings';
import { GestureState } from './types';

function App() {
  const [gestureState, setGestureState] = useState<GestureState>({
    isWaving: false, // Fishing
    isFist: false,   // Catching
    isPointing: false, // Moving
    handPresent: false,
    move: { x: 0, y: 0 }
  });

  const handleGestureChange = useCallback((newState: GestureState) => {
    setGestureState(newState);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-6 font-sans">
      {/* API Key Settings */}
      <ApiKeySettings />
      
      <header className="mb-4 text-center">
        <h1 className="text-3xl font-extrabold text-[#003580] tracking-tight">
           🏢 Office Fish <span className="text-[#febb02]">Hunter</span>
        </h1>
        <div className="mt-3 flex gap-3 justify-center text-xs font-bold text-slate-600">
           <span className="bg-white px-3 py-1.5 rounded-full shadow border border-slate-200 flex items-center gap-2">
              <span className="text-lg">☝️</span> Point to Move
           </span>
           <span className="bg-white px-3 py-1.5 rounded-full shadow border border-slate-200 flex items-center gap-2">
              <span className="text-lg">🖐️</span> Palm to Fish
           </span>
           <span className="bg-white px-3 py-1.5 rounded-full shadow border border-slate-200 flex items-center gap-2">
              <span className="text-lg">✊</span> Fist to Catch
           </span>
        </div>
      </header>

      {/* Webcam Component */}
      <GestureController onGestureChange={handleGestureChange} />

      {/* Main Game Canvas */}
      <GameWorld gestureState={gestureState} />

      <footer className="mt-8 text-xs text-slate-400 max-w-lg text-center">
        Powered by Google Gemini API & MediaPipe. <br/>
        Keep your hand visible. <span className="text-[#003580] font-bold">Release fist to close popup.</span>
      </footer>
    </div>
  );
}

export default App;