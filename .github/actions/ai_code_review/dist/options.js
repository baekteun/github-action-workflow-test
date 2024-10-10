"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaOptions = exports.Options = void 0;
const core_1 = require("@actions/core");
class Options {
    constructor(debug, disableReview, disableReleaseNotes, maxFiles, reviewSimpleChanges, reviewCommentLGTM, pathFilters, systemMessage, ollamaLightModel, ollamaHeavyModel, ollamaModelTemperature, ollamaRetries, ollamaTimeoutMs, ollamaConcurrencyLimit, githubConcurrencyLimit, ollamaBaseUrl, language) {
        this.debug = debug;
        this.disableReview = disableReview;
        this.disableReleaseNotes = disableReleaseNotes;
        this.maxFiles = parseInt(maxFiles);
        this.reviewSimpleChanges = reviewSimpleChanges;
        this.reviewCommentLGTM = reviewCommentLGTM;
        this.pathFilters = pathFilters;
        this.systemMessage = systemMessage;
        this.ollamaLightModel = ollamaLightModel;
        this.ollamaHeavyModel = ollamaHeavyModel;
        this.ollamaModelTemperature = parseFloat(ollamaModelTemperature);
        this.ollamaRetries = parseInt(ollamaRetries);
        this.ollamaTimeoutMs = parseInt(ollamaTimeoutMs);
        this.ollamaConcurrencyLimit = parseInt(ollamaConcurrencyLimit);
        this.githubConcurrencyLimit = parseInt(githubConcurrencyLimit);
        this.ollamaBaseUrl = ollamaBaseUrl;
        this.language = language;
        this.lightTokenLimits = {
            requestTokens: 2000,
            responseTokens: 1800,
            multipleRequestsTokens: 5000,
        };
        this.heavyTokenLimits = {
            requestTokens: 3000,
            responseTokens: 2000,
            multipleRequestsTokens: 8000,
        };
    }
    print() {
        (0, core_1.info)(`Options:
      debug: ${this.debug}
      disableReview: ${this.disableReview}
      disableReleaseNotes: ${this.disableReleaseNotes}
      maxFiles: ${this.maxFiles}
      reviewSimpleChanges: ${this.reviewSimpleChanges}
      reviewCommentLGTM: ${this.reviewCommentLGTM}
      pathFilters: ${this.pathFilters}
      systemMessage: ${this.systemMessage}
      ollamaLightModel: ${this.ollamaLightModel}
      ollamaHeavyModel: ${this.ollamaHeavyModel}
      ollamaModelTemperature: ${this.ollamaModelTemperature}
      ollamaRetries: ${this.ollamaRetries}
      ollamaTimeoutMs: ${this.ollamaTimeoutMs}
      ollamaConcurrencyLimit: ${this.ollamaConcurrencyLimit}
      githubConcurrencyLimit: ${this.githubConcurrencyLimit}
      ollamaBaseUrl: ${this.ollamaBaseUrl}
      language: ${this.language}
    `);
    }
    checkPath(path) {
        if (this.pathFilters.length === 0) {
            return true;
        }
        for (const filter of this.pathFilters) {
            if (path.startsWith(filter)) {
                return true;
            }
        }
        return false;
    }
}
exports.Options = Options;
class OllamaOptions {
    constructor(model, tokenLimits) {
        this.model = model;
        this.tokenLimits = tokenLimits;
    }
}
exports.OllamaOptions = OllamaOptions;
