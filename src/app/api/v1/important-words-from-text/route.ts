import { NextRequest, NextResponse } from 'next/server';

interface WordLocation {
  word: string;
  index: number;
  length: number;
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Text is too long. Maximum 10,000 characters allowed.' },
        { status: 400 }
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Find important/difficult words (words with 7+ characters, uncommon words, etc.)
    const importantWords = findImportantWords(text);

    return NextResponse.json({
      text,
      important_words_location: importantWords
    });

  } catch (error) {
    console.error('Error finding important words:', error);
    return NextResponse.json(
      { error: 'Failed to process text. Please try again.' },
      { status: 500 }
    );
  }
}

function findImportantWords(text: string): WordLocation[] {
  // List of commonly difficult/important words for demonstration
  const difficultWords = [
    'serendipitous', 'manuscript', 'sepulchral', 'cathedral', 'dormant', 'parchment',
    'intricate', 'cryptic', 'esoteric', 'quantum', 'superposition', 'simultaneously',
    'counterintuitive', 'profound', 'implications', 'entrepreneur', 'perspicacious',
    'tenacity', 'tumultuous', 'ecosystem', 'skepticism', 'persevered', 'innovative',
    'sustainability', 'ornithologist', 'meticulous', 'avian', 'migration', 'navigational',
    'celestial', 'phenomenon', 'capabilities', 'utilize', 'magnetic', 'remarkable',
    'abandoned', 'revealed', 'centuries', 'fragile', 'illustrations', 'forgotten',
    'rituals', 'knowledge', 'mechanics', 'particles', 'observed', 'principle',
    'challenges', 'classical', 'understanding', 'reality', 'development', 'computing',
    'technologies', 'vision', 'unwavering', 'navigate', 'startup', 'numerous',
    'setbacks', 'investors', 'solution', 'environmental', 'observations', 'patterns',
    'fascinating', 'insights', 'species', 'collected', 'decades', 'fieldwork',
    'contributed', 'significantly', 'magnetic', 'fields', 'journeys'
  ];

  const words: WordLocation[] = [];
  const processedWords = new Set<string>();

  // Find words that are in our difficult words list
  difficultWords.forEach(difficultWord => {
    const regex = new RegExp(`\\b${difficultWord}\\b`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null && words.length < 10) {
      const word = match[0];
      const lowerWord = word.toLowerCase();
      
      // Avoid duplicates
      if (!processedWords.has(lowerWord)) {
        words.push({
          word: lowerWord,
          index: match.index,
          length: word.length
        });
        processedWords.add(lowerWord);
      }
    }
  });

  // If we don't have enough difficult words, add some longer words (7+ characters)
  if (words.length < 8) {
    const wordRegex = /\b[a-zA-Z]{7,}\b/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null && words.length < 10) {
      const word = match[0].toLowerCase();
      
      // Skip if already processed or if it's a common word
      const commonWords = ['through', 'between', 'without', 'because', 'against', 'nothing', 'something', 'anything', 'everything'];
      
      if (!processedWords.has(word) && !commonWords.includes(word)) {
        words.push({
          word,
          index: match.index,
          length: match[0].length
        });
        processedWords.add(word);
      }
    }
  }

  // Sort by index to maintain text order
  return words.sort((a, b) => a.index - b.index).slice(0, 10);
}
