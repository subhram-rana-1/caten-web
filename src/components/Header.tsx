'use client';

import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-purple-500 text-white py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center space-x-2">
          <h1 className="text-2xl md:text-3xl font-bold text-center">
            English word explanation made easy with AI
          </h1>
          <span className="text-2xl">✨</span>
        </div>
      </div>
    </header>
  );
};

export default Header;