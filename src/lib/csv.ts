// Quote a CSV cell and neutralise spreadsheet formulas (=, +, -, @, tab, CR).
export function csvCell(v: unknown): string {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
