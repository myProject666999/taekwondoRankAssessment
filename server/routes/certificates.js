const express = require('express');
const debug = require('debug')('app:certificates');
const router = express.Router();
const pool = require('../db');
const QRCode = require('qrcode');

function generateCertNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TKD-${y}${m}${d}-${rand}`;
}

router.post('/generate/:registrationId', async (req, res) => {
  const regId = req.params.registrationId;
  try {
    const [regs] = await pool.query(
      `SELECT er.*, s.name AS student_name FROM exam_registrations er
       JOIN students s ON er.student_id = s.id WHERE er.id = ?`,
      [regId]
    );
    if (regs.length === 0) return res.status(404).json({ code: 1, message: '报名记录不存在' });
    const reg = regs[0];
    if (reg.passed !== 1) return res.status(400).json({ code: 1, message: '学员未通过考核，无法发放证书' });
    const [existing] = await pool.query(
      'SELECT * FROM certificates WHERE registration_id = ?',
      [regId]
    );
    if (existing.length > 0) {
      debug('证书已存在: cert_no=%s', existing[0].certificate_no);
      return res.json({ code: 0, data: existing[0] });
    }
    const certNo = generateCertNo();
    const verifyUrl = `http://localhost:3001/api/certificates/verify/${certNo}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);
    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      'INSERT INTO certificates (registration_id, certificate_no, rank, student_name, issue_date, qr_code) VALUES (?, ?, ?, ?, ?, ?)',
      [regId, certNo, reg.target_rank, reg.student_name, today, qrDataUrl]
    );
    debug('生成证书: cert_no=%s, student=%s, rank=%s', certNo, reg.student_name, reg.target_rank);
    res.json({
      code: 0,
      data: { certificate_no: certNo, rank: reg.target_rank, student_name: reg.student_name, issue_date: today, qr_code: qrDataUrl }
    });
  } catch (err) {
    debug('生成证书失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.get('/verify/:certNo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM certificates WHERE certificate_no = ?',
      [req.params.certNo]
    );
    if (rows.length === 0) return res.status(404).json({ code: 1, message: '证书不存在，可能为伪造' });
    debug('验证证书: cert_no=%s, 有效', req.params.certNo);
    res.json({
      code: 0,
      data: {
        valid: true,
        certificate_no: rows[0].certificate_no,
        student_name: rows[0].student_name,
        rank: rows[0].rank,
        issue_date: rows[0].issue_date
      }
    });
  } catch (err) {
    debug('验证证书失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { keyword } = req.query;
    let sql = 'SELECT * FROM certificates WHERE 1=1';
    const params = [];
    if (keyword) {
      sql += ' AND (certificate_no LIKE ? OR student_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    sql += ' ORDER BY id DESC';
    const [rows] = await pool.query(sql, params);
    debug('获取证书列表: %d 条', rows.length);
    res.json({ code: 0, data: rows });
  } catch (err) {
    debug('获取证书列表失败: %s', err.message);
    res.status(500).json({ code: 1, message: err.message });
  }
});

module.exports = router;
