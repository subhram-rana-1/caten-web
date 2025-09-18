import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { word, meaning, examples } = await request.json();

    if (!word || !meaning || !Array.isArray(examples)) {
      return NextResponse.json(
        { error: 'Invalid request body. Word, meaning, and examples are required.' },
        { status: 400 }
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate additional examples for the word
    const additionalExamples = generateMoreExamples(word.toLowerCase());
    
    // Combine existing examples with new ones
    const allExamples = [...examples, ...additionalExamples];

    return NextResponse.json({
      word,
      meaning,
      examples: allExamples
    });

  } catch (error) {
    console.error('Error generating more explanations:', error);
    return NextResponse.json(
      { error: 'Failed to generate additional explanations. Please try again.' },
      { status: 500 }
    );
  }
}

function generateMoreExamples(word: string): string[] {
  // Additional examples for demonstration
  const moreExamples: Record<string, string[]> = {
    'serendipitous': [
      'The serendipitous encounter with her future business partner happened at a random networking event.',
      'What started as a serendipitous mistake led to a breakthrough in their research.'
    ],
    'manuscript': [
      'The professor carefully examined the medieval manuscript for signs of authenticity.',
      'After years of work, she finally completed the manuscript for her novel.'
    ],
    'sepulchral': [
      'The sepulchral silence in the library was broken only by the turning of pages.',
      'His sepulchral tone made everyone in the room feel uncomfortable.'
    ],
    'cathedral': [
      'The cathedral\'s stained glass windows created beautiful patterns of colored light.',
      'Construction of the cathedral took over two centuries to complete.'
    ],
    'dormant': [
      'The dormant seeds sprouted after the first spring rain.',
      'Her dormant leadership skills emerged when the team needed guidance.'
    ],
    'quantum': [
      'Quantum entanglement allows particles to instantly affect each other across vast distances.',
      'The quantum leap in technology transformed how we process information.'
    ],
    'superposition': [
      'The cat in Schrödinger\'s thought experiment exists in superposition until observed.',
      'Quantum superposition challenges our understanding of reality at the microscopic level.'
    ],
    'counterintuitive': [
      'It\'s counterintuitive that adding more lanes to a highway can sometimes increase traffic.',
      'The counterintuitive solution actually made the problem worse before it got better.'
    ],
    'entrepreneur': [
      'The successful entrepreneur attributed her success to persistence and adaptability.',
      'Every entrepreneur faces the challenge of turning ideas into profitable ventures.'
    ],
    'perspicacious': [
      'The perspicacious investor saw the potential in the startup before others did.',
      'Her perspicacious observations helped the team avoid costly mistakes.'
    ],
    'tenacity': [
      'The mountain climber\'s tenacity was tested during the challenging ascent.',
      'With remarkable tenacity, she pursued her dream despite numerous setbacks.'
    ],
    'tumultuous': [
      'The tumultuous relationship finally came to an end after years of conflict.',
      'During the tumultuous period, many businesses struggled to survive.'
    ],
    'ornithologist': [
      'The ornithologist discovered a new species of bird in the remote rainforest.',
      'Working as an ornithologist requires patience and excellent observation skills.'
    ],
    'meticulous': [
      'The meticulous craftsman spent hours perfecting every detail of the sculpture.',
      'Her meticulous approach to research ensured accurate and reliable results.'
    ],
    'avian': [
      'The avian sanctuary provided a safe haven for injured and orphaned birds.',
      'Climate change is affecting avian migration patterns worldwide.'
    ]
  };

  // Return additional examples or generate generic ones
  const additionalExamples = moreExamples[word] || [
    `In advanced literature, "${word}" often appears in complex contexts.`,
    `Mastering words like "${word}" will significantly improve your English proficiency.`
  ];

  return additionalExamples;
}
