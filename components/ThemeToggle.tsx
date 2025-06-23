'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.style.setProperty('--page-background', '#F5F5DC');
    } else {
      root.style.setProperty('--page-background', 'white');
    }
  }, [isDarkMode]);

  return (
    <button
      onClick={() => setIsDarkMode(!isDarkMode)}
      className="fixed top-4 right-4 p-2.5 bg-white text-gray-700 rounded-xl font-semibold text-center shadow-md transition-all hover:bg-gray-50 hover:scale-105 active:bg-gray-100 z-50"
    >
      {isDarkMode ? '🌞' : '🌙'}
    </button>
  );
} 