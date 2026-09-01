const WINDOWS_RESERVED_NAME =
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export function toResumeFileName(title) {
  let safeTitle = String(title ?? "")
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");

  if (!safeTitle) safeTitle = "未命名简历";
  if (WINDOWS_RESERVED_NAME.test(safeTitle)) safeTitle = `_${safeTitle}`;

  safeTitle = Array.from(safeTitle).slice(0, 100).join("");
  return `${safeTitle}.json`;
}
