import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, JPG, PNG, or HEIC files.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // For demo purposes, we'll return some sample extracted text
    // In a real implementation, you would use an OCR service like:
    // - Google Cloud Vision API
    // - AWS Textract
    // - Azure Computer Vision
    // - Tesseract.js for client-side processing
    
    const sampleTexts = [
      "The serendipitous discovery of the ancient manuscript in the sepulchral chamber of the abandoned cathedral revealed secrets that had been dormant for centuries. The parchment, though fragile and yellowed with age, contained intricate illustrations and cryptic text that spoke of forgotten rituals and esoteric knowledge.",
      "In the realm of quantum mechanics, the phenomenon of superposition allows particles to exist in multiple states simultaneously until observed. This counterintuitive principle challenges our classical understanding of reality and has profound implications for the development of quantum computing technologies.",
      "The entrepreneur's perspicacious vision and unwavering tenacity enabled her to navigate the tumultuous waters of the startup ecosystem. Despite numerous setbacks and the skepticism of investors, she persevered with her innovative solution to environmental sustainability.",
      "The ornithologist's meticulous observations of avian migration patterns revealed fascinating insights into the navigational capabilities of various species. The data collected over decades of fieldwork contributed significantly to our understanding of how birds utilize magnetic fields and celestial cues for their remarkable journeys."
    ];

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Return a random sample text for demonstration
    const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];

    return NextResponse.json({
      text: randomText
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image. Please try again.' },
      { status: 500 }
    );
  }
}
