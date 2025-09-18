'use client';

import React from 'react';
import Header from '@/components/Header';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-300 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-300 bg-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Tabs */}
              <div className="inline-flex h-12 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-600">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium bg-purple-500 text-white shadow-sm">
                  Image
                </button>
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-200">
                  Text
                </button>
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-200">
                  Words
                </button>
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-200">
                  Explanations
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium border border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white h-8 px-3 text-xs">
                  🎯 Smart select words
                </button>
                
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium bg-purple-500 text-white hover:bg-purple-600 h-8 px-3 text-xs">
                  ✨ Explain
                </button>
                
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 h-8 px-3 text-xs">
                  ⚡ Smart explain
                </button>
                
                <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 h-8 px-3 text-xs">
                  🔄 Clear all
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <div className="space-y-6">
              <div className="relative border-2 border-dashed rounded-xl p-8 border-gray-300 hover:border-purple-300">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 bg-purple-50 rounded-full">
                    <span className="text-2xl">📤</span>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      Drop, Upload or Paste Image containing texts
                    </h3>
                    <p className="text-sm text-gray-600">
                      Supporting formats: JPG, PNG, JPEG, HEIC
                    </p>
                  </div>

                  <button className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium bg-purple-500 text-white hover:bg-purple-600 h-10 px-4 py-2 mt-4">
                    🖼️ Browse
                  </button>
                </div>
              </div>

              <div className="text-center text-xs text-gray-500">
                Maximum file size: 5MB
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}