'use client';

import React, { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { WordLocation, generateId } from '@/lib/utils';

interface WordsTabProps {
  manualWords: string[];
  onAddWord: (word: string) => void;
  onRemoveWord: (word: string) => void;
  onExplainWords: () => void;
  isExplaining: boolean;
}

const WordsTab: React.FC<WordsTabProps> = ({
  manualWords,
  onAddWord,
  onRemoveWord,
  onExplainWords,
  isExplaining,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const word = inputValue.trim().toLowerCase();
      
      // Check if word already exists
      if (!manualWords.includes(word)) {
        onAddWord(word);
        setInputValue('');
      }
    }
  }, [inputValue, manualWords, onAddWord]);

  const handleAddClick = useCallback(() => {
    const word = inputValue.trim().toLowerCase();
    if (word && !manualWords.includes(word)) {
      onAddWord(word);
      setInputValue('');
    }
  }, [inputValue, manualWords, onAddWord]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Type a word and press Enter..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={isExplaining}
          />
          <Button
            onClick={handleAddClick}
            disabled={!inputValue.trim() || manualWords.includes(inputValue.trim().toLowerCase()) || isExplaining}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add
          </Button>
        </div>

        <div className="text-xs text-text-secondary">
          💡 <strong>Tip:</strong> Add words one at a time and press Enter or click Add
        </div>
      </div>

      {/* Word Tokens */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-primary">
          Selected Words ({manualWords.length})
        </h3>
        
        <AnimatePresence mode="popLayout">
          {manualWords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {manualWords.map((word) => (
                <motion.div
                  key={word}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Badge
                    variant="secondary"
                    removable
                    onRemove={() => onRemoveWord(word)}
                  >
                    {word}
                  </Badge>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-text-muted"
            >
              <div className="space-y-2">
                <div className="text-4xl">📝</div>
                <p>No words added yet</p>
                <p className="text-xs">Start typing a word above to add it</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Explain Button */}
      {manualWords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 border-t border-border"
        >
          <Button
            onClick={onExplainWords}
            disabled={isExplaining}
            loading={isExplaining}
            className="w-full"
            size="lg"
          >
            {isExplaining ? 'Explaining...' : `Explain ${manualWords.length} word${manualWords.length > 1 ? 's' : ''}`}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default WordsTab;
