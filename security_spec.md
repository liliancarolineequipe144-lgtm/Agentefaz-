# Security Specification: LeadScout AI

## Data Invariants
1. A Lead must always belong to a specific user (`ownerId`).
2. A user can only see, edit, or delete their own Leads.
3. Status must be one of the predefined values.
4. Timestamps must be validated on creation (`createdAt`) and update (`updatedAt`).

## The Dirty Dozen Payloads (Rejection Tests)
1. **Identity Spoofing**: Create lead with `ownerId` of another user.
2. **Path Poisoning**: Inject a 1MB string as `leadId`.
3. **Invalid Status**: Set status to "hacking".
4. **Timestamp Fraud**: Set `createdAt` to a date in the past.
5. **No Auth**: Attempt to read leads without being signed in.
6. **Cross-User Read**: Attempt to get lead by ID that belongs to another user.
7. **Cross-User List**: Query leads without filtering by `ownerId == auth.uid`.
8. **Field Injection**: Add `isVerified: true` (not in schema) during update.
9. **Bulk Export Scraping**: Attempt to list leads without authentication.
10. **Orphaned Write**: Create lead with missing mandatory `name`.
11. **Immortality Breach**: Change `createdAt` on update.
12. **Status Privilege Escalation**: Bypass status checks.

## Firestore Rules Test Runner
(Simulated in production rules)
The rules enforce:
- `resource.data.ownerId == request.auth.uid` for all reads.
- `request.resource.data.ownerId == request.auth.uid` for all writes.
- `isValidLead()` helper for all writes.
- Server timestamps for parity.
