'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextArea } from '../ui/TextArea';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { WordLocation, Trie, debounce } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TextTabProps {
  text: string;
  setText: (text: string) => void;
  selectedWords: WordLocation[];
  explainedWords: WordLocation[];
  isReadOnly: boolean;
  onWordSelect: (word: WordLocation) => void;
  onWordDeselect: (word: WordLocation) => void;
}

const TextTab: React.FC<TextTabProps> = ({
  text,
  setText,
  selectedWords,
  explainedWords,
  isReadOnly,
  onWordSelect,
  onWordDeselect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ word: string; positions: number[] }>>([]);
  const [trie] = useState(() => new Trie());
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Build trie when text changes
  useEffect(() => {
    if (text) {
      trie.buildFromText(text);
    }
  }, [text, trie]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      if (!term.trim()) {
        setSearchResults([]);
        return;
      }
      
      const results = trie.search(term.toLowerCase());
      setSearchResults(results);
    }, 300),
    [trie]
  );

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, []);

  // Handle double click on words
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) {
      const textarea = e.currentTarget;
      const clickPosition = textarea.selectionStart;
      
      // Find word boundaries
      let start = clickPosition;
      let end = clickPosition;
      
      // Move start backward to find word start
      while (start > 0 && /\w/.test(text[start - 1])) {
        start--;
      }
      
      // Move end forward to find word end
      while (end < text.length && /\w/.test(text[end])) {
        end++;
      }
      
      if (start < end) {
        const word = text.slice(start, end);
        const wordLocation: WordLocation = {
          word,
          index: start,
          length: end - start,
        };
        
        // Check if word is already selected
        const isSelected = selectedWords.some(
          (w) => w.index === start && w.length === end - start
        );
        
        if (isSelected) {
          onWordDeselect(wordLocation);
        } else {
          onWordSelect(wordLocation);
        }
      }
    }
  }, [text, selectedWords, isReadOnly, onWordSelect, onWordDeselect]);

  // Render text with highlights
  const renderHighlightedText = useCallback(() => {
    if (!text) return '';

    let highlightedText = text;
    const allWords = [...selectedWords, ...explainedWords];
    
    // Add search highlights
    if (searchTerm && searchResults.length > 0) {
      searchResults.forEach(({ positions }) => {
        positions.forEach((pos) => {
          const word = text.slice(pos, pos + searchTerm.length);
          // This is a simplified approach - in a real implementation,
          // you'd want to use a more sophisticated highlighting system
        });
      });
    }

    // Sort words by index in descending order to avoid offset issues
    const sortedWords = allWords.sort((a, b) => b.index - a.index);

    sortedWords.forEach((wordLocation) => {
      const { index, length } = wordLocation;
      const beforeText = highlightedText.slice(0, index);
      const wordText = highlightedText.slice(index, index + length);
      const afterText = highlightedText.slice(index + length);
      
      const isExplained = explainedWords.some(
        (w) => w.index === index && w.length === length
      );
      
      const isSelected = selectedWords.some(
        (w) => w.index === index && w.length === length
      );

      let className = '';
      if (isExplained) {
        className = 'bg-highlight-green';
      } else if (isSelected) {
        className = 'bg-highlight-purple';
      }

      if (className) {
        highlightedText = `${beforeText}<span class="${className} relative inline-block px-1 rounded">${wordText}${isSelected && !isExplained ? '<button class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600" onclick="handleWordDeselect(' + index + ', ' + length + ')">×</button>' : ''}</span>${afterText}`;
      }
    });

    return highlightedText;
  }, [text, selectedWords, explainedWords, searchTerm, searchResults]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="space-y-2">
        <Input
          placeholder="Search for words in the text..."
          value={searchTerm}
          onChange={handleSearchChange}
          leftIcon={<Search className="h-4 w-4" />}
          rightIcon={
            searchTerm && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearSearch}
                className="h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            )
          }
        />
        
        {/* Search Results */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xs text-text-secondary"
            >
              Found {searchResults.reduce((total, result) => total + result.positions.length, 0)} matches
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Text Area */}
      <div className="relative">
        {isReadOnly ? (
          <div
            className={cn(
              'min-h-[300px] w-full rounded-lg border border-border bg-background p-3 text-sm text-text-primary whitespace-pre-wrap cursor-text',
              'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2'
            )}
            onDoubleClick={handleDoubleClick}
            dangerouslySetInnerHTML={{ __html: renderHighlightedText() }}
          />
        ) : (
          <TextArea
            ref={textAreaRef}
            placeholder="Paste or enter your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[300px] resize-none"
            onDoubleClick={handleDoubleClick}
          />
        )}
      </div>

      {/* Instructions */}
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-text-secondary space-y-1"
        >
          <p>💡 <strong>Tip:</strong> Double-click on any word to select it for explanation</p>
          {isReadOnly && (
            <p>📝 Text is read-only because it contains explained words</p>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default TextTab;
