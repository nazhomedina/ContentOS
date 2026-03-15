const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const STAGES = ['ideas', 'redaccion', 'produccion', 'buffer', 'publicado'];
const STAGE_MAP = {
  ideas: 'idea',
  redaccion: 'redaccion',
  produccion: 'produccion',
  buffer: 'buffer',
  publicado: 'publicado',
};

function getContentDir() {
  return path.resolve(process.env.CONTENT_DIR || './contenido');
}

function ensureDirectories() {
  const contentDir = getContentDir();
  const dirs = [...STAGES, 'sprints'];
  for (const dir of dirs) {
    const dirPath = path.join(contentDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

function parseFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const relativePath = path.relative(getContentDir(), filePath);
  const stage = relativePath.split(path.sep)[0];
  const filename = path.basename(filePath);

  return {
    filename,
    stage: STAGE_MAP[stage] || stage,
    stageDir: stage,
    title: data.titulo || data.title || filename.replace('.md', ''),
    format: data.formato || data.format || null,
    pillar: data.pilar || data.pillar || null,
    channel: data.canal || data.channel || null,
    series: data.serie || data.series || null,
    createdDate: data.fecha_creacion || data.created_date || null,
    publishDate: data.fecha_publicacion || data.publish_date || null,
    frontmatter: data,
    body: content.trim(),
    filePath,
  };
}

function getAllPieces() {
  const contentDir = getContentDir();
  const pieces = [];

  for (const stage of STAGES) {
    const stageDir = path.join(contentDir, stage);
    if (!fs.existsSync(stageDir)) continue;

    const files = fs.readdirSync(stageDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        pieces.push(parseFile(path.join(stageDir, file)));
      } catch (err) {
        console.error(`Error parsing ${file}:`, err.message);
      }
    }
  }

  return pieces;
}

function getPiece(filename) {
  const contentDir = getContentDir();
  for (const stage of STAGES) {
    const filePath = path.join(contentDir, stage, filename);
    if (fs.existsSync(filePath)) {
      return parseFile(filePath);
    }
  }
  return null;
}

function movePiece(filename, fromStage, toStage) {
  const contentDir = getContentDir();
  const fromDir = STAGES.includes(fromStage) ? fromStage : Object.keys(STAGE_MAP).find(k => STAGE_MAP[k] === fromStage);
  const toDir = STAGES.includes(toStage) ? toStage : Object.keys(STAGE_MAP).find(k => STAGE_MAP[k] === toStage);

  if (!fromDir || !toDir) throw new Error(`Invalid stage: ${fromStage} -> ${toStage}`);

  const fromPath = path.join(contentDir, fromDir, filename);
  const toPath = path.join(contentDir, toDir, filename);

  if (!fs.existsSync(fromPath)) throw new Error(`File not found: ${fromPath}`);

  // Update frontmatter etapa field
  const raw = fs.readFileSync(fromPath, 'utf-8');
  const { data, content } = matter(raw);
  data.etapa = STAGE_MAP[toDir] || toDir;
  const updated = matter.stringify(content, data);

  // Ensure target directory exists
  const targetDir = path.join(contentDir, toDir);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  fs.writeFileSync(toPath, updated, 'utf-8');
  fs.unlinkSync(fromPath);

  return parseFile(toPath);
}

function updateFrontmatter(filename, updates) {
  const piece = getPiece(filename);
  if (!piece) throw new Error(`Piece not found: ${filename}`);

  const raw = fs.readFileSync(piece.filePath, 'utf-8');
  const { data, content } = matter(raw);

  Object.assign(data, updates);
  const updated = matter.stringify(content, data);
  fs.writeFileSync(piece.filePath, updated, 'utf-8');

  return parseFile(piece.filePath);
}

function getSprintFiles() {
  const sprintsDir = path.join(getContentDir(), 'sprints');
  if (!fs.existsSync(sprintsDir)) return [];

  return fs.readdirSync(sprintsDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();
}

function getCurrentSprint() {
  const files = getSprintFiles();
  if (files.length === 0) return null;

  const sprintsDir = path.join(getContentDir(), 'sprints');
  const filePath = path.join(sprintsDir, files[0]);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  return {
    filename: files[0],
    frontmatter: data,
    body: content.trim(),
    filePath,
  };
}

function updateSprintFile(filename, newContent) {
  const sprintsDir = path.join(getContentDir(), 'sprints');
  const filePath = path.join(sprintsDir, filename);
  if (!fs.existsSync(filePath)) throw new Error(`Sprint not found: ${filename}`);
  fs.writeFileSync(filePath, newContent, 'utf-8');
}

module.exports = {
  STAGES,
  STAGE_MAP,
  getContentDir,
  ensureDirectories,
  parseFile,
  getAllPieces,
  getPiece,
  movePiece,
  updateFrontmatter,
  getSprintFiles,
  getCurrentSprint,
  updateSprintFile,
};
