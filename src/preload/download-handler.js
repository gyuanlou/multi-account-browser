/**
 * 下载处理预加载脚本
 * 用于处理浏览器页面中的下载相关操作
 */
const { contextBridge, ipcRenderer } = require('electron');

// 在页面加载完成后执行
window.addEventListener('DOMContentLoaded', () => {
  console.log('下载处理预加载脚本已加载');
  
  // 监听来自页面的消息
  window.addEventListener('message', async (event) => {
    // 处理打开下载文件夹的请求
    if (event.data && event.data.type === 'OPEN_DOWNLOAD_FOLDER') {
      console.log('收到打开文件夹请求:', event.data.path);
      
      try {
        // 调用主进程的方法打开文件夹
        const result = await ipcRenderer.invoke('open-folder', event.data.path);
        
        // 将结果发送回页面
        window.postMessage({
          type: 'FOLDER_OPENED',
          success: result.success,
          path: result.path,
          error: result.error
        }, '*');
      } catch (error) {
        console.error('打开文件夹失败:', error);
        
        // 发送错误信息回页面
        window.postMessage({
          type: 'FOLDER_OPENED',
          success: false,
          error: error.message
        }, '*');
      }
    }
  });
});

// 暴露 API 到页面中
contextBridge.exposeInMainWorld('downloadHandler', {
  // 打开文件夹
  openFolder: async (folderPath) => {
    try {
      return await ipcRenderer.invoke('open-folder', folderPath);
    } catch (error) {
      console.error('打开文件夹失败:', error);
      return { success: false, error: error.message };
    }
  }
});

console.log('下载处理预加载脚本注册完成');
