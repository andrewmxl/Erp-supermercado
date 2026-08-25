export type FeedbackKind = "queja" | "sugerencia" | "comentario" | "calificacion";

export type StoreFeedback = {
  id: string;
  kind: FeedbackKind;
  name: string;
  contact: string;
  message: string;
  rating: number | null;
  purchaseRating?: number | null;
  storeRating?: number | null;
  cashierRating?: number | null;
  createdAt: string;
};

const KEY = "erp_store_feedback";

export function loadFeedback(): StoreFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]") as StoreFeedback[];
  } catch {
    return [];
  }
}

export function saveFeedback(entry: StoreFeedback) {
  const current = loadFeedback();
  window.localStorage.setItem(KEY, JSON.stringify([entry, ...current].slice(0, 80)));
}

export function averageRating(items: StoreFeedback[]) {
  const rated = items.filter((item) => item.rating && item.rating > 0);
  if (rated.length === 0) return 0;
  return rated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / rated.length;
}
