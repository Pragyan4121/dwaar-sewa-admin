/*
|--------------------------------------------------------------------------
| Admin session helpers
|--------------------------------------------------------------------------
|
| The admin JWT itself is stored as an httpOnly cookie set by the backend
| (see /api/auth/admin/login) — it is never readable from JavaScript, so
| it never touches localStorage and can't be exfiltrated by an XSS bug.
|
| What DOES live in localStorage is a small, non-sensitive snapshot of
| the logged-in admin (name/role/active flag) purely so the UI can decide
| which screen to render without an extra round trip on every navigation.
| It is a UX hint, not a security boundary — every real API call is still
| authorized by the server using the httpOnly cookie regardless of what
| this snapshot says.
|
| This file is the ONLY place that should touch "adminUser" in
| localStorage. Every component should import from here instead of
| calling localStorage directly, so session handling can't drift between
| pages.
|--------------------------------------------------------------------------
*/

const ADMIN_USER_STORAGE_KEY = "adminUser";

export interface AdminUser {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  role_id: number;
  role_name: string;
  is_active: boolean;
}

export function getAdminUser(): AdminUser | null {
  const storedUser = localStorage.getItem(ADMIN_USER_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AdminUser;
  } catch {
    localStorage.removeItem(ADMIN_USER_STORAGE_KEY);

    return null;
  }
}

export function setAdminUser(user: AdminUser): void {
  localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
  // Kept for one release cycle so admins who log in on an old build and
  // upgrade mid-session don't end up with a stale token stuck in
  // localStorage forever.
  localStorage.removeItem("adminToken");
}

export function hasValidAdminSession(): boolean {
  const adminUser = getAdminUser();

  return adminUser?.role_name === "admin" && adminUser?.is_active === true;
}
