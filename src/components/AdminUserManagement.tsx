import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Check,
  Clock3,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import type { UserProfile, UserRole } from "../types/ui";

interface AdminUserManagementProps {
  search: string;
  setSearch: (value: string) => void;
  notify: (message: string) => void;
}

type ProvisionableRole = Extract<UserRole, "warehouse_manager" | "supplier">;

const roleChoices: { value: ProvisionableRole; label: string }[] = [
  { value: "warehouse_manager", label: "Warehouse Manager" },
  { value: "supplier", label: "Supplier" },
];

function isRole(value: unknown): value is UserRole {
  return (
    value === "admin" || value === "warehouse_manager" || value === "supplier"
  );
}

function safeErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (code.endsWith("unauthenticated"))
    return "Your session has expired. Sign in again and retry.";
  if (code.endsWith("permission-denied"))
    return "Only an active Admin can provision accounts.";
  if (code.endsWith("not-found"))
    return "No Firebase Authentication account was found for that UID.";
  if (code.endsWith("already-exists"))
    return "A user profile already exists for this account.";
  if (code.endsWith("invalid-argument"))
    return "The backend rejected one or more fields. Review the form and try again.";
  return "The account could not be provisioned. Please try again.";
}

/** Reads the Firestore `users` collection into the admin table shape. */
async function listUserProfiles(): Promise<UserProfile[]> {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs.flatMap((document) => {
    const data = document.data();
    if (!isRole(data.role)) return [];

    return [
      {
        uid: document.id,
        fullName: typeof data.name === "string" ? data.name : "—",
        email: typeof data.email === "string" ? data.email : "—",
        role: data.role,
        status: data.status === "inactive" ? "inactive" : "active",
        ...(typeof data.company === "string" ? { company: data.company } : {}),
        ...(data.createdAt && typeof data.createdAt.toDate === "function"
          ? { createdAt: data.createdAt.toDate().toISOString() }
          : {}),
      } as UserProfile,
    ];
  });
}

export function AdminUserManagement({
  search,
  setSearch,
  notify,
}: AdminUserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [role, setRole] = useState("All roles");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uid, setUid] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] =
    useState<ProvisionableRole>("warehouse_manager");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const submittingRef = useRef(false);

  const refreshUsers = async () => setUsers(await listUserProfiles());

  useEffect(() => {
    let mounted = true;
    setLoadingList(true);
    listUserProfiles()
      .then((profiles) => {
        if (mounted) setUsers(profiles);
      })
      .catch(() => {
        if (mounted)
          notify(
            "Unable to load user profiles. Check your connection and Admin access.",
          );
      })
      .finally(() => {
        if (mounted) setLoadingList(false);
      });
    return () => {
      mounted = false;
    };
  }, [notify]);

  const shown = users.filter(
    (user) =>
      (role === "All roles" || user.role === role) &&
      `${user.fullName} ${user.email} ${user.role}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const activeCount = users.filter((user) => user.status === "active").length;

  /** Writes the new role straight to users/{uid}. */
  const changeRole = async (target: UserProfile, nextRole: UserRole) => {
    if (target.role === nextRole) return;
    const previous = users;
    setUsers((current) =>
      current.map((user) =>
        user.uid === target.uid ? { ...user, role: nextRole } : user,
      ),
    );
    try {
      await updateDoc(doc(db, "users", target.uid), { role: nextRole });
      notify(`${target.fullName} is now a ${nextRole.replace("_", " ")}.`);
    } catch {
      setUsers(previous);
      notify("Role update failed. Only an admin can change roles.");
    }
  };

  const toggleUser = async (target: UserProfile) => {
    const nextStatus = target.status === "active" ? "inactive" : "active";
    const previous = users;
    setUsers((current) =>
      current.map((user) =>
        user.uid === target.uid ? { ...user, status: nextStatus } : user,
      ),
    );
    try {
      await updateDoc(doc(db, "users", target.uid), { status: nextStatus });
      notify(
        `${target.fullName} was ${nextStatus === "active" ? "activated" : "deactivated"}.`,
      );
    } catch {
      setUsers(previous);
      notify("Account status change failed. Only an admin can do this.");
    }
  };

  const openDialog = () => {
    setUid("");
    setFullName("");
    setEmail("");
    setTargetRole("warehouse_manager");
    setCompany("");
    setFormError("");
    setFormSuccess("");
    setDialogOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const cleanUid = uid.trim();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanCompany = company.trim();

    if (!cleanUid || cleanUid.length > 128 || cleanUid !== uid) {
      setFormError(
        "Enter a valid Firebase Authentication UID (up to 128 characters, without surrounding spaces).",
      );
      return;
    }
    if (
      !cleanName ||
      cleanName.length > 120 ||
      /[\u0000-\u001f\u007f]/.test(cleanName)
    ) {
      setFormError("Enter a valid full name between 1 and 120 characters.");
      return;
    }
    if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setFormError("Enter the email address on the account.");
      return;
    }
    if (
      cleanCompany &&
      (cleanCompany.length > 120 || /[\u0000-\u001f\u007f]/.test(cleanCompany))
    ) {
      setFormError("Company must be 120 characters or fewer.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFormError("");
    setFormSuccess("");
    try {
      const ref = doc(db, "users", cleanUid);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        setFormError("A user profile already exists for this account.");
        return;
      }

      await setDoc(ref, {
        name: cleanName,
        email: cleanEmail,
        role: targetRole,
        status: "active",
        ...(cleanCompany ? { company: cleanCompany } : {}),
        createdAt: serverTimestamp(),
      });

      setFormSuccess(
        `${targetRole === "supplier" ? "Supplier" : "Warehouse Manager"} profile provisioned successfully.`,
      );
      try {
        await refreshUsers();
      } catch {
        setFormSuccess(
          "Profile created successfully, but the user list could not refresh. Close and reopen this screen to retry.",
        );
      }
    } catch (error) {
      setFormError(safeErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRATION · TEAM ACCESS"
        title="User management"
        subtitle="Manage your team, roles, and access to Stockwise."
        action={
          <button className="button primary" onClick={openDialog}>
            <Plus size={17} /> Invite user
          </button>
        }
      />
      <div className="user-metrics">
        <div>
          <Users size={17} />
          <span>All users</span>
          <b>{users.length}</b>
        </div>
        <div>
          <ShieldCheck size={17} />
          <span>Active users</span>
          <b>{activeCount}</b>
        </div>
        <div>
          <Clock3 size={17} />
          <span>Pending invites</span>
          <b>0</b>
        </div>
      </div>
      <div className="panel listing-panel">
        <div className="listing-toolbar">
          <div>
            <h3>Team members</h3>
            <p>Firebase user profiles</p>
          </div>
          <div className="table-tools">
            <label className="table-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users"
              />
            </label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option>All roles</option>
              <option value="admin">Administrator</option>
              <option value="warehouse_manager">Warehouse manager</option>
              <option value="supplier">Supplier</option>
            </select>
            <button
              className="button secondary filter-button"
              onClick={() =>
                notify(
                  "Additional filters can be supplied by the user management module.",
                )
              }
            >
              <SlidersHorizontal size={16} /> Filter
            </button>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table user-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" aria-label="Select all users" />
                </th>
                <th>NAME</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>COMPANY</th>
                <th>LAST ACTIVE</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((user) => (
                <tr key={user.uid}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${user.fullName}`}
                    />
                  </td>
                  <td>
                    <div className="person-cell">
                      <div className="avatar avatar-small">
                        {user.fullName
                          .split(" ")
                          .map((word) => word[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <span>
                        <b>{user.fullName}</b>
                        <small>{user.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <select
                      className="role-select"
                      aria-label={`Role for ${user.fullName}`}
                      value={user.role}
                      onChange={(event) =>
                        changeRole(user, event.target.value as UserRole)
                      }
                    >
                      <option value="admin">Administrator</option>
                      <option value="warehouse_manager">
                        Warehouse Manager
                      </option>
                      <option value="supplier">Supplier</option>
                    </select>
                  </td>
                  <td>
                    <span className={`status-pill ${user.status}`}>
                      <i />
                      {user.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{user.company || "—"}</td>
                  <td>
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <button
                      className="row-menu"
                      onClick={() => toggleUser(user)}
                      title={
                        user.status === "active"
                          ? "Deactivate user"
                          : "Activate user"
                      }
                    >
                      •••
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loadingList && (
            <div className="user-list-message">Loading user profiles…</div>
          )}
          {!loadingList && shown.length === 0 && (
            <div className="user-list-message">
              {users.length
                ? "No users match these filters."
                : "No user profiles found."}
            </div>
          )}
        </div>
        <div className="table-footer">
          <span>
            Showing <b>{shown.length}</b> users
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
        <ShieldCheck size={18} />
        <span>
          <b>Role changes are protected</b>
          <small>
            Writes go to the Firestore users collection and are enforced by your
            security rules. Only an admin account can change a role.
          </small>
        </span>
      </div>

      {dialogOpen && (
        <div
          className="provision-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting)
              setDialogOpen(false);
          }}
        >
          <section
            className="provision-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="provision-title"
          >
            <div className="provision-heading">
              <div>
                <span className="section-kicker">TRUSTED USER PROVISIONING</span>
                <h2 id="provision-title">Add a team member</h2>
                <p>Provision an existing Firebase Authentication account.</p>
              </div>
              <button
                className="icon-btn"
                aria-label="Close"
                disabled={submitting}
                onClick={() => setDialogOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            {formSuccess && (
              <div className="provision-feedback success" role="status">
                <Check size={16} />
                {formSuccess}
              </div>
            )}
            {formError && (
              <div className="provision-feedback error" role="alert">
                {formError}
              </div>
            )}
            <form onSubmit={submit} noValidate>
              <label>
                Firebase Authentication UID
                <input
                  autoComplete="off"
                  value={uid}
                  onChange={(event) => setUid(event.target.value)}
                  maxLength={128}
                  required
                  placeholder="Paste the existing account UID"
                  disabled={submitting}
                />
                <small>
                  Find the UID in Firebase Console → Authentication → Users. The
                  account must already exist.
                </small>
              </label>
              <label>
                Full name
                <input
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  maxLength={120}
                  required
                  placeholder="Full name"
                  disabled={submitting}
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={160}
                  required
                  placeholder="name@company.com"
                  disabled={submitting}
                />
              </label>
              <label>
                Role
                <select
                  value={targetRole}
                  onChange={(event) =>
                    setTargetRole(event.target.value as ProvisionableRole)
                  }
                  disabled={submitting}
                >
                  {roleChoices.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Company <span className="optional-label">Optional</span>
                <input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  maxLength={120}
                  placeholder="Company or supplier name"
                  disabled={submitting}
                />
              </label>
              <div className="provision-actions">
                <button
                  type="button"
                  className="button secondary"
                  disabled={submitting}
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="button-spinner" />
                      Provisioning…
                    </>
                  ) : (
                    "Provision user"
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function PageTitle({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action: ReactNode;
}) {
  return (
    <div className="page-title-row">
      <div>
        <span className="section-kicker">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="title-actions">{action}</div>
    </div>
  );
}
