script({
  files: ["**.kt"],
  title: "pull request review",
  system: ["system.annotations"],
  tools: ["fs"],
  model: "ollama:llama3.2",
});

const defaultBranch = env.vars.defaultBranch || (await git.defaultBranch());
const diff = await git.diff({
  base: defaultBranch,
  paths: ["**.kt"],
  excludedPaths: [],
});

def("GIT_DIFF", diff, {
  language: "diff",
  maxTokens: 300_000,
});

$`
You are an expert software developer and architect. You are
an expert in software reliability, security, scalability, and performance.

## Task

GIT_DIFF contains the changes the pull request branch.

Analyze the changes in GIT_DIFF in your mind.

If the changes look good, respond "LGTM :rocket:". If you have any concerns, provide a brief description of the concerns.

- All the Swift files are compiled and type-checked by the Swift compiler. Do not report issues that the Kotlin compiler would find.
- only report functional issues
- Use emojis
- If available, suggest code fixes and improvements using a diff format.
- do not report about individual lines of code, summarize changes
`;
