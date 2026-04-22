const LIKES_KEY = "liked_restaurants";

export function getLikedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LIKES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function toggleLike(restaurantId: string): string[] {
  const current = getLikedIds();
  const next = current.includes(restaurantId)
    ? current.filter((id) => id !== restaurantId)
    : [...current, restaurantId];
  localStorage.setItem(LIKES_KEY, JSON.stringify(next));
  return next;
}
