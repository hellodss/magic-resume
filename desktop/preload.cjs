const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("magicResumeDesktop", {
  platform: process.platform,
  resumeStorage: {
    getItem: () => ipcRenderer.invoke("resume-storage:get"),
    setItem: (value) => ipcRenderer.invoke("resume-storage:set", value),
    removeItem: () => ipcRenderer.invoke("resume-storage:remove"),
  },
  aiConfigStorage: {
    getItem: () => ipcRenderer.invoke("ai-config-storage:get"),
    setItem: (value) => ipcRenderer.invoke("ai-config-storage:set", value),
    removeItem: () => ipcRenderer.invoke("ai-config-storage:remove"),
  },
  directorySync: {
    getPath: () => ipcRenderer.invoke("directory-sync:get-path"),
    select: () => ipcRenderer.invoke("directory-sync:select"),
    remove: () => ipcRenderer.invoke("directory-sync:remove"),
    readResumes: () => ipcRenderer.invoke("directory-sync:read-resumes"),
    removeResume: (title) =>
      ipcRenderer.invoke("directory-sync:remove-resume", title),
    writeResume: (payload) =>
      ipcRenderer.invoke("directory-sync:write-resume", payload),
  },
  lifecycle: {
    onBeforeClose: (callback) => {
      const listener = async () => {
        try {
          await callback();
        } finally {
          await ipcRenderer.invoke("desktop-lifecycle:close-ready");
        }
      };
      ipcRenderer.on("desktop-lifecycle:before-close", listener);
      return () =>
        ipcRenderer.removeListener("desktop-lifecycle:before-close", listener);
    },
  },
});
