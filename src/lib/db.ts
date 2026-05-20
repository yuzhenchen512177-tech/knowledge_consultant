const DB_NAME = "yingshi_db";
const DB_VERSION = 1;

export interface Mistake {
  id: string;
  stem: string;
  user_answer: string;
  correct_answer: string;
  tags: string[];
}

export interface TagStat {
  tag: string;
  name: string;
  wrong_count: number;
}

export interface DiagnoseRecord {
  id: string;
  created_at: number;
  input_summary: string;
  mistakes: Mistake[];
  report: { weak_points: string; structure: string; focus: string };
  tag_stats: TagStat[];
  recommended_ids: string[];
}

export interface SessionResult {
  problem_id: string;
  user_answer: string;
  correct: boolean;
}

export interface PracticeSessionRecord {
  id: string;
  diagnosis_id: string;
  created_at: number;
  round: number;
  results: SessionResult[];
  correct_count: number;
  total_count: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("diagnoses")) {
        db.createObjectStore("diagnoses", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("practice_sessions")) {
        const store = db.createObjectStore("practice_sessions", { keyPath: "id" });
        store.createIndex("diagnosis_id", "diagnosis_id", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDiagnosis(record: DiagnoseRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("diagnoses", "readwrite");
    tx.objectStore("diagnoses").put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllDiagnoses(): Promise<DiagnoseRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("diagnoses", "readonly");
    const req = tx.objectStore("diagnoses").getAll();
    req.onsuccess = () => resolve(req.result as DiagnoseRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getDiagnosis(id: string): Promise<DiagnoseRecord | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("diagnoses", "readonly");
    const req = tx.objectStore("diagnoses").get(id);
    req.onsuccess = () => resolve(req.result as DiagnoseRecord | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function savePracticeSession(record: PracticeSessionRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("practice_sessions", "readwrite");
    tx.objectStore("practice_sessions").put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSessionsByDiagnosis(diagnosisId: string): Promise<PracticeSessionRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("practice_sessions", "readonly");
    const index = tx.objectStore("practice_sessions").index("diagnosis_id");
    const req = index.getAll(diagnosisId);
    req.onsuccess = () => resolve(req.result as PracticeSessionRecord[]);
    req.onerror = () => reject(req.error);
  });
}
