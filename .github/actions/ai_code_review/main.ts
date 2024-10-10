import * as core from "@actions/core";
import * as github from "@actions/github";
import { Ollama } from "ollama";

async function run() {
  try {
    const token = core.getInput("github-token", { required: true });
    const octokit = github.getOctokit(token);

    const context = github.context;
    const pull_number = context.payload.pull_request?.number;
    if (!pull_number) {
      core.setFailed("This action can only be run on pull requests.");
      return;
    }

    // Get the list of files changed in the PR
    const { data: changedFiles } = await octokit.rest.pulls.listFiles({
      ...context.repo,
      pull_number,
    });

    for (const file of changedFiles) {
      if (file.status !== "removed") {
        // Get the file content
        const { data: fileContent } = await octokit.rest.repos.getContent({
          ...context.repo,
          path: file.filename,
          ref: context.payload.pull_request?.head.sha,
        });

        if ("content" in fileContent) {
          const decodedContent = Buffer.from(
            fileContent.content,
            "base64"
          ).toString("utf8");

          // Use Ollama for code review
          const review = await getAICodeReview(decodedContent);

          // Post the review as a comment
          await octokit.rest.pulls.createReviewComment({
            ...context.repo,
            pull_number,
            body: review,
            commit_id: context.payload.pull_request?.head.sha,
            path: file.filename,
            line: 1,
          });
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

async function getAICodeReview(code: string): Promise<string> {
  const ollama = new Ollama();

  const promptText = `Please review the following code and provide constructive feedback:\n\n${code}`;

  const response = await ollama.generate({
    model: "codellama",
    prompt: promptText,
  });

  return response.response;
}

run();
