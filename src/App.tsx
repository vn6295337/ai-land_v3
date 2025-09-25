import React, { useEffect } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard';
import { useUIStore } from './stores/uiStore';

const App: React.FC = () => {
  const {
    theme,
    detectAccessibilityPreferences
  } = useUIStore();

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
        title="AI Models Discovery v2"
        showSearch={true}
        showFilters={true}
        autoFetch={true}
        testId="main-dashboard"
      />
    </div>
  );
};

export default App;