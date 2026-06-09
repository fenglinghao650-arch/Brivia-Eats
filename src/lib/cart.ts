export type CartVariation = {
  groupLabel: string;
  optionId: string;
  nameNative: string;
  nameEn?: string;
};

export type CartItem = {
  dishId: string;
  restaurantId: string;
  restaurantName: string;
  menuId: string;
  romanizedName: string;
  clarityName: string;
  nativeName: string;
  price: number;
  currency: string;
  quantity: number;
  allergens: string[];
  dietaryFlags: string[];
  variations: CartVariation[];
  imageUrl?: string;
};

const CART_STORAGE_KEY = "brivia_cart_v2";
const LEGACY_KEY = "brivia_cart_v1"; // old single global cart — no longer used

// A cart is dropped after this much inactivity, so a diner returning the next
// day (or months later) starts fresh instead of seeing stale items. Long
// enough to survive a single dining visit.
const CART_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Carts are scoped per restaurant: one diner can have separate carts for
// different restaurants on the same device, and viewing one never shows another.
type StoredCart = { updatedAt: number; items: CartItem[] };
type CartStore = Record<string, StoredCart>;

const readStore = (): CartStore => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    window.localStorage.removeItem(LEGACY_KEY);
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CartStore) : {};
  } catch {
    return {};
  }
};

const writeStore = (store: CartStore) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(store));
};

// Remove expired or empty restaurant carts. Returns the cleaned store plus
// whether anything was dropped, so callers can persist the cleanup.
const prune = (store: CartStore): { store: CartStore; changed: boolean } => {
  const now = Date.now();
  const next: CartStore = {};
  let changed = false;
  for (const [restaurantId, cart] of Object.entries(store)) {
    const fresh = cart && now - cart.updatedAt <= CART_TTL_MS && cart.items?.length > 0;
    if (fresh) {
      next[restaurantId] = cart;
    } else {
      changed = true;
    }
  }
  return { store: next, changed };
};

export const getCartItemKey = (item: Pick<CartItem, "dishId" | "variations">) => {
  const variationIds = item.variations.map((entry) => entry.optionId).sort();
  return `${item.dishId}:${variationIds.join("|")}`;
};

export const getCart = (restaurantId: string): CartItem[] => {
  const { store, changed } = prune(readStore());
  if (changed) writeStore(store);
  return store[restaurantId]?.items ?? [];
};

export const addToCart = (item: Omit<CartItem, "quantity">): CartItem[] => {
  const { store } = prune(readStore());
  const cart = store[item.restaurantId] ?? { updatedAt: Date.now(), items: [] };
  const itemKey = getCartItemKey(item);
  const existing = cart.items.find(
    (stored) => stored.menuId === item.menuId && getCartItemKey(stored) === itemKey
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.items.push({ ...item, quantity: 1 });
  }

  cart.updatedAt = Date.now();
  store[item.restaurantId] = cart;
  writeStore(store);
  return cart.items;
};

export const updateQuantity = (
  restaurantId: string,
  itemKey: string,
  quantity: number
): CartItem[] => {
  const { store } = prune(readStore());
  const cart = store[restaurantId];
  if (!cart) {
    writeStore(store);
    return [];
  }

  cart.items = cart.items
    .map((item) => (getCartItemKey(item) === itemKey ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);
  cart.updatedAt = Date.now();

  if (cart.items.length === 0) {
    delete store[restaurantId];
  } else {
    store[restaurantId] = cart;
  }
  writeStore(store);
  return store[restaurantId]?.items ?? [];
};

export const clearCart = (restaurantId: string) => {
  const { store } = prune(readStore());
  delete store[restaurantId];
  writeStore(store);
};
