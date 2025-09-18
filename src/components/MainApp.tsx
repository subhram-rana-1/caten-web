'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import Header from '@/components/Header';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorBanner from '@/components/ErrorBanner';

type TabType = 'image' | 'text' | 'words';

export default function MainApp() {
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('image'); // Default landing view
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedTab, setDisplayedTab] = useState<TabType>('image');
  const [sliderPosition, setSliderPosition] = useState({ left: 0, width: 0 });
  const [text, setText] = useState('');
  const [selectedWords, setSelectedWords] = useState<any[]>([]);
  const [explainedWords, setExplainedWords] = useState<any[]>([]);
  const [manualWords, setManualWords] = useState<string[]>([]);
  const [explanations, setExplanations] = useState<any[]>([]);
  const explanationsRef = useRef<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [updateCounter, setUpdateCounter] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [explanationKey, setExplanationKey] = useState(0);
  const [explanationTrigger, setExplanationTrigger] = useState(0);
  const [explainedWordNames, setExplainedWordNames] = useState<Set<string>>(new Set());
  
  // Force immediate explanation update using a different approach
  const addExplanationImmediately = useCallback((newInfo: any) => {
    console.log('Adding explanation immediately for:', newInfo.word);
    
    // Update ref immediately
    explanationsRef.current = [...explanationsRef.current, newInfo];
    
    // Track explained word names for color changes
    setExplainedWordNames(prev => new Set([...prev, newInfo.word]));
    
    // Force immediate update by using a different state pattern
    const currentTime = Date.now();
    setExplanations([...explanationsRef.current]);
    setUpdateCounter(currentTime);
    setForceUpdate(currentTime);
    setExplanationKey(currentTime);
    setExplanationTrigger(currentTime);
    
    // Show toast
    toast.success(`Explanation for "${newInfo.word}" received!`);
  }, []);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSmartSelecting, setIsSmartSelecting] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSmartExplaining, setIsSmartExplaining] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [smartExplainPhase, setSmartExplainPhase] = useState<'idle' | 'selecting' | 'explaining'>('idle');
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [manualWordInput, setManualWordInput] = useState('');
  const [sortBy, setSortBy] = useState<'complexity' | 'alphabetical'>('complexity');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState<Set<string>>(new Set());
  const [explanationSearchTerm, setExplanationSearchTerm] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<{ [key in TabType]: HTMLButtonElement | null }>({
    image: null,
    text: null,
    words: null,
  });

  // Initialize slider position on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      updateSliderPosition(activeTab);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const hasData = () => text || selectedWords.length > 0 || explainedWords.length > 0 || manualWords.length > 0 || explanations.length > 0;

  const clearAllData = () => {
    setText('');
    setSelectedWords([]);
    setExplainedWords([]);
    setManualWords([]);
    setExplanations([]);
    explanationsRef.current = []; // Reset ref
    setExplainedWordNames(new Set()); // Reset explained word names
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

  // Update slider position based on active tab
  const updateSliderPosition = (tab: TabType) => {
    const tabElement = tabRefs.current[tab];
    if (tabElement) {
      const container = tabElement.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const tabRect = tabElement.getBoundingClientRect();
        setSliderPosition({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
        });
      }
    }
  };

  // Tab switching with confirmation dialog and smooth transitions
  const handleTabChange = (newTab: TabType) => {
    if (newTab === activeTab || isTransitioning) return;
    
    // Update slider position immediately for smooth sliding effect
    updateSliderPosition(newTab);
    
    if (hasData()) {
      setShowConfirmDialog(true);
      setConfirmAction(() => () => {
        clearAllData();
        setActiveTab(newTab);
        setDisplayedTab(newTab);
      });
    } else {
      // Start transition
      setIsTransitioning(true);
      setActiveTab(newTab);
      
      // Update displayed tab after a short delay for smooth transition
      setTimeout(() => {
        setDisplayedTab(newTab);
        setIsTransitioning(false);
      }, 150);
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
        
        // Switch to text tab with smooth transition
        setActiveTab('text');
        setDisplayedTab('text');
        
        // Update slider position after a brief delay to ensure DOM is updated
        setTimeout(() => {
          updateSliderPosition('text');
        }, 50);
        
        toast.success('Text extracted successfully! Switched to Text tab.');
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
    console.log('handleExplainWords called with selectedWords:', selectedWords);
    console.log('handleExplainWords called with manualWords:', manualWords);
    
    // For manual words, only explain words that haven't been explained yet
    let wordsToExplain;
    
    if (selectedWords.length > 0) {
      console.log('Using selectedWords for explanation');
      wordsToExplain = selectedWords;
    } else {
      // Filter out already explained manual words
      const unexplainedWords = manualWords.filter(word => 
        !explainedWords.some(exp => exp.word === word)
      );
      
      if (unexplainedWords.length === 0) {
        showError('All words have already been explained');
        return;
      }
      
      // For manual words, create a concatenated text and proper indices
      let currentIndex = 0;
      
      wordsToExplain = unexplainedWords.map((word) => {
        const wordLocation = {
          word,
          index: currentIndex,
          length: word.length,
        };
        currentIndex += word.length + 1; // +1 for the space
        return wordLocation;
      });
    }

    if (wordsToExplain.length === 0) {
      showError('No words selected for explanation');
      return;
    }

    // Create abort controller for stopping the stream
    const controller = new AbortController();
    setAbortController(controller);

    setIsExplaining(true);
    setIsStreaming(true);
    setIsCompleted(false);

    try {
      // Determine the correct text to send to API
      const apiText = selectedWords.length > 0 
        ? text // Use original text for selected words
        : wordsToExplain.map(w => w.word).join(' '); // Use concatenated words for manual words

      console.log('Making API call to /api/v1/words-explanation');
      console.log('API text:', apiText);
      console.log('Words to explain:', wordsToExplain);

      const response = await fetch('/api/v1/words-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: apiText,
          important_words_location: wordsToExplain,
        }),
        signal: controller.signal, // Add abort signal
      });

      console.log('API response status:', response.status);

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
              // Mark words as explained (change from purple to green background)
              setExplainedWords(prev => [...prev, ...wordsToExplain]);
              setIsExplaining(false);
              setSelectedWords([]); // Clear selected words as they are now explained
              setAbortController(null);
              toast.success('All explanations completed!');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              console.log('Received SSE data:', parsed); // Debug log
              
              // Handle both word_info (singular) and words_info (plural) formats
              if (parsed.word_info) {
                // Single word format from backend - process immediately
                const newInfo = parsed.word_info;
                console.log('Processing single word explanation for:', newInfo.word);
                
                // Check if we already have this word
                const existingIndex = explanationsRef.current.findIndex(exp => exp.word === newInfo.word);
                
                if (existingIndex === -1) {
                  // New word, add it immediately using the working function
                  addExplanationImmediately(newInfo);
                } else {
                  // Word exists, update it
                  console.log('Updating explanation for:', newInfo.word);
                  explanationsRef.current[existingIndex] = newInfo;
                  setExplanations([...explanationsRef.current]);
                  setUpdateCounter(prev => prev + 1);
                }
                
                // Mark word as explained
                setExplainedWords(prev => {
                  const existing = [...prev];
                  const newWord = {
                    word: newInfo.word,
                    index: newInfo.location?.index || 0,
                    length: newInfo.location?.length || newInfo.word.length,
                  };
                  
                  if (!existing.some(exp => exp.word === newWord.word)) {
                    existing.push(newWord);
                  }
                  return existing;
                });
                
              } else if (parsed.words_info && Array.isArray(parsed.words_info)) {
                // Multiple words format (fallback) - process each word individually
                parsed.words_info.forEach((newInfo: any, index: number) => {
                  console.log('Processing explanation for:', newInfo.word);
                  
                  // Check if we already have this word
                  const existingIndex = explanationsRef.current.findIndex(exp => exp.word === newInfo.word);
                  
                  if (existingIndex === -1) {
                    // New word, add it immediately using the working function
                    addExplanationImmediately(newInfo);
                  } else {
                    // Word exists, update it
                    console.log('Updating explanation for:', newInfo.word);
                    explanationsRef.current[existingIndex] = newInfo;
                    setExplanations([...explanationsRef.current]);
                    setUpdateCounter(prev => prev + 1);
                  }
                  
                  // Mark word as explained
                  setExplainedWords(prev => {
                    const existing = [...prev];
                    const newWord = {
                      word: newInfo.word,
                      index: newInfo.location?.index || 0,
                      length: newInfo.location?.length || newInfo.word.length,
                    };
                    
                    if (!existing.some(exp => exp.word === newWord.word)) {
                      existing.push(newWord);
                    }
                    return existing;
                  });
                });
              } else {
                console.warn('Invalid data format:', parsed);
              }
            } catch (parseError) {
              console.warn('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User stopped the stream
        setIsStreaming(false);
        setIsCompleted(true);
        setIsExplaining(false);
        setAbortController(null);
        toast.info('Explanation stopped by user');
      } else {
        console.error('Error explaining words:', error);
        showError('Failed to generate explanations. Please try again.');
        setIsExplaining(false);
        setIsStreaming(false);
        setAbortController(null);
      }
    }
  };

  // Stop streaming function
  const handleStopStreaming = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
      setIsCompleted(true);
      setIsExplaining(false);
      setAbortController(null);
      toast.info('Explanation stopped');
    }
  };

  // Smart Explain (Smart Select + Explain)
  const handleSmartExplain = async () => {
    if (!text.trim()) {
      showError('Please enter some text first');
      return;
    }

    setIsSmartExplaining(true);
    setSmartExplainPhase('selecting');

    try {
      console.log('Starting smart explain - calling important words API...');
      
      // Step 1: Call important words API
      const response = await fetch('/api/v1/important-words-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const importantWords = data.important_words_location || [];
      
      console.log('Smart select response:', data);
      console.log('Important words found:', importantWords);
      
      if (importantWords.length === 0) {
        showError('No important words found in the text');
        setIsSmartExplaining(false);
        return;
      }

      // Step 2: Mark words as selected in the text canvas
      setSelectedWords(importantWords);
      console.log('Words marked as selected:', importantWords);

      // Step 3: Make API call to words explanation endpoint
      console.log('Making API call to words explanation...');
      setSmartExplainPhase('explaining');
      
      // Create abort controller for stopping the stream
      const controller = new AbortController();
      setAbortController(controller);

      setIsExplaining(true);
      setIsStreaming(true);
      setIsCompleted(false);

      const explanationResponse = await fetch('/api/v1/words-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          important_words_location: importantWords,
        }),
        signal: controller.signal,
      });

      console.log('Explanation API response status:', explanationResponse.status);

      if (!explanationResponse.ok) throw new Error(`HTTP error! status: ${explanationResponse.status}`);

      const reader = explanationResponse.body?.getReader();
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
              // Mark words as explained (change from purple to green background)
              setExplainedWords(prev => [...prev, ...importantWords]);
              setIsExplaining(false);
              setSelectedWords([]); // Clear selected words as they are now explained
              setAbortController(null);
              setIsSmartExplaining(false);
              setSmartExplainPhase('idle');
              toast.success('All explanations completed!');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              console.log('Received SSE data:', parsed);
              
              // Handle both word_info (singular) and words_info (plural) formats
              if (parsed.word_info) {
                // Single word format from backend - process immediately
                const newInfo = parsed.word_info;
                console.log('Processing single word explanation for:', newInfo.word);
                
                // Check if we already have this word
                const existingIndex = explanationsRef.current.findIndex(exp => exp.word === newInfo.word);
                
                if (existingIndex === -1) {
                  // New word, add it immediately using the working function
                  addExplanationImmediately(newInfo);
                } else {
                  // Word exists, update it
                  console.log('Updating explanation for:', newInfo.word);
                  explanationsRef.current[existingIndex] = newInfo;
                  setExplanations([...explanationsRef.current]);
                  setUpdateCounter(prev => prev + 1);
                }
                
                // Mark word as explained
                setExplainedWords(prev => {
                  const existing = [...prev];
                  const newWord = {
                    word: newInfo.word,
                    index: newInfo.location?.index || 0,
                    length: newInfo.location?.length || newInfo.word.length,
                  };
                  
                  if (!existing.some(exp => exp.word === newWord.word)) {
                    existing.push(newWord);
                  }
                  return existing;
                });
              } else if (parsed.words_info && Array.isArray(parsed.words_info)) {
                // Multiple words format from backend
                console.log('Processing multiple word explanations:', parsed.words_info);
                parsed.words_info.forEach((wordInfo: any) => {
                  const existingIndex = explanationsRef.current.findIndex(exp => exp.word === wordInfo.word);
                  
                  if (existingIndex === -1) {
                    addExplanationImmediately(wordInfo);
                  } else {
                    explanationsRef.current[existingIndex] = wordInfo;
                    setExplanations([...explanationsRef.current]);
                    setUpdateCounter(prev => prev + 1);
                  }
                });
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in smart explain:', error);
      showError('Failed to process text. Please try again.');
      setIsSmartExplaining(false);
      setIsExplaining(false);
      setIsStreaming(false);
      setSmartExplainPhase('idle');
      setAbortController(null);
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

  // Toggle card expansion
  const toggleCardExpansion = (word: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(word)) {
        newSet.delete(word);
      } else {
        newSet.add(word);
      }
      return newSet;
    });
  };

  // Get more explanations with loading state
  const handleGetMoreExplanations = async (explanation: any) => {
    setLoadingMore(prev => new Set(prev).add(explanation.word));
    
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
    } finally {
      setLoadingMore(prev => {
        const newSet = new Set(prev);
        newSet.delete(explanation.word);
        return newSet;
      });
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
      const isManualWord = manualWords.includes(cleanWord);
      const isManualWordExplained = isManualWord && explanations.some(exp => exp.word === cleanWord);
      const isSearchMatch = searchTerm && cleanWord.includes(searchTerm.toLowerCase());

      let className = '';
      if (isExplained || isManualWordExplained) {
        // Light green background for explained words
        className = 'bg-green-200 px-1 rounded cursor-pointer hover:bg-green-300 transition-colors';
      } else if (isSelected || (isManualWord && !isManualWordExplained)) {
        // Light purple background for selected/manual words not yet explained
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

  // Sort explanations based on selected option
  const sortedExplanations = React.useMemo(() => {
    let filtered = explanations;
    
    // Filter by search term if searching
    if (explanationSearchTerm) {
      filtered = explanations.filter(exp => 
        exp.word.toLowerCase().includes(explanationSearchTerm.toLowerCase())
      );
    }
    
    const sorted = [...filtered];
    
    if (sortBy === 'alphabetical') {
      return sorted.sort((a, b) => a.word.localeCompare(b.word));
    } else {
      // Sort by original order (complexity/paragraph order)
      return sorted.sort((a, b) => {
        const aIndex = explanations.findIndex(exp => exp.word === a.word);
        const bIndex = explanations.findIndex(exp => exp.word === b.word);
        return aIndex - bIndex;
      });
    }
  }, [explanations, sortBy, explanationSearchTerm]);

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
          React.createElement('div', { className: 'tab-container inline-flex h-12 items-center justify-center rounded-lg bg-white shadow-sm border border-gray-200 p-1' },
            // Sliding background indicator
            React.createElement('div', {
              className: 'tab-slider',
              style: {
                left: `${sliderPosition.left}px`,
                width: `${sliderPosition.width}px`,
              }
            }),
            
            React.createElement('button', {
              ref: (el) => { tabRefs.current.image = el as HTMLButtonElement; },
              onClick: () => handleTabChange('image'),
              className: `tab-button inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2 text-sm font-medium ${activeTab === 'image' ? 'active' : ''}`
            }, 'Image'),
            React.createElement('button', {
              ref: (el) => { tabRefs.current.text = el as HTMLButtonElement; },
              onClick: () => handleTabChange('text'),
              className: `tab-button inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2 text-sm font-medium ${activeTab === 'text' ? 'active' : ''}`
            }, 'Text'),
            React.createElement('button', {
              ref: (el) => { tabRefs.current.words = el as HTMLButtonElement; },
              onClick: () => handleTabChange('words'),
              className: `tab-button inline-flex items-center justify-center whitespace-nowrap rounded-lg px-6 py-2 text-sm font-medium ${activeTab === 'words' ? 'active' : ''}`
            }, 'Words')
          )
        ),

        // Main Content Area - 50/50 Split
        React.createElement('div', { className: 'flex' },
          // Left Side - Main Content (50%)
          React.createElement('div', { className: 'w-1/2 p-6' },
            // Image Tab Content
            displayedTab === 'image' && React.createElement('div', { className: `space-y-6 tab-content ${activeTab === 'image' ? 'animate-tab-fade-in' : 'animate-tab-fade-out'}` },
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
            displayedTab === 'text' && React.createElement('div', { className: `space-y-4 tab-content ${activeTab === 'text' ? 'animate-tab-fade-in' : 'animate-tab-fade-out'}` },
              // Search Bar
              React.createElement('input', {
                type: 'text',
                placeholder: 'Search Word',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                className: 'w-full h-10 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400'
              }),

              // Text Area with Smart Explain Overlay
              React.createElement('div', { className: 'relative' },
                text 
                  ? React.createElement('div', {
                      className: 'w-full min-h-[280px] px-4 py-3 border border-gray-300 rounded-lg text-sm leading-relaxed bg-white cursor-text whitespace-pre-wrap',
                      onDoubleClick: handleDoubleClick
                    }, renderHighlightedText())
                  : React.createElement('textarea', {
                      placeholder: 'Paste your text here (Dont write manually)...',
                      value: text,
                      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        if (explainedWords.length === 0) {
                          setText(e.target.value);
                        }
                      },
                      className: 'w-full min-h-[280px] px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none',
                      disabled: explainedWords.length > 0
                    }),
                
                // Smart Explain Overlay
                isSmartExplaining && React.createElement('div', { className: 'text-canvas-overlay' },
                  React.createElement('div', { className: 'loading-content' },
                    // Smart selecting phase
                    smartExplainPhase === 'selecting' && React.createElement(React.Fragment, {},
                      React.createElement('div', { className: 'loading-icon smart-select-icon' },
                        React.createElement('svg', { 
                          className: 'w-full h-full text-purple-500', 
                          fill: 'none', 
                          stroke: 'currentColor', 
                          viewBox: '0 0 24 24' 
                        },
                          React.createElement('path', { 
                            strokeLinecap: 'round', 
                            strokeLinejoin: 'round', 
                            strokeWidth: 2, 
                            d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' 
                          })
                        )
                      ),
                      React.createElement('h3', { className: 'loading-title' }, 'Grabbing the most difficult words for you'),
                      React.createElement('div', { className: 'pulse-dots' },
                        React.createElement('span', {}, '●'),
                        React.createElement('span', {}, '●'),
                        React.createElement('span', {}, '●')
                      )
                    ),
                    
                    // Explaining phase
                    smartExplainPhase === 'explaining' && React.createElement(React.Fragment, {},
                      React.createElement('div', { className: 'loading-icon explain-icon' },
                        React.createElement('svg', { 
                          className: 'w-full h-full text-purple-500', 
                          fill: 'none', 
                          stroke: 'currentColor', 
                          viewBox: '0 0 24 24' 
                        },
                          React.createElement('path', { 
                            strokeLinecap: 'round', 
                            strokeLinejoin: 'round', 
                            strokeWidth: 2, 
                            d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' 
                          })
                        )
                      ),
                      React.createElement('h3', { className: 'loading-title' }, 'Preparing explanations'),
                      React.createElement('div', { className: 'pulse-dots' },
                        React.createElement('span', {}, '●'),
                        React.createElement('span', {}, '●'),
                        React.createElement('span', {}, '●')
                      )
                    )
                  )
                )
              ),

              // Action Buttons
              React.createElement('div', { className: 'flex items-center space-x-3' },
                React.createElement('button', {
                  onClick: handleSmartSelectWords,
                  disabled: !text.trim() || isSmartSelecting || explainedWords.length > 0,
                  className: 'inline-flex items-center justify-center rounded-lg font-medium border border-primary-300 text-primary-600 hover:bg-primary-50 h-9 px-4 text-sm transition-all duration-200 disabled:opacity-50'
                }, isSmartSelecting ? 'Selecting...' : 'Smart select words'),
                
                // Explain button with stop functionality
                React.createElement('div', { className: 'flex space-x-2' },
                  React.createElement('button', {
                    onClick: handleExplainWords,
                    disabled: (selectedWords.length === 0 && manualWords.length === 0) || isExplaining || isSmartExplaining,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium bg-primary-500 text-white hover:bg-primary-600 h-9 px-4 text-sm transition-all duration-200 disabled:opacity-50'
                  },
                    isExplaining && !isSmartExplaining && React.createElement('div', { className: 'animate-spin rounded-full h-3 w-3 border-b border-white mr-2' }),
                    isExplaining && !isSmartExplaining ? 'Explaining...' : 'Explain'
                  ),
                  
                  // Stop button (only show when streaming)
                  isStreaming && React.createElement('button', {
                    onClick: handleStopStreaming,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 h-9 px-3 text-sm transition-all duration-200'
                  }, 'Stop')
                ),
                
                React.createElement('button', {
                  onClick: handleSmartExplain,
                  disabled: !text.trim() || isSmartExplaining || isExplaining || explainedWords.length > 0,
                  className: 'inline-flex items-center justify-center rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 h-9 px-4 text-sm transition-all duration-200 disabled:opacity-50'
                }, isSmartExplaining ? 'Smart explaining...' : 'Smart explain'),
                
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
            displayedTab === 'words' && React.createElement('div', { className: `space-y-6 tab-content ${activeTab === 'words' ? 'animate-tab-fade-in' : 'animate-tab-fade-out'}` },
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
                      manualWords.map(word => {
                        const isExplained = explainedWordNames.has(word);
                        return React.createElement('div', { 
                          key: word, 
                          className: `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                            isExplained 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-purple-100 text-purple-700'
                          }` 
                        },
                          word,
                          React.createElement('button', {
                            onClick: () => setManualWords(prev => prev.filter(w => w !== word)),
                            className: `ml-2 w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
                              isExplained 
                                ? 'hover:bg-green-200' 
                                : 'hover:bg-purple-200'
                            }`
                          }, '×')
                        );
                      })
                    )
                  : React.createElement('div', { className: 'text-center py-8 text-gray-500' },
                      React.createElement('div', { className: 'text-4xl mb-2' }, '📝'),
                      React.createElement('p', {}, 'No words added yet')
                    )
              ),

              manualWords.length > 0 && React.createElement('div', { className: 'space-y-3' },
                // Button row with proper layout: Explain (left) -> Stop (when needed) -> Clear All (right)
                React.createElement('div', { className: 'flex justify-between items-center' },
                  // Left side: Explain button and Stop button (when needed)
                  React.createElement('div', { className: 'flex space-x-2' },
                    React.createElement('button', {
                      onClick: handleExplainWords,
                      disabled: isExplaining || isSmartExplaining || manualWords.every(word => explainedWordNames.has(word)),
                      className: 'inline-flex items-center justify-center rounded-lg font-medium bg-primary-500 text-white hover:bg-primary-600 h-12 px-6 text-base disabled:opacity-50'
                    },
                      isExplaining && !isSmartExplaining && React.createElement('div', { className: 'animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' }),
                      isExplaining && !isSmartExplaining ? 'Explaining...' : `Explain ${manualWords.filter(word => !explainedWordNames.has(word)).length} word${manualWords.filter(word => !explainedWordNames.has(word)).length > 1 ? 's' : ''}`
                    ),
                    
                    // Stop button for Words tab - shows right next to Explain button when needed
                    isStreaming && React.createElement('button', {
                      onClick: handleStopStreaming,
                      className: 'inline-flex items-center justify-center rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 h-12 px-6 text-base'
                    }, 'Stop')
                  ),
                  
                  // Right side: Clear all button
                  React.createElement('button', {
                    onClick: () => {
                      setManualWords([]);
                      setExplainedWordNames(new Set());
                      setExplanations([]);
                      explanationsRef.current = [];
                      setExplainedWords([]);
                      setIsCompleted(false);
                      setIsStreaming(false);
                      setIsExplaining(false);
                      toast.success('All words and explanations cleared!');
                    },
                    className: 'inline-flex items-center justify-center rounded-lg font-medium bg-gray-500 text-white hover:bg-gray-600 h-10 px-6 text-sm'
                  }, 'Clear All')
                )
              )
            )
          ),

          // Right Side - Explanations Panel (50%)
          React.createElement('div', { className: 'w-1/2 border-l border-gray-200 bg-gray-50 p-6 flex flex-col' },
            // Header with search and sort
            React.createElement('div', { className: 'mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-4' },
                React.createElement('h3', { className: 'text-lg font-semibold text-gray-900' }, 'Explanations'),
                // Only show sort buttons if not searching by words (manual words)
                displayedTab !== 'words' && React.createElement('div', { className: 'flex space-x-2' },
                  React.createElement('button', {
                    onClick: () => setSortBy('complexity'),
                    className: `px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${sortBy === 'complexity' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                  }, 'Sort by original order'),
                  React.createElement('button', {
                    onClick: () => setSortBy('alphabetical'),
                    className: `px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${sortBy === 'alphabetical' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`
                  }, 'Sort by alphabetical order')
                )
              ),
              
              // Search box for explanations
              React.createElement('input', {
                type: 'text',
                placeholder: 'Search word...',
                value: explanationSearchTerm,
                onChange: (e) => setExplanationSearchTerm(e.target.value),
                className: 'w-full h-9 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all duration-200'
              })
            ),


            
            // Scrollable Explanation Cards Container
            React.createElement('div', { 
              key: explanationKey,
              className: 'flex-1 overflow-y-auto max-h-96 space-y-4' 
            },
              
              
              sortedExplanations.length > 0 
                ? sortedExplanations.map((explanation, index) => {
                    const isExpanded = expandedCards.has(explanation.word);
                    const isLoadingMoreExamples = loadingMore.has(explanation.word);
                    
                    return React.createElement('div', { key: index, className: 'bg-white rounded-lg border border-gray-200 overflow-hidden' },
                      // Card Header (always visible)
                      React.createElement('div', {
                        className: 'p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100',
                        onClick: () => toggleCardExpansion(explanation.word)
                      },
                        React.createElement('div', { className: 'flex items-center justify-between' },
                          React.createElement('div', { className: 'flex items-center space-x-2' },
                            React.createElement('span', {
                              className: 'font-medium text-gray-900'
                            }, explanation.word)
                          ),
                          React.createElement('div', { className: 'flex items-center space-x-2' },
                            React.createElement('span', { className: 'text-xs text-purple-600' },
                              React.createElement('svg', { 
                                className: `h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`, 
                                fill: 'none', 
                                stroke: 'currentColor', 
                                viewBox: '0 0 24 24' 
                              },
                                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 9l-7 7-7-7' })
                              )
                            )
                          )
                        )
                      ),
                      
                      // Collapsible Content
                      isExpanded && React.createElement('div', { className: 'px-4 pb-4 border-t border-gray-100' },
                        React.createElement('p', { className: 'text-sm text-gray-700 mb-3 mt-3' }, explanation.meaning),
                        explanation.examples?.map((example: string, idx: number) => {
                          // Make target word bold and purple in the sentence
                          const highlightedExample = example.replace(
                            new RegExp(`\\b${explanation.word}\\b`, 'gi'),
                            `<span class="font-semibold text-purple-600">${explanation.word}</span>`
                          );
                          
                          return React.createElement('div', { key: idx, className: 'flex items-center space-x-2 mb-2' },
                            React.createElement('div', { className: 'w-2 h-2 bg-purple-500 rounded-full' }),
                            React.createElement('p', { 
                              className: 'text-xs text-gray-600',
                              dangerouslySetInnerHTML: { __html: highlightedExample }
                            })
                          );
                        }),
                        // See more examples button (bottom right)
                        React.createElement('div', { className: 'flex justify-end mt-3' },
                          React.createElement('button', {
                            onClick: () => handleGetMoreExplanations(explanation),
                            disabled: isLoadingMoreExamples,
                            className: 'inline-flex items-center text-xs bg-purple-500 text-white px-3 py-1 rounded-full hover:bg-purple-600 disabled:opacity-50 transition-all duration-200'
                          },
                            isLoadingMoreExamples && React.createElement('div', { className: 'animate-spin rounded-full h-3 w-3 border-b border-white mr-1' }),
                            isLoadingMoreExamples ? 'Loading...' : 'View more examples'
                          )
                        )
                      )
                    );
                  })
                : React.createElement('div', { className: 'text-center py-12 text-gray-500' },
                    React.createElement('div', { className: 'text-4xl mb-4' }, '💡'),
                    React.createElement('h3', { className: 'text-lg font-medium text-gray-900 mb-2' }, 'No explanations yet'),
                    React.createElement('p', { className: 'text-sm text-gray-600' }, 'Select words and click "Explain" to get AI-powered explanations.')
                  )
            ),

            // Bottom status indicators
            React.createElement('div', { className: 'mt-4 pt-4 border-t border-gray-200' },
              // Streaming indicator
              isStreaming && React.createElement('div', { className: 'flex items-center justify-center mb-4' },
                React.createElement('div', { className: 'flex items-center space-x-2 text-blue-600' },
                  React.createElement('div', { className: 'animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500' }),
                  React.createElement('span', { className: 'text-sm' }, 'Generating explanations...')
                )
              ),
              
              // Completion status
              isCompleted && React.createElement('div', { className: 'flex items-center justify-center' },
                React.createElement('div', { className: 'flex items-center space-x-2 text-green-600' },
                  React.createElement('svg', { className: 'h-4 w-4', fill: 'currentColor', viewBox: '0 0 20 20' },
                    React.createElement('path', { fillRule: 'evenodd', d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z', clipRule: 'evenodd' })
                  ),
                  React.createElement('span', { className: 'text-sm font-medium' }, 'COMPLETED')
                )
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

