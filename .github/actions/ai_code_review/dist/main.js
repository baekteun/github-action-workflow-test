"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const ollama_1 = require("ollama");
function run() {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = core.getInput("github-token", { required: true });
            const octokit = github.getOctokit(token);
            const context = github.context;
            const pull_number = (_a = context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.number;
            if (!pull_number) {
                core.setFailed("This action can only be run on pull requests.");
                return;
            }
            // Get the list of files changed in the PR
            const { data: changedFiles } = yield octokit.rest.pulls.listFiles(Object.assign(Object.assign({}, context.repo), { pull_number }));
            for (const file of changedFiles) {
                if (file.status !== "removed") {
                    // Get the file content
                    const { data: fileContent } = yield octokit.rest.repos.getContent(Object.assign(Object.assign({}, context.repo), { path: file.filename, ref: (_b = context.payload.pull_request) === null || _b === void 0 ? void 0 : _b.head.sha }));
                    if ("content" in fileContent) {
                        const decodedContent = Buffer.from(fileContent.content, "base64").toString("utf8");
                        // Use Ollama for code review
                        const review = yield getAICodeReview(decodedContent);
                        // Post the review as a comment
                        yield octokit.rest.pulls.createReviewComment(Object.assign(Object.assign({}, context.repo), { pull_number, body: review, commit_id: (_c = context.payload.pull_request) === null || _c === void 0 ? void 0 : _c.head.sha, path: file.filename, line: 1 }));
                    }
                }
            }
        }
        catch (error) {
            if (error instanceof Error) {
                core.setFailed(error.message);
            }
        }
    });
}
function getAICodeReview(code) {
    return __awaiter(this, void 0, void 0, function* () {
        const ollama = new ollama_1.Ollama();
        const promptText = `Please review the following code and provide constructive feedback:\n\n${code}`;
        const response = yield ollama.generate({
            model: "codellama",
            prompt: promptText,
        });
        return response.response;
    });
}
run();
