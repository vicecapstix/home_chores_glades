# Spec #392: TV Off / Done sections placed at the bottom

## Behaviour
`details.off-chores` and `details.done-once` get `data-k="off"` / `data-k="stale"`. New TV grid rules (`body.tv`, inside the existing 900px and 1200px media blocks) place both full width (`grid-column: 1 / -1`) in rows after the `ok` row, so they sit below all other sections.

## States
- Admin / member (non-TV): unchanged; the attribute has no rule outside `body.tv`.
- Readonly TV: Off section shown at the bottom, full width. Done-once is hidden in readonly (`showStale` excludes READONLY), so its rule is defensive.
- Phone/tablet (<900px): no change (rules only inside the 900/1200 media queries).

## /state shape changes
None.

## RBAC
None; display only, no writes.

## Cost guardrails
CSS + one attribute. No services, deps, keys or data growth. Free Spark plan, GitHub Pages only.
