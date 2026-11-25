# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth
- **Master Gate (`/rooms/{roomId}`)**: A room represents a private couple session identified by a 4–20 character alphanumeric `roomId` (`^[a-zA-Z0-9_\-]+$`). Every room has an immutable `ownerId` (Partner 1) and an optional `partner2Id` (empty string `""` until Partner 2 joins, then immutable once claimed by Partner 2).
- **Subcollection Relational Sync**: All subcollections (`/rooms/{roomId}/goals/{goalId}`, `/rooms/{roomId}/cards/{cardId}`, `/rooms/{roomId}/rewards/{rewardId}`) require the caller to be a verified authenticated member of the parent room (`ownerId == request.auth.uid || partner2Id == request.auth.uid`) via the `isRoomMember(roomId)` Master Gate.
- **Query Enforcement (`allow list`)**: No `get()` calls are placed inside `allow list`. Instead, every subcollection document carries a bounded `memberUids` array (`size() >= 1 && size() <= 2`) and `allow list` enforces `request.auth.uid in resource.data.memberUids`.
- **Terminal State Locking**: Once a `WrittenGoal` reaches `status == 'completed'`, no subsequent gameplay status reversals or content modifications are permitted.
- **Temporal & Identity Integrity**: All writes require `request.auth.token.email_verified == true`, `createdAt == request.time` on creation, `createdAt == resource.data.createdAt` and `updatedAt == request.time` on update, and `authorId == request.auth.uid` on creation.

## 2. The "Dirty Dozen" Payloads (Designed to Break Identity, Integrity, and State)
1. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempting to create `/rooms/LOVE2026`.
2. **Identity Spoofing on Room Create**: Setting `ownerId: "victim-uid"` when `request.auth.uid` is `"attacker-uid"`.
3. **Room Hijack After Partner 2 Joined**: Attempting to overwrite `partner2Id` on `/rooms/LOVE2026` when `existing().partner2Id` is already non-empty.
4. **Shadow Field Injection on Room Update**: Sending a valid mood update plus a ghost field `{"isAdmin": true}` not present in `hasOnly()`.
5. **Denial-of-Wallet String Bomb**: Attempting to write a 50KB string into `activeCardText` or `content` (exceeding max `1000` chars).
6. **Path Variable ID Poisoning**: Creating a goal document with a 500-character or special-character document ID violating `^[a-zA-Z0-9_\-]+$`.
7. **Orphaned Subcollection Write**: Attempting to create `/rooms/NONEXISTENT/goals/goal1` where the parent room does not exist or the caller is not a room member.
8. **Terminal State Reversal**: Attempting to update a `WrittenGoal` whose `existing().status == 'completed'` back to `'in_progress'`.
9. **Client Timestamp Forgery**: Attempting to create or update a goal with a hardcoded past/future `createdAt` or `updatedAt` instead of `request.time`.
10. **Unbounded Array Injection**: Attempting to write 50 items into `wheelOptions` (exceeding the strict 20-item limit).
11. **Unauthorized List Scraping**: Running a collection query on `/rooms/LOVE2026/goals` as an outsider whose `uid` is not in `resource.data.memberUids`.
12. **Value Poisoning on Whitelisted Update Key**: Updating `partner1Points` with a negative integer `-999` or string `"1000"` during a card completion update.
