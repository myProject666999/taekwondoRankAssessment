import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Students from './pages/Students';
import Coaches from './pages/Coaches';
import RankRules from './pages/RankRules';
import Exams from './pages/Exams';
import ExamDetail from './pages/ExamDetail';
import Certificates from './pages/Certificates';
import Competitions from './pages/Competitions';
import Ranking from './pages/Ranking';

export default function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🥋 跆拳道</h1>
          <div className="subtitle">段位考核管理系统</div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/students" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">👥</span> 学员管理
          </NavLink>
          <NavLink to="/coaches" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🧑‍🏫</span> 教练管理
          </NavLink>
          <NavLink to="/rank-rules" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">📋</span> 段位规则
          </NavLink>
          <NavLink to="/exams" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">📝</span> 考核管理
          </NavLink>
          <NavLink to="/certificates" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🏅</span> 证书管理
          </NavLink>
          <NavLink to="/competitions" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">🏆</span> 比赛积分
          </NavLink>
          <NavLink to="/ranking" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">📊</span> 年度排名
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/students" replace />} />
          <Route path="/students" element={<Students />} />
          <Route path="/coaches" element={<Coaches />} />
          <Route path="/rank-rules" element={<RankRules />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/exams/:id" element={<ExamDetail />} />
          <Route path="/certificates" element={<Certificates />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/ranking" element={<Ranking />} />
        </Routes>
      </main>
    </div>
  );
}
