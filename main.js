// Venice API key and base URL
const VENICE_API_KEY = 'tVozjVA4xBjBB_p5NkAMsWlO73ZzaVGHedT17sCpKM';
const VENICE_BASE = 'https://api.venice.ai/api/v1';

// Translation Service for European Portuguese
class TranslationService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.customInstruction = 'Translate to European Portuguese (NOT Brazilian Portuguese)';
  }

  async translateToEuropeanPortuguese(englishText) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'venice-uncensored',
          messages: [{ 
            role: 'user', 
            content: `${this.customInstruction}. ${englishText}` 
          }],
          temperature: 0.7,
          max_completion_tokens: 500
        })
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      const translation = data.choices[0].message.content;
      
      if (!this.validateTranslation(translation)) {
        throw new Error('Translation validation failed');
      }

      return translation;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  async getCachedTranslation(questionId) {
    if (!db) return null;
    
    return new Promise(resolve => {
      try {
        const tx = db.transaction('translations', 'readonly');
        const store = tx.objectStore('translations');
        const req = store.get(questionId);
        req.onsuccess = () => {
          const result = req.result;
          if (result && result.data) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = (e) => {
          console.error('Cache retrieval error:', e);
          resolve(null);
        };
      } catch (e) {
        console.error('Cache retrieval error:', e);
        resolve(null);
      }
    });
  }

  async cacheTranslation(questionId, translation) {
    if (!db) return;
    
    return new Promise(resolve => {
      try {
        const tx = db.transaction('translations', 'readwrite');
        const store = tx.objectStore('translations');
        const req = store.put({ 
          id: questionId, 
          data: translation,
          timestamp: Date.now()
        });
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => {
          console.error('Failed to cache translation:', e);
          resolve(false);
        };
      } catch (e) {
        console.error('Failed to cache translation:', e);
        resolve(false);
      }
    });
  }

  validateTranslation(translation) {
    // Basic validation - ensure translation is not empty and contains text
    return translation && 
           typeof translation === 'string' && 
           translation.trim().length > 0 &&
           translation.toLowerCase() !== 'translation not available';
  }

  async translateQuestionAndAnswer(question, answer) {
    const questionAndAnswer = `Question: ${question}\nAnswer: ${answer}`;
    return await this.translateToEuropeanPortuguese(questionAndAnswer);
  }

  async translateExplanation(explanation) {
    const prompt = `Translate this US citizenship explanation to European Portuguese, keeping it educational and clear: ${explanation}`;
    return await this.translateToEuropeanPortuguese(prompt);
  }

  async formatForEuropeanPortugueseTTS(portugueseText) {
    // Create a cache key based on the text content
    const cacheKey = `tts_${this.hashString(portugueseText)}`;
    
    // Check for cached formatted text first
    const cachedFormatted = await this.getCachedTTSFormatted(cacheKey);
    if (cachedFormatted) {
      console.log('Using cached TTS-formatted text');
      return cachedFormatted;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'venice-uncensored',
          messages: [
            { 
              role: 'system', 
              content: `You are a European Portuguese language expert. Your task is to reformat text to ensure it will be pronounced correctly by a text-to-speech system in European Portuguese (Portugal Portuguese), NOT Brazilian Portuguese.

Key differences to emphasize:
- Use European Portuguese vocabulary and expressions
- Ensure proper European Portuguese pronunciation patterns
- Replace any Brazilian Portuguese terms with European Portuguese equivalents
- Format the text to sound natural when spoken by a European Portuguese TTS voice
- Maintain the original meaning while optimizing for European Portuguese speech synthesis

Return ONLY the reformatted text, nothing else.` 
            },
            { 
              role: 'user', 
              content: `Reformat this Portuguese text to ensure it will be pronounced correctly in European Portuguese (Portugal) by a TTS system:

${portugueseText}` 
            }
          ],
          temperature: 0.3,
          max_completion_tokens: 600
        })
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      if (!response.ok) {
        throw new Error(`TTS formatting API error: ${response.status}`);
      }

      const data = await response.json();
      const formattedText = data.choices[0].message.content.trim();
      
      console.log('Original Portuguese text:', portugueseText.substring(0, 100) + '...');
      console.log('Formatted for European Portuguese TTS:', formattedText.substring(0, 100) + '...');
      
      // Cache the formatted text
      await this.cacheTTSFormatted(cacheKey, formattedText);
      
      return formattedText;
    } catch (error) {
      console.error('TTS formatting error:', error);
      // Fallback to original text if formatting fails
      return portugueseText;
    }
  }

  async getCachedTTSFormatted(cacheKey) {
    if (!db) return null;
    
    return new Promise(resolve => {
      try {
        const tx = db.transaction('tts_formatted', 'readonly');
        const store = tx.objectStore('tts_formatted');
        const req = store.get(cacheKey);
        req.onsuccess = () => {
          const result = req.result;
          if (result && result.data) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = (e) => {
          console.error('TTS cache retrieval error:', e);
          resolve(null);
        };
      } catch (e) {
        console.error('TTS cache retrieval error:', e);
        resolve(null);
      }
    });
  }

  async cacheTTSFormatted(cacheKey, formattedText) {
    if (!db) return;
    
    return new Promise(resolve => {
      try {
        const tx = db.transaction('tts_formatted', 'readwrite');
        const store = tx.objectStore('tts_formatted');
        const req = store.put({ 
          id: cacheKey, 
          data: formattedText,
          timestamp: Date.now()
        });
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => {
          console.error('Failed to cache TTS formatted text:', e);
          resolve(false);
        };
      } catch (e) {
        console.error('Failed to cache TTS formatted text:', e);
        resolve(false);
      }
    });
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}

// RAG Service for enhanced explanations with contextual information
class RAGService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async retrieveContextualInformation(question, answer) {
    try {
      console.log(`Retrieving contextual information for question: ${question.substring(0, 50)}...`);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'venice-uncensored',
          messages: [{ 
            role: 'system', 
            content: `You are a US citizenship expert with access to current information about US civics, history, and government. Your task is to retrieve and provide relevant contextual information that would help someone understand a citizenship test question better.

Focus on:
- Historical context and background
- Current relevant facts and figures
- Legal and constitutional foundations
- Real-world applications and examples
- Connections to other civics concepts

Provide comprehensive, factual information that goes beyond basic explanations.` 
          }, {
            role: 'user', 
            content: `Retrieve comprehensive contextual information for this US citizenship question and answer:

Question: ${question}
Answer: ${answer}

Provide detailed background information, historical context, current facts, legal foundations, and relevant examples that would help someone deeply understand this topic. Include specific dates, numbers, and examples where applicable.` 
          }],
          temperature: 0.3,
          max_completion_tokens: 600
        })
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      if (!response.ok) {
        throw new Error(`RAG retrieval API error: ${response.status}`);
      }

      const data = await response.json();
      const contextualInfo = data.choices[0].message.content;
      
      console.log('Retrieved contextual information:', contextualInfo.substring(0, 100) + '...');
      return contextualInfo;
    } catch (error) {
      console.error('RAG retrieval error:', error);
      throw error;
    }
  }

  async generateRAGExplanation(question, answer, contextualInfo) {
    try {
      console.log(`Generating RAG-enhanced explanation for: ${question.substring(0, 50)}...`);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'venice-uncensored',
          messages: [{ 
            role: 'system', 
            content: `You are a US citizenship test expert who creates comprehensive, educational explanations by combining the official answer with relevant contextual information. 

Create an explanation that:
- Clearly explains why the answer is correct
- Incorporates relevant contextual information naturally
- Provides helpful background and examples
- Is educational and easy to understand
- Goes beyond generic responses with specific, factual details
- Helps the student remember and understand the concept

Keep the explanation concise but comprehensive, suitable for citizenship test preparation.` 
          }, {
            role: 'user', 
            content: `Create a comprehensive explanation for this US citizenship question using the provided contextual information:

Question: ${question}
Official Answer: ${answer}

Contextual Information:
${contextualInfo}

Generate a well-structured, educational explanation that combines the official answer with the contextual information to help someone studying for the citizenship test.` 
          }],
          temperature: 0.4,
          max_completion_tokens: 400
        })
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }

      if (!response.ok) {
        throw new Error(`RAG generation API error: ${response.status}`);
      }

      const data = await response.json();
      const ragExplanation = data.choices[0].message.content;
      
      console.log('Generated RAG explanation:', ragExplanation.substring(0, 100) + '...');
      return ragExplanation;
    } catch (error) {
      console.error('RAG explanation generation error:', error);
      throw error;
    }
  }

  async getCachedRAGData(questionId) {
    if (!db) return null;
    
    return new Promise(resolve => {
      try {
        const tx = db.transaction('rag_explanations', 'readonly');
        const store = tx.objectStore('rag_explanations');
        const req = store.get(questionId);
        req.onsuccess = () => {
          const result = req.result;
          if (result && result.data) {
            console.log(`Retrieved cached RAG data for question ${questionId}`);
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        req.onerror = (e) => {
          console.error('RAG cache retrieval error:', e);
          resolve(null);
        };
      } catch (e) {
        console.error('RAG cache retrieval error:', e);
        resolve(null);
      }
    });
  }

  async cacheRAGData(questionId, ragData) {
    if (!db) return;
    
    return new Promise(resolve => {
      try {
        const tx = db.transaction('rag_explanations', 'readwrite');
        const store = tx.objectStore('rag_explanations');
        const req = store.put({ 
          id: questionId, 
          data: ragData,
          timestamp: Date.now()
        });
        req.onsuccess = () => {
          console.log(`Cached RAG data for question ${questionId}`);
          resolve(true);
        };
        req.onerror = (e) => {
          console.error('Failed to cache RAG data:', e);
          resolve(false);
        };
      } catch (e) {
        console.error('Failed to cache RAG data:', e);
        resolve(false);
      }
    });
  }

  async generateEnhancedExplanation(question, answer, questionId) {
    try {
      // Check cache first
      const cachedRAGData = await this.getCachedRAGData(questionId);
      if (cachedRAGData) {
        console.log(`Using cached RAG explanation for question ${questionId}`);
        return cachedRAGData;
      }

      // Step 1: Retrieve contextual information
      const contextualInfo = await this.retrieveContextualInformation(question, answer);
      
      // Step 2: Generate RAG-enhanced explanation
      const ragExplanation = await this.generateRAGExplanation(question, answer, contextualInfo);
      
      // Step 3: Cache the result
      const ragData = {
        explanation: ragExplanation,
        contextualInfo: contextualInfo,
        timestamp: Date.now()
      };
      
      await this.cacheRAGData(questionId, ragData);
      
      return ragData;
    } catch (error) {
      console.error('Enhanced explanation generation error:', error);
      throw error;
    }
  }
}

// Initialize services
const translationService = new TranslationService(VENICE_API_KEY, VENICE_BASE);
const ragService = new RAGService(VENICE_API_KEY, VENICE_BASE);

// Test services initialization
console.log('Translation service initialized with European Portuguese support');
console.log('RAG service initialized for enhanced contextual explanations');

// Questions array - will be populated from JSON file
let questions = [];

// Transform question from JSON format to current format
function transformQuestion(jsonQuestion) {
  return {
    id: jsonQuestion.id,
    question: jsonQuestion.question,
    answer: jsonQuestion.answers[0] // Use only the first answer instead of joining all answers
  };
}

// Load all 100 USCIS Civics Questions from JSON file
async function loadQuestionsFromJSON() {
  try {
    console.log('Loading questions from JSON file...');
    const response = await fetch('./questions.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load questions.json: ${response.status} ${response.statusText}`);
    }
    
    const jsonQuestions = await response.json();
    
    // Validate and transform questions
    const validQuestions = [];
    for (const jsonQuestion of jsonQuestions) {
      // Validate required fields
      if (jsonQuestion.id && jsonQuestion.question && jsonQuestion.answers && Array.isArray(jsonQuestion.answers)) {
        validQuestions.push(transformQuestion(jsonQuestion));
      } else {
        console.warn('Invalid question data:', jsonQuestion);
      }
    }
    
    if (validQuestions.length === 0) {
      throw new Error('No valid questions found in JSON file');
    }
    
    console.log(`Successfully loaded ${validQuestions.length} questions from JSON file`);
    return validQuestions;
    
  } catch (error) {
    console.error('Error loading questions from JSON:', error);
    
    // Provide user-friendly error message
    const errorMessage = error.message.includes('Failed to fetch') 
      ? 'Unable to load questions. Please check your internet connection and try refreshing the page.'
      : `Error loading questions: ${error.message}`;
    
    // Display error to user
    const questionsContainer = document.getElementById('questions');
    if (questionsContainer) {
      questionsContainer.innerHTML = `
        <li style="text-align: center; padding: 40px; color: #c0392b; background: #fee; border-radius: 8px; border-left: 3px solid #c0392b;">
          <strong>Error Loading Questions</strong><br>
          ${errorMessage}<br>
          <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #c0392b; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Try Again
          </button>
        </li>
      `;
    }
    
    throw error;
  }
}

// Cache DB (IndexedDB for sustainability)
let db;
const request = indexedDB.open('CitizenshipDB', 4);
request.onupgradeneeded = (e) => {
  db = e.target.result;
  const oldVersion = e.oldVersion;
  
  // Create explanations store if it doesn't exist
  if (!db.objectStoreNames.contains('explanations')) {
    db.createObjectStore('explanations', { keyPath: 'id' });
  }
  
  // Create translations store for Portuguese translations
  if (oldVersion < 2 && !db.objectStoreNames.contains('translations')) {
    const translationsStore = db.createObjectStore('translations', { keyPath: 'id' });
    translationsStore.createIndex('timestamp', 'timestamp', { unique: false });
  }
  
  // Create TTS formatted text store for European Portuguese
  if (!db.objectStoreNames.contains('tts_formatted')) {
    const ttsStore = db.createObjectStore('tts_formatted', { keyPath: 'id' });
    ttsStore.createIndex('timestamp', 'timestamp', { unique: false });
  }
  
  // Create RAG explanations store for enhanced contextual explanations
  if (!db.objectStoreNames.contains('rag_explanations')) {
    const ragStore = db.createObjectStore('rag_explanations', { keyPath: 'id' });
    ragStore.createIndex('timestamp', 'timestamp', { unique: false });
    console.log('Created RAG explanations store in IndexedDB');
  }
};
request.onsuccess = async (e) => { 
  db = e.target.result; 
  
  // Load questions from JSON file first
  try {
    questions = await loadQuestionsFromJSON();
    loadQuestions(); 
  } catch (error) {
    console.error('Failed to load questions:', error);
    // Error message is already displayed by loadQuestionsFromJSON
  }
};
request.onerror = async (e) => {
  console.error('IndexedDB error:', e);
  
  // Load questions anyway, even if IndexedDB fails
  try {
    questions = await loadQuestionsFromJSON();
    loadQuestions(); 
  } catch (error) {
    console.error('Failed to load questions:', error);
    // Error message is already displayed by loadQuestionsFromJSON
  }
};

// Simple fuzzy search function
function fuzzySearch(query, questions) {
  if (!query) return questions;
  
  const searchTerms = query.toLowerCase().split(' ');
  return questions.filter(q => {
    const questionText = q.question.toLowerCase();
    return searchTerms.some(term => questionText.includes(term));
  }).sort((a, b) => {
    // Sort by relevance - exact matches first
    const aExact = a.question.toLowerCase().includes(query.toLowerCase());
    const bExact = b.question.toLowerCase().includes(query.toLowerCase());
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return 0;
  });
}

// Load questions
function loadQuestions(query = '') {
  const ul = document.getElementById('questions');
  ul.innerHTML = '';
  
  let filtered = query ? fuzzySearch(query, questions) : questions;
  
  if (filtered.length === 0) {
    ul.innerHTML = '<li style="text-align: center; padding: 40px; color: #7f8c8d;">No questions found. Try a different search term.</li>';
    return;
  }
  
  filtered.forEach(q => {
    const li = document.createElement('li');
    li.className = 'question';
    li.innerHTML = `
      <div class="question-title">
        <span class="question-number">${q.id}.</span>${q.question}
      </div>
      <div class="details">
        <div class="answer">Answer: ${q.answer}</div>
        <div class="explanation" id="explanation-${q.id}">
          <em>Click to load enhanced AI explanation with contextual information...</em>
        </div>
        <div class="tabs">
          <div class="tab active" data-lang="en" data-id="${q.id}">English</div>
          <div class="tab" data-lang="pt" data-id="${q.id}">Portuguese</div>
        </div>
        <div class="button-group">
          <button data-action="load-explanation" data-id="${q.id}" id="load-btn-${q.id}">
            🧠 Load Enhanced AI Explanation
          </button>
          <button data-action="play-tts" data-id="${q.id}" data-lang="en" id="tts-en-${q.id}">
            🔊 Play English
          </button>
          <button data-action="play-tts" data-id="${q.id}" data-lang="pt" id="tts-pt-${q.id}">
            🔊 Play Portuguese
          </button>
        </div>
        <audio id="audio-${q.id}" controls style="display: none;"></audio>
        <div id="error-${q.id}"></div>
      </div>
    `;
    
    // Debug: Log the generated HTML to verify no onclick attributes (commented out to reduce console noise)
    // console.log('Generated HTML for question', q.id, ':', li.innerHTML.substring(0, 200));
    
    li.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') {
        const action = e.target.dataset.action;
        const id = parseInt(e.target.dataset.id);
        const lang = e.target.dataset.lang;
        
        if (action === 'load-explanation') {
          window.loadExplanation(id);
        } else if (action === 'play-tts') {
          window.playTTS(id, lang);
        }
      } else if (e.target.tagName !== 'AUDIO' && !e.target.classList.contains('tab')) {
        window.toggleExpand(li, q.id);
      }
    });
    
    ul.appendChild(li);
  });
}

// Toggle expand - explicitly attach to window for global access
window.toggleExpand = function toggleExpand(li, id) {
  li.classList.toggle('expanded');
}



// Load explanation - explicitly attach to window for global access
async function loadExplanation(id) {
  const loadBtn = document.getElementById(`load-btn-${id}`);
  const explanationDiv = document.getElementById(`explanation-${id}`);
  
  loadBtn.innerHTML = '<span class="loading"></span>Loading...';
  loadBtn.disabled = true;
  
  try {
    let data = await getCached(id);
    if (!data) {
      data = await generateExplanations(id);
      if (data) {
        await cacheData(id, data);
      }
    }
    
    if (data) {
      showExplanation(explanationDiv, data, 'en');
      setupTabs(id, data);
      loadBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading explanation:', error);
    showError(id, 'Failed to load explanation. Please try again.');
    loadBtn.innerHTML = '🧠 Load Enhanced AI Explanation';
    loadBtn.disabled = false;
  }
}

// Attach loadExplanation to window for global access
window.loadExplanation = loadExplanation;

// Generate explanations via Venice chat with RAG enhancement
async function generateExplanations(id) {
  const q = questions.find(q => q.id === id);
  if (!q) return null;
  
  try {
    // Use RAG service for enhanced explanations
    console.log(`Generating enhanced RAG explanation for question ${id}`);
    const ragData = await ragService.generateEnhancedExplanation(q.question, q.answer, id);
    const enExp = ragData.explanation;

    // European Portuguese translation using TranslationService
    let ptExp;
    try {
      // Check for cached translation first
      const cachedTranslation = await translationService.getCachedTranslation(id);
      if (cachedTranslation) {
        console.log(`Using cached Portuguese translation for question ${id}`);
        ptExp = cachedTranslation;
      } else {
        console.log(`Generating new Portuguese translation for question ${id}`);
        // Generate new translation using the RAG-enhanced explanation
        ptExp = await translationService.translateExplanation(enExp);
        // Cache the translation
        await translationService.cacheTranslation(id, ptExp);
        console.log(`Cached Portuguese translation for question ${id}`);
      }
    } catch (error) {
      console.warn('Portuguese translation failed:', error);
      ptExp = 'Translation not available. Please try again.';
    }

    return { en: enExp, pt: ptExp };
  } catch (err) {
    console.error('RAG API Error:', err);
    
    // Fallback to basic explanation if RAG fails
    console.log('Falling back to basic explanation generation');
    try {
      const enResp = await fetch(`${VENICE_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${VENICE_API_KEY}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'venice-uncensored',
          messages: [{ 
            role: 'user', 
            content: `Provide a clear, educational explanation for this US citizenship question and answer. Keep it concise but informative, suitable for someone studying for the citizenship test:

Question: ${q.question}
Answer: ${q.answer}

Please explain why this answer is correct and provide helpful context.` 
          }],
          temperature: 0.7,
          max_completion_tokens: 300
        })
      });
      
      if (enResp.ok) {
        const enData = await enResp.json();
        const enExp = enData.choices[0].message.content;
        
        // Generate Portuguese translation for fallback explanation
        let ptExp;
        try {
          ptExp = await translationService.translateExplanation(enExp);
        } catch (error) {
          ptExp = 'Translation not available. Please try again.';
        }
        
        return { en: enExp, pt: ptExp };
      } else {
        throw err;
      }
    } catch (fallbackErr) {
      console.error('Fallback explanation also failed:', fallbackErr);
      throw err;
    }
  }
}

// Play TTS via Venice - explicitly attach to window for global access  
async function playTTS(id, lang) {
  const button = document.getElementById(`tts-${lang}-${id}`);
  button.innerHTML = '<span class="loading"></span>Generating...';
  button.disabled = true;
  
  try {
    // Get the question and answer
    const q = questions.find(q => q.id === parseInt(id));
    if (!q) {
      throw new Error('Question not found');
    }
    
    // Prepare the text to speak
    let text;
    
    // Check if we have a cached explanation
    const data = await getCached(id);
    
    if (data && lang === 'en' && data.en) {
      // Use cached English explanation
      text = data.en;
    } else if (data && lang === 'pt' && data.pt) {
      // Use cached Portuguese explanation
      text = data.pt;
    } else {
      // No cached explanation, use question and answer
      if (lang === 'en') {
        text = `Question: ${q.question} Answer: ${q.answer}`;
      } else {
        // For Portuguese, translate on the fly using TranslationService
        try {
          text = await translationService.translateQuestionAndAnswer(q.question, q.answer);
        } catch (error) {
          throw new Error(`Translation failed: ${error.message}`);
        }
      }
    }
    
    // For Portuguese, format the text for European Portuguese TTS
    if (lang === 'pt') {
      console.log('Formatting Portuguese text for European Portuguese TTS...');
      text = await translationService.formatForEuropeanPortugueseTTS(text);
    }
    
    // Set the voice based on language
    const voice = lang === 'en' ? 'af_sky' : 'pf_dora';
    
    // Call the TTS API
    const resp = await fetch(`${VENICE_BASE}/audio/speech`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${VENICE_API_KEY}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        input: text, 
        model: 'tts-kokoro', 
        voice: voice, 
        response_format: 'mp3', 
        speed: 1 
      })
    });
    
    if (resp.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    
    if (!resp.ok) {
      throw new Error(`TTS API error: ${resp.status}`);
    }
    
    // Process the audio response
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = document.getElementById(`audio-${id}`);
    audio.src = url;
    audio.style.display = 'block';
    
    // Play the audio
    await audio.play();
    
    // Clean up the blob URL after playing
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(url);
    });
    
  } catch (err) {
    console.error('TTS Error:', err);
    showError(id, `TTS failed: ${err.message}`);
  } finally {
    button.innerHTML = lang === 'en' ? '🔊 Play English' : '🔊 Play Portuguese';
    button.disabled = false;
  }
}

// Attach playTTS to window for global access
window.playTTS = playTTS;

// Setup tabs for language switching
function setupTabs(id, data) {
  const tabs = document.querySelectorAll(`[data-id="${id}"]`);
  const explanationDiv = document.getElementById(`explanation-${id}`);
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showExplanation(explanationDiv, data, tab.dataset.lang);
    });
  });
}

function showExplanation(div, data, lang) {
  div.innerHTML = lang === 'en' ? data.en : data.pt;
}

function showError(id, message) {
  const errorDiv = document.getElementById(`error-${id}`);
  errorDiv.innerHTML = `<div class="error-message">${message}</div>`;
  setTimeout(() => {
    errorDiv.innerHTML = '';
  }, 5000);
}

// Cache helpers
async function getCached(id) {
  if (!db) return null;
  
  return new Promise(resolve => {
    try {
      const tx = db.transaction('explanations', 'readonly');
      const store = tx.objectStore('explanations');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result?.data);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

async function cacheData(id, data) {
  if (!db) return;
  
  try {
    const tx = db.transaction('explanations', 'readwrite');
    const store = tx.objectStore('explanations');
    store.put({ id, data });
  } catch (e) {
    console.warn('Failed to cache data:', e);
  }
}

// Search input
document.getElementById('search').addEventListener('input', e => {
  loadQuestions(e.target.value);
});

// Functions are now globally accessible since script is not a module

// Ensure functions are globally available before DOM loads
window.addEventListener('DOMContentLoaded', function() {
  // Double-check that functions are attached to window
  if (typeof window.loadExplanation !== 'function') {
    console.error('loadExplanation not found on window object');
  }
  if (typeof window.playTTS !== 'function') {
    console.error('playTTS not found on window object');
  }
  if (typeof window.toggleExpand !== 'function') {
    console.error('toggleExpand not found on window object');
  }
  
  loadQuestions();
});

// Fallback for when DOM is already loaded
if (document.readyState !== 'loading') {
  loadQuestions();
}

// Test API connection on load
async function testApiConnection() {
  try {
    console.log('Testing Venice API connection...');
    const response = await fetch(`${VENICE_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VENICE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'venice-uncensored',
        messages: [{ role: 'user', content: 'Hello, this is a test.' }],
        max_completion_tokens: 10
      })
    });
    
    console.log('API test response status:', response.status);
    
    if (response.ok) {
      console.log('API test successful');
      return true;
    } else {
      console.error('API test failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('API test error:', error);
    return false;
  }
}

// Removed automatic API test to prevent distracting error messages for users
// testApiConnection();

// Debug: Verify functions are globally accessible
console.log('Global function check:');
console.log('window.loadExplanation:', typeof window.loadExplanation);
console.log('window.playTTS:', typeof window.playTTS);
console.log('window.toggleExpand:', typeof window.toggleExpand);

// Add comprehensive global event delegation
document.addEventListener('click', function(e) {
  if (e.target.tagName === 'BUTTON') {
    const action = e.target.dataset.action;
    const id = parseInt(e.target.dataset.id);
    const lang = e.target.dataset.lang;
    
    if (action === 'load-explanation') {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.loadExplanation === 'function') {
        window.loadExplanation(id);
      } else {
        console.error('loadExplanation function not available');
      }
    } else if (action === 'play-tts') {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.playTTS === 'function') {
        window.playTTS(id, lang);
      } else {
        console.error('playTTS function not available');
      }
    }
  }
});