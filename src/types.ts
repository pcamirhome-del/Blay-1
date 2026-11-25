import { Timestamp } from 'firebase/firestore';

export type PartnerRole = 'partner1' | 'partner2';

export interface CoupleRoom {
  code: string;
  ownerId: string;
  partner1Name: string;
  partner1Mood: string;
  partner1Points: number;
  partner2Id: string;
  partner2Name: string;
  partner2Mood: string;
  partner2Points: number;
  lastPulseBy: string;
  lastPulseFromName: string;
  lastPulseMessage: string;
  lastPulseAt: number;
  activeCardId: string;
  activeCardTitle: string;
  activeCardText: string;
  activeCardLevel: number;
  activeCardPoints: number;
  activeCardDrawnBy: string;
  activeCardFlipped: boolean;
  activeCardStage: 'idle' | 'drawn' | 'done' | 'later';
  wheelOptions: string[];
  wheelSpinAngle: number;
  wheelSpinning: boolean;
  wheelWinner: string;
  wheelSpunBy: string;
  wheelSpinTimestamp: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface WrittenGoal {
  id: string;
  roomId: string;
  authorId: string;
  authorRole: PartnerRole;
  authorName: string;
  category: string;
  content: string;
  visibilityMode: 'immediate' | 'hidden';
  isRevealed: boolean;
  timeframe: string;
  rewardPoints: number;
  status: 'in_progress' | 'completed';
  memberUids: string[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface CustomCard {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  level: 1 | 2 | 3;
  title: string;
  prompt: string;
  points: number;
  memberUids: string[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StoreReward {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  costPoints: number;
  iconName: string;
  redeemedCount: number;
  lastRedeemedBy: string;
  memberUids: string[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface DeckCardItem {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  prompt: string;
  points: number;
  isCustom?: boolean;
  authorName?: string;
}

export const MOOD_OPTIONS = [
  'متحمس',
  'رومانسي',
  'أحتاج دلع',
  'جاهز لمغامرة',
  'مشتاق لك',
  'هادئ ومسترخي',
];

export const GOAL_CATEGORIES = [
  'هدف الليلة',
  'أمنية أريد تحقيقها معك',
  'طلب دلع خاص',
  'مغامرة مشتركة',
  'لحظة رومانسية',
];

export const GOAL_TIMEFRAMES = [
  'الليلة',
  'هذا الأسبوع',
  'عطلة نهاية الأسبوع',
  'في أقرب فرصة',
];

export const DEFAULT_WHEEL_OPTIONS = [
  'مساج استرخائي ١٥ دقيقة',
  'عشاء رومانسي على ضوء الشموع',
  'تنفيذ طلب خاص فوراً',
  'اختيار فيلم السهرة',
  'عناق دافئ لمدة دقيقتين',
  'تحضير مشروب الشريك المفضل',
  'جلسة صراحة واعترافات',
  'رقصة هادئة بدون موسيقى',
];

export const DEFAULT_DECK_CARDS: DeckCardItem[] = [
  // المستوى 1: رومانسية ودفء
  {
    id: 'def_l1_1',
    level: 1,
    title: 'لحظة امتنان صادق',
    prompt: 'انظر في عيني شريكك لمدة ٣٠ ثانية متواصلة، ثم أخبره بثلاثة أشياء صغيرة فعلها مؤخراً جعلتك تشعر بالحب والأمان.',
    points: 20,
  },
  {
    id: 'def_l1_2',
    level: 1,
    title: 'الذكرى الأولى',
    prompt: 'احكِ لشريكك عن اللحظة الدقيقة التي أدركت فيها بداخلك أنك وقعت في حبه، وما الذي لفت قلبك حينها.',
    points: 20,
  },
  {
    id: 'def_l1_3',
    level: 1,
    title: 'عناق بلا كلمات',
    prompt: 'قفوا الآن وعانقوا بعضكما عناقاً دافئاً لمدة دقيقة كاملة في صمت تام مع التركيز على نبضات القلب.',
    points: 25,
  },
  {
    id: 'def_l1_4',
    level: 1,
    title: 'رسالة في اليد',
    prompt: 'أمسك يد شريكك واكتب بأصبعك على كفه كلمة حب سرية، وعلى الشريك أن يخمنها وعندما يصيب يحصل على قبلة على جبينه.',
    points: 25,
  },
  {
    id: 'def_l1_5',
    level: 1,
    title: 'أجمل تفصيلة',
    prompt: 'صف أكثر تفصيلة تحبها في ملامح شريكك أو ابتسامته، ولماذا تبعث فيك الراحة كلما رأيتها.',
    points: 20,
  },

  // المستوى 2: مرح وتحدي
  {
    id: 'def_l2_1',
    level: 2,
    title: 'تحدي التقليد اللطيف',
    prompt: 'قم بتقليد طريقة شريكك عندما يكون متحمساً لشيء يحبه أو عندما يستيقظ صباحاً بطريقة مرحة ومحببة لمدة دقيقة.',
    points: 35,
  },
  {
    id: 'def_l2_2',
    level: 2,
    title: 'أمر ملكي لمدة ١٠ دقائق',
    prompt: 'يحق لمن سحب البطاقة إصدار طلب دلع فوري (مساج للكتفين، إحضار سناك لذيذ، أو أغنية مفضلة) وعلى الشريك تنفيذه بابتسامة.',
    points: 40,
  },
  {
    id: 'def_l2_3',
    level: 2,
    title: 'تحدي عدم الضحك',
    prompt: 'حاول إضحاك شريكك خلال ٦٠ ثانية باستخدام تعابير الوجه أو الهمس فقط؛ إذا ضحك تكسب النقاط فوراً!',
    points: 35,
  },
  {
    id: 'def_l2_4',
    level: 2,
    title: 'رقصة مفاجئة',
    prompt: 'شغّل أول أغنية رومانسية تخطر ببالك الآن وادعُ شريكك لرقصة مشتركة في وسط الغرفة لمدة دقيقتين.',
    points: 40,
  },
  {
    id: 'def_l2_5',
    level: 2,
    title: 'سؤال جريء وصريح',
    prompt: 'ما هي المغامرة أو التجربة المجنونة التي تتمنى أن نخوضها معاً هذا العام ولم نخبر أحداً بها من قبل؟',
    points: 35,
  },

  // المستوى 3: خاص جداً - VIP
  {
    id: 'def_l3_1',
    level: 3,
    title: 'همسة شوق خاصة (VIP)',
    prompt: 'اقترب من أذن شريكك واهمس له بأكثر أمنية حميمية وخاصة تتمنى أن تعيشها معه هذه الليلة بالتفصيل.',
    points: 60,
  },
  {
    id: 'def_l3_2',
    level: 3,
    title: 'لمسة الدفء والتركيز (VIP)',
    prompt: 'أغلق عيني شريكك لمدة دقيقتين، ومرر أطراف أصابعك ببطء وحنان على وجهه وعنقه ويديه ليخمن مكان القبلة القادمة.',
    points: 65,
  },
  {
    id: 'def_l3_3',
    level: 3,
    title: 'سر الجاذبية (VIP)',
    prompt: 'صارح شريكك بأكثر تصرف أو إطلالة أو لمسة منه تشعل شوقك وتجعلك غير قادر على مقاومة جاذبيته.',
    points: 60,
  },
  {
    id: 'def_l3_4',
    level: 3,
    title: 'خمس دقائق ملكك وحدك (VIP)',
    prompt: 'امنح شريكك ٥ دقائق كاملة يطلب فيها نوع الدلع أو القبلات أو المساج الذي يرغب به دون أي مقاطعة.',
    points: 75,
  },
  {
    id: 'def_l3_5',
    level: 3,
    title: 'وعد الليلة السري (VIP)',
    prompt: 'اتفقا الآن على كلمة سر خاصة بينكما فقط؛ كلما قالها أحدكما للآخر خلال الأسبوع تعني "أشتاق إليك الآن وأريد وقتاً خاصاً معك".',
    points: 70,
  },
];

export const DEFAULT_STORE_REWARDS: Omit<StoreReward, 'id' | 'roomId' | 'authorId' | 'authorName' | 'memberUids' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'جلسة مساج ملكية (٢٠ دقيقة)',
    description: 'جلسة مساج هادئة للظهر والكتفين مع إضاءة خافتة وموسيقى ناعمة.',
    costPoints: 80,
    iconName: 'Sparkles',
    redeemedCount: 0,
    lastRedeemedBy: '',
  },
  {
    title: 'عشاء أو سهرة من اختيارك الكامل',
    description: 'تحديد قائمة العشاء والفيلم وأجواء السهرة بالكامل دون أي اعتراض من الشريك.',
    costPoints: 100,
    iconName: 'Flame',
    redeemedCount: 0,
    lastRedeemedBy: '',
  },
  {
    title: 'بطاقة "طلب خاص مجاب فوراً"',
    description: 'تنفيذ أمنية أو طلب دلع خاص يختاره حامل البطاقة في نفس الليلة.',
    costPoints: 150,
    iconName: 'Crown',
    redeemedCount: 0,
    lastRedeemedBy: '',
  },
  {
    title: 'إفطار في السرير مع رسالة حب',
    description: 'تحضير القهوة والإفطار المفضل وتقديمه مع ملاحظة مكتوبة بخط اليد.',
    costPoints: 60,
    iconName: 'Heart',
    redeemedCount: 0,
    lastRedeemedBy: '',
  },
];
