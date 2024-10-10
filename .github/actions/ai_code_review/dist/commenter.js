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
exports.Commenter = exports.COMMIT_ID_END_TAG = exports.COMMIT_ID_START_TAG = exports.SHORT_SUMMARY_END_TAG = exports.SHORT_SUMMARY_START_TAG = exports.RAW_SUMMARY_END_TAG = exports.RAW_SUMMARY_START_TAG = exports.DESCRIPTION_END_TAG = exports.DESCRIPTION_START_TAG = exports.IN_PROGRESS_END_TAG = exports.IN_PROGRESS_START_TAG = exports.SUMMARIZE_TAG = exports.COMMENT_REPLY_TAG = exports.COMMENT_TAG = exports.COMMENT_GREETING = void 0;
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const octokit_1 = require("./octokit");
const context = github_1.context;
const repo = context.repo;
exports.COMMENT_GREETING = `${(0, core_1.getInput)("bot_icon")}   AI Code Reviewer`;
exports.COMMENT_TAG = "<!-- This is an auto-generated comment by AI Code Reviewer -->";
exports.COMMENT_REPLY_TAG = "<!-- This is an auto-generated reply by AI Code Reviewer -->";
exports.SUMMARIZE_TAG = "<!-- This is an auto-generated comment: summarize by AI Code Reviewer -->";
exports.IN_PROGRESS_START_TAG = "<!-- This is an auto-generated comment: summarize review in progress by AI Code Reviewer -->";
exports.IN_PROGRESS_END_TAG = "<!-- end of auto-generated comment: summarize review in progress by AI Code Reviewer -->";
exports.DESCRIPTION_START_TAG = "<!-- This is an auto-generated comment: release notes by AI Code Reviewer -->";
exports.DESCRIPTION_END_TAG = "<!-- end of auto-generated comment: release notes by AI Code Reviewer -->";
exports.RAW_SUMMARY_START_TAG = `<!-- This is an auto-generated comment: raw summary by AI Code Reviewer -->
<!--
`;
exports.RAW_SUMMARY_END_TAG = `-->
<!-- end of auto-generated comment: raw summary by AI Code Reviewer -->`;
exports.SHORT_SUMMARY_START_TAG = `<!-- This is an auto-generated comment: short summary by AI Code Reviewer -->
<!--
`;
exports.SHORT_SUMMARY_END_TAG = `-->
<!-- end of auto-generated comment: short summary by AI Code Reviewer -->`;
exports.COMMIT_ID_START_TAG = "<!-- commit_ids_reviewed_start -->";
exports.COMMIT_ID_END_TAG = "<!-- commit_ids_reviewed_end -->";
class Commenter {
    constructor() {
        this.reviewCommentsBuffer = [];
        this.reviewCommentsCache = {};
        this.issueCommentsCache = {};
    }
    comment(message, tag, mode) {
        return __awaiter(this, void 0, void 0, function* () {
            let target;
            if (context.payload.pull_request != null) {
                target = context.payload.pull_request.number;
            }
            else if (context.payload.issue != null) {
                target = context.payload.issue.number;
            }
            else {
                (0, core_1.warning)("Skipped: context.payload.pull_request and context.payload.issue are both null");
                return;
            }
            if (!tag) {
                tag = exports.COMMENT_TAG;
            }
            const body = `${exports.COMMENT_GREETING}

${message}

${tag}`;
            if (mode === "create") {
                yield this.create(body, target);
            }
            else if (mode === "replace") {
                yield this.replace(body, tag, target);
            }
            else {
                (0, core_1.warning)(`Unknown mode: ${mode}, use "replace" instead`);
                yield this.replace(body, tag, target);
            }
        });
    }
    getContentWithinTags(content, startTag, endTag) {
        const start = content.indexOf(startTag);
        const end = content.indexOf(endTag);
        if (start >= 0 && end >= 0) {
            return content.slice(start + startTag.length, end);
        }
        return "";
    }
    removeContentWithinTags(content, startTag, endTag) {
        const start = content.indexOf(startTag);
        const end = content.lastIndexOf(endTag);
        if (start >= 0 && end >= 0) {
            return content.slice(0, start) + content.slice(end + endTag.length);
        }
        return content;
    }
    getRawSummary(summary) {
        return this.getContentWithinTags(summary, exports.RAW_SUMMARY_START_TAG, exports.RAW_SUMMARY_END_TAG);
    }
    getShortSummary(summary) {
        return this.getContentWithinTags(summary, exports.SHORT_SUMMARY_START_TAG, exports.SHORT_SUMMARY_END_TAG);
    }
    getDescription(description) {
        return this.removeContentWithinTags(description, exports.DESCRIPTION_START_TAG, exports.DESCRIPTION_END_TAG);
    }
    getReleaseNotes(description) {
        const releaseNotes = this.getContentWithinTags(description, exports.DESCRIPTION_START_TAG, exports.DESCRIPTION_END_TAG);
        return releaseNotes.replace(/(^|\n)> .*/g, "");
    }
    updateDescription(pullNumber, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pr = yield octokit_1.octokit.rest.pulls.get({
                    owner: repo.owner,
                    repo: repo.repo,
                    pull_number: pullNumber,
                });
                let body = "";
                if (pr.data.body) {
                    body = pr.data.body;
                }
                const description = this.getDescription(body);
                const messageClean = this.removeContentWithinTags(message, exports.DESCRIPTION_START_TAG, exports.DESCRIPTION_END_TAG);
                const newDescription = `${description}\n${exports.DESCRIPTION_START_TAG}\n${messageClean}\n${exports.DESCRIPTION_END_TAG}`;
                yield octokit_1.octokit.rest.pulls.update({
                    owner: repo.owner,
                    repo: repo.repo,
                    pull_number: pullNumber,
                    body: newDescription,
                });
            }
            catch (e) {
                (0, core_1.warning)(`Failed to get PR: ${e}, skipping adding release notes to description.`);
            }
        });
    }
    bufferReviewComment(path, startLine, endLine, message) {
        return __awaiter(this, void 0, void 0, function* () {
            message = `${exports.COMMENT_GREETING}

${message}

${exports.COMMENT_TAG}`;
            this.reviewCommentsBuffer.push({
                path,
                startLine,
                endLine,
                message,
            });
        });
    }
    deletePendingReview(pullNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const reviews = yield octokit_1.octokit.rest.pulls.listReviews({
                    owner: repo.owner,
                    repo: repo.repo,
                    pull_number: pullNumber,
                });
                const pendingReview = reviews.data.find((review) => review.state === "PENDING");
                if (pendingReview) {
                    (0, core_1.info)(`Deleting pending review for PR #${pullNumber} id: ${pendingReview.id}`);
                    try {
                        yield octokit_1.octokit.rest.pulls.deletePendingReview({
                            owner: repo.owner,
                            repo: repo.repo,
                            pull_number: pullNumber,
                            review_id: pendingReview.id,
                        });
                    }
                    catch (e) {
                        (0, core_1.warning)(`Failed to delete pending review: ${e}`);
                    }
                }
            }
            catch (e) {
                (0, core_1.warning)(`Failed to list reviews: ${e}`);
            }
        });
    }
    submitReview(pullNumber, commitId, statusMsg) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = `${exports.COMMENT_GREETING}

${statusMsg}
`;
            if (this.reviewCommentsBuffer.length === 0) {
                (0, core_1.info)(`Submitting empty review for PR #${pullNumber}`);
                try {
                    yield octokit_1.octokit.rest.pulls.createReview({
                        owner: repo.owner,
                        repo: repo.repo,
                        pull_number: pullNumber,
                        commit_id: commitId,
                        event: "COMMENT",
                        body,
                    });
                }
                catch (e) {
                    (0, core_1.warning)(`Failed to submit empty review: ${e}`);
                }
                return;
            }
            for (const comment of this.reviewCommentsBuffer) {
                const comments = yield this.getCommentsAtRange(pullNumber, comment.path, comment.startLine, comment.endLine);
                for (const c of comments) {
                    if (c.body.includes(exports.COMMENT_TAG)) {
                        (0, core_1.info)(`Deleting review comment for ${comment.path}:${comment.startLine}-${comment.endLine}: ${comment.message}`);
                        try {
                            yield octokit_1.octokit.rest.pulls.deleteReviewComment({
                                owner: repo.owner,
                                repo: repo.repo,
                                comment_id: c.id,
                            });
                        }
                        catch (e) {
                            (0, core_1.warning)(`Failed to delete review comment: ${e}`);
                        }
                    }
                }
            }
            yield this.deletePendingReview(pullNumber);
            const generateCommentData = (comment) => {
                const commentData = {
                    path: comment.path,
                    body: comment.message,
                    line: comment.endLine,
                };
                if (comment.startLine !== comment.endLine) {
                    commentData.start_line = comment.startLine;
                    commentData.start_side = "RIGHT";
                }
                return commentData;
            };
            try {
                const review = yield octokit_1.octokit.rest.pulls.createReview({
                    owner: repo.owner,
                    repo: repo.repo,
                    pull_number: pullNumber,
                    commit_id: commitId,
                    comments: this.reviewCommentsBuffer.map((comment) => generateCommentData(comment)),
                });
                (0, core_1.info)(`Submitting review for PR #${pullNumber}, total comments: ${this.reviewCommentsBuffer.length}, review id: ${review.data.id}`);
                yield octokit_1.octokit.rest.pulls.submitReview({
                    owner: repo.owner,
                    repo: repo.repo,
                    pull_number: pullNumber,
                    review_id: review.data.id,
                    event: "COMMENT",
                    body,
                });
            }
            catch (e) {
                (0, core_1.warning)(`Failed to create review: ${e}. Falling back to individual comments.`);
                yield this.deletePendingReview(pullNumber);
                let commentCounter = 0;
                for (const comment of this.reviewCommentsBuffer) {
                    (0, core_1.info)(`Creating new review comment for ${comment.path}:${comment.startLine}-${comment.endLine}: ${comment.message}`);
                    const commentData = Object.assign({ owner: repo.owner, repo: repo.repo, pull_number: pullNumber, commit_id: commitId }, generateCommentData(comment));
                    try {
                        yield octokit_1.octokit.rest.pulls.createReviewComment(commentData);
                    }
                    catch (ee) {
                        (0, core_1.warning)(`Failed to create review comment: ${ee}`);
                    }
                    commentCounter++;
                    (0, core_1.info)(`Comment ${commentCounter}/${this.reviewCommentsBuffer.length} posted`);
                }
            }
        });
    }
    reviewCommentReply(pullNumber, topLevelComment, message) {
        return __awaiter(this, void 0, void 0, function* () {
            const reply = `${exports.COMMENT_GREETING}

${message}

${exports.COMMENT_REPLY_TAG}
`;
            try {
                yield octokit_1.octokit.rest.pulls.createReplyForReviewComment({
                    owner: repo.owner,
                    repo: repo.repo,
                    pull_number: pullNumber,
                    body: reply,
                    comment_id: topLevelComment.id,
                });
            }
            catch (error) {
                (0, core_1.warning)(`Failed to reply to the top-level comment ${error}`);
                try {
                    yield octokit_1.octokit.rest.pulls.createReplyForReviewComment({
                        owner: repo.owner,
                        repo: repo.repo,
                        pull_number: pullNumber,
                        body: `Could not post the reply to the top-level comment due to the following error: ${error}`,
                        comment_id: topLevelComment.id,
                    });
                }
                catch (e) {
                    (0, core_1.warning)(`Failed to reply to the top-level comment ${e}`);
                }
            }
            try {
                if (topLevelComment.body.includes(exports.COMMENT_TAG)) {
                    const newBody = topLevelComment.body.replace(exports.COMMENT_TAG, exports.COMMENT_REPLY_TAG);
                    yield octokit_1.octokit.rest.pulls.updateReviewComment({
                        owner: repo.owner,
                        repo: repo.repo,
                        comment_id: topLevelComment.id,
                        body: newBody,
                    });
                }
            }
            catch (error) {
                (0, core_1.warning)(`Failed to update the top-level comment ${error}`);
            }
        });
    }
    getCommentsWithinRange(pullNumber, path, startLine, endLine) {
        return __awaiter(this, void 0, void 0, function* () {
            const comments = yield this.listReviewComments(pullNumber);
            return comments.filter((comment) => comment.path === path &&
                comment.body !== "" &&
                ((comment.start_line !== undefined &&
                    comment.start_line >= startLine &&
                    comment.line <= endLine) ||
                    (startLine === endLine && comment.line === endLine)));
        });
    }
    getCommentsAtRange(pullNumber, path, startLine, endLine) {
        return __awaiter(this, void 0, void 0, function* () {
            const comments = yield this.listReviewComments(pullNumber);
            return comments.filter((comment) => comment.path === path &&
                comment.body !== "" &&
                ((comment.start_line !== undefined &&
                    comment.start_line === startLine &&
                    comment.line === endLine) ||
                    (startLine === endLine && comment.line === endLine)));
        });
    }
    getCommentChainsWithinRange(pullNumber, path, startLine, endLine, tag = "") {
        return __awaiter(this, void 0, void 0, function* () {
            const existingComments = yield this.getCommentsWithinRange(pullNumber, path, startLine, endLine);
            const topLevelComments = [];
            for (const comment of existingComments) {
                if (!comment.in_reply_to_id) {
                    topLevelComments.push(comment);
                }
            }
            let allChains = "";
            let chainNum = 0;
            for (const topLevelComment of topLevelComments) {
                const chain = yield this.composeCommentChain(existingComments, topLevelComment);
                if (chain && chain.includes(tag)) {
                    chainNum += 1;
                    allChains += `Conversation Chain ${chainNum}:
${chain}
---
`;
                }
            }
            return allChains;
        });
    }
    composeCommentChain(reviewComments, topLevelComment) {
        return __awaiter(this, void 0, void 0, function* () {
            const conversationChain = reviewComments
                .filter((cmt) => cmt.in_reply_to_id === topLevelComment.id)
                .map((cmt) => `${cmt.user.login}: ${cmt.body}`);
            conversationChain.unshift(`${topLevelComment.user.login}: ${topLevelComment.body}`);
            return conversationChain.join("\n---\n");
        });
    }
    getCommentChain(pullNumber, comment) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const reviewComments = yield this.listReviewComments(pullNumber);
                const topLevelComment = yield this.getTopLevelComment(reviewComments, comment);
                const chain = yield this.composeCommentChain(reviewComments, topLevelComment);
                return { chain, topLevelComment };
            }
            catch (e) {
                (0, core_1.warning)(`Failed to get conversation chain: ${e}`);
                return {
                    chain: "",
                    topLevelComment: null,
                };
            }
        });
    }
    getTopLevelComment(reviewComments, comment) {
        return __awaiter(this, void 0, void 0, function* () {
            let topLevelComment = comment;
            while (topLevelComment.in_reply_to_id) {
                const parentComment = reviewComments.find((cmt) => cmt.id === topLevelComment.in_reply_to_id);
                if (parentComment) {
                    topLevelComment = parentComment;
                }
                else {
                    break;
                }
            }
            return topLevelComment;
        });
    }
    listReviewComments(target) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.reviewCommentsCache[target]) {
                return this.reviewCommentsCache[target];
            }
            const allComments = [];
            let page = 1;
            try {
                for (;;) {
                    const { data: comments } = yield octokit_1.octokit.rest.pulls.listReviewComments({
                        owner: repo.owner,
                        repo: repo.repo,
                        pull_number: target,
                        page,
                        per_page: 100,
                    });
                    allComments.push(...comments);
                    page++;
                    if (!comments || comments.length < 100) {
                        break;
                    }
                }
                this.reviewCommentsCache[target] = allComments;
                return allComments;
            }
            catch (e) {
                (0, core_1.warning)(`Failed to list review comments: ${e}`);
                return allComments;
            }
        });
    }
    create(body, target) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield octokit_1.octokit.rest.issues.createComment({
                    owner: repo.owner,
                    repo: repo.repo,
                    issue_number: target,
                    body,
                });
                if (this.issueCommentsCache[target]) {
                    this.issueCommentsCache[target].push(response.data);
                }
                else {
                    this.issueCommentsCache[target] = [response.data];
                }
            }
            catch (e) {
                (0, core_1.warning)(`Failed to create comment: ${e}`);
            }
        });
    }
    replace(body, tag, target) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cmt = yield this.findCommentWithTag(tag, target);
                if (cmt) {
                    yield octokit_1.octokit.rest.issues.updateComment({
                        owner: repo.owner,
                        repo: repo.repo,
                        comment_id: cmt.id,
                        body,
                    });
                }
                else {
                    yield this.create(body, target);
                }
            }
            catch (e) {
                (0, core_1.warning)(`Failed to replace comment: ${e}`);
            }
        });
    }
    findCommentWithTag(tag, target) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const comments = yield this.listComments(target);
                for (const cmt of comments) {
                    if (cmt.body && cmt.body.includes(tag)) {
                        return cmt;
                    }
                }
                return null;
            }
            catch (e) {
                (0, core_1.warning)(`Failed to find comment with tag: ${e}`);
                return null;
            }
        });
    }
    listComments(target) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.issueCommentsCache[target]) {
                return this.issueCommentsCache[target];
            }
            const allComments = [];
            let page = 1;
            try {
                for (;;) {
                    const { data: comments } = yield octokit_1.octokit.rest.issues.listComments({
                        owner: repo.owner,
                        repo: repo.repo,
                        issue_number: target,
                        page,
                        per_page: 100,
                    });
                    allComments.push(...comments);
                    page++;
                    if (!comments || comments.length < 100) {
                        break;
                    }
                }
                this.issueCommentsCache[target] = allComments;
                return allComments;
            }
            catch (e) {
                (0, core_1.warning)(`Failed to list comments: ${e}`);
                return allComments;
            }
        });
    }
    getReviewedCommitIds(commentBody) {
        const start = commentBody.indexOf(exports.COMMIT_ID_START_TAG);
        const end = commentBody.indexOf(exports.COMMIT_ID_END_TAG);
        if (start === -1 || end === -1) {
            return [];
        }
        const ids = commentBody.substring(start + exports.COMMIT_ID_START_TAG.length, end);
        return ids
            .split("<!--")
            .map((id) => id.replace("-->", "").trim())
            .filter((id) => id !== "");
    }
    getReviewedCommitIdsBlock(commentBody) {
        const start = commentBody.indexOf(exports.COMMIT_ID_START_TAG);
        const end = commentBody.indexOf(exports.COMMIT_ID_END_TAG);
        if (start === -1 || end === -1) {
            return "";
        }
        return commentBody.substring(start, end + exports.COMMIT_ID_END_TAG.length);
    }
    addReviewedCommitId(commentBody, commitId) {
        const start = commentBody.indexOf(exports.COMMIT_ID_START_TAG);
        const end = commentBody.indexOf(exports.COMMIT_ID_END_TAG);
        if (start === -1 || end === -1) {
            return `${commentBody}\n${exports.COMMIT_ID_START_TAG}\n<!-- ${commitId} -->\n${exports.COMMIT_ID_END_TAG}`;
        }
        const ids = commentBody.substring(start + exports.COMMIT_ID_START_TAG.length, end);
        return `${commentBody.substring(0, start + exports.COMMIT_ID_START_TAG.length)}${ids}<!-- ${commitId} -->\n${commentBody.substring(end)}`;
    }
    getHighestReviewedCommitId(commitIds, reviewedCommitIds) {
        for (let i = commitIds.length - 1; i >= 0; i--) {
            if (reviewedCommitIds.includes(commitIds[i])) {
                return commitIds[i];
            }
        }
        return "";
    }
    getAllCommitIds() {
        return __awaiter(this, void 0, void 0, function* () {
            const allCommits = [];
            let page = 1;
            let commits;
            if (context && context.payload && context.payload.pull_request != null) {
                do {
                    commits = yield octokit_1.octokit.rest.pulls.listCommits({
                        owner: repo.owner,
                        repo: repo.repo,
                        pull_number: context.payload.pull_request.number,
                        per_page: 100,
                        page,
                    });
                    allCommits.push(...commits.data.map((commit) => commit.sha));
                    page++;
                } while (commits.data.length > 0);
            }
            return allCommits;
        });
    }
    addInProgressStatus(commentBody, statusMsg) {
        const start = commentBody.indexOf(exports.IN_PROGRESS_START_TAG);
        const end = commentBody.indexOf(exports.IN_PROGRESS_END_TAG);
        if (start === -1 || end === -1) {
            return `${exports.IN_PROGRESS_START_TAG}

Currently reviewing new changes in this PR...

${statusMsg}

${exports.IN_PROGRESS_END_TAG}

---

${commentBody}`;
        }
        return commentBody;
    }
    removeInProgressStatus(commentBody) {
        const start = commentBody.indexOf(exports.IN_PROGRESS_START_TAG);
        const end = commentBody.indexOf(exports.IN_PROGRESS_END_TAG);
        if (start !== -1 && end !== -1) {
            return (commentBody.substring(0, start) +
                commentBody.substring(end + exports.IN_PROGRESS_END_TAG.length));
        }
        return commentBody;
    }
}
exports.Commenter = Commenter;
