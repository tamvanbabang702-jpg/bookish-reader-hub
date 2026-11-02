// Reader Hub data model — everything is stored locally (localStorage + IndexedDB images).

export type ContentKind = "book" | "article" | "journal";
export type ReadStatus = "want" | "reading" | "completed" | "paused" | "abandoned";
export type VaultKind = "highlight" | "summary" | "lesson" | "inspiration" | "personal";
export type DiscoveryKind = "concept" | "vocabulary" | "person" | "theory" | "question" | "project";
export type ChallengeUnit = "books" | "minutes" | "pages" | "entries";

export interface ReadingItem {
  id: string;
  kind: ContentKind;
  title: string;
  author: string;
  coverId?: string; // IndexedDB image key
  description?: string;
  category?: string;
  tags: string[];
  dateAdded: string; // yyyy-mm-dd
  startDate?: string;
  completedDate?: string;
  status: ReadStatus;
  totalPages?: number;
  currentPage: number;
  rating?: number; // 1..5
  review?: string;
  favorite: boolean;
  collectionIds: string[];
}

export interface ReadingSession {
  id: string;
  itemId: string;
  date: string; // yyyy-mm-dd
  minutes: number;
  pages: number;
  note?: string;
  source: "timer" | "manual";
}

export interface VaultReview {
  at: number;
  text: string;
}

export interface VaultEntry {
  id: string;
  kind: VaultKind;
  title: string;
  content: string; // lightweight rich text (## heading, **bold**, *italic*, - list, > quote)
  itemId?: string;
  tags: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  reviewedAt?: number;
  reviews: VaultReview[];
}

export interface ReflectionDoc {
  id: string;
  itemId: string;
  answers: Record<string, string>;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface QuoteEntry {
  id: string;
  text: string;
  author?: string;
  createdAt: number;
  favorite: boolean;
}

export interface DiscoveryEntry {
  id: string;
  kind: DiscoveryKind;
  text: string;
  itemId?: string;
  createdAt: number;
}

export interface Challenge {
  id: string;
  name: string;
  unit: ChallengeUnit;
  target: number;
  deadline?: string; // yyyy-mm-dd
  createdAt: number;
  done: boolean;
}

export interface ActiveTimer {
  itemId: string;
  startedAt: number; // epoch ms of last "start" (valid while running)
  accumulatedMin: number; // minutes banked while paused
  running: boolean;
  goalMin?: number;
}

export interface Settings {
  name: string;
  avatarId?: string;
  theme: "light" | "dark";
  fontSize: "sm" | "md" | "lg";
  dailyGoalType: "minutes" | "pages";
  dailyGoalValue: number;
  weeklyGoalMinutes: number;
  monthlyGoalMinutes: number;
  annualBookGoal: number;
  categories: string[];
  checklist: string[];
}

export interface RHData {
  version: number;
  items: ReadingItem[];
  sessions: ReadingSession[];
  vault: VaultEntry[];
  reflections: ReflectionDoc[];
  collections: Collection[];
  quotes: QuoteEntry[];
  discoveries: DiscoveryEntry[];
  challenges: Challenge[];
  checklist: Record<string, string[]>; // date -> completed checklist labels
  settings: Settings;
  timer: ActiveTimer | null;
  createdAt: number;
}

export const SUGGESTED_CATEGORIES = [
  "Personal Development",
  "Psychology",
  "Business & Entrepreneurship",
  "Philosophy",
  "History",
  "Spirituality",
  "Academic Research",
  "Fiction & Literature",
  "Science & Technology",
  "Other",
] as const;

export const READ_STATUSES: { id: ReadStatus; label: string }[] = [
  { id: "want", label: "Want to Read" },
  { id: "reading", label: "Currently Reading" },
  { id: "completed", label: "Completed" },
  { id: "paused", label: "Paused" },
  { id: "abandoned", label: "Abandoned" },
];

export const CONTENT_KINDS: { id: ContentKind; label: string }[] = [
  { id: "book", label: "Book" },
  { id: "article", label: "Article" },
  { id: "journal", label: "Journal & Document" },
];

export const VAULT_KINDS: { id: VaultKind; label: string }[] = [
  { id: "highlight", label: "Highlight" },
  { id: "summary", label: "Summary" },
  { id: "lesson", label: "Lesson Learned" },
  { id: "inspiration", label: "Inspiration" },
  { id: "personal", label: "Personal Reflection" },
];

export const DISCOVERY_KINDS: { id: DiscoveryKind; label: string }[] = [
  { id: "concept", label: "Interesting Concept" },
  { id: "vocabulary", label: "New Vocabulary" },
  { id: "person", label: "Person Discovered" },
  { id: "theory", label: "Interesting Theory" },
  { id: "question", label: "Question to Investigate" },
  { id: "project", label: "Future Project Idea" },
];

export const REFLECTION_QUESTIONS = [
  "What is this book mainly about?",
  "What are the three most important things I learned?",
  "What surprised me?",
  "Which ideas challenged my previous beliefs?",
  "What can I apply to my daily life?",
  "What is my biggest takeaway?",
  "Would I recommend this book?",
] as const;

export const DEFAULT_CHECKLIST = [
  "Read for 10 minutes",
  "Save one highlight or note",
  "Review one past insight",
];

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  theme: "light",
  fontSize: "md",
  dailyGoalType: "minutes",
  dailyGoalValue: 20,
  weeklyGoalMinutes: 140,
  monthlyGoalMinutes: 600,
  annualBookGoal: 12,
  categories: [...SUGGESTED_CATEGORIES.slice(0, 5)],
  checklist: [...DEFAULT_CHECKLIST],
};
