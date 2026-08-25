export type ErpRole =
  | "Gerente"
  | "Administrador"
  | "Supervisor"
  | "Cajero"
  | "Tecnico"
  | "Cliente"
  | string;

function foldRole(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Unifies DB/demo labels so Gerente is not treated as a guest. */
export function normalizeRole(role: string | undefined | null): ErpRole {
  const folded = foldRole(role ?? "");
  if (!folded) return "Gerente";
  if (["cliente", "client", "customer"].includes(folded)) return "Cliente";
  if (["cajero", "cashier", "caja"].includes(folded)) return "Cajero";
  if (["supervisor", "piso"].includes(folded)) return "Supervisor";
  if (["tecnico", "tech", "sistemas"].includes(folded)) return "Tecnico";
  if (
    [
      "gerente",
      "administrador",
      "admin",
      "dueño",
      "dueno",
      "owner",
      "manager",
    ].includes(folded)
  ) {
    return "Gerente";
  }
  return role!.trim();
}

export type ErpProfile = {
  id: string;
  name: string;
  email: string;
  role: ErpRole;
  active: boolean;
};

export const STAFF_ROLES = [
  "Gerente",
  "Supervisor",
  "Cajero",
  "Tecnico",
] as const;

export const REVIEW_PROFILE: ErpProfile = {
  id: "9db03eb5-ae73-40e0-ad57-f073a63b537b",
  name: "Revisor Da Vinci",
  email: "revisor@erp-supermercado.demo",
  role: "Gerente",
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

/** Dueño / gerente: finanzas, usuarios, alta de productos, buzón. */
export function isAdmin(role: string | undefined) {
  const normalized = normalizeRole(role);
  return normalized === "Administrador" || normalized === "Gerente";
}

export function isCashier(role: string | undefined) {
  return normalizeRole(role) === "Cajero";
}

export function isClient(role: string | undefined) {
  return normalizeRole(role) === "Cliente";
}

export function isStaff(role: string | undefined) {
  return !isClient(role);
}

export function canSeeFinance(role: string | undefined) {
  return isAdmin(role);
}

export function canManageUsers(role: string | undefined) {
  return isAdmin(role);
}

export function canSeeMailbox(role: string | undefined) {
  return isAdmin(role) || normalizeRole(role) === "Supervisor";
}

export function canEditInventory(role: string | undefined) {
  return isAdmin(role) || normalizeRole(role) === "Supervisor";
}

export function canViewInventory(_role?: string) {
  return true;
}

export function canSeeBuyPrice(role: string | undefined) {
  return isStaff(role);
}

export function canUsePOS(role: string | undefined) {
  const normalized = normalizeRole(role);
  return (
    isAdmin(normalized) ||
    normalized === "Supervisor" ||
    normalized === "Cajero" ||
    normalized === "Cliente"
  );
}

export function canAskBusinessData(role: string | undefined) {
  return isAdmin(role) || normalizeRole(role) === "Supervisor";
}

export const CASHIER_REVIEW_PROFILE: ErpProfile = {
  ...REVIEW_PROFILE,
  id: "c7a5e011-4b22-4f18-9d6e-2f8a1b0c9e77",
  name: "Cajero de demostración",
  email: "cajero@erp-supermercado.demo",
  role: "Cajero",
};

export const SUPERVISOR_REVIEW_PROFILE: ErpProfile = {
  ...REVIEW_PROFILE,
  id: "b2d4f6a8-1111-4c22-8e33-445566778899",
  name: "Supervisor de piso",
  email: "supervisor@erp-supermercado.demo",
  role: "Supervisor",
};

export const TECH_REVIEW_PROFILE: ErpProfile = {
  ...REVIEW_PROFILE,
  id: "d3e5f7a9-2222-4d33-9f44-556677889900",
  name: "Técnico de sistemas",
  email: "tecnico@erp-supermercado.demo",
  role: "Tecnico",
};

export const CLIENT_REVIEW_PROFILE: ErpProfile = {
  ...REVIEW_PROFILE,
  id: "e4f608b0-3333-4e44-a055-667788990011",
  name: "Cliente Cachanilla",
  email: "cliente@erp-supermercado.demo",
  role: "Cliente",
};

export const DEMO_ROLE_KEY = "erp_demo_role";

export function profileForDemoRole(role: string | null): ErpProfile {
  switch (normalizeRole(role ?? "Gerente")) {
    case "Cajero":
      return CASHIER_REVIEW_PROFILE;
    case "Supervisor":
      return SUPERVISOR_REVIEW_PROFILE;
    case "Tecnico":
      return TECH_REVIEW_PROFILE;
    case "Cliente":
      return CLIENT_REVIEW_PROFILE;
    default:
      return REVIEW_PROFILE;
  }
}

export function navLinksForRole(role: string | undefined) {
  const all = [
    { href: "/", label: "Panel", show: true },
    { href: "/pos", label: isClient(role) ? "Comprar" : "Punto de venta", show: canUsePOS(role) },
    {
      href: "/inventory",
      label: isClient(role) ? "Catálogo" : "Inventario",
      show: canViewInventory(role),
    },
    { href: "/finance", label: "Finanzas", show: canSeeFinance(role) },
    { href: "/finance/expenses", label: "Gastos", show: canSeeFinance(role) },
    { href: "/assistant", label: "WhatsApp", show: true },
    { href: "/contact", label: "Contacto", show: true },
    { href: "/users", label: "Usuarios", show: canManageUsers(role) },
    { href: "/feedback", label: "Buzón", show: canSeeMailbox(role) },
  ];

  return all.filter((link) => link.show).map(({ href, label }) => ({ href, label }));
}
