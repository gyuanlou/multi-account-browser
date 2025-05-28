/**
 * Edge 浏览器适配器
 * 提供 Microsoft Edge 浏览器特定的实现
 * 基于 Playwright API
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const BrowserAdapter = require('./browser-adapter');

class EdgeAdapter extends BrowserAdapter {
  /**
   * 获取 Edge 浏览器可执行文件路径
   * @returns {string} Edge 可执行文件路径
   */
  getBrowserPath() {
    // 根据不同操作系统返回 Edge 路径
    switch (process.platform) {
      case 'win32':
        return 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
      case 'darwin':
        return '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
      case 'linux':
        const possiblePaths = [
          '/usr/bin/microsoft-edge',
          '/usr/bin/microsoft-edge-stable'
        ];
        
        for (const edgePath of possiblePaths) {
          if (fs.existsSync(edgePath)) {
            return edgePath;
          }
        }
        throw new Error('找不到 Microsoft Edge 浏览器');
      default:
        throw new Error('不支持的操作系统');
    }
  }
  
  /**
   * 获取浏览器类型
   * @returns {string} 浏览器类型
   */
  getBrowserType() {
    return 'edge';
  }
  
  /**
   * 清理浏览器用户数据目录
   * @param {string} userDataDir 用户数据目录路径
   * @returns {boolean} 是否成功清理
   */
  cleanupUserData(userDataDir) {
    try {
      return true;
    } catch (error) {
      console.error(`清理 Edge 用户数据目录失败: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 获取用户数据路径
   * @param {string} baseDir 基础目录
   * @param {string} profileId 配置文件ID
   * @returns {string} 用户数据目录路径
   */
  getUserDataPath(baseDir, profileId) {
    return path.join(baseDir, `edge_${profileId}`);
  }

  /**
   * 构建 Edge 启动参数
   * @param {Object} profile 配置文件
   * @param {string} userDataDir 用户数据目录
   * @param {number} debugPort 调试端口
   * @param {Object} options 启动选项
   * @returns {Object} 启动参数对象
   */
  buildLaunchArgs(profile, userDataDir, debugPort, options = {}) {
    // 获取 electron app 对象
    const { app } = require('electron');
    
    // 确定下载路径
    let downloadPath = profile.downloadPath;
    if (!downloadPath) {
      try {
        // 使用系统下载目录作为默认下载路径
        downloadPath = app.getPath('downloads');
      } catch (error) {
        // 如果无法获取系统下载目录，使用用户数据目录下的 Downloads 文件夹
        downloadPath = path.join(userDataDir, 'Downloads');
        
        // 确保下载目录存在
        if (!fs.existsSync(downloadPath)) {
          fs.mkdirSync(downloadPath, { recursive: true });
        }
      }
    }
    
    // 构建 Playwright 的 Edge 启动选项
    const launchOptions = {
      headless: false,
      executablePath: this.getBrowserPath(),
      args: [
        // 基本参数
        '--no-first-run',
        '--no-default-browser-check',
        `--remote-debugging-port=${debugPort}`,
        '--disable-sync',
        '--disable-breakpad',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        `--download-default-directory=${downloadPath}`,
        '--enable-local-file-accesses',
        '--allow-file-access-from-files',
        
        // Edge 特定参数
        '--disable-microsoft-update',
        
        // 禁用特性（合并参数）
        '--disable-features=TranslateUI,SameSiteByDefaultCookies,msEdgeTranslate',
        
        // 启用特性（合并参数）
        '--enable-features=NetworkService,NetworkServiceInProcess',
        
        // 禁用Blink特性（合并参数）
        '--disable-blink-features=AutomationControlled,PermissionsPolicyExperimentalFeatures',
        
        // 反自动化检测参数
        '--ignore-certificate-errors',          // 忽略证书错误
        '--disable-domain-reliability',         // 禁用域可靠性监控
        '--disable-infobars',                   // 禁用信息栏
        '--no-sandbox',                         // 禁用沙盒模式
        '--disable-setuid-sandbox',             // 禁用setuid沙盒
        '--disable-notifications',              // 禁用通知
        
        // WebGL相关参数（保留全部）
        '--enable-unsafe-webgl',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--enable-unsafe-swiftshader',
        
        // 权限和交互相关参数
        '--document-user-activation-required=false',
        '--allow-insecure-localhost',
        '--autoplay-policy=no-user-gesture-required'
        
        // 以下参数已注释，可能影响网站功能
        // '--disable-web-security',          // 禁用网络安全限制，允许跨域请求
        // '--disable-features=IsolateOrigins,site-per-process', // 禁用站点隔离
        // '--enable-automation',              // 启用自动化标记
      ]
    };
    
    // 添加窗口大小设置
    const { windowWidth, windowHeight } = profile.startup || {};
    if (windowWidth && windowHeight) {      
      // 使用命令行参数设置窗口大小
      launchOptions.args = launchOptions.args || [];
      launchOptions.args.push(`--window-size=${parseInt(windowWidth)},${parseInt(windowHeight)}`);
    } else {
      // 如果没有设置窗口大小，使用默认值
      launchOptions.args = launchOptions.args || [];
      launchOptions.args.push('--window-size=1280,800');
    }
    
    // 添加代理设置
    if (profile.proxy && profile.proxy.enabled) {
      const { type, host, port, username, password } = profile.proxy;
      
      let proxyUrl = '';
      if (type === 'socks4' || type === 'socks5') {
        proxyUrl = `socks5://${host}:${port}`;
      } else if (type === 'https') {
        proxyUrl = `https://${host}:${port}`;
      } else {
        proxyUrl = `http://${host}:${port}`;
      }
      
      // 如果有用户名和密码，添加到 URL 中
      if (username && password) {
        const authPart = `${username}:${password}@`;
        const urlParts = proxyUrl.split('://');
        proxyUrl = `${urlParts[0]}://${authPart}${urlParts[1]}`;
      }
      
      launchOptions.proxy = {
        server: proxyUrl
      };
    }
    
    // 添加指纹设置
    if (profile.fingerprint) {
      // UserAgent
      if (profile.fingerprint.userAgent) {
        launchOptions.userAgent = profile.fingerprint.userAgent;
      }
      
      // 语言设置
      if (profile.fingerprint.language) {
        launchOptions.locale = profile.fingerprint.language;
      }
    }
    
    // 添加其他启动参数
    if (options.args) {
      launchOptions.args = [...launchOptions.args, ...options.args];
    }
    
    return {
      userDataDir,
      launchOptions
    };
  }
  
  /**
   * 启动 Edge 浏览器
   * @param {string} executablePath Edge 可执行文件路径
   * @param {Object} launchArgs 启动参数
   * @param {Object} options 启动选项
   * @returns {Promise<Object>} Playwright 浏览器上下文
   */
  async launchBrowser(executablePath, launchArgs, options = {}) {
    const { userDataDir, launchOptions } = launchArgs;
    
    // 过滤启动参数，移除可能影响内部页面的参数
    let filteredArgs = [];
    if (launchOptions.args) {
      // 移除可能影响内部页面的参数
      const argsToRemove = [
        '--disable-web-security',  // 这个参数会影响内部页面CSS布局
        '--disable-features=IsolateOrigins,site-per-process',  // 这个参数影响页面隔离
        '--force-device-scale-factor='  // 移除任何缩放因子参数
      ];
      
      filteredArgs = launchOptions.args.filter(arg => {
        return !argsToRemove.some(argToRemove => arg && arg.includes(argToRemove));
      });
      
      // 确保已有窗口大小设置
      const hasWindowSize = filteredArgs.some(arg => arg && arg.startsWith('--window-size='));
      if (!hasWindowSize) {
        // 添加默认窗口大小
        filteredArgs.push('--window-size=1280,800');
      }
    } else {
      // 如果没有参数，创建默认参数
      filteredArgs = ['--window-size=1280,800', '--enable-features=IsolateOrigins'];
    }
    
    // 使用 Playwright 启动 Edge
    const context = await chromium.launchPersistentContext(userDataDir, {
      ...launchOptions,
      executablePath: executablePath || this.getBrowserPath(),
      acceptDownloads: true, // 允许下载文件
      channel: 'msedge',
      // 不设置viewport，而是使用命令行参数设置窗口大小
      viewport: null,
      args: filteredArgs
    });
    
    // 设置下载行为
    const pages = context.pages();
    if (pages.length > 0) {
      const page = pages[0];
      
      // 加载下载处理预加载脚本
      const preloadPath = path.join(process.cwd(), 'src', 'preload', 'download-handler.js');
      
      // 监听下载事件
      page.on('download', async download => {
        try {
          const downloadPath = launchOptions.args.find(arg => arg.startsWith('--download-default-directory='));
          if (downloadPath) {
            const downloadDir = downloadPath.split('=')[1];
            
            // 使用基类中的通用下载处理方法，并传递页面对象以显示通知
            const result = await this._handleDownload(download, downloadDir, 'Edge', page);
            
            if (!result.success) {
              console.error(`Edge下载失败: ${result.error}`);
            } else {
              console.log(`Edge下载成功: ${result.path}`);
            }
          }
        } catch (error) {
          console.error(`下载处理出错: ${error.message}`);
        }
      });
    }
    
    // 应用指纹防护（使用基类中的实现）
    // 确保只在常规页面应用指纹防护，不影响内部页面
    if (options.profile && options.profile.fingerprint && options.profile.fingerprint.enabled) {
      try {
        // 检查当前页面
        const pages = await context.pages();
        if (pages.length > 0) {
          const currentUrl = pages[0].url();
          // 跳过浏览器内部页面
          if (!currentUrl.startsWith('chrome://') && 
              !currentUrl.startsWith('edge://') && 
              !currentUrl.startsWith('about:') && 
              !currentUrl.startsWith('chrome-extension://') && 
              !currentUrl.startsWith('devtools://') && 
              !currentUrl.startsWith('view-source:')) {
            await this.applyFingerprintProtection(context, options.profile);
          } else {
            console.log(`[指纹防护] 跳过浏览器内部页面的指纹防护: ${currentUrl}`);
          }
        }
      } catch (error) {
        console.error('在检查页面类型时出错:', error);
      }
    }
    
    // 如果有起始 URL，打开该页面
    if (options.url || options.startUrl) {
      // 获取现有页面，如果没有则创建新页面
      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      
      // 导航到指定 URL
      const targetUrl = options.url || options.startUrl;
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    }
    
    return context;
  }
  
  /**
   * 连接到 Edge 浏览器
   * @param {string} browserURL 浏览器 URL 或 WebSocket 端点
   * @returns {Promise<Object>} Playwright 浏览器上下文
   */
  async connectToBrowser(browserURL) {
    const browser = await chromium.connect({ wsEndpoint: browserURL });
    const context = browser.contexts()[0];
    return context;
  }
  
  /**
   * 应用指纹保护
   * @param {Object} context 浏览器上下文
   * @param {Object} profile 配置文件
   * @returns {Promise<void>}
   */
  async applyFingerprintProtection(context, profile) {
    if (!profile.fingerprintProtection || !profile.fingerprintProtection.enabled) {
      return { success: true, message: '指纹保护未启用' };
    }
    
    // 提取指纹保护设置
    const fingerprintSettings = {
      canvas: profile.fingerprint?.canvas || 'off',
      webRTC: profile.fingerprint?.webRTC || 'default',
      userAgent: profile.fingerprint?.userAgent || null
    };
    
    try {
      // 使用 Playwright 的 addInitScript 方法注入指纹保护脚本
      await context.addInitScript(function(settings) {
        // Canvas 指纹保护
        if (settings.canvas !== 'off') {
          const originalGetContext = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function(type, ...args) {
            const context = originalGetContext.apply(this, [type, ...args]);
            if (context && (type === '2d' || type.includes('webgl'))) {
              const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
              this.toDataURL = function(...args) {
                const result = originalToDataURL.apply(this, args);
                // 添加随机噪点
                return result.replace(/.$/, Math.floor(Math.random() * 10));
              };
            }
            return context;
          };
        }
        
        // WebRTC 保护
        if (settings.webRTC === 'disabled') {
          Object.defineProperty(window, 'RTCPeerConnection', {
            value: undefined,
            writable: false
          });
        }
        
        // 用户代理修改
        if (settings.userAgent) {
          Object.defineProperty(navigator, 'userAgent', {
            value: settings.userAgent,
            writable: false
          });
        }
      }, fingerprintSettings);
      
      return { success: true, message: '已应用指纹保护设置' };
    } catch (error) {
      console.error('应用指纹保护失败:', error);
      return { success: false, message: `应用指纹保护失败: ${error.message}` };
    }
  }
  
  
  
  /**
   * 测试代理
   * @param {Object} proxyConfig 代理配置
   * @returns {Promise<Object>} 测试结果
   */
  async testProxy(proxyConfig) {
    const { type, host, port, username, password, testUrl } = proxyConfig;
    const url = testUrl || 'https://api.ipify.org?format=json';
    
    try {
      // 创建一个临时浏览器实例来测试代理
      const browser = await chromium.launch({
        headless: true,
        channel: 'msedge',
        proxy: {
          server: `${type}://${host}:${port}`,
          username: username,
          password: password
        }
      });
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // 设置超时
      page.setDefaultTimeout(30000);
      
      // 导航到测试 URL
      await page.goto(url);
      
      // 获取页面内容
      const content = await page.content();
      
      // 关闭浏览器
      await browser.close();
      
      return {
        success: true,
        message: '代理连接成功',
        data: content
      };
    } catch (error) {
      console.error('代理测试失败:', error);
      return {
        success: false,
        message: `代理测试失败: ${error.message}`
      };
    }
  }
  
  
  
  /**
   * 清除浏览器缓存
   * @param {Object} context 浏览器上下文
   * @returns {Promise<Object>} 清除结果
   */
  async clearCache(context) {
    try {
      // 创建新页面
      const page = await context.newPage();
      
      // 清除缓存
      await page.evaluate(() => {
        if (window.caches) {
          caches.keys().then(keys => {
            keys.forEach(key => caches.delete(key));
          });
        }
        return true;
      });
      
      // 关闭页面
      await page.close();
      
      return { success: true, message: '浏览器缓存已清除' };
    } catch (error) {
      console.error('清除浏览器缓存失败:', error);
      return { success: false, message: `清除浏览器缓存失败: ${error.message}` };
    }
  }
  
  /**
   * 清除本地存储
   * @param {Object} context 浏览器上下文
   * @param {string} url 网站 URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearLocalStorage(context, url) {
    try {
      // 创建新页面
      const page = await context.newPage();
      
      // 导航到指定 URL
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // 清除本地存储
      await page.evaluate(() => {
        try {
          // 清除 localStorage
          if (window.localStorage) {
            localStorage.clear();
          }
          
          // 清除 sessionStorage
          if (window.sessionStorage) {
            sessionStorage.clear();
          }
          
          // 清除 indexedDB
          if (window.indexedDB) {
            const databases = indexedDB.databases();
            if (databases) {
              databases.then(dbs => {
                dbs.forEach(db => {
                  indexedDB.deleteDatabase(db.name);
                });
              });
            }
          }
          
          return true;
        } catch (e) {
          console.error('Browser-side error:', e);
          return false;
        }
      });
      
      // 关闭页面
      await page.close();
      
      return { success: true, message: '本地存储已清除' };
    } catch (error) {
      console.error('清除本地存储失败:', error);
      return { success: false, message: `清除本地存储失败: ${error.message}` };
    }
  }
  
  /**
   * 清除 Cookie
   * @param {Object} context 浏览器上下文
   * @param {string} url 可选，指定网站的 URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearCookies(context, url) {
    try {
      // 获取所有 Cookie
      const cookies = await context.cookies();
      
      // 清除所有 Cookie
      await context.clearCookies();
      
      return { 
        success: true, 
        message: `已清除 ${cookies.length} 个 Cookie` 
      };
    } catch (error) {
      console.error('清除 Cookie 失败:', error);
      return { success: false, message: `清除 Cookie 失败: ${error.message}` };
    }
  }
  

}

module.exports = EdgeAdapter;
