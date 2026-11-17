# Spec: .ics folds by octets (#349)

**Behaviour:** `icsFold` (src/weekics.js) folds at 75 UTF-8 octets (RFC 5545 3.1), counting the leading space of continuation lines. It iterates code points, so no fold falls inside a surrogate pair or multi-byte sequence. ASCII lines fold exactly as before (75, then 74 + leading space).

**UI states:** no UI change. Only the downloaded file differs, for chore names with emoji or accents. Readonly TV: no download path, unchanged.

**Data shape:** none; nothing written to /state.

**Security/RBAC:** none; output is still passed through `icsEscape` before folding.

**Cost guardrails:** pure client-side string code, no network, no dependency (`TextEncoder` is built in).

**Concerns:** none.
