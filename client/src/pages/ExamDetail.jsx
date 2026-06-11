import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

export default function ExamDetail() {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [scoreModal, setScoreModal] = useState(null);
  const [scoreForm, setScoreForm] = useState({ judge_name: '', basic_movements: 0, poomsae: 0, sparring: 0, breaking: 0 });

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    const [examRes, regRes, groupRes, stuRes] = await Promise.all([
      api.get(`/exams/${id}`),
      api.get(`/exams/${id}/registrations`),
      api.get(`/exams/${id}/groups`),
      api.get('/students', { params: { status: 'active' } })
    ]);
    setExam(examRes.data);
    setRegistrations(regRes.data || []);
    setGroups(groupRes.data || []);
    setStudents(stuRes.data || []);
  }

  async function handleRegister() {
    if (selectedStudents.length === 0) return alert('请选择学员');
    const res = await api.post(`/exams/${id}/register`, { student_ids: selectedStudents });
    const { registered, rejected } = res.data;
    let msg = `成功报名 ${registered.length} 人`;
    if (rejected.length > 0) {
      msg += `\n失败 ${rejected.length} 人:\n` + rejected.map(r => `${r.name || r.student_id}: ${r.reason}`).join('\n');
    }
    alert(msg);
    setSelectedStudents([]);
    setShowRegister(false);
    loadAll();
  }

  async function handleScore() {
    await api.post('/scores', { ...scoreForm, registration_id: scoreModal.id, basic_movements: Number(scoreForm.basic_movements), poomsae: Number(scoreForm.poomsae), sparring: Number(scoreForm.sparring), breaking: Number(scoreForm.breaking) });
    setScoreModal(null);
    loadAll();
  }

  async function calculateOne(regId) {
    const res = await api.post(`/scores/calculate/${regId}`);
    const d = res.data;
    alert(`平均分: ${d.overall_avg}\n${d.passed ? '✅ 通过' : '❌ 未通过'}`);
    loadAll();
  }

  async function batchCalculate() {
    if (!confirm('确定批量计算所有成绩？')) return;
    const res = await api.post(`/scores/batch-calculate/${id}`);
    alert(`批量计算完成，共 ${res.data.length} 条记录`);
    loadAll();
  }

  async function generateCert(regId) {
    const res = await api.post(`/certificates/generate/${regId}`);
    alert(`证书已生成: ${res.data.certificate_no}`);
    loadAll();
  }

  if (!exam) return <div>加载中...</div>;

  const registeredIds = registrations.map(r => r.student_id);
  const eligibleStudents = students.filter(s => !registeredIds.includes(s.id));

  return (
    <div>
      <div className="page-header">
        <h2>{exam.name}</h2>
        <p>考核日期: {exam.exam_date} | 状态: {exam.status === 'pending' ? '待开始' : exam.status === 'in_progress' ? '进行中' : '已完成'}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{registrations.length}</div><div className="stat-label">报名人数</div></div>
        <div className="stat-card"><div className="stat-value">{groups.length}</div><div className="stat-label">分组数</div></div>
        <div className="stat-card"><div className="stat-value">{registrations.filter(r => r.passed === 1).length}</div><div className="stat-label">已通过</div></div>
        <div className="stat-card"><div className="stat-value">{registrations.filter(r => r.passed === 0).length}</div><div className="stat-label">未通过</div></div>
      </div>

      <div className="card">
        <div className="card-title">
          <span>报名与分组</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => setShowRegister(!showRegister)}>+ 报名学员</button>
            <button className="btn btn-success" onClick={batchCalculate}>批量计算成绩</button>
          </div>
        </div>

        {showRegister && (
          <div style={{ marginBottom: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
            <h4 style={{ marginBottom: 12 }}>选择学员报名（系统自动验证前置课时）</h4>
            {eligibleStudents.length === 0 ? <p style={{ color: '#999' }}>没有可报名的学员</p> : (
              <div className="checkbox-group">
                {eligibleStudents.map(s => (
                  <div key={s.id} className="checkbox-item">
                    <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={e => {
                      setSelectedStudents(e.target.checked ? [...selectedStudents, s.id] : selectedStudents.filter(id => id !== s.id));
                    }} />
                    <span>{s.name}</span>
                    <span className="badge badge-pending" style={{ marginLeft: 8 }}>{s.current_rank}</span>
                    <span style={{ marginLeft: 8, color: '#999', fontSize: 13 }}>{s.total_hours}课时</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleRegister} disabled={selectedStudents.length === 0}>
                确认报名 ({selectedStudents.length}人)
              </button>
            </div>
          </div>
        )}

        {groups.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            {groups.map(g => (
              <span key={g.group_name} className="badge badge-pending" style={{ fontSize: 13, padding: '4px 12px' }}>
                {g.group_name} ({g.count}人)
              </span>
            ))}
          </div>
        )}

        <table>
          <thead>
            <tr><th>学员</th><th>当前段位</th><th>目标段位</th><th>分组</th><th>成绩</th><th>操作</th></tr>
          </thead>
          <tbody>
            {registrations.map(r => (
              <tr key={r.id}>
                <td>{r.student_name}</td>
                <td><span className="badge badge-pending">{r.current_rank}</span></td>
                <td><span className="badge badge-pass">{r.target_rank}</span></td>
                <td>{r.group_name}</td>
                <td>
                  {r.passed === 1 && <span className="badge badge-pass">通过</span>}
                  {r.passed === 0 && <span className="badge badge-fail">未通过</span>}
                  {r.passed === null && <span className="badge badge-pending">待评</span>}
                </td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => setScoreModal({ id: r.id, student_name: r.student_name })}>打分</button>
                  <button className="btn btn-sm btn-warning" onClick={() => calculateOne(r.id)} style={{ marginLeft: 4 }}>计算</button>
                  {r.passed === 1 && <button className="btn btn-sm btn-success" onClick={() => generateCert(r.id)} style={{ marginLeft: 4 }}>发证</button>}
                </td>
              </tr>
            ))}
            {registrations.length === 0 && <tr><td colSpan={6} className="empty-state">暂无报名记录</td></tr>}
          </tbody>
        </table>
      </div>

      {scoreModal && (
        <div className="modal-overlay" onClick={() => setScoreModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>评审打分 - {scoreModal.student_name}</h3>
            <div className="form-group"><label>评审姓名</label><input value={scoreForm.judge_name} onChange={e => setScoreForm({ ...scoreForm, judge_name: e.target.value })} placeholder="如：李教练" /></div>
            <div className="form-row">
              <div className="form-group"><label>基本动作 (0-100)</label><input type="number" min="0" max="100" value={scoreForm.basic_movements} onChange={e => setScoreForm({ ...scoreForm, basic_movements: e.target.value })} /></div>
              <div className="form-group"><label>品势 (0-100)</label><input type="number" min="0" max="100" value={scoreForm.poomsae} onChange={e => setScoreForm({ ...scoreForm, poomsae: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>对练 (0-100)</label><input type="number" min="0" max="100" value={scoreForm.sparring} onChange={e => setScoreForm({ ...scoreForm, sparring: e.target.value })} /></div>
              <div className="form-group"><label>击破 (0-100)</label><input type="number" min="0" max="100" value={scoreForm.breaking} onChange={e => setScoreForm({ ...scoreForm, breaking: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setScoreModal(null)}>取消</button>
              <button className="btn btn-primary" onClick={handleScore}>提交评分</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
