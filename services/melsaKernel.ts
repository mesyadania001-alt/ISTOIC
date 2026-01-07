import { GoogleGenAI } from "@google/genai";
import { debugService } from "./debugService";
import { HANISAH_BRAIN } from "./melsaBrain";
import { noteTools, visualTools, searchTools, universalTools } from "./geminiService";
import { GLOBAL_VAULT, Provider } from "./hydraVault"; 
import { mechanicTools } from "../features/mechanic/mechanicTools";
import { streamOpenAICompatible } from "./providerEngine";
import { MASTER_MODEL_CATALOG, MODEL_IDS } from "./modelRegistry";
import { Note } from "../types";

export const MODEL_CATALOG = MASTER_MODEL_CATALOG;

export interface StreamChunk {
  text?: string;
  functionCall?: any;
  groundingChunks?: any[];
  metadata?: any;
}

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export class HanisahKernel {
  private history: any[] = [];

  private getActiveTools(provider: string, isThinking: boolean, currentMsg: string = ''): any[] {
      // Tools logic preserved
      if (provider === 'GEMINI') {
          const configStr = localStorage.getItem('hanisah_tools_config');
          const config = configStr ? JSON.parse(configStr) : { search: true, vault: true, visual: true };
          const tools: any[] = [];
          const lowerMsg = currentMsg.toLowerCase();
          
          if (config.vault && noteTools && ['catat', 'simpan', 'ingat', 'note', 'task', 'list'].some(k => lowerMsg.includes(k))) tools.push(noteTools);
          if (config.visual && visualTools && ['gambar', 'foto', 'visual', 'imagine'].some(k => lowerMsg.includes(k))) tools.push(visualTools);
          if (config.search && searchTools && ['cari', 'berita', 'update', 'harga', 'cuaca'].some(k => lowerMsg.includes(k))) tools.push(searchTools); 
          if (mechanicTools) tools.push(mechanicTools);
          return tools;
      } 
      return universalTools.functionDeclarations ? [universalTools] : [];
  }

  async *streamExecute(msg: string, initialModelId: string, contextNotes: Note[] | string = [], imageData?: { data: string, mimeType: string }, configOverride?: any): AsyncGenerator<StreamChunk> {
    const systemPrompt = configOverride?.systemInstruction || await HANISAH_BRAIN.getSystemInstruction('hanisah', msg, contextNotes);
    const signal = configOverride?.signal; 
    let currentModelId = initialModelId === 'auto-best' ? MODEL_IDS.GEMINI_FLASH : initialModelId;

    // We prioritize the secure proxy for Gemini models to avoid Client-Side API Key issues
    const model = MASTER_MODEL_CATALOG.find(m => m.id === currentModelId) || MASTER_MODEL_CATALOG[0];
    
    try {
        // --- SECURE BACKEND PROXY ROUTE (PRIMARY) ---
        if (model.provider === 'GEMINI') {
            debugService.log('INFO', 'KERNEL', 'PROXY', `Routing ${model.id} via Secure Backend...`);
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: msg,
                    modelId: model.id,
                    systemInstruction: systemPrompt
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
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunkText = decoder.decode(value, { stream: true });
                fullText += chunkText;
                yield { text: chunkText };
            }

            this.updateHistory(msg, fullText);
            return; 
        } 
        
        // --- FALLBACK / OTHER PROVIDERS (Client-Side Dev Keys) ---
        // Only reaches here if provider is NOT Gemini (e.g. OpenAI/Groq using VITE_ keys)
        const key = GLOBAL_VAULT.getKey(model.provider as Provider);
        if (!key) throw new Error(`No API Key found for ${model.provider}`);

        const isThinking = model.specs.speed === 'THINKING';
        const activeTools = configOverride?.tools || this.getActiveTools(model.provider, isThinking, msg);
        
        // Fallback for non-Gemini models (OpenAI/Groq) running client-side
        const stream = streamOpenAICompatible(model.provider as any, model.id, [{ role: 'user', content: msg }], systemPrompt, activeTools, signal);
        let fullText = "";
        
        for await (const chunk of stream) {
            if (signal?.aborted) break;
            if (chunk.text) { 
                fullText += chunk.text; 
                yield { text: chunk.text }; 
            }
            if (chunk.functionCall) {
                yield { functionCall: chunk.functionCall };
            }
        }
        this.updateHistory(msg, fullText);

    } catch (err: any) {
        debugService.log('ERROR', 'KERNEL', 'EXEC_FAIL', err.message);
        yield { text: `\n\n> ⚠️ **SYSTEM ERROR**: ${err.message || "Connection failed"}` };
        yield { metadata: { status: 'error' } };
    }
  }

  private updateHistory(user: string, assistant: string) {
    this.history.push({ role: 'user', parts: [{ text: user }] }, { role: 'model', parts: [{ text: assistant }] });
    if (this.history.length > 50) this.history = this.history.slice(-50);
  }

  async execute(msg: string, modelId: string, contextNotes?: Note[] | string): Promise<StreamChunk> {
    const it = this.streamExecute(msg, modelId, contextNotes || []);
    let fullText = "";
    let finalChunk: StreamChunk = {};
    for await (const chunk of it) {
        if (chunk.text) fullText += chunk.text;
        if (chunk.functionCall) finalChunk.functionCall = chunk.functionCall;
    }
    finalChunk.text = fullText;
    return finalChunk;
  }
}

export const HANISAH_KERNEL = new HanisahKernel();