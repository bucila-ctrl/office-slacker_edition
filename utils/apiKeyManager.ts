// API Key Manager - Stores API key in localStorage for runtime use
const STORAGE_KEY = 'gemini_api_key';

export const apiKeyManager = {
  get: (): string => {
    // First check localStorage (for deployed version)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    
    // Fallback to environment variable (for local development)
    return (process.env.API_KEY || process.env.GEMINI_API_KEY || '') as string;
  },
  
  set: (key: string): void => {
    localStorage.setItem(STORAGE_KEY, key);
  },
  
  clear: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  },
  
  has: (): boolean => {
    return !!this.get();
  }
};

