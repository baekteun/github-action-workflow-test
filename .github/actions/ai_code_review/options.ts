import { info } from "@actions/core";

export class Options {
  debug: boolean;
  disableReview: boolean;
  disableReleaseNotes: boolean;
  maxFiles: number;
  reviewSimpleChanges: boolean;
  reviewCommentLGTM: boolean;
  pathFilters: string[];
  systemMessage: string;
  ollamaLightModel: string;
  ollamaHeavyModel: string;
  ollamaModelTemperature: number;
  ollamaRetries: number;
  ollamaTimeoutMs: number;
  ollamaConcurrencyLimit: number;
  githubConcurrencyLimit: number;
  ollamaBaseUrl: string;
  language: string;
  lightTokenLimits: TokenLimits;
  heavyTokenLimits: TokenLimits;

  constructor(
    debug: boolean,
    disableReview: boolean,
    disableReleaseNotes: boolean,
    maxFiles: string,
    reviewSimpleChanges: boolean,
    reviewCommentLGTM: boolean,
    pathFilters: string[],
    systemMessage: string,
    ollamaLightModel: string,
    ollamaHeavyModel: string,
    ollamaModelTemperature: string,
    ollamaRetries: string,
    ollamaTimeoutMs: string,
    ollamaConcurrencyLimit: string,
    githubConcurrencyLimit: string,
    ollamaBaseUrl: string,
    language: string
  ) {
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

  print(): void {
    info(`Options:
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

  checkPath(path: string): boolean {
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

export interface TokenLimits {
  requestTokens: number;
  responseTokens: number;
  multipleRequestsTokens: number;
}

export class OllamaOptions {
  model: string;
  tokenLimits: TokenLimits;

  constructor(model: string, tokenLimits: TokenLimits) {
    this.model = model;
    this.tokenLimits = tokenLimits;
  }
}
