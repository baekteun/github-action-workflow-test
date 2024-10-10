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
const core_1 = require("@actions/core");
const bot_1 = require("./bot");
const options_1 = require("./options");
const prompts_1 = require("./prompts");
const review_1 = require("./review");
const review_comment_1 = require("./review-comment");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const options = new options_1.Options((0, core_1.getBooleanInput)('debug'), (0, core_1.getBooleanInput)('disable_review'), (0, core_1.getBooleanInput)('disable_release_notes'), (0, core_1.getInput)('max_files'), (0, core_1.getBooleanInput)('review_simple_changes'), (0, core_1.getBooleanInput)('review_comment_lgtm'), (0, core_1.getMultilineInput)('path_filters'), (0, core_1.getInput)('system_message'), (0, core_1.getInput)('ollama_light_model'), (0, core_1.getInput)('ollama_heavy_model'), (0, core_1.getInput)('ollama_model_temperature'), (0, core_1.getInput)('ollama_retries'), (0, core_1.getInput)('ollama_timeout_ms'), (0, core_1.getInput)('ollama_concurrency_limit'), (0, core_1.getInput)('github_concurrency_limit'), (0, core_1.getInput)('ollama_base_url'), (0, core_1.getInput)('language'));
            // print options
            options.print();
            const prompts = new prompts_1.Prompts((0, core_1.getInput)('summarize'), (0, core_1.getInput)('summarize_release_notes'));
            // Create two bots, one for summary and one for review
            let lightBot = null;
            try {
                lightBot = new bot_1.Bot(options, new options_1.OllamaOptions(options.ollamaLightModel, options.lightTokenLimits));
            }
            catch (e) {
                (0, core_1.warning)(`Skipped: failed to create summary bot, please check your Ollama configuration: ${e}, backtrace: ${e.stack}`);
                return;
            }
            let heavyBot = null;
            try {
                heavyBot = new bot_1.Bot(options, new options_1.OllamaOptions(options.ollamaHeavyModel, options.heavyTokenLimits));
            }
            catch (e) {
                (0, core_1.warning)(`Skipped: failed to create review bot, please check your Ollama configuration: ${e}, backtrace: ${e.stack}`);
                return;
            }
            // check if the event is pull_request
            if (process.env.GITHUB_EVENT_NAME === 'pull_request' ||
                process.env.GITHUB_EVENT_NAME === 'pull_request_target') {
                yield (0, review_1.codeReview)(lightBot, heavyBot, options, prompts);
            }
            else if (process.env.GITHUB_EVENT_NAME === 'pull_request_review_comment') {
                yield (0, review_comment_1.handleReviewComment)(heavyBot, options, prompts);
            }
            else {
                (0, core_1.warning)('Skipped: this action only works on push events or pull_request');
            }
        }
        catch (e) {
            if (e instanceof Error) {
                (0, core_1.setFailed)(`Failed to run: ${e.message}, backtrace: ${e.stack}`);
            }
            else {
                (0, core_1.setFailed)(`Failed to run: ${e}, backtrace: ${e.stack}`);
            }
        }
    });
}
process
    .on('unhandledRejection', (reason, p) => {
    (0, core_1.warning)(`Unhandled Rejection at Promise: ${reason}, promise is ${p}`);
})
    .on('uncaughtException', (e) => {
    (0, core_1.warning)(`Uncaught Exception thrown: ${e}, backtrace: ${e.stack}`);
});
run();
