"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bot = void 0;
const ollama_1 = require("ollama");
const core_1 = require("@actions/core");
class Bot {
    constructor(options, ollamaOptions) {
        this.options = options;
        this.ollamaOptions = ollamaOptions;
        this.ollama = new ollama_1.Ollama({
            host: options.ollamaBaseUrl,
        });
    }
    chat(prompt, chatOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            let retries = this.options.ollamaRetries;
            while (retries >= 0) {
                try {
                    const response = yield this.ollama.chat({
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
                        (0, core_1.info)(`Ollama response: ${content}`);
                        (0, core_1.info)(`Estimated token count: ${tokenCount}`);
                    }
                    return [content, tokenCount];
                }
                catch (error) {
                    (0, core_1.warning)(`Ollama API error: ${error.message}`);
                    retries--;
                    if (retries < 0) {
                        throw error;
                    }
                    yield new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
            throw new Error("Max retries reached");
        });
    }
}
exports.Bot = Bot;
