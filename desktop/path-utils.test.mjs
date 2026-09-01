import { describe, expect, it } from "vitest";
import { toResumeFileName } from "./path-utils.mjs";

describe("desktop resume filenames", () => {
  it("preserves Chinese titles", () => {
    expect(toResumeFileName("张三的中文简历")).toBe("张三的中文简历.json");
  });

  it("replaces Windows-invalid filename characters", () => {
    expect(toResumeFileName('前端/开发:简历*?')).toBe("前端_开发_简历__.json");
  });

  it("protects Windows reserved names and empty titles", () => {
    expect(toResumeFileName("CON")).toBe("_CON.json");
    expect(toResumeFileName("   ... ")).toBe("未命名简历.json");
  });
});
