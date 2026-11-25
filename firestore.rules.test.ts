/**
 * Firestore Rules Security Verification Suite — Dirty Dozen Payloads
 * Verifies that all 12 adversarial payloads in security_spec.md return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof on Room Creation',
    operation: 'create',
    path: '/rooms/LOVE2026',
    auth: { uid: 'user1', email_verified: false },
    payload: { code: 'LOVE2026', ownerId: 'user1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on Room Create (ownerId != auth.uid)',
    operation: 'create',
    path: '/rooms/LOVE2026',
    auth: { uid: 'attacker', email_verified: true },
    payload: { code: 'LOVE2026', ownerId: 'victim' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Room Hijack After Partner 2 Already Joined',
    operation: 'update',
    path: '/rooms/LOVE2026',
    auth: { uid: 'attacker', email_verified: true },
    payload: { partner2Id: 'attacker', partner2Name: 'Hacker' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Room Update',
    operation: 'update',
    path: '/rooms/LOVE2026',
    auth: { uid: 'user1', email_verified: true },
    payload: { partner1Mood: 'رومانسي', isVerifiedAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Denial-of-Wallet String Bomb (>1000 chars)',
    operation: 'create',
    path: '/rooms/LOVE2026/goals/goal_1',
    auth: { uid: 'user1', email_verified: true },
    payload: { content: 'A'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Path Variable ID Poisoning',
    operation: 'create',
    path: '/rooms/LOVE2026/goals/invalid$id!@#',
    auth: { uid: 'user1', email_verified: true },
    payload: { content: 'هدف الليلة' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned Subcollection Write to Non-Member Room',
    operation: 'create',
    path: '/rooms/OTHERROOM/goals/goal_1',
    auth: { uid: 'outsider', email_verified: true },
    payload: { roomId: 'OTHERROOM', authorId: 'outsider' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Terminal State Reversal on Completed Goal',
    operation: 'update',
    path: '/rooms/LOVE2026/goals/completed_goal',
    auth: { uid: 'user1', email_verified: true },
    payload: { status: 'in_progress' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery (createdAt != request.time)',
    operation: 'create',
    path: '/rooms/LOVE2026/cards/card_1',
    auth: { uid: 'user1', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unbounded Array Injection on Wheel Options (>20 items)',
    operation: 'update',
    path: '/rooms/LOVE2026',
    auth: { uid: 'user1', email_verified: true },
    payload: { wheelOptions: Array.from({ length: 25 }, (_, i) => `Option ${i}`) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized List Scraping on Subcollection',
    operation: 'list',
    path: '/rooms/LOVE2026/goals',
    auth: { uid: 'outsider', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Value Poisoning on Whitelisted Update Key (Negative Points)',
    operation: 'update',
    path: '/rooms/LOVE2026',
    auth: { uid: 'user1', email_verified: true },
    payload: { partner1Points: -500 },
    expectedResult: 'PERMISSION_DENIED',
  },
];
