import React, { createContext, useContext, useState } from "react";

export interface CartItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  maxStock: number;
  scheduledMenuId?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, "quantity">, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.dishId === item.dishId);
      if (existing) {
        if (existing.quantity >= item.maxStock) return prev;
        return prev.map((i) =>
          i.dishId === item.dishId ? { ...i, quantity: Math.min(i.quantity + qty, item.maxStock) } : i
        );
      }
      return [...prev, { ...item, quantity: Math.min(qty, item.maxStock) }];
    });
  };

  const removeItem = (dishId: string) => {
    setItems((prev) => prev.filter((i) => i.dishId !== dishId));
  };

  const updateQuantity = (dishId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(dishId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.dishId === dishId ? { ...i, quantity: Math.min(quantity, i.maxStock) } : i))
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
