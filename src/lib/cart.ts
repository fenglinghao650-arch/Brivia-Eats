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

const CART_STORAGE_KEY = "brivia_cart_v1";

const readCart = (): CartItem[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
};

export const getCart = () => readCart();

export const setCart = (items: CartItem[]) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
};

export const getCartItemKey = (item: Pick<CartItem, "dishId" | "variations">) => {
  const variationIds = item.variations.map((entry) => entry.optionId).sort();
  return `${item.dishId}:${variationIds.join("|")}`;
};

export const addToCart = (item: Omit<CartItem, "quantity">) => {
  const items = readCart();
  const itemKey = getCartItemKey(item);
  const existing = items.find(
    (stored) =>
      stored.menuId === item.menuId &&
      getCartItemKey(stored) === itemKey
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ ...item, quantity: 1 });
  }

  setCart(items);
  return items;
};

export const updateQuantity = (itemKey: string, quantity: number) => {
  const items = readCart();
  const next = items
    .map((item) =>
      getCartItemKey(item) === itemKey ? { ...item, quantity } : item
    )
    .filter((item) => item.quantity > 0);
  setCart(next);
  return next;
};

export const clearCart = () => {
  setCart([]);
};
