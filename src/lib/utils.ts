import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File validation utilities
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please upload a valid image file (JPEG, JPG, PNG, or HEIC)',
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size must be less than 5MB',
    };
  }

  return { isValid: true };
};

// Text processing utilities
export const highlightWords = (
  text: string,
  wordsToHighlight: Array<{ word: string; index: number; length: number }>,
  className: string
): string => {
  if (!wordsToHighlight.length) return text;

  // Sort by index in descending order to avoid offset issues
  const sortedWords = [...wordsToHighlight].sort((a, b) => b.index - a.index);
  
  let highlightedText = text;
  
  sortedWords.forEach(({ index, length }) => {
    const beforeText = highlightedText.slice(0, index);
    const wordText = highlightedText.slice(index, index + length);
    const afterText = highlightedText.slice(index + length);
    
    highlightedText = `${beforeText}<span class="${className}">${wordText}</span>${afterText}`;
  });
  
  return highlightedText;
};

// Search utilities using Trie data structure
class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  positions: number[];

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.positions = [];
  }
}

export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(word: string, position: number): void {
    let node = this.root;
    const lowerWord = word.toLowerCase();

    for (const char of lowerWord) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }

    node.isEndOfWord = true;
    node.positions.push(position);
  }

  search(prefix: string): Array<{ word: string; positions: number[] }> {
    const results: Array<{ word: string; positions: number[] }> = [];
    const lowerPrefix = prefix.toLowerCase();
    let node = this.root;

    // Navigate to the prefix
    for (const char of lowerPrefix) {
      if (!node.children.has(char)) {
        return results; // Prefix not found
      }
      node = node.children.get(char)!;
    }

    // DFS to find all words with this prefix
    const dfs = (currentNode: TrieNode, currentWord: string) => {
      if (currentNode.isEndOfWord) {
        results.push({
          word: currentWord,
          positions: [...currentNode.positions],
        });
      }

      for (const [char, childNode] of currentNode.children) {
        dfs(childNode, currentWord + char);
      }
    };

    dfs(node, lowerPrefix);
    return results;
  }

  buildFromText(text: string): void {
    const words = text.match(/\b\w+\b/g) || [];
    
    words.forEach((word, index) => {
      const startIndex = text.indexOf(word, index > 0 ? text.indexOf(words[index - 1]) + words[index - 1].length : 0);
      this.insert(word, startIndex);
    });
  }
}

// API response types
export interface WordLocation {
  word: string;
  index: number;
  length: number;
}

export interface WordExplanation {
  location: WordLocation;
  word: string;
  meaning: string;
  examples: string[];
}

export interface SSEResponse {
  text: string;
  words_info: WordExplanation[];
}

// Error handling utilities
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Debounce utility for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Generate unique IDs
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};
