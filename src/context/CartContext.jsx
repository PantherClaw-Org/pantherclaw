import React, { createContext, useContext, useEffect, useReducer, useState } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "pantherclaw_cart";

function reducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const { product, size } = action;
      const key = `${product.slug}-${size}`;
      const existing = state.items.find((i) => i.key === key);
      let items;
      if (existing) {
        items = state.items.map((i) =>
          i.key === key ? { ...i, qty: i.qty + 1 } : i
        );
      } else {
        items = [
          ...state.items,
          {
            key,
            slug: product.slug,
            name: product.name,
            subtitle: product.subtitle,
            price: product.price,
            image: product.images[0],
            size,
            qty: 1,
          },
        ];
      }
      return { ...state, items };
    }
    case "REMOVE":
      return { ...state, items: state.items.filter((i) => i.key !== action.key) };
    case "QTY":
      return {
        ...state,
        items: state.items
          .map((i) =>
            i.key === action.key ? { ...i, qty: Math.max(1, i.qty + action.delta) } : i
          ),
      };
    case "CLEAR":
      return { ...state, items: [] };
    case "HYDRATE":
      return { ...state, items: action.items };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { items: [] });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved) && saved.length) dispatch({ type: "HYDRATE", items: saved });
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items]);

  const addItem = (product, size) => {
    dispatch({ type: "ADD", product, size });
    setOpen(true);
  };

  const count = state.items.reduce((s, i) => s + i.qty, 0);
  const subtotal = state.items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        addItem,
        removeItem: (key) => dispatch({ type: "REMOVE", key }),
        changeQty: (key, delta) => dispatch({ type: "QTY", key, delta }),
        clear: () => dispatch({ type: "CLEAR" }),
        count,
        subtotal,
        open,
        setOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
