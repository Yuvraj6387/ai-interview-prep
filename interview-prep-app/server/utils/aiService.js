class AIService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

    if (!this.apiKey) {
      throw new Error('Missing GROQ_API_KEY in server environment');
    }
  }

  async sendRequest(prompt) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // required
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 512
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    return data.choices?.[0]?.message?.content || JSON.stringify(data);
  }

  async generateInterviewQuestions(targetRole, experience, topics) {
    const topicsList = Array.isArray(topics) ? topics.join(', ') : topics;
    const prompt = `Generate 5 interview questions for a ${targetRole} with ${experience} years of experience. Topics to cover: ${topicsList}. Return ONLY a valid JSON array of objects, each containing a "question" property. No other text or markdown formatting. Example: [{"question": "What is..."}]`;
    
    try {
      const response = await this.sendRequest(prompt);
      
      // Extract just the JSON array from the response in case there is extra text
      const jsonStart = response.indexOf('[');
      const jsonEnd = response.lastIndexOf(']');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
        const jsonString = response.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonString);
      }
      
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Error in generateInterviewQuestions:', error);
      throw error;
    }
  }

  async generateExplanation(questionText, targetRole, topics) {
    const topicsList = Array.isArray(topics) ? topics.join(', ') : topics;
    const prompt = `Act as an expert technical interviewer. Provide a detailed, clear, and comprehensive explanation for the following interview question asked to a ${targetRole} with focus on ${topicsList}.
    
Question: "${questionText}"

Include in your explanation:
1. The core concept being tested
2. A clear, accurate answer
3. An example if applicable
4. Common pitfalls or mistakes candidates make
Format the output in clear Markdown.`;

    try {
      return await this.sendRequest(prompt);
    } catch (error) {
      console.error('Error in generateExplanation:', error);
      throw error;
    }
  }
}

module.exports = new AIService();