import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  X,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
} from "lucide-react";

import { useAuth } from "./services/AuthContext";
import { ROLE_LABELS, type UserRole } from "./types/ui";
import { Change, CategoryChart, InventoryChart, OrderTrendChart } from "./components/Charts";
import { AdminUserManagement } from "./components/AdminUserManagement";

import InventoryPage from "./pages/InventoryPage";
import SuppliersPage from "./pages/SuppliersPage";

import { subscribeToProducts, subscribeToStockMovements } from "./services/productService";
import { subscribeToSuppliers } from "./services/supplierService";
import {
  createOrder,
  subscribeToOrders,
  subscribeToSupplierOrders,
  updateOrderStatus,
} from "./services/orderService";
import {
  markAsRead,
  subscribeToNotifications,
} from "./services/notificationService";
import type { Product, StockMovement, Supplier } from "./types";

import "./App.css";

/* ------------------------------------------------------------------ *
 * Navigation
 * ------------------------------------------------------------------ */

const iconFor: Record<string, typeof LayoutDashboard> = {
  Overview: LayoutDashboard,
  "User Management": Users,
  Products: Package,
  Suppliers: Building2,
  Orders: ClipboardList,
  Inventory: Boxes,
  Settings: Settings,
  "Purchase Orders": ClipboardList,
  "Stock History": Activity,
  Notifications: Bell,
  "My Orders": ClipboardList,
  "Order History": Clock3,
  Profile: Users,
};

interface NavEntry {
  label: string;
  path: string;
}

const navByRole: Record<UserRole, NavEntry[]> = {
  admin: [
    { label: "Overview", path: "/overview" },
    { label: "User Management", path: "/users" },
    { label: "Inventory", path: "/inventory" },
    { label: "Suppliers", path: "/suppliers" },
    { label: "Orders", path: "/orders" },
    { label: "Notifications", path: "/notifications" },
    { label: "Settings", path: "/settings" },
  ],
  warehouse_manager: [
    { label: "Overview", path: "/overview" },
    { label: "Inventory", path: "/inventory" },
    { label: "Orders", path: "/orders" },
    { label: "Notifications", path: "/notifications" },
    { label: "Settings", path: "/settings" },
  ],
  supplier: [
    { label: "Overview", path: "/overview" },
    { label: "Orders", path: "/orders" },
    { label: "Notifications", path: "/notifications" },
    { label: "Profile", path: "/settings" },
  ],
};

function allowedPaths(role: UserRole): string[] {
  return navByRole[role].map((entry) => entry.path);
}

/* ------------------------------------------------------------------ *
 * Shared Firestore hooks
 * ------------------------------------------------------------------ */

function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (next) => setProducts(next),
      (error) => console.error("Products subscription failed:", error),
    );
    return () => unsubscribe();
  }, []);
  return products;
}

function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  useEffect(() => {
    const unsubscribe = subscribeToSuppliers(
      (next) => setSuppliers(next),
      (error) => console.error("Suppliers subscription failed:", error),
    );
    return () => unsubscribe();
  }, []);
  return suppliers;
}

/** Orders, scoped to the signed-in supplier's own supplier record. */
function useOrders(role: UserRole, supplierId: string | null) {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (role === "supplier") {
      if (!supplierId) {
        setOrders([]);
        return;
      }
      const unsubscribe = subscribeToSupplierOrders(supplierId, setOrders);
      return () => unsubscribe();
    }

    const unsubscribe = subscribeToOrders(setOrders);
    return () => unsubscribe();
  }, [role, supplierId]);

  return orders;
}

function useNotifications(uid: string | null) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      return;
    }
    const unsubscribe = subscribeToNotifications(uid, setNotifications);
    return () => unsubscribe();
  }, [uid]);

  return notifications;
}

function useStockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  useEffect(() => {
    const unsubscribe = subscribeToStockMovements(
      (next: StockMovement[]) => setMovements(next),
      (error: Error) => console.error("Stock movements subscription failed:", error),
    );
    return () => unsubscribe();
  }, []);
  return movements;
}

/* ------------------------------------------------------------------ *
 * Formatting helpers
 * ------------------------------------------------------------------ */

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function relativeTime(value: any): string {
  const date = toDate(value);
  if (!date) return "—";

  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} hours ago`;
  if (minutes < 60 * 48) return "Yesterday";
  return date.toLocaleDateString();
}

function shortDate(value: any): string {
  const date = toDate(value);
  if (!date) return "—";

  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay)
    return `Today, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return date.toLocaleDateString();
}

function money(value: number): string {
  return `$${(Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function compactMoney(value: number): string {
  const amount = Number(value) || 0;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
}

function statusClass(status: string) {
  return String(status).toLowerCase();
}

function titleCase(status: string) {
  const text = String(status);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ------------------------------------------------------------------ *
 * Routing
 * ------------------------------------------------------------------ */

function AuthGuard({ children }: { children: ReactNode }) {
  const { firebaseUser, role, loading } = useAuth();
  const loc = useLocation();

  if (loading)
    return (
      <div className="page-loading">
        <span className="loader" />
        Loading your workspace…
      </div>
    );

  if (!firebaseUser)
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;

  if (!role) return <NoRole />;

  return <>{children}</>;
}

function NoRole() {
  const { firebaseUser, logout } = useAuth();

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <AuthVisual />
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <div className="form-heading">
            <span className="section-kicker">ACCESS PENDING</span>
            <h2>Your account has no role yet</h2>
            <p>
              An administrator must assign your access before you can open the
              workspace.
            </p>
          </div>
          <div className="config-note">
            <span className="pulse-dot" />
            <span>
              <b>Waiting for approval</b>
              <small>{firebaseUser?.email}</small>
            </span>
          </div>
          <button className="button primary full" onClick={() => logout()}>
            Sign out
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="auth-bottom">
          © 2024 Stockwise, Inc. <span>·</span> Built for better inventory flow
        </div>
      </section>
    </main>
  );
}

function App() {
  const { firebaseUser, role } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={firebaseUser && role ? "/overview" : "/login"} replace />
        }
      />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        }
      />
    </Routes>
  );
}

export default App;

/* ------------------------------------------------------------------ *
 * Auth pages — StockWise design
 * ------------------------------------------------------------------ */

function AuthVisual() {
  return (
    <>
      <div className="auth-brand">
        <div className="brand-mark">
          <Boxes size={22} />
        </div>
        <span>stockwise</span>
      </div>
      <div className="visual-copy">
        <span className="eyebrow">
          <Sparkles size={13} /> INVENTORY, IN SYNC
        </span>
        <h1>
          Know what’s
          <br />
          moving. <em>Always.</em>
        </h1>
        <p>
          One clear view of every product, purchase order, and warehouse
          movement.
        </p>
        <div className="visual-stats">
          <div>
            <b>98.6%</b>
            <span>order accuracy</span>
          </div>
          <div>
            <b>24/7</b>
            <span>stock visibility</span>
          </div>
        </div>
      </div>
      <div className="warehouse-art">
        <div className="art-sun" />
        <div className="warehouse-building">
          <div className="roof" />
          <div className="warehouse-front">
            <div className="windows">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="dock">
              <span>01</span>
              <span>02</span>
              <span>03</span>
            </div>
          </div>
        </div>
        <div className="art-truck">
          <div className="truck-box">
            <Boxes size={30} />
          </div>
          <div className="truck-cab" />
          <i />
          <i />
        </div>
        <div className="floating-card">
          <div className="float-check">
            <Check size={15} />
          </div>
          <span>
            <b>Stock updated</b>
            <small>Just now · Warehouse 01</small>
          </span>
        </div>
        <div className="art-box box-one" />
        <div className="art-box box-two" />
      </div>
      <div className="visual-foot">
        <ShieldCheck size={15} /> Secure access for every team
      </div>
    </>
  );
}

function AuthPage({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const { login, register, resetPassword, error, clearError, firebaseUser, role } =
    useAuth();
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (firebaseUser && role) nav("/overview", { replace: true });
  }, [firebaseUser, role, nav]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccess("");
    if (mode === "signup" && password !== confirm) return;

    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password, remember);
        nav("/");
      } else if (mode === "signup") {
        await register(name, email, password);
        setSuccess(
          "Your account was created. An administrator must approve your profile and assign your access before you can sign in.",
        );
      } else {
        await resetPassword(email);
        setSuccess(
          "If an account exists for this email, a password reset link is on its way.",
        );
      }
    } catch {
      /* error surfaces through the auth context */
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <AuthVisual />
      </section>
      <section className="auth-form-side">
        <div className="auth-top">
          <span>
            {mode === "signup"
              ? "Already have an account?"
              : mode === "forgot"
                ? "Remember your password?"
                : "New to Stockwise?"}
          </span>
          <Link
            to={
              mode === "signup"
                ? "/login"
                : mode === "forgot"
                  ? "/login"
                  : "/signup"
            }
          >
            {mode === "signup"
              ? "Sign in"
              : mode === "forgot"
                ? "Back to sign in"
                : "Create account"}
          </Link>
        </div>
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <div className="brand-mark">
              <Boxes size={22} />
            </div>{" "}
            stockwise
          </div>
          <div className="form-heading">
            <span className="section-kicker">
              {mode === "login"
                ? "WELCOME BACK"
                : mode === "signup"
                  ? "GET STARTED"
                  : "ACCOUNT RECOVERY"}
            </span>
            <h2>
              {mode === "login"
                ? "Sign in to your workspace"
                : mode === "signup"
                  ? "Create your account"
                  : "Reset your password"}
            </h2>
            <p>
              {mode === "login"
                ? "Your inventory command center is ready."
                : "We’ll help you get back to your inventory workspace."}
            </p>
          </div>
          {error && <div className="form-alert error">{error}</div>}
          {success && (
            <div className="form-alert success">
              <Check size={16} />
              {success}
            </div>
          )}
          <form onSubmit={submit} className="auth-form">
            {mode === "signup" && (
              <label>
                Full name
                <div className="input-wrap">
                  <Users size={17} />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    minLength={2}
                  />
                </div>
              </label>
            )}
            <label>
              Email address
              <div className="input-wrap">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>
            </label>
            {mode !== "forgot" && (
              <label>
                Password
                <div className="input-wrap">
                  <LockKeyhole size={17} />
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setShow(!show)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
            )}
            {mode === "signup" && (
              <label>
                Confirm password
                <div className="input-wrap">
                  <LockKeyhole size={17} />
                  <input
                    type={show ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    minLength={8}
                  />
                </div>
                {confirm && password !== confirm && (
                  <small className="field-error">Passwords don’t match</small>
                )}
              </label>
            )}
            {mode === "login" && (
              <div className="form-options">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />{" "}
                  Remember me
                </label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            )}
            <button
              className="button primary full"
              disabled={busy || (mode === "signup" && password !== confirm)}
            >
              {busy ? (
                <>
                  <span className="loader light-loader" />
                  {mode === "login"
                    ? "Signing in…"
                    : mode === "signup"
                      ? "Creating account…"
                      : "Sending link…"}
                </>
              ) : (
                <>
                  {mode === "login"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <div className="auth-divider">
            <span /> <small>SECURE, ROLE-BASED ACCESS</small> <span />
          </div>
          <div className="auth-secure">
            <ShieldCheck size={17} />
            <span>
              Your account is protected with encrypted authentication.
            </span>
          </div>
        </div>
        <div className="auth-bottom">
          © 2024 Stockwise, Inc. <span>·</span> Built for better inventory flow
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * Dashboard shell — StockWise sidebar + topbar
 * ------------------------------------------------------------------ */

function Dashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  // Never fabricate a role: it must come from useAuth() or not at all.
  const resolvedRole = user?.role ?? null;
  const effectiveRole: UserRole = resolvedRole ?? "supplier";
  const [search, setSearch] = useState("");
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState("");

  const name = user?.fullName || "Team member";
  const navItems = navByRole[effectiveRole];
  const permitted = allowedPaths(effectiveRole);

  const suppliers = useSuppliers();
  const products = useProducts();

  /** The supplier record belonging to the signed-in supplier user. */
  const ownSupplierId = useMemo(() => {
    if (effectiveRole !== "supplier" || !user) return null;
    const match = suppliers.find((supplier) => supplier.userId === user.uid);
    return match?.id ?? null;
  }, [effectiveRole, suppliers, user]);

  const orders = useOrders(effectiveRole, ownSupplierId);
  const notifications = useNotifications(user?.uid ?? null);

  const unread = notifications.filter((item) => !item.read).length;
  const lowStock = products.filter(
    (product) => (product.quantity ?? 0) <= (product.minStockThreshold ?? 0),
  );

  const active =
    navItems.find((item) => loc.pathname.startsWith(item.path))?.label ??
    "Overview";

  const go = (path: string) => {
    nav(path);
    setSearch("");
    setMobile(false);
  };

  // Rather than render a guessed role, wait for the real one.
  if (!resolvedRole)
    return (
      <div className="page-loading">
        <span className="loader" />
        Loading your workspace…
      </div>
    );

  return (
    <div className={`app-shell ${mobile ? "nav-open" : ""}`}>
      <aside className="sidebar">
        <div className="side-brand">
          <div className="brand-mark">
            <Boxes size={21} />
          </div>
          <span>stockwise</span>
          <button
            className="mobile-close icon-btn"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-logo">
            {effectiveRole === "supplier" ? (
              <Truck size={17} />
            ) : (
              <Building2 size={17} />
            )}
          </div>
          <div>
            <b>
              {effectiveRole === "supplier"
                ? suppliers.find((supplier) => supplier.id === ownSupplierId)
                    ?.company || "Supplier workspace"
                : "SupplyChain"}
            </b>
            <small>{ROLE_LABELS[effectiveRole]}</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = iconFor[item.label] || LayoutDashboard;
            return (
              <button
                key={item.label}
                className={`nav-item ${active === item.label ? "active" : ""}`}
                onClick={() => go(item.path)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.label === "Inventory" && lowStock.length > 0 && (
                  <i className="nav-count">{lowStock.length}</i>
                )}
                {item.label === "Notifications" && unread > 0 && (
                  <i className="nav-dot" />
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <CircleHelp size={17} />
            </div>
            <b>Need a hand?</b>
            <p>Visit our help center for quick answers.</p>
            <button
              onClick={() =>
                setNotice(
                  "Help center is ready to connect to your team’s support resource.",
                )
              }
            >
              Get support <ArrowRight size={14} />
            </button>
          </div>
          <button
            className="nav-item logout-nav"
            onClick={async () => {
              await logout();
              nav("/login", { replace: true });
            }}
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
          <div className="side-user">
            <div className="avatar">{initials(name)}</div>
            <div className="side-user-copy">
              <b>{name}</b>
              <small>{user?.email}</small>
            </div>
            <button
              className="icon-btn"
              aria-label="Account options"
              onClick={() => go("/settings")}
            >
              <Settings size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <div className="mobile-scrim" onClick={() => setMobile(false)} />
      )}
      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle icon-btn"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="crumb-slash">/</span>
              <b>{active}</b>
            </div>
          </div>
          <div className="top-actions">
            <div className="global-search">
              <Search size={16} />
              <input
                placeholder="Search anything..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>
            <button
              className="top-icon icon-btn"
              aria-label="Help"
              onClick={() =>
                setNotice(
                  "Help center is ready to connect to your team’s support resource.",
                )
              }
            >
              <CircleHelp size={19} />
            </button>
            <button
              className="top-icon icon-btn notification-button"
              aria-label="Notifications"
              onClick={() => go("/notifications")}
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </button>
            <div className="top-divider" />
            <button className="top-profile" onClick={() => go("/settings")}>
              <div className="avatar avatar-small">{initials(name)}</div>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        <div className="demo-banner">
          <span>
            <Sparkles size={15} />
            Live workspace · connected to Cloud Firestore
          </span>
          <div>
            {products.length} products · {suppliers.length} suppliers ·{" "}
            {orders.length} orders
          </div>
        </div>
        {notice && (
          <div className="toast">
            <Check size={16} />
            {notice}
            <button onClick={() => setNotice("")} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        )}
        <div className="content-area">
          <Routes>
            <Route
              path="/overview"
              element={
                <Overview
                  role={effectiveRole}
                  products={products}
                  suppliers={suppliers}
                  orders={orders}
                  lowStock={lowStock}
                  name={name}
                  notify={setNotice}
                  go={go}
                />
              }
            />
            <Route
              path="/users"
              element={
                permitted.includes("/users") ? (
                  <AdminUserManagement
                    search={search}
                    setSearch={setSearch}
                    notify={setNotice}
                  />
                ) : (
                  <Navigate to="/overview" replace />
                )
              }
            />
            <Route
              path="/inventory"
              element={
                permitted.includes("/inventory") ? (
                  <InventoryPage />
                ) : (
                  <Navigate to="/overview" replace />
                )
              }
            />
            <Route
              path="/suppliers"
              element={
                permitted.includes("/suppliers") ? (
                  <SuppliersPage />
                ) : (
                  <Navigate to="/overview" replace />
                )
              }
            />
            <Route
              path="/orders"
              element={
                <OrdersContent
                  role={effectiveRole}
                  orders={orders}
                  suppliers={suppliers}
                  products={products}
                  search={search}
                  notify={setNotice}
                  currentUid={user?.uid ?? ""}
                />
              }
            />
            <Route
              path="/notifications"
              element={
                <NoticeContent
                  notifications={notifications}
                  notify={setNotice}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsContent
                  name={name}
                  email={user?.email ?? ""}
                  role={effectiveRole}
                  notify={setNotice}
                />
              }
            />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shared pieces — StockWise markup
 * ------------------------------------------------------------------ */

function PageTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title-row">
      <div>
        <span className="section-kicker">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <div className="title-actions">{action}</div>}
    </div>
  );
}

function PanelHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function IconForStat({ index }: { index: number }) {
  const icons = [Package, Users, Building2, Boxes];
  const Icon = icons[index] || Package;
  return <Icon size={18} />;
}

/* ------------------------------------------------------------------ *
 * Overview
 * ------------------------------------------------------------------ */

function Overview({
  role,
  products,
  suppliers,
  orders,
  lowStock,
  name,
  notify,
  go,
}: {
  role: UserRole;
  products: Product[];
  suppliers: Supplier[];
  orders: any[];
  lowStock: Product[];
  name: string;
  notify: (v: string) => void;
  go: (path: string) => void;
}) {
  const greeting = name.trim().split(/\s+/)[0] || "there";
  const title = `Good morning, ${greeting} 👋`;

  const inventoryValue = products.reduce(
    (total, product) =>
      total + (Number(product.price) || 0) * (Number(product.quantity) || 0),
    0,
  );
  const availableStock = products.reduce(
    (total, product) => total + (Number(product.quantity) || 0),
    0,
  );
  const outOfStock = products.filter(
    (product) => (product.quantity ?? 0) === 0,
  ).length;

  const byStatus = (status: string) =>
    orders.filter((order) => order.status === status).length;

  const metrics: string[][] =
    role === "supplier"
      ? [
          ["Assigned orders", pad(orders.length), "", "Orders currently with you"],
          ["Pending orders", pad(byStatus("pending")), "", "Awaiting your confirmation"],
          ["Approved", pad(byStatus("approved")), "", "Ready to prepare"],
          ["Shipped", pad(byStatus("shipped")), "", "On the way to customers"],
          ["Delivered", pad(byStatus("delivered")), "", "Completed this month"],
        ]
      : role === "warehouse_manager"
        ? [
            ["Total products", products.length.toLocaleString(), "", "Across all locations"],
            ["Available stock", availableStock.toLocaleString(), "", "Units ready to move"],
            ["Low stock products", pad(lowStock.length), "", "Need your attention"],
            ["Out of stock", pad(outOfStock), "", "Restock required"],
            ["Pending purchase orders", pad(byStatus("pending")), "", "Awaiting approval"],
          ]
        : [
            ["Total products", products.length.toLocaleString(), "", "Across all locations"],
            ["Total suppliers", suppliers.length.toLocaleString(), "", "Trusted partners"],
            ["Inventory value", compactMoney(inventoryValue), "", "Across all locations"],
            ["Total orders", orders.length.toLocaleString(), "", "All time"],
            ["Low stock items", pad(lowStock.length), "", "Need your attention"],
            ["Pending orders", pad(byStatus("pending")), "", "Awaiting approval"],
          ];

  return (
    <>
      <PageTitle
        eyebrow={`${
          role === "admin"
            ? "ADMINISTRATOR"
            : role === "supplier"
              ? "SUPPLIER PORTAL"
              : "WAREHOUSE OPERATIONS"
        } · OVERVIEW`}
        title={title}
        subtitle={
          role === "supplier"
            ? "Here’s what’s happening with your orders today."
            : "Here’s what’s happening across your inventory today."
        }
        action={
          <>
            <button
              className="button secondary"
              onClick={() =>
                notify(
                  "Report export is ready to connect to the reporting service.",
                )
              }
            >
              <ArrowDownToLine size={16} /> Export report
            </button>
            <button
              className="button primary"
              onClick={() =>
                go(role === "admin" ? "/users" : "/orders")
              }
            >
              <Plus size={17} />
              {role === "supplier"
                ? "View orders"
                : role === "admin"
                  ? "Add team member"
                  : "Create purchase order"}
            </button>
          </>
        }
      />
      <div className="stats-grid">
        {metrics.map((m, i) => (
          <div className="stat-card" key={m[0]}>
            <div className="stat-head">
              <span>{m[0]}</span>
              <span className={`stat-icon stat-icon-${i % 4}`}>
                <IconForStat index={i % 4} />
              </span>
            </div>
            <div className="stat-value">{m[1]}</div>
            <div className="stat-foot">
              {m[2] && <Change value={m[2]} down={m[2].startsWith("-")} />}
              <span>{m[3]}</span>
            </div>
          </div>
        ))}
      </div>
      {role === "supplier" ? (
        <>
          <div className="mid-grid supplier-grid">
            <div className="panel orders-panel">
              <PanelHeading
                title="Recent assigned orders"
                subtitle="Stay up to date with your latest work"
                action={
                  <button className="text-link" onClick={() => go("/orders")}>
                    View all <ArrowRight size={14} />
                  </button>
                }
              />
              <OrderTable
                compact
                orders={orders.slice(0, 5)}
                suppliers={suppliers}
              />
            </div>
            <div className="panel chart-panel">
              <PanelHeading
                title="Order trend"
                subtitle="Orders assigned to you each month"
              />
              <OrderTrendChart />
            </div>
          </div>
          <div className="panel notice-panel">
            <PanelHeading
              title="Latest updates"
              subtitle="A quick look at what needs your attention"
            />
            <OrderStatusList orders={orders} suppliers={suppliers} />
          </div>
        </>
      ) : (
        <>
          <div className="mid-grid">
            <div className="panel chart-panel">
              <PanelHeading
                title={role === "admin" ? "Inventory overview" : "Stock movement"}
                subtitle="Stock levels against reorder thresholds"
                action={
                  <button
                    className="select-btn"
                    onClick={() =>
                      notify(
                        "Chart range menu will be connected to the reporting module.",
                      )
                    }
                  >
                    Top products <ChevronDown size={14} />
                  </button>
                }
              />
              <div className="chart-legend">
                <span>
                  <i className="legend-blue" />
                  In stock
                </span>
                <span>
                  <i className="legend-light" />
                  Reorder at
                </span>
                <b>
                  {availableStock.toLocaleString()}{" "}
                  <small>units on hand</small>
                </b>
              </div>
              <InventoryChart />
            </div>
            <div className="panel activity-panel">
              <PanelHeading
                title="Recent activity"
                subtitle="Latest stock movements from your team"
                action={
                  <button
                    className="more-btn"
                    onClick={() => go("/inventory")}
                  >
                    •••
                  </button>
                }
              />
              <ActivityList />
            </div>
          </div>
          <div className="mid-grid">
            <div className="panel chart-panel">
              <PanelHeading
                title="Order trend"
                subtitle="Purchase orders created each month"
              />
              <OrderTrendChart />
            </div>
            <div className="panel chart-panel">
              <PanelHeading
                title="Stock by category"
                subtitle="Share of units on hand"
              />
              <CategoryChart />
            </div>
          </div>
          <div className="bottom-grid">
            <div className="panel orders-panel">
              <PanelHeading
                title={role === "admin" ? "Recent orders" : "Recent purchase orders"}
                subtitle="Track the latest supplier orders"
                action={
                  <button className="text-link" onClick={() => go("/orders")}>
                    View all <ArrowRight size={14} />
                  </button>
                }
              />
              <OrderTable
                compact
                orders={orders.slice(0, 5)}
                suppliers={suppliers}
              />
            </div>
            <div className="panel alerts-panel">
              <PanelHeading
                title="Stock alerts"
                subtitle="Products that need attention"
                action={
                  <button className="text-link" onClick={() => go("/inventory")}>
                    View inventory <ArrowRight size={14} />
                  </button>
                }
              />
              <AlertList products={lowStock} notify={notify} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ActivityList() {
  const movements = useStockMovements();
  const colors = ["blue", "purple", "orange", "green"];

  if (!movements.length)
    return (
      <div className="activity-list">
        <div className="activity-row">
          <div className="activity-copy">
            <p>No stock movements recorded yet.</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="activity-list">
      {movements.slice(0, 4).map((movement, index) => (
        <div className="activity-row" key={movement.id}>
          <div className={`activity-avatar ${colors[index % colors.length]}`}>
            {initials(movement.productName || "ST")}
          </div>
          <div className="activity-copy">
            <p>
              <b>{movement.productName}</b>{" "}
              {movement.change >= 0 ? "received" : "released"}{" "}
              {Math.abs(movement.change)} units
            </p>
            <small>
              {movement.reason} · {movement.previousQuantity} →{" "}
              {movement.newQuantity}
            </small>
          </div>
          <time>{relativeTime(movement.timestamp)}</time>
        </div>
      ))}
    </div>
  );
}

function AlertList({
  products,
  notify,
}: {
  products: Product[];
  notify: (v: string) => void;
}) {
  if (!products.length)
    return (
      <div className="alert-list">
        <div className="alert-row">
          <div className="alert-copy">
            <b>All stock is healthy</b>
            <small>No products are below their reorder point</small>
          </div>
        </div>
      </div>
    );

  return (
    <div className="alert-list">
      {products.slice(0, 4).map((product) => (
        <div className="alert-row" key={product.id}>
          <div
            className={`alert-symbol ${product.quantity === 0 ? "critical" : ""}`}
          >
            <AlertTriangle size={16} />
          </div>
          <div className="alert-copy">
            <b>{product.name}</b>
            <small>
              {product.quantity === 0
                ? "Out of stock"
                : `${product.quantity} units left`}{" "}
              · Reorder at {product.minStockThreshold}
            </small>
          </div>
          <button
            className="mini-link"
            title="Create restock request"
            onClick={() =>
              notify(
                `Create a purchase order for ${product.name} from the Orders page.`,
              )
            }
          >
            Restock
          </button>
        </div>
      ))}
    </div>
  );
}

function OrderStatusList({
  orders,
  suppliers,
}: {
  orders: any[];
  suppliers: Supplier[];
}) {
  const supplierName = (id: string) =>
    suppliers.find((supplier) => supplier.id === id)?.company || "Supplier";

  if (!orders.length)
    return (
      <div className="notice-list">
        <div className="notice-row">
          <div>
            <b>Nothing to review</b>
            <p>No orders are assigned to you right now.</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="notice-list">
      {orders.slice(0, 3).map((order) => (
        <div className="notice-row" key={order.id}>
          <div
            className={`notice-icon ${order.status === "delivered" ? "green" : "blue"}`}
          >
            {order.status === "delivered" ? (
              <Check size={17} />
            ) : (
              <ClipboardList size={17} />
            )}
          </div>
          <div>
            <b>Order #{String(order.id).slice(0, 8)}</b>
            <p>
              {supplierName(order.supplierId)} ·{" "}
              {order.items?.length ?? 0} items · {money(order.totalAmount)}
            </p>
            <small>{relativeTime(order.updatedAt || order.createdAt)}</small>
          </div>
          {order.status === "pending" && <span className="unread-dot" />}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

function OrderTable({
  compact = false,
  orders,
  suppliers,
  actions,
}: {
  compact?: boolean;
  orders: any[];
  suppliers: Supplier[];
  actions?: (order: any) => ReactNode;
}) {
  const supplierName = (id: string) =>
    suppliers.find((supplier) => supplier.id === id)?.company || "—";

  return (
    <div className="table-scroll">
      <table className="data-table order-table">
        <thead>
          <tr>
            <th>ORDER</th>
            <th>SUPPLIER</th>
            <th>ITEMS</th>
            {!compact && <th>TOTAL</th>}
            <th>STATUS</th>
            <th>DATE</th>
            {actions && <th />}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <b className="table-id">#{String(order.id).slice(0, 8)}</b>
              </td>
              <td>{supplierName(order.supplierId)}</td>
              <td>{order.items?.length ?? 0} items</td>
              {!compact && <td>{money(order.totalAmount)}</td>}
              <td>
                <span className={`status-pill ${statusClass(order.status)}`}>
                  <i />
                  {titleCase(order.status)}
                </span>
              </td>
              <td>{shortDate(order.createdAt)}</td>
              {actions && <td>{actions(order)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Status transitions each role is allowed to make. */
function nextStatuses(role: UserRole, status: string): string[] {
  if (role === "supplier") {
    if (status === "approved") return ["processing"];
    if (status === "processing") return ["shipped"];
    return [];
  }

  // admin + warehouse_manager
  if (status === "pending") return ["approved", "rejected"];
  if (status === "shipped") return ["delivered"];
  return [];
}

function OrdersContent({
  role,
  orders,
  suppliers,
  products,
  search,
  notify,
  currentUid,
}: {
  role: UserRole;
  orders: any[];
  suppliers: Supplier[];
  products: Product[];
  search: string;
  notify: (v: string) => void;
  currentUid: string;
}) {
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [localSearch, setLocalSearch] = useState("");
  const [busyId, setBusyId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const term = (search || localSearch).toLowerCase();

  const supplierName = (id: string) =>
    suppliers.find((supplier) => supplier.id === id)?.company || "";

  const shown = orders.filter((order) => {
    const matchesStatus =
      statusFilter === "All statuses" ||
      order.status === statusFilter.toLowerCase();
    const haystack =
      `${order.id} ${supplierName(order.supplierId)} ${order.status}`.toLowerCase();
    return matchesStatus && haystack.includes(term);
  });

  const byStatus = (status: string) =>
    orders.filter((order) => order.status === status).length;

  const advance = async (order: any, status: string) => {
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, status, order);
      notify(`Order #${String(order.id).slice(0, 8)} is now ${status}.`);
    } catch (error) {
      console.error("Order status update failed:", error);
      notify("Could not update the order. Check your access and try again.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="PROCUREMENT · ORDER TRACKING"
        title={role === "supplier" ? "My orders" : "Purchase orders"}
        subtitle={
          role === "supplier"
            ? "Orders assigned to your supplier account."
            : "Track purchase orders and supplier fulfillment."
        }
        action={
          role === "supplier" ? undefined : (
            <button className="button primary" onClick={() => setDialogOpen(true)}>
              <Plus size={17} /> New purchase order
            </button>
          )
        }
      />
      <div className="stats-grid compact-stats">
        <div className="stat-card">
          <div className="stat-head">
            <span>Pending</span>
            <span className="stat-icon stat-icon-2">
              <Clock3 size={18} />
            </span>
          </div>
          <div className="stat-value">{pad(byStatus("pending"))}</div>
          <div className="stat-foot">
            <span>Awaiting approval</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-head">
            <span>In transit</span>
            <span className="stat-icon stat-icon-0">
              <Truck size={18} />
            </span>
          </div>
          <div className="stat-value">
            {pad(byStatus("shipped") + byStatus("processing"))}
          </div>
          <div className="stat-foot">
            <span>Across {suppliers.length} suppliers</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-head">
            <span>Delivered</span>
            <span className="stat-icon stat-icon-1">
              <Check size={18} />
            </span>
          </div>
          <div className="stat-value">{pad(byStatus("delivered"))}</div>
          <div className="stat-foot">
            <span>Completed orders</span>
          </div>
        </div>
      </div>
      <div className="panel listing-panel">
        <div className="listing-toolbar">
          <div>
            <h3>{role === "supplier" ? "Assigned orders" : "All purchase orders"}</h3>
            <p>
              {role === "supplier"
                ? "Only orders assigned to your supplier account appear here."
                : "Recent purchase orders across suppliers"}
            </p>
          </div>
          <div className="table-tools">
            <label className="table-search">
              <Search size={16} />
              <input
                placeholder="Search orders"
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option>All statuses</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Processing</option>
              <option>Shipped</option>
              <option>Delivered</option>
              <option>Rejected</option>
            </select>
          </div>
        </div>
        <OrderTable
          orders={shown}
          suppliers={suppliers}
          actions={(order) => {
            const options = nextStatuses(role, order.status);
            if (!options.length)
              return <button className="row-menu">•••</button>;

            return (
              <div className="order-actions">
                {options.map((status) => (
                  <button
                    key={status}
                    className="mini-link"
                    disabled={busyId === order.id}
                    onClick={() => advance(order, status)}
                  >
                    {titleCase(status)}
                  </button>
                ))}
              </div>
            );
          }}
        />
        <div className="table-footer">
          <span>
            Showing <b>{shown.length}</b> of {orders.length} orders
          </span>
          <div>
            <button className="button secondary small-button" disabled>
              Previous
            </button>
            <button className="button secondary small-button" disabled>
              Next
            </button>
          </div>
        </div>
      </div>
      <div className="integration-note">
        <ClipboardList size={18} />
        <span>
          <b>Order workflow</b>
          <small>
            Status changes run through orderService and notify the supplier,
            requester and admins. Delivering an order restocks its products and
            records a stock movement.
          </small>
        </span>
      </div>

      {dialogOpen && (
        <NewOrderDialog
          suppliers={suppliers}
          products={products}
          currentUid={currentUid}
          notify={notify}
          close={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}

function NewOrderDialog({
  suppliers,
  products,
  currentUid,
  notify,
  close,
}: {
  suppliers: Supplier[];
  products: Product[];
  currentUid: string;
  notify: (v: string) => void;
  close: () => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const supplierProducts = supplierId
    ? products.filter((product) => product.supplierId === supplierId)
    : products;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const product = products.find((item) => item.id === productId);
    const amount = Number(quantity);

    if (!supplierId) return setFormError("Choose a supplier for this order.");
    if (!product) return setFormError("Choose a product to order.");
    if (!Number.isInteger(amount) || amount < 1)
      return setFormError("Enter a quantity of 1 or more.");

    setSubmitting(true);
    try {
      await createOrder({
        supplierId,
        createdBy: currentUid,
        items: [
          {
            productId: product.id,
            productName: product.name,
            quantity: amount,
            unitPrice: Number(product.price) || 0,
          },
        ],
        totalAmount: (Number(product.price) || 0) * amount,
      });
      notify("Purchase order created and the supplier was notified.");
      close();
    } catch (error) {
      console.error("Order creation failed:", error);
      setFormError("The order could not be created. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="provision-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) close();
      }}
    >
      <section
        className="provision-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-order-title"
      >
        <div className="provision-heading">
          <div>
            <span className="section-kicker">PROCUREMENT</span>
            <h2 id="new-order-title">New purchase order</h2>
            <p>Raise an order against one of your suppliers.</p>
          </div>
          <button
            className="icon-btn"
            aria-label="Close"
            disabled={submitting}
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        {formError && (
          <div className="provision-feedback error" role="alert">
            {formError}
          </div>
        )}
        <form onSubmit={submit} noValidate>
          <label>
            Supplier
            <select
              value={supplierId}
              onChange={(event) => {
                setSupplierId(event.target.value);
                setProductId("");
              }}
              disabled={submitting}
            >
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.company}
                </option>
              ))}
            </select>
          </label>
          <label>
            Product
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              disabled={submitting}
            >
              <option value="">Select a product</option>
              {supplierProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.sku}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              disabled={submitting}
            />
          </label>
          <div className="provision-actions">
            <button
              type="button"
              className="button secondary"
              disabled={submitting}
              onClick={close}
            >
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="button-spinner" />
                  Creating…
                </>
              ) : (
                "Create order"
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

function NoticeContent({
  notifications,
  notify,
}: {
  notifications: any[];
  notify: (v: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const read = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      console.error("Marking notification read failed:", error);
      notify("Could not update that notification.");
    }
  };

  const readAll = async () => {
    setBusy(true);
    try {
      await Promise.all(
        notifications.filter((item) => !item.read).map((item) => markAsRead(item.id)),
      );
    } catch (error) {
      console.error("Marking notifications read failed:", error);
      notify("Could not mark every notification as read.");
    } finally {
      setBusy(false);
    }
  };

  const iconFor = (type: string) =>
    type === "low_stock" ? (
      <AlertTriangle size={17} />
    ) : type === "order_update" ? (
      <Check size={17} />
    ) : (
      <ClipboardList size={17} />
    );

  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE · UPDATES"
        title="Notifications"
        subtitle="Stay up to date with your inventory and orders."
      />
      <div className="panel listing-panel">
        <div className="listing-toolbar">
          <div>
            <h3>Recent notifications</h3>
            <p>Your latest updates and reminders</p>
          </div>
          <button className="text-link" onClick={readAll} disabled={busy}>
            Mark all as read
          </button>
        </div>
        <div className="notice-list">
          {notifications.length === 0 && (
            <div className="notice-row">
              <div>
                <b>You’re all caught up</b>
                <p>No notifications yet.</p>
              </div>
            </div>
          )}
          {notifications.map((item) => (
            <div
              className={`notice-row ${item.read ? "" : "unread"}`}
              key={item.id}
            >
              <div
                className={`notice-icon ${item.type === "low_stock" ? "blue" : "green"}`}
              >
                {iconFor(item.type)}
              </div>
              <div>
                <b>
                  {item.type === "low_stock"
                    ? "Low stock alert"
                    : item.type === "new_order"
                      ? "New order assigned"
                      : "Order update"}
                </b>
                <p>{item.message}</p>
                <small>{relativeTime(item.createdAt)}</small>
              </div>
              {item.read ? null : (
                <>
                  <span className="unread-dot" />
                  <button className="mini-link" onClick={() => read(item.id)}>
                    Mark read
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

function SettingsContent({
  name,
  email,
  role,
  notify,
}: {
  name: string;
  email: string;
  role: UserRole;
  notify: (v: string) => void;
}) {
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE · PREFERENCES"
        title={role === "supplier" ? "Your profile" : "Settings"}
        subtitle="Manage your personal information and workspace preferences."
      />
      <div className="settings-grid">
        <div className="panel settings-panel">
          <div className="settings-heading">
            <h3>Personal information</h3>
            <p>Your profile details and account access</p>
          </div>
          <div className="profile-summary">
            <div className="avatar avatar-large">{initials(name)}</div>
            <div>
              <b>{name}</b>
              <small>{ROLE_LABELS[role]}</small>
            </div>
            <button
              className="button secondary small-button"
              onClick={() =>
                notify("Profile photo updates are not connected in this build.")
              }
            >
              Change photo
            </button>
          </div>
          <div className="settings-fields">
            <label>
              Full name
              <input value={name} readOnly />
            </label>
            <label>
              Email address
              <input value={email} readOnly />
            </label>
            <label>
              Role
              <input value={ROLE_LABELS[role]} readOnly />
            </label>
          </div>
          <div className="settings-actions">
            <small>
              Role and identity details are managed through your administrator.
            </small>
          </div>
        </div>
        <div className="panel settings-panel">
          <div className="settings-heading">
            <h3>Notifications</h3>
            <p>Choose which updates you receive</p>
          </div>
          {["Low stock alerts", "Purchase order updates", "Team activity digest"].map(
            (v, i) => (
              <label className="toggle-row" key={v}>
                <span>
                  <b>{v}</b>
                  <small>
                    {
                      [
                        "Get alerted when stock falls below reorder level.",
                        "Updates when orders are approved or shipped.",
                        "A daily summary of workspace activity.",
                      ][i]
                    }
                  </small>
                </span>
                <input type="checkbox" defaultChecked={i !== 2} />
              </label>
            ),
          )}
        </div>
      </div>
      <div className="integration-note">
        <BriefcaseBusiness size={18} />
        <span>
          <b>Connected workspace</b>
          <small>
            Inventory, suppliers, orders and notifications all read and write
            through the shared Firebase services.
          </small>
        </span>
      </div>
    </>
  );
}
