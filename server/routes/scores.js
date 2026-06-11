const express = require('express');
const debug = require('debug')('app:scores');
const router = express.Router();
const pool = require('../db');

const PASS_THRESHOLD = 60;

router.post('/', async (req, res) => {
  const { registration_id, judge_name, basic_movements, poomsae, sparring, breaking } = req.body;
  try {
    const [existing] = await pool.query(
      'SELECT id FROM exam_scores WHERE registration_id = ? AND judge_name = ?',
      [registration_id, judge_name]
    );
    if (existing.length > 0) {
      return res.status(400).json({ code: 1, message: '该评审已对此学员打过分' });
    }
    const [result] = await pool.query(
      `INSERT INTO exam_scores (registration_id, judge_name, basic_movements, poomsae, sparring, breaking)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [registration_id, judge_name, basic_movements, poomsae, sparring, breaking]
    );
    debug('评审打分: registration_id=%d, judge=%s', registration_id, judge_name);
    res.json({ code: 0, data: { id: result.insertId } });
  } catch (err) {
    debug('评审打分失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.get('/registration/:registrationId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM exam_scores WHERE registration_id = ? ORDER BY judge_name',
      [req.params.registrationId]
    );
    debug('获取报名评分: registration_id=%d, %d 条', req.params.registrationId, rows.length);
    res.json({ code: 0, data: rows });
  } catch (err) {
    debug('获取报名评分失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.post('/calculate/:registrationId', async (req, res) => {
  const regId = req.params.registrationId;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [scores] = await conn.query(
      'SELECT * FROM exam_scores WHERE registration_id = ?',
      [regId]
    );
    if (scores.length === 0) {
      await conn.rollback();
      return res.status(400).json({ code: 1, message: '尚无评分数据' });
    }
    let totalBasic = 0, totalPoomsae = 0, totalSparring = 0, totalBreaking = 0;
    for (const s of scores) {
      totalBasic += parseFloat(s.basic_movements);
      totalPoomsae += parseFloat(s.poomsae);
      totalSparring += parseFloat(s.sparring);
      totalBreaking += parseFloat(s.breaking);
    }
    const n = scores.length;
    const avgBasic = totalBasic / n;
    const avgPoomsae = totalPoomsae / n;
    const avgSparring = totalSparring / n;
    const avgBreaking = totalBreaking / n;
    const overallAvg = (avgBasic + avgPoomsae + avgSparring + avgBreaking) / 4;
    const passed = overallAvg >= PASS_THRESHOLD ? 1 : 0;
    await conn.query(
      'UPDATE exam_registrations SET passed = ? WHERE id = ?',
      [passed, regId]
    );
    if (passed) {
      const [regs] = await conn.query(
        `SELECT er.*, s.id AS student_id FROM exam_registrations er
         JOIN students s ON er.student_id = s.id WHERE er.id = ?`,
        [regId]
      );
      if (regs.length > 0) {
        const reg = regs[0];
        await conn.query(
          'UPDATE students SET current_rank = ? WHERE id = ?',
          [reg.target_rank, reg.student_id]
        );
        debug('学员 id=%d 晋级为 %s', reg.student_id, reg.target_rank);
      }
    }
    await conn.commit();
    debug('计算成绩: registration_id=%d, avg=%.2f, passed=%d', regId, overallAvg, passed);
    res.json({
      code: 0,
      data: {
        registration_id: regId,
        avg_basic: avgBasic.toFixed(2),
        avg_poomsae: avgPoomsae.toFixed(2),
        avg_sparring: avgSparring.toFixed(2),
        avg_breaking: avgBreaking.toFixed(2),
        overall_avg: overallAvg.toFixed(2),
        passed: !!passed,
        judge_count: n
      }
    });
  } catch (err) {
    await conn.rollback();
    debug('计算成绩失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  } finally {
    conn.release();
  }
});

router.post('/batch-calculate/:examId', async (req, res) => {
  const examId = req.params.examId;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [registrations] = await conn.query(
      'SELECT id FROM exam_registrations WHERE exam_id = ?',
      [examId]
    );
    const results = [];
    for (const reg of registrations) {
      const [scores] = await conn.query(
        'SELECT * FROM exam_scores WHERE registration_id = ?',
        [reg.id]
      );
      if (scores.length === 0) continue;
      let totalBasic = 0, totalPoomsae = 0, totalSparring = 0, totalBreaking = 0;
      for (const s of scores) {
        totalBasic += parseFloat(s.basic_movements);
        totalPoomsae += parseFloat(s.poomsae);
        totalSparring += parseFloat(s.sparring);
        totalBreaking += parseFloat(s.breaking);
      }
      const n = scores.length;
      const overallAvg = (totalBasic / n + totalPoomsae / n + totalSparring / n + totalBreaking / n) / 4;
      const passed = overallAvg >= PASS_THRESHOLD ? 1 : 0;
      await conn.query('UPDATE exam_registrations SET passed = ? WHERE id = ?', [passed, reg.id]);
      if (passed) {
        const [regs] = await conn.query(
          `SELECT er.*, s.id AS student_id FROM exam_registrations er
           JOIN students s ON er.student_id = s.id WHERE er.id = ?`,
          [reg.id]
        );
        if (regs.length > 0) {
          await conn.query('UPDATE students SET current_rank = ? WHERE id = ?', [regs[0].target_rank, regs[0].student_id]);
        }
      }
      results.push({ registration_id: reg.id, overall_avg: overallAvg.toFixed(2), passed: !!passed });
    }
    await conn.query('UPDATE exams SET status = ? WHERE id = ?', ['completed', examId]);
    await conn.commit();
    debug('批量计算成绩: exam_id=%d, %d 条记录', examId, results.length);
    res.json({ code: 0, data: results });
  } catch (err) {
    await conn.rollback();
    debug('批量计算成绩失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
