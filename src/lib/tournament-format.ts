export const tournamentTimezone = "Asia/Colombo";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: tournamentTimezone, day: "numeric", month: "short", year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: tournamentTimezone, hour: "numeric", minute: "2-digit", hour12: true,
});

export function formatDate(value: string) { return dateFormatter.format(new Date(value)); }
export function formatDateTime(value: string) {
  return `${formatDate(value)} · ${timeFormatter.format(new Date(value))}`;
}
export function formatEventDates(startsAt: string, endsAt: string) {
  const first = formatDate(startsAt);
  const last = formatDate(endsAt);
  return first === last ? first : `${first} – ${last}`;
}
export function formatFee(fee: number | undefined, type: "solo" | "team") {
  if (!fee) return "Free entry";
  return `LKR ${new Intl.NumberFormat("en-GB").format(fee)} / ${type === "team" ? "team" : "player"}`;
}
