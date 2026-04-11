import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type BackupTask = {
  type: 'push' | 'pull';
  status: 'running' | 'done' | 'error';
  message: string;
  startedAt: number;
  toastShown?: boolean;
};

const STORAGE_KEY = 'app:backupTask';

function readTask(): BackupTask | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const task: BackupTask = JSON.parse(raw);
    // If running and started more than 5 minutes ago, it's stale
    if (task.status === 'running' && Date.now() - task.startedAt > 5 * 60 * 1000) {
      clearTask();
      return null;
    }
    return task;
  } catch {
    return null;
  }
}

function writeTask(task: BackupTask | null): void {
  if (!task) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(task));
  }
}

export function clearTask(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface BackupContextType {
  task: BackupTask | null;
  setTask: (t: BackupTask | null) => void;
}

const BackupContext = createContext<BackupContextType>({ task: null, setTask: () => {} });

export function BackupProvider({ children }: { children: React.ReactNode }) {
  const [task, setTaskState] = useState<BackupTask | null>(readTask);

  const setTask = useCallback((t: BackupTask | null) => {
    writeTask(t);
    setTaskState(t);
  }, []);

  // Poll localStorage for changes from other tabs or navigation
  useEffect(() => {
    const interval = setInterval(() => {
      const current = readTask();
      setTaskState((prev) => {
        // Only update if actually changed
        if (JSON.stringify(prev) === JSON.stringify(current)) return prev;
        return current;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BackupContext.Provider value={{ task, setTask }}>
      {children}
    </BackupContext.Provider>
  );
}

export function useBackupTask() {
  return useContext(BackupContext);
}
