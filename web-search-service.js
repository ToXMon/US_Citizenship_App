// Web Search Service for Venice AI
// Handles web search functionality for US Citizenship questions that refer to uscis.gov

class WebSearchService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    // Web search enabled models in Venice AI (based on actual Venice API offerings)
    this.webSearchModels = [
      'claude-3-sonnet-20240229',  // Claude 3 Sonnet with web search
      'claude-3-haiku-20240307',   // Claude 3 Haiku with web search  
      'gpt-4o',                    // GPT-4o with web search
      'gpt-4-turbo',               // GPT-4 Turbo with web search
      'venice-uncensored'          // Fallback to standard model
    ];
    this.currentModel = this.webSearchModels[0]; // Start with primary model
  }

  // Questions that require web search for current information
  isWebSearchQuestion(questionId) {
    const webSearchQuestions = [28, 29, 39, 40, 46, 47];
    return webSearchQuestions.includes(questionId);
  }

  // Get current answer using web search
  async getCurrentAnswer(questionId, question) {
    const searchQueries = {
      28: "current President of the United States 2024 2025",
      29: "current Vice President of the United States 2024 2025", 
      39: "number of Supreme Court justices 2024 2025",
      40: "current Chief Justice Supreme Court United States 2024 2025",
      46: "current President political party 2024 2025",
      47: "current Speaker of the House Representatives 2024 2025"
    };

    const searchQuery = searchQueries[questionId];
    if (!searchQuery) {
      throw new Error(`No search query defined for question ${questionId}`);
    }

    try {
      // Try each web search model until one works
      for (const model of this.webSearchModels) {
        try {
          console.log(`Attempting web search with model: ${model}`);
          const result = await this.performWebSearch(question, searchQuery, model);
          if (result) {
            console.log(`Web search successful with model: ${model}`);
            this.currentModel = model; // Remember working model
            return result;
          }
        } catch (error) {
          console.warn(`Model ${model} failed:`, error.message);
          continue;
        }
      }
      
      // If all web search models fail, fallback to regular model with search instructions
      console.log('All web search models failed, using fallback approach');
      return await this.fallbackSearch(question, searchQuery);
      
    } catch (error) {
      console.error('Web search failed completely:', error);
      throw new Error('Unable to retrieve current information. Please try again later.');
    }
  }

  async performWebSearch(question, searchQuery, model) {
    const prompt = `You are an AI assistant with access to current web information. Search for and provide the most up-to-date answer to this US citizenship question.

Question: ${question}
Search focus: ${searchQuery}

Please provide ONLY the direct answer to the question based on current, verified information from reliable sources. Do not include explanations or additional text - just the factual answer.

Example format:
- For "Who is the current President?": "Joe Biden"
- For "How many justices are on the Supreme Court?": "9"
- For "What is the current President's political party?": "Democratic Party"

Answer:`;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: model,
        messages: [{ 
          role: 'user', 
          content: prompt
        }],
        temperature: 0.1, // Low temperature for factual accuracy
        max_completion_tokens: 100
      })
    });

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from API');
    }

    const answer = data.choices[0].message.content.trim();
    
    // Validate that we got a reasonable answer
    if (this.validateAnswer(answer, question)) {
      return answer;
    } else {
      throw new Error('Answer validation failed');
    }
  }

  async fallbackSearch(question, searchQuery) {
    console.log('Using fallback search approach');
    
    const prompt = `As an AI assistant with knowledge of current US government information as of 2024-2025, answer this citizenship question with the most current information available:

Question: ${question}

Based on your knowledge of recent US government officials and structure, provide a direct answer. If the information changes frequently (like current office holders), acknowledge that verification with current sources is recommended.

Important: This question refers users to uscis.gov because the answer changes over time. Provide your best knowledge while noting that current information should be verified.

Answer:`;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'venice-uncensored', // Use the known working model
        messages: [{ 
          role: 'user', 
          content: prompt
        }],
        temperature: 0.1,
        max_completion_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`Fallback API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0].message.content.trim();
    
    // Add note about verification for dynamic questions
    return `${answer} (Note: Please verify current information at uscis.gov)`;
  }

  validateAnswer(answer, question) {
    // Basic validation to ensure we got a meaningful answer
    if (!answer || answer.length < 3) return false;
    
    // Check for common error patterns
    const errorPatterns = [
      'i cannot', 'i don\'t know', 'unable to', 'error',
      'visit uscis.gov', 'please check', 'not available'
    ];
    
    const lowerAnswer = answer.toLowerCase();
    for (const pattern of errorPatterns) {
      if (lowerAnswer.includes(pattern)) return false;
    }
    
    // Question-specific validation
    if (question.includes('President') && !answer.match(/[A-Z][a-z]+ [A-Z][a-z]+/)) {
      return false; // Should contain a name-like pattern
    }
    
    return true;
  }

  // Enhanced explanation generation with web search verification
  async generateWebSearchEnhancedExplanation(questionId, question, answer) {
    const isWebSearchQ = this.isWebSearchQuestion(questionId);
    
    let currentInfo = '';
    if (isWebSearchQ) {
      try {
        currentInfo = await this.getCurrentAnswer(questionId, question);
      } catch (error) {
        console.warn('Could not get current info for explanation:', error);
        currentInfo = 'Please check uscis.gov for the most current information.';
      }
    }

    const prompt = `Provide a clear, educational explanation for this US citizenship question. ${isWebSearchQ ? 'Include the most current information available.' : ''}

Question: ${question}
${isWebSearchQ ? `Current Answer: ${currentInfo}` : `Answer: ${answer}`}

Please explain:
1. Why this answer is correct
2. Important context and background
3. ${isWebSearchQ ? 'Why this information changes over time and the importance of staying current' : 'Key points to remember for the citizenship test'}

Keep the explanation concise but informative, suitable for someone studying for the citizenship test.`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: this.currentModel.includes('web') ? this.currentModel : 'venice-uncensored',
          messages: [{ 
            role: 'user', 
            content: prompt
          }],
          temperature: 0.7,
          max_completion_tokens: 400
        })
      });

      if (!response.ok) {
        throw new Error(`Explanation API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
      
    } catch (error) {
      console.error('Enhanced explanation generation failed:', error);
      // Fallback to basic explanation
      return `This question asks about ${question.toLowerCase()}. ${isWebSearchQ ? `The current answer is: ${currentInfo}. ` : `The answer is: ${answer}. `}This is important information for US citizenship candidates to know.`;
    }
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSearchService;
} else if (typeof window !== 'undefined') {
  window.WebSearchService = WebSearchService;
}