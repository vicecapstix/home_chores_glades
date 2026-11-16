# Spec — #346

**Behaviour:** the swap button gets class `swap-btn` (not `edit-btn`). `.swap-btn` copies the visual rules of `.edit-btn` (hover/touch opacity) with a 44px min tap target. No member-hide rule targets it.

**UI states:** Member: button on own pending chore. Admin: unchanged (button only when `canOfferSwap`, i.e. the admin is the assignee). Readonly TV: `canOfferSwap` is false under READONLY, so no button.

**Data shape:** none. **Security/RBAC:** no new write path; `openSwap`/`offerSwap` keep their READONLY and ownership guards. **Cost guardrails:** CSS/markup only. **Concerns:** none.
