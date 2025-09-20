'use client';

import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-white py-2.8 px-4 shadow-lg overflow-visible" style={{ backgroundColor: '#8740C7' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start">
          <div className="animate-pulse-slow ml-16 mt-3 mb-3">
            <img 
              src="/resources/logo_1.png" 
              alt="Caten Logo" 
              className="h-8 w-8 md:h-11 md:w-11 object-contain"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;