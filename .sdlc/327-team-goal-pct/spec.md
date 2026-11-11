# Spec: Team goal bar 100% early

**Behaviour:** pct uses Math.floor(earned * 100 / target) (integer-safe, capped at 100) so 199/200 shows 99; reached still uses earned >= target.

**UI:** team goal bar for admin, member and readonly TV view (same renderer). No markup change.

**/state:** none. **Security/RBAC:** display only, no writes. **Cost:** none. **Concerns:** none.
