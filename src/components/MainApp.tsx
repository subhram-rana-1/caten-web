'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import Header from '@/components/Header';
import ConfirmDialog from '@/components/ConfirmDialog';
import ErrorBanner from '@/components/ErrorBanner';
import { CONFIG } from '@/lib/config';

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
  const [textExplanations, setTextExplanations] = useState<any[]>([]);
  const [wordsExplanations, setWordsExplanations] = useState<any[]>([]);
  const textExplanationsRef = useRef<any[]>([]);
  const wordsExplanationsRef = useRef<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [updateCounter, setUpdateCounter] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [explanationKey, setExplanationKey] = useState(0);
  const [explanationTrigger, setExplanationTrigger] = useState(0);
  const [explainedWordNames, setExplainedWordNames] = useState<Set<string>>(new Set());
  
  // Tab-specific explained word names
  const [textExplainedWordNames, setTextExplainedWordNames] = useState<Set<string>>(new Set());
  const [wordsExplainedWordNames, setWordsExplainedWordNames] = useState<Set<string>>(new Set());
  
  // WebSocket state management
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [websocketTrigger, setWebsocketTrigger] = useState<{
    text: string;
    importantWords: any[];
    currentTab: string;
  } | null>(null);

  // Animation state for explanation cards
  const [newCardAnimations, setNewCardAnimations] = useState<Set<string>>(new Set());
  
  // Efficient word-to-index mappings for O(1) lookups
  const [textWordToIndexMap, setTextWordToIndexMap] = useState<Map<string, number>>(new Map());
  const [wordsWordToIndexMap, setWordsWordToIndexMap] = useState<Map<string, number>>(new Map());
  
  // Force immediate explanation update using a different approach
  const addExplanationImmediately = useCallback((newInfo: any, tabType: 'text' | 'words') => {
    console.log('Adding explanation immediately for:', newInfo.word, 'in', tabType, 'tab');
    
    // Trigger animation for new card
    setNewCardAnimations(prev => new Set(prev).add(newInfo.word));
    
    // Remove animation after it completes
    setTimeout(() => {
      setNewCardAnimations(prev => {
        const newSet = new Set(prev);
        newSet.delete(newInfo.word);
        return newSet;
      });
    }, 500); // Animation duration + small buffer
    
    if (tabType === 'text') {
      // Update text explanations
      const newIndex = textExplanationsRef.current.length;
      textExplanationsRef.current = [...textExplanationsRef.current, newInfo];
      setTextExplanations([...textExplanationsRef.current]);
      
      // Update word-to-index mapping
      setTextWordToIndexMap(prev => new Map(prev).set(newInfo.word, newIndex));
    } else {
      // Update words explanations
      const newIndex = wordsExplanationsRef.current.length;
      wordsExplanationsRef.current = [...wordsExplanationsRef.current, newInfo];
      setWordsExplanations([...wordsExplanationsRef.current]);
      
      // Update word-to-index mapping
      setWordsWordToIndexMap(prev => new Map(prev).set(newInfo.word, newIndex));
    }
    
    // Update main explanations for backward compatibility
    explanationsRef.current = [...explanationsRef.current, newInfo];
    setExplanations([...explanationsRef.current]);
    
    // Track explained word names for color changes - tab-specific
    if (tabType === 'text') {
      setTextExplainedWordNames(prev => new Set([...prev, newInfo.word]));
    } else if (tabType === 'words') {
      setWordsExplainedWordNames(prev => new Set([...prev, newInfo.word]));
    }
    
    // Force immediate update by using a different state pattern
    const currentTime = Date.now();
    setUpdateCounter(currentTime);
    setForceUpdate(currentTime);
    setExplanationKey(currentTime);
    setExplanationTrigger(currentTime);
    
    // Show toast
    toast.success(`Explanation for "${newInfo.word}" received!`);
  }, []);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPowerWords, setIsLoadingPowerWords] = useState(false);
  const [isSmartSelecting, setIsSmartSelecting] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSmartExplaining, setIsSmartExplaining] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [smartExplainPhase, setSmartExplainPhase] = useState<'idle' | 'selecting' | 'explaining'>('idle');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPreparingExplanations, setIsPreparingExplanations] = useState(false);
  
  // Tab-specific loading states
  const [textIsExplaining, setTextIsExplaining] = useState(false);
  const [textIsStreaming, setTextIsStreaming] = useState(false);
  const [textIsCompleted, setTextIsCompleted] = useState(false);
  const [textIsPreparingExplanations, setTextIsPreparingExplanations] = useState(false);
  const [textIsSmartExplaining, setTextIsSmartExplaining] = useState(false);
  const [textSmartExplainPhase, setTextSmartExplainPhase] = useState<'idle' | 'selecting' | 'explaining'>('idle');
  
  const [wordsIsExplaining, setWordsIsExplaining] = useState(false);
  const [wordsIsStreaming, setWordsIsStreaming] = useState(false);
  const [wordsIsCompleted, setWordsIsCompleted] = useState(false);
  const [wordsIsPreparingExplanations, setWordsIsPreparingExplanations] = useState(false);
  const [wordsIsSmartExplaining, setWordsIsSmartExplaining] = useState(false);
  const [wordsSmartExplainPhase, setWordsSmartExplainPhase] = useState<'idle' | 'selecting' | 'explaining'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [dialogType, setDialogType] = useState<'clearAll' | 'clearText' | 'clearExplanations'>('clearAll');
  const [dragActive, setDragActive] = useState(false);
  const [manualWordInput, setManualWordInput] = useState('');
  const [sortBy, setSortBy] = useState<'complexity' | 'alphabetical'>('complexity');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState<Set<string>>(new Set());
  const [explanationSearchTerm, setExplanationSearchTerm] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [smartSelectAbortController, setSmartSelectAbortController] = useState<AbortController | null>(null);
  const [powerWordsAbortController, setPowerWordsAbortController] = useState<AbortController | null>(null);
  const [wordLimitAlert, setWordLimitAlert] = useState<string | null>(null);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [showWordLimitAlert, setShowWordLimitAlert] = useState(false);
  const [showCropCanvas, setShowCropCanvas] = useState(false);
  const [cropData, setCropData] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<'extracting' | 'hold-on' | 'almost-there'>('extracting');
  const [processingIntervalRef, setProcessingIntervalRef] = useState<NodeJS.Timeout | null>(null);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textCanvasRef = useRef<HTMLDivElement>(null);
  const explanationSectionRef = useRef<HTMLDivElement>(null);
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // Cleanup image URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Cleanup processing timer on unmount
  useEffect(() => {
    return () => {
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
      }
      if (processingIntervalRef) {
        clearInterval(processingIntervalRef);
      }
    };
  }, [processingIntervalRef]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);




  // Start cyclic processing messages
  const startCyclicProcessingMessages = () => {
    setProcessingPhase('extracting');
    
    const phases: Array<'extracting' | 'hold-on' | 'almost-there'> = ['extracting', 'hold-on', 'almost-there'];
    let currentPhaseIndex = 0;
    
    const interval = setInterval(() => {
      currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
      setProcessingPhase(phases[currentPhaseIndex]);
    }, 4000); // Change message every 4 seconds
    
    setProcessingIntervalRef(interval);
    return interval;
  };

  // Stop cyclic processing messages
  const stopCyclicProcessingMessages = () => {
    if (processingIntervalRef) {
      clearInterval(processingIntervalRef);
      setProcessingIntervalRef(null);
    }
    setProcessingPhase('extracting');
  };

  // Get processing message based on current phase
  const getProcessingMessage = () => {
    const message = (() => {
      switch (processingPhase) {
        case 'extracting':
          return 'Extracting text out of your image';
        case 'hold-on':
          return 'Please hold on, we are almost there';
        case 'almost-there':
          return "It's about to finish";
        default:
          return 'Extracting text out of your image';
      }
    })();
    return message;
  };

  // Get processing icon based on current phase
  const getProcessingIcon = () => {
    switch (processingPhase) {
      case 'extracting':
        // Document with text extraction icon
        return React.createElement('svg', { 
          className: 'w-6 h-6 text-white', 
          fill: 'currentColor',
          viewBox: '0 0 24 24' 
        },
          React.createElement('path', { 
            d: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' 
          }),
          React.createElement('path', { 
            d: 'M8,12H16V14H8V12M8,16H13V18H8V16',
            className: 'opacity-70'
          })
        );
      case 'hold-on':
        // Clock/timer icon
        return React.createElement('svg', { 
          className: 'w-6 h-6 text-white', 
          fill: 'currentColor',
          viewBox: '0 0 24 24' 
        },
          React.createElement('path', { 
            d: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z' 
          })
        );
      case 'almost-there':
        // Checkmark/almost done icon
        return React.createElement('svg', { 
          className: 'w-6 h-6 text-white', 
          fill: 'currentColor',
          viewBox: '0 0 24 24' 
        },
          React.createElement('path', { 
            d: 'M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z' 
          })
        );
      default:
        // Default document icon
        return React.createElement('svg', { 
          className: 'w-6 h-6 text-white', 
          fill: 'currentColor',
          viewBox: '0 0 24 24' 
        },
          React.createElement('path', { 
            d: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z' 
          })
        );
    }
  };


  // Clipboard paste functionality
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (displayedTab !== 'image') return;
    
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageUpload(file);
        }
        break;
      }
    }
  }, [displayedTab]);

  // Add paste event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && displayedTab === 'image') {
        // Trigger paste event
        document.execCommand('paste');
      }
    };

    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePaste, displayedTab]);

  const hasData = () => text || selectedWords.length > 0 || explainedWords.length > 0 || manualWords.length > 0 || explanations.length > 0;

  // Helper function to get current tab's explained word names
  const getCurrentTabExplainedWordNames = () => {
    if (displayedTab === 'text') {
      return textExplainedWordNames;
    } else if (displayedTab === 'words') {
      return wordsExplainedWordNames;
    }
    return new Set<string>();
  };

  // Helper function to get current tab's word-to-index map
  const getCurrentTabWordToIndexMap = () => {
    if (displayedTab === 'text') {
      return textWordToIndexMap;
    } else if (displayedTab === 'words') {
      return wordsWordToIndexMap;
    }
    return new Map<string, number>();
  };

  // Helper function to get current tab's explanations
  const getCurrentTabExplanations = () => {
    if (displayedTab === 'text') {
      return textExplanations;
    } else if (displayedTab === 'words') {
      return wordsExplanations;
    }
    return [];
  };

  // Efficient word deletion helper - removes from both array and map
  const deleteWordEfficiently = (word: string, tabType: 'text' | 'words') => {
    if (tabType === 'text') {
      // Find the index of the word to delete (case-insensitive)
      let wordIndex = textWordToIndexMap.get(word);
      let actualWord = word;
      
      // If exact match not found, try case-insensitive lookup
      if (wordIndex === undefined) {
        for (const [mapWord, index] of textWordToIndexMap.entries()) {
          if (mapWord.toLowerCase() === word.toLowerCase()) {
            wordIndex = index;
            actualWord = mapWord; // Use the actual word from the map
            break;
          }
        }
      }
      
      if (wordIndex !== undefined) {
        // Remove from explanations array
        const newExplanations = textExplanations.filter(exp => exp.word !== actualWord);
        setTextExplanations(newExplanations);
        textExplanationsRef.current = newExplanations;
        
        // Remove from selectedWords to remove green highlighting (case-insensitive)
        setSelectedWords(prev => prev.filter(sw => sw.word.toLowerCase() !== word.toLowerCase()));
        
        // Rebuild word-to-index map (since indices will shift)
        const newMap = new Map<string, number>();
        newExplanations.forEach((exp, index) => {
          newMap.set(exp.word, index);
        });
        setTextWordToIndexMap(newMap);
        
        // Update explained word names (case-insensitive)
        setTextExplainedWordNames(prev => {
          const newSet = new Set(prev);
          // Remove all case variations of the word
          for (const explainedWord of prev) {
            if (explainedWord.toLowerCase() === word.toLowerCase()) {
              newSet.delete(explainedWord);
            }
          }
          return newSet;
        });
      }
    } else {
      // Find the index of the word to delete
      const wordIndex = wordsWordToIndexMap.get(word);
      if (wordIndex !== undefined) {
        // Remove from array
        const newExplanations = wordsExplanations.filter(exp => exp.word !== word);
        setWordsExplanations(newExplanations);
        wordsExplanationsRef.current = newExplanations;
        
        // Rebuild word-to-index map (since indices will shift)
        const newMap = new Map<string, number>();
        newExplanations.forEach((exp, index) => {
          newMap.set(exp.word, index);
        });
        setWordsWordToIndexMap(newMap);
        
        // Update explained word names
        setWordsExplainedWordNames(prev => {
          const newSet = new Set(prev);
          newSet.delete(word);
          return newSet;
        });
        
        // Remove from manualWords to remove the word from the left side
        setManualWords(prev => prev.filter(w => w !== word));
      }
    }
  };

  // Helper functions to get current tab's loading states
  const getCurrentTabLoadingStates = () => {
    if (displayedTab === 'text') {
      return {
        isExplaining: textIsExplaining,
        isStreaming: textIsStreaming,
        isCompleted: textIsCompleted,
        isPreparingExplanations: textIsPreparingExplanations,
        isSmartExplaining: textIsSmartExplaining,
        smartExplainPhase: textSmartExplainPhase,
        setIsExplaining: setTextIsExplaining,
        setIsStreaming: setTextIsStreaming,
        setIsCompleted: setTextIsCompleted,
        setIsPreparingExplanations: setTextIsPreparingExplanations,
        setIsSmartExplaining: setTextIsSmartExplaining,
        setSmartExplainPhase: setTextSmartExplainPhase
      };
    } else if (displayedTab === 'words') {
      return {
        isExplaining: wordsIsExplaining,
        isStreaming: wordsIsStreaming,
        isCompleted: wordsIsCompleted,
        isPreparingExplanations: wordsIsPreparingExplanations,
        isSmartExplaining: wordsIsSmartExplaining,
        smartExplainPhase: wordsSmartExplainPhase,
        setIsExplaining: setWordsIsExplaining,
        setIsStreaming: setWordsIsStreaming,
        setIsCompleted: setWordsIsCompleted,
        setIsPreparingExplanations: setWordsIsPreparingExplanations,
        setIsSmartExplaining: setWordsIsSmartExplaining,
        setSmartExplainPhase: setWordsSmartExplainPhase
      };
    }
    // Default fallback
    return {
      isExplaining: false,
      isStreaming: false,
      isCompleted: false,
      isPreparingExplanations: false,
      isSmartExplaining: false,
      smartExplainPhase: 'idle' as const,
      setIsExplaining: () => {},
      setIsStreaming: () => {},
      setIsCompleted: () => {},
      setIsPreparingExplanations: () => {},
      setIsSmartExplaining: () => {},
      setSmartExplainPhase: () => {}
    };
  };

  // Helper function to count words in text
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Helper function to validate word limit
  const validateWordLimit = (text: string) => {
    const wordCount = countWords(text);
    if (wordCount > 500) {
      showError(`You can't process more than 500 words. Current word count: ${wordCount}`);
      return false;
    }
    return true;
  };

  // Handle random paragraph button click with API call
  const handleRandomParagraph = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/v1/get-random-paragraph', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      if (data.text || data.Text) {
        const paragraphText = data.text || data.Text;
        console.log('Using paragraph text:', paragraphText); // Debug log
        // Validate word limit before setting text
        if (!validateWordLimit(paragraphText)) {
          return; // Don't set text if it exceeds limit
        }
        
        setText(paragraphText);
        toast.success('Random paragraph loaded!');
      } else {
        console.error('Unexpected API response format:', data);
        throw new Error('No text received from API');
      }
    } catch (error) {
      console.error('Error fetching random paragraph:', error);
      showError('Failed to load random paragraph. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle power words button click with API call
  const handlePowerWords = async () => {
    // Switch to text tab if not already there
    if (activeTab !== 'text') {
      setActiveTab('text');
      setDisplayedTab('text');
    }
    
    // Create abort controller for this request
    const controller = new AbortController();
    setPowerWordsAbortController(controller);
    setIsLoadingPowerWords(true);
    
    try {
      const response = await fetch('/api/v1/get-random-paragraph', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log('Power Words API Response:', data); // Debug log
      
      if (data.text) {
        const paragraphText = data.text;
        console.log('Using power words text:', paragraphText); // Debug log
        // Validate word limit before setting text
        if (!validateWordLimit(paragraphText)) {
          return; // Don't set text if it exceeds limit
        }
        
        setText(paragraphText);
        toast.success('Power words paragraph loaded!');
      } else {
        console.error('Unexpected API response format:', data);
        throw new Error('No text received from API');
      }
    } catch (error) {
      // Check if the error is due to abort
      if (error.name === 'AbortError') {
        console.log('Power words request was aborted by user');
        // Don't show error message for user-initiated abort
        return;
      }
      console.error('Error fetching power words:', error);
      showError('Failed to load power words. Please try again.');
    } finally {
      setIsLoadingPowerWords(false);
      setPowerWordsAbortController(null);
    }
  };

  const clearAllData = () => {
    setText('');
    setSelectedWords([]);
    setExplainedWords([]);
    setManualWords([]);
    setExplanations([]);
    explanationsRef.current = []; // Reset ref
    setTextExplanations([]);
    setWordsExplanations([]);
    textExplanationsRef.current = [];
    wordsExplanationsRef.current = [];
    setExplainedWordNames(new Set());
    setTextExplainedWordNames(new Set());
    setWordsExplainedWordNames(new Set());
    // Clear word-to-index mappings
    setTextWordToIndexMap(new Map());
    setWordsWordToIndexMap(new Map());
    setSearchTerm('');
    setSearchResults([]);
    // Reset all completion states
    setIsCompleted(false);
    setTextIsCompleted(false);
    setWordsIsCompleted(false);
    setManualWordInput('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const showError = (message: string) => {
    setError(message);
    toast.error(message);
    
    // Trigger animation after a tiny delay to ensure smooth slide-in
    setTimeout(() => {
      setShowErrorBanner(true);
    }, 10);
    
    // Auto-hide banner after 3 seconds
    setTimeout(() => {
      setShowErrorBanner(false);
      // Clear error message after animation completes
      setTimeout(() => setError(null), 300);
    }, 3000);
  };


  // Handle adding words with validation
  const handleAddWord = (word: string) => {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return;

    // Check if word already exists
    if (manualWords.includes(cleanWord)) {
      return;
    }

    // Check total word count (explained + to be explained) - Words tab only
    // Only count words that are actually explained in Words tab
    const totalWords = wordsExplanations.length;
    if (totalWords >= CONFIG.MAX_TOTAL_WORDS) {
      showError("Total word count can't be more than 20");
      return;
    }

    // Check word limit - only check words that are NOT explained yet (purple color)
    const unexplainedWords = manualWords.filter(word => !wordsExplainedWordNames.has(word));
    if (unexplainedWords.length >= CONFIG.MAX_WORDS_AT_ONCE) {
      setWordLimitAlert(`More than ${CONFIG.MAX_WORDS_AT_ONCE} words can't be added at once`);
      
      // Trigger animation after a tiny delay to ensure smooth slide-in
      setTimeout(() => {
        setShowWordLimitAlert(true);
      }, 10);
      
      // Auto-hide alert after 3 seconds
      setTimeout(() => {
        setShowWordLimitAlert(false);
        setTimeout(() => setWordLimitAlert(null), 300);
      }, 3000);
      return;
    }

    setManualWords(prev => [...prev, cleanWord]);
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

  // Tab switching with smooth transitions (no confirmation dialog)
  const handleTabChange = (newTab: TabType) => {
    if (newTab === activeTab || isTransitioning) return;
    
    // Update slider position immediately for smooth sliding effect
    updateSliderPosition(newTab);
    
    // Start transition
    setIsTransitioning(true);
    setActiveTab(newTab);
    
    // Update displayed tab after a short delay for smooth transition
    setTimeout(() => {
      setDisplayedTab(newTab);
      setIsTransitioning(false);
      // Clear expanded cards when switching tabs
      setExpandedCards(new Set());
    }, 150);
  };

  // Image upload with validation and text data check
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

    // Check if there's existing text data
    if (text.trim()) {
      // Reset dialog state first
      setShowConfirmDialog(false);
      setConfirmAction(null);
      
      // Use setTimeout to ensure state is reset before showing dialog
      setTimeout(() => {
        setDialogType('clearText');
        setShowConfirmDialog(true);
        setConfirmAction(() => () => {
        // Clear only text data and proceed with image processing
        setText('');
        setSelectedWords([]);
        setTextExplanations([]);
        textExplanationsRef.current = [];
        setExplainedWords([]);
        setTextExplainedWordNames(new Set());
        // Reset text tab completion states
        setTextIsCompleted(false);
        setTextIsStreaming(false);
        setTextIsExplaining(false);
        setTextIsSmartExplaining(false);
        setTextSmartExplainPhase('idle');
        // Reset global completion states
        setIsCompleted(false);
        setIsStreaming(false);
        setIsExplaining(false);
        setIsSmartExplaining(false);
        setSmartExplainPhase('selecting');
        // Note: We preserve words tab data (manualWords, wordsExplanations, wordsExplainedWordNames, etc.)
        
          // Store the file and show crop canvas
          setUploadedImageFile(file);
          setImagePreviewUrl(URL.createObjectURL(file));
          setShowCropCanvas(true);
          setShowConfirmDialog(false);
          setConfirmAction(null);
        });
      }, 10);
      return;
    }

    // If no text data, proceed directly to crop canvas
    setUploadedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setShowCropCanvas(true);
  };

  // Handle crop canvas cancel
  const handleCropCancel = () => {
    setShowCropCanvas(false);
    setCropData({ x: 0, y: 0, width: 100, height: 100 });
    setRotation(0);
    setUploadedImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle crop canvas explain (process image)
  const handleCropExplain = async () => {
    if (!uploadedImageFile) return;

    setIsLoading(true);
    setIsProcessingImage(true);
    setShowCropCanvas(false);
    
    // Switch to text tab immediately
    setActiveTab('text');
    setDisplayedTab('text');
    setTimeout(() => {
      updateSliderPosition('text');
    }, 50);
    
    // Start cyclic processing messages
    startCyclicProcessingMessages();

    try {
      // Create a canvas to apply crop and rotation
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        try {
          // Calculate crop dimensions in pixels
          const cropX = (img.width * cropData.x) / 100;
          const cropY = (img.height * cropData.y) / 100;
          const cropWidth = (img.width * cropData.width) / 100;
          const cropHeight = (img.height * cropData.height) / 100;
          
          // Set canvas size to cropped dimensions
          canvas.width = cropWidth;
          canvas.height = cropHeight;
          
          if (ctx) {
            // Apply rotation
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            
            // Draw cropped and rotated image
            ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
          }
          
          // Convert canvas to blob
          canvas.toBlob(async (blob) => {
            if (!blob) return;
            
            const formData = new FormData();
            formData.append('file', blob, 'cropped-image.jpg');

            const response = await fetch('/api/v1/image-to-text', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            
            if (data.text) {
              // Validate word limit before setting text
              if (!validateWordLimit(data.text)) {
                return; // Don't set text if it exceeds limit
              }
              
              // Set the extracted text
              setText(data.text);
              
              toast.success('Text extracted successfully from image!');
              
              // Now cleanup the processing states
              setIsLoading(false);
              setIsProcessingImage(false);
              stopCyclicProcessingMessages();
              
              // Clean up
              setUploadedImageFile(null);
              if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
                setImagePreviewUrl(null);
              }
              if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
              throw new Error('No text extracted from image');
            }
          }, 'image/jpeg', 0.9);
        } catch (error) {
          console.error('Error processing cropped image:', error);
          showError('Failed to extract text from cropped image. Please try again.');
          
          // Cleanup on error
          setIsLoading(false);
          setIsProcessingImage(false);
          stopCyclicProcessingMessages();
          
          // Clean up
          setUploadedImageFile(null);
          if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
            setImagePreviewUrl(null);
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
          // Only reset states if we're actually done processing
          // Don't reset immediately - let the API response handle it
        }
      };
      
      img.src = imagePreviewUrl!;
    } catch (error) {
      console.error('Error processing image:', error);
      showError('Failed to extract text from image. Please try again.');
      setIsLoading(false);
      setIsProcessingImage(false);
      stopCyclicProcessingMessages();
    }
  };

  // Handle rotation
  const handleRotateLeft = () => {
    setRotation(prev => (prev - 90) % 360);
  };

  const handleRotateRight = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Handle crop area dragging
  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({ ...cropData });
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Get the image container dimensions to calculate proper percentage
    const imageContainer = e.currentTarget.closest('.relative');
    if (!imageContainer) return;
    
    const containerRect = imageContainer.getBoundingClientRect();
    const deltaXPercent = (deltaX / containerRect.width) * 100;
    const deltaYPercent = (deltaY / containerRect.height) * 100;
    
    setCropData({
      x: Math.max(0, Math.min(100 - cropData.width, cropStart.x + deltaXPercent)),
      y: Math.max(0, Math.min(100 - cropData.height, cropStart.y + deltaYPercent)),
      width: cropData.width,
      height: cropData.height
    });
  };

  const handleCropMouseUp = () => {
    setIsDragging(false);
  };

  // Handle crop area resizing
  const handleCropResize = (direction: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startCrop = { ...cropData };
    
    // Get the image container for proper percentage calculation
    const imageContainer = e.currentTarget.closest('.relative');
    if (!imageContainer) return;
    
    const containerRect = imageContainer.getBoundingClientRect();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Convert pixel movement to percentage
      const deltaXPercent = (deltaX / containerRect.width) * 100;
      const deltaYPercent = (deltaY / containerRect.height) * 100;
      
      let newCrop = { ...startCrop };
      
      switch (direction) {
        case 'nw':
          newCrop.x = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + deltaXPercent));
          newCrop.y = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + deltaYPercent));
          newCrop.width = startCrop.width - (newCrop.x - startCrop.x);
          newCrop.height = startCrop.height - (newCrop.y - startCrop.y);
          break;
        case 'ne':
          newCrop.y = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + deltaYPercent));
          newCrop.width = Math.max(10, Math.min(100 - newCrop.x, startCrop.width + deltaXPercent));
          newCrop.height = startCrop.height - (newCrop.y - startCrop.y);
          break;
        case 'sw':
          newCrop.x = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + deltaXPercent));
          newCrop.width = startCrop.width - (newCrop.x - startCrop.x);
          newCrop.height = Math.max(10, Math.min(100 - newCrop.y, startCrop.height + deltaYPercent));
          break;
        case 'se':
          newCrop.width = Math.max(10, Math.min(100 - newCrop.x, startCrop.width + deltaXPercent));
          newCrop.height = Math.max(10, Math.min(100 - newCrop.y, startCrop.height + deltaYPercent));
          break;
        case 'n':
          newCrop.y = Math.max(0, Math.min(startCrop.y + startCrop.height - 10, startCrop.y + deltaYPercent));
          newCrop.height = startCrop.height - (newCrop.y - startCrop.y);
          break;
        case 's':
          newCrop.height = Math.max(10, Math.min(100 - newCrop.y, startCrop.height + deltaYPercent));
          break;
        case 'e':
          newCrop.width = Math.max(10, Math.min(100 - newCrop.x, startCrop.width + deltaXPercent));
          break;
        case 'w':
          newCrop.x = Math.max(0, Math.min(startCrop.x + startCrop.width - 10, startCrop.x + deltaXPercent));
          newCrop.width = startCrop.width - (newCrop.x - startCrop.x);
          break;
      }
      
      setCropData(newCrop);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Smart Select Words functionality
  const handleSmartSelectWords = async () => {
    if (!text.trim()) {
      showError('Please enter some text first');
      return;
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    setSmartSelectAbortController(controller);
    setIsSmartSelecting(true);

    try {
      const response = await fetch('/api/v1/important-words-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      
      // Highlight each important word using index and length with light purple background
      const importantWords = data.important_words_location || [];
      
      // Safety check: limit to 10 words maximum
      if (importantWords.length > 10) {
        showError("Smart Select returned more than 10 words. Please try again.");
        return;
      }
      
      setSelectedWords(importantWords);
      toast.success(`Selected ${importantWords.length} important words`);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Smart word selection was cancelled');
        return;
      }
      console.error('Error selecting words:', error);
      showError('Failed to select words. Please try again.');
    } finally {
      setIsSmartSelecting(false);
      setSmartSelectAbortController(null);
    }
  };

  // Explain functionality with WebSocket streaming
  const handleExplainWords = async () => {
    console.log('handleExplainWords called with selectedWords:', selectedWords);
    console.log('handleExplainWords called with manualWords:', manualWords);
    
    // Determine which tab we're in and get its loading states
    const currentTab = displayedTab;
    const loadingStates = getCurrentTabLoadingStates();
    
    // For manual words, only explain words that haven't been explained yet
    let wordsToExplain;
    
    if (selectedWords.length > 0) {
      console.log('Using selectedWords for explanation');
      wordsToExplain = selectedWords;
    } else {
      // Filter out already explained manual words - use tab-specific explained word names
      const currentTabExplainedNames = getCurrentTabExplainedWordNames();
      const unexplainedWords = manualWords.filter(word => 
        !currentTabExplainedNames.has(word)
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

    loadingStates.setIsExplaining(true);
    loadingStates.setIsStreaming(true);
    loadingStates.setIsCompleted(false);
    loadingStates.setIsPreparingExplanations(true);

    // Determine the correct text to send to API
    const apiText = selectedWords.length > 0 
      ? text // Use original text for selected words
      : wordsToExplain.map(w => w.word).join(' '); // Use concatenated words for manual words

    console.log('Triggering WebSocket connection for manual word explanation...');
    console.log('API text:', apiText);
    console.log('Words to explain:', wordsToExplain);

    // Set the trigger to start WebSocket connection
    setWebsocketTrigger({
      text: apiText,
      importantWords: wordsToExplain,
      currentTab
    });
  };

  // Stop streaming function
  const handleStopStreaming = () => {
    // Close WebSocket connection if open
    if (websocket) {
      websocket.close();
      setWebsocket(null);
    }
    
    // Reset WebSocket trigger
    setWebsocketTrigger(null);
    
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
      setIsCompleted(true);
      setIsExplaining(false);
      setAbortController(null);
      
      // Also stop smart explain if it's running
      const loadingStates = getCurrentTabLoadingStates();
      if (loadingStates.isSmartExplaining) {
        loadingStates.setIsSmartExplaining(false);
        loadingStates.setSmartExplainPhase('idle');
        loadingStates.setIsStreaming(false);
        loadingStates.setIsCompleted(false);
      }
      
      toast.info('Explanation stopped');
    }
    
    // Also stop smart selecting if it's running
    if (isSmartSelecting && smartSelectAbortController) {
      smartSelectAbortController.abort();
      setIsSmartSelecting(false);
      setSmartSelectAbortController(null);
      toast.info('Smart word selection stopped');
    }
  };

  const stopPowerWords = () => {
    if (powerWordsAbortController) {
      powerWordsAbortController.abort();
      console.log('Power words request stopped by user');
      setPowerWordsAbortController(null);
      setIsLoadingPowerWords(false);
      toast.info('Power words loading stopped');
    }
  };

  // Smart Explain (Smart Select + Explain)
  const handleSmartExplain = async () => {
    if (!text.trim()) {
      showError('Please enter some text first');
      return;
    }

    // Determine which tab we're in and get its loading states
    const currentTab = displayedTab;
    const loadingStates = getCurrentTabLoadingStates();

    loadingStates.setIsSmartExplaining(true);
    loadingStates.setSmartExplainPhase('selecting');

    // Create abort controller at the beginning for both API calls
    const controller = new AbortController();
    setAbortController(controller);

    try {
      console.log('Starting smart explain - calling important words API...');
      
      // Step 1: Call important words API
      const response = await fetch('/api/v1/important-words-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const importantWords = data.important_words_location || [];
      
      console.log('Smart select response:', data);
      console.log('Important words found:', importantWords);
      
      if (importantWords.length === 0) {
        showError('No important words found in the text');
        loadingStates.setIsSmartExplaining(false);
        return;
      }

      // Safety check: limit to 10 words maximum
      if (importantWords.length > 10) {
        showError('Smart Explain found more than 10 words. Please try again.');
        loadingStates.setIsSmartExplaining(false);
        return;
      }

      // Step 2: Mark words as selected in the text canvas
      setSelectedWords(importantWords);
      console.log('Words marked as selected:', importantWords);

      // Step 3: Trigger WebSocket connection for words explanation
      console.log('Triggering WebSocket connection for words explanation...');
      loadingStates.setSmartExplainPhase('explaining');
      loadingStates.setIsStreaming(true);
      loadingStates.setIsCompleted(false);

      // Set the trigger to start WebSocket connection
      setWebsocketTrigger({
        text,
        importantWords,
        currentTab
      });
    } catch (error) {
      console.error('Error in smart explain:', error);
      
      // Check if the error is due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Smart explain was aborted by user');
        // Don't show error message for user-initiated abort
      } else {
        showError('Failed to process text. Please try again.');
      }
      
      loadingStates.setIsSmartExplaining(false);
      loadingStates.setIsStreaming(false);
      loadingStates.setSmartExplainPhase('idle');
      setAbortController(null);
    }
  };

  // useEffect to handle WebSocket connection
  useEffect(() => {
    if (!websocketTrigger) return;

    const { text, importantWords, currentTab } = websocketTrigger;
    const loadingStates = getCurrentTabLoadingStates();

    console.log('Setting up WebSocket for words explanation...');

    // Close existing WebSocket if any
    if (websocket) {
      websocket.close();
    }

    // Create new WebSocket connection
    const ws = new WebSocket(`${CONFIG.API_BASE_URL.replace('https://', 'wss://')}/api/v1/words-explanation-v2`);
    setWebsocket(ws);

    ws.onopen = function(event) {
      console.log('WebSocket connected! Sending request...');
      
      // Send request data
      const requestData = {
        text: text,
        important_words_location: importantWords
      };

      ws.send(JSON.stringify(requestData));
      console.log('Request sent to WebSocket:', requestData);
    };

    ws.onmessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket data:', data);
        
        // Check for completion message
        if (data.status === 'completed') {
          console.log('✅ ' + data.message);
          loadingStates.setIsStreaming(false);
          loadingStates.setIsCompleted(true);
          // Mark words as explained (change from purple to green background)
          setExplainedWords(prev => [...prev, ...importantWords]);
          
          // Update tab-specific explained word names for highlighting
          if (currentTab === 'text') {
            setTextExplainedWordNames(prev => {
              const newSet = new Set(prev);
              importantWords.forEach((word: any) => newSet.add(word.word));
              return newSet;
            });
          } else if (currentTab === 'words') {
            setWordsExplainedWordNames(prev => {
              const newSet = new Set(prev);
              importantWords.forEach((word: any) => newSet.add(word.word));
              return newSet;
            });
          }
          
          // Keep isSmartExplaining true until the very end
          setSelectedWords([]); // Clear selected words as they are now explained
          setAbortController(null);
          loadingStates.setIsExplaining(false);
          loadingStates.setIsPreparingExplanations(false);
          loadingStates.setIsSmartExplaining(false);
          loadingStates.setSmartExplainPhase('idle');
          // Ensure all cards start collapsed
          setExpandedCards(new Set());
          toast.success('All explanations completed!');
          
          // Close WebSocket and reset trigger
          ws.close();
          setWebsocket(null);
          setWebsocketTrigger(null);
          return;
        }
        
        // Check for error message 
        if (data.error_code) {
          console.error('❌ Error: ' + data.error_code + ' - ' + data.error_message);
          showError('Error: ' + data.error_code + ' - ' + data.error_message);
          loadingStates.setIsExplaining(false);
          loadingStates.setIsPreparingExplanations(false);
          loadingStates.setIsSmartExplaining(false);
          loadingStates.setIsStreaming(false);
          loadingStates.setSmartExplainPhase('idle');
          setAbortController(null);
          ws.close();
          setWebsocket(null);
          setWebsocketTrigger(null);
          return;
        }
        
        // Process word explanation
        if (data.word_info) {
          const wordInfo = data.word_info;
          console.log('Processing word explanation for:', wordInfo.word);
          
          // Check if we already have this word in the current tab's explanations
          const currentExplanations = currentTab === 'text' ? textExplanationsRef.current : wordsExplanationsRef.current;
          const existingIndex = currentExplanations.findIndex(exp => exp.word === wordInfo.word);
          
          if (existingIndex === -1) {
            // New word, add it immediately using the working function
            addExplanationImmediately(wordInfo, currentTab as 'text' | 'words');
          } else {
            // Word exists, update it
            console.log('Updating explanation for:', wordInfo.word);
            if (currentTab === 'text') {
              textExplanationsRef.current[existingIndex] = wordInfo;
              setTextExplanations([...textExplanationsRef.current]);
            } else {
              wordsExplanationsRef.current[existingIndex] = wordInfo;
              setWordsExplanations([...wordsExplanationsRef.current]);
            }
            setUpdateCounter(prev => prev + 1);
          }
          
          // Mark word as explained
          setExplainedWords(prev => {
            const existing = [...prev];
            const newWord = {
              word: wordInfo.word,
              index: wordInfo.location?.index || 0,
              length: wordInfo.location?.length || wordInfo.word.length,
            };
            
            if (!existing.some(exp => exp.word === newWord.word)) {
              existing.push(newWord);
            }
            return existing;
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        showError('Error parsing response from server');
      }
    };

    ws.onclose = function(event) {
      console.log('WebSocket connection closed');
      setWebsocket(null);
      
      if (event.code !== 1000) {
        console.error('❌ Connection closed unexpectedly (code: ' + event.code + ')');
        showError('Connection closed unexpectedly');
        loadingStates.setIsExplaining(false);
        loadingStates.setIsPreparingExplanations(false);
        loadingStates.setIsSmartExplaining(false);
        loadingStates.setIsStreaming(false);
        loadingStates.setSmartExplainPhase('idle');
        setAbortController(null);
        setWebsocketTrigger(null);
      }
    };

    ws.onerror = function(error) {
      console.error('WebSocket error:', error);
      showError('WebSocket connection error occurred');
      loadingStates.setIsExplaining(false);
      loadingStates.setIsPreparingExplanations(false);
      loadingStates.setIsSmartExplaining(false);
      loadingStates.setIsStreaming(false);
      loadingStates.setSmartExplainPhase('idle');
      setAbortController(null);
      setWebsocket(null);
      setWebsocketTrigger(null);
    };

    // Cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [websocketTrigger]);

  // Unselect all words functionality
  const handleUnselectAllWords = () => {
    setSelectedWords([]);
    toast.success('All words unselected');
  };

  // Clear All with confirmation dialog
  const handleClearAll = () => {
    if (hasData()) {
      setDialogType('clearAll');
      setShowConfirmDialog(true);
      setConfirmAction(() => clearAllData);
    }
  };

  // Clear Text with confirmation dialog
  const handleClearText = () => {
    if (text.trim()) {
      setDialogType('clearText');
      setShowConfirmDialog(true);
      setConfirmAction(() => () => {
        // Only clear Text tab data
        setText('');
        setSelectedWords([]);
        setTextExplanations([]);
        textExplanationsRef.current = [];
        setTextExplainedWordNames(new Set());
        setTextIsCompleted(false);
        setTextIsStreaming(false);
        setTextIsExplaining(false);
        setTextIsSmartExplaining(false);
        setTextSmartExplainPhase('idle');
        // Note: Don't clear manualWords, wordsExplanations, or wordsExplainedWordNames as they belong to Words tab
        toast.success('Text and all explanations cleared!');
      });
    }
  };

  // Clear Explanations with confirmation dialog
  const handleClearExplanations = () => {
    if (explanations.length > 0) {
      setDialogType('clearExplanations');
      setShowConfirmDialog(true);
      setConfirmAction(() => () => {
        setExplanations([]);
        explanationsRef.current = [];
        setTextExplanations([]);
        setWordsExplanations([]);
        textExplanationsRef.current = [];
        wordsExplanationsRef.current = [];
        setExplainedWords([]);
        setExplainedWordNames(new Set());
        setTextExplainedWordNames(new Set());
        setWordsExplainedWordNames(new Set());
        setIsCompleted(false);
        setIsStreaming(false);
        setIsExplaining(false);
        toast.success('All explanations cleared!');
      });
    }
  };

  // Clear Text Tab Explanations Only
  const handleClearTextExplanations = () => {
    if (textExplanations.length > 0) {
      setDialogType('clearExplanations');
      setShowConfirmDialog(true);
      setConfirmAction(() => () => {
        setTextExplanations([]);
        textExplanationsRef.current = [];
        setTextExplainedWordNames(new Set());
        // Clear word-to-index mapping
        setTextWordToIndexMap(new Map());
        setTextIsCompleted(false);
        setTextIsStreaming(false);
        setTextIsExplaining(false);
        setTextIsSmartExplaining(false);
        setTextSmartExplainPhase('idle');
        toast.success('Text tab explanations cleared!');
      });
    }
  };

  // Clear Words Tab Explanations Only
  const handleClearWordsExplanations = () => {
    if (wordsExplanations.length > 0) {
      setDialogType('clearExplanations');
      setShowConfirmDialog(true);
      setConfirmAction(() => () => {
        setManualWords([]);
        setWordsExplanations([]);
        wordsExplanationsRef.current = [];
        setWordsExplainedWordNames(new Set());
        // Clear word-to-index mapping
        setWordsWordToIndexMap(new Map());
        setWordsIsCompleted(false);
        setWordsIsStreaming(false);
        setWordsIsExplaining(false);
        setWordsIsSmartExplaining(false);
        setWordsSmartExplainPhase('idle');
        toast.success('Words tab explanations cleared!');
      });
    }
  };

  // Double-click word selection
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      // Get the actual selected text
      const selectedText = selection.toString().trim();
      
      // Find the position of the selected text in the original text
      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      const startOffset = range.startOffset;
      
      // Calculate the actual position in the full text
      let actualStart = 0;
      if (textCanvasRef.current) {
        let walker = document.createTreeWalker(
          textCanvasRef.current,
          NodeFilter.SHOW_TEXT,
          null
        );
      
        let node;
        while (node = walker.nextNode()) {
          if (node === textNode) {
            actualStart += startOffset;
            break;
          }
          actualStart += node.textContent?.length || 0;
        }
      }
      
      // Find word boundaries using proper regex (only word characters)
      let start = actualStart;
      let end = actualStart;
      
      // Move start backward to find word start (only word characters)
      while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
      }
      
      // Move end forward to find word end (only word characters)
      while (end < text.length && /\w/.test(text[end])) {
        end++;
      }
      
      if (start < end) {
        const word = text.slice(start, end);
        const wordLocation = {
          word: word.toLowerCase(),
          index: start,
          length: end - start,
        };
        
        const isSelected = selectedWords.some(w => w.index === start && w.length === end - start);
        
        if (isSelected) {
          console.log('🗑️ Deselecting word via double-click:', wordLocation);
          setSelectedWords(prev => {
            const filtered = prev.filter(w => !(w.index === start && w.length === end - start));
            console.log('📊 Selected words after deselection:', filtered);
            return filtered;
          });
        } else {
          // Check if word is already explained
          if (textExplainedWordNames.has(word.toLowerCase())) {
            showError("This word has already been explained");
            return;
          }
          
          // Check selection limit - can't select more than 10 words at once
          if (selectedWords.length >= 10) {
            showError("Can't select more than 10 words at once");
            return;
          }
          
          // Check total word count before adding - Text tab only
          // Only count words that are actually explained in Text tab
          const totalWords = textExplanations.length;
          if (totalWords >= CONFIG.MAX_TOTAL_WORDS) {
            showError("Total word count can't be more than 20");
            return;
          }
          
          console.log('✅ Selecting word via double-click:', wordLocation);
          setSelectedWords(prev => {
            const updated = [...prev, wordLocation];
            console.log('📊 Selected words after selection:', updated);
            return updated;
          });
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

  // Handle clicking on explained words - scroll to explanation and expand (O(1) lookup)
  const handleExplainedWordClick = (word: string) => {
    console.log('=== EFFICIENT WORD CLICK DEBUG ===');
    console.log('Clicked on word:', word);
    
    // Get current tab's data
    const currentExplanations = getCurrentTabExplanations();
    const wordToIndexMap = getCurrentTabWordToIndexMap();
    
    // O(1) lookup for exact word match
    let targetIndex = wordToIndexMap.get(word);
    let targetWord = word;
    
    // If exact match not found, try case-insensitive lookup
    if (targetIndex === undefined) {
      for (const [mapWord, index] of wordToIndexMap.entries()) {
        if (mapWord.toLowerCase() === word.toLowerCase()) {
          targetIndex = index;
          targetWord = mapWord; // Use the correct case from the map
          break;
        }
      }
    }
    
    console.log('Target index:', targetIndex);
    console.log('Target word:', targetWord);
    
    if (targetIndex === undefined || targetIndex >= currentExplanations.length) {
      console.log('❌ Word not found in explanations');
      return;
    }
    
    // Expand the card using the correct case
    setExpandedCards(new Set([targetWord]));
    
    // Scroll to explanation section
    if (explanationSectionRef.current) {
      explanationSectionRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });

      // After a short delay, scroll within the explanation container to bring the specific word to top
      setTimeout(() => {
        if (explanationSectionRef.current) {
          // Find the specific explanation card by index (O(1) access)
          const explanationCards = explanationSectionRef.current.querySelectorAll('[data-word]');
          const targetCard = explanationCards[targetIndex] as HTMLElement;
          
          if (targetCard) {
            console.log('✅ Target card found at index:', targetIndex);
            console.log('Target card data-word:', targetCard.getAttribute('data-word'));
            
            // Get the explanation container's scroll position
            const container = explanationSectionRef.current;
            const containerRect = container.getBoundingClientRect();
            const targetRect = targetCard.getBoundingClientRect();
            
            // Calculate the scroll position needed to bring the card to the top
            const scrollTop = container.scrollTop + (targetRect.top - containerRect.top);
            
            // Smooth scroll within the explanation container
            container.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
            
            console.log('✅ Scroll command executed');
          } else {
            console.log('❌ Target card not found at index:', targetIndex);
          }
        }
      }, 300); // Reduced delay since we have direct access
    } else {
      console.log('❌ explanationSectionRef.current is null');
    }
  };

  // Handle clicking on explained words in Text tab - scroll to explanation and expand
  const handleTextExplainedWordClick = (word: string) => {
    console.log('=== TEXT TAB WORD CLICK DEBUG ===');
    console.log('Clicked on word:', word);
    console.log('Current displayedTab:', displayedTab);
    console.log('textExplanations:', textExplanations);
    console.log('wordsExplanations:', wordsExplanations);
    
    // Find the explanation in the appropriate explanations array based on current tab
    const currentExplanations = displayedTab === 'text' ? textExplanations : wordsExplanations;
    const explanation = currentExplanations.find(exp => 
      exp && exp.word && exp.word.toLowerCase() === word.toLowerCase()
    );
    
    if (!explanation) {
      console.log('❌ Word not found in current explanations');
      console.log('Searched in:', displayedTab === 'text' ? 'textExplanations' : 'wordsExplanations');
      return;
    }
    
    console.log('✅ Found explanation:', explanation);
    
    // Expand the card using the word from the explanation
    setExpandedCards(new Set([explanation.word]));
    
    // Scroll to explanation section
    if (explanationSectionRef.current) {
      console.log('✅ explanationSectionRef found, scrolling...');
      explanationSectionRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });

      // After a short delay, scroll within the explanation container to bring the specific word to top
      setTimeout(() => {
        if (explanationSectionRef.current) {
          // Find the specific explanation card by data-word attribute
          const explanationCards = explanationSectionRef.current.querySelectorAll('[data-word]');
          console.log('Found explanation cards:', explanationCards.length);
          console.log('Card data-words:', Array.from(explanationCards).map(card => card.getAttribute('data-word')));
          
          const targetCard = Array.from(explanationCards).find(card => 
            card.getAttribute('data-word')?.toLowerCase() === word.toLowerCase()
          ) as HTMLElement;
          
          if (targetCard) {
            console.log('✅ Target card found');
            console.log('Target card data-word:', targetCard.getAttribute('data-word'));
            
            // Get the explanation container's scroll position
            const container = explanationSectionRef.current;
            const containerRect = container.getBoundingClientRect();
            const cardRect = targetCard.getBoundingClientRect();
            
            // Calculate the scroll position to bring the card to the top
            const scrollTop = container.scrollTop + (cardRect.top - containerRect.top);
            
            // Smooth scroll to the target card
            container.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
            
            console.log('✅ Scrolled to target card');
          } else {
            console.log('❌ Target card not found');
            console.log('Available cards:', Array.from(explanationCards).map(card => card.getAttribute('data-word')));
          }
        }
      }, 100);
    }
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
      
      // Determine which tab we're in and update the appropriate explanations
      const currentTab = displayedTab;
      
      if (currentTab === 'text') {
        // Update text explanations
        setTextExplanations(prev => prev.map(exp =>
          exp.word === explanation.word ? { ...exp, examples: data.examples } : exp
        ));
        textExplanationsRef.current = textExplanationsRef.current.map(exp =>
          exp.word === explanation.word ? { ...exp, examples: data.examples } : exp
        );
      } else {
        // Update words explanations
        setWordsExplanations(prev => prev.map(exp =>
          exp.word === explanation.word ? { ...exp, examples: data.examples } : exp
        ));
        wordsExplanationsRef.current = wordsExplanationsRef.current.map(exp =>
          exp.word === explanation.word ? { ...exp, examples: data.examples } : exp
        );
      }
      
      // Also update main explanations for backward compatibility
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

  // Function to scroll to searched word
  const scrollToSearchedWord = (searchTerm: string) => {
    if (!textCanvasRef.current || !searchTerm) return;
    
    const textElement = textCanvasRef.current;
    const textContent = textElement.textContent || '';
    const searchIndex = textContent.toLowerCase().indexOf(searchTerm.toLowerCase());
    
    if (searchIndex !== -1) {
      // Create a temporary span to measure the position
      const tempSpan = document.createElement('span');
      tempSpan.textContent = textContent.substring(0, searchIndex);
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.whiteSpace = 'pre-wrap';
      tempSpan.style.fontSize = '14px';
      tempSpan.style.lineHeight = '1.5';
      tempSpan.style.padding = '12px 16px';
      tempSpan.style.width = textElement.offsetWidth + 'px';
      
      document.body.appendChild(tempSpan);
      const offsetTop = tempSpan.offsetHeight;
      document.body.removeChild(tempSpan);
      
      // Scroll to the position with some offset
      const scrollTop = offsetTop - textElement.offsetHeight / 2;
      textElement.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
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
      
      // Auto-scroll to the first match
      if (matches.length > 0) {
        setTimeout(() => scrollToSearchedWord(searchTerm), 100);
      }
    } else {
      setSearchResults([]);
    }
  }, [text, searchTerm]);

  // Render highlighted text with all word states
  const renderHighlightedText = () => {
    if (!text) return '';

    // Create a map of character positions to their highlighting state
    const highlightMap = new Array(text.length).fill(null);
    
    // Mark explained words - check both textExplanations and textExplainedWordNames
    textExplanations.forEach(explanation => {
      if (explanation && explanation.wordLocation) {
        const wordLocation = explanation.wordLocation;
        for (let i = wordLocation.index; i < wordLocation.index + wordLocation.length; i++) {
          highlightMap[i] = 'explained';
        }
      }
    });
    
    // Also mark words that are in textExplainedWordNames but might not have wordLocation
    // This handles cases where words were explained but don't have proper wordLocation data
    console.log('=== HIGHLIGHTING DEBUG ===');
    console.log('textExplainedWordNames:', textExplainedWordNames);
    console.log('text:', text);
    
    textExplainedWordNames.forEach(explainedWord => {
      const wordLower = explainedWord.toLowerCase();
      console.log('Processing word:', explainedWord, 'lowercase:', wordLower);
      let startIndex = 0;
      while (true) {
        const index = text.toLowerCase().indexOf(wordLower, startIndex);
        console.log('Found word at index:', index);
        if (index === -1) break;
        
        // Check if this position is already marked as explained
        let isAlreadyMarked = false;
        for (let i = index; i < index + wordLower.length; i++) {
          if (highlightMap[i] === 'explained') {
            isAlreadyMarked = true;
            break;
          }
        }
        
        if (!isAlreadyMarked) {
          for (let i = index; i < index + wordLower.length; i++) {
            highlightMap[i] = 'explained';
          }
          console.log('Marked word as explained:', explainedWord, 'at index:', index);
        }
        
        startIndex = index + 1;
      }
    });
    
    // Mark selected words (only if not already explained)
    selectedWords.forEach(wordLocation => {
      if (wordLocation) {
        const isAlreadyExplained = textExplanations.some(exp => 
          exp && exp.wordLocation && 
          exp.wordLocation.index === wordLocation.index && 
          exp.wordLocation.length === wordLocation.length
        );
        
        if (!isAlreadyExplained) {
          for (let i = wordLocation.index; i < wordLocation.index + wordLocation.length; i++) {
            highlightMap[i] = 'selected';
          }
        }
      }
    });
    
    // Mark manual words
    manualWords.forEach(manualWord => {
      const wordLower = manualWord.toLowerCase();
      let startIndex = 0;
      while (true) {
        const index = text.toLowerCase().indexOf(wordLower, startIndex);
        if (index === -1) break;
        
        const isAlreadyExplained = textExplanations.some(exp => 
          exp && exp.wordLocation && 
          exp.wordLocation.index === index && 
          exp.wordLocation.length === wordLower.length
        );
        
        if (!isAlreadyExplained) {
          for (let i = index; i < index + wordLower.length; i++) {
            if (highlightMap[i] === null) {
              highlightMap[i] = 'manual';
            }
          }
        }
        
        startIndex = index + 1;
      }
    });
    
    // Mark search matches
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      let startIndex = 0;
      while (true) {
        const index = text.toLowerCase().indexOf(searchLower, startIndex);
        if (index === -1) break;
        
        for (let i = index; i < index + searchLower.length; i++) {
          if (highlightMap[i] === null) {
            highlightMap[i] = 'search';
          }
        }
        
        startIndex = index + 1;
      }
    }

    // Build the highlighted text
    const result = [];
    let currentText = '';
    let currentHighlight = null;
    let key = 0;

    console.log('=== BUILDING HIGHLIGHTED TEXT ===');
    console.log('highlightMap:', highlightMap);

    for (let i = 0; i <= text.length; i++) {
      const char = i < text.length ? text[i] : '';
      const highlight = i < text.length ? highlightMap[i] : null;
      
      if (highlight !== currentHighlight || i === text.length) {
        // Process the accumulated text
        if (currentText) {
          console.log('Processing text:', currentText, 'with highlight:', currentHighlight);
          if (currentHighlight === 'explained') {
            // Capture the word text in a variable to avoid closure issues
            const wordText = currentText;
            console.log('Creating clickable span for word:', wordText);
            
            result.push(React.createElement('span', {
              key: key++,
              className: 'bg-green-200 border border-green-300 px-1 rounded cursor-pointer hover:bg-green-300 hover:border-green-400 transition-all duration-300 transform hover:scale-125 hover:shadow-lg hover:z-10 hover:rotate-1',
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('=== TEXT TAB WORD CLICK DEBUG ===');
                console.log('Clicked on word:', wordText);
                console.log('textExplanations:', textExplanations);
                console.log('textExplainedWordNames:', textExplainedWordNames);
                
                // Clean the wordText (remove extra whitespace but preserve hyphens and apostrophes)
                const cleanWord = wordText.trim().replace(/[^\w\-']/g, '');
                console.log('Clean word:', cleanWord);
                
                if (!cleanWord) {
                  console.log('❌ Clean word is empty');
                  return;
                }
                
                // Find the explanation by word name (case-insensitive)
                const explanation = textExplanations.find(exp => 
                  exp && exp.word && exp.word.toLowerCase() === cleanWord.toLowerCase()
                );
                
                if (explanation) {
                  console.log('✅ Found explanation by word name:', explanation);
                  handleTextExplainedWordClick(explanation.word);
                } else {
                  // Try to find by checking if the word is in textExplainedWordNames
                  const explainedWord = Array.from(textExplainedWordNames).find(word => 
                    word.toLowerCase() === cleanWord.toLowerCase()
                  );
                  
                  if (explainedWord) {
                    console.log('✅ Found word in textExplainedWordNames:', explainedWord);
                    handleTextExplainedWordClick(explainedWord);
                  } else {
                    console.log('❌ Word not found in explanations');
                    console.log('Available words in textExplainedWordNames:', Array.from(textExplainedWordNames));
                    console.log('Available words in textExplanations:', textExplanations.map(exp => exp?.word));
                  }
                }
              }
            }, wordText));
          } else if (currentHighlight === 'selected') {
            // Capture the word text in a variable to avoid closure issues
            const wordText = currentText;
            console.log('🎨 Rendering selected word with Cancel button:', wordText);
            
            result.push(React.createElement('span', {
              key: key++,
              className: 'bg-purple-200 border border-purple-300 px-1 rounded relative cursor-pointer hover:bg-purple-300 hover:border-purple-400 transition-all duration-300 transform hover:scale-125 hover:shadow-lg hover:z-10 hover:rotate-1'
            }, wordText, React.createElement('button', {
              onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                console.log('🔴 Cancel button clicked!');
                console.log('🎯 Event target:', e.target);
                console.log('🎯 Word text:', wordText);
                console.log('📊 Selected words before:', selectedWords);
                
                e.preventDefault();
                e.stopPropagation();
                
                const wordLocation = selectedWords.find(w => 
                  text.slice(w.index, w.index + w.length) === wordText
                );
                
                console.log('🔍 Found word location:', wordLocation);
                console.log('🔍 Searching for word:', wordText);
                console.log('🔍 Available words in selectedWords:', selectedWords.map(w => ({
                  word: text.slice(w.index, w.index + w.length),
                  index: w.index,
                  length: w.length
                })));
                
                if (wordLocation) {
                  console.log('🗑️ Removing word from selection:', wordLocation);
                  setSelectedWords(prev => {
                    const filtered = prev.filter(w => !(w.index === wordLocation.index && w.length === wordLocation.length));
                    console.log('📊 Selected words after:', filtered);
                    return filtered;
                  });
                } else {
                  console.log('❌ Word location not found for text:', wordText);
                  console.log('📊 Available selected words:', selectedWords.map(w => ({
                    word: text.slice(w.index, w.index + w.length),
                    index: w.index,
                    length: w.length
                  })));
                }
              },
              className: 'absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 leading-none transition-all duration-200 transform hover:scale-125 hover:shadow-lg',
              title: 'Remove word selection'
            }, '×')));
          } else if (currentHighlight === 'manual') {
            result.push(React.createElement('span', {
              key: key++,
              className: 'bg-purple-200 border border-purple-300 px-1 rounded cursor-pointer hover:bg-purple-300 hover:border-purple-400 transition-all duration-300 transform hover:scale-125 hover:shadow-lg hover:z-10 hover:rotate-1'
            }, currentText));
          } else if (currentHighlight === 'search') {
            result.push(React.createElement('span', {
              key: key++,
              className: 'bg-yellow-200 px-1 rounded cursor-pointer hover:bg-yellow-300 transition-colors'
            }, currentText));
          } else {
            result.push(React.createElement('span', { key: key++ }, currentText));
          }
        }
        
        currentText = '';
        currentHighlight = highlight;
      }
      
      if (i < text.length) {
        currentText += char;
      }
    }

    return result;
  };

  // Sort explanations based on selected option
  const sortedExplanations = React.useMemo(() => {
    // Get the appropriate explanations based on current tab
    const currentExplanations = displayedTab === 'text' ? textExplanations : wordsExplanations;
    let filtered = currentExplanations;
    
    // Filter by search term if searching
    if (explanationSearchTerm) {
      filtered = currentExplanations.filter(exp => 
        exp.word.toLowerCase().includes(explanationSearchTerm.toLowerCase())
      );
    }
    
    const sorted = [...filtered];
    
    if (sortBy === 'alphabetical') {
      return sorted.sort((a, b) => a.word.localeCompare(b.word));
    } else {
      // Sort by original order (complexity/paragraph order)
      return sorted.sort((a, b) => {
        const aIndex = currentExplanations.findIndex(exp => exp.word === a.word);
        const bIndex = currentExplanations.findIndex(exp => exp.word === b.word);
        return aIndex - bIndex;
      });
    }
  }, [textExplanations, wordsExplanations, displayedTab, sortBy, explanationSearchTerm]);

  return React.createElement('div', { className: 'min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-25 m-0 p-0' },
    React.createElement(Header),
    
    // Influencing statement with colorful brain icon
    React.createElement('div', { className: 'bg-gradient-to-br from-gray-50 via-white to-purple-25 pt-8 pb-6 px-4' },
      React.createElement('div', { className: 'max-w-7xl mx-auto text-center' },
        // Main tagline with AI emphasis
        React.createElement('div', { className: 'flex items-center justify-center space-x-3 mb-4' },
          React.createElement('h1', { 
            className: 'text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 leading-tight',
            style: { 
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: 'clamp(1.875rem, 4vw, 3rem)'
            }
          }, 
            // Word-by-word hover effects 
            ['Enhance', 'Your', 'Vocabulary', 'With'].map((word, index) => 
              React.createElement('span', {
                key: index,
                className: 'inline-block hover:scale-110 transition-transform duration-300 mx-1',
                style: { transition: 'transform 0.3s ease' }
              }, word)
            ),
            ' ',
            React.createElement('span', { 
              className: 'inline-block hover:scale-110 transition-transform duration-300 mx-1 text-purple-600 font-bold',
              style: { color: '#8B5CF6', transition: 'transform 0.3s ease' }
            }, 'AI')
          ),
          React.createElement('div', { className: 'text-3xl md:text-4xl lg:text-5xl' },
            React.createElement('img', {
              src: '/resources/brain.png',
              alt: 'AI Brain',
              className: 'w-14 h-14 md:w-16 md:h-16 object-contain hover:scale-110 transition-transform duration-300'
            })
          )
        ),
        // Sub-tagline
        React.createElement('p', { 
          className: 'text-lg md:text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed',
          style: { 
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }
        }, 
          // Word-by-word hover effects for sub-tagline
          ['Upload', 'texts', 'or', 'images.', 'Learn', 'new', 'words', 'instantly.'].map((word, index) => 
            React.createElement('span', {
              key: index,
              className: 'inline-block hover:scale-110 transition-all duration-300 px-1 py-1 rounded-full',
              style: { transition: 'all 0.3s ease' }
            }, word)
          )
        )
      )
    ),
    
    (error || showErrorBanner) && React.createElement('div', { 
      className: `fixed top-28 right-4 z-50 transition-all duration-300 ease-in-out transform ${
        showErrorBanner 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      }` 
    },
      React.createElement('div', { 
        className: 'bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm' 
      },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', { className: 'flex items-center' },
            React.createElement('svg', { className: 'w-5 h-5 mr-2', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', { fillRule: 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z', clipRule: 'evenodd' })
            ),
            React.createElement('span', { className: 'text-sm font-medium' }, error)
          ),
          React.createElement('button', {
            onClick: () => {
              setShowErrorBanner(false);
              setTimeout(() => setError(null), 300);
            },
            className: 'ml-4 text-white hover:text-gray-200 transition-colors'
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', { fillRule: 'evenodd', d: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z', clipRule: 'evenodd' })
            )
          )
        )
      )
    ),
    
    (wordLimitAlert || showWordLimitAlert) && React.createElement('div', { 
      className: `fixed top-40 right-4 z-50 transition-all duration-300 ease-in-out transform ${
        showWordLimitAlert 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      }` 
    },
      React.createElement('div', { 
        className: 'bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm' 
      },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', { className: 'flex items-center' },
            React.createElement('svg', { className: 'w-5 h-5 mr-2', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', { fillRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z', clipRule: 'evenodd' })
            ),
            React.createElement('span', { className: 'text-sm font-medium' }, wordLimitAlert)
          ),
          React.createElement('button', {
            onClick: () => {
              setShowWordLimitAlert(false);
              setTimeout(() => setWordLimitAlert(null), 300);
            },
            className: 'ml-4 text-white hover:text-gray-200 transition-colors'
          },
            React.createElement('svg', { className: 'w-4 h-4', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', { fillRule: 'evenodd', d: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z', clipRule: 'evenodd' })
            )
          )
        )
      )
    ),
    
    React.createElement('main', { className: 'max-w-7xl mx-auto px-4 py-8' },
      // Main Content Area - 50/50 Split with gap
      React.createElement('div', { className: 'flex gap-6' },
        // Left Side - User Input Card (50% for Text/Words, centered for Image)
        React.createElement('div', { className: `${displayedTab === 'image' ? 'w-full flex justify-center' : 'w-1/2'}` },
          React.createElement('div', { className: `bg-white rounded-2xl shadow-lg shadow-purple-100 p-6 h-full ${displayedTab === 'image' ? 'max-w-2xl w-full' : ''}` },
            // Tab Navigation
            React.createElement('div', { className: 'mb-6' },
              React.createElement('div', { className: 'relative inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-0 w-full' },
                // Sliding indicator
                React.createElement('div', {
                  className: 'absolute top-0 left-0 h-full bg-purple-500 rounded-lg transition-all duration-300 ease-in-out',
                  style: {
                    width: `${100 / 3}%`,
                    transform: `translateX(${activeTab === 'image' ? '0%' : activeTab === 'text' ? '100%' : '200%'})`
                  }
                }),
                React.createElement('button', {
                  ref: (el) => { tabRefs.current.image = el as HTMLButtonElement; },
                  onClick: () => handleTabChange('image'),
                  className: `relative z-10 flex-1 h-full inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 text-lg font-normal transition-all duration-200 ${activeTab === 'image' ? 'text-white' : 'text-gray-600 hover:text-purple-700 hover:bg-purple-200'}`
                }, 'Image'),
                React.createElement('button', {
                  ref: (el) => { tabRefs.current.text = el as HTMLButtonElement; },
                  onClick: () => handleTabChange('text'),
                  className: `relative z-10 flex-1 h-full inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 text-lg font-normal transition-all duration-200 ${activeTab === 'text' ? 'text-white' : 'text-gray-600 hover:text-purple-700 hover:bg-purple-200'}`
                }, 'Text'),
                React.createElement('button', {
                  ref: (el) => { tabRefs.current.words = el as HTMLButtonElement; },
                  onClick: () => handleTabChange('words'),
                  className: `relative z-10 flex-1 h-full inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 text-lg font-normal transition-all duration-200 ${activeTab === 'words' ? 'text-white' : 'text-gray-600 hover:text-purple-700 hover:bg-purple-200'}`
                }, 'Words')
              )
            ),
            // Image Tab Content
            displayedTab === 'image' && React.createElement('div', { className: `h-[400px] flex flex-col tab-content relative ${activeTab === 'image' ? 'animate-tab-fade-in' : 'animate-tab-fade-out'}` },
              React.createElement('div', { className: 'flex flex-col flex-1 relative' },
                React.createElement('div', {
                  className: `relative border border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] max-w-5xl mx-auto flex-1 flex items-center justify-center ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-primary-200 hover:border-primary-300 bg-primary-25'} ${isLoading ? 'pointer-events-none opacity-50' : ''}`,
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
                      : React.createElement('svg', { className: 'h-10 w-10 text-primary-500', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 1.5, d: 'M12 4l0 8m-4-4l4-4 4 4M6 16h12M6 16l0 2M18 16l0 2M6 18h12' })
                        )
                  ),
                  
                  React.createElement('div', { className: 'text-center space-y-3' },
                    React.createElement('h3', { className: 'text-lg font-medium text-gray-900' },
                      isLoading ? 'Processing image...' : 'Drop, Upload or Paste Image containing texts'
                    ),
                    React.createElement('p', { className: 'text-sm text-gray-600' }, 'Supporting formats: JPG, PNG, JPEG, HEIC'),
                    React.createElement('p', { className: 'text-xs text-gray-500' }, 'Or use Ctrl+V (Windows) / Cmd+V (Mac) to paste from clipboard'),
                    React.createElement('p', { className: 'text-xs text-gray-500' }, 'Maximum file size: 5MB')
                  ),

                  React.createElement('button', {
                    className: 'inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary-100 text-primary-700 hover:bg-primary-200 h-10 px-6 transition-all duration-200',
                    disabled: isLoading
                  }, isLoading ? 'Processing...' : 'Browse')
                )
                ),
                
                // Get Power Words button - positioned below the file size text
                (!text || !text.trim()) && React.createElement('div', { className: 'flex justify-center mt-2' },
                  React.createElement('button', {
                    onClick: isLoadingPowerWords ? stopPowerWords : handlePowerWords,
                    className: `inline-flex items-center justify-center rounded-md font-medium h-7 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${
                      isLoadingPowerWords 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'vibgyor-gradient text-white hover:shadow-xl'
                    }`
                  },
                    isLoadingPowerWords 
                      ? React.createElement('svg', { className: 'w-3.5 h-3.5 mr-1.5', fill: 'none', stroke: 'white', strokeWidth: '2', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }),
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 9h6v6H9z' })
                        )
                      : React.createElement('svg', { className: 'w-3.5 h-3.5 mr-1.5', fill: 'none', stroke: 'white', strokeWidth: '2', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 001-1V4z' })
                        ),
                    isLoadingPowerWords ? 'Stop' : 'Get Power Words'
                  )
                )
              )
              
            ),

            // Text Tab Content
            displayedTab === 'text' && React.createElement('div', { className: `h-[480px] flex flex-col tab-content ${activeTab === 'text' ? 'animate-tab-fade-in' : 'animate-tab-fade-out'}` },
              // Search Bar - only show when there is text
              text.trim() && React.createElement('input', {
                type: 'text',
                placeholder: 'Search word ...',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                className: 'w-full h-9 px-3 py-2 border border-purple-300 rounded-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 hover:border-purple-500 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all duration-200 mb-4'
              }),

              // Instruction Sentences
              text.trim() && React.createElement('div', { className: 'space-y-2 mb-4 ml-4' },
                // Sentence 1: Double click instruction - visible when there is text
                React.createElement('div', { 
                  className: 'text-xs text-purple-600 italic flex items-center' 
                }, 
                  React.createElement('svg', { className: 'w-4 h-4 mr-2 text-purple-600 font-bold', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2.5, d: 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122' })
                  ),
                  React.createElement('strong', {}, 'Double click on a word to select')
                ),
                
                
                // Sentence 3: Green background instruction - visible when there are explained words
                textExplanations.length > 0 && React.createElement('div', { 
                  className: 'text-xs text-purple-600 italic flex items-center' 
                }, 
                  React.createElement('svg', { className: 'w-3 h-3 mr-2 text-green-500', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
                  ),
                  React.createElement('span', {}, 'Click on the word with '),
                  React.createElement('span', { className: 'bg-green-200 border border-green-300 px-1 rounded' }, 'green color'),
                  React.createElement('span', {}, ' background to view explanation')
                )
              ),

              // Text Area with Smart Explain Overlay
              React.createElement('div', { className: 'relative flex flex-col flex-1' },
                (isProcessingImage || text || displayedTab === 'text' || activeTab === 'text')
                  ? React.createElement('div', { className: 'relative' },
                      text ? React.createElement('div', {
                        ref: textCanvasRef,
                        className: `w-full h-[280px] px-4 py-3 border border-purple-300 rounded-lg text-sm leading-relaxed bg-white cursor-text whitespace-pre-wrap overflow-y-auto hover:border-purple-500 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all duration-200 ${isPreparingExplanations || isSmartSelecting ? 'blur-[0.5px]' : isProcessingImage ? 'blur-sm' : ''}`,
                        onDoubleClick: handleDoubleClick
                      }, renderHighlightedText()) : React.createElement('textarea', {
                        ref: textCanvasRef,
                        placeholder: 'Paste your text here (Don\'t write manually)...',
                        value: text,
                        onChange: (e) => setText((e.target as HTMLTextAreaElement).value),
                        className: `w-full h-[280px] px-4 py-3 border border-purple-300 rounded-lg text-sm leading-relaxed bg-white cursor-text whitespace-pre-wrap resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 hover:border-purple-500 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all duration-200 ${isPreparingExplanations || isSmartSelecting ? 'blur-[0.5px]' : isProcessingImage ? 'blur-sm' : ''}`,
                        onDoubleClick: handleDoubleClick
                      }),
                      
                      // Get Power Words button - only show when text is empty
                      !text.trim() && React.createElement('button', {
                        onClick: isLoadingPowerWords ? stopPowerWords : handlePowerWords,
                        className: `absolute bottom-4 right-4 inline-flex items-center justify-center rounded-md font-medium h-6 px-2 text-xs transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${
                          isLoadingPowerWords 
                            ? 'bg-red-500 text-white hover:bg-red-600' 
                            : 'vibgyor-gradient text-white hover:shadow-xl'
                        }`
                      },
                        isLoadingPowerWords 
                          ? React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'white', strokeWidth: '2', viewBox: '0 0 24 24' },
                              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }),
                              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M9 9h6v6H9z' })
                            )
                          : React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'white', strokeWidth: '2', viewBox: '0 0 24 24' },
                              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 001-1V4z' })
                            ),
                        isLoadingPowerWords ? 'Stop' : 'Get Power Words'
                      ),
                      
                      // Power Words loading overlay for text canvas
                      isLoadingPowerWords && React.createElement('div', { 
                        className: 'absolute inset-0 bg-white bg-opacity-80 backdrop-blur-md flex items-center justify-center z-10 rounded-lg'
                      },
                        React.createElement('div', { className: 'text-center' },
                          React.createElement('div', { className: 'mb-6' },
                            // Solid purple animated icon
                            React.createElement('div', { className: 'relative w-16 h-16 mx-auto' },
                              // Main solid purple circle with pulse animation
                              React.createElement('div', { 
                                className: 'absolute inset-0 bg-purple-500 rounded-full animate-pulse',
                                style: { animationDuration: '1.5s' }
                              }),
                              // Inner rotating element with creative dynamic icon
                              React.createElement('div', { 
                                className: 'absolute inset-2 bg-purple-600 rounded-full flex items-center justify-center animate-spin',
                                style: { animationDuration: '2s' }
                              },
                                React.createElement('svg', { 
                                  className: 'w-8 h-8 text-white', 
                                  fill: 'currentColor', 
                                  viewBox: '0 0 24 24' 
                                },
                                  // Creative brain/lightbulb icon for difficult words
                                  React.createElement('path', { 
                                    d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' 
                                  }),
                                  // Additional sparkle elements
                                  React.createElement('circle', { 
                                    cx: '8', 
                                    cy: '8', 
                                    r: '1', 
                                    fill: 'white', 
                                    opacity: '0.8' 
                                  }),
                                  React.createElement('circle', { 
                                    cx: '16', 
                                    cy: '8', 
                                    r: '1', 
                                    fill: 'white', 
                                    opacity: '0.6' 
                                  }),
                                  React.createElement('circle', { 
                                    cx: '12', 
                                    cy: '16', 
                                    r: '0.8', 
                                    fill: 'white', 
                                    opacity: '0.7' 
                                  })
                                )
                              ),
                              // Outer ring with different animation
                              React.createElement('div', { 
                                className: 'absolute -inset-1 border-4 border-purple-400 rounded-full animate-ping',
                                style: { animationDuration: '3s' }
                              })
                            )
                          ),
                          React.createElement('h3', { className: 'text-xl font-semibold text-purple-700 mb-3' }, 'Preparing a paragraph of difficult words'),
                          React.createElement('div', { className: 'flex items-center justify-center mt-4' },
                            React.createElement('div', { className: 'flex space-x-2' },
                              React.createElement('div', { 
                                className: 'w-3 h-3 bg-purple-500 rounded-full animate-bounce',
                                style: { animationDelay: '0s' }
                              }),
                              React.createElement('div', { 
                                className: 'w-3 h-3 bg-purple-500 rounded-full animate-bounce',
                                style: { animationDelay: '0.2s' }
                              }),
                              React.createElement('div', { 
                                className: 'w-3 h-3 bg-purple-500 rounded-full animate-bounce',
                                style: { animationDelay: '0.4s' }
                              })
                            )
                          ),
                          React.createElement('div', { className: 'mt-6' },
                            React.createElement('button', {
                              onClick: stopPowerWords,
                              className: 'inline-flex items-center justify-center rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 h-8 px-4 text-sm transition-all duration-200 transform hover:scale-[1.02]'
                            },
                              React.createElement('svg', { className: 'w-4 h-4 mr-2', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }),
                                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9 9h6v6H9z' })
                              ),
                              'Stop'
                            )
                          )
                        )
                      ),

                      // Enhanced Image Processing Overlay for text canvas
                      isProcessingImage && React.createElement('div', { 
                        className: 'absolute inset-0 bg-white bg-opacity-80 backdrop-blur-md flex items-center justify-center z-10 rounded-lg'
                      },
                        React.createElement('div', { className: 'text-center' },
                          React.createElement('div', { className: 'mb-6' },
                            // Solid purple animated icon
                            React.createElement('div', { className: 'relative w-16 h-16 mx-auto' },
                              // Main solid purple circle with pulse animation
                              React.createElement('div', { 
                                className: 'absolute inset-0 bg-purple-500 rounded-full animate-pulse',
                                style: { animationDuration: '1.5s' }
                              }),
                              // Inner rotating element with dynamic icon
                              React.createElement('div', { 
                                className: 'absolute inset-2 bg-purple-600 rounded-full flex items-center justify-center animate-spin',
                                style: { animationDuration: '2s' }
                              },
                                getProcessingIcon()
                              ),
                              // Outer ring with different animation
                              React.createElement('div', { 
                                className: 'absolute -inset-1 border-4 border-purple-400 rounded-full animate-ping',
                                style: { animationDuration: '3s' }
                              })
                            )
                          ),
                          React.createElement('h3', { className: 'text-xl font-semibold text-purple-700 mb-3' }, getProcessingMessage()),
                          React.createElement('div', { className: 'flex items-center justify-center mt-4' },
                            React.createElement('div', { className: 'flex space-x-2' },
                              React.createElement('div', { 
                                className: 'w-3 h-3 bg-purple-500 rounded-full animate-bounce',
                                style: { animationDelay: '0s' }
                              }),
                              React.createElement('div', { 
                                className: 'w-3 h-3 bg-purple-500 rounded-full animate-bounce',
                                style: { animationDelay: '0.2s' }
                              }),
                              React.createElement('div', { 
                                className: 'w-3 h-3 bg-purple-500 rounded-full animate-bounce',
                                style: { animationDelay: '0.4s' }
                              })
                            )
                          )
                        )
                      )
                    )
                  : React.createElement('div', { className: 'relative' },
                      React.createElement('textarea', {
                        placeholder: 'Paste your text here (Dont write manually)...',
                        value: text,
                        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          if (textExplanations.length === 0) {
                            const newText = e.target.value;
                            if (validateWordLimit(newText)) {
                              setText(newText);
                            }
                          }
                        },
                        className: `w-full h-[280px] px-4 py-3 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 hover:border-purple-500 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] resize-none overflow-y-auto transition-all duration-200 ${isPreparingExplanations || isSmartSelecting || isProcessingImage ? 'blur-[0.5px]' : ''}`,
                        disabled: textExplanations.length > 0
                      }),
                      
                      // Image Processing Overlay for textarea
                      isProcessingImage && React.createElement('div', { className: 'absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg' },
                        React.createElement('div', { className: 'text-center' },
                          React.createElement('div', { className: 'mb-4' },
                            React.createElement('svg', { 
                              className: 'w-16 h-16 text-purple-500 mx-auto animate-wireframe', 
                              fill: 'none', 
                              stroke: 'currentColor', 
                              strokeWidth: '2',
                              viewBox: '0 0 24 24' 
                            },
                              // Intelligent wireframe icon - document with text lines
                              React.createElement('path', { 
                                strokeLinecap: 'round', 
                                strokeLinejoin: 'round', 
                                d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' 
                              }),
                              // Animated scanning lines
                              React.createElement('path', { 
                                strokeLinecap: 'round', 
                                strokeLinejoin: 'round', 
                                strokeWidth: 1.5, 
                                d: 'M3 8h18M3 12h18M3 16h18',
                                className: 'opacity-30'
                              })
                            )
                          ),
                          React.createElement('h3', { className: 'text-lg font-medium text-purple-600 mb-2' }, 'Generating text from the image'),
                          React.createElement('div', { className: 'flex items-center justify-center mt-2' },
                            React.createElement('div', { className: 'flex space-x-1' },
                              React.createElement('div', { className: 'w-2 h-2 bg-purple-500 rounded-full animate-bounce' }),
                              React.createElement('div', { className: 'w-2 h-2 bg-purple-500 rounded-full animate-bounce', style: { animationDelay: '0.1s' } }),
                              React.createElement('div', { className: 'w-2 h-2 bg-purple-500 rounded-full animate-bounce', style: { animationDelay: '0.2s' } })
                            )
                          )
                        )
                      ),
                      
                      // Processing overlay for Power Words Pack
                      isLoading && React.createElement('div', { className: 'absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10' },
                        React.createElement('div', { className: 'text-center' },
                          React.createElement('div', { className: 'mb-4' },
                            React.createElement('svg', { 
                              className: 'w-16 h-16 text-purple-500 mx-auto animate-wireframe', 
                              fill: 'none', 
                              stroke: 'currentColor', 
                              strokeWidth: '2',
                              viewBox: '0 0 24 24' 
                            },
                              React.createElement('path', { 
                                strokeLinecap: 'round', 
                                strokeLinejoin: 'round', 
                                d: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 001-1V4z' 
                              })
                            )
                          ),
                          React.createElement('p', { className: 'text-purple-600 font-semibold text-base' }, 'Preparing a challenging paragraph for you')
                        )
                      ),

                    ),

                
                // Smart Select Overlay
                isSmartSelecting && React.createElement('div', { className: 'absolute top-0 left-0 right-0 h-[280px] bg-white bg-opacity-80 backdrop-blur-md flex items-center justify-center z-10 rounded-lg' },
                  React.createElement('div', { className: 'text-center' },
                    React.createElement('div', { className: 'mb-6' },
                      // Dynamic solid purple creative icon
                      React.createElement('div', { className: 'relative w-16 h-16 mx-auto' },
                        // Main solid purple circle with pulse animation
                        React.createElement('div', {
                          className: 'absolute inset-0 bg-purple-500 rounded-full animate-pulse',
                          style: { animationDuration: '1.5s' }
                        }),
                        // Inner rotating element with creative dynamic icon
                        React.createElement('div', {
                          className: 'absolute inset-2 bg-purple-600 rounded-full flex items-center justify-center animate-spin',
                          style: { animationDuration: '2s' }
                        },
                          React.createElement('svg', {
                            className: 'w-8 h-8 text-white',
                            fill: 'currentColor',
                            viewBox: '0 0 24 24'
                          },
                            // Creative brain/analysis icon for difficult words
                            React.createElement('path', {
                              d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
                            }),
                            // Additional sparkle elements for analysis
                            React.createElement('circle', {
                              cx: '8',
                              cy: '8',
                              r: '1',
                              fill: 'white',
                              opacity: '0.8'
                            }),
                            React.createElement('circle', {
                              cx: '16',
                              cy: '8',
                              r: '1',
                              fill: 'white',
                              opacity: '0.6'
                            }),
                            React.createElement('circle', {
                              cx: '12',
                              cy: '16',
                              r: '0.8',
                              fill: 'white',
                              opacity: '0.7'
                            }),
                            // Analysis lines
                            React.createElement('path', {
                              d: 'M6 10h2M6 12h4M6 14h3',
                              stroke: 'white',
                              strokeWidth: '1',
                              strokeLinecap: 'round',
                              opacity: '0.8'
                            })
                          )
                        ),
                        // Outer ring with different animation
                        React.createElement('div', {
                          className: 'absolute -inset-1 border-4 border-purple-400 rounded-full animate-ping',
                          style: { animationDuration: '3s' }
                        })
                      )
                    ),
                    React.createElement('h3', { className: 'text-xl font-semibold text-purple-700 mb-3' }, 'Analyzing text for difficult words'),
                    React.createElement('div', { className: 'flex items-center justify-center mt-4' },
                      React.createElement('div', { className: 'flex space-x-2' },
                        React.createElement('div', {
                          className: 'w-3 h-3 bg-purple-500 rounded-full animate-bounce',
                          style: { animationDelay: '0s' }
                        }),
                        React.createElement('div', {
                          className: 'w-3 h-3 bg-purple-500 rounded-full animate-bounce',
                          style: { animationDelay: '0.2s' }
                        }),
                        React.createElement('div', {
                          className: 'w-3 h-3 bg-purple-500 rounded-full animate-bounce',
                          style: { animationDelay: '0.4s' }
                        })
                      )
                    )
                  )
                ),


                // Smart Explain Overlay - only covers text canvas
                getCurrentTabLoadingStates().isSmartExplaining && React.createElement('div', { className: 'absolute top-0 left-0 right-0 h-[280px] bg-white bg-opacity-80 backdrop-blur-md flex items-center justify-center z-10 rounded-lg' },
                  React.createElement('div', { className: 'loading-content' },
                    // Smart selecting phase - appears suddenly
                    getCurrentTabLoadingStates().smartExplainPhase === 'selecting' && React.createElement('div', { className: 'fade-in' },
                      React.createElement('div', { className: 'loading-icon' },
                        React.createElement('svg', { 
                          className: 'w-full h-full text-purple-500 jumping-bulb-icon', 
                          fill: 'currentColor', 
                          viewBox: '0 0 24 24' 
                        },
                          React.createElement('path', { 
                            d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2h-2c0 .55-.45 1-1 1s-1-.45-1-1H8c0 .55-.45 1-1 1s-1-.45-1-1H4c0 1.1.9 2 2 2 4.41 0 8-3.59 8-8s-3.59-8-8-8z' 
                          }),
                          React.createElement('path', { 
                            d: 'M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z' 
                          }),
                          React.createElement('path', { 
                            d: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z' 
                          }),
                          React.createElement('path', { 
                            d: 'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z' 
                          }),
                          React.createElement('circle', { 
                            cx: '12', 
                            cy: '12', 
                            r: '1.5', 
                            fill: 'white',
                            opacity: '0.9'
                          })
                        )
                      ),
                      React.createElement('h3', { className: 'loading-title' }, 'Picking a few difficult words for you'),
                      React.createElement('div', { className: 'pulse-dots' },
                        React.createElement('span', {}, '●'),
                        React.createElement('span', {}, '●'),
                        React.createElement('span', {}, '●')
                      )
                    ),
                    
                    // Explaining phase with slide animation
                    getCurrentTabLoadingStates().smartExplainPhase === 'explaining' && React.createElement('div', { className: 'slide-in-from-right' },
                      React.createElement('div', { className: 'loading-icon' },
                        React.createElement('svg', { 
                          className: 'w-full h-full text-purple-500 dynamic-purple-icon', 
                          fill: 'currentColor', 
                          viewBox: '0 0 24 24' 
                        },
                          React.createElement('path', { 
                            d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' 
                          }),
                          React.createElement('circle', { 
                            cx: '12', 
                            cy: '12', 
                            r: '3', 
                            fill: 'none', 
                            stroke: 'currentColor', 
                            strokeWidth: '2',
                            opacity: '0.6'
                          }),
                          React.createElement('path', { 
                            d: 'M12 1v6m0 6v6m11-7h-6m-6 0H1', 
                            stroke: 'currentColor', 
                            strokeWidth: '1.5', 
                            strokeLinecap: 'round',
                            opacity: '0.4'
                          })
                        )
                      ),
                      React.createElement('h3', { className: 'loading-title' }, 'Preparing meanings and explanations'),
                      React.createElement('div', { className: 'pulse-dots' },
                        React.createElement('span', {}, '●'),
                        React.createElement('span', {}, '●'),
                        React.createElement('span', {}, '●')
                      )
                    )
                  )
                ),
                
                // Preparing Explanations Overlay
                getCurrentTabLoadingStates().isPreparingExplanations && React.createElement('div', { className: 'absolute top-0 left-0 right-0 h-[280px] bg-white bg-opacity-80 backdrop-blur-md flex items-center justify-center z-10 rounded-lg' },
                  React.createElement('div', { className: 'loading-content' },
                    React.createElement('div', { className: 'loading-icon' },
                      React.createElement('svg', { 
                        className: 'w-full h-full text-purple-500 dynamic-purple-icon', 
                        fill: 'currentColor', 
                        viewBox: '0 0 24 24' 
                      },
                        React.createElement('path', { 
                          d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' 
                        }),
                        React.createElement('circle', { 
                          cx: '12', 
                          cy: '12', 
                          r: '3', 
                          fill: 'none', 
                          stroke: 'currentColor', 
                          strokeWidth: '2',
                          opacity: '0.6'
                        }),
                        React.createElement('path', { 
                          d: 'M12 1v6m0 6v6m11-7h-6m-6 0H1', 
                          stroke: 'currentColor', 
                          strokeWidth: '1.5', 
                          strokeLinecap: 'round',
                          opacity: '0.4'
                        })
                      )
                    ),
                    React.createElement('h3', { className: 'loading-title' }, 'Preparing meanings and explanations'),
                    React.createElement('div', { className: 'pulse-dots' },
                      React.createElement('span', {}, '●'),
                      React.createElement('span', {}, '●'),
                      React.createElement('span', {}, '●')
                    )
                  )
                )
              ),

              // Action Buttons - Three Groups Layout
              React.createElement('div', { className: 'flex justify-between items-start mt-auto pt-3' },
                // Left Button Group - Clear Buttons
                React.createElement('div', { className: 'flex flex-col space-y-3' },
                  text.trim() && !getCurrentTabLoadingStates().isSmartExplaining && !getCurrentTabLoadingStates().isExplaining && !isSmartSelecting && React.createElement('button', {
                    onClick: handleClearText,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium border border-red-300 text-red-600 hover:bg-red-50 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                  }, 
                    React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
                    ),
                    'Clear Text'
                  ),
                  
                  textExplanations.length > 0 && !getCurrentTabLoadingStates().isSmartExplaining && !getCurrentTabLoadingStates().isExplaining && !isSmartSelecting && React.createElement('button', {
                    onClick: handleClearTextExplanations,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium border border-red-300 text-red-600 hover:bg-red-50 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                  }, 
                    React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
                    ),
                    'Clear Explanations'
                  )
                ),
                
                // Middle Button Group - Smart Select and Unselect
                React.createElement('div', { className: 'flex flex-col space-y-3' },
                  (text.trim() && !isSmartSelecting && !getCurrentTabLoadingStates().isSmartExplaining && !getCurrentTabLoadingStates().isExplaining && (displayedTab === 'text' ? textExplanations.length === 0 : wordsExplanations.length === 0)) && React.createElement('button', {
                    onClick: handleSmartSelectWords,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium text-white hover:opacity-90 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]',
                    style: { backgroundColor: '#9C5EEB' }
                  }, 
                    React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' })
                    ),
                    isSmartSelecting ? 'Selecting...' : 'Auto select hard words'
                  ),
                  
                  selectedWords.length > 0 && !getCurrentTabLoadingStates().isExplaining && !getCurrentTabLoadingStates().isSmartExplaining && React.createElement('button', {
                    onClick: handleUnselectAllWords,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                  }, 
                    React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M6 18L18 6M6 6l12 12' })
                    ),
                    'Unselect all words'
                  )
                ),
                
                // Right Button Group - Explain Buttons
                React.createElement('div', { className: 'flex flex-col space-y-3' },
                  // Dynamic layout based on whether words are selected
                  (selectedWords.length > 0 || manualWords.length > 0) ? 
                    // When words are selected: vertical layout (stacked)
                    React.createElement('div', { className: 'flex flex-col space-y-2' },
                      // Explain button - only show when there are words to explain and not smart selecting
                      selectedWords.length > 0 && !getCurrentTabLoadingStates().isExplaining && !getCurrentTabLoadingStates().isSmartExplaining && !isSmartSelecting && React.createElement('button', {
                        onClick: handleExplainWords,
                        className: 'inline-flex items-center justify-center rounded-lg font-medium bg-primary-500 text-white hover:bg-primary-600 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                      },
                        React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
                        ),
                        `Get ${selectedWords.length} Contextual meaning${selectedWords.length !== 1 ? 's' : ''}`
                      ),
                      
                      // Smart explain button
                      text.trim() && !getCurrentTabLoadingStates().isSmartExplaining && !getCurrentTabLoadingStates().isExplaining && !isSmartSelecting && (displayedTab === 'text' ? textExplanations.length === 0 : wordsExplanations.length === 0) && React.createElement('button', {
                        onClick: handleSmartExplain,
                        className: 'vibgyor-gradient inline-flex items-center justify-center rounded-lg font-medium text-white h-8 px-3 text-xs transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl relative overflow-hidden'
                      },
                        React.createElement('div', { className: 'absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300' }),
                        React.createElement('svg', { className: 'w-3 h-3 mr-1 relative z-10', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' }),
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M13 10V3L4 14h7v7l9-11h-7z' })
                        ),
                        React.createElement('span', { className: 'relative z-10' }, getCurrentTabLoadingStates().isSmartExplaining ? 'Auto explaining hard words...' : 'Auto explain hard words')
                      )
                    ) :
                    // When no words selected: horizontal layout (side by side)
                    React.createElement('div', { className: 'flex space-x-2' },
                      // Smart explain button
                      text.trim() && !getCurrentTabLoadingStates().isSmartExplaining && !getCurrentTabLoadingStates().isExplaining && !isSmartSelecting && (displayedTab === 'text' ? textExplanations.length === 0 : wordsExplanations.length === 0) && React.createElement('button', {
                        onClick: handleSmartExplain,
                        className: 'vibgyor-gradient inline-flex items-center justify-center rounded-lg font-medium text-white h-8 px-3 text-xs transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl relative overflow-hidden'
                      },
                        React.createElement('div', { className: 'absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300' }),
                        React.createElement('svg', { className: 'w-3 h-3 mr-1 relative z-10', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' }),
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M13 10V3L4 14h7v7l9-11h-7z' })
                        ),
                        React.createElement('span', { className: 'relative z-10' }, getCurrentTabLoadingStates().isSmartExplaining ? 'Auto explaining hard words...' : 'Auto explain hard words')
                      )
                    ),
                  
                  // Stop button (show when streaming, smart explaining, or smart selecting) - positioned on the right
                  (getCurrentTabLoadingStates().isStreaming || getCurrentTabLoadingStates().isSmartExplaining || isSmartSelecting) && React.createElement('button', {
                    onClick: handleStopStreaming,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                  }, 
                    React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }),
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9 9h6v6H9z' })
                    ),
                    'Stop'
                  )
                )
              ),

              // Instructions Panel - COMMENTED OUT
              // React.createElement('div', { className: 'mt-8 p-4' },
              //   React.createElement('div', { className: 'flex items-start space-x-2' },
              //     React.createElement('div', { className: 'p-1 bg-purple-100 rounded' },
              //       React.createElement('svg', { className: 'h-4 w-4 text-purple-600', fill: 'currentColor', viewBox: '0 0 20 20' },
              //         React.createElement('path', { fillRule: 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z', clipRule: 'evenodd' })
              //       )
              //     ),
              //     React.createElement('div', {},
              //       React.createElement('h4', { className: 'text-sm font-medium text-gray-700 mb-2' }, 'Instructions'),
              //       React.createElement('ul', { className: 'text-xs text-gray-600 space-y-1' },
              //         React.createElement('li', {}, '• Click on Smart explain to explain important words'),
              //         React.createElement('li', {}, '• Click on Smart select words to auto select important words'),
              //         React.createElement('li', {}, '• Double click / double tap to manually select word'),
              //         React.createElement('li', {}, '• Words with purple are selected and not explained yet'),
              //         React.createElement('li', {}, '• Words with green are already explained'),
              //         React.createElement('li', {}, '• Words with yellow are search results')
              //       )
              //     )
              //   )
              // )
            ),

            // Words Tab Content
            displayedTab === 'words' && React.createElement('div', { className: `h-[384px] flex flex-col tab-content ${activeTab === 'words' ? 'animate-tab-fade-in' : 'animate-tab-fade-out'}` },
              // Input section
              React.createElement('div', { className: 'flex space-x-2 mb-4' },
                React.createElement('input', {
                  type: 'text',
                  placeholder: 'Type a word and press Enter...',
                  value: manualWordInput,
                  onChange: (e) => setManualWordInput(e.target.value),
                  onKeyPress: (e) => {
                    if (e.key === 'Enter' && manualWordInput.trim()) {
                      handleAddWord(manualWordInput);
                      setManualWordInput('');
                    }
                  },
                  className: 'flex-1 h-10 px-4 py-2 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 hover:border-purple-500 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all duration-200'
                }),
                React.createElement('button', {
                  onClick: () => {
                    handleAddWord(manualWordInput);
                    setManualWordInput('');
                  },
                  disabled: !manualWordInput.trim() || manualWords.includes(manualWordInput.trim().toLowerCase()),
                  className: 'inline-flex items-center justify-center rounded-lg font-medium bg-primary-500 text-white hover:bg-primary-600 h-10 px-4 text-sm transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50'
                }, 'Add')
              ),
              
              // Instruction for clicking on green words - only show when there are explained words
              wordsExplanations.length > 0 && React.createElement('div', { 
                className: 'text-xs text-purple-600 italic flex items-center mb-4' 
              }, 
                React.createElement('svg', { className: 'w-3 h-3 mr-2 text-green-500', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
                ),
                React.createElement('span', {}, 'Click on the word with '),
                React.createElement('span', { className: 'bg-green-200 border border-green-300 px-1 rounded' }, 'green color'),
                React.createElement('span', {}, ' background to view explanation')
              ),
              
              // Word display area with scroll - takes up remaining space (with relative positioning for overlay)
              React.createElement('div', { className: 'flex-1 overflow-y-auto mb-4 relative' },
                // Word content
                manualWords.length > 0 
                  ? React.createElement('div', { className: 'flex flex-wrap gap-2' },
                      manualWords.map(word => {
                        const isExplained = wordsExplainedWordNames.has(word);
                        return React.createElement('div', { 
                          key: word, 
                          className: `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 transform ${
                            isExplained 
                              ? 'bg-green-100 border border-green-300 text-green-700 cursor-pointer hover:bg-green-200 hover:border-green-400 hover:scale-105 hover:shadow-md' 
                              : 'bg-purple-100 border border-purple-300 text-purple-700 hover:border-purple-400 hover:scale-105 hover:shadow-md'
                          }`,
                          onClick: isExplained ? () => handleExplainedWordClick(word) : undefined
                        },
                          word,
                          // Only show delete button for unselected words (not explained words)
                          !isExplained && React.createElement('button', {
                            onClick: (e) => {
                              e.stopPropagation(); // Prevent triggering the word click
                              setManualWords(prev => prev.filter(w => w !== word));
                              toast.success(`Word "${word}" removed`);
                            },
                            className: 'w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 hover:shadow-sm ml-1 mr-1 hover:bg-purple-200'
                          },
                            React.createElement('svg', {
                              className: 'w-4 h-4',
                              fill: '#8b5cf6',
                              viewBox: '0 0 24 24'
                            },
                              React.createElement('path', {
                                d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z'
                              })
                            )
                          )
                        );
                      })
                    )
                  : React.createElement('div', { className: 'text-center py-8 text-gray-500' },
                      React.createElement('div', { className: 'flex justify-center mb-4' },
                        React.createElement('svg', { 
                          className: 'h-12 w-12 text-purple-500', 
                          fill: 'none', 
                          stroke: 'currentColor', 
                          viewBox: '0 0 24 24' 
                        },
                          React.createElement('path', { 
                            strokeLinecap: 'round', 
                            strokeLinejoin: 'round', 
                            strokeWidth: 1.5, 
                            d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' 
                          })
                        )
                      ),
                      React.createElement('p', {}, 'No words added yet')
                    ),

                // Preparing Explanations Overlay for Words Tab - only covers the word display area
                getCurrentTabLoadingStates().isPreparingExplanations && React.createElement('div', { className: 'absolute top-0 left-0 right-0 h-[280px] bg-white bg-opacity-80 backdrop-blur-md flex items-center justify-center z-10 rounded-lg' },
                  React.createElement('div', { className: 'loading-content' },
                    React.createElement('div', { className: 'loading-icon' },
                      React.createElement('svg', { 
                        className: 'w-full h-full text-purple-500 dynamic-purple-icon', 
                        fill: 'currentColor', 
                        viewBox: '0 0 24 24' 
                      },
                        React.createElement('path', { 
                          d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' 
                        }),
                        React.createElement('circle', { 
                          cx: '12', 
                          cy: '12', 
                          r: '3', 
                          fill: 'none', 
                          stroke: 'currentColor', 
                          strokeWidth: '2',
                          opacity: '0.6'
                        }),
                        React.createElement('path', { 
                          d: 'M12 1v6m0 6v6m11-7h-6m-6 0H1', 
                          stroke: 'currentColor', 
                          strokeWidth: '1.5', 
                          strokeLinecap: 'round',
                          opacity: '0.4'
                        })
                      )
                    ),
                    React.createElement('h3', { className: 'loading-title' }, 'Preparing meanings and explanations'),
                    React.createElement('div', { className: 'pulse-dots' },
                      React.createElement('span', {}, '●'),
                      React.createElement('span', {}, '●'),
                      React.createElement('span', {}, '●')
                    )
                  )
                )
              ),

              // Action buttons at the bottom
              (manualWords.length > 0 || wordsExplanations.length > 0) && React.createElement('div', { className: 'mt-auto' },
                // Button row with proper layout: Clear All (left) -> Explain (right) -> Stop (far right)
                React.createElement('div', { className: 'flex justify-between items-center' },
                  // Left side: Clear all explanations button - hide during explain process
                  !getCurrentTabLoadingStates().isExplaining && !getCurrentTabLoadingStates().isSmartExplaining && React.createElement('button', {
                    onClick: handleClearWordsExplanations,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium border border-red-300 text-red-600 hover:bg-red-50 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                  }, 
                    React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
                    ),
                    'Clear all explanations'
                  ),
                  
                  // Center: Explain button (when not explaining)
                  !getCurrentTabLoadingStates().isExplaining && !getCurrentTabLoadingStates().isSmartExplaining && manualWords.filter(word => !wordsExplainedWordNames.has(word)).length > 0 && React.createElement('button', {
                    onClick: handleExplainWords,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium bg-primary-500 text-white hover:bg-primary-600 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                  },
                    React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
                    ),
                    `Get meanings and examples of ${manualWords.filter(word => !wordsExplainedWordNames.has(word)).length} word${manualWords.filter(word => !wordsExplainedWordNames.has(word)).length > 1 ? 's' : ''}`
                  ),
                  
                  // Right side: Stop button (when explaining) - always on far right
                  (getCurrentTabLoadingStates().isStreaming || getCurrentTabLoadingStates().isSmartExplaining) && React.createElement('button', {
                    onClick: handleStopStreaming,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                  }, 'Stop')
                )
              )
            )
          )
        ),

        // Right Side - Explanations Card (50%) - Only show for Text and Words tabs
        displayedTab !== 'image' && React.createElement('div', { className: 'w-1/2' },
          React.createElement('div', { className: 'bg-white rounded-2xl shadow-lg shadow-purple-100 p-6 h-[600px] flex flex-col' },
            // Header
            React.createElement('div', { className: 'bg-purple-500 rounded-lg h-10 flex items-center justify-center mb-6' },
              React.createElement('h3', { className: 'text-lg font-normal text-white' }, displayedTab === 'text' ? 'Contextual Explanations' : 'Explanations')
            ),

            // Text/Words tab content - explanations
              React.createElement(React.Fragment, {},
                // Sorting tab group (above search bar) - show for both Text and Words tabs
                sortedExplanations.length > 0 && React.createElement('div', { className: 'mb-4' },
                  React.createElement('div', { className: 'inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 w-full' },
                    React.createElement('button', {
                      onClick: () => setSortBy('complexity'),
                      className: `flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-all duration-200 ${sortBy === 'complexity' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-purple-700'}`
                    }, 'Original order'),
                    React.createElement('button', {
                      onClick: () => setSortBy('alphabetical'),
                      className: `flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-all duration-200 ${sortBy === 'alphabetical' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-purple-700'}`
                    }, 'Alphabetical order')
                  )
                ),

                // Search box for explanations (only show when there are explanations)
                sortedExplanations.length > 0 && React.createElement('div', { className: 'mb-4' },
                  React.createElement('input', {
                    type: 'text',
                    placeholder: 'Search word ...',
                    value: explanationSearchTerm,
                    onChange: (e) => setExplanationSearchTerm(e.target.value),
                    className: 'w-full h-9 px-3 py-2 border border-purple-300 rounded-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 hover:border-purple-500 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all duration-200'
                  })
                ),


            
            // Scrollable Explanation Cards Container
            React.createElement('div', { 
              ref: explanationSectionRef,
              key: explanationKey,
              className: 'flex-1 overflow-y-auto space-y-4' 
            },
              
              
              sortedExplanations.length > 0 
                ? sortedExplanations.map((explanation, index) => {
                    const isExpanded = expandedCards.has(explanation.word);
                    const isLoadingMoreExamples = loadingMore.has(explanation.word);
                    const isNewCard = newCardAnimations.has(explanation.word);
                    
                    return React.createElement('div', { 
                      key: index, 
                      'data-word': explanation.word,
                      className: `bg-purple-100 rounded-xl overflow-hidden transition-all duration-300 ease-in-out hover:bg-purple-150 mr-2 ${
                        isNewCard 
                          ? 'animate-smooth-appear' 
                          : ''
                      }` 
                    },
                      // Card Header (always visible)
                      React.createElement('div', {
                        className: 'px-4 py-2 cursor-pointer hover:bg-purple-200 transition-all duration-200 ease-in-out',
                        onClick: () => toggleCardExpansion(explanation.word)
                      },
                        React.createElement('div', { className: 'flex items-center justify-between' },
                          React.createElement('div', { className: 'flex items-center space-x-3' },
                            // Delete button - positioned left of word label
                            React.createElement('button', {
                              onClick: (e) => {
                                e.stopPropagation(); // Prevent triggering the card expansion
                                deleteWordEfficiently(explanation.word, displayedTab as 'text' | 'words');
                                toast.success(`Word "${explanation.word}" and its explanation removed`);
                              },
                              className: 'w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-red-100 ml-1 mr-2'
                            },
                              React.createElement('svg', {
                                className: 'w-4 h-4',
                                fill: '#dc2626',
                                viewBox: '0 0 24 24'
                              },
                                React.createElement('path', {
                                  d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z'
                                })
                              )
                            ),
                            // Word label
                            React.createElement('span', {
                              className: 'font-medium text-purple-700'
                            }, explanation.word)
                          ),
                          React.createElement('div', { className: 'flex items-center space-x-2' },
                            // Expand/collapse arrow
                            React.createElement('span', { className: 'text-xs text-purple-600' },
                              React.createElement('svg', { 
                                className: `h-4 w-4 transition-all duration-300 ease-in-out transform ${isExpanded ? 'rotate-180 scale-110' : 'rotate-0 scale-100'}`, 
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
                      React.createElement('div', { 
                        className: `overflow-hidden transition-all ${
                          isExpanded 
                            ? 'duration-500 ease-out max-h-64 opacity-100 transform translate-y-0' 
                            : 'duration-300 ease-in-out max-h-0 opacity-0 transform -translate-y-2'
                        }`
                      },
                        React.createElement('div', { className: 'px-3 py-2 bg-white border border-purple-200 rounded-lg mx-0.5 my-0.5' },
                          React.createElement('p', { className: 'text-sm text-gray-700 mb-2 mt-2' }, explanation.meaning),
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
                          React.createElement('div', { className: 'flex justify-end mt-3 mb-2' },
                            React.createElement('button', {
                              onClick: () => handleGetMoreExplanations(explanation),
                              disabled: isLoadingMoreExamples,
                              className: 'inline-flex items-center text-xs bg-purple-500 text-white h-6 px-2 rounded-md hover:bg-purple-600 disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100'
                            },
                              isLoadingMoreExamples && React.createElement('div', { className: 'animate-spin rounded-full h-3 w-3 border-b border-white mr-1' }),
                              isLoadingMoreExamples ? 'Loading...' : 'View more examples'
                            )
                          )
                        )
                      )
                    );
                  })
                : React.createElement('div', { className: 'text-center py-12 text-gray-500' },
                    React.createElement('div', { className: 'flex justify-center mb-4' },
                      React.createElement('svg', { 
                        className: 'h-12 w-12 text-purple-500', 
                        fill: 'none', 
                        stroke: 'currentColor', 
                        viewBox: '0 0 24 24' 
                      },
                        React.createElement('path', { 
                          strokeLinecap: 'round', 
                          strokeLinejoin: 'round', 
                          strokeWidth: 1.5, 
                          d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' 
                        })
                      )
                    ),
                    React.createElement('h3', { className: 'text-lg font-medium text-gray-900 mb-2' }, 
                      displayedTab === 'text' 
                        ? 'No contextual meanings and explanations yet'
                        : 'No word meanings and explanations yet'
                    ),
                    // React.createElement('p', { className: 'text-sm text-gray-600' }, 
                    //   displayedTab === 'text' 
                    //     ? 'Paste text and get AI-powered explanations'
                    //     : 'Enter words and get AI-powered explanations'
                    // )
                  )
            ),

            // Bottom status indicators
            React.createElement('div', { className: 'mt-auto' },
              // Streaming indicator
              getCurrentTabLoadingStates().isStreaming && React.createElement('div', { className: 'flex items-center justify-center mb-4' },
                React.createElement('div', { className: 'flex items-center space-x-2 text-purple-600' },
                  React.createElement('div', { className: 'animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500' }),
                  React.createElement('span', { className: 'text-sm' }, 'Generating explanations...')
                )
              ),
              

              // Completion status
              getCurrentTabLoadingStates().isCompleted && React.createElement('div', { className: 'flex items-center justify-center mt-4 mb-1' },
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
      )
    ),

    // Crop Canvas Modal
    showCropCanvas && React.createElement('div', { 
      className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50' 
    },
      React.createElement('div', { 
        className: 'bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden' 
      },
        // Header
        React.createElement('div', { 
          className: 'flex items-center justify-center p-6 border-b border-gray-200 relative' 
        },
          React.createElement('h2', { 
            className: 'text-xl font-semibold text-gray-900' 
          }, 'Crop & Rotate Image'),
          React.createElement('button', {
            onClick: handleCropCancel,
            className: 'absolute right-6 text-gray-400 hover:text-gray-600 transition-colors'
          },
            React.createElement('svg', { className: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M6 18L18 6M6 6l12 12' })
            )
          )
        ),
        
        // Image Preview Area with Crop Overlay
        React.createElement('div', { 
          className: 'p-6 flex-1 flex items-center justify-center bg-gray-50 relative' 
        },
          imagePreviewUrl && React.createElement('div', { 
            className: 'relative max-w-full max-h-96 overflow-hidden rounded-lg shadow-lg' 
          },
            React.createElement('img', {
              src: imagePreviewUrl,
              alt: 'Uploaded image',
              className: 'max-w-full max-h-96 object-contain',
              style: { transform: `rotate(${rotation}deg)` }
            }),
            
            // Crop Overlay
            React.createElement('div', {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background: `linear-gradient(
                  to right,
                  rgba(0,0,0,0.3) 0%,
                  rgba(0,0,0,0.3) ${cropData.x}%,
                  transparent ${cropData.x}%,
                  transparent ${cropData.x + cropData.width}%,
                  rgba(0,0,0,0.3) ${cropData.x + cropData.width}%,
                  rgba(0,0,0,0.3) 100%
                ),
                linear-gradient(
                  to bottom,
                  rgba(0,0,0,0.3) 0%,
                  rgba(0,0,0,0.3) ${cropData.y}%,
                  transparent ${cropData.y}%,
                  transparent ${cropData.y + cropData.height}%,
                  rgba(0,0,0,0.3) ${cropData.y + cropData.height}%,
                  rgba(0,0,0,0.3) 100%
                )`
              }
            }),
            
            // Crop Selection Area
            React.createElement('div', {
              className: 'absolute bg-purple-100 bg-opacity-20 cursor-move shadow-[0_0_20px_rgba(168,85,247,0.6)] marching-ants',
              style: {
                left: `${cropData.x}%`,
                top: `${cropData.y}%`,
                width: `${cropData.width}%`,
                height: `${cropData.height}%`,
                pointerEvents: 'all',
                boxShadow: '0 0 20px rgba(168,85,247,0.6), 0 0 40px rgba(168,85,247,0.4), 0 0 60px rgba(168,85,247,0.2)'
              },
              onMouseDown: handleCropMouseDown,
              onMouseMove: handleCropMouseMove,
              onMouseUp: handleCropMouseUp,
              onMouseLeave: handleCropMouseUp
            },
              // Corner resize handles
              React.createElement('div', {
                className: 'absolute -top-1 -left-1 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-nw-resize animate-pulse shadow-lg',
                style: { zIndex: 30 },
                onMouseDown: (e: React.MouseEvent) => handleCropResize('nw', e)
              }),
              React.createElement('div', {
                className: 'absolute -top-1 -right-1 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-ne-resize animate-pulse shadow-lg',
                style: { zIndex: 30 },
                onMouseDown: (e: React.MouseEvent) => handleCropResize('ne', e)
              }),
              React.createElement('div', {
                className: 'absolute -bottom-1 -left-1 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-sw-resize animate-pulse shadow-lg',
                style: { zIndex: 30 },
                onMouseDown: (e: React.MouseEvent) => handleCropResize('sw', e)
              }),
              React.createElement('div', {
                className: 'absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-se-resize animate-pulse shadow-lg',
                style: { zIndex: 30 },
                onMouseDown: (e: React.MouseEvent) => handleCropResize('se', e)
              }),
              
              
              // Side resize handles
              React.createElement('div', {
                className: 'absolute -top-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-n-resize animate-pulse shadow-lg',
                style: { zIndex: 30 },
                onMouseDown: (e: React.MouseEvent) => handleCropResize('n', e)
              }),
              React.createElement('div', {
                className: 'absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-s-resize animate-pulse shadow-lg',
                style: { zIndex: 30 },
                onMouseDown: (e: React.MouseEvent) => handleCropResize('s', e)
              }),
              React.createElement('div', {
                className: 'absolute -right-1 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-e-resize animate-pulse shadow-lg',
                style: { zIndex: 30 },
                onMouseDown: (e: React.MouseEvent) => handleCropResize('e', e)
              }),
              React.createElement('div', {
                className: 'absolute -left-1 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-w-resize animate-pulse shadow-lg',
                style: { zIndex: 30 },
                onMouseDown: (e: React.MouseEvent) => handleCropResize('w', e)
              })
            )
          )
        ),
        
        // Action Buttons
        React.createElement('div', { 
          className: 'p-6 border-t border-gray-200' 
        },
          // Rotation Controls - Centered
          React.createElement('div', { 
            className: 'flex items-center justify-center mb-4' 
          },
            React.createElement('div', { className: 'flex items-center space-x-2' },
              React.createElement('span', { className: 'text-sm font-medium text-gray-700' }, 'Rotate:'),
              React.createElement('button', {
                onClick: handleRotateLeft,
                className: 'p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors',
                title: 'Rotate Left'
              },
                React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' })
                )
              ),
              React.createElement('button', {
                onClick: handleRotateRight,
                className: 'p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors',
                title: 'Rotate Right'
              },
                React.createElement('svg', { className: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                  React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M20 4v5h-.582m0 0a8.001 8.001 0 00-15.356 2m15.356-2H15m5 11v-5h-.581m0 0a8.003 8.003 0 01-15.357 2m15.357 2H15' })
                )
              ),
              React.createElement('span', { className: 'text-sm text-gray-500 ml-2' }, `${rotation}°`)
            )
          ),
          
          // Bottom Action Buttons
          React.createElement('div', { 
            className: 'flex items-center justify-between' 
          },
            React.createElement('div', { className: 'flex items-center space-x-2' },
              React.createElement('button', {
                onClick: () => setCropData({ x: 0, y: 0, width: 100, height: 100 }),
                className: 'px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-purple-200 transition-all duration-200 transform hover:scale-105'
              }, 'Reset Crop'),
              React.createElement('button', {
                onClick: () => setRotation(0),
                className: 'px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-purple-200 transition-all duration-200 transform hover:scale-105'
              }, 'Reset Rotation')
            ),
            React.createElement('div', { className: 'flex items-center space-x-4' },
              React.createElement('button', {
                onClick: handleCropCancel,
                className: 'px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-purple-200 transition-all duration-200 transform hover:scale-105'
              }, 'Cancel'),
              React.createElement('button', {
                onClick: handleCropExplain,
                disabled: isLoading,
                className: 'px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 flex items-center space-x-2'
              },
                isLoading && React.createElement('div', { className: 'animate-spin rounded-full h-4 w-4 border-b-2 border-white' }),
                React.createElement('span', {}, isLoading ? 'Reading text from image...' : 'Proceed')
              )
            )
          )
        )
      )
    ),

    React.createElement(ConfirmDialog, {
      open: showConfirmDialog,
      onOpenChange: setShowConfirmDialog,
      title: dialogType === 'clearText' ? 'You will lose all data in TEXT tab. Are you sure?' : 
             dialogType === 'clearExplanations' ? (displayedTab === 'text' ? 'Clear Text tab explanations?' : 'Clear Words tab explanations?') : 
             'Clear existing data?',
      description: dialogType === 'clearText' ? '' :
                  dialogType === 'clearExplanations' ? (displayedTab === 'text' ? 'All explanations in Text tab will be cleared. Are you sure?' : 'All words and explanations in Words tab will be cleared. Are you sure?') :
                  'All existing data will be erased. Do you still want to start fresh?',
      confirmText: dialogType === 'clearText' ? 'Yes, clear text' :
                  dialogType === 'clearExplanations' ? (displayedTab === 'text' ? 'Yes, clear text explanations' : 'Yes, clear words explanations') :
                  'Yes, clear all',
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
        // Reset file input to allow re-uploading the same file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Reset any uploaded file state
        setUploadedImageFile(null);
        if (imagePreviewUrl) {
          URL.revokeObjectURL(imagePreviewUrl);
          setImagePreviewUrl(null);
        }
        setShowCropCanvas(false);
      }
    })
  );
}

