import { useCallback, useState, useEffect, useRef } from "react"
import { cn } from "@/shared/lib/utils"
import { createClient } from "@libsql/client/web"
import { toast } from "sonner"
import { HardDrive, Download, Upload, RotateCcw, AlertTriangle, CloudUpload, CloudDownload, Loader2, XCircle, Database } from "lucide-react"
import { getDb } from "@/shared/api"
import { seedBankSampah } from "@/shared/lib/seed"
import { getTursoConfig, setTursoConfig } from "@/shared/lib/db-config"
import { useBackupTask, type BackupTask, clearTask } from "@/shared/context/backup-context"
import { Button } from "@/shared/ui/ui/button"
import { Input } from "@/shared/ui/ui/input"
import { Label } from "@/shared/ui/ui/label"
import { Checkbox } from "@/shared/ui/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/ui/card"
import { Separator } from "@/shared/ui/ui/separator"
import { Badge } from "@/shared/ui/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/ui/alert-dialog"

// ── Types ──

interface DbStats {
  members: number
  events: number
  deposits: number
  categories: number
  vendors: number
}

interface TursoStats {
  members: number
  events: number
  deposits: number
  categories: number
  vendors: number
  lastBackup: string | null
}

// ── Helpers ──

const TABLES = [
  { name: "member", cols: "id, name, address, phone, join_date" },
  { name: "category", cols: "id, name, unit, default_rate, buy_rate, status" },
  { name: "vendor", cols: "id, name" },
  { name: "event", cols: "id, event_date, status, notes" },
  { name: "event_rate", cols: "event_id, category_id, active_rate, outbound_rate, is_active" },
  { name: "deposit", cols: "id, event_id, member_id, time, total_payout" },
  { name: "deposit_item", cols: "deposit_id, category_id, weight" },
  { name: "vendor_manifest", cols: "id, event_id, vendor_id" },
  { name: "manifest_item", cols: "manifest_id, category_id, outbound_rate" },
  { name: "semester_savings", cols: "id, member_id, semester_label, saved_amount, is_saved, rolled_from" },
]

const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS backup_meta (backup_id TEXT PRIMARY KEY, backed_at TEXT NOT NULL, source TEXT)`,
  `CREATE TABLE IF NOT EXISTS member (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT, phone TEXT, join_date TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS category (id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL, default_rate REAL NOT NULL, buy_rate REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active')`,
  `CREATE TABLE IF NOT EXISTS vendor (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE)`,
  `CREATE TABLE IF NOT EXISTS event (id TEXT PRIMARY KEY, event_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', notes TEXT)`,
  `CREATE TABLE IF NOT EXISTS event_rate (event_id TEXT NOT NULL, category_id TEXT NOT NULL, active_rate REAL NOT NULL, outbound_rate REAL NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (event_id, category_id))`,
  `CREATE TABLE IF NOT EXISTS deposit (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, member_id INTEGER NOT NULL, time TEXT NOT NULL, total_payout REAL NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS deposit_item (deposit_id TEXT NOT NULL, category_id TEXT NOT NULL, weight REAL NOT NULL, PRIMARY KEY (deposit_id, category_id))`,
  `CREATE TABLE IF NOT EXISTS vendor_manifest (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, vendor_id INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS manifest_item (manifest_id TEXT NOT NULL, category_id TEXT NOT NULL, outbound_rate REAL NOT NULL, PRIMARY KEY (manifest_id, category_id))`,
  `CREATE TABLE IF NOT EXISTS semester_savings (id TEXT PRIMARY KEY, member_id INTEGER NOT NULL, semester_label TEXT NOT NULL, saved_amount REAL NOT NULL DEFAULT 0, is_saved INTEGER NOT NULL DEFAULT 0, rolled_from TEXT)`,
]

async function getDbStats(): Promise<DbStats> {
  const db = await getDb()
  const [members, events, deposits, categories, vendors] = await Promise.all([
    db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM member"),
    db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM event"),
    db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM deposit"),
    db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM category"),
    db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM vendor"),
  ])
  return {
    members: members[0]?.count ?? 0,
    events: events[0]?.count ?? 0,
    deposits: deposits[0]?.count ?? 0,
    categories: categories[0]?.count ?? 0,
    vendors: vendors[0]?.count ?? 0,
  }
}

async function getTursoStats(tursoUrl: string, tursoToken: string): Promise<TursoStats> {
  const turso = createClient({ url: tursoUrl, authToken: tursoToken })
  const [members, events, deposits, categories, vendors, meta] = await Promise.all([
    turso.execute("SELECT COUNT(*) as count FROM member").catch(() => ({ rows: [] })),
    turso.execute("SELECT COUNT(*) as count FROM event").catch(() => ({ rows: [] })),
    turso.execute("SELECT COUNT(*) as count FROM deposit").catch(() => ({ rows: [] })),
    turso.execute("SELECT COUNT(*) as count FROM category").catch(() => ({ rows: [] })),
    turso.execute("SELECT COUNT(*) as count FROM vendor").catch(() => ({ rows: [] })),
    turso.execute("SELECT backed_at FROM backup_meta ORDER BY backed_at DESC LIMIT 1").catch(() => ({ rows: [] })),
  ])
  return {
    members: Number(members.rows[0]?.count ?? 0),
    events: Number(events.rows[0]?.count ?? 0),
    deposits: Number(deposits.rows[0]?.count ?? 0),
    categories: Number(categories.rows[0]?.count ?? 0),
    vendors: Number(vendors.rows[0]?.count ?? 0),
    lastBackup: String(meta.rows[0]?.backed_at ?? null),
  }
}

async function ensureTursoTables(turso: ReturnType<typeof createClient>): Promise<void> {
  for (const sql of CREATE_TABLES_SQL) {
    await turso.execute(sql)
  }
}

async function clearTursoData(turso: ReturnType<typeof createClient>): Promise<void> {
  await turso.execute("DELETE FROM semester_savings")
  await turso.execute("DELETE FROM manifest_item")
  await turso.execute("DELETE FROM vendor_manifest")
  await turso.execute("DELETE FROM deposit_item")
  await turso.execute("DELETE FROM deposit")
  await turso.execute("DELETE FROM event_rate")
  await turso.execute("DELETE FROM event")
  await turso.execute("DELETE FROM vendor")
  await turso.execute("DELETE FROM category")
  await turso.execute("DELETE FROM member")
  await turso.execute("DELETE FROM backup_meta")
}

const CREATE_TABLES_LOCAL = [
  `CREATE TABLE IF NOT EXISTS member (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT, phone TEXT, join_date TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS category (id TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT NOT NULL, default_rate REAL NOT NULL, buy_rate REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active')`,
  `CREATE TABLE IF NOT EXISTS vendor (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE)`,
  `CREATE TABLE IF NOT EXISTS event (id TEXT PRIMARY KEY, event_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', notes TEXT)`,
  `CREATE TABLE IF NOT EXISTS event_rate (event_id TEXT NOT NULL, category_id TEXT NOT NULL, active_rate REAL NOT NULL, outbound_rate REAL NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (event_id, category_id))`,
  `CREATE TABLE IF NOT EXISTS deposit (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, member_id INTEGER NOT NULL, time TEXT NOT NULL, total_payout REAL NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS deposit_item (deposit_id TEXT NOT NULL, category_id TEXT NOT NULL, weight REAL NOT NULL, PRIMARY KEY (deposit_id, category_id))`,
  `CREATE TABLE IF NOT EXISTS vendor_manifest (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, vendor_id INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS manifest_item (manifest_id TEXT NOT NULL, category_id TEXT NOT NULL, outbound_rate REAL NOT NULL, PRIMARY KEY (manifest_id, category_id))`,
  `CREATE TABLE IF NOT EXISTS semester_savings (id TEXT PRIMARY KEY, member_id INTEGER NOT NULL, semester_label TEXT NOT NULL, saved_amount REAL NOT NULL DEFAULT 0, is_saved INTEGER NOT NULL DEFAULT 0, rolled_from TEXT)`,
]

async function ensureLocalTables(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  for (const sql of CREATE_TABLES_LOCAL) {
    await db.execute(sql).catch(() => {})
  }
}

async function clearLocalData(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  await db.execute("DELETE FROM semester_savings")
  await db.execute("DELETE FROM manifest_item")
  await db.execute("DELETE FROM vendor_manifest")
  await db.execute("DELETE FROM deposit_item")
  await db.execute("DELETE FROM deposit")
  await db.execute("DELETE FROM event_rate")
  await db.execute("DELETE FROM event")
  await db.execute("DELETE FROM vendor")
  await db.execute("DELETE FROM category")
  await db.execute("DELETE FROM member")
}

// ── Push / Pull ──

async function pushToTurso(
  tursoUrl: string,
  tursoToken: string,
  setTask: (t: BackupTask | null) => void
): Promise<void> {
  const localDb = await getDb()
  const turso = createClient({ url: tursoUrl, authToken: tursoToken })

  setTask({ type: "push", status: "running", message: "Membuat tabel di Turso...", startedAt: Date.now() })
  await ensureTursoTables(turso)

  setTask({ type: "push", status: "running", message: "Membersihkan data lama di Turso...", startedAt: Date.now() })
  await clearTursoData(turso)

  const backupId = `local-${new Date().toISOString()}`

  for (const table of TABLES) {
    setTask({ type: "push", status: "running", message: `Mengekspor ${table.name}...`, startedAt: Date.now() })
    const colArr = table.cols.split(", ")
    const placeholders = colArr.map(() => "?").join(", ")
    const rows = await localDb.select<any[]>(`SELECT * FROM ${table.name}`)
    for (const row of rows) {
      const args = colArr.map(c => row[c] ?? null)
      await turso.execute({
        sql: `INSERT OR REPLACE INTO ${table.name} (${colArr.join(", ")}) VALUES (${placeholders})`,
        args,
      })
    }
  }

  await turso.execute({
    sql: "INSERT INTO backup_meta (backup_id, backed_at, source) VALUES (?, ?, ?)",
    args: [backupId, new Date().toISOString(), "local"],
  })

  setTask({ type: "push", status: "done", message: "Data berhasil di-push ke Turso.", startedAt: Date.now() })
}

async function pullFromTurso(
  tursoUrl: string,
  tursoToken: string,
  setTask: (t: BackupTask | null) => void
): Promise<void> {
  const localDb = await getDb()
  const turso = createClient({ url: tursoUrl, authToken: tursoToken })

  // Ensure all local tables exist first (fixes migration issues)
  setTask({ type: "pull", status: "running", message: "Memastikan tabel lokal ada...", startedAt: Date.now() })
  await ensureLocalTables(localDb)

  setTask({ type: "pull", status: "running", message: "Menghapus data lokal...", startedAt: Date.now() })
  await clearLocalData(localDb)

  for (const table of TABLES) {
    setTask({ type: "pull", status: "running", message: `Mengimpor ${table.name}...`, startedAt: Date.now() })
    const colArr = table.cols.split(", ")
    const placeholders = colArr.map(() => "?").join(", ")
    const tursoResult = await turso.execute(`SELECT * FROM ${table.name}`)
    const rows = tursoResult?.rows ?? []
    for (const row of rows) {
      const args = colArr.map(c => row[c] ?? null)
      await localDb.execute(
        `INSERT OR REPLACE INTO ${table.name} (${colArr.join(", ")}) VALUES (${placeholders})`,
        args
      )
    }
  }

  setTask({ type: "pull", status: "done", message: "Data berhasil di-pull dari Turso.", startedAt: Date.now() })
}

// ── Page ──

export function SettingsPage() {
  const [stats, setStats] = useState<DbStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [seedDialogOpen, setSeedDialogOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedKategori, setSeedKategori] = useState(true)
  const [seedAnggota, setSeedAnggota] = useState(true)
  const [seedEvent, setSeedEvent] = useState(true)
  const [seedDeposit, setSeedDeposit] = useState(true)

  const [tursoUrl, setTursoUrl] = useState(() => getTursoConfig().url)
  const [tursoToken, setTursoToken] = useState(() => getTursoConfig().token)

  const [tursoStats, setTursoStats] = useState<TursoStats | null>(null)
  const [loadingTursoStats, setLoadingTursoStats] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [uploadError, setUploadError] = useState("")

  const { task, setTask } = useBackupTask()

  useEffect(() => {
    async function migrateBuyRate() {
      try {
        const db = await getDb()
        await db.execute('ALTER TABLE category ADD COLUMN buy_rate REAL NOT NULL DEFAULT 0')
      } catch {
      }
      try {
        const db = await getDb()
        await db.execute("UPDATE category SET buy_rate = CAST(default_rate * 0.90 AS INTEGER) WHERE buy_rate = 0 AND default_rate > 0")
      } catch {
      }
    }
    migrateBuyRate()
  }, [])

  // Persist turso config
  useEffect(() => {
    const timer = setTimeout(() => setTursoConfig(tursoUrl, tursoToken), 500)
    return () => clearTimeout(timer)
  }, [tursoUrl, tursoToken])

  const handleDismissTask = useCallback(() => {
    clearTask()
    setTask(null)
  }, [setTask])

  // Show toast when task status changes (not on re-mount)
  const prevStatusRef = useRef<string | null>(task?.status ?? null)

  useEffect(() => {
    if (!task) return
    const isNewStatus = prevStatusRef.current !== task.status
    if (!isNewStatus) return
    prevStatusRef.current = task.status

    if (task.status === "running") {
      toast.loading(task.message, { id: "backup-task", duration: Infinity })
    } else if (task.status === "done") {
      toast.success(task.message, { id: "backup-task", duration: 5000 })
      if (task.type === "pull") {
        setTimeout(() => window.location.reload(), 2000)
      }
      // Auto-dismiss after done
      setTimeout(() => handleDismissTask(), 6000)
    } else if (task.status === "error") {
      toast.error(task.message, { id: "backup-task", duration: 8000 })
      // Auto-dismiss after error
      setTimeout(() => handleDismissTask(), 10000)
    }
  }, [task?.status, task?.message, task?.type, handleDismissTask])

  const handleLoadStats = useCallback(async () => {
    setLoading(true)
    try {
      setStats(await getDbStats())
    } catch {
      console.error("Failed to load stats")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDownload = useCallback(async () => {
    const { invoke } = await import("@tauri-apps/api/core")
    try {
      const bytes = await invoke<number[]>("read_file_bytes", { path: "bank_sampah.db" })
      const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bank-sampah-${new Date().toISOString().split("T")[0]}.db`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Database berhasil diunduh.")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Download error:", msg)
      toast.error(`Gagal mengunduh database: ${msg}`)
    }
  }, [])

  const handleReset = useCallback(async () => {
    setResetting(true)
    try {
      const db = await getDb()
      for (const table of ["semester_savings", "manifest_item", "vendor_manifest", "deposit_item", "deposit", "event_rate", "event", "category", "member", "vendor"]) {
        await db.execute(`DROP TABLE IF EXISTS ${table}`)
      }
      setStats(null)
      toast.success("Database berhasil direset.")
    } catch {
      toast.error("Gagal mereset database.")
    } finally {
      setResetting(false)
      setResetDialogOpen(false)
    }
  }, [])

  const handleSeed = useCallback(async (opts: { kategori: boolean; anggota: boolean; event: boolean; deposit: boolean }) => {
    setSeeding(true)
    try {
      await seedBankSampah(opts)
      setStats(null)
      toast.success("Data awal berhasil ditambahkan!")
    } catch (err) {
      console.error("Seed error:", err)
      toast.error("Gagal menjalankan seeder.")
    } finally {
      setSeeding(false)
      setSeedDialogOpen(false)
    }
  }, [])

  const handlePush = useCallback(async () => {
    if (!tursoUrl || !tursoToken) {
      toast.error("URL dan Auth Token Turso harus diisi.")
      return
    }
    try {
      await pushToTurso(tursoUrl, tursoToken, setTask)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Push error:", msg)
      setTask({
        type: "push",
        status: "error",
        message: `Push gagal: ${msg}`,
        startedAt: Date.now(),
      })
    }
  }, [tursoUrl, tursoToken, setTask])

  const handlePull = useCallback(async () => {
    if (!tursoUrl || !tursoToken) {
      toast.error("URL dan Auth Token Turso harus diisi.")
      return
    }
    try {
      await pullFromTurso(tursoUrl, tursoToken, setTask)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Pull error:", msg)
      setTask({
        type: "pull",
        status: "error",
        message: `Pull gagal: ${msg}`,
        startedAt: Date.now(),
      })
    }
  }, [tursoUrl, tursoToken, setTask])

  const handleLoadTursoStats = useCallback(async () => {
    if (!tursoUrl || !tursoToken) {
      toast.error("URL dan Auth Token Turso harus diisi.")
      return
    }
    setLoadingTursoStats(true)
    try {
      setTursoStats(await getTursoStats(tursoUrl, tursoToken))
    } catch (err) {
      toast.error("Gagal memuat statistik Turso.")
    } finally {
      setLoadingTursoStats(false)
    }
  }, [tursoUrl, tursoToken])

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadStatus("idle")
      setUploadError("")
      handleReplaceDb(file)
    }
  }, [])

  const handleReplaceDb = useCallback(async (file: File) => {
    setUploading(true)
    setUploadStatus("idle")
    setUploadError("")
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      await invoke("replace_db_file", { data: Array.from(bytes) })
      setUploadStatus("success")
      toast.success("Database berhasil diganti. Memuat ulang...")
      setTimeout(() => window.location.reload(), 2000)
    } catch (err) {
      setUploadStatus("error")
      setUploadError(err instanceof Error ? err.message : "Gagal mengganti database")
      toast.error("Gagal mengganti database.")
    } finally {
      setUploading(false)
    }
  }, [])

  const isBackingUp = task?.status === "running"

  return (
    <div className="p-12 mx-auto flex flex-col gap-8 animate-in fade-in duration-500 ease-editorial max-w-3xl">
      <header className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Pengaturan
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Kelola database dan pengaturan aplikasi.
          </p>
        </div>
      </header>

      {/* Active backup indicator */}
      {isBackingUp && (
        <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-muted/50">
          <Loader2 className="size-5 animate-spin text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {task.type === "push" ? "Sedang Push ke Turso..." : "Sedang Pull dari Turso..."}
            </p>
            <p className="text-xs text-muted-foreground truncate">{task.message}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDismissTask}>
            <XCircle className="size-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Turso Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudUpload className="size-5" />
              Konfigurasi Turso
            </CardTitle>
            <CardDescription>
              Hubungkan ke database Turso (libSQL) untuk backup cloud dan pull data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tursoUrl">URL Database Turso</Label>
              <Input
                id="tursoUrl"
                placeholder="libsql://db-anda.turso.io"
                value={tursoUrl}
                onChange={(e) => setTursoUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tursoToken">Token Autentikasi Turso</Label>
              <Input
                id="tursoToken"
                type="password"
                placeholder="eyJhbGci..."
                value={tursoToken}
                onChange={(e) => setTursoToken(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Push & Pull */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudUpload className="size-5" />
              Backup Turso
            </CardTitle>
            <CardDescription>
              Dorong data lokal ke Turso atau tarik data dari Turso ke lokal.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handlePush} disabled={!tursoUrl || !tursoToken || isBackingUp}>
                {isBackingUp && task?.type === "push" ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <CloudUpload className="size-4 mr-2" />
                )}
                {isBackingUp && task?.type === "push" ? "Mendorong..." : "Dorong ke Turso"}
              </Button>
              <Button variant="outline" onClick={handlePull} disabled={!tursoUrl || !tursoToken || isBackingUp}>
                {isBackingUp && task?.type === "pull" ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <CloudDownload className="size-4 mr-2" />
                )}
                {isBackingUp && task?.type === "pull" ? "Menarik..." : "Tarik dari Turso"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Turso Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudDownload className="size-5" />
              Statistik Backup Turso
            </CardTitle>
            <CardDescription>
              Lihat ringkasan data yang tersimpan di cloud Turso.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!tursoStats ? (
              <Button
                variant="outline"
                onClick={handleLoadTursoStats}
                disabled={loadingTursoStats || !tursoUrl || !tursoToken}
              >
                <CloudDownload className="size-4 mr-2" />
                {loadingTursoStats ? "Memuat..." : "Muat Statistik Turso"}
              </Button>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Anggota", value: tursoStats.members },
                    { label: "Event", value: tursoStats.events },
                    { label: "Deposit", value: tursoStats.deposits },
                    { label: "Kategori", value: tursoStats.categories },
                    { label: "Vendor", value: tursoStats.vendors },
                  ].map((item) => (
                    <div key={item.label} className="border border-border rounded-lg p-3 bg-muted/30 flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
                      <p className="text-2xl font-semibold tabular-nums text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
                {tursoStats.lastBackup && (
                  <p className="text-xs text-muted-foreground">
                    Terakhir dicadangkan:{" "}
                    {new Date(tursoStats.lastBackup).toLocaleString("id-ID", {
                      day: "numeric", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Download Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="size-5" />
              Unduh Database
            </CardTitle>
            <CardDescription>
              Unduh file database SQLite saat ini sebagai cadangan lokal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="size-4 mr-2" />
              Unduh bank-sampah.db
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Upload / Replace Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5" />
              Ganti Database
            </CardTitle>
            <CardDescription>
              Ganti database saat ini dengan file database lain. Semua data lama akan hilang.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <input ref={fileInputRef} type="file" accept=".db,.sqlite,.sqlite3" className="hidden" onChange={handleFileSelected} />
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="size-4 mr-2" />
                )}
                {uploading ? "Mengganti..." : "Pilih File Database"}
              </Button>
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary" className="truncate max-w-xs">{selectedFile.name}</Badge>
                <span>({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            {uploadStatus === "success" && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                Database berhasil diganti. Memuat ulang...
              </div>
            )}

            {uploadStatus === "error" && uploadError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="size-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Database Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="size-5" />
              Statistik Database Lokal
            </CardTitle>
            <CardDescription>
              Lihat ringkasan data yang tersimpan secara lokal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <Button variant="outline" onClick={handleLoadStats} disabled={loading}>
                <HardDrive className="size-4 mr-2" />
                {loading ? "Memuat..." : "Muat Statistik"}
              </Button>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Anggota", value: stats.members },
                  { label: "Event", value: stats.events },
                  { label: "Deposit", value: stats.deposits },
                  { label: "Kategori", value: stats.categories },
                  { label: "Vendor", value: stats.vendors },
                ].map((item) => (
                  <div key={item.label} className="border border-border rounded-lg p-3 bg-muted/30 flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{item.label}</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              Isi Data Awal (Seeder)
            </CardTitle>
            <CardDescription>
              Tambahkan data contoh (kategori, anggota, event, deposit) untuk pengujian.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setSeedDialogOpen(true)} disabled={seeding}>
              {seeding ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Database className="size-4 mr-2" />}
              {seeding ? "Menjalankan..." : "Jalankan Seeder"}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Reset Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              Reset Database
            </CardTitle>
            <CardDescription>
              Hapus semua data dan kembalikan database ke keadaan kosong. Tindakan ini tidak dapat dibatalkan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setResetDialogOpen(true)}>
              <RotateCcw className="size-4 mr-2" />
              Reset Database
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={seedDialogOpen} onOpenChange={setSeedDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Jalankan Seeder</AlertDialogTitle>
            <AlertDialogDescription>
              Pilih data yang ingin ditambahkan. Data yang sudah ada akan diperbarui, bukan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3">
              <Checkbox
                id="seed-kategori"
                checked={seedKategori}
                onCheckedChange={(v: boolean | 'indeterminate') => setSeedKategori(!!v)}
              />
              <div className="grid gap-0.5">
                <Label htmlFor="seed-kategori" className="text-sm font-medium cursor-pointer">
                  Kategori
                </Label>
                <p className="text-xs text-muted-foreground">45 kategori sampah (p11, p38, c4, karton, dll)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="seed-anggota"
                checked={seedAnggota}
                onCheckedChange={(v: boolean | 'indeterminate') => setSeedAnggota(!!v)}
              />
              <div className="grid gap-0.5">
                <Label htmlFor="seed-anggota" className="text-sm font-medium cursor-pointer">
                  Anggota
                </Label>
                <p className="text-xs text-muted-foreground">120 anggota contoh dengan nama dan alamat</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="seed-event"
                checked={seedEvent}
                onCheckedChange={(v: boolean | 'indeterminate') => setSeedEvent(!!v)}
                disabled={!seedAnggota}
              />
              <div className="grid gap-0.5">
                <Label htmlFor="seed-event" className={cn("text-sm font-medium cursor-pointer", !seedAnggota && "opacity-50")}>
                  Event (Hari Ini)
                </Label>
                <p className="text-xs text-muted-foreground">Event baru + rate untuk setiap kategori</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="seed-deposit"
                checked={seedDeposit}
                onCheckedChange={(v: boolean | 'indeterminate') => setSeedDeposit(!!v)}
                disabled={!seedEvent || !seedAnggota}
              />
              <div className="grid gap-0.5">
                <Label htmlFor="seed-deposit" className={cn("text-sm font-medium cursor-pointer", (!seedEvent || !seedAnggota) && "opacity-50")}>
                  Deposit
                </Label>
                <p className="text-xs text-muted-foreground">Data setoran acak untuk setiap anggota</p>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleSeed({ kategori: seedKategori, anggota: seedAnggota, event: seedEvent, deposit: seedDeposit })}
              disabled={seeding || (!seedKategori && !seedAnggota && !seedEvent && !seedDeposit)}
            >
              {seeding ? "Menjalankan..." : "Ya, Jalankan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Reset Database?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Semua data anggota, event, deposit, kategori, dan vendor akan dihapus secara permanen.
              Tindakan ini <strong>tidak dapat dibatalkan</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? "Mereset..." : "Ya, Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
