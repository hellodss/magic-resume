import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAIConfigStorage,
  createResumeStorage,
} from "./desktopStorage";

const createMemoryLocalStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("desktop-aware storage", () => {
  it("uses localStorage in the web app", async () => {
    const localStorage = createMemoryLocalStorage();
    vi.stubGlobal("window", { localStorage });

    const storage = createResumeStorage();
    await storage.setItem("resume-storage", "resume-value");

    expect(await storage.getItem("resume-storage")).toBe("resume-value");
  });

  it("migrates an existing browser value into desktop storage", async () => {
    const localStorage = createMemoryLocalStorage();
    localStorage.setItem("resume-storage", "legacy-value");
    let desktopValue: string | null = null;

    vi.stubGlobal("window", {
      localStorage,
      magicResumeDesktop: {
        resumeStorage: {
          getItem: async () => desktopValue,
          setItem: async (value: string) => {
            desktopValue = value;
          },
          removeItem: async () => {
            desktopValue = null;
          },
        },
      },
    });

    const storage = createResumeStorage();
    expect(await storage.getItem("resume-storage")).toBe("legacy-value");
    expect(desktopValue).toBe("legacy-value");
  });

  it("keeps AI configuration in its dedicated desktop storage area", async () => {
    const localStorage = createMemoryLocalStorage();
    let encryptedAreaValue: string | null = null;

    vi.stubGlobal("window", {
      localStorage,
      magicResumeDesktop: {
        aiConfigStorage: {
          getItem: async () => encryptedAreaValue,
          setItem: async (value: string) => {
            encryptedAreaValue = value;
          },
          removeItem: async () => {
            encryptedAreaValue = null;
          },
        },
      },
    });

    const storage = createAIConfigStorage();
    await storage.setItem("ai-config-storage", "secret-value");

    expect(encryptedAreaValue).toBe("secret-value");
    expect(localStorage.getItem("ai-config-storage")).toBeNull();
  });
});
