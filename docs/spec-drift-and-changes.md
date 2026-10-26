# Keeping specs honest: drift checklist and client changes

The process Agreement Hub is built around: projects built with AI from a scope
the client agreed in Agreement Hub. The skill (`skill/agreement-hub-scope/`,
especially `specs.md`) follows it, and the Progress tab shows its result to
the client. Drift warnings in the app are planned for later; until then this
checklist is how drift is kept in check.

**Spec drift** is when the spec says one thing and the code does another. It
creeps in when behaviour is changed in code (a bug fix, a tweak, a client's
"small" request) and the spec isn't updated. After a while the spec is fiction,
and an AI working from it builds the wrong thing.

You can't make drift impossible, but you can make it **impossible to miss**:
every agreed behaviour has an ID, every ID has a test, and behaviour only
changes spec-first.

---

## 1. The layers, and who owns each

| Layer | Answers | Lives in | Changed by |
|---|---|---|---|
| **Scope** | What the client agreed | Agreement Hub, snapshots in `docs/scope/` | Only with the client's agreement |
| **Spec** | What the system must do, line by line, testable | `specs/<feature>/spec.md` | Only when the scope changes, or to make it more precise |
| **Plan** | How it will be built | `specs/<feature>/plan.md` | Developer / AI, freely |
| **Tasks** | Steps to build it | `specs/<feature>/tasks.md` | Developer / AI, freely; disposable |
| **Tests** | Proof the spec holds | the test suite | With the spec line they check |
| **Code** | The app | the codebase | Only to satisfy the spec |

Rule of thumb: **anything the client could notice is spec; anything they
couldn't is plan.** Spec changes need the client; plan changes don't.

## 2. How specs are written

```markdown
# Booking changes                      (specs/booking-changes/spec.md)
Scope: 3.2 Changing or cancelling

- **BC-1** The confirmation email has a link to change or cancel.
- **BC-2** Changes are allowed until 24 hours before the appointment.
- **BC-3** Within 24 hours, the link shows "Please call the clinic" instead.
- **BC-4** A cancelled slot becomes free for other patients immediately.
- ~~**BC-5** Patients can cancel by SMS.~~ Removed 2026-11-02 (scope v4: SMS dropped).
```

- [ ] Each line is one **behaviour** the client could check, not an
      implementation detail ("uses Postgres", "a modal").
- [ ] Each line has an **ID**: a short feature prefix plus a number (`BC-2`).
- [ ] IDs are **never reused or renumbered**. Removed lines are struck
      through with the date and reason, not deleted.
- [ ] Each spec names the **scope section(s)** it comes from.
- [ ] Each line is specific enough to test: numbers, limits, exact messages.
- [ ] Real-world cases are written down, not assumed: slow network, offline,
      wrong input, two people at once, large data, permissions. This is
      where you add the most value; the AI won't think of all of them.

## 3. The traceability chain

Every ID should appear all the way down:

```
Scope 3.2  →  BC-2 (spec)  →  T3 (task)  →  test "BC-2: change allowed until 24h"  →  code
```

- [ ] Tasks list the IDs they implement: `- [ ] T3 Change/cancel page (BC-2, BC-3)`
- [ ] Test names start with the ID: `test("BC-2: change allowed until 24h", …)`
- [ ] Every spec line has at least one test. A line with no test is unverified.
- [ ] Every test that checks behaviour names a spec line. A test with no spec
      line is behaviour nobody agreed to.

## 4. Every change to code (each PR)

Ask the AI to fill this in, and check it yourself before merging.

- [ ] Does this change what the client can see or do?
  - **No** (refactor, performance, internal fix): no spec change. Tests
    must still pass unchanged.
  - **Yes**: was this agreed? If not, **stop** and go to section 7.
- [ ] If behaviour changed: the spec line was updated **in the same PR**,
      **before** the code.
- [ ] Tests for every changed ID were updated or added, and all tests pass.
- [ ] No test was deleted or weakened just to make it pass.
- [ ] Tasks touched are ticked, with their IDs.
- [ ] Bug fixes: is the bug a gap in the spec? If the spec didn't say what
      should happen, add the line (and its test), then fix.
- [ ] The commit or PR message names the IDs: `BC-2: allow changes until 24h (was 48h)`.

## 5. Weekly drift check (15 minutes)

- [ ] Ask the AI for a drift report: read every `spec.md` and the code, and
      list (a) spec lines with no test, (b) behaviour-checking tests with no
      spec line, (c) places where the code seems to do something the spec
      doesn't say.
- [ ] Fix each finding: add the missing test, add the missing spec line (with
      the client's agreement if it's visible to them), or fix the code.
- [ ] Check that every agreed scope section in Agreement Hub has a spec, and
      every spec points back to a scope section.
- [ ] Skim the open tasks: anything stale or no longer matching the spec gets
      removed.

## 6. Before a release or demo to the client

- [ ] All tests pass. For the features being shown, every spec line has a
      passing test.
- [ ] You have tried the real-world cases yourself: slow connection, phone
      and tablet sizes, wrong input, the busiest realistic load.
- [ ] Anything not finished, or knowingly different from the spec, is listed
      for the client. No surprises in the demo.
- [ ] The current scope and conversation record are saved in `docs/scope/`
      and committed.

---

## 7. When the client asks for a change mid-project

Changes are normal. Drift comes from changes that skip steps. Follow this
order every time, even for "tiny" requests.

### Step 1: Capture it in writing

- [ ] If it came by call, WhatsApp or email, write it down and put it in
      Agreement Hub as a comment on the affected section, or as a new
      question if it needs a decision. The record must show it.
- [ ] Note the date, who asked, and their exact words.
- [ ] Never change code straight from a conversation.

### Step 2: Classify it

| Type | Example | Needs client agreement? |
|---|---|---|
| **Clarification** | "By 'staff' I meant managers too" | Only if it changes what was agreed |
| **Small change** to agreed behaviour | "Make it 12 hours, not 24" | Yes |
| **New feature** | "Add loyalty points" | Yes, plus effort and timeline |
| **Removal** | "Drop SMS reminders" | Yes |
| **Conflict** with something agreed | "Allow cancelling anytime" vs. agreed 24h rule | Yes, and point out the conflict |
| **Out of scope** for the project | "Also build an iOS app" | Yes, usually a separate quote |

### Step 3: Work out the impact (the AI drafts, you check)

- [ ] Which scope sections and spec IDs are affected?
- [ ] Which tasks are already **done** (rework), **in progress** (pause) or
      **not started** (just update)?
- [ ] Which tests change? What else could break (other features, data
      already stored, real-world cases)?
- [ ] Effort, timeline and cost effect. Is it a paid change?
- [ ] Any risk the client should know (performance, security, delays).

### Step 4: Agree it with the client

- [ ] Tell the client the impact in plain words: what changes, what it costs
      in time or money, and anything that gets dropped or delayed.
- [ ] Update the scope **in Agreement Hub** (save the snapshot and record
      first, as the skill does), so the client reviews just the changed
      section.
- [ ] **Wait for the client to agree** in Agreement Hub before touching the
      spec or code. A "yes" on a call becomes a written agreement there.
- [ ] If the client says no, or wants to think: nothing else changes. Note
      the decision in the thread.

### Step 5: Update the spec, then everything below it (in this order)

1. [ ] **Spec:** change the affected lines; add new lines with new IDs;
       strike through removed lines with the date and reason. Reference the
       new scope version.
2. [ ] **Tests:** update or add tests for every changed ID; mark tests for
       removed lines for deletion.
3. [ ] **Plan:** adjust if the approach changes.
4. [ ] **Tasks:** cancel obsolete tasks, add new ones with IDs. Mark rework
       on finished work clearly (`T9 Rework BC-2 for 12h rule`).
5. [ ] **Code:** only now, to make the tests pass.

### Step 6: Verify and record

- [ ] All tests pass, including the changed IDs.
- [ ] Try the changed behaviour yourself, including its real-world cases.
- [ ] Commit with the IDs and scope version:
      `Scope v4 / BC-2: changes allowed until 12h before (client request 2026-11-02)`.
- [ ] The scope snapshot and conversation record in `docs/scope/` are up to
      date.
- [ ] Tell the client it's done, and where they can see it.

### Special cases

- **"It's just a tiny change."** Size doesn't matter; the steps do. A tiny
  change can be quick, but it still goes through steps 1, 4 and 5.
- **Change to something already built.** Treat the rework as new tasks, and
  tell the client it's rework (it affects the timeline).
- **Urgent change during a build.** Pause the affected tasks first, so the AI
  doesn't keep building the old behaviour, then follow the steps.
- **Client changes their mind back.** It's a new change with a new scope
  version. Don't revert history; restore by adding the line back with a new
  ID or un-striking it with a note.
- **Two requests that conflict.** Don't pick one yourself. Put both to the
  client as a question in Agreement Hub.
- **Your own idea while building.** Same steps. If the client would notice
  it, they agree to it first.

---

## 8. Templates

**Change request (as a comment or question in Agreement Hub):**

```
Change request, 2026-11-02, from the client (phone call)
Asked for: allow booking changes until 12 hours before, not 24.
Affects: scope 3.2 → BC-2, BC-3; task T3 done (rework), test BC-2.
Effort: about half a day. No cost change.
Please confirm by agreeing to the updated section 3.2.
```

**Asking the AI for a drift report:**

```
Read every specs/*/spec.md, the tests and the code. List:
1. spec lines (by ID) with no test,
2. tests that check behaviour but name no spec ID,
3. places where the code does something the spec doesn't describe,
4. scope sections in docs/scope/ with no spec, and specs with no scope section.
Don't change anything; just report.
```

**Asking the AI to handle an agreed change:**

```
The client agreed scope v4 (section 3.2: 12 hours instead of 24).
Update specs/booking-changes/spec.md first (BC-2, BC-3), then the tests,
then tasks.md, then the code. Follow docs/spec-drift-and-changes.md section 7, step 5.
Show me the spec diff before touching code.
```

## 9. The rules on one page

1. **Behaviour changes spec-first**, and in the same PR as the code.
2. **The client agrees** to anything they could notice, in Agreement Hub,
   before the spec changes.
3. **Every spec line has an ID and a test**; every behaviour test names an ID.
4. **IDs are never reused**; removed lines are struck through with a reason.
5. **Specs say what, never how.**
6. **Never change code straight from a conversation.**
7. **Run the drift check weekly** and before every release.
