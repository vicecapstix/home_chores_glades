# Intent — #34 Any remote change re-renders the task list and wipes inline edits / subtask input

(Copied from issue #34)

## Problem
Every snapshot from any device calls `render()` which replaces `#task-list` innerHTML (`src/render.js`), destroying an open inline edit (including the new day chips from #47), typed subtask text and expanded subtask lists.

## Outcome / acceptance criteria
- [ ] Render is deferred (or the edited card preserved) while an inline edit/subtask input has focus
- [ ] Expanded subtask state survives re-render
- [ ] Test: simulated snapshot during edit keeps the input value

## Affected users
Admin editing on phone/tablet while others use the app.

## Constraints
Cost guardrails (Pages + Firebase Spark, no new services, mocks only in tests).

## Open questions
None.

## Verification
`npm test` and `npm run build` pass.
