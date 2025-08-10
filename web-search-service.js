// Web Search Service for Venice AI
// Handles web search functionality for US Citizenship questions that refer to uscis.gov

class WebSearchService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    // Web search enabled models in Venice AI (based on actual Venice API response)
    this.webSearchModels = [
      'llama-3.2-3b',              // Llama 3.2 3B - fastest, cost-effective (0.15/0.6)
      'qwen3-4b',                  // Venice Small - fast and cost-effective (0.15/0.6)
      'venice-uncensored',         // Venice Uncensored 1.1 (0.5/2)
      'qwen-2.5-qwq-32b',          // Venice Reasoning - advanced reasoning (0.5/2)
      'mistral-31-24b'             // Venice Medium - vision + web search (0.5/2)
    ];
    this.currentModel = this.webSearchModels[0]; // Start with primary model
  }

  // Test web search functionality - for debugging
  async testWebSearchCapability() {
    console.log('Testing web search capability...');
    
    try {
      const testResponse = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'venice-uncensored:web-search',
          messages: [{ 
            role: 'user', 
            content: 'What is today\'s date and who is the current President of the United States?'
          }],
          temperature: 0.1,
          max_completion_tokens: 100,
          venice_parameters: {
            enable_web_search: "auto",
            enable_web_citations: true,
            include_venice_system_prompt: true
          }
        })
      });

      if (testResponse.ok) {
        const data = await testResponse.json();
        console.log('Web search test successful:', data.choices[0].message.content);
        return true;
      } else {
        console.log('Web search test failed:', testResponse.status, await testResponse.text());
        return false;
      }
    } catch (error) {
      console.log('Web search test error:', error);
      return false;
    }
  }

  // Questions that require web search for current information
  isWebSearchQuestion(questionId) {
    const webSearchQuestions = [28, 29, 39, 40, 46, 47];
    return webSearchQuestions.includes(questionId);
  }

  // Get current answer using web search
  async getCurrentAnswer(questionId, question) {
    const searchQueries = {
      28: "who is the current President of the United States January 2025",
      29: "who is the current Vice President of the United States January 2025", 
      39: "how many Supreme Court justices are there currently 2025",
      40: "who is the current Chief Justice of the Supreme Court United States 2025",
      46: "what political party is the current President of the United States 2025",
      47: "who is the current Speaker of the House of Representatives 2025"
    };

    const searchQuery = searchQueries[questionId];
    if (!searchQuery) {
      throw new Error(`No search query defined for question ${questionId}`);
    }

    try {
      // Try each web search model until one works
      for (const model of this.webSearchModels) {
        try {
          console.log(`Attempting web search with model: ${model}:web-search`);
          const result = await this.performWebSearch(question, searchQuery, model);
          if (result) {
            console.log(`Web search successful with model: ${model}:web-search`);
            console.log(`Result: ${result}`);
            this.currentModel = model; // Remember working model
            return result;
          }
        } catch (error) {
          console.warn(`Model ${model}:web-search failed:`, error.message);
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
- For "Who is the current President?": "Donald Trump"
- For "How many justices are on the Supreme Court?": "9"
- For "What is the current President's political party?": "Republican Party"

Answer:`;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: `${model}:web-search`, // Enable web search using model suffix
        messages: [{ 
          role: 'user', 
          content: prompt
        }],
        temperature: 0.1, // Low temperature for factual accuracy
        max_completion_tokens: 100,
        venice_parameters: {
          enable_web_search: "auto",
          enable_web_citations: true,
          include_venice_system_prompt: true
        }
      })
    });

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error ${response.status}:`, errorText);
      throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('API response data:', JSON.stringify(data, null, 2));
    
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
    
    const prompt = `You are an AI assistant with knowledge of current US government information. Answer this citizenship question with the most current information available, acknowledging when information may have changed since your training data:

Question: ${question}

Based on your knowledge, provide a direct answer while noting that this type of information changes over time (especially for current office holders) and should be verified with current official sources.

Important: This question refers users to uscis.gov because the answer changes over time. Provide your best knowledge while clearly noting that current information should be verified.

Format your response as: [Your answer] (Note: This information may have changed since my last update. Please verify current information at uscis.gov/citizenship/testupdates)

Answer:`;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'venice-uncensored:web-search', // Try web search even in fallback
        messages: [{ 
          role: 'user', 
          content: prompt
        }],
        temperature: 0.1,
        max_completion_tokens: 150,
        venice_parameters: {
          enable_web_search: "auto",
          enable_web_citations: false,
          include_venice_system_prompt: true
        }
      })
    });

    if (!response.ok) {
      // If web search fallback fails, try without web search
      const basicResponse = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: 'venice-uncensored',
          messages: [{ 
            role: 'user', 
            content: prompt
          }],
          temperature: 0.1,
          max_completion_tokens: 150
        })
      });
      
      if (!basicResponse.ok) {
        throw new Error(`Fallback API error: ${basicResponse.status}`);
      }
      
      const data = await basicResponse.json();
      return data.choices[0].message.content.trim();
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
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

    const prompt = `Provide a clear, educational explanation for this US citizenship question. ${isWebSearchQ ? 'Include the most current information available and emphasize that this information changes frequently.' : ''}

Question: ${question}
${isWebSearchQ ? `Current Answer: ${currentInfo}` : `Answer: ${answer}`}

Please explain:
1. Why this answer is correct
2. Important context and background
3. ${isWebSearchQ ? 'Why this information changes over time and the importance of staying current with official sources' : 'Key points to remember for the citizenship test'}

${isWebSearchQ ? 'IMPORTANT: Emphasize that for questions about current office holders, users should verify the information with current official sources like uscis.gov since this information changes with elections and appointments.' : ''}

Keep the explanation concise but informative, suitable for someone studying for the citizenship test.`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: `${this.currentModel}:web-search`,
          messages: [{ 
            role: 'user', 
            content: prompt
          }],
          temperature: 0.7,
          max_completion_tokens: 400,
          venice_parameters: {
            enable_web_search: "auto",
            enable_web_citations: true,
            include_venice_system_prompt: true
          }
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