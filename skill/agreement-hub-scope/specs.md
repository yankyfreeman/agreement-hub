# Specs, tasks and progress

Read this when the developer wants to turn the agreed scope into something to
build: "write the specs", "break the scope into features", "plan the build",
"make the tasks", or when tests have run and progress should be reported.

## The layers

| Layer | Answers | Where |
|---|---|---|
| Scope | What the client agreed | Agreement Hub, and `docs/scope/scope.md` (versions in Git) |
| **Spec** | What the system must do, as testable lines | `specs/<feature>/spec.md` |
| Plan | How it will be built | `specs/<feature>/plan.md` |
| Tasks | The steps to build it | `specs/<feature>/tasks.md` |
| Tests | Proof each spec line holds | the project's test suite |

Anything the client could notice is spec; anything they couldn't is plan. The
spec is the contract; tasks are disposable. If the project uses GitHub Spec Kit
(a `.specify/` folder or `/speckit.*` commands), use its commands for the plan
and tasks, and keep the spec lines in the format below.

## Writing the specs

1. Read the agreed scope: `get_markdown` with the connector, otherwise the
   project's `docs/scope/scope.md`. Also read the client's answers
   and comments (`get_document`): answers often decide the details.
2. Group the scope into features. One feature usually covers one `##` section
   or a few related `###` parts. Name the folder after the feature in
   lowercase with hyphens: `specs/booking-changes/`.
3. Write `specs/<feature>/spec.md`:

```markdown
# Booking changes
Scope: 3.2 Changing or cancelling (Agreement Hub version 3)

- **BC-1** The confirmation email has a link to change or cancel. (3.2)
- **BC-2** Changes are allowed until 24 hours before the appointment. (3.2)
- **BC-3** Within 24 hours, the link shows "Please call the clinic" instead. (3.2)
- **BC-4** A cancelled slot becomes free for other patients immediately. (3.2)
```

Rules for spec lines:

- One behaviour per line that the client could check: what the app does, not
  how it is built.
- Every line has a permanent **ID**: a 2–4 letter feature prefix and a number
  (`BC-2`). Never reuse or renumber an ID. Remove a line by striking it
  through with the date and reason, not by deleting it.
- Every line names the **scope section** it implements in brackets at the end
  (`(3.2)`). Only sections, not questions: a decision from an answer goes on the
  section it affects.
- Be specific enough to test: numbers, limits, exact messages.
- Write down the real-world cases the scope implies: no or slow connection,
  wrong input, two people at once, permissions, large data. Ask the developer
  about the ones that matter; they own these decisions.
- Info-only sections usually need no lines.

4. Show the developer the specs before syncing; they review them.
5. Call **`sync_specs`** with every line of every spec: `id`, `section`
   (the number in brackets), `text` (the line without the ID) and `feature`
   (the spec's title). Always send the full list: lines left out are removed.
   Struck-through lines are left out. Read back which agreed sections still
   have no lines and cover them, or tell the developer why not.
6. Commit the specs.

## Plan and tasks

- `plan.md`: the technical approach (data, screens, services, libraries).
  The developer reviews it before building.
- `tasks.md`: small, ordered steps, each naming the spec IDs it implements,
  and one or more tasks for tests:

```markdown
- [ ] T1 Add change_token to bookings (BC-1)
- [ ] T2 Send the change link in the confirmation email (BC-1)
- [ ] T3 Change/cancel page with the 24-hour rule (BC-2, BC-3)
- [ ] T4 Release the slot on cancel (BC-4)
- [ ] T5 Tests for BC-1 to BC-4
```

## Building and reporting progress

- Every spec ID gets at least one automated test, and the test name starts
  with the ID: `test("BC-2: change allowed until 24h before", …)`.
- Tick tasks off in `tasks.md` as they are done.
- After running the tests, call **`report_progress`** with each ID's result:
  `passing` when all its tests pass, `failing` when any fails, `not_built`
  when it has no test or implementation yet. Listing only the lines that
  changed is fine. The client sees passing lines as verified on the Progress
  tab.
- Don't report a line as passing because its task is ticked: only its tests
  count.

## When specs change

Behaviour changes go spec-first: change the spec line (or add one with a new
ID), call `sync_specs`, update the tests, then the code. A changed line has to
be verified again. If the change is something the client would notice and they
haven't agreed it, stop: it goes through Agreement Hub first, as a scope
update the client agrees to.
