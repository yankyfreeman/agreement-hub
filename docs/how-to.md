# How to use ag-hub in a project

A step-by-step guide for using ag-hub on any project: agree the scope
with the client, turn it into specs, build it, and show the client progress.
Claude does the writing; you review, decide and handle the real-world cases.

Site: https://agreement-hub.vercel.app

---

## Part 1. One-time setup (on each computer)

### 1. Install the skill

The skill teaches Claude the document format, where files go, and the
spec/progress process.

- **Claude Code:** download the skill and unzip it into `~/.claude/skills/`.

  Windows (PowerShell):
  ```powershell
  Invoke-WebRequest https://agreement-hub.vercel.app/ag-hub-scope.zip -OutFile $env:TEMP\ahs.zip
  Expand-Archive $env:TEMP\ahs.zip "$HOME\.claude\skills" -Force
  ```
  macOS / Linux:
  ```bash
  curl -L -o /tmp/ahs.zip https://agreement-hub.vercel.app/ag-hub-scope.zip
  unzip -o /tmp/ahs.zip -d ~/.claude/skills
  ```
- **Claude app (web or desktop):** Customize → Skills → + → Create skill →
  Upload a skill, and choose the ZIP. Needs "Code execution and file creation"
  on in Settings → Capabilities.

Check: `~/.claude/skills/ag-hub-scope/SKILL.md` exists. Re-download the
ZIP when the skill is updated.

### 2. Connect Claude to ag-hub (MCP)

Lets Claude publish, read the client's responses, reply, update, and report
progress without you opening the website.

- **Claude Code**, for all your projects:
  ```bash
  claude mcp add --transport http --scope user ag-hub https://agreement-hub.vercel.app/api/mcp
  ```
  Check with `claude mcp list`.
- **Claude app:** Customize → Connectors → add a custom connector, name it
  ag-hub, URL `https://agreement-hub.vercel.app/api/mcp`, no sign-in.

No account or key is needed. Each document's **developer link** is its key.

---

## Part 2. Each new project

Open Claude Code in the project's folder (or a Claude app conversation) and
follow the steps. The **Say** lines are example prompts.

### Step 1. Prepare the project (once)

Add this to the project's `.gitignore`, so the secret links are never
committed:

```
docs/scope/*.local.md
```

The skill also does this when it first saves files.

### Step 2. Write the scope document

Talk through the project: what it is, who it's for, the main features, what's
not included. Give Claude any notes, emails or an old document.

> **Say:** "Make a scope document for the client. Prepared for Dr. Smith,
> prepared by Yanky."
>
> or: "Here's my existing proposal. Prepare it for ag-hub."

Claude writes `docs/scope/scope.md`, then reviews it for gaps and edge cases
and tells you which questions it added. Read it fully. Anything undecided
should be a **question for the client** (`Q1`, `Q2`…), not a guess.

### Step 3. Publish it

> **Say:** "Publish it to ag-hub."

Claude returns two links and saves them in `docs/scope/links.local.md`:

| Link | Who | Keep it |
|---|---|---|
| Developer link `/manage/…` | You only | Like a password. It's the only way to manage the document; there is no recovery. |
| Client link `/d/…` | Send to the client | The client agrees, disagrees, comments and answers questions here |

Without the connector: on the website's home page, import the file, tick
**Info only** on sections that need no agreement, and bookmark the developer
page.

### Step 4. Send the client link

Send the client link by email or WhatsApp with a line like: "Please go
through each section and agree, or tell me what you'd change. The questions
at the end need your answers."

### Step 5. Read the client's responses and reply

> **Say:** "What did the client say?"

Claude lists disagreements, questions, answers, and what's still waiting.

> **Say:** "Reply on 4.2: the deposit is refundable up to 24 hours before."
>
> or: "Ask for more detail on Q3."

Claude shows you the reply before posting unless you've given the exact words.

### Step 6. Update the document after feedback

> **Say:** "Update the scope with the client's answers and the change to 4.2."

What Claude does, in order:

1. Saves the current `scope.md` and `record.md` in `docs/scope/` and commits
   (ag-hub keeps only the last 2 versions; your project's Git history
   keeps them all).
2. Edits only the sections that change, keeping headings and question numbers.
3. Shows you a **preview**: which sections the client must review again, and
   anything removed.
4. Applies it **only after you confirm**.
5. Saves the new version over `scope.md`, commits and tags it (`scope-v3`).

Check the preview carefully: a section whose text changed loses its
agreement and goes back to the client. Unchanged sections keep it.

Repeat steps 5–6 until every section is agreed and every question answered.

### Step 7. Turn the agreed scope into specs

> **Say:** "Write the specs from the agreed scope."

Claude writes one `specs/<feature>/spec.md` per feature, each line a testable
behaviour with an ID and the scope section it comes from:

```markdown
- **BC-2** Changes are allowed until 24 hours before the appointment. (3.2)
```

Review them: this is where you add the real-world cases (slow network, wrong
input, two people at once, permissions, large data). Then Claude sends the
lines to ag-hub (`sync_specs`) and tells you which agreed sections
have no spec lines yet. Every agreed section should be covered, or have a
reason it isn't.

### Step 8. Plan and tasks

> **Say:** "Make the plan and tasks for booking-changes."

- `plan.md`: how it will be built. You review it before building.
- `tasks.md`: small steps, each naming the spec IDs it implements.

### Step 9. Build, test, report progress

> **Say:** "Build T1 to T4, then run the tests and report progress."

- Every spec ID gets a test whose name starts with the ID:
  `test("BC-2: change allowed until 24h before", …)`.
- Claude reports results (`report_progress`). Passing lines show as
  **verified** on the **Progress** tab; the client sees it on their link.
- A line counts as done only when its tests pass, not when its task is ticked.

### Step 10. When the client asks for a change mid-project

Never change code straight from a call or message. Follow
`docs/spec-drift-and-changes.md` section 7, in short:

1. Write the request into ag-hub (comment or question).
2. Work out the impact: sections, spec IDs, tasks, tests, time, cost.
3. Update the scope (step 6) and **wait for the client to agree**.
4. Then update, in order: spec → tests → plan → tasks → code.

> **Say:** "The client wants 12 hours instead of 24 in 3.2. Work out the
> impact first, don't change anything."

---

## What lives where

```
your-project/
  docs/scope/
    scope.md         the document, always the current version (committed, tagged per version)
    record.md        who said what, the latest record (committed)
    links.local.md   developer + client links (never committed)
  specs/<feature>/
    spec.md    what it must do (IDs, scope sections)
    plan.md    how it's built
    tasks.md   the steps
```

ag-hub holds only the live copy: the current and previous version of
each section, its messages, and the spec lines with their test status.

Git keeps every version of `scope.md`. Each one is committed as
`Scope v3 (2026-10-22 14:30 UTC)` and tagged `scope-v3`:

- See an old version: `git show scope-v2:docs/scope/scope.md`, or open the
  tag on GitHub.
- See exactly what changed: `git diff scope-v2 scope-v3 -- docs/scope/scope.md`.
- Push the tags with your commits: `git push --follow-tags`.
- Times are UTC and match the version line inside the file.

---

## Rules to keep

1. **Scope leads, spec follows, code follows the spec.** Nothing the client
   could notice changes without their agreement in ag-hub.
2. **Never let important text change quietly.** Read every preview and diff
   before it's applied.
3. **Keep the developer link private.** Never in the document, the record, a
   commit, or a message to the client.
4. **Commit `docs/scope/` and `specs/`** at every save point. That's the
   history.
5. **Spec IDs are permanent.** Never reused or renumbered; removed lines are
   struck through with a date and reason.

## Troubleshooting

| Problem | Fix |
|---|---|
| Claude doesn't use the skill | Check `~/.claude/skills/ag-hub-scope/SKILL.md` exists; start a new session; or say "use the ag-hub-scope skill" |
| Claude has no ag-hub tools | `claude mcp list`; add it again (Part 1, step 2); start a new session |
| Claude asks for the developer link | It's in `docs/scope/links.local.md`, or your bookmark |
| Lost the developer link | It can't be recovered. Publish `docs/scope/scope.md` as a new document and send the client the new link |
| Project has old dated files (`…-scope-v2_2026-….md`) | Say "switch docs/scope to one file". Claude keeps the latest as `scope.md` and removes the old copies; they stay in Git history |
| "Too many requests" | Rate limit; wait a minute and retry |
| Client doesn't see the Progress tab | It appears once spec lines have been synced |
