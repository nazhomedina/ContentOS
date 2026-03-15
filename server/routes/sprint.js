const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { getCurrentSprint, updateSprintFile, getContentDir } = require('../services/fileParser');

// GET /api/sprint — Sprint actual
router.get('/', (req, res) => {
  try {
    const sprint = getCurrentSprint();
    if (!sprint) return res.json({ exists: false });

    // Parse checklist items from body (lines starting with - [ ] or - [x])
    const lines = sprint.body.split('\n');
    const tasks = [];
    for (const line of lines) {
      const unchecked = line.match(/^-\s*\[\s*\]\s*(.+)/);
      const checked = line.match(/^-\s*\[x\]\s*(.+)/i);
      if (unchecked) tasks.push({ text: unchecked[1].trim(), done: false });
      else if (checked) tasks.push({ text: checked[1].trim(), done: true });
    }

    const total = tasks.length;
    const completed = tasks.filter(t => t.done).length;

    res.json({
      exists: true,
      filename: sprint.filename,
      frontmatter: sprint.frontmatter,
      body: sprint.body,
      tasks,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      total,
      completed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/sprint — Actualizar checklist (toggle task)
router.patch('/', (req, res) => {
  try {
    const sprint = getCurrentSprint();
    if (!sprint) return res.status(404).json({ error: 'No sprint found' });

    const { taskIndex, done } = req.body;
    const lines = sprint.body.split('\n');
    let taskCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const isTask = lines[i].match(/^-\s*\[[ x]\]\s*.+/i);
      if (isTask) {
        if (taskCount === taskIndex) {
          const text = lines[i].replace(/^-\s*\[[ x]\]\s*/i, '');
          lines[i] = done ? `- [x] ${text}` : `- [ ] ${text}`;
          break;
        }
        taskCount++;
      }
    }

    const newBody = lines.join('\n');
    const raw = fs.readFileSync(sprint.filePath, 'utf-8');
    const { data } = matter(raw);
    const updated = matter.stringify(newBody, data);
    updateSprintFile(sprint.filename, updated);

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/sprint/new — Crear nuevo sprint
router.post('/new', (req, res) => {
  try {
    const sprintsDir = path.join(getContentDir(), 'sprints');
    if (!fs.existsSync(sprintsDir)) fs.mkdirSync(sprintsDir, { recursive: true });

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    const fmt = d => d.toISOString().split('T')[0];
    const filename = `sprint-${fmt(weekStart)}.md`;
    const filePath = path.join(sprintsDir, filename);

    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'Sprint for this week already exists' });
    }

    const template = matter.stringify(
      `## Objetivos de la semana

- [ ] Objetivo 1
- [ ] Objetivo 2
- [ ] Objetivo 3

## Producción

- [ ] Pieza 1
- [ ] Pieza 2

## Publicación

- [ ] Publicar pieza 1
- [ ] Publicar pieza 2
`,
      {
        titulo: `Sprint ${fmt(weekStart)} al ${fmt(weekEnd)}`,
        semana_inicio: fmt(weekStart),
        semana_fin: fmt(weekEnd),
        estado: 'activo',
      }
    );

    fs.writeFileSync(filePath, template, 'utf-8');
    res.json({ filename, created: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
