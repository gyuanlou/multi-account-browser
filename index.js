/**
 * 多账号浏览器管理工具 - 入口文件
 * 这个文件是应用程序的入口点，负责启动 Electron 应用程序
 */

// 导入 Electron 模块
const { app } = require('electron');

// 设置应用程序的名称
app.name = 'Multi Account Browser';

// 当 Electron 应用程序准备好后加载主模块
app.whenReady().then(() => {
  console.log('Electron 应用程序已准备就绪');
  console.log('应用程序路径:', app.getAppPath());
  console.log('用户数据路径:', app.getPath('userData'));
  
  // 加载主模块
  require('./main');
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

console.log('入口文件已加载');
