import { Note } from "../../types";
import { MemoryService } from "../memoryService";

// Fix: Accept Note[] | string to support pre-processed context strings from various engines
export const getMemoryLayer = async (query: string, notes: Note[] | string): Promise<string> => {
    if (typeof notes === 'string') return notes;
    if (!query || notes.length === 0) return "";
    
    const recallContext = await MemoryService.recall(query, notes);
    
    const recentNotes = notes
        .filter(n => !n.is_archived)
        .slice(0, 15)
        .map(n => `- ${n.title} [Tags: ${n.tags?.join(', ') || 'NONE'}] (ID: ${n.id})`)
        .join('\n');

    return `
=== NEURAL_MEMORY_LAYER ===
${recallContext}

[VAULT_SNAPSHOT]
${recentNotes || 'No active notes in vault.'}
`;
};