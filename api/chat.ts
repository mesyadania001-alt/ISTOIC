
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export const config = {
  runtime: 'edge',
};

export async function POST(request: Request) {
  try {
    const { message, modelId, systemInstruction, provider, context } = await request.json();

    // 1. GEMINI PROVIDER
    if (!provider || provider === 'GEMINI') {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return new Response(JSON.stringify({ error: "Server Config: Missing GEMINI_API_KEY" }), { status: 500 });

        const ai = new GoogleGenAI({ apiKey });
        // Handle models that might use 'auto-best' alias
        const targetModel = modelId === 'auto-best' ? 'gemini-3-flash-preview' : modelId;
        
        // Construct full prompt with context if available
        const finalPrompt = context ? `${context}\n\n${message}` : message;

        const result = await ai.models.generateContentStream({
            model: targetModel,
            contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
            config: { systemInstruction }
        });

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of result) {
                        const text = chunk.text;
                        if (text) controller.enqueue(encoder.encode(text));
                    }
                    controller.close();
                } catch (e: any) {
                    controller.enqueue(encoder.encode(`\n[ERR: ${e.message}]`));
                    controller.close();
                }
            },
        });
        return new Response(stream, { headers: { "Content-Type": "text/plain" } });
    }

    // 2. OPENAI COMPATIBLE PROVIDERS (Groq, OpenAI, DeepSeek, etc.)
    let baseURL = '';
    let apiKey = '';

    switch (provider) {
        case 'GROQ':
            baseURL = 'https://api.groq.com/openai/v1';
            apiKey = process.env.GROQ_API_KEY;
            break;
        case 'OPENAI':
            baseURL = 'https://api.openai.com/v1';
            apiKey = process.env.OPENAI_API_KEY;
            break;
        case 'DEEPSEEK':
            baseURL = 'https://api.deepseek.com';
            apiKey = process.env.DEEPSEEK_API_KEY;
            break;
        case 'MISTRAL':
            baseURL = 'https://api.mistral.ai/v1';
            apiKey = process.env.MISTRAL_API_KEY;
            break;
        default:
            return new Response(JSON.stringify({ error: `Unsupported Provider: ${provider}` }), { status: 400 });
    }

    if (!apiKey) {
        return new Response(JSON.stringify({ error: `Server Config: Missing ${provider}_API_KEY` }), { status: 500 });
    }

    const client = new OpenAI({ apiKey, baseURL });
    
    const messages = [
        { role: "system", content: systemInstruction || "You are a helpful assistant." },
        ...(context ? [{ role: "system", content: `Context:\n${context}` }] : []),
        { role: "user", content: message }
    ];

    const openAIStream = await client.chat.completions.create({
        model: modelId,
        messages: messages as any,
        stream: true,
        max_tokens: 4096
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                for await (const chunk of openAIStream) {
                    const text = chunk.choices[0]?.delta?.content || '';
                    if (text) controller.enqueue(encoder.encode(text));
                }
                controller.close();
            } catch (e: any) {
                controller.enqueue(encoder.encode(`\n[ERR: ${e.message}]`));
                controller.close();
            }
        },
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain" } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
    