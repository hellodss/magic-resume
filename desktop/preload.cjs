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
});
