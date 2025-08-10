# 🇺🇸 US Citizenship Test App

A comprehensive study tool for the US citizenship test featuring all 100 official USCIS civics questions with enhanced AI-powered web search capabilities.

## Features

- ✅ All 100 official USCIS civics questions (2008 version)
- 🤖 AI-powered explanations for each question
- 🌐 **NEW: Web search-enhanced answers for current information**
- 🔍 **NEW: Automatic current data retrieval for time-sensitive questions**
- 🇵🇹 Portuguese translations (European Portuguese)
- 🔊 Text-to-speech support in both languages
- 💾 Offline caching for better performance
- 📱 Progressive Web App (PWA) support
- 🔍 Search functionality

## Enhanced Web Search Features

This app now automatically detects questions that refer to current information (like current President, Vice President, Supreme Court justices, etc.) and attempts to retrieve the most up-to-date answers using web search-enabled AI models.

### Questions with Enhanced Current Information:
- Q28: Current President name
- Q29: Current Vice President name  
- Q39: Number of Supreme Court justices
- Q40: Current Chief Justice name
- Q46: President's political party
- Q47: Current Speaker of the House name

When you view these questions, the app will:
1. Attempt to retrieve current information via web search
2. Display the most recent data available
3. Provide enhanced explanations with current context
4. Fallback to standard answers with verification notes if web search is unavailable

## Setup

1. Get a Venice API key from [venice.ai](https://venice.ai)
2. Replace `YOUR_API_KEY_HERE` in `main.js` with your actual API key
3. Open `index.html` in a web browser

## Usage

- Click on any question to expand and see the answer
- Questions referring to current information will show enhanced, up-to-date answers
- Use "Load AI Explanation" to get detailed explanations (enhanced with current context for time-sensitive questions)
- Switch between English and Portuguese using the language tabs
- Use text-to-speech to hear questions and answers (includes current information)
- Search for specific topics using the search bar

## Technologies Used

- Vanilla JavaScript
- IndexedDB for caching
- Venice AI API for explanations, translations, and web search
- Web Speech API for text-to-speech
- Service Worker for offline functionality
- **NEW: Web search integration for current information retrieval**

## Web Search Implementation

The application uses multiple Venice AI models with web search capabilities:
- Claude 3 Sonnet and Haiku models
- GPT-4o and GPT-4 Turbo models
- Intelligent fallback to standard models with enhanced prompting

## License

MIT License - Feel free to use and modify for educational purposes.