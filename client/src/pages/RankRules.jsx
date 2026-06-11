import { useState, useEffect } from 'react';
import api from '../api';

export default function RankRules() {
  const [rules, setRules] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await api.get('/rank-rules');
    setRules(res.data || []);
  }

  return (
    <div>
      <div className="page-header">
        <h2>段位晋级规则</h2>
        <p>各级段位晋级所需的前置课时要求</p>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>序号</th><th>当前段位</th><th>目标段位</th><th>所需课时</th></tr></thead>
          <tbody>
            {rules.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td><span className="badge badge-pending">{r.current_rank}</span></td>
                <td><span className="badge badge-pass">{r.target_rank}</span></td>
                <td><strong>{r.required_hours}</strong> 节</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
