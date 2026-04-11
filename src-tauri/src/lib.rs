use tauri_plugin_sql::{Migration, MigrationKind};
use std::env;
use std::fs;

fn db_path() -> String {
    // Try multiple possible locations in order of likelihood
    let exe_dir = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_default();
    let cwd = env::current_dir().unwrap_or_default();

    let mut candidates: Vec<std::path::PathBuf> = vec![
        // Dev mode: CWD is usually src-tauri/
        cwd.join("bank_sampah.db"),
        // Release mode: next to the executable
        exe_dir.join("bank_sampah.db"),
        // Also try parent of exe dir
        exe_dir.parent().map(|p| p.join("bank_sampah.db")).unwrap_or_default(),
        // Fallback to project root
        cwd.parent().and_then(|p| p.parent().map(|pp| pp.join("src-tauri").join("bank_sampah.db"))).unwrap_or_default(),
    ];

    // Add APPDATA if available (Windows)
    if let Ok(appdata) = env::var("APPDATA") {
        candidates.push(std::path::PathBuf::from(format!("{}\\bank_sampah.db", appdata)));
    }

    for path in &candidates {
        if path.exists() {
            return path.to_string_lossy().to_string();
        }
    }

    // Default to first candidate
    candidates.first().map(|p| p.to_string_lossy().to_string()).unwrap_or_else(|| "bank_sampah.db".to_string())
}

#[tauri::command]
fn read_file_bytes(_path: String) -> Result<Vec<u8>, String> {
    let resolved = db_path();
    eprintln!("[DEBUG] Looking for DB at: {}", resolved);
    fs::read(&resolved).map_err(|e| format!("Failed to read '{}': {}", resolved, e))
}

#[tauri::command]
fn replace_db_file(data: Vec<u8>) -> Result<(), String> {
    let db_path = db_path();
    eprintln!("[DEBUG] Writing DB to: {}", db_path);
    fs::write(&db_path, &data).map_err(|e| format!("Failed to write '{}': {}", db_path, e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create all tables",
            sql: "
            CREATE TABLE IF NOT EXISTS member (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              address TEXT,
              phone TEXT,
              join_date TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS category (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              unit TEXT NOT NULL,
              default_rate REAL NOT NULL,
              status TEXT NOT NULL DEFAULT 'active',
              archived INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS vendor (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS event (
              id TEXT PRIMARY KEY,
              event_date TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'active'
            );

            CREATE TABLE IF NOT EXISTS event_rate (
              event_id TEXT NOT NULL,
              category_id TEXT NOT NULL,
              active_rate REAL NOT NULL,
              outbound_rate REAL NOT NULL DEFAULT 0,
              is_active INTEGER NOT NULL DEFAULT 1,
              PRIMARY KEY (event_id, category_id),
              FOREIGN KEY (event_id) REFERENCES event(id),
              FOREIGN KEY (category_id) REFERENCES category(id)
            );

            CREATE TABLE IF NOT EXISTS deposit (
              id TEXT PRIMARY KEY,
              event_id TEXT NOT NULL,
              member_id INTEGER NOT NULL,
              time TEXT NOT NULL,
              total_payout REAL NOT NULL DEFAULT 0,
              FOREIGN KEY (event_id) REFERENCES event(id),
              FOREIGN KEY (member_id) REFERENCES member(id)
            );

            CREATE TABLE IF NOT EXISTS deposit_item (
              deposit_id TEXT NOT NULL,
              category_id TEXT NOT NULL,
              weight REAL NOT NULL,
              PRIMARY KEY (deposit_id, category_id),
              FOREIGN KEY (deposit_id) REFERENCES deposit(id),
              FOREIGN KEY (category_id) REFERENCES category(id)
            );

            CREATE TABLE IF NOT EXISTS vendor_manifest (
              id TEXT PRIMARY KEY,
              event_id TEXT NOT NULL,
              vendor_id INTEGER NOT NULL,
              FOREIGN KEY (event_id) REFERENCES event(id),
              FOREIGN KEY (vendor_id) REFERENCES vendor(id)
            );

            CREATE TABLE IF NOT EXISTS manifest_item (
              manifest_id TEXT NOT NULL,
              category_id TEXT NOT NULL,
              outbound_rate REAL NOT NULL,
              PRIMARY KEY (manifest_id, category_id),
              FOREIGN KEY (manifest_id) REFERENCES vendor_manifest(id),
              FOREIGN KEY (category_id) REFERENCES category(id)
            );

            CREATE TABLE IF NOT EXISTS semester_savings (
              id TEXT PRIMARY KEY,
              member_id INTEGER NOT NULL REFERENCES member(id),
              semester_label TEXT NOT NULL,
              saved_amount REAL NOT NULL DEFAULT 0,
              is_saved INTEGER NOT NULL DEFAULT 0,
              rolled_from TEXT
            );

            INSERT OR IGNORE INTO vendor (name) VALUES ('BSM');
            INSERT OR IGNORE INTO vendor (name) VALUES ('Lainnya');

            INSERT OR IGNORE INTO category (id, name, unit, default_rate, status, archived) VALUES ('c4', 'C4', 'kg', 0, 'active', 0);
          ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:bank_sampah.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![read_file_bytes, replace_db_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
