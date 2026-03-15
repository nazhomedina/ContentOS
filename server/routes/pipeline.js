const express = require('express');
const router = express.Router();
const { movePiece } = require('../services/fileParser');
const { getDb } = require('../db/init');

// POST /api/pipeline/move — Mover pieza entre etapas
router.post('/move', (req, res) => {
  try {
    const { filename, from, to } = req.body;
    if (!filename || !from || !to) {
      return res.status(400).json({ error: 'filename, from, and to are required' });
    }

    const piece = movePiece(filename, from, to);

    // Registrar actividad para gamificación
    const xpMap = {
      idea: 5,
      redaccion: 10,
      produccion: 25,
      buffer: 30,
      publicado: 20,
    };
    const xp = xpMap[to] || 10;
    const action = `move_to_${to}`;
    const today = new Date().toISOString().split('T')[0];

    const db = getDb();
    db.prepare(
      'INSERT INTO activities (date, action, filename, xp) VALUES (?, ?, ?, ?)'
    ).run(today, action, filename, xp);

    res.json({ piece, xp, action });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
