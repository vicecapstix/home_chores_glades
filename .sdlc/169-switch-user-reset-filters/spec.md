# Spec #169
- Behaviour: after login, if the member differs from the one who last used this screen, reset filter (All), category, select mode, selection and the phone 'Mine' default flag (so phones re-apply Mine). Same member re-entering keeps state.
- UI: admin/member only; READONLY TV never logs in, unaffected.
- Data: none (/state untouched). RBAC: no new writes.
- Cost guardrail: no DB reads/writes added; stays on Spark.
- Concern: first login on page load only records the member (no reset needed).
