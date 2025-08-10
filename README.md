# 🇺🇸 US Citizenship Test App

A comprehensive study tool for the US citizenship test featuring all 100 official USCIS civics questions.

## Features

- ✅ All 100 official USCIS civics questions (2008 version)
- 🧠 RAG-enhanced AI explanations with contextual information for each question
- 🇵🇹 Portuguese translations (European Portuguese)
- 🔊 Text-to-speech support in both languages
- 💾 Offline caching for better performance
- 📱 Progressive Web App (PWA) support
- 🔍 Search functionality

## RAG-Enhanced Explanations

This app features comprehensive Retrieval-Augmented Generation (RAG) functionality that provides:
- Context-aware explanations with historical background
- Current factual information and legal foundations
- Real-world applications and examples
- Connections to related civics concepts
- Enhanced understanding beyond basic answers

## Setup

1. Get a Venice API key from [venice.ai](https://venice.ai)
2. Replace `YOUR_API_KEY_HERE` in `main.js` with your actual API key
3. Open `index.html` in a web browser

## Usage

- Click on any question to expand and see the answer
- Use "Load Enhanced AI Explanation" to get detailed, context-aware explanations with historical background and current information
- Switch between English and Portuguese using the language tabs
- Use text-to-speech to hear questions and answers
- Search for specific topics using the search bar

## Technologies Used

- Vanilla JavaScript
- IndexedDB for caching
- Venice AI API for explanations and translations
- Web Speech API for text-to-speech
- Service Worker for offline functionality

## License

MIT License - Feel free to use and modify for educational purposes.