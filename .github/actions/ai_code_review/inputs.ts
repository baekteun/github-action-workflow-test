export class Inputs {
  title: string = "";
  description: string = "";
  filename: string = "";
  fileDiff: string = "";
  diff: string = "";
  comment: string = "";
  commentChain: string = "";
  patches: string = "";
  rawSummary: string = "";
  shortSummary: string = "";
  systemMessage: string = "";

  constructor() {}

  clone(): Inputs {
    const clone = new Inputs();
    Object.assign(clone, this);
    return clone;
  }

  render(template: string): string {
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
