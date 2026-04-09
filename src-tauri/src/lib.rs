use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial tables",
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
              status TEXT NOT NULL DEFAULT 'active'
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

            INSERT OR IGNORE INTO vendor (name) VALUES ('BSM');
            INSERT OR IGNORE INTO vendor (name) VALUES ('Lainnya');

            INSERT OR IGNORE INTO category (id, name, unit, default_rate, status) VALUES ('c4', 'C4', 'kg', 0, 'active');
          ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add outbound_rate column to event_rate",
            sql: "ALTER TABLE event_rate ADD COLUMN outbound_rate REAL NOT NULL DEFAULT 0;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add address and phone columns to member",
            sql: "ALTER TABLE member ADD COLUMN address TEXT; ALTER TABLE member ADD COLUMN phone TEXT;",
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
