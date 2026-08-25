export type LocalSale = {
  id: string;
  totalAmount: number;
  createdAt: string;
  cashRegister: number;
  folio?: string;
};

export type LocalExpense = {
  id: string;
  amount: number;
  expenseDate: string;
};

const SALES_KEY = "erp_pos_sales";
const EXPENSES_KEY = "erp_pos_expenses";

export function loadLocalSales(): LocalSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SALES_KEY);
    const parsed = raw ? (JSON.parse(raw) as Array<Partial<LocalSale>>) : [];
    return parsed
      .map((sale, index) => ({
        id: String(sale.id || `local-sale-${sale.createdAt || index}`),
        totalAmount: Number(sale.totalAmount ?? 0),
        createdAt: String(sale.createdAt || new Date().toISOString()),
        cashRegister: Number(sale.cashRegister ?? 1),
        folio: sale.folio,
      }))
      .filter((sale) => sale.totalAmount > 0 && sale.createdAt);
  } catch {
    return [];
  }
}

export function saveLocalSale(sale: LocalSale) {
  const current = loadLocalSales();
  window.localStorage.setItem(
    SALES_KEY,
    JSON.stringify([sale, ...current].slice(0, 200))
  );
}

export function loadLocalExpenses(): LocalExpense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EXPENSES_KEY);
    const parsed = raw ? (JSON.parse(raw) as Array<Partial<LocalExpense>>) : [];
    return parsed.map((expense, index) => ({
      id: String(expense.id || `local-expense-${index}`),
      amount: Number(expense.amount ?? 0),
      expenseDate: String(expense.expenseDate || new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

export function saveLocalExpense(expense: LocalExpense) {
  const current = loadLocalExpenses();
  window.localStorage.setItem(
    EXPENSES_KEY,
    JSON.stringify([expense, ...current].slice(0, 200))
  );
}

export function removeLocalExpense(id: string) {
  window.localStorage.setItem(
    EXPENSES_KEY,
    JSON.stringify(loadLocalExpenses().filter((item) => item.id !== id))
  );
}

export function mergeSales(primary: LocalSale[], extra: LocalSale[]) {
  const seen = new Set<string>();
  const merged: LocalSale[] = [];
  for (const sale of [...primary, ...extra]) {
    const key = sale.id || `${sale.createdAt}|${sale.totalAmount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(sale);
  }
  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
