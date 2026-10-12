export type AccountRole = "player" | "admin";
const destinations = new Set(["/dashboard", "/admin", "/update-password"]);

/** Exact local destinations prevent protocol-relative, encoded and nested redirects. */
export function safeAuthDestination(value: unknown, fallback = "/dashboard") {
  return typeof value === "string" && (destinations.has(value) || value === "/dashboard/registrations"
    || /^\/dashboard\/registrations\/[0-9a-f-]{36}\/edit$/.test(value)
    || /^\/tournaments\/live\/[a-z0-9]+(?:-[a-z0-9]+)*\/register\/[0-9a-f-]{36}$/.test(value)) ? value : fallback;
}

export function canAccessAdmin(userId: string | undefined, profile: { id: string; role: string } | null) {
  return Boolean(userId && profile?.id === userId && profile.role === "admin");
}

export function authErrorMessage(code?: string) {
  switch (code) {
    case "invalid_credentials": return "The email or password is incorrect. Please try again.";
    case "email_not_confirmed": return "Confirm your email before signing in. Use the link in your confirmation email.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit": return "Too many attempts. Please wait a few minutes and try again.";
    case "weak_password": return "Choose a stronger password that meets this project’s password requirements.";
    case "signup_disabled": return "New account creation is currently unavailable.";
    case "user_already_exists": return "Unable to create this account. Try signing in or resetting your password.";
    default: return "Account services are temporarily unavailable. Please try again shortly.";
  }
}

export function validateEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function validatePassword(password: string, confirmation: string) {
  if (password.length < 10 || password.length > 128) return "Use a password between 10 and 128 characters.";
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}
export function validateProfile(displayName: string, contactPhone: string) {
  if (displayName.length < 2 || displayName.length > 80) return "Use a display name between 2 and 80 characters.";
  if (contactPhone && !/^[+\d ()-]{7,30}$/.test(contactPhone)) return "Enter a valid contact phone number, or leave it blank.";
  return null;
}
