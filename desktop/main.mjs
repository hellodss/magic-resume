import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  safeStorage,
  session,
  shell,
} from "electron";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server.mjs";
import { toResumeFileName } from "./path-utils.mjs";

const DESKTOP_HOST = "127.0.0.1";
const DESKTOP_PORT = 47839;
const AUTH_HEADER = "X-Magic-Resume-Token";
const MAX_SYNC_FILE_BYTES = 5 * 1024 * 1024;
const MAX_SYNC_FILES = 1000;
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let trustedOrigin = "";
let localServer;

const isTrustedUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    return Boolean(trustedOrigin) && url.origin === trustedOrigin;
  } catch {
    return false;
  }
};

const isSafeExternalUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
};

const assertTrustedSender = (event) => {
  if (!isTrustedUrl(event.senderFrame?.url || "")) {
    throw new Error("Rejected desktop IPC request from an untrusted sender.");
  }
};

const validatePersistedJson = (value) => {
  if (typeof value !== "string") {
    throw new TypeError("Persisted data must be a string.");
  }
  JSON.parse(value);
  return value;
};

const readWithBackup = async (filePath, backupPath) => {
  let primaryError;
  for (const candidate of [filePath, backupPath]) {
    try {
      const value = await readFile(candidate, "utf8");
      return validatePersistedJson(value);
    } catch (error) {
      if (error?.code !== "ENOENT" && !primaryError) {
        primaryError = error;
      }
    }
  }
  if (primaryError) throw primaryError;
  return null;
};

const writeAtomic = async (filePath, value) => {
  validatePersistedJson(value);
  await mkdir(dirname(filePath), { recursive: true });

  const backupPath = `${filePath}.bak`;
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, value, { encoding: "utf8", mode: 0o600 });

  try {
    await copyFile(filePath, backupPath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      await rm(temporaryPath, { force: true });
      throw error;
    }
  }

  try {
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};

const writeQueues = new Map();

const enqueueFileOperation = (filePath, operation) => {
  const previous = writeQueues.get(filePath) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  writeQueues.set(filePath, current);
  const cleanup = () => {
    if (writeQueues.get(filePath) === current) {
      writeQueues.delete(filePath);
    }
  };
  void current.then(cleanup, cleanup);
  return current;
};

const removePersistedFile = async (filePath) => {
  await Promise.all([
    rm(filePath, { force: true }),
    rm(`${filePath}.bak`, { force: true }),
  ]);
};

const encryptString = async (value) => {
  if (
    typeof safeStorage.isAsyncEncryptionAvailable === "function" &&
    typeof safeStorage.encryptStringAsync === "function" &&
    (await safeStorage.isAsyncEncryptionAvailable())
  ) {
    return Buffer.from(await safeStorage.encryptStringAsync(value));
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("System secure storage is unavailable.");
  }
  return safeStorage.encryptString(value);
};

const decryptString = async (encrypted) => {
  if (
    typeof safeStorage.isAsyncEncryptionAvailable === "function" &&
    typeof safeStorage.decryptStringAsync === "function" &&
    (await safeStorage.isAsyncEncryptionAvailable())
  ) {
    const decrypted = await safeStorage.decryptStringAsync(encrypted);
    return decrypted.result;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("System secure storage is unavailable.");
  }
  return safeStorage.decryptString(encrypted);
};

const installStorageHandlers = () => {
  const dataDirectory = join(app.getPath("userData"), "data");
  const resumeFile = join(dataDirectory, "resume-storage.json");
  const resumeBackup = `${resumeFile}.bak`;
  const aiConfigFile = join(dataDirectory, "ai-config-storage.bin");
  const aiConfigBackup = `${aiConfigFile}.bak`;
  const syncDirectoryFile = join(dataDirectory, "sync-directory.json");
  const syncDirectoryBackup = `${syncDirectoryFile}.bak`;

  const getSyncDirectoryPath = async () => {
    const storedValue = await readWithBackup(
      syncDirectoryFile,
      syncDirectoryBackup,
    );
    if (!storedValue) return null;

    const parsed = JSON.parse(storedValue);
    if (!parsed || typeof parsed.path !== "string" || !parsed.path.trim()) {
      return null;
    }

    try {
      const directoryStats = await stat(parsed.path);
      return directoryStats.isDirectory() ? parsed.path : null;
    } catch {
      return null;
    }
  };

  ipcMain.handle("resume-storage:get", async (event) => {
    assertTrustedSender(event);
    return readWithBackup(resumeFile, resumeBackup);
  });
  ipcMain.handle("resume-storage:set", async (event, value) => {
    assertTrustedSender(event);
    await enqueueFileOperation(resumeFile, () => writeAtomic(resumeFile, value));
  });
  ipcMain.handle("resume-storage:remove", async (event) => {
    assertTrustedSender(event);
    await enqueueFileOperation(resumeFile, () =>
      removePersistedFile(resumeFile),
    );
  });

  ipcMain.handle("ai-config-storage:get", async (event) => {
    assertTrustedSender(event);
    let primaryError;
    for (const filePath of [aiConfigFile, aiConfigBackup]) {
      try {
        const encrypted = await readFile(filePath);
        const value = await decryptString(encrypted);
        return validatePersistedJson(value);
      } catch (error) {
        if (error?.code !== "ENOENT" && !primaryError) {
          primaryError = error;
        }
      }
    }
    if (primaryError) throw primaryError;
    return null;
  });
  ipcMain.handle("ai-config-storage:set", async (event, value) => {
    assertTrustedSender(event);
    validatePersistedJson(value);
    await enqueueFileOperation(aiConfigFile, async () => {
      await mkdir(dataDirectory, { recursive: true });
      const encrypted = await encryptString(value);
      const temporaryPath =
        `${aiConfigFile}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(temporaryPath, encrypted, { mode: 0o600 });
      try {
        await copyFile(aiConfigFile, aiConfigBackup);
      } catch (error) {
        if (error?.code !== "ENOENT") {
          await rm(temporaryPath, { force: true });
          throw error;
        }
      }
      try {
        await rename(temporaryPath, aiConfigFile);
      } catch (error) {
        await rm(temporaryPath, { force: true });
        throw error;
      }
    });
  });
  ipcMain.handle("ai-config-storage:remove", async (event) => {
    assertTrustedSender(event);
    await enqueueFileOperation(aiConfigFile, () =>
      removePersistedFile(aiConfigFile),
    );
  });

  ipcMain.handle("directory-sync:get-path", async (event) => {
    assertTrustedSender(event);
    return getSyncDirectoryPath();
  });
  ipcMain.handle("directory-sync:select", async (event) => {
    assertTrustedSender(event);
    const owner = BrowserWindow.fromWebContents(event.sender);
    const options = {
      title: "选择简历数据存储目录",
      properties: ["openDirectory", "createDirectory"],
    };
    const result = owner
      ? await dialog.showOpenDialog(owner, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || !result.filePaths[0]) return null;

    const directoryPath = resolve(result.filePaths[0]);
    await writeAtomic(
      syncDirectoryFile,
      JSON.stringify({ path: directoryPath }),
    );
    return directoryPath;
  });
  ipcMain.handle("directory-sync:remove", async (event) => {
    assertTrustedSender(event);
    await enqueueFileOperation(syncDirectoryFile, () =>
      removePersistedFile(syncDirectoryFile),
    );
  });
  ipcMain.handle("directory-sync:read-resumes", async (event) => {
    assertTrustedSender(event);
    const directoryPath = await getSyncDirectoryPath();
    if (!directoryPath) return [];

    const entries = await readdir(directoryPath, { withFileTypes: true });
    const resumeEntries = entries
      .filter(
        (entry) =>
          entry.isFile() && entry.name.toLocaleLowerCase().endsWith(".json"),
      )
      .slice(0, MAX_SYNC_FILES);
    const files = [];

    for (const entry of resumeEntries) {
      const filePath = join(directoryPath, entry.name);
      try {
        const fileStats = await stat(filePath);
        if (fileStats.size > MAX_SYNC_FILE_BYTES) continue;
        files.push({
          name: entry.name,
          content: await readFile(filePath, "utf8"),
          lastModified: fileStats.mtimeMs,
        });
      } catch (error) {
        console.warn(`Unable to read synced resume "${entry.name}":`, error);
      }
    }

    return files;
  });
  ipcMain.handle("directory-sync:write-resume", async (event, payload) => {
    assertTrustedSender(event);
    if (
      !payload ||
      typeof payload.title !== "string" ||
      typeof payload.content !== "string"
    ) {
      throw new TypeError("Invalid resume sync payload.");
    }

    validatePersistedJson(payload.content);
    if (Buffer.byteLength(payload.content, "utf8") > MAX_SYNC_FILE_BYTES) {
      throw new Error("Resume data is too large to sync.");
    }

    const directoryPath = await getSyncDirectoryPath();
    if (!directoryPath) throw new Error("No resume sync directory configured.");

    const fileName = toResumeFileName(payload.title);
    if (
      typeof payload.previousTitle === "string" &&
      payload.previousTitle !== payload.title
    ) {
      const previousFileName = toResumeFileName(payload.previousTitle);
      if (previousFileName !== fileName) {
        await removePersistedFile(join(directoryPath, previousFileName));
      }
    }

    await enqueueFileOperation(join(directoryPath, fileName), () =>
      writeAtomic(join(directoryPath, fileName), payload.content),
    );
    return { fileName };
  });
  ipcMain.handle("directory-sync:remove-resume", async (event, title) => {
    assertTrustedSender(event);
    if (typeof title !== "string") {
      throw new TypeError("Invalid resume title.");
    }
    const directoryPath = await getSyncDirectoryPath();
    if (!directoryPath) return;
    await removePersistedFile(
      join(directoryPath, toResumeFileName(title)),
    );
  });
};

const createMainWindow = () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#f8fafc",
    icon: resolve(appRoot, "public/icon.png"),
    webPreferences: {
      preload: resolve(appRoot, "desktop/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: process.env.ELECTRON_ENABLE_DEVTOOLS === "1",
    },
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedUrl(url)) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        void shell.openExternal(url);
      }
    }
  });
  void window.loadURL(`${trustedOrigin}/app/dashboard/resumes`);
  return window;
};

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app
    .whenReady()
    .then(async () => {
      Menu.setApplicationMenu(null);
      installStorageHandlers();

      const authToken = randomBytes(32).toString("hex");
      const startedServer = await startServer({
        host: DESKTOP_HOST,
        port: DESKTOP_PORT,
        authorizeRequest: (request) =>
          request.headers[AUTH_HEADER.toLowerCase()] === authToken,
      });
      localServer = startedServer.server;
      trustedOrigin = startedServer.url;

      session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: [`${trustedOrigin}/*`] },
        (details, callback) => {
          details.requestHeaders[AUTH_HEADER] = authToken;
          callback({ requestHeaders: details.requestHeaders });
        },
      );

      session.defaultSession.setPermissionRequestHandler(
        (webContents, permission, callback) => {
          const allowedPermissions = new Set([
            "clipboard-sanitized-write",
            "fileSystem",
            "fullscreen",
          ]);
          callback(
            isTrustedUrl(webContents.getURL()) &&
              allowedPermissions.has(permission),
          );
        },
      );

      createMainWindow();
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
      });
    })
    .catch((error) => {
      console.error("Failed to start Magic Resume:", error);
      dialog.showErrorBox(
        "Magic Resume 无法启动",
        "本地桌面服务启动失败，请关闭占用端口 47839 的程序后重试。",
      );
      app.quit();
    });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  let storageFlushInProgress = false;
  app.on("before-quit", (event) => {
    if (!storageFlushInProgress && writeQueues.size > 0) {
      event.preventDefault();
      storageFlushInProgress = true;
      void Promise.allSettled([...writeQueues.values()]).then(() => app.quit());
      return;
    }
    localServer?.close();
  });
}
