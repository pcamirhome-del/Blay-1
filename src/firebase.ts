/**
 * Firebase Configuration & Real-Time Dual-Screen Synchronization Setup
 * -------------------------------------------------------------------
 * Services Initialized:
 * 1. Firebase Firestore (Real-time state, written goals, 3D cards, wheel, rewards, & chunked media fallback)
 * 2. Firebase Storage (Direct photo, GIF, and MP4/WebM video background uploads)
 * 3. Firebase Realtime Database (Optional low-latency broadcast channel if databaseURL is configured)
 * 4. Firebase Authentication (Google Sign-In for private 2-device room pairing)
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
} from 'firebase/storage';
import {
  getDatabase,
  ref as rtdbRef,
  set as rtdbSet,
  Database,
} from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// 1. Firestore (Enterprise / Named Database support)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// 2. Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 3. Firebase Storage for shared photos, GIFs, and MP4/WebM videos
export const storage = (() => {
  try {
    return firebaseConfig.storageBucket ? getStorage(app) : null;
  } catch {
    return null;
  }
})();

// 4. Firebase Realtime Database (optional if databaseURL is present in config)
export const rtdb: Database | null = (() => {
  try {
    const cfg = firebaseConfig as Record<string, string | undefined>;
    if (cfg.databaseURL) {
      return getDatabase(app);
    }
    return null;
  } catch {
    return null;
  }
})();

// Validate Firestore connectivity on startup
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper: Compress static images via Canvas to keep Data URLs crisp and fast
async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result));
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// Helper: Read any file (GIF, MP4, WebM) as Data URL
async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة الملف المرفوع'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a photo, animated GIF, or video (MP4/WebM) and broadcasts it to BOTH partners' screens.
 * Attempts Firebase Storage first with a fast timeout fallback to compressed Data URL / Firestore Media Chunks
 * and Realtime Database broadcast so dual-screen sync works 100% of the time.
 */
export async function uploadSharedBackgroundMedia(params: {
  file: File;
  roomCode: string;
  authorUid: string;
  memberUids: string[];
  onProgress: (percent: number) => void;
}): Promise<{ bgUrl: string; bgType: 'image' | 'video' }> {
  const { file, roomCode, authorUid, memberUids, onProgress } = params;
  const isVideo = file.type.startsWith('video/');
  const isGif = file.type === 'image/gif';
  const bgType: 'image' | 'video' = isVideo ? 'video' : 'image';

  onProgress(8);

  // 1. Try Firebase Storage upload first if bucket is available and file is large
  if (storage && (isVideo || file.size > 500 * 1024)) {
    try {
      const storageUrl = await new Promise<string>((resolve, reject) => {
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileRef = storageRef(
          storage,
          `rooms/${roomCode}/bg_${Date.now()}_${cleanName}`
        );
        const uploadTask = uploadBytesResumable(fileRef, file);

        // Fallback timer if Storage bucket rules are not enabled on Starter tier
        const fallbackTimeout = setTimeout(() => {
          uploadTask.cancel();
          reject(new Error('STORAGE_TIMEOUT_FALLBACK'));
        }, 3200);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.bytesTransferred > 0) {
              clearTimeout(fallbackTimeout);
              const pct = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 90
              );
              onProgress(Math.max(10, pct));
            }
          },
          (err) => {
            clearTimeout(fallbackTimeout);
            reject(err);
          },
          async () => {
            clearTimeout(fallbackTimeout);
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          }
        );
      });

      await updateDoc(doc(db, 'rooms', roomCode), {
        bgUrl: storageUrl,
        bgType,
        updatedAt: serverTimestamp(),
      });

      if (rtdb) {
        rtdbSet(rtdbRef(rtdb, `rooms/${roomCode}/background`), {
          bgUrl: storageUrl,
          bgType,
          updatedAt: Date.now(),
        }).catch(() => {});
      }

      onProgress(100);
      return { bgUrl: storageUrl, bgType };
    } catch {
      // Automatically fall back to direct compressed/chunked real-time database sync
    }
  }

  // 2. Direct Real-Time Sync Pipeline (Compressed Image or Chunked Video/GIF)
  onProgress(20);
  const dataUrl =
    !isVideo && !isGif
      ? await compressImageToDataUrl(file)
      : await readFileAsDataUrl(file);

  onProgress(45);

  // If dataUrl fits inside a single Firestore room field (<= 680KB)
  if (dataUrl.length <= 680000) {
    await updateDoc(doc(db, 'rooms', roomCode), {
      bgUrl: dataUrl,
      bgType,
      updatedAt: serverTimestamp(),
    });

    if (rtdb) {
      rtdbSet(rtdbRef(rtdb, `rooms/${roomCode}/background`), {
        bgUrl: dataUrl,
        bgType,
        updatedAt: Date.now(),
      }).catch(() => {});
    }

    onProgress(100);
    return { bgUrl: dataUrl, bgType };
  }

  // For larger animated GIFs or MP4/WebM video clips (up to ~14MB), chunk across /rooms/{roomCode}/media
  const chunkSize = 620000;
  const totalChunks = Math.ceil(dataUrl.length / chunkSize);
  if (totalChunks > 24) {
    throw new Error(
      'حجم الفيديو كبير جداً؛ يرجى اختيار مقطع فيديو قصير (أقل من ١٠ ميجابايت) للمزامنة الفورية'
    );
  }

  // Clear old media chunks first
  const mediaCol = collection(db, 'rooms', roomCode, 'media');
  const existingChunks = await getDocs(mediaCol);
  for (const oldDoc of existingChunks.docs) {
    await deleteDoc(oldDoc.ref);
  }

  for (let i = 0; i < totalChunks; i++) {
    const slice = dataUrl.slice(i * chunkSize, (i + 1) * chunkSize);
    const chunkId = `chunk_${String(i).padStart(2, '0')}`;
    await setDoc(doc(db, 'rooms', roomCode, 'media', chunkId), {
      roomId: roomCode,
      authorId: authorUid,
      index: i,
      total: totalChunks,
      mimeType: file.type || (isVideo ? 'video/mp4' : 'image/gif'),
      data: slice,
      memberUids,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const pct = 45 + Math.round(((i + 1) / totalChunks) * 50);
    onProgress(pct);
  }

  const chunkedMarker = `CHUNKED_MEDIA:${Date.now()}`;
  await updateDoc(doc(db, 'rooms', roomCode), {
    bgUrl: chunkedMarker,
    bgType,
    updatedAt: serverTimestamp(),
  });

  if (rtdb) {
    rtdbSet(rtdbRef(rtdb, `rooms/${roomCode}/background`), {
      bgUrl: chunkedMarker,
      bgType,
      updatedAt: Date.now(),
    }).catch(() => {});
  }

  onProgress(100);
  return { bgUrl: chunkedMarker, bgType };
}

// Web Audio & Haptic Feedback Synthesizer for Real-Time Couple Alerts
export function triggerPulseAlert() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([140, 80, 220, 80, 180]);
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.16, now + idx * 0.11 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.38);
    });
  } catch {
    // Ignore autoplay restriction if user hasn't interacted yet
  }
}

export function triggerActionChime() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(45);
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch {
    // Ignore audio restriction
  }
}
