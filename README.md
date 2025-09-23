# Caten Web - English Word Explanation Made Easy with AI ✨

A modern, responsive web application that helps users understand difficult English words through AI-powered explanations, contextual meanings, and example sentences.

![Caten Web App](https://via.placeholder.com/800x400/9527F5/FFFFFF?text=Caten+Web+App)

## 🚀 Features

### Core Functionality
- **Image Text Extraction**: Upload images (JPEG, JPG, PNG, HEIC) and extract text using OCR
- **Smart Word Selection**: AI automatically identifies important/difficult words in text
- **Manual Word Input**: Add specific words you want to learn about
- **Real-time Explanations**: Streaming AI-generated explanations with contextual meanings
- **Interactive Examples**: Get additional example sentences for better understanding
- **Search Functionality**: Find and highlight words in text using efficient Trie data structure

### User Experience
- **Fully Responsive**: Optimized for desktop, tablet, mobile, and e-readers
- **Modern UI**: Clean, elegant design with smooth animations
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation
- **Real-time Feedback**: Loading states, error handling, and success notifications
- **Tab-based Navigation**: Organized workflow with Image → Text → Words → Explanations

### Technical Features
- **Server-Sent Events (SSE)**: Real-time streaming of explanations
- **File Validation**: Secure file upload with type and size validation
- **Error Handling**: Comprehensive error management with user-friendly messages
- **Performance Optimized**: Efficient search algorithms and lazy loading

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom theme system
- **UI Components**: Radix UI primitives with custom styling
- **Animations**: Framer Motion for smooth transitions
- **Icons**: Lucide React
- **Notifications**: Sonner for toast messages
- **State Management**: React hooks with custom state management

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/v1/            # API routes
│   │   ├── image-to-text/
│   │   ├── important-words-from-text/
│   │   ├── words-explanation/
│   │   └── get-more-explanations/
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── tabs/             # Tab-specific components
│   │   ├── ImageTab.tsx
│   │   ├── TextTab.tsx
│   │   ├── WordsTab.tsx
│   │   └── ExplanationsTab.tsx
│   ├── ui/               # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Dialog.tsx
│   │   ├── Tabs.tsx
│   │   └── ...
│   ├── Header.tsx
│   ├── ErrorBanner.tsx
│   ├── ConfirmDialog.tsx
│   └── MainApp.tsx       # Main application component
└── lib/                  # Utilities and configurations
    ├── theme.ts          # Theme configuration
    └── utils.ts          # Utility functions
```

## 🎨 Design System

### Color Palette
- **Primary**: `#9527F5` (Purple)
- **Primary Light**: `#EDDCFC` (Light Purple for badges)
- **Background**: `#FFFFFF` (White)
- **Success**: `#10B981` (Green)
- **Error**: `#EF4444` (Red)
- **Warning**: `#F59E0B` (Amber)

### Typography
- **Font Family**: Inter (with system fallbacks)
- **Font Sizes**: Responsive scale from 12px to 36px
- **Font Weights**: 400 (normal) to 700 (bold)

### Spacing & Layout
- **Spacing Scale**: 4px base unit (xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px)
- **Border Radius**: Consistent rounded corners (sm: 4px to 2xl: 16px)
- **Breakpoints**: Mobile-first responsive design

## 📱 User Flow

### 1. Image Tab (Default Landing)
- Upload image via drag & drop or file browser
- Validate file type and size (max 5MB)
- Extract text using OCR
- Auto-switch to Text tab with extracted text

### 2. Text Tab
- View extracted or manually entered text
- Search for specific words with real-time highlighting
- Double-click words to select them for explanation
- Read-only mode when explanations exist

### 3. Words Tab
- Manually add words for explanation
- View selected word tokens with remove option
- Bulk explain selected words

### 4. Explanations Tab
- Real-time streaming of word explanations
- Sort by complexity or alphabetical order
- Expand/collapse explanation cards
- Get additional examples for each word
- Click words to navigate back to text

## 🔧 API Endpoints

### POST `/api/v1/image-to-text`
Extract text from uploaded images.

**Request**: `multipart/form-data`
```
file: Image file (JPEG, JPG, PNG, HEIC)
```

**Response**:
```json
{
  "text": "Extracted text here"
}
```

### POST `/api/v1/important-words-from-text`
Identify important/difficult words in text.

**Request**:
```json
{
  "text": "Your paragraph here"
}
```

**Response**:
```json
{
  "text": "Original text",
  "important_words_location": [
    {
      "word": "serendipitous",
      "index": 4,
      "length": 13
    }
  ]
}
```

### POST `/api/v1/words-explanation`
Get streaming explanations for words (Server-Sent Events).

**Request**:
```json
{
  "text": "Context text",
  "important_words_location": [...]
}
```

**Response**: `text/event-stream`
```
data: {"text": "...", "words_info": [...]}
data: [DONE]
```

### POST `/api/v1/get-more-explanations`
Get additional examples for a word.

**Request**:
```json
{
  "word": "target word",
  "meaning": "contextual meaning",
  "examples": ["example 1", "example 2"]
}
```

**Response**:
```json
{
  "word": "target word",
  "meaning": "contextual meaning",
  "examples": ["example 1", "example 2", "new example 1", "new example 2"]
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd caten-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 🔮 Future Enhancements

### Planned Features
- **Real OCR Integration**: Google Vision API, AWS Textract, or Tesseract.js
- **AI Language Model**: Integration with OpenAI GPT, Claude, or local LLMs
- **Multi-language Support**: Support for multiple languages
- **User Accounts**: Save progress and personal vocabulary
- **Vocabulary Tests**: Interactive quizzes based on learned words
- **Export Options**: PDF, CSV, or Anki flashcard export
- **Offline Mode**: PWA capabilities for offline usage

### Technical Improvements
- **Caching**: Redis caching for API responses
- **Rate Limiting**: Advanced rate limiting with Redis
- **Analytics**: User behavior tracking and analytics
- **A/B Testing**: Feature flag system for testing
- **Performance**: Image optimization and CDN integration

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use the existing component patterns
- Maintain responsive design principles
- Add proper error handling
- Include appropriate animations
- Write clear commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Design Inspiration**: Modern educational platforms
- **UI Components**: Radix UI for accessible primitives
- **Icons**: Lucide React for beautiful icons
- **Animations**: Framer Motion for smooth interactions
- **Styling**: Tailwind CSS for efficient styling

## 📞 Support

For support, email support@caten.in or join our Discord community.
