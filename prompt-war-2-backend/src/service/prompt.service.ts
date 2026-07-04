import fs from "fs";
import path from "path";

export class PromptService {
  private prompts: Map<string, string> = new Map();
  private promptsDir: string;

  constructor(promptsDir?: string) {
    if (promptsDir) {
      this.promptsDir = promptsDir;
      return;
    }

    // 1. Try relative to process.cwd() (works if started from prompt-war-2-backend root)
    const cwdPrompts = path.resolve(process.cwd(), "prompts");
    if (fs.existsSync(cwdPrompts)) {
      this.promptsDir = cwdPrompts;
      return;
    }

    // 2. Try relative to import.meta.dir for bundled distribution (dist/index.js -> dist/../prompts)
    const relativeToMeta1 = path.resolve(import.meta.dir, "../prompts");
    if (fs.existsSync(relativeToMeta1)) {
      this.promptsDir = relativeToMeta1;
      return;
    }

    // 3. Try relative to import.meta.dir for dev source file (src/service/prompt.service.ts -> src/service/../../prompts)
    const relativeToMeta2 = path.resolve(import.meta.dir, "../../prompts");
    if (fs.existsSync(relativeToMeta2)) {
      this.promptsDir = relativeToMeta2;
      return;
    }

    // Fallback to the default path resolver
    this.promptsDir = cwdPrompts;
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
