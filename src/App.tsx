import React, { useEffect } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard';
import { useUIStore } from './stores/uiStore';

const App: React.FC = () => {
  const {
    theme,
    detectAccessibilityPreferences
  } = useUIStore();

  // Debug logging for deployment
  useEffect(() => {
    console.log('🚀 AI-Land v3 App Starting...');
    console.log('Environment Check:', {
      SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? '✅ Present' : '❌ Missing',
      SUPABASE_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing',
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE
    });
  }, []);

  // Initialize accessibility preferences on mount
  useEffect(() => {
    detectAccessibilityPreferences();
  }, [detectAccessibilityPreferences]);

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return (
    <div className="App">
      <Dashboard
        title="AI Models Discovery v3"
        showSearch={true}
        showFilters={true}
        autoFetch={true}
        testId="main-dashboard"
      />
    </div>
  );
};

export default App;