'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, RotateCcw, Target } from 'lucide-react';
import { toast } from 'sonner';

// Components
import Header from '@/components/Header';
import ErrorBanner from '@/components/ErrorBanner';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import ImageTab from '@/components/tabs/ImageTab';
import TextTab from '@/components/tabs/TextTab';
import WordsTab from '@/components/tabs/WordsTab';
import ExplanationsTab from '@/components/tabs/ExplanationsTab';

// Types and utilities
import { WordLocation, WordExplanation, SSEResponse, handleApiError } from '@/lib/utils';

type TabValue = 'image' | 'text' | 'words' | 'explanations';

interface AppState {
  text: string;
  selectedWords: WordLocation[];
  explainedWords: WordLocation[];
  manualWords: string[];
  explanations: WordExplanation[];
  activeTab: TabValue;
  isLoading: boolean;
  isSmartSelecting: boolean;
  isExplaining: boolean;
  isStreaming: boolean;
  isCompleted: boolean;
  error: string | null;
  showConfirmDialog: boolean;
  pendingTab: TabValue | null;
  confirmAction: (() => void) | null;
}

const initialState: AppState = {
  text: '',
  selectedWords: [],
  explainedWords: [],
  manualWords: [],
  explanations: [],
  activeTab: 'image',
  isLoading: false,
  isSmartSelecting: false,
  isExplaining: false,
  isStreaming: false,
  isCompleted: false,
  error: null,
  showConfirmDialog: false,
  pendingTab: null,
  confirmAction: null,
};

export default function MainApp() {
  const [state, setState] = useState<AppState>(initialState);

  // Helper to update state
  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Check if there's any data that would be lost on tab switch
  const hasData = useCallback(() => {
    return !!(
      state.text ||
      state.selectedWords.length > 0 ||
      state.explainedWords.length > 0 ||
      state.manualWords.length > 0 ||
      state.explanations.length > 0
    );
  }, [state]);

  // Clear all data
  const clearAllData = useCallback(() => {
    setState(initialState);
  }, []);

  // Error handling
  const showError = useCallback((message: string) => {
    updateState({ error: message });
    toast.error(message);
  }, [updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Tab switching with confirmation
  const handleTabChange = useCallback((newTab: TabValue) => {
    if (newTab === state.activeTab) return;

    if (hasData()) {
      updateState({
        showConfirmDialog: true,
        pendingTab: newTab,
        confirmAction: () => {
          clearAllData();
          updateState({ activeTab: newTab });
        },
      });
    } else {
      updateState({ activeTab: newTab });
    }
  }, [state.activeTab, hasData, updateState, clearAllData]);

  // Image processing
  const handleImageProcessed = useCallback((extractedText: string) => {
    updateState({
      text: extractedText,
      activeTab: 'text',
    });
    toast.success('Text extracted successfully!');
  }, [updateState]);

  // Text editing
  const handleTextChange = useCallback((newText: string) => {
    if (state.explainedWords.length === 0) {
      updateState({ text: newText });
    }
  }, [state.explainedWords.length, updateState]);

  // Word selection
  const handleWordSelect = useCallback((word: WordLocation) => {
    updateState({
      selectedWords: [...state.selectedWords, word],
    });
  }, [state.selectedWords, updateState]);

  const handleWordDeselect = useCallback((word: WordLocation) => {
    updateState({
      selectedWords: state.selectedWords.filter(
        w => !(w.index === word.index && w.length === word.length)
      ),
    });
  }, [state.selectedWords, updateState]);

  // Manual word management
  const handleAddManualWord = useCallback((word: string) => {
    if (!state.manualWords.includes(word)) {
      updateState({
        manualWords: [...state.manualWords, word],
      });
    }
  }, [state.manualWords, updateState]);

  const handleRemoveManualWord = useCallback((word: string) => {
    updateState({
      manualWords: state.manualWords.filter(w => w !== word),
    });
  }, [state.manualWords, updateState]);

  // Smart word selection
  const handleSmartSelectWords = useCallback(async () => {
    if (!state.text.trim()) {
      showError('Please enter some text first');
      return;
    }

    updateState({ isSmartSelecting: true });

    try {
      const response = await fetch('/api/v1/important-words-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: state.text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      updateState({
        selectedWords: data.important_words_location || [],
        isSmartSelecting: false,
      });

      toast.success(`Selected ${data.important_words_location?.length || 0} important words`);
    } catch (error) {
      console.error('Error selecting words:', error);
      showError(handleApiError(error));
      updateState({ isSmartSelecting: false });
    }
  }, [state.text, updateState, showError]);

  // Word explanation with SSE
  const handleExplainWords = useCallback(async () => {
    const wordsToExplain = state.selectedWords.length > 0 
      ? state.selectedWords 
      : state.manualWords.map((word, index) => ({
          word,
          index: index * 10,
          length: word.length,
        }));

    if (wordsToExplain.length === 0) {
      showError('No words selected for explanation');
      return;
    }

    updateState({ 
      isExplaining: true, 
      isStreaming: true,
      activeTab: 'explanations',
    });

    try {
      const response = await fetch('/api/v1/words-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: state.text || state.manualWords.join(' '),
          important_words_location: wordsToExplain,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

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
              updateState({ 
                isStreaming: false, 
                isCompleted: true,
                explainedWords: wordsToExplain,
              });
              toast.success('All explanations completed!');
              return;
            }

            try {
              const parsed: SSEResponse = JSON.parse(data);
              
              updateState({
                explanations: [...state.explanations, ...parsed.words_info],
              });
            } catch (parseError) {
              console.warn('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error explaining words:', error);
      showError(handleApiError(error));
    } finally {
      updateState({ 
        isExplaining: false, 
        isStreaming: false,
      });
    }
  }, [state.selectedWords, state.manualWords, state.text, state.explanations, updateState, showError]);

  // Smart explain
  const handleSmartExplain = useCallback(async () => {
    if (!state.text.trim()) {
      showError('Please enter some text first');
      return;
    }

    updateState({ isSmartSelecting: true });

    try {
      const response = await fetch('/api/v1/important-words-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: state.text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const selectedWords = data.important_words_location || [];
      
      updateState({
        selectedWords,
        isSmartSelecting: false,
      });

      if (selectedWords.length > 0) {
        setTimeout(() => {
          handleExplainWords();
        }, 500);
      } else {
        showError('No important words found in the text');
      }
    } catch (error) {
      console.error('Error in smart explain:', error);
      showError(handleApiError(error));
      updateState({ isSmartSelecting: false });
    }
  }, [state.text, updateState, showError, handleExplainWords]);

  // Get more explanations
  const handleGetMoreExplanations = useCallback(async (explanation: WordExplanation) => {
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      updateState({
        explanations: state.explanations.map(exp =>
          exp.word === explanation.word
            ? { ...exp, examples: data.examples }
            : exp
        ),
      });

      toast.success('More examples added!');
    } catch (error) {
      console.error('Error getting more explanations:', error);
      showError(handleApiError(error));
    }
  }, [state.explanations, updateState, showError]);

  // Scroll to word in text
  const handleScrollToWord = useCallback((wordIndex: number) => {
    updateState({ activeTab: 'text' });
  }, [updateState]);

  // Clear all with confirmation
  const handleClearAll = useCallback(() => {
    if (hasData()) {
      updateState({
        showConfirmDialog: true,
        confirmAction: clearAllData,
      });
    }
  }, [hasData, updateState, clearAllData]);

  const isTextReadOnly = state.explainedWords.length > 0;
  const canSmartSelect = state.text.trim() && !state.isSmartSelecting && state.explainedWords.length === 0;
  const canExplain = (state.selectedWords.length > 0 || state.manualWords.length > 0) && !state.isExplaining;
  const canSmartExplain = state.text.trim() && !state.isSmartSelecting && !state.isExplaining && state.explainedWords.length === 0;

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <ErrorBanner
        message={state.error || ''}
        onClose={clearError}
        visible={!!state.error}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-300 overflow-hidden">
          <Tabs value={state.activeTab} onValueChange={handleTabChange}>
            <div className="border-b border-gray-300 bg-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="image">Image</TabsTrigger>
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="words">Words</TabsTrigger>
                  <TabsTrigger value="explanations">
                    Explanations
                    {state.explanations.length > 0 && (
                      <span className="ml-2 bg-primary-500 text-white text-xs rounded-full px-2 py-0.5">
                        {state.explanations.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSmartSelectWords}
                    disabled={!canSmartSelect}
                    loading={state.isSmartSelecting}
                    leftIcon={<Target className="h-4 w-4" />}
                  >
                    Smart select words
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={handleExplainWords}
                    disabled={!canExplain}
                    loading={state.isExplaining}
                    leftIcon={<Sparkles className="h-4 w-4" />}
                  >
                    Explain
                  </Button>
                  
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleSmartExplain}
                    disabled={!canSmartExplain}
                    loading={state.isSmartSelecting || state.isExplaining}
                    leftIcon={<Zap className="h-4 w-4" />}
                  >
                    Smart explain
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={!hasData()}
                    leftIcon={<RotateCcw className="h-4 w-4" />}
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <TabsContent value="image" className="mt-0">
                <ImageTab
                  onImageProcessed={handleImageProcessed}
                  onError={showError}
                  isLoading={state.isLoading}
                  setIsLoading={(loading) => updateState({ isLoading: loading })}
                />
              </TabsContent>

              <TabsContent value="text" className="mt-0">
                <TextTab
                  text={state.text}
                  setText={handleTextChange}
                  selectedWords={state.selectedWords}
                  explainedWords={state.explainedWords}
                  isReadOnly={isTextReadOnly}
                  onWordSelect={handleWordSelect}
                  onWordDeselect={handleWordDeselect}
                />
              </TabsContent>

              <TabsContent value="words" className="mt-0">
                <WordsTab
                  manualWords={state.manualWords}
                  onAddWord={handleAddManualWord}
                  onRemoveWord={handleRemoveManualWord}
                  onExplainWords={handleExplainWords}
                  isExplaining={state.isExplaining}
                />
              </TabsContent>

              <TabsContent value="explanations" className="mt-0">
                <ExplanationsTab
                  explanations={state.explanations}
                  isStreaming={state.isStreaming}
                  isCompleted={state.isCompleted}
                  onGetMoreExplanations={handleGetMoreExplanations}
                  onScrollToWord={handleScrollToWord}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      <ConfirmDialog
        open={state.showConfirmDialog}
        onOpenChange={(open) => updateState({ showConfirmDialog: open })}
        title="Clear existing data?"
        description="All existing data will be erased. Do you still want to start fresh?"
        confirmText="Yes, clear all"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (state.confirmAction) {
            state.confirmAction();
          }
          updateState({ 
            showConfirmDialog: false, 
            confirmAction: null, 
            pendingTab: null 
          });
        }}
        onCancel={() => updateState({ 
          showConfirmDialog: false, 
          confirmAction: null, 
          pendingTab: null 
        })}
      />
    </div>
  );
}
