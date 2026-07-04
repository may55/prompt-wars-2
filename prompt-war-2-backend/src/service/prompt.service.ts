import fs from "fs";
import path from "path";

export class PromptService {
  private prompts: Map<string, string> = new Map();
  private promptsDir: string;

  constructor(promptsDir?: string) {
    // Default to the project root 'prompts' directory.
    // In ESM/Bun, import.meta.dir represents the directory of the current module (src/service or dist/service).
    // Resolving '../../prompts' from here correctly points to the root prompts folder.
    this.promptsDir = promptsDir || path.resolve(import.meta.dir, "../../prompts");
  }

  /**
   * Retrieves the cached prompt content of a given file, or loads it from disk if not yet cached.
   * @param filename Name of the prompt file (e.g. 'explore_system.md')
   */
  getPrompt(filename: string): string {
    if (this.prompts.has(filename)) {
      return this.prompts.get(filename)!;
    }
    const filePath = path.join(this.promptsDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Prompt file not found at ${filePath}`);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    this.prompts.set(filename, content);
    return content;
  }
}
