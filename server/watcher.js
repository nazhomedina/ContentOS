const chokidar = require('chokidar');
const path = require('path');
const { getContentDir, parseFile, STAGES } = require('./services/fileParser');
const { getDb } = require('./db/init');

let watcher = null;

function startWatcher() {
  const contentDir = getContentDir();
  const watchPaths = STAGES.map(s => path.join(contentDir, s, '*.md'));

  watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  watcher
    .on('add', filePath => {
      console.log(`[watcher] New file: ${path.basename(filePath)}`);
      cacheFile(filePath);
    })
    .on('change', filePath => {
      console.log(`[watcher] Changed: ${path.basename(filePath)}`);
      cacheFile(filePath);
    })
    .on('unlink', filePath => {
      const filename = path.basename(filePath);
      console.log(`[watcher] Removed: ${filename}`);
      try {
        const db = getDb();
        db.prepare('DELETE FROM content_cache WHERE filename = ?').run(filename);
      } catch (err) {
        console.error(`[watcher] Error removing cache for ${filename}:`, err.message);
      }
    });

  console.log(`[watcher] Watching ${contentDir} for changes`);
  return watcher;
}

function cacheFile(filePath) {
  try {
    const piece = parseFile(filePath);
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO content_cache
        (filename, stage, title, format, pillar, channel, series, created_date, publish_date, frontmatter_json, body, file_path, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      piece.filename,
      piece.stage,
      piece.title,
      piece.format,
      piece.pillar,
      piece.channel,
      piece.series,
      piece.createdDate,
      piece.publishDate,
      JSON.stringify(piece.frontmatter),
      piece.body,
      piece.filePath
    );
  } catch (err) {
    console.error(`[watcher] Error caching ${filePath}:`, err.message);
  }
}

function stopWatcher() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

module.exports = { startWatcher, stopWatcher };
