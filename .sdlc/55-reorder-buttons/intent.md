# Intent — #55 Touch- and remote-friendly reordering (replace HTML5 drag-and-drop)

(Copied from issue #55)

## Problem
HTML5 drag-and-drop doesn't work on touch (tablet/phone) or a TV remote; drop swaps rather than inserts; 'Available' section ignores `order`.

## Outcome / acceptance criteria
- [ ] Move up/down buttons in edit mode (admin), keyboard-focusable with aria-labels
- [ ] Insert semantics; all sections sort by `order`
- [ ] Writes only changed `tasks/<id>/order` paths (no `writeState()`)
- [ ] Admin-only guard
- [ ] Tests

## Affected users
Admin on tablet/phone.

## Constraints
Cost guardrails (Pages + Firebase Spark, no new services, mocks only in tests).

## Open questions
None.

## Verification
`npm test` and `npm run build` pass.
