const express = require('express');
const router = express.Router();
const { getAllPieces, updateFrontmatter } = require('../services/fileParser');

// GET /api/calendar — Piezas con fecha de publicación
router.get('/', (req, res) => {
  try {
    const pieces = getAllPieces().filter(p => p.publishDate);

    // Opcional: filtrar por mes
    let filtered = pieces;
    if (req.query.month) {
      filtered = filtered.filter(p => p.publishDate && p.publishDate.startsWith(req.query.month));
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/calendar/:filename — Cambiar fecha de publicación
router.patch('/:filename', (req, res) => {
  try {
    const { fecha_publicacion } = req.body;
    if (!fecha_publicacion) {
      return res.status(400).json({ error: 'fecha_publicacion is required' });
    }
    const updated = updateFrontmatter(req.params.filename, { fecha_publicacion });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
