export type ErpRole = "Administrador" | "Cajero" | string;

export type ErpProfile = {
  id: string;
  name: string;
  email: string;
  role: ErpRole;
  active: boolean;
};

/** Cajero de demostración (mismo UUID que ya usaba el POS). */
export const REVIEW_PROFILE: ErpProfile = {
  id: "9db03eb5-ae73-40e0-ad57-f073a63b537b",
  name: "Revisor Da Vinci",
  email: "revisor@erp-supermercado.demo",
  role: "Administrador",
  active: true,
};

export function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

export function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function startOfWeek(date: Date) {
  const result = startOfDay(date);
  const day = result.getDay();
  const difference = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - difference);
  return result;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isAdmin(role: string | undefined) {
  return role === "Administrador";
}

export function isCashier(role: string | undefined) {
  return role === "Cajero";
}

export const CASHIER_REVIEW_PROFILE: ErpProfile = {
  ...REVIEW_PROFILE,
  id: "c7a5e011-4b22-4f18-9d6e-2f8a1b0c9e77",
  name: "Cajero de demostración",
  email: "cajero@erp-supermercado.demo",
  role: "Cajero",
};

export const DEMO_ROLE_KEY = "erp_demo_role";
