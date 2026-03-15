const express = require('express');
const router = express.Router();
const { getAllPieces, getPiece, updateFrontmatter } = require('../services/fileParser');

// GET /api/content — Lista todas las piezas
router.get('/', (req, res) => {
  try {
    const pieces = getAllPieces();

    // Filtros opcionales
    let filtered = pieces;
    if (req.query.stage) filtered = filtered.filter(p => p.stage === req.query.stage);
    if (req.query.format) filtered = filtered.filter(p => p.format === req.query.format);
    if (req.query.pillar) filtered = filtered.filter(p => p.pillar === req.query.pillar);
    if (req.query.channel) filtered = filtered.filter(p => p.channel === req.query.channel);
    if (req.query.series) filtered = filtered.filter(p => p.series === req.query.series);
    if (req.query.search) {
      const q = req.query.search.toLowerCase();
      filtered = filtered.filter(p => p.title.toLowerCase().includes(q));
    }

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content/:filename — Detalle de una pieza
router.get('/:filename', (req, res) => {
  try {
    const piece = getPiece(req.params.filename);
    if (!piece) return res.status(404).json({ error: 'Pieza no encontrada' });
    res.json(piece);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/content/:filename — Editar frontmatter
router.patch('/:filename', (req, res) => {
  try {
    const updated = updateFrontmatter(req.params.filename, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
