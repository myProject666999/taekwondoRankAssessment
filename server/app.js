const express = require('express');
const cors = require('cors');
const debug = require('debug')('app:main');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/coaches', require('./routes/coaches'));
app.use('/api/students', require('./routes/students'));
app.use('/api/rank-rules', require('./routes/rankRules'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/scores', require('./routes/scores'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/competitions', require('./routes/competitions'));

app.use((err, req, res, next) => {
  debug('未捕获异常: %s', err.message);
  res.status(500).json({ code: 1, message: err.message });
});

app.listen(PORT, () => {
  debug('服务启动: http://localhost:%d', PORT);
  console.log(`🥋 跆拳道段位考核系统后端已启动: http://localhost:${PORT}`);
});
