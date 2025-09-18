'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal, CheckCircle2, ArrowUpDown, SortAsc } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { WordExplanation } from '@/lib/utils';
import LoadingSpinner from '../LoadingSpinner';

interface ExplanationsTabProps {
  explanations: WordExplanation[];
  isStreaming: boolean;
  isCompleted: boolean;
  onGetMoreExplanations: (explanation: WordExplanation) => void;
  onScrollToWord: (wordIndex: number) => void;
}

type SortOption = 'alphabetical' | 'complexity';

const ExplanationsTab: React.FC<ExplanationsTabProps> = ({
  explanations,
  isStreaming,
  isCompleted,
  onGetMoreExplanations,
  onScrollToWord,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('complexity');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((word: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(word)) {
        newSet.delete(word);
      } else {
        newSet.add(word);
      }
      return newSet;
    });
  }, []);

  const handleGetMoreExplanations = useCallback(async (explanation: WordExplanation) => {
    setLoadingMore(prev => new Set(prev).add(explanation.word));
    
    try {
      await onGetMoreExplanations(explanation);
    } finally {
      setLoadingMore(prev => {
        const newSet = new Set(prev);
        newSet.delete(explanation.word);
        return newSet;
      });
    }
  }, [onGetMoreExplanations]);

  // Sort explanations based on selected option
  const sortedExplanations = React.useMemo(() => {
    const sorted = [...explanations];
    
    if (sortBy === 'alphabetical') {
      return sorted.sort((a, b) => a.word.localeCompare(b.word));
    } else {
      // Sort by complexity (word length and meaning complexity as a simple heuristic)
      return sorted.sort((a, b) => {
        const aComplexity = a.word.length + a.meaning.length;
        const bComplexity = b.word.length + b.meaning.length;
        return bComplexity - aComplexity;
      });
    }
  }, [explanations, sortBy]);

  // Auto-expand new explanations
  useEffect(() => {
    if (explanations.length > 0) {
      const latestWord = explanations[explanations.length - 1]?.word;
      if (latestWord && !expandedCards.has(latestWord)) {
        setExpandedCards(prev => new Set(prev).add(latestWord));
      }
    }
  }, [explanations, expandedCards]);

  if (explanations.length === 0 && !isStreaming) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-6xl">💡</div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-text-primary">No explanations yet</h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Select words from the text or add them manually in the Words tab, then click "Explain" to get AI-powered explanations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-text-primary">
            Explanations ({explanations.length})
          </h3>
          
          {isCompleted && (
            <Badge variant="success" className="flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>COMPLETED</span>
            </Badge>
          )}
        </div>

        {/* Sort Options */}
        {explanations.length > 1 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-text-secondary">Sort by:</span>
            <Button
              variant={sortBy === 'complexity' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('complexity')}
              leftIcon={<ArrowUpDown className="h-3 w-3" />}
            >
              Complexity
            </Button>
            <Button
              variant={sortBy === 'alphabetical' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('alphabetical')}
              leftIcon={<SortAsc className="h-3 w-3" />}
            >
              A-Z
            </Button>
          </div>
        )}
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-lg p-4"
        >
          <LoadingSpinner size="sm" text="Receiving explanations..." />
        </motion.div>
      )}

      {/* Explanations List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {sortedExplanations.map((explanation, index) => {
            const isExpanded = expandedCards.has(explanation.word);
            const isLoadingMoreExamples = loadingMore.has(explanation.word);
            
            return (
              <motion.div
                key={explanation.word}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-background-secondary rounded-lg border border-border overflow-hidden"
              >
                {/* Card Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-background-tertiary transition-colors"
                  onClick={() => toggleExpanded(explanation.word)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onScrollToWord(explanation.location.index);
                        }}
                        className="text-primary hover:text-primary-hover"
                      >
                        {explanation.word}
                      </Button>
                      <Badge variant="outline" className="text-xs">
                        {explanation.examples.length} example{explanation.examples.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <Button variant="ghost" size="icon-sm">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Card Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-border"
                    >
                      <div className="p-4 space-y-4">
                        {/* Meaning */}
                        <div>
                          <h4 className="text-sm font-medium text-text-primary mb-2">Meaning</h4>
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {explanation.meaning}
                          </p>
                        </div>

                        {/* Examples */}
                        <div>
                          <h4 className="text-sm font-medium text-text-primary mb-2">Examples</h4>
                          <div className="space-y-2">
                            {explanation.examples.map((example, idx) => (
                              <div
                                key={idx}
                                className="text-sm text-text-secondary bg-background rounded-md p-3 border-l-2 border-primary/20"
                              >
                                {example}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* View More Button */}
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGetMoreExplanations(explanation)}
                            disabled={isLoadingMoreExamples}
                            loading={isLoadingMoreExamples}
                            leftIcon={!isLoadingMoreExamples && <MoreHorizontal className="h-4 w-4" />}
                          >
                            {isLoadingMoreExamples ? 'Loading...' : 'View more examples'}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ExplanationsTab;
