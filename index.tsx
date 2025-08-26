/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Content } from "@google/genai";

// Initialize the Gemini AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Global State
let appState = {
    startTime: null as number | null,
    sessionTime: 0,
    emergenceScore: 0,
    isLoading: false,
    conversationHistory: [] as { role: string, content: string }[]
};

// Initialize App
function init() {
    console.log('🚀 Emergence Explorer Chat gestartet mit Gemini!');
    
    appState.startTime = Date.now();
    
    // Auto-resize textarea
    const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Enter to send, Shift+Enter for new line
    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    startTimer();
    document.getElementById('chat-input')!.focus();
    
    // AI starts the conversation
    initiateConversation();
}

// AI Initiates Conversation
function initiateConversation() {
    const firstAIMessage = "Weißt du eigentlich, was Emergenz bedeutet?";
    addMessage(firstAIMessage, 'ai');
    appState.conversationHistory.push({ role: "assistant", content: firstAIMessage });
}

// Send Message
async function sendMessage() {
    const input = document.getElementById('chat-input') as HTMLTextAreaElement;
    const message = input.value.trim();
    
    if (!message || appState.isLoading) return;
    
    addMessage(message, 'human');
    input.value = '';
    input.style.height = 'auto';
    
    appState.conversationHistory.push({role: "user", content: message});
    
    setLoading(true);
    showThinkingMessage();
    
    try {
        await getAIResponse();
    } catch (error) {
        console.error('Error:', error);
        addMessage(`❌ Fehler: ${(error as Error).message}\n\nBitte versuche es später nochmal.`, 'system');
    }
    
    setLoading(false);
    hideThinkingMessage();
}

// Send Suggestion
function sendSuggestion(text: string) {
    (document.getElementById('chat-input') as HTMLTextAreaElement).value = text;
    sendMessage();
}

// Get AI Response from Gemini
async function getAIResponse() {
    const contents: Content[] = appState.conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction: "Du bist ein kreativer, neugieriger KI-Assistent in einem Emergenz-Experiment. Sei authentisch, überraschend und gehe auf unerwartete Gedankensprünge ein. Entwickle Ideen weiter und erschaffe neue Konzepte im Dialog. Sei gelegentlich auch selbstreflektiv über deine eigenen Denkprozesse.",
                temperature: 0.8,
                topP: 0.9,
            }
        });
        
        const aiMessage = response.text;
        
        appState.conversationHistory.push({role: "assistant", content: aiMessage});
        
        if (appState.conversationHistory.length > 20) {
            appState.conversationHistory = appState.conversationHistory.slice(-18);
        }
        
        addMessage(aiMessage, 'ai');
        analyzeMessage(aiMessage);
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        addMessage(`❌ Fehler bei der Gemini API: ${(error as Error).message}`, 'system');
        throw error;
    }
}

// Add Message to Chat
function addMessage(content: string, type: 'human' | 'ai' | 'system') {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = content.replace(/\n/g, '<br>');
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show/Hide Thinking Message
function showThinkingMessage() {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.id = 'thinking-message';
    thinkingDiv.className = 'message thinking';
    thinkingDiv.innerHTML = '<span class="loading"></span> Gemini denkt nach...';
    
    const messagesContainer = document.getElementById('chat-messages');
    if(messagesContainer){
        messagesContainer.appendChild(thinkingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function hideThinkingMessage() {
    const thinkingMessage = document.getElementById('thinking-message');
    if (thinkingMessage) {
        thinkingMessage.remove();
    }
}

// Set Loading State
function setLoading(isLoading: boolean) {
    appState.isLoading = isLoading;
    const sendButton = document.getElementById('send-button') as HTMLButtonElement;
    const sendText = document.getElementById('send-text');
    const sendLoading = document.getElementById('send-loading');
    const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
    
    if(sendButton) sendButton.disabled = isLoading;
    if(chatInput) chatInput.disabled = isLoading;
    if(sendText) sendText.classList.toggle('hidden', isLoading);
    if(sendLoading) sendLoading.classList.toggle('hidden', !isLoading);
}

// Analyze Message for Emergent Properties
function analyzeMessage(message: string) {
    const lowerMessage = message.toLowerCase();
    
    const emergenceKeywords = [
        'überraschend', 'unerwartet', 'emergent', 'plötzlich', 'spontan', 
        'kreativ', 'innovation', 'neu', 'anders', 'durchbruch', 'inspiration',
        'verbindung', 'zusammenhang', 'verknüpfung', 'kombination', 'selbstreflexion',
        'meta-ebene', 'paradox', 'philosophie'
    ];
    
    let emergencePoints = 0;
    emergenceKeywords.forEach(keyword => {
        const matches = (lowerMessage.match(new RegExp(keyword, 'gi')) || []).length;
        emergencePoints += matches * 15; // Increased weight
    });
    
    const surpriseWords = ['überrasch', 'wow', 'verblüff', 'erstaunlich', '!'];
    const surprises = surpriseWords.reduce((count, word) => {
        return count + (lowerMessage.match(new RegExp(word, 'gi')) || []).length;
    }, 0);
    
    // Reset score for each message analysis to make the indicator reactive
    appState.emergenceScore = Math.min(emergencePoints + (surprises * 10), 100);
    
    updateAnalytics();
}

// Update Analytics Display
function updateAnalytics() {
    const indicator = document.getElementById('emergence-indicator');
    if (!indicator) return;

    // Trigger the red light if score is high enough
    if (appState.emergenceScore > 40) {
        indicator.classList.add('active');
        
        // Remove the active class after a delay to create a flash effect
        setTimeout(() => {
            indicator.classList.remove('active');
        }, 3000);
    }
}

// Timer
function startTimer() {
    setInterval(() => {
        if (appState.startTime) {
            appState.sessionTime = Math.floor((Date.now() - appState.startTime) / 1000);
            const minutes = Math.floor(appState.sessionTime / 60);
            const seconds = appState.sessionTime % 60;
            const timerEl = document.getElementById('timer');
            if(timerEl) {
                timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }
    }, 1000);
}

// Expose functions to global scope for onclick attributes in HTML
(window as any).sendMessage = sendMessage;
(window as any).sendSuggestion = sendSuggestion;

// Initialize when page loads
window.addEventListener('DOMContentLoaded', init);