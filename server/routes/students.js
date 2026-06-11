const express = require('express');
const debug = require('debug')('app:students');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { rank, coach_id, status, keyword } = req.query;
    let sql = `SELECT s.*, c.name AS coach_name FROM students s LEFT JOIN coaches c ON s.coach_id = c.id WHERE 1=1`;
    const params = [];
    if (rank) { sql += ' AND s.current_rank = ?'; params.push(rank); }
    if (coach_id) { sql += ' AND s.coach_id = ?'; params.push(coach_id); }
    if (status) { sql += ' AND s.status = ?'; params.push(status); }
    if (keyword) { sql += ' AND s.name LIKE ?'; params.push(`%${keyword}%`); }
    sql += ' ORDER BY s.id';
    const [rows] = await pool.query(sql, params);
    debug('获取学员列表: %d 条', rows.length);
    res.json({ code: 0, data: rows });
  } catch (err) {
    debug('获取学员列表失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, c.name AS coach_name FROM students s LEFT JOIN coaches c ON s.coach_id = c.id WHERE s.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ code: 1, message: '学员不存在' });
    debug('获取学员详情: id=%d', req.params.id);
    res.json({ code: 0, data: rows[0] });
  } catch (err) {
    debug('获取学员详情失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, gender, birth_date, phone, current_rank, enrollment_date, total_hours, coach_id } = req.body;
  const bd = birth_date ? birth_date.slice(0, 10) : null;
  const ed = enrollment_date ? enrollment_date.slice(0, 10) : null;
  try {
    const [result] = await pool.query(
      `INSERT INTO students (name, gender, birth_date, phone, current_rank, enrollment_date, total_hours, coach_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, gender, bd, phone, current_rank || '白带', ed, total_hours || 0, coach_id]
    );
    debug('新增学员: id=%d, name=%s', result.insertId, name);
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    debug('新增学员失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, gender, birth_date, phone, current_rank, enrollment_date, total_hours, coach_id, status } = req.body;
  const bd = birth_date ? birth_date.slice(0, 10) : null;
  const ed = enrollment_date ? enrollment_date.slice(0, 10) : null;
  try {
    const [result] = await pool.query(
      `UPDATE students SET name=?, gender=?, birth_date=?, phone=?, current_rank=?,
       enrollment_date=?, total_hours=?, coach_id=?, status=? WHERE id=?`,
      [name, gender, bd, phone, current_rank, ed, total_hours, coach_id, status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ code: 1, message: '学员不存在' });
    debug('更新学员: id=%d', req.params.id);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    debug('更新学员失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM students WHERE id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: 1, message: '学员不存在' });
    debug('删除学员: id=%d', req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    debug('删除学员失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.post('/:id/add-hours', async (req, res) => {
  const { hours } = req.body;
  if (!hours || hours <= 0) return res.status(400).json({ code: 1, message: '课时数必须大于0' });
  try {
    const [result] = await pool.query(
      'UPDATE students SET total_hours = total_hours + ? WHERE id = ?',
      [hours, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ code: 1, message: '学员不存在' });
    const [rows] = await pool.query('SELECT total_hours FROM students WHERE id = ?', [req.params.id]);
    debug('学员 id=%d 增加 %d 课时, 当前总课时=%d', req.params.id, hours, rows[0].total_hours);
    res.json({ code: 0, data: { total_hours: rows[0].total_hours } });
  } catch (err) {
    debug('增加课时失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

module.exports = router;
