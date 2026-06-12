import { useState, useEffect } from 'react';
import api from '../api';

const LEVEL_MAP = { national: '全国赛', provincial: '省赛', municipal: '市赛' };

const emptyForm = { student_id: '', competition_name: '', competition_level: 'national', competition_date: '', placement: 1, year: new Date().getFullYear() };

export default function Competitions() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); loadStudents(); }, []);

  async function load() {
    const res = await api.get('/competitions');
    setRecords(res.data || []);
  }

  async function loadStudents() {
    const res = await api.get('/students', { params: { status: 'active' } });
    setStudents(res.data || []);
  }

  async function handleSave() {
    if (!form.student_id || !form.competition_name || !form.competition_date) {
      return alert('请填写学员、比赛名称和比赛日期');
    }
    const payload = {
      ...form,
      student_id: Number(form.student_id),
      placement: Number(form.placement),
      year: Number(form.year),
      competition_date: form.competition_date.slice(0, 10)
    };
    await api.post('/competitions', payload);
    setModal(false);
    setForm(emptyForm);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('确定删除该记录？')) return;
    await api.delete(`/competitions/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h2>比赛积分</h2>
        <p>记录学员参加比赛的积分，支持全国赛、省赛和市赛</p>
      </div>
      <div className="card">
        <div className="card-title">
          <span>比赛记录</span>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ 新增记录</button>
        </div>
        <table>
          <thead><tr><th>学员</th><th>比赛名称</th><th>级别</th><th>日期</th><th>名次</th><th>积分</th><th>操作</th></tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td>{r.student_name}</td>
                <td>{r.competition_name}</td>
                <td><span className="badge badge-pending">{LEVEL_MAP[r.competition_level]}</span></td>
                <td>{r.competition_date}</td>
                <td>第{r.placement}名</td>
                <td><strong>{r.points}</strong></td>
                <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}>删除</button></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={7} className="empty-state">暂无比赛记录</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>新增比赛积分</h3>
            <div className="form-group"><label>学员</label>
              <select value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })}>
                <option value="">请选择学员</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.current_rank})</option>)}
              </select>
            </div>
            <div className="form-group"><label>比赛名称</label><input value={form.competition_name} onChange={e => setForm({ ...form, competition_name: e.target.value })} placeholder="如：2026年全国跆拳道锦标赛" /></div>
            <div className="form-row">
              <div className="form-group"><label>比赛级别</label>
                <select value={form.competition_level} onChange={e => setForm({ ...form, competition_level: e.target.value })}>
                  <option value="national">全国赛</option>
                  <option value="provincial">省赛</option>
                  <option value="municipal">市赛</option>
                </select>
              </div>
              <div className="form-group"><label>名次</label>
                <select value={form.placement} onChange={e => setForm({ ...form, placement: e.target.value })}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>第{n}名</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>比赛日期</label><input type="date" value={form.competition_date} onChange={e => setForm({ ...form, competition_date: e.target.value })} /></div>
              <div className="form-group"><label>年份</label><input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
