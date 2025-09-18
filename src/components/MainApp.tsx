'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorBanner from '@/components/ErrorBanner';

type TabType = 'image' | 'text' | 'words';

export default function MainApp() {
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('image'); // Default landing view
  const [text, setText] = useState('');
  const [selectedWords, setSelectedWords] = useState<any[]>([]);
  const [explainedWords, setExplainedWords] = useState<any[]>([]);
  const [manualWords, setManualWords] = useState<string[]>([]);
  const [explanations, setExplanations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSmartSelecting, setIsSmartSelecting] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [manualWordInput, setManualWordInput] = useState('');
  const [sortBy, setSortBy] = useState<'complexity' | 'alphabetical'>('complexity');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasData = () => text || selectedWords.length > 0 || explainedWords.length > 0 || manualWords.length > 0 || explanations.length > 0;

  const clearAllData = () => {
    setText('');
    setSelectedWords([]);
    setExplainedWords([]);
    setManualWords([]);
    setExplanations([]);
    setSearchTerm('');
    setSearchResults([]);
    setIsCompleted(false);
    setManualWordInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const showError = (message: string) => {
    setError(message);
    toast.error(message);
  };

  // Tab switching with confirmation dialog
  const handleTabChange = (newTab: TabType) => {
    if (newTab === activeTab) return;
    
    if (hasData()) {
      setShowConfirmDialog(true);
      setConfirmAction(() => () => {
        clearAllData();
        setActiveTab(newTab);
      });
    } else {
      setActiveTab(newTab);
    }
  };

  // Image upload with validation and API integration
  const handleImageUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      showError('Please upload a valid image file (JPEG, JPG, PNG, or HEIC)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showError('File size must be less than 5MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/image-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      if (data.text) {
        // On success: Switch to Text tab with extracted text auto-filled
        setText(data.text);
        setActiveTab('text');
        toast.success('Text extracted successfully!');
      } else {
        throw new Error('No text extracted from image');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      showError('Failed to extract text from image. Please try again.');
      // Clear uploaded file from memory on error
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsLoading(false);
    }
  };

  // Smart Select Words functionality
  const handleSmartSelectWords = async () => {
    if (!text.trim()) {
      showError('Please enter some text first');
      return;
    }

    setIsSmartSelecting(true);

    try {
      const response = await fetch('/api/v1/important-words-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      // Highlight each important word using index and length with light purple background
      setSelectedWords(data.important_words_location || []);
      toast.success(`Selected ${data.important_words_location?.length || 0} important words`);
      
    } catch (error) {
      console.error('Error selecting words:', error);
      showError('Failed to select words. Please try again.');
    } finally {
      setIsSmartSelecting(false);
    }
  };

  // Explain functionality with SSE streaming
  const handleExplainWords = async () => {
    const wordsToExplain = selectedWords.length > 0 
      ? selectedWords 
      : manualWords.map((word, index) => ({
          word,
          index: index * 10,
          length: word.length,
        }));

    if (wordsToExplain.length === 0) {
      showError('No words selected for explanation');
      return;
    }

    setIsExplaining(true);
    setIsStreaming(true);
    setExplanations([]);
    setIsCompleted(false);

    try {
      const response = await fetch('/api/v1/words-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text || manualWords.join(' '),
          important_words_location: wordsToExplain,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              // Show green tick and "COMPLETED" message
              setIsStreaming(false);
              setIsCompleted(true);
              setExplainedWords(wordsToExplain);
              setIsExplaining(false);
              setSelectedWords([]); // Clear selected words as they are now explained
              toast.success('All explanations completed!');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              // Stream explanation responses and display in Explanations panel
              setExplanations(prev => [...prev, ...parsed.words_info]);
            } catch (parseError) {
              console.warn('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error explaining words:', error);
      showError('Failed to generate explanations. Please try again.');
      setIsExplaining(false);
      setIsStreaming(false);
    }
  };

  // Smart Explain (Smart Select + Explain)
  const handleSmartExplain = async () => {
    if (!text.trim()) {
      showError('Please enter some text first');
      return;
    }

    // First, smart select words
    setIsSmartSelecting(true);

    try {
      const response = await fetch('/api/v1/important-words-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const selectedWords = data.important_words_location || [];
      
      setSelectedWords(selectedWords);
      setIsSmartSelecting(false);

      // Then immediately click on Explain
      if (selectedWords.length > 0) {
        setTimeout(() => handleExplainWords(), 500);
      } else {
        showError('No important words found in the text');
      }
    } catch (error) {
      console.error('Error in smart explain:', error);
      showError('Failed to process text. Please try again.');
      setIsSmartSelecting(false);
    }
  };

  // Clear All with confirmation dialog
  const handleClearAll = () => {
    if (hasData()) {
      setShowConfirmDialog(true);
      setConfirmAction(() => clearAllData);
    }
  };

  // Double-click word selection
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const word = selection.toString().trim().toLowerCase().replace(/[.,!?;:]/g, '');
      
      // Find word in text and create proper WordLocation
      const wordStart = text.toLowerCase().indexOf(word);
      if (wordStart !== -1) {
        const wordLocation = {
          word,
          index: wordStart,
          length: word.length,
        };
        
        const isSelected = selectedWords.some(w => w.word === word);
        
        if (isSelected) {
          setSelectedWords(prev => prev.filter(w => w.word !== word));
        } else {
          setSelectedWords(prev => [...prev, wordLocation]);
        }
      }
    }
  };

  // Get more explanations
  const handleGetMoreExplanations = async (explanation: any) => {
    try {
      const response = await fetch('/api/v1/get-more-explanations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: explanation.word,
          meaning: explanation.meaning,
          examples: explanation.examples,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      // Append the new examples below existing ones
      setExplanations(prev => prev.map(exp =>
        exp.word === explanation.word ? { ...exp, examples: data.examples } : exp
      ));

      toast.success('More examples added!');
    } catch (error) {
      console.error('Error getting more explanations:', error);
      showError('Failed to get more explanations');
    }
  };

  // Search functionality with Trie
  useEffect(() => {
    if (text && searchTerm) {
      // Simple search implementation
      const words = text.toLowerCase().split(/\s+/);
      const matches = words
        .map((word, index) => ({ word, positions: [index] }))
        .filter(item => item.word.includes(searchTerm.toLowerCase()));
      setSearchResults(matches);
    } else {
      setSearchResults([]);
    }
  }, [text, searchTerm]);

  // Render highlighted text with all word states
  const renderHighlightedText = () => {
    if (!text) return '';

    return text.split(/(\s+)/).map((word, index) => {
      const cleanWord = word.trim().toLowerCase().replace(/[.,!?;:]/g, '');
      if (!cleanWord) return React.createElement('span', { key: index }, word);

      const isSelected = selectedWords.some(w => w.word === cleanWord);
      const isExplained = explainedWords.some(w => w.word === cleanWord);
      const isSearchMatch = searchTerm && cleanWord.includes(searchTerm.toLowerCase());

      let className = '';
      if (isExplained) {
        // Light green background for explained words
        className = 'bg-green-200 px-1 rounded cursor-pointer hover:bg-green-300 transition-colors';
      } else if (isSelected) {
        // Light purple background for selected words
        className = 'bg-purple-200 px-1 rounded relative cursor-pointer hover:bg-purple-300 transition-colors';
      } else if (isSearchMatch) {
        // Yellow background for search matches
        className = 'bg-yellow-200 px-1 rounded cursor-pointer hover:bg-yellow-300 transition-colors';
      }

      if (className) {
        return React.createElement('span', 
          { key: index, className },
          word,
          isSelected && !isExplained && React.createElement('button', 
            {
              onClick: (e) => {
                e.stopPropagation();
                setSelectedWords(prev => prev.filter(w => w.word !== cleanWord));
              },
              className: 'absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 leading-none',
              title: 'Remove word selection'
            },
            '×'
          )
        );
      }

      return React.createElement('span', { key: index }, word);
    });
  };

  return React.createElement('div', { className: 'min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-25' },
    React.createElement(Header),
    
    error && React.createElement(ErrorBanner, {
      message: error,
      onClose: () => setError(null),
      visible: !!error
    }),
    
    React.createElement('main', { className: 'max-w-7xl mx-auto px-4 py-8' },
      React.createElement('div', { className: 'bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden' },
        // Tab Navigation
        React.createElement('div', { className: 'border-b border-gray-200 bg-gray-50 px-6 py-4' },
          React.createElement('div', { className: 'inline-flex h-12 items-center justify-center rounded-lg bg-white shadow-sm border border-gray-200 p-1 text-gray-600' },
            React.createElement('button', {
              onClick: () => handleTabChange('image'),
              className: `inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2 text-sm font-medium transition-all duration-200 ${activeTab === 'image' ? 'bg-primary-100 text-primary-700' : 'hover:bg-primary-50 hover:text-primary-600'}`
            }, 'Image'),
            React.createElement('button', {
              onClick: () => handleTabChange('text'),
              className: `inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2 text-sm font-medium transition-all duration-200 ${activeTab === 'text' ? 'bg-primary-100 text-primary-700' : 'hover:bg-primary-50 hover:text-primary-600'}`
            }, 'Text'),
            React.createElement('button', {
              onClick: () => handleTabChange('words'),
              className: `inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2 text-sm font-medium transition-all duration-200 ${activeTab === 'words' ? 'bg-primary-100 text-primary-700' : 'hover:bg-primary-50 hover:text-primary-600'}`
            }, 'Words')
          )
        ),

        // Main Content Area - 50/50 Split
        React.createElement('div', { className: 'flex' },
          // Left Side - Main Content (50%)
          React.createElement('div', { className: 'w-1/2 p-6' },
            // Image Tab Content
            activeTab === 'image' && React.createElement('div', { className: 'space-y-6' },
              React.createElement('div', {
                className: `relative border-2 border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-primary-200 hover:border-primary-300 bg-primary-25'} ${isLoading ? 'pointer-events-none opacity-50' : ''}`,
                onDragEnter: (e) => { e.preventDefault(); setDragActive(true); },
                onDragLeave: (e) => { e.preventDefault(); setDragActive(false); },
                onDragOver: (e) => { e.preventDefault(); setDragActive(true); },
                onDrop: (e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const files = e.dataTransfer.files;
                  if (files && files[0]) handleImageUpload(files[0]);
                },
                onClick: () => fileInputRef.current?.click()
              },
                React.createElement('input', {
                  ref: fileInputRef,
                  type: 'file',
                  accept: 'image/jpeg,image/jpg,image/png,image/heic',
                  onChange: (e) => {
                    const files = e.target.files;
                    if (files && files[0]) handleImageUpload(files[0]);
                  },
                  className: 'hidden'
                }),
                
                React.createElement('div', { className: 'flex flex-col items-center justify-center space-y-6' },
                  React.createElement('div', { className: 'p-4 bg-primary-100 rounded-full' },
                    isLoading 
                      ? React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500' })
                      : React.createElement('svg', { className: 'h-8 w-8 text-primary-500', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' })
                        )
                  ),
                  
                  React.createElement('div', { className: 'text-center space-y-3' },
                    React.createElement('h3', { className: 'text-lg font-medium text-gray-900' },
                      isLoading ? 'Processing image...' : 'Drop, Upload or Paste Image containing texts'
                    ),
                    React.createElement('p', { className: 'text-sm text-gray-600' }, 'Supporting formats: JPG, PNG, JPEG, HEIC')
                  ),

                  React.createElement('button', {
                    className: 'inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary-100 text-primary-700 hover:bg-primary-200 h-10 px-6 transition-all duration-200',
                    disabled: isLoading
                  }, isLoading ? 'Processing...' : 'Browse')
                )
              ),
              React.createElement('div', { className: 'text-center' },
                React.createElement('p', { className: 'text-xs text-gray-500' }, 'Maximum file size: 5MB')
              )
            ),

            // Text Tab Content
            activeTab === 'text' && React.createElement('div', { className: 'space-y-4' },
              // Search Bar
              React.createElement('input', {
                type: 'text',
                placeholder: 'Search',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                className: 'w-full h-10 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'
              }),

              // Text Area
              text 
                ? React.createElement('div', {
                    className: 'w-full min-h-[280px] px-4 py-3 border border-gray-300 rounded-lg text-sm leading-relaxed bg-white cursor-text whitespace-pre-wrap',
                    onDoubleClick: handleDoubleClick
                  }, renderHighlightedText())
                : React.createElement('textarea', {
                    placeholder: 'Paste or enter your text here...',
                    value: text,
                    onChange: (e) => {
                      if (explainedWords.length === 0) {
                        setText(e.target.value);
                      }
                    },
                    className: 'w-full min-h-[280px] px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none',
                    disabled: explainedWords.length > 0
                  }),

              // Action Buttons
              React.createElement('div', { className: 'flex items-center space-x-3' },
                React.createElement('button', {
                  onClick: handleSmartSelectWords,
                  disabled: !text.trim() || isSmartSelecting || explainedWords.length > 0,
                  className: 'inline-flex items-center justify-center rounded-lg font-medium border border-primary-300 text-primary-600 hover:bg-primary-50 h-9 px-4 text-sm transition-all duration-200 disabled:opacity-50'
                }, isSmartSelecting ? 'Selecting...' : 'Smart select words'),
                
                React.createElement('button', {
                  onClick: handleExplainWords,
                  disabled: (selectedWords.length === 0 && manualWords.length === 0) || isExplaining,
                  className: 'inline-flex items-center justify-center rounded-lg font-medium bg-primary-500 text-white hover:bg-primary-600 h-9 px-4 text-sm transition-all duration-200 disabled:opacity-50'
                }, isExplaining ? 'Explaining...' : 'Explain'),
                
                React.createElement('button', {
                  onClick: handleSmartExplain,
                  disabled: !text.trim() || isSmartSelecting || isExplaining || explainedWords.length > 0,
                  className: 'inline-flex items-center justify-center rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 h-9 px-4 text-sm transition-all duration-200 disabled:opacity-50'
                }, isSmartSelecting || isExplaining ? 'Processing...' : 'Smart explain'),
                
                React.createElement('button', {
                  onClick: handleClearAll,
                  disabled: !hasData(),
                  className: 'inline-flex items-center justify-center rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 h-9 px-4 text-sm transition-all duration-200 disabled:opacity-50'
                }, 'Clear all')
              ),

              // Instructions Panel
              React.createElement('div', { className: 'mt-8 bg-purple-50 rounded-xl p-4 border border-purple-200' },
                React.createElement('div', { className: 'flex items-start space-x-2' },
                  React.createElement('div', { className: 'p-1 bg-purple-100 rounded' },
                    React.createElement('svg', { className: 'h-4 w-4 text-purple-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                      React.createElement('path', { fillRule: 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z', clipRule: 'evenodd' })
                    )
                  ),
                  React.createElement('div', {},
                    React.createElement('h4', { className: 'text-sm font-medium text-purple-900 mb-2' }, 'Instructions'),
                    React.createElement('ul', { className: 'text-xs text-purple-700 space-y-1' },
                      React.createElement('li', {}, '• Click on Smart explain to explain important words'),
                      React.createElement('li', {}, '• Click on Smart select words to auto select important words'),
                      React.createElement('li', {}, '• Double click / double tap to manually select word'),
                      React.createElement('li', {}, '• Words with purple are selected and not explained yet'),
                      React.createElement('li', {}, '• Words with green are already explained'),
                      React.createElement('li', {}, '• Words with yellow are search results')
                    )
                  )
                )
              )
            ),

            // Words Tab Content
            activeTab === 'words' && React.createElement('div', { className: 'space-y-6' },
              React.createElement('div', { className: 'flex space-x-2' },
                React.createElement('input', {
                  type: 'text',
                  placeholder: 'Type a word and press Enter...',
                  value: manualWordInput,
                  onChange: (e) => setManualWordInput(e.target.value),
                  onKeyPress: (e) => {
                    if (e.key === 'Enter' && manualWordInput.trim()) {
                      const word = manualWordInput.trim().toLowerCase();
                      if (!manualWords.includes(word)) {
                        setManualWords(prev => [...prev, word]);
                        setManualWordInput('');
                      }
                    }
                  },
                  className: 'flex-1 h-10 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'
                }),
                React.createElement('button', {
                  onClick: () => {
                    const word = manualWordInput.trim().toLowerCase();
                    if (word && !manualWords.includes(word)) {
                      setManualWords(prev => [...prev, word]);
                      setManualWordInput('');
                    }
                  },
                  disabled: !manualWordInput.trim() || manualWords.includes(manualWordInput.trim().toLowerCase()),
                  className: 'inline-flex items-center justify-center rounded-lg font-medium bg-primary-500 text-white hover:bg-primary-600 h-10 px-4 text-sm disabled:opacity-50'
                }, 'Add')
              ),

              React.createElement('div', { className: 'space-y-3' },
                React.createElement('h3', { className: 'text-sm font-medium text-gray-900' }, `Selected Words (${manualWords.length})`),
                
                manualWords.length > 0 
                  ? React.createElement('div', { className: 'flex flex-wrap gap-2' },
                      manualWords.map(word =>
                        React.createElement('div', { key: word, className: 'inline-flex items-center bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium' },
                          word,
                          React.createElement('button', {
                            onClick: () => setManualWords(prev => prev.filter(w => w !== word)),
                            className: 'ml-2 w-4 h-4 rounded-full hover:bg-purple-200 flex items-center justify-center'
                          }, '×')
                        )
                      )
                    )
                  : React.createElement('div', { className: 'text-center py-8 text-gray-500' },
                      React.createElement('div', { className: 'text-4xl mb-2' }, '📝'),
                      React.createElement('p', {}, 'No words added yet')
                    )
              ),

              manualWords.length > 0 && React.createElement('button', {
                onClick: handleExplainWords,
                disabled: isExplaining,
                className: 'w-full inline-flex items-center justify-center rounded-lg font-medium bg-primary-500 text-white hover:bg-primary-600 h-12 text-base disabled:opacity-50'
              }, isExplaining ? 'Explaining...' : `Explain ${manualWords.length} word${manualWords.length > 1 ? 's' : ''}`)
            )
          ),

          // Right Side - Explanations Panel (50%)
          React.createElement('div', { className: 'w-1/2 border-l border-gray-200 bg-gray-50 p-6' },
            React.createElement('div', { className: 'mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-4' },
                React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 'Explanations'),
                React.createElement('div', { className: 'flex space-x-2' },
                  React.createElement('button', {
                    onClick: () => setSortBy('complexity'),
                    className: `px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${sortBy === 'complexity' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                  }, 'Sort by Paragraph'),
                  React.createElement('button', {
                    onClick: () => setSortBy('alphabetical'),
                    className: `px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${sortBy === 'alphabetical' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                  }, 'Sort by alphabetical order')
                )
              )
            ),

            // Streaming Status
            isStreaming && React.createElement('div', { className: 'mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3' },
              React.createElement('div', { className: 'flex items-center space-x-2' },
                React.createElement('div', { className: 'animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500' }),
                React.createElement('span', { className: 'text-sm text-blue-700' }, 'Receiving explanations...')
              )
            ),

            // Completion Status
            isCompleted && React.createElement('div', { className: 'mb-4 bg-green-50 border border-green-200 rounded-lg p-3' },
              React.createElement('div', { className: 'flex items-center space-x-2' },
                React.createElement('svg', { className: 'h-4 w-4 text-green-500', fill: 'currentColor', viewBox: '0 0 20 20' },
                  React.createElement('path', { fillRule: 'evenodd', d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z', clipRule: 'evenodd' })
                ),
                React.createElement('span', { className: 'text-sm font-medium text-green-700' }, 'COMPLETED')
              )
            ),

            // Explanation Cards
            React.createElement('div', { className: 'space-y-4' },
              explanations.length > 0 
                ? explanations.map((explanation, index) =>
                    React.createElement('div', { key: index, className: 'bg-white rounded-lg border border-gray-200 p-4' },
                      React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                        React.createElement('button', {
                          className: 'font-medium text-gray-900 hover:text-primary-600 cursor-pointer',
                          onClick: () => setActiveTab('text') // Scroll to word in text
                        }, explanation.word),
                        React.createElement('button', { className: 'text-xs text-purple-600' },
                          React.createElement('svg', { className: 'h-4 w-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 9l-7 7-7-7' })
                          )
                        )
                      ),
                      React.createElement('p', { className: 'text-sm text-gray-700 mb-3' }, explanation.meaning),
                      explanation.examples?.map((example, idx) =>
                        React.createElement('div', { key: idx, className: 'flex items-center space-x-2 mb-2' },
                          React.createElement('div', { className: 'w-2 h-2 bg-purple-500 rounded-full' }),
                          React.createElement('p', { className: 'text-xs text-gray-600' }, example)
                        )
                      ),
                      React.createElement('button', {
                        onClick: () => handleGetMoreExplanations(explanation),
                        className: 'text-xs bg-purple-500 text-white px-3 py-1 rounded-full hover:bg-purple-600'
                      }, 'See more examples')
                    )
                  )
                : React.createElement('div', { className: 'text-center py-12 text-gray-500' },
                    React.createElement('div', { className: 'text-4xl mb-4' }, '💡'),
                    React.createElement('h3', { className: 'text-lg font-medium text-gray-900 mb-2' }, 'No explanations yet'),
                    React.createElement('p', { className: 'text-sm text-gray-600' }, 'Select words and click "Explain" to get AI-powered explanations.')
                  )
            )
          )
        )
      )
    ),

    React.createElement(ConfirmDialog, {
      open: showConfirmDialog,
      onOpenChange: setShowConfirmDialog,
      title: 'Clear existing data?',
      description: 'All existing data will be erased. Do you still want to start fresh?',
      confirmText: 'Yes, clear all',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm: () => {
        if (confirmAction) confirmAction();
        setShowConfirmDialog(false);
        setConfirmAction(null);
      },
      onCancel: () => {
        setShowConfirmDialog(false);
        setConfirmAction(null);
      }
    })
  );
}
