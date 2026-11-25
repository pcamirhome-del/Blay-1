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
import { onValue, ref as rtdbRef, set as rtdbSet } from 'firebase/database';
import confetti from 'canvas-confetti';
import {
  Clock,
  Compass,
  Gift,
  Heart,
  Layers,
  Lock,
  Settings,
  Target,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  rtdb,
  triggerActionChime,
  triggerPulseAlert,
  uploadSharedBackgroundMedia,
} from './firebase';
import {
  CoupleRoom,
  CustomCard,
  DeckCardItem,
  DEFAULT_DECK_CARDS,
  DEFAULT_STORE_REWARDS,
  DEFAULT_WHEEL_OPTIONS,
  MediaChunkDoc,
  PartnerRole,
  StoreReward,
  WrittenGoal,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/PWAInstallPrompt';
import { PinLockScreen } from './components/PinLockScreen';
import { RoomPairingModal } from './components/RoomPairingModal';
import { LiveMediaBackground } from './components/LiveMediaBackground';
import { SettingsModal } from './components/SettingsModal';
import { WrittenGoalsBoard } from './components/WrittenGoalsBoard';
import { CardDeckSection } from './components/CardDeckSection';
import { SpinWheelSection } from './components/SpinWheelSection';
import { RewardsStoreSection } from './components/RewardsStoreSection';

const PIN_STORAGE_KEY = 'nabd_couple_stealth_pin_v2';
const ROOM_STORAGE_KEY = 'nabd_couple_room_code_v1';
const ROLE_STORAGE_KEY = 'nabd_couple_partner_role_v1';

export default function App() {
  // 1. Ultra-Private Stealth Lock Screen State (Default PIN: '0000')
  const [savedPin, setSavedPin] = useState<string>(() => {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    return stored && stored.length === 4 ? stored : '0000';
  });
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

  // 4. Real-Time Subcollections & Reassembled Media State
  const [goals, setGoals] = useState<WrittenGoal[]>([]);
  const [customCards, setCustomCards] = useState<CustomCard[]>([]);
  const [rewards, setRewards] = useState<StoreReward[]>([]);
  const [mediaChunks, setMediaChunks] = useState<MediaChunkDoc[]>([]);
  const [reassembledMediaUrl, setReassembledMediaUrl] = useState<string>('');

  // 5. Navigation Tabs (4 Full-Screen Mobile Tabs) & Modals
  const [activeTab, setActiveTab] = useState<'goals' | 'cards' | 'wheel' | 'rewards'>(
    'goals'
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);
  const [showPulseOverlay, setShowPulseOverlay] = useState<boolean>(false);

  const lastSeenPulseRef = useRef<number>(0);
  const lastSeenGoalCountRef = useRef<number>(0);

  // Live 12-Hour Digital Clock
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

  // Firebase Auth Listener
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
    }, 4000);
  };

  // Real-Time Firestore & Realtime Database Listeners
  useEffect(() => {
    if (!authReady || !user || !roomCode) {
      setRoom(null);
      setGoals([]);
      setCustomCards([]);
      setRewards([]);
      setMediaChunks([]);
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
        const raw = snap.data() as CoupleRoom;
        const data: CoupleRoom = {
          ...raw,
          bgUrl: raw.bgUrl ?? '',
          bgType: raw.bgType ?? 'none',
          bgOverlayOpacity: raw.bgOverlayOpacity ?? 65,
        };
        setRoom(data);

        // Longing Pulse Detection
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

        // Stop wheel spinning flag after animation settles
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

    // Optional Realtime Database listener for instant background broadcast if configured
    let unsubRtdb: (() => void) | null = null;
    if (rtdb) {
      const bgRef = rtdbRef(rtdb, `rooms/${roomCode}/background`);
      unsubRtdb = onValue(bgRef, (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val.bgUrl === 'string') {
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  bgUrl: val.bgUrl,
                  bgType: val.bgType || prev.bgType,
                }
              : prev
          );
        }
      });
    }

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
                ? `هدف جديد من ${newest.authorName}: «${newest.content.slice(0, 45)}»`
                : `أضاف ${newest.authorName} هدفاً مخفياً / مفاجأة جديدة!`
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

    // Subcollection 2: Custom Cards
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

    // Subcollection 4: Synchronized Background Media Chunks (for video/GIF clips)
    const mediaPath = `rooms/${roomCode}/media`;
    const mediaQuery = query(
      collection(db, 'rooms', roomCode, 'media'),
      where('memberUids', 'array-contains', user.uid)
    );
    const unsubMedia = onSnapshot(
      mediaQuery,
      (snap) => {
        const list: MediaChunkDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MediaChunkDoc, 'id'>),
        }));
        list.sort((a, b) => a.index - b.index);
        setMediaChunks(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, mediaPath);
      }
    );

    return () => {
      unsubRoom();
      if (unsubRtdb) unsubRtdb();
      unsubGoals();
      unsubCards();
      unsubRewards();
      unsubMedia();
    };
  }, [authReady, user, roomCode]);

  // Reassemble chunked video/GIF media into a live playable Blob URL when bgUrl starts with CHUNKED_MEDIA:
  useEffect(() => {
    if (!room?.bgUrl) {
      setReassembledMediaUrl('');
      return;
    }
    if (!room.bgUrl.startsWith('CHUNKED_MEDIA:')) {
      setReassembledMediaUrl(room.bgUrl);
      return;
    }
    if (mediaChunks.length === 0) return;
    const expectedTotal = mediaChunks[0].total;
    if (mediaChunks.length < expectedTotal) return;

    const fullDataUrl = mediaChunks.map((c) => c.data).join('');
    setReassembledMediaUrl(fullDataUrl);
  }, [room?.bgUrl, mediaChunks]);

  // Automatically synchronize Partner 2's UID into subcollection documents when Partner 2 joins
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
    mediaChunks.forEach((m) => {
      if (!m.memberUids.includes(room.partner2Id)) {
        updateDoc(doc(db, 'rooms', room.code, 'media', m.id), {
          memberUids: bothUids,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    });
  }, [
    room?.partner2Id,
    room?.ownerId,
    room?.code,
    user,
    goals,
    customCards,
    rewards,
    mediaChunks,
  ]);

  const handleChangePin = (newPin: string) => {
    localStorage.setItem(PIN_STORAGE_KEY, newPin);
    setSavedPin(newPin);
    triggerActionChime();
    showToastMessage('تم تحديث رمز شاشة القفل السرية بنجاح');
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

  const getRoomMemberUids = (): string[] => {
    if (!room || !user) return [];
    const set = new Set<string>([room.ownerId, user.uid]);
    if (room.partner2Id) set.add(room.partner2Id);
    return Array.from(set).slice(0, 2);
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
        bgUrl: '',
        bgType: 'none',
        bgOverlayOpacity: 65,
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

      // Seed default couple rewards
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

  // Shared Live Background Handlers
  const handleUploadBackground = async (
    file: File,
    onProgress: (pct: number) => void
  ) => {
    if (!room || !user) return;
    await uploadSharedBackgroundMedia({
      file,
      roomCode: room.code,
      authorUid: user.uid,
      memberUids: getRoomMemberUids(),
      onProgress,
    });
    triggerActionChime();
    showToastMessage('تم تحديث الخلفية الحية على شاشتيكما معاً!');
  };

  const handleUpdateOverlayOpacity = async (opacity: number) => {
    if (!room) return;
    const path = `rooms/${room.code}`;
    try {
      await updateDoc(doc(db, 'rooms', room.code), {
        bgOverlayOpacity: opacity,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleResetBackground = async () => {
    if (!room) return;
    const path = `rooms/${room.code}`;
    try {
      await updateDoc(doc(db, 'rooms', room.code), {
        bgUrl: '',
        bgType: 'none',
        bgOverlayOpacity: 65,
        updatedAt: serverTimestamp(),
      });
      if (rtdb) {
        rtdbSet(rtdbRef(rtdb, `rooms/${room.code}/background`), {
          bgUrl: '',
          bgType: 'none',
          updatedAt: Date.now(),
        }).catch(() => {});
      }
      triggerActionChime();
      showToastMessage('تمت استعادة الخلفية الرومانسية الافتراضية على الجهازين');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Mood & Longing Pulse Handlers
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
      showToastMessage(`تم تحديث حالتك المزاجية إلى «${mood}»`);
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
        lastPulseMessage: (customMessage || 'أشتاق إليك الآن!').slice(0, 160),
        lastPulseAt: Date.now(),
        updatedAt: serverTimestamp(),
      });
      triggerPulseAlert();
      setShowPulseOverlay(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Written Goals Handlers
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

  // Card Deck Handlers
  const handleDrawCard = async (card: DeckCardItem) => {
    if (!room) return;
    const path = `rooms/${room.code}`;
    const drawnBy =
      activeRole === 'partner1' ? room.partner1Name : room.partner2Name;
    try {
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
      showToastMessage('تم حفظ البطاقة في الصندوق الخاص!');
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

  // Spin Wheel Handlers
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

  // Store Rewards Handlers
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

  // Gate 1: Ultra-Private Stealth Lock Screen (Floating Hearts & Kisses only, ZERO text)
  if (!isUnlocked) {
    return (
      <ErrorBoundary>
        <PinLockScreen
          savedPin={savedPin}
          onUnlock={() => setIsUnlocked(true)}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div
        dir="rtl"
        className="relative h-[100dvh] w-screen overflow-hidden flex flex-col justify-between select-none"
      >
        {/* Fixed Full-Screen Shared Live Media Background (Video / Photo / GIF + Dimming Overlay) */}
        <LiveMediaBackground
          mediaUrl={reassembledMediaUrl}
          mediaType={room?.bgType || 'none'}
          overlayOpacity={room?.bgOverlayOpacity ?? 65}
        />

        {/* Full-Screen Live Heart Pulse Alert Overlay */}
        {showPulseOverlay && room && (
          <div
            onClick={() => setShowPulseOverlay(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 cursor-pointer"
          >
            <div className="relative w-full max-w-sm rounded-3xl bg-slate-900/95 border border-rose-500 p-6 text-center shadow-2xl shadow-rose-500/30">
              <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-rose-500/40 animate-pulse-ring" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-xl">
                  <Heart className="w-8 h-8 text-white fill-white" />
                </div>
              </div>
              <p className="text-xs font-bold text-amber-400 mb-1">
                وصلتك نبضة شوق حية من {room.lastPulseFromName}
              </p>
              <h3 className="text-lg font-bold text-white font-display mb-4 leading-relaxed whitespace-normal break-words">
                «{room.lastPulseMessage || 'أشتاق إليك في هذه اللحظة!'}»
              </h3>
              <button
                type="button"
                onClick={() => setShowPulseOverlay(false)}
                className="w-full min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                استلمت النبضة بحب
              </button>
            </div>
          </div>
        )}

        {/* Compact Mobile Header: Brand / Partner Switcher, Live 12-Hour Clock, Settings Gear, & Stealth Lock */}
        <header className="relative z-20 bg-slate-950/80 backdrop-blur-md border-b border-rose-500/25 px-3 sm:px-6 py-2 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
            {/* Left/Right: Brand & Quick Partner Role Switcher */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
                <span className="text-sm sm:text-base font-bold text-white font-display">
                  نبض القلوب
                </span>
              </div>

              {room && (
                <button
                  type="button"
                  onClick={() =>
                    handleSwitchRole(
                      activeRole === 'partner1' ? 'partner2' : 'partner1'
                    )
                  }
                  className="min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-900/90 border border-rose-500/35 text-[11px] font-bold text-rose-200 hover:border-rose-400 transition-colors cursor-pointer"
                  title="اضغط للتبديل بين الشريكين"
                >
                  {activeRole === 'partner1'
                    ? `${room.partner1Name} (${room.partner1Points}★)`
                    : `${room.partner2Name} (${room.partner2Points}★)`}
                </button>
              )}
            </div>

            {/* Right/Left Controls: Live 12-Hour Clock + Settings Gear Icon + Lock Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className="flex items-center gap-1 rounded-xl bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 text-[11px] font-mono font-bold text-amber-300 tabular-nums"
                title="الساعة الرقمية الحية (١٢ ساعة)"
              >
                <Clock className="w-3 h-3 text-rose-400 shrink-0" />
                <span dir="ltr">{clockText}</span>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                aria-label="الإعدادات والخلفية المشتركة"
                className="min-h-[42px] min-w-[42px] rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-rose-500/35 text-amber-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsUnlocked(false)}
                aria-label="قفل الشاشة السري"
                className="min-h-[42px] min-w-[42px] rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Live Toast Banner */}
        {liveToast && (
          <div className="fixed top-14 right-3 left-3 sm:left-auto sm:max-w-sm z-40 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-rose-500 px-3.5 py-2.5 shadow-2xl flex items-center gap-2.5">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400 shrink-0" />
            <p className="text-xs font-semibold text-white leading-relaxed whitespace-normal break-words">
              {liveToast}
            </p>
          </div>
        )}

        {/* Active Full-Screen Tab Content Area (Strictly bounded inside 100dvh) */}
        <main className="relative z-10 flex-1 min-h-0 w-full max-w-5xl mx-auto px-3 sm:px-6 py-2.5 overflow-hidden">
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
            <div className="h-full w-full overflow-hidden">
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
                  onUpdateMood={handleUpdateMood}
                  onSendPulse={handleSendPulse}
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
            </div>
          )}
        </main>

        {/* Bottom Dock: Developer Credit Line + Fixed 4-Tab Mobile Navigation Bar */}
        <div className="relative z-20 bg-slate-950/90 backdrop-blur-md border-t border-rose-500/25 shrink-0">
          {/* Compact Single-Line Developer Credit neatly above Bottom Nav Bar */}
          <div
            dir="ltr"
            className="text-center py-1 text-[10px] font-mono text-slate-400 border-b border-slate-800/60"
          >
            Developed by Amir Lamay • Made In Egypt
          </div>

          {/* 4 Full-Screen Mobile Tabs Bar */}
          {room && (
            <nav className="max-w-5xl mx-auto grid grid-cols-4 gap-1 px-2 py-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('goals')}
                className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  activeTab === 'goals'
                    ? 'bg-gradient-to-t from-rose-600/30 to-amber-500/20 border border-rose-500/50 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Target
                  className={`w-4 h-4 ${
                    activeTab === 'goals' ? 'text-rose-400' : ''
                  }`}
                />
                <span className="text-[11px] leading-tight">الأهداف</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cards')}
                className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  activeTab === 'cards'
                    ? 'bg-gradient-to-t from-rose-600/30 to-amber-500/20 border border-rose-500/50 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers
                  className={`w-4 h-4 ${
                    activeTab === 'cards' ? 'text-amber-400' : ''
                  }`}
                />
                <span className="text-[11px] leading-tight">البطاقات</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('wheel')}
                className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  activeTab === 'wheel'
                    ? 'bg-gradient-to-t from-rose-600/30 to-amber-500/20 border border-rose-500/50 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass
                  className={`w-4 h-4 ${
                    activeTab === 'wheel' ? 'text-rose-400' : ''
                  }`}
                />
                <span className="text-[11px] leading-tight">العجلة والمزاج</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rewards')}
                className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  activeTab === 'rewards'
                    ? 'bg-gradient-to-t from-rose-600/30 to-amber-500/20 border border-rose-500/50 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gift
                  className={`w-4 h-4 ${
                    activeTab === 'rewards' ? 'text-amber-400' : ''
                  }`}
                />
                <span className="text-[11px] leading-tight">المكافآت</span>
              </button>
            </nav>
          )}
        </div>

        {/* Settings Modal (Shared Background Upload, Dimming Slider, Reset, Change PIN) */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          room={room}
          activeRole={activeRole}
          onSwitchRole={handleSwitchRole}
          onUploadBackground={handleUploadBackground}
          onUpdateOverlayOpacity={handleUpdateOverlayOpacity}
          onResetBackground={handleResetBackground}
          currentPin={savedPin}
          onChangePin={handleChangePin}
          onLeaveRoom={handleLeaveRoom}
        />

        <OfflineIndicator />
      </div>
    </ErrorBoundary>
  );
}
