import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import type { User as FirebaseUser } from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import {
  signup,
  login as loginUser,
  logout as logoutUser,
  getUserRole,
  onAuthChange,
} from "./authService";
import type { UserRole } from "../types/ui";

/** Role assigned to self-service signups. An admin promotes from here. */
export const DEFAULT_SIGNUP_ROLE: UserRole = "supplier";

export interface AuthUser {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isRole(value: unknown): value is UserRole {
  return (
    value === "admin" || value === "warehouse_manager" || value === "supplier"
  );
}

function messageFor(cause: unknown): string {
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? String((cause as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. Please try again.";
    case "auth/email-already-in-use":
      return "An account already exists for this email address.";
    case "auth/weak-password":
      return "Choose a password with at least 8 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "permission-denied":
      return "Your account does not have access to this workspace yet.";
    default:
      return cause instanceof Error
        ? cause.message
        : "Something went wrong. Please try again.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthChange(async (current) => {
      if (!active) return;
      setFirebaseUser(current);

      if (!current) {
        setRole(null);
        setProfileName("");
        setLoading(false);
        return;
      }

      try {
        const fetched = await getUserRole(current.uid);
        if (!active) return;
        setRole(isRole(fetched) ? fetched : null);

        const snap = await getDoc(doc(db, "users", current.uid));
        if (!active) return;
        const name = snap.exists() ? snap.data().name : null;
        setProfileName(typeof name === "string" ? name : "");
      } catch (cause) {
        console.error("Could not fetch user profile:", cause);
        if (active) setRole(null);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const wrap = useCallback(async (operation: () => Promise<unknown>) => {
    setError(null);
    try {
      await operation();
    } catch (cause) {
      setError(messageFor(cause));
      throw cause;
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      await wrap(async () => {
        await setPersistence(
          auth,
          remember ? browserLocalPersistence : browserSessionPersistence,
        );
        await loginUser(email, password);
      });
    },
    [wrap],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await wrap(() => signup(email, password, name, DEFAULT_SIGNUP_ROLE));
    },
    [wrap],
  );

  const resetPassword = useCallback(
    async (email: string) => {
      await wrap(() => sendPasswordResetEmail(auth, email));
    },
    [wrap],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setFirebaseUser(null);
    setRole(null);
    setLoading(false);
    setError(null);
  }, []);

  const user = useMemo<AuthUser | null>(() => {
    if (!firebaseUser || !role) return null;
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? "",
      fullName:
        profileName ||
        firebaseUser.displayName ||
        firebaseUser.email ||
        "Team member",
      role,
    };
  }, [firebaseUser, role, profileName]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      role,
      loading,
      error,
      clearError: () => setError(null),
      login,
      register,
      resetPassword,
      logout,
    }),
    [
      user,
      firebaseUser,
      role,
      loading,
      error,
      login,
      register,
      resetPassword,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
