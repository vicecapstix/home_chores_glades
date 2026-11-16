# Intent — #346: Members never see the Offer swap button

**Problem:** The 🔄 Offer swap button is rendered with `class="edit-btn"` (`src/render.js`), and `body[data-role="member"] .edit-btn { display:none !important }` hides it, so members (the only people `canOfferSwap` allows) can never start a swap.

**Acceptance criteria**
- [ ] A logged-in member sees the Offer swap button on their own pending chore
- [ ] Not shown on other people's chores, done chores, or the readonly TV
- [ ] Edit/Delete/Skip stay hidden for members
- [ ] Keeps its aria-label and is a >=44px tap target on phone

**Constraints:** own class (`swap-btn`), don't loosen `.edit-btn` member rule; free-tier/no-deps guardrails.
