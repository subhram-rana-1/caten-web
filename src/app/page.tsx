'use client';

import React from 'react';
import Header from '@/components/Header';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-25">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="interactive-card bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden relative">
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
          <div className="relative z-10">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-6">
            <div className="flex items-center justify-between">
              {/* Tabs */}
              <div className="inline-flex h-12 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-200 p-1 text-gray-600">
                <button className="btn-enhanced inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-3 text-sm font-semibold bg-primary-500 text-white shadow-md hover:shadow-lg">
                  📸 Image
                </button>
                <button className="btn-enhanced inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-3 text-sm font-medium hover:bg-gray-100 hover:text-gray-900 transition-all duration-200">
                  📝 Text
                </button>
                <button className="btn-enhanced inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-3 text-sm font-medium hover:bg-gray-100 hover:text-gray-900 transition-all duration-200">
                  🎯 Words
                </button>
                <button className="btn-enhanced inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-3 text-sm font-medium hover:bg-gray-100 hover:text-gray-900 transition-all duration-200">
                  💡 Explanations
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button className="btn-enhanced inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium border-2 border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white h-10 px-4 text-sm shadow-sm hover:shadow-lg">
                  🎯 Smart select words
                </button>
                
                <button className="btn-enhanced inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 h-10 px-4 text-sm shadow-lg hover:shadow-xl">
                  ✨ Explain
                </button>
                
                <button className="btn-enhanced inline-flex items-center justify-center whitespace-nowrap rounded-xl font-semibold bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 h-10 px-4 text-sm shadow-lg hover:shadow-xl">
                  ⚡ Smart explain
                </button>
                
                <button className="btn-enhanced inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 h-10 px-4 text-sm shadow-lg hover:shadow-xl">
                  🔄 Clear all
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            <div className="space-y-8">
              <div className="upload-area relative border-2 border-dashed rounded-2xl p-12 border-gray-300 hover:border-purple-400 bg-gradient-to-br from-gray-25 to-purple-25">
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110">
                    <span className="text-4xl">📤</span>
                  </div>
                  
                  <div className="text-center space-y-3">
                    <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                      Drop, Upload or Paste Image containing texts
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                      Supporting formats: JPG, PNG, JPEG, HEIC
                    </p>
                  </div>

                  <button className="btn-enhanced inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 h-12 px-8 py-3 mt-4 shadow-lg hover:shadow-xl">
                    🖼️ Browse Files
                  </button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500 bg-gray-50 rounded-full px-4 py-2 inline-block border border-gray-200">
                  📏 Maximum file size: 5MB
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}