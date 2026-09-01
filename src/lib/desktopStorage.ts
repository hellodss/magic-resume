import type { StateStorage } from "zustand/middleware";

type DesktopStorageArea = {
  getItem: () => Promise<string | null>;
  setItem: (value: string) => Promise<void>;
  removeItem: () => Promise<void>;
};

const getLocalStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

const createLocalStorageFallback = (): StateStorage => ({
  getItem: (name) => getLocalStorage()?.getItem(name) ?? null,
  setItem: (name, value) => {
    getLocalStorage()?.setItem(name, value);
  },
  removeItem: (name) => {
    getLocalStorage()?.removeItem(name);
  },
});

const createDesktopAwareStorage = (
  getDesktopArea: () => DesktopStorageArea | undefined,
): StateStorage => {
  const fallback = createLocalStorageFallback();

  return {
    getItem: async (name) => {
      const desktopArea = getDesktopArea();
      if (!desktopArea) return fallback.getItem(name);

      const desktopValue = await desktopArea.getItem();
      if (desktopValue !== null) return desktopValue;

      const legacyValue = await fallback.getItem(name);
      if (legacyValue !== null) {
        await desktopArea.setItem(legacyValue);
      }
      return legacyValue;
    },
    setItem: async (name, value) => {
      const desktopArea = getDesktopArea();
      if (desktopArea) {
        await desktopArea.setItem(value);
        return;
      }
      await fallback.setItem(name, value);
    },
    removeItem: async (name) => {
      const desktopArea = getDesktopArea();
      if (desktopArea) {
        await desktopArea.removeItem();
      }
      await fallback.removeItem(name);
    },
  };
};

export const createResumeStorage = () =>
  createDesktopAwareStorage(
    () =>
      typeof window === "undefined"
        ? undefined
        : window.magicResumeDesktop?.resumeStorage,
  );

export const createAIConfigStorage = () =>
  createDesktopAwareStorage(
    () =>
      typeof window === "undefined"
        ? undefined
        : window.magicResumeDesktop?.aiConfigStorage,
  );
