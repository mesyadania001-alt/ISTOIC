
import { debugService } from "./debugService";

export interface StandardMessage {
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

/**
 * PRODUCTION SECURE STREAM
 * Routes all requests to /api/chat. No client-side keys used.
 */
export async function* streamOpenAICompatible(
    provider: 'GROQ' | 'DEEPSEEK' | 'OPENAI' | 'XAI' | 'MISTRAL' | 'OPENROUTER',
    modelId: string,
    messages: StandardMessage[],
    systemInstruction?: string,
    tools: any[] = [],
    signal?: AbortSignal
): AsyncGenerator<{ text?: string; functionCall?: any; }> {

    // Extract the latest user message and context from the messages array
    const lastMsg = messages[messages.length - 1];
    const userMessage = typeof lastMsg.content === 'string' ? lastMsg.content : "Media content";
    
    // Construct context from previous messages (simple concatenation for now)
    // In a real prod scenario, we might pass the full history array to the backend.
    const context = messages.slice(0, -1).map(m => `${m.role}: ${m.content}`).join('\n');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider,
                modelId,
                message: userMessage,
                systemInstruction,
                context
            }),
            signal
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Backend Error (${response.status}): ${errText}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            if (text) {
                yield { text };
            }
        }

    } catch (e: any) {
        debugService.log('ERROR', provider, 'PROXY_FAIL', e.message);
        yield { text: `\n\n> ⚠️ **CONNECTION ERROR**: ${e.message}` };
    }
}

// Keep the analyze function for now, but mark as deprecated or update similarly
export async function analyzeMultiModalMedia(provider: string, modelId: string, data: string, mimeType: string, prompt: string): Promise<string> {
    // For now, only Gemini supports direct vision via the proxy in our setup
    if (provider !== 'GEMINI') return "Vision only supported on Gemini in this version.";
    // ... logic would need similar update to api/chat or api/vision
    return "Vision Proxy Pending Implementation.";
}

// Deprecated direct calls
export async function generateMultiModalImage(provider: string, modelId: string, prompt: string, options: any): Promise<string> {
    throw new Error("Use PollinationsService or update API route for Image Gen");
}
    