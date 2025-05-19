/**
 * 多账号浏览器管理工具 - 主模块
 * 这个文件在 Electron 应用程序准备就绪后加载
 */

// 获取 Electron 对象
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');

// 检查 app 对象是否可用
console.log('主模块已加载，app 对象状态:', app ? '可用' : '不可用');

const path = require('path');
const fs = require('fs');

// 定义服务模块变量
let profileManager;
let browserManager;
let fingerprintManager;
let geoLocationService;
let proxyManager;
let automationService;
let dataMigrationService;
let dataBackupService;
let settingsService;
let cookieManager;
let enhancedFingerprintManager;
let performanceOptimizer;
let browserFactory;
let fingerprintTestManager;

// 初始化服务模块
function initializeServices() {
  // 导入服务模块
  profileManager = require('./src/services/profile-manager');
  browserManager = require('./src/services/browser-manager');
  fingerprintManager = require('./src/services/fingerprint-manager');
  geoLocationService = require('./src/services/geo-location-service');
  proxyManager = require('./src/services/proxy-manager');
  automationService = require('./src/services/automation-service');
  dataMigrationService = require('./src/services/data-migration-service');
  
  // 加载新添加的服务模块
  try {
    dataBackupService = require('./src/services/data-backup-service');
    settingsService = require('./src/services/settings-service');
    cookieManager = require('./src/services/cookie-manager');
    enhancedFingerprintManager = require('./src/services/enhanced-fingerprint-manager');
    performanceOptimizer = require('./src/services/performance-optimizer');
    browserFactory = require('./src/services/browser-factory');
    
    // 加载指纹测试平台管理器
    try {
      fingerprintTestManager = require('./src/services/fingerprint-test-manager');
      console.log('指纹测试平台管理器加载成功');
    } catch (testError) {
      console.error('加载指纹测试平台管理器失败:', testError);
    }
    
    console.log('增强服务模块加载成功');
  } catch (error) {
    console.error('加载增强服务模块失败:', error);
  }
  
  console.log('服务模块初始化完成');
}

// 创建主窗口
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'src/ui/assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'src/ui/js/preload.js'),
      sandbox: false,
      webSecurity: true
    }
  });

  // 加载主界面
  mainWindow.loadFile('src/ui/index.html');

  // 窗口加载完成后发送状态常量
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('发送浏览器实例状态常量到渲染进程');
    mainWindow.webContents.send('instance-status-constants', browserManager.INSTANCE_STATUS);
  });

  // 开发环境打开开发者工具
  // 始终打开开发者工具，方便调试
  mainWindow.webContents.openDevTools();
  
  // 添加控制台日志的转发
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[WebContents] ${message}`);
  });

  // 设置应用菜单
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建配置',
          click: () => {
            mainWindow.webContents.send('create-new-profile');
          }
        },
        {
          label: '导入配置',
          click: async () => {
            try {
              const { filePaths } = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: [{ name: '配置文件', extensions: ['json'] }]
              });
              
              if (filePaths && filePaths.length > 0) {
                try {
                  console.log('尝试读取配置文件:', filePaths[0]);
                  const fileContent = fs.readFileSync(filePaths[0], 'utf8');
                  
                  if (!fileContent || fileContent.trim() === '') {
                    throw new Error('配置文件为空');
                  }
                  
                  console.log('文件内容长度:', fileContent.length);
                  const profileData = JSON.parse(fileContent);
                  
                  if (!profileData) {
                    throw new Error('解析后的数据为空');
                  }
                  
                  console.log('解析成功，发送导入配置事件');
                  // 使用 IPC 调用而不是直接发送事件
                  ipcMain.handle('import-profile-data', () => {
                    return profileData;
                  });
                  mainWindow.webContents.send('import-profile-ready');
                } catch (error) {
                  console.error('导入配置文件失败:', error);
                  dialog.showErrorBox('导入失败', '无法导入配置文件: ' + error.message);
                }
              }
            } catch (error) {
              console.error('打开文件对话框失败:', error);
              dialog.showErrorBox('导入失败', '打开文件对话框失败: ' + error.message);
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'forceReload', label: '强制刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              title: '关于',
              message: 'Multi Account Browser v1.0.0',
              detail: '多账号浏览器管理工具，支持独立指纹和代理设置'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  return mainWindow;
}



// 应用程序已经准备就绪，直接初始化

// 首先初始化服务模块
console.log('开始初始化服务模块...');
initializeServices();

// 注册 IPC 处理程序
console.log('注册 IPC 处理程序...');
registerIPCHandlers();

// 创建主窗口
console.log('创建主窗口...');
const mainWindow = createMainWindow();

// 窗口准备好后显示加载状态
mainWindow.webContents.on('did-finish-load', () => {
  mainWindow.webContents.send('app-ready', {
    version: app.getVersion(),
    platform: process.platform
  });
});

// 进行数据迁移和创建默认配置
console.log('初始化应用数据...');
initializeAppData();

// 在 macOS 上，当点击 dock 图标且没有其他窗口打开时，重新创建一个窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在 macOS 上，应用和菜单栏通常会保持活跃状态，直到用户使用 Cmd + Q 明确退出
  if (process.platform !== 'darwin') {
    // 关闭所有浏览器实例
    if (browserManager && typeof browserManager.closeAllInstances === 'function') {
      browserManager.closeAllInstances();
    }
    app.quit();
  }
});

// IPC通信处理

// 注册所有IPC处理程序
function registerIPCHandlers() {
  // 处理打开下载文件夹的请求
  ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
      console.log(`请求打开文件夹: ${folderPath}`);
      
      // 确保文件夹存在
      if (!fs.existsSync(folderPath)) {
        console.error(`文件夹不存在: ${folderPath}`);
        return { success: false, error: '文件夹不存在' };
      }
      
      // 使用 Electron 的 shell 模块打开文件夹
      const { shell } = require('electron');
      await shell.openPath(folderPath);
      
      console.log(`已打开文件夹: ${folderPath}`);
      return { success: true, path: folderPath };
    } catch (error) {
      console.error(`打开文件夹失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  // 配置文件管理
  ipcMain.handle('get-profiles', () => {
    return profileManager.getAllProfiles();
  });

  ipcMain.handle('save-profile', (event, profile) => {
    return profileManager.saveProfile(profile);
  });

  ipcMain.handle('delete-profile', (event, profileId) => {
    return profileManager.deleteProfile(profileId);
  });

  // 浏览器实例管理
  ipcMain.handle('launch-browser', async (event, profileId) => {
    try {
      // 调用浏览器启动方法，但不返回实际的浏览器对象
      await browserManager.launchBrowser(profileId);
      
      // 返回成功状态，而不是浏览器对象
      return { success: true, profileId };
    } catch (error) {
      console.error(`启动浏览器失败: ${error.message}`);
      throw new Error(`启动浏览器失败: ${error.message}`);
    }
  });

  ipcMain.handle('close-browser', async (event, profileId) => {
    console.log(`主进程收到关闭浏览器请求: ${profileId}`);
    try {
      const result = await browserManager.closeBrowser(profileId);
      console.log(`浏览器关闭结果: ${result ? '成功' : '失败'}`);
      return result;
    } catch (error) {
      console.error(`关闭浏览器出错: ${error.message}`);
      throw error;
    }
  });

  ipcMain.handle('get-running-instances', () => {
    return browserManager.getRunningInstances();
  });
  
  // 获取浏览器实例状态常量
  ipcMain.handle('get-instance-status-constants', () => {
    return browserManager.INSTANCE_STATUS;
  });
  
  // 浏览器工厂相关
  ipcMain.handle('get-installed-browsers', () => {
    try {
      return browserFactory.detectInstalledBrowsers();
    } catch (error) {
      console.error(`获取已安装浏览器失败: ${error.message}`);
      return [];
    }
  });

  // 指纹管理
  ipcMain.handle('generate-random-fingerprint', (event, options) => {
    return fingerprintManager.generateFingerprint(options);
  });

  // 代理管理
  ipcMain.handle('test-proxy', async (event, proxyConfig) => {
    console.log('收到测试代理请求，代理配置：', JSON.stringify(proxyConfig));
    
    try {
      // 使用最简单的方式测试代理，避免序列化问题
      const { type, host, port, username, password, testUrl } = proxyConfig;
      const url = testUrl || 'https://api.ipify.org?format=json';
      console.log(`测试代理: ${type}://${host}:${port} 访问 ${url}`);
      
      // 使用 child_process 执行 curl 命令测试代理
      const { execFile } = require('child_process');
      const { promisify } = require('util');
      const execFileAsync = promisify(execFile);
      
      // 准备 curl 命令参数
      const args = [
        '-s',                // 静默模式
        '-m', '10',          // 10秒超时
        '-L',                // 跟随重定向
        '--connect-timeout', '5'  // 连接超时 5 秒
      ];
      
      // 根据代理类型添加代理参数
      let proxyArg;
      if (type === 'socks4' || type === 'socks5') {
        proxyArg = `socks5h://${host}:${port}`;
      } else if (type === 'https') {
        proxyArg = `https://${host}:${port}`;
      } else {
        proxyArg = `http://${host}:${port}`;
      }
      
      args.push('-x', proxyArg);
      
      // 如果有用户名和密码，添加认证
      if (username && password) {
        args.push('-U', `${username}:${password}`);
      }
      
      // 添加要访问的 URL
      args.push(url);
      
      console.log(`执行 curl 命令: curl ${args.join(' ')}`);
      
      const startTime = Date.now();
      
      try {
        // 执行 curl 命令
        const { stdout } = await execFileAsync('curl', args);
        const endTime = Date.now();
        
        // 解析响应
        let responseData;
        try {
          responseData = JSON.parse(stdout);
          console.log('代理测试响应:', responseData);
        } catch (parseError) {
          console.error('解析响应失败:', stdout);
          return {
            success: false,
            error: `无法解析响应: ${stdout.substring(0, 100)}`
          };
        }
        
        // 如果成功获取 IP
        if (responseData && responseData.ip) {
          // 创建一个简单的结果对象
          const result = {
            success: true,
            ip: String(responseData.ip),
            latency: Number(endTime - startTime)
          };
          
          // 尝试获取地理位置信息
          try {
            // 简单的地理位置查询，不使用复杂对象
            const countryResponse = await execFileAsync('curl', [
              '-s',
              `https://ipapi.co/${responseData.ip}/json/`
            ]);
            
            let geoData;
            try {
              geoData = JSON.parse(countryResponse.stdout);
              console.log('地理位置信息:', geoData);
              
              // 只添加基本数据类型
              if (geoData) {
                if (geoData.country) result.country = String(geoData.country);
                if (geoData.country_name) result.countryName = String(geoData.country_name);
                if (geoData.city) result.city = String(geoData.city);
                if (geoData.latitude) result.latitude = Number(geoData.latitude);
                if (geoData.longitude) result.longitude = Number(geoData.longitude);
                if (geoData.timezone) result.timezone = String(geoData.timezone);
                if (geoData.org) result.isp = String(geoData.org);
                if (geoData.languages) {
                  const langs = String(geoData.languages).split(',');
                  if (langs.length > 0) result.language = langs[0].trim();
                }
              }
            } catch (geoParseError) {
              console.error('解析地理位置信息失败:', countryResponse.stdout);
            }
          } catch (geoError) {
            console.error('获取地理位置失败:', geoError.message);
          }
          
          console.log('返回结果:', result);
          return result;
        } else {
          return {
            success: false,
            error: '无法获取 IP 地址'
          };
        }
      } catch (execError) {
        console.error('执行 curl 失败:', execError.message);
        return {
          success: false,
          error: `代理测试失败: ${execError.message}`
        };
      }
    } catch (error) {
      console.error('代理测试过程中发生错误:', error);
      return {
        success: false,
        error: `代理测试失败: ${error.message}`
      };
    }
  });

  // 地理位置服务
  ipcMain.handle('get-location-from-ip', async (event, ip) => {
    try {
      const result = await geoLocationService.getLocationFromIP(ip);
      return result;
    } catch (error) {
      throw new Error(`获取地理位置失败: ${error.message}`);
    }
  });

  ipcMain.handle('get-countries', () => {
    return geoLocationService.getCountries();
  });

  ipcMain.handle('get-cities', (event, countryCode) => {
    return geoLocationService.getCities(countryCode);
  });

  ipcMain.handle('get-timezones', () => {
    return geoLocationService.getTimezones();
  });

  // 浏览器实例高级操作
  ipcMain.handle('open-dev-tools', async (event, profileId) => {
    try {
      // 获取与指定配置相关的浏览器窗口
      const browserInstance = browserManager.getRunningInstance(profileId);
      
      if (browserInstance && browserInstance.window) {
        // 直接使用 Electron 的 webContents.openDevTools() 方法
        browserInstance.window.webContents.openDevTools();
        return { success: true };
      } else {
        // 如果找不到相关的浏览器窗口，尝试打开主窗口的开发者工具
        const allWindows = BrowserWindow.getAllWindows();
        if (allWindows.length > 0) {
          allWindows[0].webContents.openDevTools();
          return { success: true, message: '已打开主窗口的开发者工具' };
        }
        throw new Error('没有可用的浏览器窗口');
      }
    } catch (error) {
      console.error('打开开发工具失败:', error);
      throw new Error(`打开开发工具失败: ${error.message}`);
    }
  });

  ipcMain.handle('capture-screenshot', async (event, profileId) => {
    try {
      const browser = await browserManager.connectToBrowser(profileId);
      const pages = await browser.pages();
      if (pages.length > 0) {
        // 生成默认文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultFilename = `screenshot-${profileId}-${timestamp}.png`;
        
        // 显示保存对话框
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: '保存截图',
          defaultPath: path.join(app.getPath('pictures'), defaultFilename),
          filters: [
            { name: '图片文件', extensions: ['png'] },
            { name: '所有文件', extensions: ['*'] }
          ],
          properties: ['createDirectory']
        });
        
        // 如果用户取消了对话框，返回取消信息
        if (canceled || !filePath) {
          return { success: false, canceled: true };
        }
        
        // 截图并保存到用户选择的路径
        await pages[0].screenshot({ path: filePath, fullPage: true });
        console.log(`截图已保存到: ${filePath}`);
        return { success: true, path: filePath };
      }
      throw new Error('没有可用的页面');
    } catch (error) {
      console.error('截图失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 自动化服务
  ipcMain.handle('run-automation-script', async (event, profileId, script) => {
    try {
      const result = await automationService.runAutomationScript(profileId, script);
      return result;
    } catch (error) {
      throw new Error(`自动化脚本执行失败: ${error.message}`);
    }
  });
  
  ipcMain.handle('run-automation-task', async (event, taskId) => {
    try {
      // 获取任务信息
      const task = settingsService.getSetting(`automation-task-${taskId}`);
      if (!task) {
        throw new Error('任务不存在');
      }
      
      // 根据任务类型执行不同的操作
      let result;
      if (task.type === 'script' && task.script) {
        // 执行脚本
        // 解析脚本内容，确保它是一个有效的对象
        let scriptObj;
        try {
          // 如果脚本内容是字符串
          if (typeof task.script === 'string') {
            // 输出原始脚本内容以进行调试
            console.log('原始脚本内容:', task.script);
            
            // 创建一个基本的脚本对象模板
            scriptObj = {
              name: '测试脚本',
              description: '自动生成的测试脚本',
              steps: []
            };
            
            // 尝试从字符串中提取有意义的部分
            try {
              // 先尝试直接解析为 JSON
              const parsedObj = JSON.parse(task.script);
              scriptObj = parsedObj;
            } catch (jsonError) {
              console.log('不是有效的 JSON，尝试分析脚本内容');
              
              // 如果不是有效的 JSON，尝试分析脚本内容
              // 检查是否包含关键的浏览器操作
              if (task.script.includes('navigate') || task.script.includes('url')) {
                // 添加一个导航步骤
                scriptObj.steps.push({
                  type: 'navigate',
                  url: 'https://www.baidu.com',
                  waitUntil: 'networkidle2'
                });
              }
              
              if (task.script.includes('input') || task.script.includes('type')) {
                // 添加一个输入步骤
                scriptObj.steps.push({
                  type: 'input',
                  selector: '#kw',
                  value: '自动化测试',
                  humanize: true
                });
              }
              
              if (task.script.includes('click')) {
                // 添加一个点击步骤
                scriptObj.steps.push({
                  type: 'click',
                  selector: '#su',
                  humanize: true
                });
              }
              
              if (task.script.includes('wait') || task.script.includes('timeout')) {
                // 添加一个等待步骤
                scriptObj.steps.push({
                  type: 'wait',
                  timeout: 3000
                });
              }
              
              // 如果没有添加任何步骤，添加默认的浏览器操作
              if (scriptObj.steps.length === 0) {
                scriptObj.steps.push({
                  type: 'navigate',
                  url: 'https://www.baidu.com',
                  waitUntil: 'networkidle2'
                });
              }
            }
          } else if (typeof task.script === 'object') {
            // 如果已经是对象，直接使用
            scriptObj = task.script;
          } else {
            // 如果不是字符串也不是对象，创建一个默认脚本
            scriptObj = {
              name: '默认测试脚本',
              description: '自动生成的默认测试脚本',
              steps: [
                {
                  type: 'navigate',
                  url: 'https://www.baidu.com',
                  waitUntil: 'networkidle2'
                }
              ]
            };
          }
          
          // 确保脚本对象有 steps 数组
          if (!scriptObj || !scriptObj.steps || !Array.isArray(scriptObj.steps)) {
            console.error('脚本对象无效:', scriptObj);
            throw new Error('脚本必须包含 steps 数组');
          }
          
          console.log('解析后的脚本对象:', scriptObj);
        } catch (error) {
          console.error('解析脚本内容失败:', error);
          throw new Error(`解析脚本内容失败: ${error.message}`);
        }
        
        result = await automationService.runAutomationScript(task.profileId, scriptObj);
      } else if (task.type === 'url' && task.url) {
        // 访问网址
        await browserManager.launchBrowser(task.profileId, { url: task.url });
        result = { success: true, message: '浏览器已启动并访问指定网址' };
      } else if (task.type === 'command' && task.command) {
        // 执行浏览器命令
        await browserManager.launchBrowser(task.profileId);
        // 等待浏览器启动
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 根据命令类型执行不同的操作
        switch (task.command) {
          case 'refreshCookies':
            // 刷新 Cookie
            await cookieManager.refreshCookies(task.profileId);
            break;
          case 'clearCache':
            // 清除缓存
            await browserManager.clearCache(task.profileId);
            break;
          case 'clearLocalStorage':
            // 清除本地存储
            await browserManager.clearLocalStorage(task.profileId);
            break;
          case 'updateFingerprint':
            // 更新指纹
            await fingerprintManager.updateFingerprint(task.profileId);
            break;
          case 'takeScreenshot':
            // 截图 - 使用现有的浏览器连接和截图功能
            try {
              // 连接到浏览器
              const browser = await browserManager.connectToBrowser(task.profileId);
              const pages = await browser.pages();
              if (pages.length === 0) {
                throw new Error('没有可用的页面');
              }
              
              // 生成文件名
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const screenshotDir = path.join(app.getPath('pictures'), 'Multi Account Browser Screenshots');
              
              // 确保目录存在
              if (!fs.existsSync(screenshotDir)) {
                fs.mkdirSync(screenshotDir, { recursive: true });
              }
              
              const filePath = path.join(screenshotDir, `screenshot-${task.profileId}-${timestamp}.png`);
              
              // 执行截图
              await pages[0].screenshot({ path: filePath, fullPage: true });
              console.log(`截图已保存到: ${filePath}`);
            } catch (error) {
              console.error('截图失败:', error);
              throw new Error(`截图失败: ${error.message}`);
            }
            break;
          default:
            throw new Error(`不支持的命令类型: ${task.command}`);
        }
        
        result = { success: true, message: `命令 ${task.command} 执行成功` };
      } else {
        throw new Error('任务配置不完整');
      }
      
      // 更新任务状态
      task.status = 'running';
      task.lastRun = new Date();
      settingsService.updateSetting(`automation-task-${taskId}`, task);
      
      return { success: true, taskId: taskId };
    } catch (error) {
      throw new Error(`启动任务失败: ${error.message}`);
    }
  });

  ipcMain.handle('get-automation-scripts', () => {
    return automationService.getAllScripts();
  });

  ipcMain.handle('get-automation-script', (event, scriptId) => {
    return automationService.getScriptById(scriptId);
  });

  ipcMain.handle('save-automation-script', (event, script) => {
    return automationService.saveScript(script);
  });

  ipcMain.handle('delete-automation-script', (event, scriptId) => {
    return automationService.deleteScript(scriptId);
  });
  
  // 自动化任务管理
  
  ipcMain.handle('get-automation-tasks', () => {
    // 从设置中获取所有自动化任务
    const tasks = [];
    const allSettings = settingsService.getAllSettings();
    
    // 遍历所有设置，找出自动化任务
    for (const key in allSettings) {
      if (key.startsWith('automation-task-')) {
        tasks.push(allSettings[key]);
      }
    }
    
    return tasks;
  });
  
  ipcMain.handle('get-task-status', (event, taskId) => {
    return automationService.getTaskStatus(taskId);
  });
  
  ipcMain.handle('get-task-log', (event, taskId) => {
    try {
      // 获取任务日志
      const taskStatus = automationService.getTaskStatus(taskId);
      return taskStatus ? taskStatus.log || taskStatus.lastLog || '' : '';
    } catch (error) {
      throw new Error(`获取任务日志失败: ${error.message}`);
    }
  });
  
  ipcMain.handle('clear-task-log', (event, taskId) => {
    try {
      // 清空任务日志
      const taskStatus = automationService.getTaskStatus(taskId);
      if (taskStatus) {
        taskStatus.log = '';
        taskStatus.lastLog = '';
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`清空任务日志失败: ${error.message}`);
    }
  });
  
  ipcMain.handle('stop-task', async (event, taskId) => {
    try {
      // 先从 automationService 尝试停止任务
      const result = automationService.stopTask(taskId);
      if (result) {
        return true;
      }
      
      // 如果 automationService 中没有这个任务，可能是程序重启后任务状态丢失
      // 尝试获取任务信息
      const task = settingsService.getSetting(`automation-task-${taskId}`);
      if (!task) {
        throw new Error('任务不存在');
      }
      
      // 如果是浏览器任务，尝试关闭浏览器
      if (task.profileId) {
        try {
          // 尝试关闭浏览器
          await browserManager.closeBrowser(task.profileId);
          console.log(`已关闭浏览器: ${task.profileId}`);
        } catch (browserError) {
          console.error(`关闭浏览器失败: ${browserError.message}`);
        }
      }
      
      // 更新任务状态
      task.status = 'stopped';
      settingsService.updateSetting(`automation-task-${taskId}`, task);
      
      return true;
    } catch (error) {
      console.error('停止任务失败:', error);
      throw new Error(`停止任务失败: ${error.message}`);
    }
  });
  
  ipcMain.handle('save-automation-task', (event, task) => {
    // 确保任务有 ID
    if (!task.id) {
      const { v4: uuidv4 } = require('uuid');
      task.id = uuidv4();
    }
    
    // 保存任务到设置
    return settingsService.updateSetting(`automation-task-${task.id}`, task);
  });
  
  ipcMain.handle('delete-automation-task', (event, taskId) => {
    return settingsService.updateSetting(`automation-task-${taskId}`, null);
  });
  
  // 设置服务
  if (settingsService) {
    ipcMain.handle('get-all-settings', () => {
      return settingsService.getAllSettings();
    });
    
    ipcMain.handle('get-setting', (event, key) => {
      return settingsService.getSetting(key);
    });
    
    ipcMain.handle('update-setting', (event, key, value) => {
      console.log(`收到更新设置请求: ${key} = `, value);
      try {
        // 验证发送者
        const webContents = event.sender;
        if (!webContents || webContents.isDestroyed()) {
          console.error('无效的请求发送者');
          throw new Error('无效的请求发送者');
        }
        
        // 检查 settingsService 是否已正确加载
        if (!settingsService || typeof settingsService.updateSetting !== 'function') {
          console.error('settingsService 未正确加载');
          // 尝试重新加载 settingsService
          const settingsServicePath = path.join(__dirname, 'src', 'services', 'settings-service.js');
          delete require.cache[require.resolve(settingsServicePath)];
          const reloadedSettingsService = require(settingsServicePath);
          
          if (!reloadedSettingsService || typeof reloadedSettingsService.updateSetting !== 'function') {
            throw new Error('settingsService 加载失败');
          }
          
          // 使用重新加载的 settingsService
          return reloadedSettingsService.updateSetting(key, value);
        }
        
        // 正常调用
        return settingsService.updateSetting(key, value);
      } catch (error) {
        console.error(`更新设置失败: ${key}`, error);
        throw new Error(`更新设置失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('reset-settings', () => {
      return settingsService.resetSettings();
    });
    
    ipcMain.handle('export-settings', (event, filePath) => {
      return settingsService.exportSettings(filePath);
    });
    
    ipcMain.handle('import-settings', (event, filePath) => {
      return settingsService.importSettings(filePath);
    });
    
    // 安全相关
    ipcMain.handle('set-master-password', (event, password) => {
      console.log(`收到设置主密码请求`);
      try {
        // 验证发送者
        const webContents = event.sender;
        if (!webContents || webContents.isDestroyed()) {
          console.error('无效的请求发送者');
          throw new Error('无效的请求发送者');
        }
        
        // 检查 settingsService 是否已正确加载
        if (!settingsService || typeof settingsService.setMasterPassword !== 'function') {
          console.error('settingsService 未正确加载');
          // 尝试重新加载 settingsService
          const settingsServicePath = path.join(__dirname, 'src', 'services', 'settings-service.js');
          delete require.cache[require.resolve(settingsServicePath)];
          const reloadedSettingsService = require(settingsServicePath);
          
          if (!reloadedSettingsService || typeof reloadedSettingsService.setMasterPassword !== 'function') {
            throw new Error('settingsService 加载失败');
          }
          
          // 使用重新加载的 settingsService
          return reloadedSettingsService.setMasterPassword(password);
        }
        
        // 正常调用
        return settingsService.setMasterPassword(password);
      } catch (error) {
        console.error(`设置主密码失败:`, error);
        throw new Error(`设置主密码失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('verify-master-password', (event, password) => {
      return settingsService.verifyMasterPassword(password);
    });
    
    ipcMain.handle('clear-master-password', () => {
      return settingsService.clearMasterPassword();
    });
  }
  
  // 数据备份服务
  if (dataBackupService) {
    ipcMain.handle('create-backup', async () => {
      try {
        return await dataBackupService.createBackup();
      } catch (error) {
        throw new Error(`创建备份失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('get-backups', () => {
      return dataBackupService.getBackups();
    });
    
    ipcMain.handle('restore-backup', async (event, backupPath) => {
      try {
        return await dataBackupService.restoreBackup(backupPath);
      } catch (error) {
        throw new Error(`恢复备份失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('delete-backup', (event, backupPath) => {
      return dataBackupService.deleteBackup(backupPath);
    });
    
    ipcMain.handle('export-profiles', async (event, profileIds, exportPath) => {
      try {
        return await dataBackupService.exportProfiles(profileIds, exportPath);
      } catch (error) {
        throw new Error(`导出配置失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('import-profiles', async (event, importPath) => {
      try {
        return await dataBackupService.importProfiles(importPath);
      } catch (error) {
        throw new Error(`导入配置失败: ${error.message}`);
      }
    });
  }
  
  // Cookie 管理服务
  if (cookieManager) {
    ipcMain.handle('get-cookies', async (event, profileId, url, forceRefresh = false) => {
      try {
        console.log(`IPC: 获取 Cookie, 强制刷新: ${forceRefresh}`);
        const cookies = await cookieManager.getCookies(profileId, url, forceRefresh);
        return cookies;
      } catch (error) {
        console.error('获取 Cookie 失败:', error);
        throw new Error(`获取 Cookie 失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('set-cookie', async (event, data) => {
      try {
        const { profileId, cookie } = data;
        console.log('收到 set-cookie 请求:', { profileId, cookie });
        return await cookieManager.setCookie(profileId, cookie);
      } catch (error) {
        console.error('设置 Cookie 失败:', error);
        throw new Error(`设置 Cookie 失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('delete-cookie', async (event, data) => {
      try {
        const { profileId, url, name } = data;
        console.log('收到 delete-cookie 请求:', { profileId, url, name });
        return await cookieManager.deleteCookie(profileId, url, name);
      } catch (error) {
        console.error('删除 Cookie 失败:', error);
        throw new Error(`删除 Cookie 失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('delete-domain-cookies', async (event, data) => {
      try {
        const { profileId, url } = data;
        console.log('收到 delete-domain-cookies 请求:', { profileId, url });
        return await cookieManager.deleteDomainCookies(profileId, url);
      } catch (error) {
        console.error('删除域名 Cookie 失败:', error);
        throw new Error(`删除域名 Cookie 失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('clear-cookies', async (event, profileId, url) => {
      try {
        return await cookieManager.clearCookies(profileId, url);
      } catch (error) {
        throw new Error(`清除 Cookie 失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('export-cookies', async (event, profileId, filePath, url) => {
      try {
        return await cookieManager.exportCookies(profileId, filePath, url);
      } catch (error) {
        throw new Error(`导出 Cookie 失败: ${error.message}`);
      }
    });
    
    ipcMain.handle('import-cookies', async (event, profileId, filePath) => {
      try {
        return await cookieManager.importCookies(profileId, filePath);
      } catch (error) {
        throw new Error(`导入 Cookie 失败: ${error.message}`);
      }
    });

    // 注册 get-local-storage 处理器
    try {
      ipcMain.handle('get-local-storage', async (event, profileId, url, storageType = 'localStorage') => {
        try {
          return await cookieManager.getLocalStorage(profileId, url, storageType);
        } catch (error) {
          throw new Error(`获取本地存储失败: ${error.message}`);
        }
      });
      console.log('注册 get-local-storage 处理器成功');
    } catch (error) {
      console.warn('处理程序 get-local-storage 已存在，跳过注册');
    }
    
    // 注册 set-local-storage 处理器
    try {
      ipcMain.handle('set-local-storage', async (event, profileId, url, data, storageType = 'localStorage') => {
        try {
          return await cookieManager.setLocalStorage(profileId, url, data, storageType);
        } catch (error) {
          throw new Error(`设置本地存储失败: ${error.message}`);
        }
      });
      console.log('注册 set-local-storage 处理器成功');
    } catch (error) {
      console.warn('处理程序 set-local-storage 已存在，跳过注册');
    }
    
    // 注册 clear-local-storage 处理器
    if (!ipcMain.listenerCount('clear-local-storage')) {
      ipcMain.handle('clear-local-storage', async (event, profileId, url, storageType = 'localStorage') => {
        try {
          return await cookieManager.clearLocalStorage(profileId, url, storageType);
        } catch (error) {
          console.error('清除本地存储失败:', error);
          return false;
        }
      });
      console.log('注册 clear-local-storage 处理器成功');
    } else {
      console.warn('处理程序 clear-local-storage 已存在，跳过注册');
    }
    
    // 注册 load-storage-from-profile 处理器
    if (!ipcMain.listenerCount('load-storage-from-profile')) {
      ipcMain.handle('load-storage-from-profile', async (event, profileId, url, storageType = 'localStorage') => {
        try {
          return await cookieManager.loadStorageFromProfile(profileId, url, storageType);
        } catch (error) {
          console.error('从配置文件加载存储项失败:', error);
          return false;
        }
      });
      console.log('注册 load-storage-from-profile 处理器成功');
    } else {
      console.warn('处理程序 load-storage-from-profile 已存在，跳过注册');
    }
    
    // 注册 load-cookies-from-profile 处理器
    if (!ipcMain.listenerCount('load-cookies-from-profile')) {
      ipcMain.handle('load-cookies-from-profile', async (event, profileId, url) => {
        try {
          return await cookieManager.loadCookiesFromProfile(profileId, url);
        } catch (error) {
          console.error('从配置文件加载 Cookie 失败:', error);
          return false;
        }
      });
      console.log('注册 load-cookies-from-profile 处理器成功');
    } else {
      console.warn('处理程序 load-cookies-from-profile 已存在，跳过注册');
    }
    
    // delete-cookie 处理器已在前面注册，这里不再重复注册
  }
  
  // 增强指纹管理服务
  if (enhancedFingerprintManager) {
    try {
      ipcMain.handle('generate-random-fingerprint', () => {
        return enhancedFingerprintManager.generateRandomFingerprint();
      });
    } catch (error) {
      console.warn('处理程序 generate-random-fingerprint 已存在，跳过注册');
    }
    
    try {
      ipcMain.handle('test-fingerprint-protection', async (event, data) => {
        // 支持新的测试平台功能
        const { profileId, platform, fingerprint } = typeof data === 'object' ? data : { profileId: data };
        const browser = browserManager.getRunningInstance(profileId)?.browser;
        
        if (!browser) {
          throw new Error('没有运行中的浏览器实例');
        }
        
        // 如果指定了测试平台，使用指纹测试管理器
        if (platform && fingerprintTestManager) {
          try {
            const results = await fingerprintTestManager.runTest(browser, platform);
            return {
              success: true,
              details: `在 ${results.platform} 平台上测试成功。指纹防护有效。`,
              data: results.data
            };
          } catch (testError) {
            console.error('指纹测试失败:', testError);
            return {
              success: false,
              details: `测试失败: ${testError.message}`,
              suggestion: '尝试启用增强模式（Brave 风格）以提高防护效果'
            };
          }
        }
        
        // 如果没有指定测试平台或指纹测试管理器不可用
        return {
          success: false,
          details: '指纹测试管理器不可用，请选择指定的测试平台',
          suggestion: '请选择 yalala.com 或其他测试平台进行测试'
        };
      });
    } catch (error) {
      console.warn('处理程序 test-fingerprint-protection 已存在，跳过注册');
    }
    
    // 注册指纹测试平台相关的处理程序
    if (fingerprintTestManager) {
      try {
        // 获取所有测试平台
        ipcMain.handle('get-test-platforms', (event, type) => {
          return fingerprintTestManager.getAllPlatforms();
        });
        
        // 打开URL在浏览器中 - 先关闭再重新启动浏览器
        ipcMain.handle('open-url-in-browser', async (event, profileId, url) => {
          console.log('尝试在浏览器中打开URL:', url, '配置ID:', profileId);
          
          try {
            // 获取配置信息
            const profile = await profileManager.getProfileById(profileId);
            if (!profile) {
              throw new Error('找不到配置信息');
            }
            
            // 先关闭现有实例
            const instance = browserManager.getRunningInstance(profileId);
            if (instance) {
              await browserManager.closeBrowser(profileId);
              // 等待一小段时间确保浏览器已关闭
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // 修改配置的启动URL
            const updatedProfile = { ...profile };
            if (!updatedProfile.startup) {
              updatedProfile.startup = {};
            }
            updatedProfile.startup.startUrl = url;
            
            // 保存更新后的配置
            await profileManager.saveProfile(updatedProfile);
            
            // 启动浏览器
            await browserManager.launchBrowser(profileId, { startUrl: url });
            
            return { success: true };
          } catch (error) {
            console.error('打开URL失败:', error);
            throw error;
          }
        });
        
        // 运行指纹对比测试
        ipcMain.handle('run-comparison-test', async (event, data) => {
          const { profileId, platform, fingerprint } = data;
          const browser = browserManager.getRunningInstance(profileId)?.browser;
          
          if (!browser) {
            throw new Error('没有运行中的浏览器实例');
          }
          
          try {
            const results = await fingerprintTestManager.runComparisonTest(browser, fingerprint, [platform]);
            return {
              success: true,
              details: `在 ${results[0].platform} 平台上完成对比测试。`,
              data: results[0]
            };
          } catch (testError) {
            console.error('指纹对比测试失败:', testError);
            return {
              success: false,
              details: `对比测试失败: ${testError.message}`,
              suggestion: '请确保浏览器实例正常运行并且网络连接正常'
            };
          }
        });
        
        // 获取最近的测试结果
        ipcMain.handle('get-recent-test-results', (event, count) => {
          return fingerprintTestManager.getRecentTestResults(count || 5);
        });
      } catch (error) {
        console.error('注册指纹测试平台处理程序失败:', error);
      }
    } else {
      console.warn('指纹测试平台管理器不可用，跳过相关处理程序注册');
    }
  }
  
  // 应用信息
  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      electron: process.versions.electron,
      chrome: process.versions.chrome
    };
  });
  
  // 设置服务
  if (settingsService) {
    try {
      ipcMain.handle('get-setting', (event, key) => {
        return settingsService.getSetting(key);
      });
    } catch (error) {
      console.warn('处理程序 get-setting 已存在，跳过注册');
    }
    
    try {
      ipcMain.handle('save-setting', (event, key, value) => {
        return settingsService.saveSetting(key, value);
      });
    } catch (error) {
      console.warn('处理程序 save-setting 已存在，跳过注册');
    }
    
    try {
      ipcMain.handle('get-all-settings', () => {
        return settingsService.getAllSettings();
      });
    } catch (error) {
      console.warn('处理程序 get-all-settings 已存在，跳过注册');
    }
  }
  
  // 性能优化服务
  if (performanceOptimizer) {
    try {
      ipcMain.handle('get-resource-usage', () => {
        return performanceOptimizer.getResourceUsage();
      });
    } catch (error) {
      console.warn('处理程序 get-resource-usage 已存在，跳过注册');
    }
    
    try {
      ipcMain.handle('update-performance-settings', () => {
        return performanceOptimizer.updateSettings();
      });
    } catch (error) {
      console.warn('处理程序 update-performance-settings 已存在，跳过注册');
    }
    
    try {
      ipcMain.handle('record-browser-activity', (event, profileId) => {
        return performanceOptimizer.recordActivity(profileId);
      });
    } catch (error) {
      console.warn('处理程序 record-browser-activity 已存在，跳过注册');
    }
  }
  
  // 文件对话框
  ipcMain.handle('show-open-dialog', async (event, options) => {
    return dialog.showOpenDialog(options);
  });
  
  ipcMain.handle('show-save-dialog', async (event, options) => {
    return dialog.showSaveDialog(options);
  });
  
  // 文件写入处理程序
  ipcMain.handle('write-file', async (event, { filePath, content }) => {
    try {
      if (!filePath || typeof content !== 'string') {
        return { success: false, error: '无效的参数' };
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true };
    } catch (error) {
      console.error(`写入文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
  
  // 文件读取处理程序
  ipcMain.handle('read-file', async (event, { filePath }) => {
    try {
      if (!filePath) {
        return { success: false, error: '无效的文件路径' };
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      return { success: true, content };
    } catch (error) {
      console.error(`读取文件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  });
}


/**
 * 初始化应用数据，包括迁移资源文件和创建默认配置
 */
async function initializeAppData() {
  
  // 迁移资源文件（包括地理位置数据库）
  try {
    await dataMigrationService.migrateResourceFiles();
    console.log('资源文件迁移成功');
  } catch (error) {
    console.error('资源文件迁移失败:', error);
  }
  
  // 检查是否有配置文件
  const profiles = profileManager.getAllProfiles();
  if (profiles.length === 0) {
    // 创建默认配置
    profileManager.createDefaultProfile();
  }
}

// 定期清理已完成的自动化任务
setInterval(() => {
  automationService.cleanupTasks();
}, 3600000); // 每小时清理一次

// 初始化性能优化服务
if (performanceOptimizer) {
  performanceOptimizer.init();
  console.log('性能优化服务已初始化');
}
