import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Id } from "../../convex/_generated/dataModel";

export type CartItem = {
  productId: Id<"products">;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  setQuantity: (productId: Id<"products">, quantity: number) => void;
  removeItem: (productId: Id<"products">) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "sibabu_cart_v1";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage penuh / private mode — abaikan
    }
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === item.productId);
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: Math.min(99, i.quantity + 1) }
            : i,
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const setQuantity = useCallback(
    (productId: Id<"products">, quantity: number) => {
      setItems(prev =>
        quantity <= 0
          ? prev.filter(i => i.productId !== productId)
          : prev.map(i =>
              i.productId === productId
                ? { ...i, quantity: Math.min(99, quantity) }
                : i,
            ),
      );
    },
    [],
  );

  const removeItem = useCallback((productId: Id<"products">) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
    return {
      items,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      totalItems,
      totalPrice,
    };
  }, [items, addItem, setQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam CartProvider");
  return ctx;
}
