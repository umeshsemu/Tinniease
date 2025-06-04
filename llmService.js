import config from './config.js';

class LLMService {
    constructor() {
        this.conversationHistory = [];
        this.apiUrl = config.HUGGINGFACE_API_URL;
        this.apiKey = config.HUGGINGFACE_API_KEY;
    }

    async generateResponse(userInput) {
        try {
            // Add user input to conversation history
            this.conversationHistory.push({ role: 'user', content: userInput });

            // Prepare the prompt with context
            const prompt = this.preparePrompt();

            // Make API call to Hugging Face
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_length: 100,
                        temperature: 0.7,
                        return_full_text: false
                    }
                })
            });

            const data = await response.json();
            
            // Add AI response to conversation history
            this.conversationHistory.push({ role: 'assistant', content: data.generated_text });

            return data.generated_text;
        } catch (error) {
            console.error('Error generating response:', error);
            return "I apologize, but I'm having trouble processing your request right now. Could you please try again?";
        }
    }

    preparePrompt() {
        // Create a context-aware prompt based on conversation history
        let prompt = "You are a helpful AI assistant specializing in tinnitus diagnosis and treatment. ";
        
        // Add relevant context from conversation history
        if (this.conversationHistory.length > 0) {
            prompt += "Based on our conversation so far: ";
            this.conversationHistory.slice(-3).forEach(msg => {
                prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content} `;
            });
        }

        // Add specific instructions for tinnitus-related responses
        prompt += "Please provide a natural, conversational response that helps diagnose the user's tinnitus condition. " +
                 "Ask relevant follow-up questions if needed, or provide appropriate recommendations based on the information provided.";

        return prompt;
    }

    analyzeTinnitusType() {
        // Analyze conversation history to determine tinnitus type
        const relevantInfo = this.conversationHistory
            .filter(msg => msg.role === 'user')
            .map(msg => msg.content.toLowerCase());

        // Look for keywords and patterns in user responses
        if (relevantInfo.some(msg => 
            msg.includes('both ears') && 
            (msg.includes('same') || msg.includes('equal') || msg.includes('similar')))) {
            return 1; // Bilateral Symmetric
        } else if (relevantInfo.some(msg => 
            msg.includes('both ears') && 
            (msg.includes('different') || msg.includes('worse in one') || msg.includes('not equal')))) {
            return 2; // Bilateral Asymmetric
        } else if (relevantInfo.some(msg => 
            msg.includes('one ear') || 
            msg.includes('left ear') || 
            msg.includes('right ear'))) {
            return 3; // Unilateral
        }

        return null; // Not enough information to determine
    }

    clearHistory() {
        this.conversationHistory = [];
    }
}

export default LLMService; 