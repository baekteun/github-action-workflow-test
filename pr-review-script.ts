import { readFileSync as r } from "fs"
import * as c from "@actions/core"
import { Octokit as O } from "@octokit/rest"
import p, { Chunk as C, File as F } from "parse-diff"
import m from "minimatch"
import { Client as L } from "ollama"

const T = c.getInput("GITHUB_TOKEN"), M = c.getInput("OLLAMA_MODEL")

const o = new O({ auth: T }), l = new L()

async function _() {
const { repository: e, number: n } = JSON.parse(r(process.env.GITHUB_EVENT_PATH || "", "utf8"))
const t = await o.pulls.get({ owner: e.owner.login, repo: e.name, pull_number: n })
return { o: e.owner.login, r: e.name, p: n, t: t.data.title ?? "", d: t.data.body ?? "" }
}

async function $(e, n, t) {
return (await o.pulls.get({ owner: e, repo: n, pull_number: t, mediaType: { format: "diff" } })).data
}

async function A(e, n) {
const t = []
for (const a of e) if (a.to !== "/dev/null") for (const i of a.chunks) {
  const s = `Your task is to review pull requests. Instructions:
- Provide the response in following JSON format:  {"reviews": [{"lineNumber":  <line_number>, "reviewComment": "<review comment>"}]}
- Do not give positive comments or compliments.
- Provide comments and suggestions ONLY if there is something to improve, otherwise "reviews" should be an empty array.
- Write the comment in GitHub Markdown format.
- Use the given description only for the overall context and only comment the code.
- IMPORTANT: NEVER suggest adding comments to the code.

Review the following code diff in the file "${a.to}" and take the pull request title and description into account when writing the response.
  
Pull request title: ${n.t}
Pull request description:

---
${n.d}
---

Git diff to review:

\`\`\`diff
${i.content}
${i.changes.map(u => `${u.ln ? u.ln : u.ln2} ${u.content}`).join("\n")}
\`\`\`
`
  const f = await (async u => { try {
    const h = await l.generate({ model: M, prompt: u })
    return JSON.parse(h.response.trim()).reviews
  } catch (h) { return console.error("Error:", h), null } })(s)
  if (f) {
    const u = f.flatMap(h => a.to ? { body: h.reviewComment, path: a.to, line: Number(h.lineNumber) } : [])
    u && t.push(...u)
  }
}
return t
}

async function q() {
const e = await _()
let n
const t = JSON.parse(r(process.env.GITHUB_EVENT_PATH ?? "", "utf8"))
if (t.action === "opened") n = await $(e.o, e.r, e.p)
else if (t.action === "synchronize") {
  const a = t.before, i = t.after,
    s = await o.repos.compareCommits({
      headers: { accept: "application/vnd.github.v3.diff" },
      owner: e.o, repo: e.r, base: a, head: i
    })
  n = String(s.data)
} else { console.log("Unsupported event:", process.env.GITHUB_EVENT_NAME); return }
if (!n) { console.log("No diff found"); return }
const a = p(n),
  i = c.getInput("exclude").split(",").map(s => s.trim()),
  f = a.filter(s => !i.some(u => m(s.to ?? "", u))),
  u = await A(f, e)
u.length > 0 && await o.pulls.createReview({
  owner: e.o, repo: e.r, pull_number: e.p, comments: u, event: "COMMENT"
})
}

q().catch(e => { console.error("Error:", e), process.exit(1) })