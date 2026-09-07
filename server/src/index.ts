import 'dotenv/config';
import app from './app';

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`✅ Server 已启动: http://localhost:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/health`);
});
