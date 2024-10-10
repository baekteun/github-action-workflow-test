"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.octokit = void 0;
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const token = (0, core_1.getInput)("github_token");
if (!token) {
    throw new Error("No GitHub token provided");
}
exports.octokit = (0, github_1.getOctokit)(token);
