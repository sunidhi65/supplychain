// UI-only types for the StockWise dashboard shell.
// Kept in a separate file so src/types/index.ts stays untouched.
import type { User } from "./index";

export type UserRole = User["role"];
export type AccountStatus = "active" | "inactive";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  warehouse_manager: "Warehouse Manager",
  supplier: "Supplier",
};

/** A row of the Firestore `users` collection, shaped for the admin table. */
export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  company?: string;
  createdAt?: string;
}
