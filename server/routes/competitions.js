const express = require('express');
const debug = require('debug')('app:competitions');
const router = express.Router();
const pool = require('../db');

const POINTS_MAP = {
  national: { 1: 100, 2: 80, 3: 60, 4: 40, 5: 20 },
  provincial: { 1: 50, 2: 40, 3: 30, 4: 20, 5: 10 },
  municipal: { 1: 25, 2: 20, 3: 15, 4: 10, 5: 5 }
};

function calculatePoints(level, placement) {
  const map = POINTS_MAP[level];
  if (!map) return 0;
  return map[placement] || 0;
}

router.get('/', async (req, res) => {
  try {
    const { student_id, year, level } = req.query;
    let sql = `SELECT cp.*, s.name AS student_name, s.current_rank
               FROM competition_points cp
               JOIN students s ON cp.student_id = s.id WHERE 1=1`;
    const params = [];
    if (student_id) { sql += ' AND cp.student_id = ?'; params.push(student_id); }
    if (year) { sql += ' AND cp.year = ?'; params.push(year); }
    if (level) { sql += ' AND cp.competition_level = ?'; params.push(level); }
    sql += ' ORDER BY cp.competition_date DESC';
    const [rows] = await pool.query(sql, params);
    debug('获取比赛积分: %d 条', rows.length);
    res.json({ code: 0, data: rows });
  } catch (err) {
    debug('获取比赛积分失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { student_id, competition_name, competition_level, competition_date, placement, year } = req.body;
  if (!competition_date) return res.status(400).json({ code: 1, message: '比赛日期不能为空' });
  const cd = competition_date.slice(0, 10);
  const points = calculatePoints(competition_level, placement);
  try {
    const [result] = await pool.query(
      `INSERT INTO competition_points (student_id, competition_name, competition_level, competition_date, placement, points, year)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [student_id, competition_name, competition_level, cd, placement, points, year]
    );
    debug('新增比赛积分: id=%d, student_id=%d, points=%d', result.insertId, student_id, points);
    res.json({ code: 0, data: { id: result.insertId, points } });
  } catch (err) {
    debug('新增比赛积分失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM competition_points WHERE id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: 1, message: '记录不存在' });
    debug('删除比赛积分: id=%d', req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    debug('删除比赛积分失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.get('/ranking', async (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ code: 1, message: '请指定年份' });
  try {
    const [rows] = await pool.query(
      `SELECT s.id AS student_id, s.name AS student_name, s.current_rank,
              SUM(cp.points) AS total_points,
              COUNT(cp.id) AS competition_count
       FROM students s
       LEFT JOIN competition_points cp ON s.id = cp.student_id AND cp.year = ?
       WHERE s.status = 'active'
       GROUP BY s.id, s.name, s.current_rank
       HAVING total_points > 0
       ORDER BY total_points DESC`,
      [year]
    );
    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1, total_points: parseFloat(r.total_points) }));
    debug('获取年度排名: year=%s, %d 人', year, ranked.length);
    res.json({ code: 0, data: ranked });
  } catch (err) {
    debug('获取年度排名失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

module.exports = router;
