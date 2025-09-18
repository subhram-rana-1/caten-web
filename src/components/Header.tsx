'use client';

import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-primary-500 to-primary-600 text-white py-8 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center space-x-3">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center leading-tight tracking-tight">
            English word explanation made easy with AI
          </h1>
          <div className="animate-pulse-slow">
            <span className="text-3xl md:text-4xl">✨</span>
          </div>
        </div>
        <div className="mt-2 text-center">
          <p className="text-purple-100 text-sm md:text-base font-light opacity-90">
            Discover, learn, and master vocabulary with AI-powered explanations
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;