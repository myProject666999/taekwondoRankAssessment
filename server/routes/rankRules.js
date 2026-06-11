const express = require('express');
const debug = require('debug')('app:rank-rules');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rank_rules ORDER BY rank_order');
    debug('获取段位规则: %d 条', rows.length);
    res.json({ code: 0, data: rows });
  } catch (err) {
    debug('获取段位规则失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.get('/check-eligibility', async (req, res) => {
  const { student_id } = req.query;
  if (!student_id) return res.status(400).json({ code: 1, message: '缺少student_id' });
  try {
    const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [student_id]);
    if (students.length === 0) return res.status(404).json({ code: 1, message: '学员不存在' });
    const student = students[0];
    const [rules] = await pool.query(
      'SELECT * FROM rank_rules WHERE current_rank = ?',
      [student.current_rank]
    );
    if (rules.length === 0) return res.json({ code: 0, data: { eligible: false, message: '已达最高段位' } });
    const rule = rules[0];
    const eligible = student.total_hours >= rule.required_hours;
    debug('学员 id=%d 升级资格检查: current=%s, target=%s, hours=%d/%d, eligible=%s',
      student_id, student.current_rank, rule.target_rank, student.total_hours, rule.required_hours, eligible);
    res.json({
      code: 0,
      data: {
        eligible,
        current_rank: student.current_rank,
        target_rank: rule.target_rank,
        current_hours: student.total_hours,
        required_hours: rule.required_hours,
        shortage: eligible ? 0 : rule.required_hours - student.total_hours
      }
    });
  } catch (err) {
    debug('升级资格检查失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { current_rank, target_rank, required_hours, rank_order } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO rank_rules (current_rank, target_rank, required_hours, rank_order) VALUES (?, ?, ?, ?)',
      [current_rank, target_rank, required_hours, rank_order]
    );
    debug('新增段位规则: id=%d', result.insertId);
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    debug('新增段位规则失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { current_rank, target_rank, required_hours, rank_order } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE rank_rules SET current_rank=?, target_rank=?, required_hours=?, rank_order=? WHERE id=?',
      [current_rank, target_rank, required_hours, rank_order, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ code: 1, message: '规则不存在' });
    debug('更新段位规则: id=%d', req.params.id);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    debug('更新段位规则失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM rank_rules WHERE id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: 1, message: '规则不存在' });
    debug('删除段位规则: id=%d', req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    debug('删除段位规则失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

module.exports = router;
