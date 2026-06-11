const express = require('express');
const debug = require('debug')('app:exams');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM exams WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY exam_date DESC';
    const [rows] = await pool.query(sql, params);
    debug('获取考核列表: %d 条', rows.length);
    res.json({ code: 0, data: rows });
  } catch (err) {
    debug('获取考核列表失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM exams WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 1, message: '考核不存在' });
    debug('获取考核详情: id=%d', req.params.id);
    res.json({ code: 0, data: rows[0] });
  } catch (err) {
    debug('获取考核详情失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, exam_date, description } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO exams (name, exam_date, description) VALUES (?, ?, ?)',
      [name, exam_date, description]
    );
    debug('创建考核: id=%d, name=%s', result.insertId, name);
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    debug('创建考核失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, exam_date, status, description } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE exams SET name=?, exam_date=?, status=?, description=? WHERE id=?',
      [name, exam_date, status, description, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ code: 1, message: '考核不存在' });
    debug('更新考核: id=%d', req.params.id);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    debug('更新考核失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM exams WHERE id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: 1, message: '考核不存在' });
    debug('删除考核: id=%d', req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    debug('删除考核失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.post('/:id/register', async (req, res) => {
  const { student_ids } = req.body;
  const examId = req.params.id;
  if (!Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ code: 1, message: '请选择要报名的学员' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [exams] = await conn.query('SELECT * FROM exams WHERE id = ?', [examId]);
    if (exams.length === 0) {
      await conn.rollback();
      return res.status(404).json({ code: 1, message: '考核不存在' });
    }
    const registered = [];
    const rejected = [];
    for (const sid of student_ids) {
      const [students] = await conn.query('SELECT * FROM students WHERE id = ?', [sid]);
      if (students.length === 0) { rejected.push({ student_id: sid, reason: '学员不存在' }); continue; }
      const student = students[0];
      const [rules] = await conn.query(
        'SELECT * FROM rank_rules WHERE current_rank = ?',
        [student.current_rank]
      );
      if (rules.length === 0) { rejected.push({ student_id: sid, name: student.name, reason: '已达最高段位' }); continue; }
      const rule = rules[0];
      if (student.total_hours < rule.required_hours) {
        rejected.push({
          student_id: sid, name: student.name,
          reason: `课时不足: ${student.total_hours}/${rule.required_hours}`
        });
        continue;
      }
      const [existing] = await conn.query(
        'SELECT id FROM exam_registrations WHERE exam_id = ? AND student_id = ?',
        [examId, sid]
      );
      if (existing.length > 0) { rejected.push({ student_id: sid, name: student.name, reason: '已报名' }); continue; }
      const groupName = rule.target_rank + '组';
      await conn.query(
        'INSERT INTO exam_registrations (exam_id, student_id, target_rank, group_name) VALUES (?, ?, ?, ?)',
        [examId, sid, rule.target_rank, groupName]
      );
      registered.push({ student_id: sid, name: student.name, target_rank: rule.target_rank, group_name: groupName });
    }
    await conn.commit();
    debug('考核报名: exam_id=%d, 成功=%d, 失败=%d', examId, registered.length, rejected.length);
    res.json({ code: 0, data: { registered, rejected } });
  } catch (err) {
    await conn.rollback();
    debug('考核报名失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  } finally {
    conn.release();
  }
});

router.get('/:id/registrations', async (req, res) => {
  try {
    const { group_name, passed } = req.query;
    let sql = `SELECT er.*, s.name AS student_name, s.current_rank, s.phone AS student_phone
               FROM exam_registrations er
               JOIN students s ON er.student_id = s.id
               WHERE er.exam_id = ?`;
    const params = [req.params.id];
    if (group_name) { sql += ' AND er.group_name = ?'; params.push(group_name); }
    if (passed !== undefined && passed !== '') { sql += ' AND er.passed = ?'; params.push(passed === '1' ? 1 : 0); }
    sql += ' ORDER BY er.group_name, er.id';
    const [rows] = await pool.query(sql, params);
    debug('获取考核报名列表: exam_id=%d, %d 条', req.params.id, rows.length);
    res.json({ code: 0, data: rows });
  } catch (err) {
    debug('获取考核报名列表失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.get('/:id/groups', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT group_name, COUNT(*) AS count FROM exam_registrations WHERE exam_id = ? GROUP BY group_name ORDER BY group_name`,
      [req.params.id]
    );
    debug('获取考核分组: exam_id=%d, %d 个组', req.params.id, rows.length);
    res.json({ code: 0, data: rows });
  } catch (err) {
    debug('获取考核分组失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

module.exports = router;
