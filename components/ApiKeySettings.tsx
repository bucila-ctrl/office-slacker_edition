import React, { useState, useEffect } from 'react';
import { apiKeyManager } from '../utils/apiKeyManager';

export const ApiKeySettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load existing API key (masked)
    const existing = apiKeyManager.get();
    if (existing) {
      setApiKey('••••••••••••••••'); // Masked display
    }
  }, []);

  const handleSave = () => {
    if (apiKey && !apiKey.startsWith('••••')) {
      apiKeyManager.set(apiKey);
      setApiKey('••••••••••••••••');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClear = () => {
    apiKeyManager.clear();
    setApiKey('');
  };

  const hasApiKey = apiKeyManager.has();

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-[60] bg-white/90 hover:bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-200 text-xs font-bold text-slate-600 transition-all"
        title="API Key Settings"
        style={{ marginRight: '220px' }}
      >
        {hasApiKey ? '🔑 API Key Set' : '⚙️ Set API Key'}
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border-4 border-[#003580]">
            <h2 className="text-2xl font-black text-[#003580] mb-4 flex items-center gap-2">
              🔑 API Key Settings
            </h2>
            
            <p className="text-sm text-slate-600 mb-4">
              Enter your Google Gemini API key to enable AI features (optional).
              Game works without it, but with limited features.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (e.target.value.startsWith('••••')) {
                    setApiKey('');
                  }
                }}
                placeholder={hasApiKey ? "••••••••••••••••" : "Enter your API key"}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-[#003580] focus:outline-none font-mono text-sm"
              />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 inline-block"
              >
                Get your API key here →
              </a>
            </div>

            {saved && (
              <div className="mb-4 p-3 bg-green-100 border-2 border-green-500 rounded-lg text-green-700 font-bold text-sm">
                ✓ API Key saved!
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!apiKey || apiKey.startsWith('••••')}
                className="flex-1 bg-[#003580] hover:bg-[#002d66] text-white font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              {hasApiKey && (
                <button
                  onClick={handleClear}
                  className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-all"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Your API key is stored locally in your browser and never sent to our servers.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

