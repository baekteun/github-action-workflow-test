import { getInput } from "@actions/core";
import { getOctokit } from "@actions/github";

const token = getInput("github_token");
if (!token) {
  throw new Error("No GitHub token provided");
}

export const octokit = getOctokit(token);
