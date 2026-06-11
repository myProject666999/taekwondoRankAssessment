import { useState, useEffect } from 'react';
import api from '../api';

const RANKS = ['白带', '黄带', '绿带', '蓝带', '红带', '黑带1段', '黑带2段', '黑带3段', '黑带4段', '黑带5段', '黑带6段', '黑带7段', '黑带8段', '黑带9段'];

function getRankBadgeClass(rank) {
  if (rank.startsWith('黑带')) return 'badge-black';
  const map = { '白带': 'badge-white', '黄带': 'badge-yellow', '绿带': 'badge-green', '蓝带': 'badge-blue', '红带': 'badge-red' };
  return map[rank] || 'badge-white';
}

const emptyForm = { name: '', gender: 'male', birth_date: '', phone: '', current_rank: '白带', enrollment_date: '', total_hours: 0, coach_id: '' };

export default function Students() {
  const [students, setStudents] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [filters, setFilters] = useState({ rank: '', keyword: '' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  useEffect(() => { loadStudents(); loadCoaches(); }, []);

  async function loadStudents() {
    const params = {};
    if (filters.rank) params.rank = filters.rank;
    if (filters.keyword) params.keyword = filters.keyword;
    const res = await api.get('/students', { params });
    setStudents(res.data || []);
  }

  async function loadCoaches() {
    const res = await api.get('/coaches');
    setCoaches(res.data || []);
  }

  function openAdd() {
    setForm({ ...emptyForm, enrollment_date: new Date().toISOString().slice(0, 10) });
    setEditId(null);
    setModal('form');
  }

  function openEdit(s) {
    setForm({
      name: s.name, gender: s.gender,
      birth_date: s.birth_date ? s.birth_date.slice(0, 10) : '',
      phone: s.phone || '', current_rank: s.current_rank,
      enrollment_date: s.enrollment_date ? s.enrollment_date.slice(0, 10) : '',
      total_hours: s.total_hours, coach_id: s.coach_id || ''
    });
    setEditId(s.id);
    setModal('form');
  }

  async function handleSave() {
    const payload = {
      ...form,
      coach_id: form.coach_id || null,
      total_hours: Number(form.total_hours),
      birth_date: form.birth_date || null,
      enrollment_date: form.enrollment_date || null
    };
    if (editId) {
      await api.put(`/students/${editId}`, payload);
    } else {
      await api.post('/students', payload);
    }
    setModal(null);
    loadStudents();
  }

  async function handleDelete(id) {
    if (!confirm('确定删除该学员？')) return;
    await api.delete(`/students/${id}`);
    loadStudents();
  }

  async function addHours(id) {
    const hours = prompt('请输入增加的课时数：', '1');
    if (!hours || isNaN(hours)) return;
    await api.post(`/students/${id}/add-hours`, { hours: Number(hours) });
    loadStudents();
  }

  return (
    <div>
      <div className="page-header">
        <h2>学员管理</h2>
        <p>管理学馆学员信息、段位和课时</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{students.length}</div><div className="stat-label">学员总数</div></div>
        <div className="stat-card"><div className="stat-value">{students.filter(s => s.status === 'active').length}</div><div className="stat-label">在训学员</div></div>
        <div className="stat-card"><div className="stat-value">{students.filter(s => s.current_rank.startsWith('黑带')).length}</div><div className="stat-label">黑带学员</div></div>
      </div>

      <div className="card">
        <div className="toolbar">
          <select value={filters.rank} onChange={e => setFilters({ ...filters, rank: e.target.value })}>
            <option value="">全部段位</option>
            {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input placeholder="搜索姓名" value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} />
          <button className="btn btn-outline" onClick={loadStudents}>查询</button>
          <button className="btn btn-primary" onClick={openAdd}>+ 新增学员</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>姓名</th><th>性别</th><th>当前段位</th><th>入馆日期</th><th>累计课时</th><th>教练</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.gender === 'male' ? '男' : '女'}</td>
                <td><span className={`badge ${getRankBadgeClass(s.current_rank)}`}>{s.current_rank}</span></td>
                <td>{s.enrollment_date}</td>
                <td>{s.total_hours}</td>
                <td>{s.coach_name || '-'}</td>
                <td>{s.status === 'active' ? '在训' : '离馆'}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => addHours(s.id)}>加课时</button>
                  <button className="btn btn-sm btn-primary" onClick={() => openEdit(s)} style={{ marginLeft: 4 }}>编辑</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)} style={{ marginLeft: 4 }}>删除</button>
                </td>
              </tr>
            ))}
            {students.length === 0 && <tr><td colSpan={8} className="empty-state">暂无学员数据</td></tr>}
          </tbody>
        </table>
      </div>

      {modal === 'form' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editId ? '编辑学员' : '新增学员'}</h3>
            <div className="form-row">
              <div className="form-group"><label>姓名</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-group"><label>性别</label><select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="male">男</option><option value="female">女</option></select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>出生日期</label><input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} /></div>
              <div className="form-group"><label>联系电话</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>当前段位</label><select value={form.current_rank} onChange={e => setForm({ ...form, current_rank: e.target.value })}>{RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div className="form-group"><label>入馆日期</label><input type="date" value={form.enrollment_date} onChange={e => setForm({ ...form, enrollment_date: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>累计课时</label><input type="number" value={form.total_hours} onChange={e => setForm({ ...form, total_hours: e.target.value })} /></div>
              <div className="form-group"><label>教练</label><select value={form.coach_id} onChange={e => setForm({ ...form, coach_id: e.target.value })}><option value="">未分配</option>{coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(null)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
