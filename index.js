const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用 JSON 解析
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Gemini Proxy is running on Zeabur',
    version: '1.0.0'
  });
});

// 根路径信息
app.get('/', (req, res) => {
  res.json({
    message: 'Gemini API Proxy',
    usage: 'This is a proxy service for Gemini API',
    health: '/health',
    target: 'https://generativelanguage.googleapis.com'
  });
});

// 创建代理中间件
const apiProxy = createProxyMiddleware({
  target: 'https://generativelanguage.googleapis.com',
  changeOrigin: true,
  secure: true,
  followRedirects: true,
  logLevel: 'info',
  
  onProxyReq: (proxyReq, req, res) => {
    // 设置正确的 Host 头
    proxyReq.setHeader('Host', 'generativelanguage.googleapis.com');
    
    // 添加地理位置伪装头部（尝试绕过地区限制）
    proxyReq.setHeader('X-Forwarded-For', '8.8.8.8');
    proxyReq.setHeader('CF-Connecting-IP', '8.8.8.8');
    proxyReq.setHeader('X-Real-IP', '8.8.8.8');
    
    // 确保 Content-Type 正确传递
    if (req.headers['content-type']) {
      proxyReq.setHeader('Content-Type', req.headers['content-type']);
    }
    
    console.log(`[PROXY] ${req.method} ${req.url}`);
  },
  
  onProxyRes: (proxyRes, req, res) => {
    // 添加 CORS 头部
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    
    console.log(`[RESPONSE] ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  },
  
  onError: (err, req, res) => {
    console.error('[PROXY ERROR]', err.message);
    res.status(500).json({ 
      error: 'Proxy Error', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 处理 OPTIONS 请求（CORS 预检）
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// 所有 /v1beta 路径的请求都通过代理
app.use('/v1beta', apiProxy);
app.use('/v1', apiProxy);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Gemini proxy server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Target: https://generativelanguage.googleapis.com`);
});
