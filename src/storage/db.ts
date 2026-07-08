// Thin promise wrapper over IndexedDB — no dependency, one object store for
// user-authored content. See Prompts/lt-01/06-storage-and-content-editor.md.

const DB_NAME = 'letter-tracer'
const DB_VERSION = 1
export const USER_CONTENT = 'userContent'

let dbPromise: Promise<IDBDatabase> | null = null

/** Whether IndexedDB is available (guards SSR / locked-down environments). */
export function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(USER_CONTENT)) {
        db.createObjectStore(USER_CONTENT, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const req = fn(tx.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export function getAll<T>(store: string): Promise<T[]> {
  return run<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)
}

export function put<T>(store: string, value: T): Promise<void> {
  return run(store, 'readwrite', (s) => s.put(value)).then(() => undefined)
}

export function del(store: string, key: string): Promise<void> {
  return run(store, 'readwrite', (s) => s.delete(key)).then(() => undefined)
}

export function clear(store: string): Promise<void> {
  return run(store, 'readwrite', (s) => s.clear()).then(() => undefined)
}

/** Reset the cached connection — used by tests. */
export function _resetForTest(): void {
  dbPromise = null
}
