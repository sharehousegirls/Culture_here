export function safeText(value, limit = 180, secret = "") {
  let text = String(value ?? "").replace(/[\r\n\t]+/g, " ").trim();
  if (secret) text = text.replaceAll(secret, "[REDACTED]");
  const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 180;
  if (max === 0) return "";
  if (text.length <= max) return text;
  if (max === 1) return "…";
  return text.slice(0, max - 1) + "…";
}
