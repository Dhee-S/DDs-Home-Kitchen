import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  itemCode: string; // Unique code for each cart item
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  maxStock: number;
  scheduledMenuId?: string;
  scheduledDate?: string; // Date selected in cart
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "itemCode">, quantity?: number) => void;
  removeItem: (itemCode: string) => void;
  updateQuantity: (itemCode: string, quantity: number) => void;
  updateScheduledDate: (itemCode: string, date: string, scheduledMenuId?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "dd-kitchen-cart";

const generateItemCode = () => {
  return `HK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, "quantity" | "itemCode">, qty: number = 1) => {
    const newItemCode = generateItemCode();
    setItems((prev) => {
      const existing = prev.find((i) => i.dishId === item.dishId && i.scheduledMenuId === item.scheduledMenuId);
      if (existing) {
        if (existing.quantity >= item.maxStock) return prev;
        return prev.map((i) =>
          i.dishId === item.dishId && i.scheduledMenuId === item.scheduledMenuId 
            ? { ...i, quantity: Math.min(i.quantity + qty, item.maxStock) } 
            : i
        );
      }
      return [...prev, { ...item, quantity: Math.min(qty, item.maxStock), itemCode: newItemCode }];
    });
    return newItemCode;
  };

  const removeItem = (itemCode: string) => {
    setItems((prev) => prev.filter((i) => i.itemCode !== itemCode));
  };

  const updateQuantity = (itemCode: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemCode);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.itemCode === itemCode ? { ...i, quantity: Math.min(quantity, i.maxStock) } : i))
    );
  };

  const updateScheduledDate = (itemCode: string, date: string, scheduledMenuId?: string) => {
    setItems((prev) =>
      prev.map((i) => (i.itemCode === itemCode ? { ...i, scheduledDate: date, scheduledMenuId: scheduledMenuId || i.scheduledMenuId } : i))
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, updateScheduledDate, clearCart, totalItems, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
