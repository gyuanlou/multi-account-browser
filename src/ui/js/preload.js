/**
 * 预加载脚本
 * 为渲染进程提供安全的 IPC 通信
 */
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('ipcRenderer', {
  // 发送消息到主进程
  send: (channel, ...args) => {
    // 白名单通道
    const validChannels = [
      'create-profile',
      'update-profile',
      'delete-profile'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  
  // 从主进程接收消息
  on: (channel, func) => {
    const validChannels = [
      'app-ready',
      'profile-updated',
      'profile-deleted',
      'browser-launched',
      'browser-closed',
      'create-new-profile',
      'import-profile',
      'import-profile-ready'
    ];
    if (validChannels.includes(channel)) {
      // 转换 IPC 事件为函数参数
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      
      // 返回一个清理函数
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },
  
  // 调用主进程方法并获取结果
  invoke: (channel, ...args) => {
    const validChannels = [
      // 配置文件管理
      'get-profiles',
      'get-profile',
      'save-profile',
      'delete-profile',
      
      // 浏览器实例管理
      'get-running-instances',
      'launch-browser',
      'close-browser',
      'open-dev-tools',
      'capture-screenshot',
      
      // 代理和指纹管理
      'test-proxy',
      'generate-random-fingerprint',
      'test-fingerprint-protection',
      
      // 地理位置数据
      'get-countries',
      'get-cities',
      'get-timezones',
      
      // 设置管理
      'get-settings',
      'save-settings',
      'get-setting',
      'update-setting',
      'save-setting',
      'get-all-settings',
      'reset-settings',
      'set-master-password',
      'verify-master-password',
      'clear-master-password',
      'export-settings',
      'import-settings',
      
      // 文件系统操作
      'select-directory',
      'select-file',
      'show-open-dialog',
      'show-save-dialog',
      'write-file',
      'read-file',
      
      // 数据管理
      'clear-data',
      'create-backup',
      'restore-backup',
      'get-backups',
      'delete-backup',
      'export-profiles',
      'import-profiles',
      'import-profile-data',
      
      // Cookie 和本地存储
      'get-cookies',
      'set-cookie',
      'delete-cookie',
      'delete-domain-cookies',
      'clear-cookies',
      'export-cookies',
      'import-cookies',
      'get-local-storage',
      'set-local-storage',
      'clear-local-storage',
      
      // 自动化
      'start-recording',
      'test-automation',
      'run-automation-script',
      'run-automation-task',
      'get-task-status',
      'get-all-tasks',
      'get-automation-tasks',
      'save-automation-task',
      'delete-automation-task',
      'stop-task',
      'get-task-log',
      'get-all-scripts',
      'get-script-by-id',
      'save-script',
      'delete-script',
      
      // 性能优化
      'get-resource-usage',
      'update-performance-settings',
      'record-browser-activity',
      
      // 应用信息
      'get-app-info'
    ];
    if (validChannels.includes(channel)) {
      console.log(`调用主进程方法: ${channel}`, args);
      return ipcRenderer.invoke(channel, ...args).catch(error => {
        console.error(`调用 ${channel} 失败:`, error);
        throw error;
      });
    }
    
    console.error(`不允许调用 ${channel}`);
    return Promise.reject(new Error(`不允许调用 ${channel}`));
  }
});

// 通知主进程渲染进程已加载
window.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('renderer-ready');
});
