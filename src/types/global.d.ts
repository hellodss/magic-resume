declare global {
  interface Window {
    showDirectoryPicker(
      options?: FilePickerOptions
    ): Promise<FileSystemDirectoryHandle>;
    magicResumeDesktop?: {
      platform: "win32" | "darwin" | "linux" | string;
      resumeStorage: DesktopStorageArea;
      aiConfigStorage: DesktopStorageArea;
    };
  }
}

interface DesktopStorageArea {
  getItem(): Promise<string | null>;
  setItem(value: string): Promise<void>;
  removeItem(): Promise<void>;
}

interface FilePickerOptions {
  multiple?: boolean;
  mode?: "read" | "readwrite";
}

export {};
