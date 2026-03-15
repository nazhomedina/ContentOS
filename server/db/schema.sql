-- Cache de piezas de contenido (parseadas de archivos .md)
CREATE TABLE IF NOT EXISTS content_cache (
    filename TEXT PRIMARY KEY,
    stage TEXT NOT NULL,
    title TEXT,
    format TEXT,
    pillar TEXT,
    channel TEXT,
    series TEXT,
    created_date TEXT,
    publish_date TEXT,
    frontmatter_json TEXT,
    body TEXT,
    file_path TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Registro de actividades (alimenta el contribution graph)
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    action TEXT NOT NULL,
    filename TEXT,
    xp INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rachas calculadas
CREATE TABLE IF NOT EXISTS streaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL UNIQUE,
    current INTEGER DEFAULT 0,
    best INTEGER DEFAULT 0,
    last_active_date TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Logros desbloqueados
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    unlocked_at DATETIME,
    notified INTEGER DEFAULT 0
);

-- Métricas históricas por pieza
CREATE TABLE IF NOT EXISTS metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    date TEXT NOT NULL,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    saves INTEGER,
    reach INTEGER,
    engagement_rate REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Métricas de cuenta (crecimiento)
CREATE TABLE IF NOT EXISTS account_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    date TEXT NOT NULL,
    followers INTEGER,
    following INTEGER,
    posts_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inicializar rachas si no existen
INSERT OR IGNORE INTO streaks (type, current, best) VALUES ('production', 0, 0);
INSERT OR IGNORE INTO streaks (type, current, best) VALUES ('publication', 0, 0);
INSERT OR IGNORE INTO streaks (type, current, best) VALUES ('sprint', 0, 0);
