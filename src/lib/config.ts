// Configuration constants for the application
export const CONFIG = {
  // Maximum number of words that can be added at once in the words tab
  MAX_WORDS_AT_ONCE: 10,
  
  // Maximum total words (explained + to be explained)
  MAX_TOTAL_WORDS: 20,
  
  // Maximum number of words that can be processed from text (existing)
  MAX_TEXT_WORDS: 500,
  
  // Random paragraph word count for vocabulary improvement
  RANDOM_PARAGRAPH_WORD_COUNT: 50,
} as const;
