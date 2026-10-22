export function safeReturnPath(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /^\/(login|register)(?:[/?#]|$)/.test(value)
  )
    return "/";
  return value;
}
