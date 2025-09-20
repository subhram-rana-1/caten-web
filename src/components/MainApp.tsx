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
  
  // Efficient word-to-index mappings for O(1) lookups
  const [textWordToIndexMap, setTextWordToIndexMap] = useState<Map<string, number>>(new Map());
  const [wordsWordToIndexMap, setWordsWordToIndexMap] = useState<Map<string, number>>(new Map());
  
  // Force immediate explanation update using a different approach
  const addExplanationImmediately = useCallback((newInfo: any, tabType: 'text' | 'words') => {
    console.log('Adding explanation immediately for:', newInfo.word, 'in', tabType, 'tab');
    
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
  const [wordLimitAlert, setWordLimitAlert] = useState<string | null>(null);
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const [showWordLimitAlert, setShowWordLimitAlert] = useState(false);
  const [showCropCanvas, setShowCropCanvas] = useState(false);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textCanvasRef = useRef<HTMLDivElement>(null);
  const explanationSectionRef = useRef<HTMLDivElement>(null);
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
    setIsCompleted(false);
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
        setExplainedWordNames(new Set());
        setTextExplainedWordNames(new Set());
        setWordsExplainedWordNames(new Set());
        setIsCompleted(false);
        setIsStreaming(false);
        setIsExplaining(false);
        setIsSmartExplaining(false);
        setSmartExplainPhase('selecting');
        // Note: We preserve words tab data (manualWords, wordsExplanations, etc.)
        
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
    setShowCropCanvas(false);

    try {
      const formData = new FormData();
      formData.append('file', uploadedImageFile);

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
    } finally {
      setIsLoading(false);
      // Clean up
      setUploadedImageFile(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      const importantWords = data.important_words_location || [];
      
      // Safety check: limit to 10 words maximum
      if (importantWords.length > 10) {
        showError("Smart Select returned more than 10 words. Please try again.");
        return;
      }
      
      setSelectedWords(importantWords);
      toast.success(`Selected ${importantWords.length} important words`);
      
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
              loadingStates.setIsStreaming(false);
              loadingStates.setIsCompleted(true);
              loadingStates.setIsPreparingExplanations(false);
              // Mark words as explained (change from purple to green background)
              setExplainedWords(prev => [...prev, ...wordsToExplain]);
              
              // Update tab-specific explained word names for highlighting
              if (currentTab === 'text') {
                setTextExplainedWordNames(prev => {
                  const newSet = new Set(prev);
                  wordsToExplain.forEach((word: any) => newSet.add(word.word));
                  return newSet;
                });
              } else if (currentTab === 'words') {
                setWordsExplainedWordNames(prev => {
                  const newSet = new Set(prev);
                  wordsToExplain.forEach((word: any) => newSet.add(word.word));
                  return newSet;
                });
              }
              
              loadingStates.setIsExplaining(false);
              setSelectedWords([]); // Clear selected words as they are now explained
              setAbortController(null);
              // Ensure all cards start collapsed
              setExpandedCards(new Set());
              toast.success('All explanations completed!');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              console.log('Received SSE data:', parsed); // Debug log
              
              // Clear preparing state when we start receiving data
              loadingStates.setIsPreparingExplanations(false);
              
              // Handle both word_info (singular) and words_info (plural) formats
              if (parsed.word_info) {
                // Single word format from backend - process immediately
                const newInfo = parsed.word_info;
                console.log('Processing single word explanation for:', newInfo.word);
                
                // Check if we already have this word in the current tab's explanations
                const currentExplanations = currentTab === 'text' ? textExplanationsRef.current : wordsExplanationsRef.current;
                const existingIndex = currentExplanations.findIndex(exp => exp.word === newInfo.word);
                
                if (existingIndex === -1) {
                  // New word, add it immediately using the working function
                  addExplanationImmediately(newInfo, currentTab as 'text' | 'words');
                } else {
                  // Word exists, update it
                  console.log('Updating explanation for:', newInfo.word);
                  if (currentTab === 'text') {
                    textExplanationsRef.current[existingIndex] = newInfo;
                    setTextExplanations([...textExplanationsRef.current]);
                  } else {
                    wordsExplanationsRef.current[existingIndex] = newInfo;
                    setWordsExplanations([...wordsExplanationsRef.current]);
                  }
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
                  
                  // Check if we already have this word in the current tab's explanations
                  const currentExplanations = currentTab === 'text' ? textExplanationsRef.current : wordsExplanationsRef.current;
                  const existingIndex = currentExplanations.findIndex(exp => exp.word === newInfo.word);
                  
                  if (existingIndex === -1) {
                    // New word, add it immediately using the working function
                    addExplanationImmediately(newInfo, currentTab as 'text' | 'words');
                  } else {
                    // Word exists, update it
                    console.log('Updating explanation for:', newInfo.word);
                    if (currentTab === 'text') {
                      textExplanationsRef.current[existingIndex] = newInfo;
                      setTextExplanations([...textExplanationsRef.current]);
                    } else {
                      wordsExplanationsRef.current[existingIndex] = newInfo;
                      setWordsExplanations([...wordsExplanationsRef.current]);
                    }
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
        loadingStates.setIsStreaming(false);
        loadingStates.setIsCompleted(true);
        loadingStates.setIsExplaining(false);
        loadingStates.setIsPreparingExplanations(false);
        setAbortController(null);
        toast.info('Explanation stopped by user');
      } else {
        console.error('Error explaining words:', error);
        showError('Failed to generate explanations. Please try again.');
        loadingStates.setIsExplaining(false);
        loadingStates.setIsStreaming(false);
        loadingStates.setIsPreparingExplanations(false);
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

      // Step 3: Make API call to words explanation endpoint
      console.log('Making API call to words explanation...');
      loadingStates.setSmartExplainPhase('explaining');

      // Don't set isExplaining to true here - keep isSmartExplaining true instead
      loadingStates.setIsStreaming(true);
      loadingStates.setIsCompleted(false);

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
              loadingStates.setIsSmartExplaining(false);
              loadingStates.setSmartExplainPhase('idle');
              // Ensure all cards start collapsed
              setExpandedCards(new Set());
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
                
                // Check if we already have this word in the current tab's explanations
                const currentExplanations = currentTab === 'text' ? textExplanationsRef.current : wordsExplanationsRef.current;
                const existingIndex = currentExplanations.findIndex(exp => exp.word === newInfo.word);
                
                if (existingIndex === -1) {
                  // New word, add it immediately using the working function
                  addExplanationImmediately(newInfo, currentTab as 'text' | 'words');
                } else {
                  // Word exists, update it
                  console.log('Updating explanation for:', newInfo.word);
                  if (currentTab === 'text') {
                    textExplanationsRef.current[existingIndex] = newInfo;
                    setTextExplanations([...textExplanationsRef.current]);
                  } else {
                    wordsExplanationsRef.current[existingIndex] = newInfo;
                    setWordsExplanations([...wordsExplanationsRef.current]);
                  }
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
                  const currentExplanations = currentTab === 'text' ? textExplanationsRef.current : wordsExplanationsRef.current;
                  const existingIndex = currentExplanations.findIndex(exp => exp.word === wordInfo.word);
                  
                  if (existingIndex === -1) {
                    addExplanationImmediately(wordInfo, currentTab as 'text' | 'words');
                  } else {
                    if (currentTab === 'text') {
                      textExplanationsRef.current[existingIndex] = wordInfo;
                      setTextExplanations([...textExplanationsRef.current]);
                    } else {
                      wordsExplanationsRef.current[existingIndex] = wordInfo;
                      setWordsExplanations([...wordsExplanationsRef.current]);
                    }
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
          // Check if word is already explained
          if (textExplainedWordNames.has(word)) {
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

  // Handle clicking on explained words in Text tab - provides unselect functionality
  const handleTextExplainedWordClick = (word: string) => {
    // First, scroll to the explanation (same as handleExplainedWordClick)
    handleExplainedWordClick(word);
    
    // Then, provide unselect functionality by removing from selectedWords
    // This will remove the green highlighting
    setSelectedWords(prev => prev.filter(w => w.word !== word));
    toast.success(`Word "${word}" unselected`);
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

    return text.split(/(\s+)/).map((word, index) => {
      const cleanWord = word.trim().toLowerCase().replace(/[.,!?;:]/g, '');
      if (!cleanWord) return React.createElement('span', { key: index }, word);

      const isSelected = selectedWords.some(w => w.word === cleanWord);
      const isExplained = textExplainedWordNames.has(cleanWord);
      const isManualWord = manualWords.includes(cleanWord);
      const isManualWordExplained = isManualWord && textExplainedWordNames.has(cleanWord);
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
          { 
            key: index, 
            className,
            onClick: (isExplained || isManualWordExplained) ? () => handleTextExplainedWordClick(cleanWord) : undefined
          },
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
    React.createElement('div', { className: 'bg-gradient-to-br from-gray-50 via-white to-purple-25 pt-6 pb-0 px-4' },
      React.createElement('div', { className: 'max-w-7xl mx-auto text-center' },
        React.createElement('div', { className: 'flex items-center justify-center space-x-3' },
          React.createElement('span', { className: 'text-xl md:text-2xl lg:text-3xl text-gray-700 statement-text font-semibold' }, 'Master vocabulary with AI-powered explanations'),
          React.createElement('div', { className: 'text-2xl md:text-3xl' }, '🧠')
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
            displayedTab === 'image' && React.createElement('div', { className: `h-[384px] flex flex-col tab-content ${activeTab === 'image' ? 'animate-tab-fade-in' : 'animate-tab-fade-out'}` },
              React.createElement('div', {
                className: `relative border border-dashed rounded-xl p-12 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] max-w-4xl mx-auto flex-1 flex items-center justify-center ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-primary-200 hover:border-primary-300 bg-primary-25'} ${isLoading ? 'pointer-events-none opacity-50' : ''}`,
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
                    React.createElement('p', { className: 'text-xs text-gray-500' }, 'Or use Ctrl+V (Windows) / Cmd+V (Mac) to paste from clipboard')
                  ),

                  React.createElement('button', {
                    className: 'inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary-100 text-primary-700 hover:bg-primary-200 h-10 px-6 transition-all duration-200',
                    disabled: isLoading
                  }, isLoading ? 'Processing...' : 'Browse')
                )
              ),
              React.createElement('div', { className: 'text-center mt-4 mb-4' },
                React.createElement('p', { className: 'text-xs text-gray-500' }, 'Maximum file size: 5MB')
              )
            ),

            // Text Tab Content
            displayedTab === 'text' && React.createElement('div', { className: `h-[384px] flex flex-col tab-content ${activeTab === 'text' ? 'animate-tab-fade-in' : 'animate-tab-fade-out'}` },
              // Search Bar - only show when there is text
              text.trim() && React.createElement('input', {
                type: 'text',
                placeholder: 'Search word ...',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                className: 'w-full h-9 px-3 py-2 border border-purple-300 rounded-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 hover:border-purple-500 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all duration-200 mb-4'
              }),

              // Text Area with Smart Explain Overlay
              React.createElement('div', { className: 'relative flex flex-col flex-1' },
                text 
                  ? React.createElement('div', {
                      ref: textCanvasRef,
                      className: `w-full h-[200px] px-4 py-3 border border-purple-300 rounded-lg text-sm leading-relaxed bg-white cursor-text whitespace-pre-wrap overflow-y-auto hover:border-purple-500 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] transition-all duration-200 ${isPreparingExplanations || isSmartSelecting ? 'blur-[0.5px]' : ''}`,
                      onDoubleClick: handleDoubleClick
                    }, renderHighlightedText())
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
                        className: `w-full h-[200px] px-4 py-3 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 hover:border-purple-500 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)] resize-none overflow-y-auto transition-all duration-200 ${isPreparingExplanations || isSmartSelecting ? 'blur-[0.5px]' : ''}`,
                        disabled: textExplanations.length > 0
                      }),
                      
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
                      
                      // Random paragraph button - only show when text is empty
                      !text.trim() && React.createElement('button', {
                        onClick: handleRandomParagraph,
                        disabled: isLoading,
                        className: `absolute bottom-3 right-3 inline-flex items-center justify-center rounded-lg font-medium h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] ${
                          isLoading 
                            ? 'bg-purple-400 text-white cursor-not-allowed' 
                            : 'bg-purple-500 text-white hover:bg-purple-600'
                        }`
                      },
                        isLoading 
                          ? React.createElement('div', { className: 'animate-spin rounded-full h-3 w-3 border-b border-white mr-1' })
                          : React.createElement('svg', { className: 'w-4 h-4 mr-1', fill: 'none', stroke: 'white', strokeWidth: '2', viewBox: '0 0 24 24' },
                              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 001-1V4z' })
                            ),
                        isLoading ? 'Loading...' : 'Power Words Pack'
                      )
                    ),
                
                // Smart Select Overlay
                isSmartSelecting && React.createElement('div', { className: 'text-canvas-overlay' },
                  React.createElement('div', { className: 'loading-content' },
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
                    React.createElement('h3', { className: 'loading-title' }, 'Analyzing text for difficult words'),
                    React.createElement('div', { className: 'pulse-dots' },
                      React.createElement('span', {}, '●'),
                      React.createElement('span', {}, '●'),
                      React.createElement('span', {}, '●')
                    )
                  )
                ),

                // Smart Explain Overlay
                getCurrentTabLoadingStates().isSmartExplaining && React.createElement('div', { className: 'text-canvas-overlay' },
                  React.createElement('div', { className: 'loading-content' },
                    // Smart selecting phase
                    getCurrentTabLoadingStates().smartExplainPhase === 'selecting' && React.createElement(React.Fragment, {},
                      React.createElement('div', { className: 'loading-icon smart-select-icon' },
                        React.createElement('svg', { 
                          className: 'w-full h-full text-purple-500 animate-wireframe', 
                          fill: 'none', 
                          stroke: 'currentColor', 
                          strokeWidth: '2',
                          viewBox: '0 0 24 24' 
                        },
                          React.createElement('path', { 
                            strokeLinecap: 'round', 
                            strokeLinejoin: 'round', 
                            d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' 
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
                    
                    // Explaining phase
                    getCurrentTabLoadingStates().smartExplainPhase === 'explaining' && React.createElement(React.Fragment, {},
                      React.createElement('div', { className: 'loading-icon explain-icon' },
                        React.createElement('svg', { 
                          className: 'w-full h-full text-purple-500 animate-wireframe', 
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
                getCurrentTabLoadingStates().isPreparingExplanations && React.createElement('div', { className: 'text-canvas-overlay' },
                  React.createElement('div', { className: 'loading-content' },
                    React.createElement('div', { className: 'loading-icon explain-icon' },
                      React.createElement('svg', { 
                        className: 'w-full h-full text-purple-500 animate-wireframe', 
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
              React.createElement('div', { className: 'flex justify-between items-start mt-auto pt-6' },
                // Left Button Group - Clear Buttons
                React.createElement('div', { className: 'flex flex-col space-y-3' },
                  text.trim() && React.createElement('button', {
                    onClick: handleClearText,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium border border-red-300 text-red-600 hover:bg-red-50 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                  }, 
                    React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
                    ),
                    'Clear Text'
                  ),
                  
                  textExplanations.length > 0 && React.createElement('button', {
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
                  (text.trim() && !isSmartSelecting && (displayedTab === 'text' ? textExplanations.length === 0 : wordsExplanations.length === 0)) && React.createElement('button', {
                    onClick: handleSmartSelectWords,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium border border-primary-300 text-primary-600 hover:bg-primary-50 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                  }, 
                    React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' })
                    ),
                    isSmartSelecting ? 'Selecting...' : 'Smart select words'
                  ),
                  
                  selectedWords.length > 0 && React.createElement('button', {
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
                      // Explain button
                      !getCurrentTabLoadingStates().isExplaining && !getCurrentTabLoadingStates().isSmartExplaining && React.createElement('button', {
                        onClick: handleExplainWords,
                        className: 'inline-flex items-center justify-center rounded-lg font-medium bg-primary-500 text-white hover:bg-primary-600 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                      },
                        React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
                        ),
                        `Explain ${selectedWords.length} word${selectedWords.length !== 1 ? 's' : ''}`
                      ),
                      
                      // Smart explain button
                      text.trim() && !getCurrentTabLoadingStates().isSmartExplaining && !getCurrentTabLoadingStates().isExplaining && (displayedTab === 'text' ? textExplanations.length === 0 : wordsExplanations.length === 0) && React.createElement('button', {
                        onClick: handleSmartExplain,
                        className: 'inline-flex items-center justify-center rounded-lg font-medium text-white h-8 px-3 text-xs transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg relative overflow-hidden',
                        style: {
                          background: 'linear-gradient(45deg, #8B5CF6, #EC4899, #EF4444, #8B5CF6, #EC4899, #EF4444)',
                          backgroundSize: '300% 300%',
                          animation: 'gradientShift 3s ease infinite'
                        }
                      }, 
                        React.createElement('style', {}, `
                          @keyframes gradientShift {
                            0% { background-position: 0% 50%; }
                            25% { background-position: 100% 50%; }
                            50% { background-position: 100% 100%; }
                            75% { background-position: 0% 100%; }
                            100% { background-position: 0% 50%; }
                          }
                        `),
                        React.createElement('div', { className: 'absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300' }),
                        React.createElement('svg', { className: 'w-3 h-3 mr-1 relative z-10', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' }),
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M13 10V3L4 14h7v7l9-11h-7z' })
                        ),
                        React.createElement('span', { className: 'relative z-10' }, getCurrentTabLoadingStates().isSmartExplaining ? 'Smart explaining...' : 'Smart explain')
                      )
                    ) :
                    // When no words selected: horizontal layout (side by side)
                    React.createElement('div', { className: 'flex space-x-2' },
                      // Smart explain button
                      text.trim() && !getCurrentTabLoadingStates().isSmartExplaining && !getCurrentTabLoadingStates().isExplaining && (displayedTab === 'text' ? textExplanations.length === 0 : wordsExplanations.length === 0) && React.createElement('button', {
                        onClick: handleSmartExplain,
                        className: 'inline-flex items-center justify-center rounded-lg font-medium text-white h-8 px-3 text-xs transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg relative overflow-hidden',
                        style: {
                          background: 'linear-gradient(45deg, #8B5CF6, #EC4899, #EF4444, #8B5CF6, #EC4899, #EF4444)',
                          backgroundSize: '300% 300%',
                          animation: 'gradientShift 3s ease infinite'
                        }
                      }, 
                        React.createElement('style', {}, `
                          @keyframes gradientShift {
                            0% { background-position: 0% 50%; }
                            25% { background-position: 100% 50%; }
                            50% { background-position: 100% 100%; }
                            75% { background-position: 0% 100%; }
                            100% { background-position: 0% 50%; }
                          }
                        `),
                        React.createElement('div', { className: 'absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300' }),
                        React.createElement('svg', { className: 'w-3 h-3 mr-1 relative z-10', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' }),
                          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M13 10V3L4 14h7v7l9-11h-7z' })
                        ),
                        React.createElement('span', { className: 'relative z-10' }, getCurrentTabLoadingStates().isSmartExplaining ? 'Smart explaining...' : 'Smart explain')
                      )
                    ),
                  
                  // Stop button (show when streaming or smart explaining) - always horizontal with explain buttons
                  (getCurrentTabLoadingStates().isStreaming || getCurrentTabLoadingStates().isSmartExplaining) && React.createElement('button', {
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
              
              // Word display area with scroll - takes up remaining space (with relative positioning for overlay)
              React.createElement('div', { className: 'flex-1 overflow-y-auto mb-4 relative' },
                // Word content
                manualWords.length > 0 
                  ? React.createElement('div', { className: 'flex flex-wrap gap-2' },
                      manualWords.map(word => {
                        const isExplained = wordsExplainedWordNames.has(word);
                        return React.createElement('div', { 
                          key: word, 
                          className: `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                            isExplained 
                              ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200' 
                              : 'bg-purple-100 text-purple-700'
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
                            className: 'w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-200 ml-1 mr-2 hover:bg-purple-200'
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
                getCurrentTabLoadingStates().isPreparingExplanations && React.createElement('div', { className: 'text-canvas-overlay' },
                  React.createElement('div', { className: 'loading-content' },
                    React.createElement('div', { className: 'loading-icon explain-icon' },
                      React.createElement('svg', { 
                        className: 'w-full h-full text-purple-500 animate-wireframe', 
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
                // Button row with proper layout: Clear All (left) -> Explain (right)
                React.createElement('div', { className: 'flex justify-between items-center' },
                  // Left side: Clear all explanations button
                  React.createElement('button', {
                    onClick: handleClearWordsExplanations,
                    className: 'inline-flex items-center justify-center rounded-lg font-medium border border-red-300 text-red-600 hover:bg-red-50 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                  }, 
                    React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' })
                    ),
                    'Clear all explanations'
                  ),
                  
                  // Right side: Explain button and Stop button (when needed)
                  React.createElement('div', { className: 'flex space-x-2' },
                    React.createElement('button', {
                      onClick: handleExplainWords,
                      disabled: getCurrentTabLoadingStates().isExplaining || getCurrentTabLoadingStates().isSmartExplaining || manualWords.every(word => wordsExplainedWordNames.has(word)),
                      className: 'inline-flex items-center justify-center rounded-lg font-medium bg-primary-500 text-white hover:bg-primary-600 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50'
                    },
                      React.createElement('svg', { className: 'w-3 h-3 mr-1', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
                      ),
                      getCurrentTabLoadingStates().isExplaining && !getCurrentTabLoadingStates().isSmartExplaining ? 'Explaining...' : `Explain ${manualWords.filter(word => !wordsExplainedWordNames.has(word)).length} word${manualWords.filter(word => !wordsExplainedWordNames.has(word)).length > 1 ? 's' : ''}`
                    ),
                    
                    // Stop button for Words tab - shows right next to Explain button when needed
                    (getCurrentTabLoadingStates().isStreaming || getCurrentTabLoadingStates().isSmartExplaining) && React.createElement('button', {
                      onClick: handleStopStreaming,
                      className: 'inline-flex items-center justify-center rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 h-8 px-3 text-xs transition-all duration-200 transform hover:scale-[1.02]'
                    }, 'Stop')
                  )
                )
              )
            )
          )
        ),

        // Right Side - Explanations Card (50%) - Only show for Text and Words tabs
        displayedTab !== 'image' && React.createElement('div', { className: 'w-1/2' },
          React.createElement('div', { className: 'bg-white rounded-2xl shadow-lg shadow-purple-100 p-6 h-full flex flex-col' },
            // Header
            React.createElement('div', { className: 'bg-purple-500 rounded-lg h-10 flex items-center justify-center mb-6' },
              React.createElement('h3', { className: 'text-lg font-normal text-white' }, 'Explanations')
            ),

            // Text/Words tab content - explanations
              React.createElement(React.Fragment, {},
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

                // Sorting tab group (below search bar) - show for both Text and Words tabs
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


            
            // Scrollable Explanation Cards Container
            React.createElement('div', { 
              ref: explanationSectionRef,
              key: explanationKey,
              className: 'flex-1 overflow-y-auto max-h-[500px] space-y-4' 
            },
              
              
              sortedExplanations.length > 0 
                ? sortedExplanations.map((explanation, index) => {
                    const isExpanded = expandedCards.has(explanation.word);
                    const isLoadingMoreExamples = loadingMore.has(explanation.word);
                    
                    return React.createElement('div', { 
                      key: index, 
                      'data-word': explanation.word,
                      className: 'bg-purple-100 rounded-xl overflow-hidden transition-all duration-300 ease-in-out hover:bg-purple-150 mr-2' 
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
                                deleteWordEfficiently(explanation.word, 'text');
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
                    React.createElement('h3', { className: 'text-lg font-medium text-gray-900 mb-2' }, 'No explanations yet'),
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
        className: 'bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden' 
      },
        // Header
        React.createElement('div', { 
          className: 'flex items-center justify-between p-6 border-b border-gray-200' 
        },
          React.createElement('h2', { 
            className: 'text-xl font-semibold text-gray-900' 
          }, 'Crop & Rotate Image'),
          React.createElement('button', {
            onClick: handleCropCancel,
            className: 'text-gray-400 hover:text-gray-600 transition-colors'
          },
            React.createElement('svg', { className: 'w-6 h-6', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M6 18L18 6M6 6l12 12' })
            )
          )
        ),
        
        // Image Preview Area
        React.createElement('div', { 
          className: 'p-6 flex-1 flex items-center justify-center bg-gray-50' 
        },
          imagePreviewUrl && React.createElement('div', { 
            className: 'relative max-w-full max-h-96' 
          },
            React.createElement('img', {
              src: imagePreviewUrl,
              alt: 'Uploaded image',
              className: 'max-w-full max-h-96 object-contain rounded-lg shadow-lg'
            })
          )
        ),
        
        // Action Buttons
        React.createElement('div', { 
          className: 'flex items-center justify-end space-x-4 p-6 border-t border-gray-200' 
        },
          React.createElement('button', {
            onClick: handleCropCancel,
            className: 'px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'
          }, 'Cancel'),
          React.createElement('button', {
            onClick: handleCropExplain,
            disabled: isLoading,
            className: 'px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2'
          },
            isLoading && React.createElement('div', { className: 'animate-spin rounded-full h-4 w-4 border-b-2 border-white' }),
            React.createElement('span', {}, isLoading ? 'Reading text from image...' : 'Explain')
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

