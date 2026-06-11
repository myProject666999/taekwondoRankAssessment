import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const emptyForm = { name: '', exam_date: '', description: '' };

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await api.get('/exams');
    setExams(res.data || []);
  }

  async function handleSave() {
    await api.post('/exams', form);
    setModal(false);
    setForm(emptyForm);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('确定删除该考核？')) return;
    await api.delete(`/exams/${id}`);
    load();
  }

  const statusMap = { pending: '待开始', in_progress: '进行中', completed: '已完成' };
  const statusBadge = { pending: 'badge-pending', in_progress: 'badge-fail', completed: 'badge-pass' };

  return (
    <div>
      <div className="page-header">
        <h2>考核管理</h2>
        <p>创建和管理段位考核，报名与分组</p>
      </div>
      <div className="card">
        <div className="card-title">
          <span>考核列表</span>
          <button className="btn btn-primary" onClick={() => setModal(true)}>+ 创建考核</button>
        </div>
        <table>
          <thead><tr><th>考核名称</th><th>考核日期</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>
            {exams.map(e => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{e.exam_date}</td>
                <td><span className={`badge ${statusBadge[e.status]}`}>{statusMap[e.status]}</span></td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => navigate(`/exams/${e.id}`)}>详情</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e.id)} style={{ marginLeft: 4 }}>删除</button>
                </td>
              </tr>
            ))}
            {exams.length === 0 && <tr><td colSpan={4} className="empty-state">暂无考核数据</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>创建考核</h3>
            <div className="form-group"><label>考核名称</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：2026年春季段位考核" /></div>
            <div className="form-group"><label>考核日期</label><input type="date" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })} /></div>
            <div className="form-group"><label>备注</label><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSave}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
