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
exports.handleReviewComment = void 0;
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const commenter_1 = require("./commenter");
const inputs_1 = require("./inputs");
const octokit_1 = require("./octokit");
// Simple token estimation function
function estimateTokens(text) {
    return text.split(/\s+/).length;
}
const context = github_1.context;
const repo = context.repo;
const ASK_BOT = '@ai-reviewer';
const handleReviewComment = (heavyBot, options, prompts) => __awaiter(void 0, void 0, void 0, function* () {
    const commenter = new commenter_1.Commenter();
    const inputs = new inputs_1.Inputs();
    if (context.eventName !== 'pull_request_review_comment') {
        (0, core_1.warning)(`Skipped: ${context.eventName} is not a pull_request_review_comment event`);
        return;
    }
    if (!context.payload) {
        (0, core_1.warning)(`Skipped: ${context.eventName} event is missing payload`);
        return;
    }
    const comment = context.payload.comment;
    if (comment == null) {
        (0, core_1.warning)(`Skipped: ${context.eventName} event is missing comment`);
        return;
    }
    if (context.payload.pull_request == null ||
        context.payload.repository == null) {
        (0, core_1.warning)(`Skipped: ${context.eventName} event is missing pull_request`);
        return;
    }
    inputs.title = context.payload.pull_request.title;
    if (context.payload.pull_request.body) {
        inputs.description = commenter.getDescription(context.payload.pull_request.body);
    }
    // check if the comment was created and not edited or deleted
    if (context.payload.action !== 'created') {
        (0, core_1.warning)(`Skipped: ${context.eventName} event is not created`);
        return;
    }
    // Check if the comment is not from the bot itself
    if (!comment.body.includes(commenter_1.COMMENT_TAG) &&
        !comment.body.includes(commenter_1.COMMENT_REPLY_TAG)) {
        const pullNumber = context.payload.pull_request.number;
        inputs.comment = `${comment.user.login}: ${comment.body}`;
        inputs.diff = comment.diff_hunk;
        inputs.filename = comment.path;
        const { chain: commentChain, topLevelComment } = yield commenter.getCommentChain(pullNumber, comment);
        if (!topLevelComment) {
            (0, core_1.warning)('Failed to find the top-level comment to reply to');
            return;
        }
        inputs.commentChain = commentChain;
        // check whether this chain contains replies from the bot
        if (commentChain.includes(commenter_1.COMMENT_TAG) ||
            commentChain.includes(commenter_1.COMMENT_REPLY_TAG) ||
            comment.body.includes(ASK_BOT)) {
            let fileDiff = '';
            try {
                // get diff for this file by comparing the base and head commits
                const diffAll = yield octokit_1.octokit.rest.repos.compareCommits({
                    owner: repo.owner,
                    repo: repo.repo,
                    base: context.payload.pull_request.base.sha,
                    head: context.payload.pull_request.head.sha
                });
                if (diffAll.data) {
                    const files = diffAll.data.files;
                    if (files != null) {
                        const file = files.find(f => f.filename === comment.path);
                        if (file != null && file.patch) {
                            fileDiff = file.patch;
                        }
                    }
                }
            }
            catch (error) {
                (0, core_1.warning)(`Failed to get file diff: ${error}, skipping.`);
            }
            // use file diff if no diff was found in the comment
            if (inputs.diff.length === 0) {
                if (fileDiff.length > 0) {
                    inputs.diff = fileDiff;
                    fileDiff = '';
                }
                else {
                    yield commenter.reviewCommentReply(pullNumber, topLevelComment, 'Cannot reply to this comment as diff could not be found.');
                    return;
                }
            }
            // get tokens so far
            let tokens = estimateTokens(prompts.renderComment(inputs));
            if (tokens > options.heavyTokenLimits.requestTokens) {
                yield commenter.reviewCommentReply(pullNumber, topLevelComment, 'Cannot reply to this comment as diff being commented is too large and exceeds the token limit.');
                return;
            }
            // pack file diff into the inputs if they are not too long
            if (fileDiff.length > 0) {
                // count occurrences of $file_diff in prompt
                const fileDiffCount = prompts.comment.split('$file_diff').length - 1;
                const fileDiffTokens = estimateTokens(fileDiff);
                if (fileDiffCount > 0 &&
                    tokens + fileDiffTokens * fileDiffCount <=
                        options.heavyTokenLimits.requestTokens) {
                    tokens += fileDiffTokens * fileDiffCount;
                    inputs.fileDiff = fileDiff;
                }
            }
            // get summary of the PR
            const summary = yield commenter.findCommentWithTag(commenter_1.SUMMARIZE_TAG, pullNumber);
            if (summary) {
                // pack short summary into the inputs if it is not too long
                const shortSummary = commenter.getShortSummary(summary.body);
                const shortSummaryTokens = estimateTokens(shortSummary);
                if (tokens + shortSummaryTokens <=
                    options.heavyTokenLimits.requestTokens) {
                    tokens += shortSummaryTokens;
                    inputs.shortSummary = shortSummary;
                }
            }
            const [reply] = yield heavyBot.chat(prompts.renderComment(inputs), {});
            yield commenter.reviewCommentReply(pullNumber, topLevelComment, reply);
        }
    }
    else {
        (0, core_1.info)(`Skipped: ${context.eventName} event is from the bot itself`);
    }
});
exports.handleReviewComment = handleReviewComment;
