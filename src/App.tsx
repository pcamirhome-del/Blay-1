/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import confetti from 'canvas-confetti';
import {
  Clock,
  Compass,
  Gift,
  Heart,
  Layers,
  Lock,
  LogOut,
  Target,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  triggerActionChime,
  triggerPulseAlert,
} from './firebase';
import {
  CoupleRoom,
  CustomCard,
  DeckCardItem,
  DEFAULT_DECK_CARDS,
  DEFAULT_STORE_REWARDS,
  DEFAULT_WHEEL_OPTIONS,
  PartnerRole,
  StoreReward,
  WrittenGoal,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallPrompt';
import { PinLockScreen } from './components/PinLockScreen';
import { RoomPairingModal } from './components/RoomPairingModal';
import { MoodAndPulseBar } from './components/MoodAndPulseBar';
import { WrittenGoalsBoard } from './components/WrittenGoalsBoard';
import { CardDeckSection } from './components/CardDeckSection';
import { SpinWheelSection } from './components/SpinWheelSection';
import { RewardsStoreSection } from './components/RewardsStoreSection';

const PIN_STORAGE_KEY = 'nabd_couple_pin_v1';
const ROOM_STORAGE_KEY = 'nabd_couple_room_code_v1';
const ROLE_STORAGE_KEY = 'nabd_couple_partner_role_v1';

export default function App() {
  // 1. Local 4-Digit PIN Lock State
  const [savedPin, setSavedPin] = useState<string | null>(() =>
    localStorage.getItem(PIN_STORAGE_KEY)
  );
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  // 2. Live 12-Hour Digital Clock in Header
  const [clockText, setClockText] = useState<string>('');

  // 3. Firebase Auth & Couple Room Sync State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>(() =>
    (localStorage.getItem(ROOM_STORAGE_KEY) || '').toUpperCase()
  );
  const [room, setRoom] = useState<CoupleRoom | null>(null);
  const [activeRole, setActiveRole] = useState<PartnerRole>(() => {
    const saved = localStorage.getItem(ROLE_STORAGE_KEY);
    return saved === 'partner2' ? 'partner2' : 'partner1';
  });
  const [roomError, setRoomError] = useState<string>('');
  const [isSubmittingRoom, setIsSubmittingRoom] = useState<boolean>(false);

  // 4. Real-Time Subcollections State
  const [goals, setGoals] = useState<WrittenGoal[]>([]);
  const [customCards, setCustomCards] = useState<CustomCard[]>([]);
  const [rewards, setRewards] = useState<StoreReward[]>([]);

  // 5. Navigation Tab & Live Notifications
  const [activeTab, setActiveTab] = useState<'goals' | 'cards' | 'wheel' | 'rewards'>('goals');
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [showPulseOverlay, setShowPulseOverlay] = useState<boolean>(false);

  const lastSeenPulseRef = useRef<number>(0);
  const lastSeenGoalCountRef = useRef<number>(0);

  // Update 12-Hour Live Digital Clock every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const period = hours >= 12 ? 'م' : 'ص';
      hours = hours % 12 || 12;
      const hoursStr = String(hours).padStart(2, '0');
      setClockText(`${hoursStr}:${minutes}:${seconds} ${period}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to Firebase Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const showToastMessage = (msg: string) => {
    setLiveToast(msg);
    setTimeout(() => {
      setLiveToast((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Attach Real-Time Firestore Listeners when User + RoomCode are active
  useEffect(() => {
    if (!authReady || !user || !roomCode) {
      setRoom(null);
      setGoals([]);
      setCustomCards([]);
      setRewards([]);
      return;
    }

    const roomPath = `rooms/${roomCode}`;
    const roomRef = doc(db, 'rooms', roomCode);

    const unsubRoom = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          setRoom(null);
          return;
        }
        const data = snap.data() as CoupleRoom;
        setRoom(data);

        // Automatically detect if a new longing pulse arrived
        if (
          data.lastPulseAt &&
          lastSeenPulseRef.current > 0 &&
          data.lastPulseAt > lastSeenPulseRef.current
        ) {
          triggerPulseAlert();
          setShowPulseOverlay(true);
        }
        if (data.lastPulseAt) {
          lastSeenPulseRef.current = data.lastPulseAt;
        }

        // Stop wheel spinning flag after 4 seconds of animation
        if (
          data.wheelSpinning &&
          data.wheelSpinTimestamp &&
          Date.now() - data.wheelSpinTimestamp >= 3900
        ) {
          updateDoc(roomRef, {
            wheelSpinning: false,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, roomPath);
      }
    );

    // Subcollection 1: Written Goals
    const goalsPath = `rooms/${roomCode}/goals`;
    const goalsQuery = query(
      collection(db, 'rooms', roomCode, 'goals'),
      where('memberUids', 'array-contains', user.uid)
    );
    const unsubGoals = onSnapshot(
      goalsQuery,
      (snap) => {
        const list: WrittenGoal[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WrittenGoal, 'id'>),
        }));
        list.sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });

        if (
          lastSeenGoalCountRef.current > 0 &&
          list.length > lastSeenGoalCountRef.current
        ) {
          const newest = list[0];
          if (newest) {
            triggerActionChime();
            showToastMessage(
              newest.visibilityMode === 'immediate'
                ? `هدف جديد من ${newest.authorName}: «${newest.content.slice(0, 45)}...»`
                : `أضاف ${newest.authorName} هدفاً مخفياً / مفاجأة جديدة على اللوحة!`
            );
          }
        }
        lastSeenGoalCountRef.current = list.length;
        setGoals(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, goalsPath);
      }
    );

    // Subcollection 2: Custom Secret Cards
    const cardsPath = `rooms/${roomCode}/cards`;
    const cardsQuery = query(
      collection(db, 'rooms', roomCode, 'cards'),
      where('memberUids', 'array-contains', user.uid)
    );
    const unsubCards = onSnapshot(
      cardsQuery,
      (snap) => {
        const list: CustomCard[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CustomCard, 'id'>),
        }));
        setCustomCards(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, cardsPath);
      }
    );

    // Subcollection 3: Store Rewards
    const rewardsPath = `rooms/${roomCode}/rewards`;
    const rewardsQuery = query(
      collection(db, 'rooms', roomCode, 'rewards'),
      where('memberUids', 'array-contains', user.uid)
    );
    const unsubRewards = onSnapshot(
      rewardsQuery,
      (snap) => {
        const list: StoreReward[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<StoreReward, 'id'>),
        }));
        setRewards(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, rewardsPath);
      }
    );

    return () => {
      unsubRoom();
      unsubGoals();
      unsubCards();
      unsubRewards();
    };
  }, [authReady, user, roomCode]);

  // Automatically synchronize Partner 2's UID into existing goals/cards/rewards when Partner 2 joins
  useEffect(() => {
    if (!room || !user || !room.partner2Id || room.partner2Id === room.ownerId) {
      return;
    }
    const bothUids = [room.ownerId, room.partner2Id];

    goals.forEach((g) => {
      if (g.status !== 'completed' && !g.memberUids.includes(room.partner2Id)) {
        updateDoc(doc(db, 'rooms', room.code, 'goals', g.id), {
          memberUids: bothUids,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    });
    customCards.forEach((c) => {
      if (!c.memberUids.includes(room.partner2Id)) {
        updateDoc(doc(db, 'rooms', room.code, 'cards', c.id), {
          memberUids: bothUids,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    });
    rewards.forEach((r) => {
      if (!r.memberUids.includes(room.partner2Id)) {
        updateDoc(doc(db, 'rooms', room.code, 'rewards', r.id), {
          memberUids: bothUids,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    });
  }, [room?.partner2Id, room?.ownerId, room?.code, user, goals, customCards, rewards]);

  const handleUnlockPin = (pin: string) => {
    if (!savedPin) {
      localStorage.setItem(PIN_STORAGE_KEY, pin);
      setSavedPin(pin);
    }
    setIsUnlocked(true);
  };

  const handleResetPin = () => {
    localStorage.removeItem(PIN_STORAGE_KEY);
    setSavedPin(null);
  };

  const handleSwitchRole = (role: PartnerRole) => {
    setActiveRole(role);
    localStorage.setItem(ROLE_STORAGE_KEY, role);
    triggerActionChime();
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setRoomError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setRoomError(
        err instanceof Error ? err.message : 'تعذر تسجيل الدخول عبر Google'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateRoom = async (
    code: string,
    p1Name: string,
    p2Name: string
  ) => {
    if (!user) return;
    setIsSubmittingRoom(true);
    setRoomError('');
    const path = `rooms/${code}`;
    try {
      const roomRef = doc(db, 'rooms', code);
      const existingSnap = await getDoc(roomRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as CoupleRoom;
        if (
          existingData.ownerId === user.uid ||
          existingData.partner2Id === user.uid
        ) {
          localStorage.setItem(ROOM_STORAGE_KEY, code);
          setRoomCode(code);
          return;
        }
        setRoomError('رمز الغرفة مستخدم بالفعل، اختر رمزاً آخر أو انضم للغرفة');
        return;
      }

      const firstCard = DEFAULT_DECK_CARDS[0];
      const newRoom: Omit<CoupleRoom, 'createdAt' | 'updatedAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>;
        updatedAt: ReturnType<typeof serverTimestamp>;
      } = {
        code,
        ownerId: user.uid,
        partner1Name: p1Name,
        partner1Mood: 'رومانسي',
        partner1Points: 50,
        partner2Id: '',
        partner2Name: p2Name,
        partner2Mood: 'متحمس',
        partner2Points: 50,
        lastPulseBy: user.uid,
        lastPulseFromName: p1Name,
        lastPulseMessage: 'أهلاً بك في مساحتنا الخاصة!',
        lastPulseAt: Date.now(),
        activeCardId: firstCard.id,
        activeCardTitle: firstCard.title,
        activeCardText: firstCard.prompt,
        activeCardLevel: firstCard.level,
        activeCardPoints: firstCard.points,
        activeCardDrawnBy: p1Name,
        activeCardFlipped: true,
        activeCardStage: 'drawn',
        wheelOptions: DEFAULT_WHEEL_OPTIONS,
        wheelSpinAngle: 0,
        wheelSpinning: false,
        wheelWinner: '',
        wheelSpunBy: '',
        wheelSpinTimestamp: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(roomRef, newRoom);

      // Seed initial romantic written goals (1 immediate, 1 hidden surprise)
      const goalsCol = collection(db, 'rooms', code, 'goals');
      await addDoc(goalsCol, {
        roomId: code,
        authorId: user.uid,
        authorRole: 'partner1',
        authorName: p1Name,
        category: 'هدف الليلة',
        content:
          'سهرة هادئة معاً بدون مقاطعة نتبادل فيها أجمل ٣ ذكريات جمعتنا هذا الشهر مع مشروبنا المفضل.',
        visibilityMode: 'immediate',
        isRevealed: true,
        timeframe: 'الليلة',
        rewardPoints: 35,
        status: 'in_progress',
        memberUids: [user.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(goalsCol, {
        roomId: code,
        authorId: user.uid,
        authorRole: 'partner2',
        authorName: p2Name,
        category: 'أمنية أريد تحقيقها معك',
        content:
          'جلسة مساج دافئة لمدة ١٥ دقيقة مع موسيقى هادئة وهمسة حب خاصة قبل النوم.',
        visibilityMode: 'hidden',
        isRevealed: false,
        timeframe: 'الليلة',
        rewardPoints: 50,
        status: 'in_progress',
        memberUids: [user.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Seed default couple rewards store items
      const rewardsCol = collection(db, 'rooms', code, 'rewards');
      for (const item of DEFAULT_STORE_REWARDS) {
        await addDoc(rewardsCol, {
          ...item,
          roomId: code,
          authorId: user.uid,
          authorName: p1Name,
          memberUids: [user.uid],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      localStorage.setItem(ROOM_STORAGE_KEY, code);
      handleSwitchRole('partner1');
      setRoomCode(code);
      triggerActionChime();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmittingRoom(false);
    }
  };

  const handleJoinRoom = async (code: string, p2Name: string) => {
    if (!user) return;
    setIsSubmittingRoom(true);
    setRoomError('');
    const path = `rooms/${code}`;
    try {
      const roomRef = doc(db, 'rooms', code);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        setRoomError('لم يتم العثور على غرفة بهذا الرمز، تأكد من الرمز مع شريكك');
        return;
      }
      const data = snap.data() as CoupleRoom;

      if (data.ownerId === user.uid) {
        localStorage.setItem(ROOM_STORAGE_KEY, code);
        handleSwitchRole('partner1');
        setRoomCode(code);
        return;
      }

      if (data.partner2Id === '' || data.partner2Id === user.uid) {
        if (data.partner2Id === '') {
          await updateDoc(roomRef, {
            partner2Id: user.uid,
            partner2Name: p2Name,
            partner2Mood: 'متحمس',
            updatedAt: serverTimestamp(),
          });
        }
        localStorage.setItem(ROOM_STORAGE_KEY, code);
        handleSwitchRole('partner2');
        setRoomCode(code);
        triggerActionChime();
      } else {
        setRoomError('هذه الغرفة مرتبطة بالفعل بجهازين خاصين بالزوجين فقط');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsSubmittingRoom(false);
    }
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem(ROOM_STORAGE_KEY);
    setRoomCode('');
    setRoom(null);
  };

  // Feature 2: Update Mood & Send Pulse
  const handleUpdateMood = async (mood: string) => {
    if (!room || !user) return;
    const path = `rooms/${room.code}`;
    try {
      const updatePayload =
        activeRole === 'partner1'
          ? { partner1Mood: mood, updatedAt: serverTimestamp() }
          : { partner2Mood: mood, updatedAt: serverTimestamp() };
      await updateDoc(doc(db, 'rooms', room.code), updatePayload);
      triggerActionChime();
      showToastMessage(`تم تحديث حالتك المزاجية إلى «${mood}» على الشاشتين`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleSendPulse = async (customMessage?: string) => {
    if (!room || !user) return;
    const path = `rooms/${room.code}`;
    const senderName =
      activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
    try {
      await updateDoc(doc(db, 'rooms', room.code), {
        lastPulseBy: user.uid,
        lastPulseFromName: senderName,
        lastPulseMessage:
          (customMessage || 'أشتاق إليك الآن!').slice(0, 160),
        lastPulseAt: Date.now(),
        updatedAt: serverTimestamp(),
      });
      triggerPulseAlert();
      setShowPulseOverlay(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Feature 1: Written Goals & Desires Handlers
  const getRoomMemberUids = (): string[] => {
    if (!room || !user) return [];
    const set = new Set<string>([room.ownerId, user.uid]);
    if (room.partner2Id) set.add(room.partner2Id);
    return Array.from(set).slice(0, 2);
  };

  const handleAddGoal = async (goalInput: {
    category: string;
    content: string;
    visibilityMode: 'immediate' | 'hidden';
    timeframe: string;
    rewardPoints: number;
  }) => {
    if (!room || !user) return;
    const path = `rooms/${room.code}/goals`;
    const authorName =
      activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
    try {
      await addDoc(collection(db, 'rooms', room.code, 'goals'), {
        roomId: room.code,
        authorId: user.uid,
        authorRole: activeRole,
        authorName,
        category: goalInput.category,
        content: goalInput.content.slice(0, 1000),
        visibilityMode: goalInput.visibilityMode,
        isRevealed: goalInput.visibilityMode === 'immediate',
        timeframe: goalInput.timeframe,
        rewardPoints: goalInput.rewardPoints,
        status: 'in_progress',
        memberUids: getRoomMemberUids(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      triggerActionChime();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleRevealGoal = async (goal: WrittenGoal) => {
    if (!room) return;
    const path = `rooms/${room.code}/goals/${goal.id}`;
    try {
      await updateDoc(doc(db, 'rooms', room.code, 'goals', goal.id), {
        isRevealed: true,
        updatedAt: serverTimestamp(),
      });
      triggerActionChime();
      showToastMessage(`تم كشف الهدف المفاجئ: «${goal.category}»!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleCompleteGoal = async (goal: WrittenGoal) => {
    if (!room) return;
    const goalPath = `rooms/${room.code}/goals/${goal.id}`;
    const roomPath = `rooms/${room.code}`;
    try {
      await updateDoc(doc(db, 'rooms', room.code, 'goals', goal.id), {
        status: 'completed',
        isRevealed: true,
        updatedAt: serverTimestamp(),
      });

      const pointsField =
        activeRole === 'partner1'
          ? { partner1Points: room.partner1Points + goal.rewardPoints }
          : { partner2Points: room.partner2Points + goal.rewardPoints };

      await updateDoc(doc(db, 'rooms', room.code), {
        ...pointsField,
        updatedAt: serverTimestamp(),
      });

      confetti({ particleCount: 70, spread: 65, origin: { y: 0.65 } });
      triggerActionChime();
      showToastMessage(
        `رائع! تم تحقيق الهدف وإضافة +${goal.rewardPoints} نقطة حب`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${goalPath} | ${roomPath}`);
    }
  };

  const handleBoostRewardPoints = async (
    goal: WrittenGoal,
    extraPoints: number
  ) => {
    if (!room) return;
    const path = `rooms/${room.code}/goals/${goal.id}`;
    try {
      const nextPoints = Math.min(5000, goal.rewardPoints + extraPoints);
      await updateDoc(doc(db, 'rooms', room.code, 'goals', goal.id), {
        rewardPoints: nextPoints,
        memberUids: getRoomMemberUids(),
        updatedAt: serverTimestamp(),
      });
      triggerActionChime();
      showToastMessage(`تم زيادة مكافأة الهدف إلى +${nextPoints} نقطة!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!room) return;
    const path = `rooms/${room.code}/goals/${goalId}`;
    try {
      await deleteDoc(doc(db, 'rooms', room.code, 'goals', goalId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Feature 3 & 4: Interactive 3-Level Card Deck & Custom Secret Card Creator
  const handleDrawCard = async (card: DeckCardItem) => {
    if (!room) return;
    const path = `rooms/${room.code}`;
    const drawnBy =
      activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
    try {
      // First flip face-down briefly, then flip face-up for 3D effect on both screens
      await updateDoc(doc(db, 'rooms', room.code), {
        activeCardId: card.id,
        activeCardTitle: card.title.slice(0, 200),
        activeCardText: card.prompt.slice(0, 1000),
        activeCardLevel: card.level,
        activeCardPoints: card.points,
        activeCardDrawnBy: drawnBy,
        activeCardFlipped: false,
        activeCardStage: 'drawn',
        updatedAt: serverTimestamp(),
      });
      triggerActionChime();
      setTimeout(() => {
        updateDoc(doc(db, 'rooms', room.code), {
          activeCardFlipped: true,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }, 220);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleFlipActiveCard = async () => {
    if (!room) return;
    const path = `rooms/${room.code}`;
    try {
      await updateDoc(doc(db, 'rooms', room.code), {
        activeCardFlipped: !room.activeCardFlipped,
        updatedAt: serverTimestamp(),
      });
      triggerActionChime();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleCompleteCard = async () => {
    if (!room || room.activeCardStage === 'done') return;
    const path = `rooms/${room.code}`;
    try {
      const pointsField =
        activeRole === 'partner1'
          ? { partner1Points: room.partner1Points + room.activeCardPoints }
          : { partner2Points: room.partner2Points + room.activeCardPoints };

      await updateDoc(doc(db, 'rooms', room.code), {
        ...pointsField,
        activeCardStage: 'done',
        updatedAt: serverTimestamp(),
      });
      confetti({ particleCount: 55, spread: 60, origin: { y: 0.65 } });
      triggerActionChime();
      showToastMessage(
        `تم تنفيذ تحدي البطاقة بنجاح (+${room.activeCardPoints} نقطة حب)!`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handlePostponeCard = async () => {
    if (!room) return;
    const path = `rooms/${room.code}`;
    try {
      await updateDoc(doc(db, 'rooms', room.code), {
        activeCardFlipped: false,
        activeCardStage: 'later',
        updatedAt: serverTimestamp(),
      });
      showToastMessage('تم تأجيل البطاقة الحالية لوقت لاحق');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleAddCustomCard = async (input: {
    level: 1 | 2 | 3;
    title: string;
    prompt: string;
    points: number;
  }) => {
    if (!room || !user) return;
    const path = `rooms/${room.code}/cards`;
    const authorName =
      activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
    try {
      await addDoc(collection(db, 'rooms', room.code, 'cards'), {
        roomId: room.code,
        authorId: user.uid,
        authorName,
        level: input.level,
        title: input.title.slice(0, 150),
        prompt: input.prompt.slice(0, 1000),
        points: input.points,
        memberUids: getRoomMemberUids(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      triggerActionChime();
      showToastMessage('تمت إضافة بطاقتك الخاصة إلى صندوق البطاقات بنجاح!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDeleteCustomCard = async (cardId: string) => {
    if (!room) return;
    const path = `rooms/${room.code}/cards/${cardId}`;
    try {
      await deleteDoc(doc(db, 'rooms', room.code, 'cards', cardId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Feature 5: Synchronized Spin Wheel Handlers
  const handleSpinWheel = async (targetAngle: number, winner: string) => {
    if (!room) return;
    const path = `rooms/${room.code}`;
    const spunBy =
      activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
    try {
      await updateDoc(doc(db, 'rooms', room.code), {
        wheelSpinAngle: targetAngle,
        wheelSpinning: true,
        wheelWinner: winner.slice(0, 120),
        wheelSpunBy: spunBy,
        wheelSpinTimestamp: Date.now(),
        updatedAt: serverTimestamp(),
      });
      triggerActionChime();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleUpdateWheelOptions = async (newOptions: string[]) => {
    if (!room) return;
    const path = `rooms/${room.code}`;
    try {
      await updateDoc(doc(db, 'rooms', room.code), {
        wheelOptions: newOptions.slice(0, 20),
        updatedAt: serverTimestamp(),
      });
      triggerActionChime();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Feature 6: Love Points & Rewards Store Handlers
  const handleAddReward = async (input: {
    title: string;
    description: string;
    costPoints: number;
    iconName: string;
  }) => {
    if (!room || !user) return;
    const path = `rooms/${room.code}/rewards`;
    const authorName =
      activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
    try {
      await addDoc(collection(db, 'rooms', room.code, 'rewards'), {
        roomId: room.code,
        authorId: user.uid,
        authorName,
        title: input.title.slice(0, 150),
        description: input.description.slice(0, 600),
        costPoints: input.costPoints,
        iconName: input.iconName,
        redeemedCount: 0,
        lastRedeemedBy: '',
        memberUids: getRoomMemberUids(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      triggerActionChime();
      showToastMessage('تمت إضافة المكافأة الجديدة إلى المتجر!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleRedeemReward = async (reward: StoreReward) => {
    if (!room) return;
    const myPoints =
      activeRole === 'partner1' ? room.partner1Points : room.partner2Points;
    const myName =
      activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
    if (myPoints < reward.costPoints) return;

    const rewardPath = `rooms/${room.code}/rewards/${reward.id}`;
    const roomPath = `rooms/${room.code}`;
    try {
      await updateDoc(doc(db, 'rooms', room.code, 'rewards', reward.id), {
        redeemedCount: reward.redeemedCount + 1,
        lastRedeemedBy: myName,
        updatedAt: serverTimestamp(),
      });

      const updatedPoints =
        activeRole === 'partner1'
          ? { partner1Points: Math.max(0, room.partner1Points - reward.costPoints) }
          : { partner2Points: Math.max(0, room.partner2Points - reward.costPoints) };

      await updateDoc(doc(db, 'rooms', room.code), {
        ...updatedPoints,
        updatedAt: serverTimestamp(),
      });

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      triggerPulseAlert();
      showToastMessage(`تم استبدال مكافأة «${reward.title}» بواسطة ${myName}!`);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${rewardPath} | ${roomPath}`
      );
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!room) return;
    const path = `rooms/${room.code}/rewards/${rewardId}`;
    try {
      await deleteDoc(doc(db, 'rooms', room.code, 'rewards', rewardId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Gate 1: Local 4-Digit PIN Lock Screen
  if (!isUnlocked) {
    return (
      <ErrorBoundary>
        <PinLockScreen
          savedPin={savedPin}
          onUnlock={handleUnlockPin}
          onResetPin={handleResetPin}
        />
        <OfflineIndicator />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div
        dir="rtl"
        className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col justify-between relative overflow-x-hidden"
      >
        {/* Subtle romantic atmospheric background glow */}
        <div className="pointer-events-none fixed -top-40 right-1/4 w-[28rem] h-[28rem] rounded-full bg-rose-500/10 blur-3xl" />
        <div className="pointer-events-none fixed top-1/2 left-1/4 w-[26rem] h-[26rem] rounded-full bg-amber-500/8 blur-3xl" />

        {/* Top Header Bar: 3 Zones (Brand, Nav Tabs, Live 12-Hour Clock & Lock) */}
        <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-md border-b border-rose-500/25 px-4 sm:px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-8">
            {/* Zone 1: Single-line Brand Title */}
            <a
              href="#top"
              className="text-lg sm:text-xl font-bold text-white font-display tracking-tight whitespace-nowrap shrink-0 flex items-center gap-2"
            >
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500 shrink-0" />
              <span>نبض القلوب</span>
            </a>

            {/* Zone 2: Section Navigation Links (Desktop) */}
            {room && (
              <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-300">
                <button
                  type="button"
                  onClick={() => setActiveTab('goals')}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'goals'
                      ? 'border-rose-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  الأهداف والأمنيات
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cards')}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'cards'
                      ? 'border-rose-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  بطاقات الرومانسية
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('wheel')}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'wheel'
                      ? 'border-rose-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  عجلة الحظ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('rewards')}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'rewards'
                      ? 'border-rose-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  متجر المكافآت
                </button>
              </nav>
            )}

            {/* Zone 3: Live 12-Hour Digital Clock + PWA Install + PIN Lock */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div
                className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-1.5 text-xs font-mono font-bold text-amber-300 tabular-nums whitespace-nowrap shrink-0"
                title="الساعة الرقمية الحية (نظام ١٢ ساعة)"
              >
                <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span dir="ltr">{clockText}</span>
              </div>

              <PWAInstallButton />

              <button
                type="button"
                onClick={() => setIsUnlocked(false)}
                title="قفل الشاشة برمز الحماية (PIN)"
                className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
              </button>

              {room && (
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  title="تغيير رمز الغرفة"
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Live Synchronized Notification Toast */}
        {liveToast && (
          <div className="fixed top-18 right-4 left-4 sm:left-auto sm:max-w-md z-40 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-rose-500 px-4 py-3 shadow-2xl shadow-rose-500/20 flex items-center gap-3">
            <Heart className="w-5 h-5 text-rose-400 fill-rose-400 shrink-0" />
            <p className="text-xs font-semibold text-white leading-relaxed">
              {liveToast}
            </p>
          </div>
        )}

        {/* Main Workspace Container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6 relative z-10">
          {!user || !room ? (
            <RoomPairingModal
              user={user}
              authLoading={authLoading}
              onGoogleSignIn={handleGoogleSignIn}
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              errorMsg={roomError}
              isSubmitting={isSubmittingRoom}
            />
          ) : (
            <>
              {/* Always-Visible Live Mood & Send a Pulse Bar */}
              <MoodAndPulseBar
                room={room}
                activeRole={activeRole}
                onSwitchRole={handleSwitchRole}
                onUpdateMood={handleUpdateMood}
                onSendPulse={handleSendPulse}
                showPulseOverlay={showPulseOverlay}
                onDismissPulseOverlay={() => setShowPulseOverlay(false)}
              />

              {/* Mobile / Tablet Feature Switcher Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('goals')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'goals'
                      ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-600/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Target className="w-4 h-4 shrink-0" />
                  <span>الأهداف المكتوبة ({goals.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('cards')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'cards'
                      ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-600/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>بطاقات التحدي (3D)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('wheel')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'wheel'
                      ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-600/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-4 h-4 shrink-0" />
                  <span>عجلة الحظ المشتركة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('rewards')}
                  className={`min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'rewards'
                      ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-600/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Gift className="w-4 h-4 shrink-0" />
                  <span>متجر المكافآت ({rewards.length})</span>
                </button>
              </div>

              {/* Active Feature View */}
              {activeTab === 'goals' && (
                <WrittenGoalsBoard
                  room={room}
                  activeRole={activeRole}
                  goals={goals}
                  currentUserId={user.uid}
                  onAddGoal={handleAddGoal}
                  onRevealGoal={handleRevealGoal}
                  onCompleteGoal={handleCompleteGoal}
                  onBoostRewardPoints={handleBoostRewardPoints}
                  onDeleteGoal={handleDeleteGoal}
                />
              )}

              {activeTab === 'cards' && (
                <CardDeckSection
                  room={room}
                  activeRole={activeRole}
                  customCards={customCards}
                  currentUserId={user.uid}
                  onDrawCard={handleDrawCard}
                  onFlipActiveCard={handleFlipActiveCard}
                  onCompleteCard={handleCompleteCard}
                  onPostponeCard={handlePostponeCard}
                  onAddCustomCard={handleAddCustomCard}
                  onDeleteCustomCard={handleDeleteCustomCard}
                />
              )}

              {activeTab === 'wheel' && (
                <SpinWheelSection
                  room={room}
                  activeRole={activeRole}
                  onSpinWheel={handleSpinWheel}
                  onUpdateWheelOptions={handleUpdateWheelOptions}
                />
              )}

              {activeTab === 'rewards' && (
                <RewardsStoreSection
                  room={room}
                  activeRole={activeRole}
                  rewards={rewards}
                  currentUserId={user.uid}
                  onRedeemReward={handleRedeemReward}
                  onAddReward={handleAddReward}
                  onDeleteReward={handleDeleteReward}
                />
              )}
            </>
          )}
        </main>

        {/* Subtle Clean Developer Credit Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 px-6 text-center relative z-10">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <span>نبض القلوب — مساحة تفاعلية خاصة ومشفرة للزوجين</span>
            <span dir="ltr" className="font-mono text-slate-400">
              Developed by Amir Lamay • Made In Egypt
            </span>
          </div>
        </footer>

        <OfflineIndicator />
      </div>
    </ErrorBoundary>
  );
}
