import { useState, useEffect } from 'react';
import api from '../api';

const emptyForm = { name: '', phone: '', rank: '黑带1段' };

export default function Coaches() {
  const [coaches, setCoaches] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await api.get('/coaches');
    setCoaches(res.data || []);
  }

  function openAdd() { setForm(emptyForm); setEditId(null); setModal(true); }
  function openEdit(c) { setForm({ name: c.name, phone: c.phone || '', rank: c.rank }); setEditId(c.id); setModal(true); }

  async function handleSave() {
    if (editId) { await api.put(`/coaches/${editId}`, form); }
    else { await api.post('/coaches', form); }
    setModal(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('确定删除该教练？')) return;
    await api.delete(`/coaches/${id}`);
    load();
  }

  return (
    <div>
      <div className="page-header">
        <h2>教练管理</h2>
        <p>管理道馆教练信息</p>
      </div>
      <div className="card">
        <div className="card-title">
          <span>教练列表</span>
          <button className="btn btn-primary" onClick={openAdd}>+ 新增教练</button>
        </div>
        <table>
          <thead><tr><th>姓名</th><th>联系电话</th><th>段位</th><th>操作</th></tr></thead>
          <tbody>
            {coaches.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.phone || '-'}</td><td>{c.rank}</td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => openEdit(c)}>编辑</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)} style={{ marginLeft: 4 }}>删除</button>
                </td>
              </tr>
            ))}
            {coaches.length === 0 && <tr><td colSpan={4} className="empty-state">暂无教练数据</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editId ? '编辑教练' : '新增教练'}</h3>
            <div className="form-group"><label>姓名</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label>联系电话</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-group"><label>段位</label><input value={form.rank} onChange={e => setForm({ ...form, rank: e.target.value })} /></div>
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
