const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');

// GET /api/gamification — Estado completo de gamificación
router.get('/', (req, res) => {
  try {
    const db = getDb();

    // Total XP
    const xpRow = db.prepare('SELECT COALESCE(SUM(xp), 0) as total FROM activities').get();
    const totalXP = xpRow.total;

    // Level calculation
    const levels = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];
    const titles = ['Aprendiz', 'Creador', 'Editor', 'Productor', 'Director', 'Estratega', 'Maestro', 'Leyenda', 'Máquina', 'Nazho Mode'];
    let level = 1;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (totalXP >= levels[i]) {
        level = i + 1;
        break;
      }
    }
    const currentLevelXP = levels[level - 1] || 0;
    const nextLevelXP = levels[level] || levels[levels.length - 1];

    // Streaks
    const streaks = db.prepare('SELECT * FROM streaks').all();

    // Recent activities (last 30)
    const recentActivities = db.prepare(
      'SELECT * FROM activities ORDER BY created_at DESC LIMIT 30'
    ).all();

    // Contribution graph data (last 365 days)
    const contributions = db.prepare(
      `SELECT date, COUNT(*) as count, SUM(xp) as xp
       FROM activities
       WHERE date >= date('now', '-365 days')
       GROUP BY date`
    ).all();

    // Achievements
    const achievements = db.prepare('SELECT * FROM achievements').all();

    res.json({
      totalXP,
      level,
      title: titles[level - 1] || titles[0],
      currentLevelXP,
      nextLevelXP,
      xpProgress: nextLevelXP > currentLevelXP
        ? Math.round(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
        : 100,
      streaks: streaks.reduce((acc, s) => {
        acc[s.type] = { current: s.current, best: s.best, lastActive: s.last_active_date };
        return acc;
      }, {}),
      recentActivities,
      contributions,
      achievements,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
