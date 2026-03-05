import AsyncStorage from "@react-native-async-storage/async-storage";

const PRODUCTS_KEY = "pos_products";
const ORDERS_KEY = "pos_orders";
const ACTIVE_TABLES_KEY = "pos_active_tables";
const EMPLOYEES_KEY = "pos_employees";
const CREDIT_CUSTOMERS_KEY = "pos_credit_customers";
const CREDIT_TRANSACTIONS_KEY = "pos_credit_transactions";
const CATEGORIES_KEY = "pos_categories";

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  color: string;
  createdAt: string;
};

export type OrderItem = {
  product: Product;
  quantity: number;
};

export type OrderType = "dine-in" | "takeaway";

export type ActiveTable = {
  tableNumber: number;
  items: OrderItem[];
  note?: string;
  openedAt: string;
};

export type Order = {
  id: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
  note?: string;
  orderType: OrderType;
  tableNumber?: number;
  creditCustomerId?: string;
};

export type Employee = {
  id: string;
  name: string;
  phone: string;
  role: string;
  salary: number;
  startDate: string;
  active: boolean;
  createdAt: string;
};

export type CreditCustomer = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
};

export type CreditTransaction = {
  id: string;
  customerId: string;
  amount: number;
  type: "credit" | "payment";
  orderId?: string;
  note?: string;
  createdAt: string;
};

const DEFAULT_COLORS = [
  "#FF6B35",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
];

export function getRandomColor(): string {
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
}

const DEFAULT_PRODUCTS: Product[] = [
  { id: "1", name: "မုန့်ငါးကြော်", price: 3500, category: "ထမင်းများ", color: "#FF6B35", createdAt: new Date().toISOString() },
  { id: "2", name: "ထမင်းပဲသုပ်", price: 2500, category: "ထမင်းများ", color: "#DDA0DD", createdAt: new Date().toISOString() },
  { id: "3", name: "ကြက်ကြော်ကြမ်း", price: 4000, category: "အသား/ဟင်း", color: "#F7DC6F", createdAt: new Date().toISOString() },
  { id: "4", name: "လက်ဖက်ရည်", price: 1500, category: "အချိုရည်", color: "#45B7D1", createdAt: new Date().toISOString() },
  { id: "5", name: "ရေအိုး", price: 500, category: "အချိုရည်", color: "#85C1E9", createdAt: new Date().toISOString() },
  { id: "6", name: "ကြက်သားကြော်", price: 3000, category: "အသား/ဟင်း", color: "#96CEB4", createdAt: new Date().toISOString() },
];

export async function loadProducts(): Promise<Product[]> {
  try {
    const raw = await AsyncStorage.getItem(PRODUCTS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

export async function saveProducts(products: Product[]): Promise<void> {
  await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export async function loadOrders(): Promise<Order[]> {
  try {
    const raw = await AsyncStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveOrders(orders: Order[]): Promise<void> {
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export async function addOrder(order: Order): Promise<void> {
  const orders = await loadOrders();
  orders.unshift(order);
  await saveOrders(orders);
}

export async function deleteOrder(id: string): Promise<void> {
  const orders = await loadOrders();
  await saveOrders(orders.filter((o) => o.id !== id));
}

export async function clearAllOrders(): Promise<void> {
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify([]));
}

export async function loadActiveTables(): Promise<ActiveTable[]> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_TABLES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveActiveTables(tables: ActiveTable[]): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TABLES_KEY, JSON.stringify(tables));
}

export async function loadEmployees(): Promise<Employee[]> {
  try {
    const raw = await AsyncStorage.getItem(EMPLOYEES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveEmployees(employees: Employee[]): Promise<void> {
  await AsyncStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
}

export async function loadCreditCustomers(): Promise<CreditCustomer[]> {
  try {
    const raw = await AsyncStorage.getItem(CREDIT_CUSTOMERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCreditCustomers(customers: CreditCustomer[]): Promise<void> {
  await AsyncStorage.setItem(CREDIT_CUSTOMERS_KEY, JSON.stringify(customers));
}

export async function loadCreditTransactions(): Promise<CreditTransaction[]> {
  try {
    const raw = await AsyncStorage.getItem(CREDIT_TRANSACTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCreditTransactions(txns: CreditTransaction[]): Promise<void> {
  await AsyncStorage.setItem(CREDIT_TRANSACTIONS_KEY, JSON.stringify(txns));
}

const DEFAULT_CATEGORIES = ["ထမင်းများ", "အသား/ဟင်း", "အချိုရည်", "အရက်/ဘီယာ", "အစာအလတ်", "အထူး"];

export async function loadCategories(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CATEGORIES_KEY);
    if (!raw) {
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function saveCategories(categories: string[]): Promise<void> {
  await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function exportOrdersAsJSON(orders: Order[]): string {
  const exportData = {
    exportedAt: new Date().toISOString(),
    totalOrders: orders.length,
    totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
    orders,
  };
  return JSON.stringify(exportData, null, 2);
}
