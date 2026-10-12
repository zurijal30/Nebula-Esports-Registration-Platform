export function exactGameConfirmation(title: string, value: string) {
  return title.length > 0 && value === title;
}
export function validateGameReference(value: string) {
  return value === "" || value === "solo" || value === "team";
}
export function canDeleteGame(title: string, confirmation: string, references: number) {
  return references === 0 && exactGameConfirmation(title, confirmation);
}
