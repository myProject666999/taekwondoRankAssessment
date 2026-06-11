import { useState, useEffect } from 'react';
import api from '../api';

export default function Ranking() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [ranking, setRanking] = useState([]);

  useEffect(() => { load(); }, [year]);

  async function load() {
    try {
      const res = await api.get('/competitions/ranking', { params: { year } });
      setRanking(res.data || []);
    } catch {
      setRanking([]);
    }
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <div className="page-header">
        <h2>年度排名</h2>
        <p>根据比赛积分统计年度排名</p>
      </div>
      <div className="card">
        <div className="toolbar">
          <select value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <button className="btn btn-outline" onClick={load}>查询</button>
        </div>
        <table className="ranking-table">
          <thead><tr><th>排名</th><th>学员</th><th>段位</th><th>比赛次数</th><th>总积分</th></tr></thead>
          <tbody>
            {ranking.map(r => (
              <tr key={r.student_id}>
                <td className={r.rank <= 3 ? `rank-${r.rank}` : ''}>
                  {r.rank <= 3 ? medals[r.rank - 1] : r.rank}
                </td>
                <td>{r.student_name}</td>
                <td>{r.current_rank}</td>
                <td>{r.competition_count}</td>
                <td><strong>{r.total_points}</strong></td>
              </tr>
            ))}
            {ranking.length === 0 && <tr><td colSpan={5} className="empty-state">该年份暂无排名数据</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
