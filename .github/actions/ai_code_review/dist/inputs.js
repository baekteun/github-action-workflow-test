"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inputs = void 0;
class Inputs {
    constructor() {
        this.title = "";
        this.description = "";
        this.filename = "";
        this.fileDiff = "";
        this.diff = "";
        this.comment = "";
        this.commentChain = "";
        this.patches = "";
        this.rawSummary = "";
        this.shortSummary = "";
        this.systemMessage = "";
    }
    clone() {
        const clone = new Inputs();
        Object.assign(clone, this);
        return clone;
    }
    render(template) {
        return template
            .replace("$title", this.title)
            .replace("$description", this.description)
            .replace("$filename", this.filename)
            .replace("$file_diff", this.fileDiff)
            .replace("$diff", this.diff)
            .replace("$comment", this.comment)
            .replace("$comment_chain", this.commentChain)
            .replace("$patches", this.patches)
            .replace("$raw_summary", this.rawSummary)
            .replace("$short_summary", this.shortSummary)
            .replace("$system_message", this.systemMessage);
    }
}
exports.Inputs = Inputs;
