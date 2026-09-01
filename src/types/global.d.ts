declare global {
  interface Window {
    showDirectoryPicker(
      options?: FilePickerOptions
    ): Promise<FileSystemDirectoryHandle>;
    magicResumeDesktop?: {
      platform: "win32" | "darwin" | "linux" | string;
      resumeStorage: DesktopStorageArea;
      aiConfigStorage: DesktopStorageArea;
      directorySync: DesktopDirectorySync;
    };
  }
}

interface DesktopStorageArea {
  getItem(): Promise<string | null>;
  setItem(value: string): Promise<void>;
  removeItem(): Promise<void>;
}

interface DesktopResumeFile {
  name: string;
  content: string;
  lastModified: number;
}

interface DesktopDirectorySync {
  getPath(): Promise<string | null>;
  select(): Promise<string | null>;
  remove(): Promise<void>;
  readResumes(): Promise<DesktopResumeFile[]>;
  removeResume(title: string): Promise<void>;
  writeResume(payload: {
    title: string;
    previousTitle?: string;
    content: string;
  }): Promise<{ fileName: string }>;
}

interface FilePickerOptions {
  multiple?: boolean;
  mode?: "read" | "readwrite";
}

export {};
