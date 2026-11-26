# Spec — #394 pocket money rate accepts ".5"
**Behaviour.** `validRate` in `src/pocketmoney.js` accepts an amount with no leading digit (`.5`, `.25`) as well as `5`, `0.5`, `5.25`. Still rejected: more than 2 decimals (`.555`), negatives, `0`, values above 1000, non-numeric text. The saved `amount` is the Number (0.5), as before.
**UI states.** Admin form only (validation). Member/readonly TV: display of the stored rate is unchanged.
**Data.** No shape change: `state/pocketMoney {pts, amount}` as today.
**Security/RBAC.** Validation only; the admin and READONLY guards on the save path are untouched.
**Cost guardrails.** No service, dependency or data-volume change.
**Concerns.** None.
