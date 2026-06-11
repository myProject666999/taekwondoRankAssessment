import { useState, useEffect } from 'react';
import api from '../api';

export default function Certificates() {
  const [certs, setCerts] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [verifyNo, setVerifyNo] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [previewCert, setPreviewCert] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const params = {};
    if (keyword) params.keyword = keyword;
    const res = await api.get('/certificates', { params });
    setCerts(res.data || []);
  }

  async function handleVerify() {
    if (!verifyNo) return;
    try {
      const res = await api.get(`/certificates/verify/${verifyNo}`);
      setVerifyResult(res.data);
    } catch {
      setVerifyResult({ valid: false, message: '证书不存在' });
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>证书管理</h2>
        <p>查看已发放的段位证书，支持验证真伪</p>
      </div>

      <div className="card">
        <div className="card-title"><span>证书验证</span></div>
        <div className="toolbar">
          <input placeholder="输入证书编号" value={verifyNo} onChange={e => setVerifyNo(e.target.value)} style={{ width: 300 }} />
          <button className="btn btn-primary" onClick={handleVerify}>验证</button>
        </div>
        {verifyResult && (
          <div style={{ padding: 16, background: verifyResult.valid ? '#f6ffed' : '#fff2f0', borderRadius: 8, marginBottom: 16 }}>
            {verifyResult.valid ? (
              <div>
                <p style={{ color: '#52c41a', fontWeight: 700, fontSize: 16 }}>✅ 证书有效</p>
                <p>证书编号: {verifyResult.certificate_no}</p>
                <p>学员姓名: {verifyResult.student_name}</p>
                <p>段位: {verifyResult.rank}</p>
                <p>颁发日期: {verifyResult.issue_date}</p>
              </div>
            ) : (
              <p style={{ color: '#ff4d4f', fontWeight: 700 }}>❌ {verifyResult.message || '证书无效'}</p>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title"><span>证书列表</span></div>
        <div className="toolbar">
          <input placeholder="搜索证书编号或姓名" value={keyword} onChange={e => setKeyword(e.target.value)} />
          <button className="btn btn-outline" onClick={load}>查询</button>
        </div>
        <table>
          <thead><tr><th>证书编号</th><th>学员姓名</th><th>段位</th><th>颁发日期</th><th>操作</th></tr></thead>
          <tbody>
            {certs.map(c => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'monospace' }}>{c.certificate_no}</td>
                <td>{c.student_name}</td>
                <td>{c.rank}</td>
                <td>{c.issue_date}</td>
                <td><button className="btn btn-sm btn-primary" onClick={() => setPreviewCert(c)}>查看证书</button></td>
              </tr>
            ))}
            {certs.length === 0 && <tr><td colSpan={5} className="empty-state">暂无证书数据</td></tr>}
          </tbody>
        </table>
      </div>

      {previewCert && (
        <div className="modal-overlay" onClick={() => setPreviewCert(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 640 }}>
            <div className="certificate-preview">
              <h2>🥋 跆拳道段位证书</h2>
              <div className="cert-no">编号: {previewCert.certificate_no}</div>
              <div className="cert-body">
                <p>兹证明 <strong>{previewCert.student_name}</strong></p>
                <p>通过段位考核，晋升为</p>
                <p style={{ fontSize: 24, color: '#8b6914', fontWeight: 700 }}>{previewCert.rank}</p>
                <p style={{ marginTop: 12, fontSize: 14, color: '#999' }}>颁发日期: {previewCert.issue_date}</p>
              </div>
              {previewCert.qr_code && (
                <div className="qr-section">
                  <img src={previewCert.qr_code} alt="验证二维码" />
                  <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>扫描二维码验证真伪</p>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setPreviewCert(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
