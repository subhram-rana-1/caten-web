import { NextRequest } from 'next/server';

interface WordLocation {
  word: string;
  index: number;
  length: number;
}

interface WordExplanation {
  location: WordLocation;
  word: string;
  meaning: string;
  examples: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { text, important_words_location } = await request.json();

    if (!text || !important_words_location || !Array.isArray(important_words_location)) {
      return new Response(
        'data: {"error": "Invalid request body"}\n\n',
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Process each word with a delay to simulate streaming
          for (let i = 0; i < important_words_location.length; i++) {
            const wordLocation = important_words_location[i];
            
            // Generate explanation for the word
            const explanation = await generateWordExplanation(wordLocation, text);
            
            // Send the explanation as SSE data
            const response = {
              text,
              words_info: [explanation]
            };
            
            const data = `data: ${JSON.stringify(response)}\n\n`;
            controller.enqueue(encoder.encode(data));
            
            // Add delay between explanations
            if (i < important_words_location.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Error in streaming:', error);
          const errorData = `data: {"error": "Failed to generate explanations"}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error in words-explanation API:', error);
    return new Response(
      'data: {"error": "Internal server error"}\n\n',
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
}

async function generateWordExplanation(wordLocation: WordLocation, context: string): Promise<WordExplanation> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Dictionary of word explanations for demonstration
  const explanations: Record<string, { meaning: string; examples: string[] }> = {
    'serendipitous': {
      meaning: 'Serendipitous means occurring or discovered by chance in a happy or beneficial way.',
      examples: [
        'The serendipitous meeting at the coffee shop led to a lifelong friendship.',
        'Her serendipitous discovery of the old book changed her research direction.'
      ]
    },
    'manuscript': {
      meaning: 'A manuscript is a handwritten or typed document, especially an author\'s original copy of a book before it is published.',
      examples: [
        'The ancient manuscript contained valuable historical information.',
        'She submitted her manuscript to several publishers.'
      ]
    },
    'sepulchral': {
      meaning: 'Sepulchral means relating to a tomb or burial, or having a gloomy or dismal atmosphere.',
      examples: [
        'The sepulchral atmosphere of the old cemetery was quite unsettling.',
        'His sepulchral voice echoed through the empty hallway.'
      ]
    },
    'cathedral': {
      meaning: 'A cathedral is a large and important church, typically the main church of a diocese.',
      examples: [
        'The Gothic cathedral dominated the city skyline.',
        'Tourists from around the world visit the famous cathedral.'
      ]
    },
    'dormant': {
      meaning: 'Dormant means temporarily inactive or not in use, lying asleep or as if asleep.',
      examples: [
        'The volcano had been dormant for over a century.',
        'Her artistic talents remained dormant until she took the painting class.'
      ]
    },
    'quantum': {
      meaning: 'Quantum refers to the smallest possible discrete unit of any physical property, often used in physics.',
      examples: [
        'Quantum mechanics explains the behavior of particles at the atomic level.',
        'The quantum computer could revolutionize data processing.'
      ]
    },
    'superposition': {
      meaning: 'Superposition is the ability of a quantum system to be in multiple states at the same time until it is measured.',
      examples: [
        'In quantum superposition, a particle can exist in multiple states simultaneously.',
        'The principle of superposition is fundamental to quantum computing.'
      ]
    },
    'counterintuitive': {
      meaning: 'Counterintuitive means contrary to intuition or to common-sense expectation.',
      examples: [
        'The results of the experiment were counterintuitive and surprised the researchers.',
        'It seems counterintuitive, but sometimes slowing down can help you arrive faster.'
      ]
    },
    'entrepreneur': {
      meaning: 'An entrepreneur is a person who organizes and operates a business, taking on financial risks to do so.',
      examples: [
        'The young entrepreneur started her company with just a small loan.',
        'Many entrepreneurs fail before they succeed in their ventures.'
      ]
    },
    'perspicacious': {
      meaning: 'Perspicacious means having a ready insight into and understanding of things; shrewd.',
      examples: [
        'Her perspicacious analysis of the market trends impressed the investors.',
        'The perspicacious detective quickly solved the complex case.'
      ]
    },
    'tenacity': {
      meaning: 'Tenacity is the quality or fact of being able to grip something firmly; persistence.',
      examples: [
        'His tenacity in pursuing his goals eventually paid off.',
        'The team\'s tenacity helped them overcome numerous obstacles.'
      ]
    },
    'tumultuous': {
      meaning: 'Tumultuous means making a loud, confused noise; uproarious, or very confused or uncertain.',
      examples: [
        'The tumultuous crowd cheered as their team won the championship.',
        'She lived through tumultuous times during the economic crisis.'
      ]
    },
    'ornithologist': {
      meaning: 'An ornithologist is a scientist who studies birds.',
      examples: [
        'The ornithologist spent years studying migration patterns of arctic terns.',
        'As an ornithologist, she could identify birds by their songs alone.'
      ]
    },
    'meticulous': {
      meaning: 'Meticulous means showing great attention to detail; very careful and precise.',
      examples: [
        'Her meticulous planning ensured the event went smoothly.',
        'The meticulous scientist recorded every detail of the experiment.'
      ]
    },
    'avian': {
      meaning: 'Avian means relating to birds.',
      examples: [
        'The avian flu outbreak affected poultry farms across the region.',
        'His research focused on avian behavior during mating season.'
      ]
    }
  };

  const word = wordLocation.word.toLowerCase();
  const explanation = explanations[word] || {
    meaning: `${word.charAt(0).toUpperCase() + word.slice(1)} is an advanced English word that requires contextual understanding to fully grasp its meaning and usage.`,
    examples: [
      `The word "${word}" is commonly used in academic and professional contexts.`,
      `Understanding "${word}" will enhance your vocabulary and communication skills.`
    ]
  };

  return {
    location: wordLocation,
    word,
    meaning: explanation.meaning,
    examples: explanation.examples
  };
}
