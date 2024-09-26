import { readFileSync } from "fs";
import * as core from "@actions/core";
import parseDiff from "parse-diff";
import { Octokit } from "@octokit/rest";
import { minimatch } from "minimatch";
import ollama from "ollama";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OLLAMA_MODEL = "llama3.1";

if (!GITHUB_TOKEN) {
  core.setFailed("GITHUB_TOKEN is not set");
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function getPRDetails() {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      throw new Error("GITHUB_EVENT_PATH is not set");
    }
    const { repository, number } = JSON.parse(readFileSync(eventPath, "utf8"));
    const prResponse = await octokit.pulls.get({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: number,
    });
    return {
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: number,
      title: prResponse.data.title ?? "",
      description: prResponse.data.body ?? "",
    };
  } catch (error) {
    console.error("Error in getPRDetails:", error);
    throw error;
  }
}

async function getDiff(owner, repo, pull_number) {
  try {
    const response = await octokit.pulls.get({
      owner,
      repo,
      pull_number,
      mediaType: { format: "diff" },
    });
    return response.data;
  } catch (error) {
    console.error("Error in getDiff:", error);
    throw error;
  }
}

async function analyzeCode(parsedDiff, prDetails) {
  const comments = [];

  for (const file of parsedDiff) {
    if (file.to === "/dev/null") continue; // Ignore deleted files
    for (const chunk of file.chunks) {
      try {
        const prompt = createPrompt(file, chunk, prDetails);
        const aiResponse = await getAIResponse(prompt);
        if (aiResponse && Array.isArray(aiResponse)) {
          const newComments = createComment(file, chunk, aiResponse);
          if (newComments && newComments.length > 0) {
            comments.push(...newComments);
          }
        }
      } catch (error) {
        console.error(`Error analyzing chunk in file ${file.to}:`, error);
        // Continue with the next chunk
      }
    }
  }
  return comments;
}

function createPrompt(file, chunk, prDetails) {
  // ... (기존 코드 유지)
}

async function getAIResponse(prompt) {
  try {
    await ollama.pull({ model: OLLAMA_MODEL });
    const response = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt: prompt,
    });

    const res = response.response.trim();
    const parsedResponse = JSON.parse(res);

    if (!parsedResponse.reviews || !Array.isArray(parsedResponse.reviews)) {
      console.warn("Unexpected AI response format. Expected 'reviews' array.");
      return [];
    }

    return parsedResponse.reviews;
  } catch (error) {
    console.error("Error in getAIResponse:", error);
    return [];
  }
}

function createComment(file, chunk, aiResponses) {
  return aiResponses.flatMap((aiResponse) => {
    if (!file.to || !aiResponse.lineNumber || !aiResponse.reviewComment) {
      return [];
    }
    const line = Number(aiResponse.lineNumber);
    if (isNaN(line)) {
      console.warn(`Invalid line number: ${aiResponse.lineNumber}`);
      return [];
    }
    return {
      body: aiResponse.reviewComment,
      path: file.to,
      line: line,
      side: "RIGHT",
    };
  });
}

async function createReviewComment(owner, repo, pull_number, comments) {
  if (comments.length === 0) {
    console.log("No comments to post.");
    return;
  }

  try {
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number,
      comments,
      event: "COMMENT",
    });
    console.log("Review comments posted successfully.");
  } catch (error) {
    console.error("Error posting review comments:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

async function main() {
  try {
    const prDetails = await getPRDetails();
    let diff;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      throw new Error("GITHUB_EVENT_PATH is not set");
    }
    const eventData = JSON.parse(readFileSync(eventPath, "utf8"));

    if (eventData.action === "opened") {
      diff = await getDiff(
        prDetails.owner,
        prDetails.repo,
        prDetails.pull_number
      );
    } else if (eventData.action === "synchronize") {
      const newBaseSha = eventData.before;
      const newHeadSha = eventData.after;

      const response = await octokit.repos.compareCommits({
        headers: {
          accept: "application/vnd.github.v3.diff",
        },
        owner: prDetails.owner,
        repo: prDetails.repo,
        base: newBaseSha,
        head: newHeadSha,
      });

      diff = String(response.data);
    } else {
      console.log("Unsupported event:", process.env.GITHUB_EVENT_NAME);
      return;
    }

    if (!diff) {
      console.log("No diff found");
      return;
    }

    const parsedDiff = parseDiff(diff);

    const excludePatterns = core
      .getInput("exclude")
      .split(",")
      .map((s) => s.trim());

    const filteredDiff = parsedDiff.filter((file) => {
      return !excludePatterns.some((pattern) =>
        minimatch(file.to ?? "", pattern)
      );
    });

    const comments = await analyzeCode(filteredDiff, prDetails);
    if (comments.length > 0) {
      await createReviewComment(
        prDetails.owner,
        prDetails.repo,
        prDetails.pull_number,
        comments
      );
    } else {
      console.log("No comments to post after analysis.");
    }
  } catch (error) {
    console.error("Error in main function:", error);
    core.setFailed(error.message);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  core.setFailed("An unhandled error occurred");
  process.exit(1);
});
