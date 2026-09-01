import { describe, expect, it } from "vitest";
import { normalizeRichTextContent } from "./richText";

describe("normalizeRichTextContent", () => {
  it("escapes plain text", () => {
    expect(normalizeRichTextContent("a < b\nnext")).toBe(
      "a &lt; b<br />next"
    );
  });

  it("removes executable HTML while preserving formatting", () => {
    const result = normalizeRichTextContent(
      '<p onclick="alert(1)"><strong>Safe</strong><img src=x onerror="alert(1)"></p>'
    );

    expect(result).toContain("<strong>Safe</strong>");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("<img");
  });

  it("removes unsafe link protocols", () => {
    const result = normalizeRichTextContent(
      '<a href="javascript:alert(1)">Open</a>'
    );

    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("<a");
    expect(result).toContain("Open");
  });
});
