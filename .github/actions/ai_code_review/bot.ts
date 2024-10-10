import { Ollama } from "ollama";
import { Options, OllamaOptions } from "./options";
import { info, warning } from "@actions/core";

export class Bot {
  private ollama: Ollama;
  private options: Options;
  private ollamaOptions: OllamaOptions;

  constructor(options: Options, ollamaOptions: OllamaOptions) {
    this.options = options;
    this.ollamaOptions = ollamaOptions;
    this.ollama = new Ollama({
      host: options.ollamaBaseUrl,
    });
  }

  async chat(prompt: string, chatOptions: any): Promise<[string, number]> {
    let retries = this.options.ollamaRetries;
    while (retries >= 0) {
      try {
        const response = await this.ollama.chat({
          model: this.ollamaOptions.model,
          messages: [{ role: "user", content: prompt }],
          options: {
            temperature: this.options.ollamaModelTemperature,
          },
        });

        const content = response.message.content;
        // Simple token count estimation
        const tokenCount = content.split(" ").length;

        if (this.options.debug) {
          info(`Ollama response: ${content}`);
          info(`Estimated token count: ${tokenCount}`);
        }

        return [content, tokenCount];
      } catch (error: any) {
        warning(`Ollama API error: ${error}`);
        warning(`Ollama API error: ${error.message}`);
        retries--;
        if (retries < 0) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error("Max retries reached");
  }
}
