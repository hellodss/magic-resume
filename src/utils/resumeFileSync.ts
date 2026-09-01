import type { ResumeData } from "@/types/resume";
import { getFileHandle, verifyPermission } from "@/utils/fileSystem";
import { parseResumeFile } from "@/lib/resumeSchema";

type SyncResult = {
  synced: number;
  skipped: number;
  failed: number;
};

const importResumeContent = (
  content: string,
  sourceModifiedAt: number,
  updateResumeFromFile: (
    resume: ResumeData,
    sourceModifiedAt?: number
  ) => boolean,
  result: SyncResult
) => {
  const resumeData = parseResumeFile(JSON.parse(content));
  const imported = updateResumeFromFile(resumeData, sourceModifiedAt);
  if (imported) {
    result.synced += 1;
  } else {
    result.skipped += 1;
  }
};

export const syncResumeToDirectory = async (
  resumeData: ResumeData,
  prevResume?: ResumeData
) => {
  if (typeof window === "undefined") return;

  const desktopSync = window.magicResumeDesktop?.directorySync;
  if (desktopSync) {
    if (!(await desktopSync.getPath())) return;
    await desktopSync.writeResume({
      title: resumeData.title,
      previousTitle:
        prevResume?.id === resumeData.id ? prevResume.title : undefined,
      content: JSON.stringify(resumeData, null, 2),
    });
    return;
  }

  if (typeof indexedDB === "undefined") return;
  const handle = await getFileHandle("syncDirectory");
  if (!handle || handle.kind !== "directory") return;

  const hasPermission = await verifyPermission(handle);
  if (!hasPermission) return;

  const dirHandle = handle as FileSystemDirectoryHandle;
  if (
    prevResume &&
    prevResume.id === resumeData.id &&
    prevResume.title !== resumeData.title
  ) {
    try {
      await dirHandle.removeEntry(`${prevResume.title}.json`);
    } catch {
      // The previous file may not exist yet.
    }
  }

  const fileHandle = await dirHandle.getFileHandle(`${resumeData.title}.json`, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(resumeData, null, 2));
  await writable.close();
};

export const removeResumeFromDirectory = async (title: string) => {
  if (typeof window === "undefined") return;

  const desktopSync = window.magicResumeDesktop?.directorySync;
  if (desktopSync) {
    await desktopSync.removeResume(title);
    return;
  }

  if (typeof indexedDB === "undefined") return;
  const handle = await getFileHandle("syncDirectory");
  if (!handle || handle.kind !== "directory") return;
  if (!(await verifyPermission(handle))) return;

  try {
    await (handle as FileSystemDirectoryHandle).removeEntry(`${title}.json`);
  } catch {
    // The resume may not have been synced yet.
  }
};

export const syncResumesFromDirectory = async (
  updateResumeFromFile: (
    resume: ResumeData,
    sourceModifiedAt?: number
  ) => boolean
): Promise<SyncResult> => {
  const result: SyncResult = {
    synced: 0,
    skipped: 0,
    failed: 0,
  };

  if (typeof window === "undefined") {
    return result;
  }

  try {
    const desktopSync = window.magicResumeDesktop?.directorySync;
    if (desktopSync) {
      const files = await desktopSync.readResumes();
      for (const file of files) {
        try {
          importResumeContent(
            file.content,
            file.lastModified,
            updateResumeFromFile,
            result
          );
        } catch (error) {
          result.failed += 1;
          console.error(`Error reading resume file "${file.name}":`, error);
        }
      }
      return result;
    }

    if (typeof indexedDB === "undefined") return result;
    const handle = await getFileHandle("syncDirectory");
    if (!handle || handle.kind !== "directory") {
      return result;
    }

    const hasPermission = await verifyPermission(handle, "read");
    if (!hasPermission) {
      return result;
    }

    const dirHandle = handle as FileSystemDirectoryHandle;
    const entries = (dirHandle as any).values?.();
    if (!entries) {
      return result;
    }

    for await (const entry of entries) {
      if (entry.kind !== "file" || !entry.name.endsWith(".json")) {
        result.skipped += 1;
        continue;
      }

      try {
        const file = await entry.getFile();
        importResumeContent(
          await file.text(),
          file.lastModified,
          updateResumeFromFile,
          result
        );
      } catch (error) {
        result.failed += 1;
        console.error(`Error reading resume file "${entry.name}":`, error);
      }
    }
  } catch (error) {
    console.error("Error syncing resumes from files:", error);
  }

  return result;
};
