const express = require('express');
const debug = require('debug')('app:coaches');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coaches ORDER BY id');
    debug('获取教练列表: %d 条', rows.length);
    res.json({ code: 0, data: rows });
  } catch (err) {
    debug('获取教练列表失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coaches WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 1, message: '教练不存在' });
    debug('获取教练详情: id=%d', req.params.id);
    res.json({ code: 0, data: rows[0] });
  } catch (err) {
    debug('获取教练详情失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, phone, rank } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO coaches (name, phone, rank) VALUES (?, ?, ?)',
      [name, phone, rank]
    );
    debug('新增教练: id=%d, name=%s', result.insertId, name);
    res.json({ code: 0, data: { id: result.insertId, name, phone, rank } });
  } catch (err) {
    debug('新增教练失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, phone, rank } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE coaches SET name=?, phone=?, rank=? WHERE id=?',
      [name, phone, rank, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ code: 1, message: '教练不存在' });
    debug('更新教练: id=%d', req.params.id);
    res.json({ code: 0, message: '更新成功' });
  } catch (err) {
    debug('更新教练失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM coaches WHERE id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: 1, message: '教练不存在' });
    debug('删除教练: id=%d', req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    debug('删除教练失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

module.exports = router;
