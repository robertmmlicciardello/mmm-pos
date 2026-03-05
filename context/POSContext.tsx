import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useCallback,
} from "react";
import * as Crypto from "expo-crypto";
import {
  Product,
  Order,
  OrderItem,
  OrderType,
  ActiveTable,
  Employee,
  CreditCustomer,
  CreditTransaction,
  loadProducts,
  saveProducts,
  loadOrders,
  addOrder,
  deleteOrder,
  clearAllOrders,
  loadActiveTables,
  saveActiveTables,
  loadEmployees,
  saveEmployees,
  loadCreditCustomers,
  saveCreditCustomers,
  loadCreditTransactions,
  saveCreditTransactions,
  loadCategories,
  saveCategories,
} from "@/lib/storage";

type CartItem = {
  product: Product;
  quantity: number;
};

type POSContextValue = {
  products: Product[];
  orders: Order[];
  activeTables: ActiveTable[];
  cart: CartItem[];
  employees: Employee[];
  categories: string[];
  creditCustomers: CreditCustomer[];
  creditTransactions: CreditTransaction[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, "id" | "createdAt">) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  addToTable: (tableNumber: number, product: Product) => Promise<void>;
  sendCartToTable: (tableNumber: number) => Promise<void>;
  removeFromTable: (tableNumber: number, productId: string) => Promise<void>;
  updateTableItemQty: (tableNumber: number, productId: string, qty: number) => Promise<void>;
  setTableNote: (tableNumber: number, note: string) => Promise<void>;
  settleBill: (tableNumber: number) => Promise<Order>;
  settleBillAsCredit: (tableNumber: number, customerId: string) => Promise<Order>;
  clearTable: (tableNumber: number) => Promise<void>;
  checkoutTakeaway: (note?: string) => Promise<Order>;
  checkoutTakeawayAsCredit: (customerId: string, note?: string) => Promise<Order>;
  removeOrder: (id: string) => Promise<void>;
  clearOrders: () => Promise<void>;
  addEmployee: (emp: Omit<Employee, "id" | "createdAt">) => Promise<void>;
  updateEmployee: (emp: Employee) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  addCreditCustomer: (cust: Omit<CreditCustomer, "id" | "createdAt">) => Promise<CreditCustomer>;
  updateCreditCustomer: (cust: CreditCustomer) => Promise<void>;
  removeCreditCustomer: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
  renameCategory: (oldName: string, newName: string) => Promise<void>;
  addCreditPayment: (customerId: string, amount: number, note?: string) => Promise<void>;
  getCustomerBalance: (customerId: string) => number;
  cartTotal: number;
  cartItemCount: number;
  getTableTotal: (tableNumber: number) => number;
  getTableItemCount: (tableNumber: number) => number;
};

const POSContext = createContext<POSContextValue | null>(null);

export function POSProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTables, setActiveTables] = useState<ActiveTable[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, o, t, e, cc, ct, cats] = await Promise.all([
        loadProducts(),
        loadOrders(),
        loadActiveTables(),
        loadEmployees(),
        loadCreditCustomers(),
        loadCreditTransactions(),
        loadCategories(),
      ]);
      setProducts(p);
      setOrders(o);
      setActiveTables(t);
      setEmployees(e);
      setCreditCustomers(cc);
      setCreditTransactions(ct);
      const productCats = Array.from(new Set(p.map((prod) => prod.category)));
      const mergedCats = Array.from(new Set([...cats, ...productCats]));
      if (mergedCats.length !== cats.length) {
        await saveCategories(mergedCats);
      }
      setCategories(mergedCats);
      setIsLoading(false);
    })();
  }, []);

  const addProduct = useCallback(
    async (product: Omit<Product, "id" | "createdAt">) => {
      const newProduct: Product = {
        ...product,
        id: Crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      const updated = [...products, newProduct];
      setProducts(updated);
      await saveProducts(updated);
    },
    [products]
  );

  const updateProduct = useCallback(
    async (product: Product) => {
      const updated = products.map((p) => (p.id === product.id ? product : p));
      setProducts(updated);
      await saveProducts(updated);
    },
    [products]
  );

  const removeProduct = useCallback(
    async (id: string) => {
      const updated = products.filter((p) => p.id !== id);
      setProducts(updated);
      await saveProducts(updated);
      setCart((prev) => prev.filter((c) => c.product.id !== id));
    },
    [products]
  );

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  }, []);

  const updateCartQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((c) => (c.product.id === productId ? { ...c, quantity: qty } : c))
      );
    }
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const addToTable = useCallback(
    async (tableNumber: number, product: Product) => {
      setActiveTables((prev) => {
        const existing = prev.find((t) => t.tableNumber === tableNumber);
        if (existing) {
          const existingItem = existing.items.find((i) => i.product.id === product.id);
          if (existingItem) {
            return prev.map((t) =>
              t.tableNumber === tableNumber
                ? { ...t, items: t.items.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i) }
                : t
            );
          }
          return prev.map((t) =>
            t.tableNumber === tableNumber ? { ...t, items: [...t.items, { product, quantity: 1 }] } : t
          );
        }
        return [...prev, { tableNumber, items: [{ product, quantity: 1 }], openedAt: new Date().toISOString() }];
      });
      const updated = await loadActiveTables();
      const existing = updated.find((t) => t.tableNumber === tableNumber);
      if (existing) {
        const existingItem = existing.items.find((i) => i.product.id === product.id);
        if (existingItem) existingItem.quantity += 1;
        else existing.items.push({ product, quantity: 1 });
        await saveActiveTables(updated);
      } else {
        updated.push({ tableNumber, items: [{ product, quantity: 1 }], openedAt: new Date().toISOString() });
        await saveActiveTables(updated);
      }
    },
    []
  );

  const sendCartToTable = useCallback(
    async (tableNumber: number) => {
      if (cart.length === 0) return;
      setActiveTables((prev) => {
        const existing = prev.find((t) => t.tableNumber === tableNumber);
        if (existing) {
          const updatedItems = [...existing.items];
          for (const ci of cart) {
            const found = updatedItems.find((i) => i.product.id === ci.product.id);
            if (found) found.quantity += ci.quantity;
            else updatedItems.push({ product: ci.product, quantity: ci.quantity });
          }
          return prev.map((t) => (t.tableNumber === tableNumber ? { ...t, items: updatedItems } : t));
        }
        return [...prev, { tableNumber, items: cart.map((c) => ({ product: c.product, quantity: c.quantity })), openedAt: new Date().toISOString() }];
      });
      const tables = await loadActiveTables();
      const existing = tables.find((t) => t.tableNumber === tableNumber);
      if (existing) {
        for (const ci of cart) {
          const found = existing.items.find((i) => i.product.id === ci.product.id);
          if (found) found.quantity += ci.quantity;
          else existing.items.push({ product: ci.product, quantity: ci.quantity });
        }
        await saveActiveTables(tables);
      } else {
        tables.push({ tableNumber, items: cart.map((c) => ({ product: c.product, quantity: c.quantity })), openedAt: new Date().toISOString() });
        await saveActiveTables(tables);
      }
      setCart([]);
    },
    [cart]
  );

  const removeFromTable = useCallback(
    async (tableNumber: number, productId: string) => {
      setActiveTables((prev) =>
        prev.map((t) => {
          if (t.tableNumber !== tableNumber) return t;
          return { ...t, items: t.items.filter((i) => i.product.id !== productId) };
        }).filter((t) => t.items.length > 0)
      );
      const updated = (await loadActiveTables())
        .map((t) => {
          if (t.tableNumber !== tableNumber) return t;
          return { ...t, items: t.items.filter((i) => i.product.id !== productId) };
        })
        .filter((t) => t.items.length > 0);
      await saveActiveTables(updated);
    },
    []
  );

  const updateTableItemQty = useCallback(
    async (tableNumber: number, productId: string, qty: number) => {
      setActiveTables((prev) =>
        prev.map((t) => {
          if (t.tableNumber !== tableNumber) return t;
          if (qty <= 0) return { ...t, items: t.items.filter((i) => i.product.id !== productId) };
          return { ...t, items: t.items.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i)) };
        }).filter((t) => t.items.length > 0)
      );
      const tables = await loadActiveTables();
      const updated = tables
        .map((t) => {
          if (t.tableNumber !== tableNumber) return t;
          if (qty <= 0) return { ...t, items: t.items.filter((i) => i.product.id !== productId) };
          return { ...t, items: t.items.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i)) };
        })
        .filter((t) => t.items.length > 0);
      await saveActiveTables(updated);
    },
    []
  );

  const setTableNote = useCallback(
    async (tableNumber: number, note: string) => {
      setActiveTables((prev) => prev.map((t) => (t.tableNumber === tableNumber ? { ...t, note } : t)));
      const tables = await loadActiveTables();
      await saveActiveTables(tables.map((t) => (t.tableNumber === tableNumber ? { ...t, note } : t)));
    },
    []
  );

  const settleBill = useCallback(
    async (tableNumber: number): Promise<Order> => {
      const table = activeTables.find((t) => t.tableNumber === tableNumber);
      if (!table || table.items.length === 0) throw new Error("No items on this table");
      const total = table.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const order: Order = {
        id: Crypto.randomUUID(),
        items: table.items,
        total,
        createdAt: new Date().toISOString(),
        note: table.note,
        orderType: "dine-in",
        tableNumber,
      };
      await addOrder(order);
      setOrders((prev) => [order, ...prev]);
      setActiveTables((prev) => prev.filter((t) => t.tableNumber !== tableNumber));
      const updated = (await loadActiveTables()).filter((t) => t.tableNumber !== tableNumber);
      await saveActiveTables(updated);
      return order;
    },
    [activeTables]
  );

  const settleBillAsCredit = useCallback(
    async (tableNumber: number, customerId: string): Promise<Order> => {
      const table = activeTables.find((t) => t.tableNumber === tableNumber);
      if (!table || table.items.length === 0) throw new Error("No items on this table");
      const total = table.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const order: Order = {
        id: Crypto.randomUUID(),
        items: table.items,
        total,
        createdAt: new Date().toISOString(),
        note: table.note,
        orderType: "dine-in",
        tableNumber,
        creditCustomerId: customerId,
      };
      await addOrder(order);
      setOrders((prev) => [order, ...prev]);
      const txn: CreditTransaction = {
        id: Crypto.randomUUID(),
        customerId,
        amount: total,
        type: "credit",
        orderId: order.id,
        createdAt: new Date().toISOString(),
      };
      setCreditTransactions((prev) => {
        const updated = [...prev, txn];
        saveCreditTransactions(updated);
        return updated;
      });
      setActiveTables((prev) => prev.filter((t) => t.tableNumber !== tableNumber));
      const updated = (await loadActiveTables()).filter((t) => t.tableNumber !== tableNumber);
      await saveActiveTables(updated);
      return order;
    },
    [activeTables]
  );

  const clearTable = useCallback(
    async (tableNumber: number) => {
      setActiveTables((prev) => prev.filter((t) => t.tableNumber !== tableNumber));
      const updated = (await loadActiveTables()).filter((t) => t.tableNumber !== tableNumber);
      await saveActiveTables(updated);
    },
    []
  );

  const checkoutTakeaway = useCallback(
    async (note?: string): Promise<Order> => {
      const items: OrderItem[] = cart.map((c) => ({ product: c.product, quantity: c.quantity }));
      const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const order: Order = {
        id: Crypto.randomUUID(),
        items,
        total,
        createdAt: new Date().toISOString(),
        note,
        orderType: "takeaway",
      };
      await addOrder(order);
      setOrders((prev) => [order, ...prev]);
      setCart([]);
      return order;
    },
    [cart]
  );

  const checkoutTakeawayAsCredit = useCallback(
    async (customerId: string, note?: string): Promise<Order> => {
      const items: OrderItem[] = cart.map((c) => ({ product: c.product, quantity: c.quantity }));
      const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const order: Order = {
        id: Crypto.randomUUID(),
        items,
        total,
        createdAt: new Date().toISOString(),
        note,
        orderType: "takeaway",
        creditCustomerId: customerId,
      };
      await addOrder(order);
      setOrders((prev) => [order, ...prev]);
      const txn: CreditTransaction = {
        id: Crypto.randomUUID(),
        customerId,
        amount: total,
        type: "credit",
        orderId: order.id,
        createdAt: new Date().toISOString(),
      };
      setCreditTransactions((prev) => {
        const updated = [...prev, txn];
        saveCreditTransactions(updated);
        return updated;
      });
      setCart([]);
      return order;
    },
    [cart]
  );

  const removeOrder = useCallback(async (id: string) => {
    await deleteOrder(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const clearOrders = useCallback(async () => {
    await clearAllOrders();
    setOrders([]);
  }, []);

  const addEmployee = useCallback(
    async (emp: Omit<Employee, "id" | "createdAt">) => {
      const newEmp: Employee = { ...emp, id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
      const updated = [...employees, newEmp];
      setEmployees(updated);
      await saveEmployees(updated);
    },
    [employees]
  );

  const updateEmployee = useCallback(
    async (emp: Employee) => {
      const updated = employees.map((e) => (e.id === emp.id ? emp : e));
      setEmployees(updated);
      await saveEmployees(updated);
    },
    [employees]
  );

  const removeEmployee = useCallback(
    async (id: string) => {
      const updated = employees.filter((e) => e.id !== id);
      setEmployees(updated);
      await saveEmployees(updated);
    },
    [employees]
  );

  const addCreditCustomer = useCallback(
    async (cust: Omit<CreditCustomer, "id" | "createdAt">): Promise<CreditCustomer> => {
      const newCust: CreditCustomer = { ...cust, id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
      const updated = [...creditCustomers, newCust];
      setCreditCustomers(updated);
      await saveCreditCustomers(updated);
      return newCust;
    },
    [creditCustomers]
  );

  const updateCreditCustomer = useCallback(
    async (cust: CreditCustomer) => {
      const updated = creditCustomers.map((c) => (c.id === cust.id ? cust : c));
      setCreditCustomers(updated);
      await saveCreditCustomers(updated);
    },
    [creditCustomers]
  );

  const removeCreditCustomer = useCallback(
    async (id: string) => {
      const updatedCustomers = creditCustomers.filter((c) => c.id !== id);
      setCreditCustomers(updatedCustomers);
      await saveCreditCustomers(updatedCustomers);
      setCreditTransactions((prev) => {
        const updatedTxns = prev.filter((t) => t.customerId !== id);
        saveCreditTransactions(updatedTxns);
        return updatedTxns;
      });
    },
    [creditCustomers]
  );

  const addCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || categories.includes(trimmed)) return;
      const updated = [...categories, trimmed];
      setCategories(updated);
      await saveCategories(updated);
    },
    [categories]
  );

  const removeCategory = useCallback(
    async (name: string) => {
      const updatedCats = categories.filter((c) => c !== name);
      setCategories(updatedCats);
      await saveCategories(updatedCats);
      const fallback = updatedCats[0] || "အထူး";
      const updatedProducts = products.map((p) =>
        p.category === name ? { ...p, category: fallback } : p
      );
      if (updatedProducts.some((p, i) => p !== products[i])) {
        setProducts(updatedProducts);
        await saveProducts(updatedProducts);
      }
    },
    [categories, products]
  );

  const renameCategory = useCallback(
    async (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || (categories.includes(trimmed) && trimmed !== oldName)) return;
      const updatedCats = categories.map((c) => (c === oldName ? trimmed : c));
      setCategories(updatedCats);
      await saveCategories(updatedCats);
      const updatedProducts = products.map((p) =>
        p.category === oldName ? { ...p, category: trimmed } : p
      );
      setProducts(updatedProducts);
      await saveProducts(updatedProducts);
    },
    [categories, products]
  );

  const addCreditPayment = useCallback(
    async (customerId: string, amount: number, note?: string) => {
      const txn: CreditTransaction = {
        id: Crypto.randomUUID(),
        customerId,
        amount,
        type: "payment",
        note,
        createdAt: new Date().toISOString(),
      };
      setCreditTransactions((prev) => {
        const updated = [...prev, txn];
        saveCreditTransactions(updated);
        return updated;
      });
    },
    []
  );

  const getCustomerBalance = useCallback(
    (customerId: string): number => {
      return creditTransactions
        .filter((t) => t.customerId === customerId)
        .reduce((sum, t) => sum + (t.type === "credit" ? t.amount : -t.amount), 0);
    },
    [creditTransactions]
  );

  const cartTotal = useMemo(() => cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0), [cart]);
  const cartItemCount = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart]);

  const getTableTotal = useCallback(
    (tableNumber: number) => {
      const table = activeTables.find((t) => t.tableNumber === tableNumber);
      if (!table) return 0;
      return table.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    },
    [activeTables]
  );

  const getTableItemCount = useCallback(
    (tableNumber: number) => {
      const table = activeTables.find((t) => t.tableNumber === tableNumber);
      if (!table) return 0;
      return table.items.reduce((sum, i) => sum + i.quantity, 0);
    },
    [activeTables]
  );

  const value = useMemo(
    () => ({
      products, orders, activeTables, cart, employees, categories, creditCustomers, creditTransactions, isLoading,
      addProduct, updateProduct, removeProduct,
      addToCart, removeFromCart, updateCartQty, clearCart,
      addToTable, sendCartToTable, removeFromTable, updateTableItemQty, setTableNote,
      settleBill, settleBillAsCredit, clearTable,
      checkoutTakeaway, checkoutTakeawayAsCredit,
      removeOrder, clearOrders,
      addEmployee, updateEmployee, removeEmployee,
      addCreditCustomer, updateCreditCustomer, removeCreditCustomer,
      addCategory, removeCategory, renameCategory,
      addCreditPayment, getCustomerBalance,
      cartTotal, cartItemCount, getTableTotal, getTableItemCount,
    }),
    [
      products, orders, activeTables, cart, employees, categories, creditCustomers, creditTransactions, isLoading,
      addProduct, updateProduct, removeProduct,
      addToCart, removeFromCart, updateCartQty, clearCart,
      addToTable, sendCartToTable, removeFromTable, updateTableItemQty, setTableNote,
      settleBill, settleBillAsCredit, clearTable,
      checkoutTakeaway, checkoutTakeawayAsCredit,
      removeOrder, clearOrders,
      addEmployee, updateEmployee, removeEmployee,
      addCreditCustomer, updateCreditCustomer, removeCreditCustomer,
      addCategory, removeCategory, renameCategory,
      addCreditPayment, getCustomerBalance,
      cartTotal, cartItemCount, getTableTotal, getTableItemCount,
    ]
  );

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) throw new Error("usePOS must be used within a POSProvider");
  return context;
}
