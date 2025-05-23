/**
 * Chrome 浏览器适配器
 * 提供 Chrome 浏览器特定的实现
 * 基于 Playwright API
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const BrowserAdapter = require('./browser-adapter');

class ChromeAdapter extends BrowserAdapter {
  /**
   * 获取 Chrome 浏览器可执行文件路径
   * @returns {string} Chrome 可执行文件路径
   */
  getBrowserPath() {
    // 根据不同操作系统返回 Chrome 路径
    switch (process.platform) {
      case 'win32':
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      case 'darwin':
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      case 'linux':
        // 尝试多个可能的路径
        const possiblePaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser'
        ];
        
        for (const chromePath of possiblePaths) {
          if (fs.existsSync(chromePath)) {
            return chromePath;
          }
        }
        throw new Error('找不到 Chrome 或 Chromium 浏览器');
      default:
        throw new Error('不支持的操作系统');
    }
  }
  
  /**
   * 获取浏览器类型
   * @returns {string} 浏览器类型
   */
  getBrowserType() {
    return 'chrome';
  }
  
  /**
   * 清理浏览器用户数据目录
   * @param {string} userDataDir 用户数据目录路径
   * @returns {boolean} 是否成功清理
   */
  cleanupUserData(userDataDir) {
    try {
      // 清理锁文件
      const lockFiles = [
        'SingletonLock',
        'SingletonCookie',
        'SingletonSocket',
        '.com.google.Chrome.yLUY1H',
        'lockfile'
      ];
      
      for (const lockFile of lockFiles) {
        const lockFilePath = path.join(userDataDir, lockFile);
        if (fs.existsSync(lockFilePath)) {
          fs.unlinkSync(lockFilePath);
        }
      }
      
      // 清理其他可能导致问题的文件
      const filesToClean = [
        'Crash Reports',
        'Last Session',
        'Last Tabs',
        'Current Session',
        'Current Tabs'
      ];
      
      for (const file of filesToClean) {
        const filePath = path.join(userDataDir, file);
        if (fs.existsSync(filePath)) {
          if (fs.statSync(filePath).isDirectory()) {
            // 如果是目录，不删除，只清空
          } else {
            fs.unlinkSync(filePath);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error(`清理 Chrome 用户数据目录失败: ${error.message}`);
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
    return path.join(baseDir, `chrome_${profileId}`);
  }

  /**
   * 构建 Chrome 启动参数
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
    
    // 构建 Playwright 的 Chrome 启动选项
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
        
        // 禁用特性（合并参数）
        '--disable-features=TranslateUI,SameSiteByDefaultCookies',
        
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
      launchOptions.args.push(`--window-size=${parseInt(windowWidth)},${parseInt(windowHeight)}`);
    } else {
      // 如果没有设置窗口大小，使用默认值
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
   * 启动 Chrome 浏览器
   * @param {string} executablePath Chrome 可执行文件路径
   * @param {Object} launchArgs 启动参数
   * @param {Object} options 启动选项
   * @returns {Promise<Object>} Playwright 浏览器上下文
   */
  async launchBrowser(executablePath, launchArgs, options = {}) {
    const { userDataDir, launchOptions } = launchArgs;
    
    // 获取预加载脚本路径
    const preloadPath = path.join(process.cwd(), 'src', 'preload', 'download-handler.js');
    
    // 确保预加载脚本存在
    if (!fs.existsSync(preloadPath)) {
      console.warn(`预加载脚本不存在: ${preloadPath}`);
    }
    
    // 获取下载路径
    const downloadPathArg = launchOptions.args.find(arg => arg.startsWith('--download-default-directory='));
    let downloadPath = '';
    if (downloadPathArg) {
      downloadPath = downloadPathArg.split('=')[1];
    }
    
    // 创建启动参数副本，移除影响内部页面的参数
    let filteredArgs = [...launchOptions.args];
    
    // 移除可能影响内部页面的参数
    const argsToRemove = [
      '--disable-web-security',  // 这个参数会影响内部页面CSS布局
      '--disable-features=IsolateOrigins,site-per-process',  // 这个参数影响页面隔离
      '--force-device-scale-factor='  // 移除任何缩放因子参数
    ];
    
    filteredArgs = filteredArgs.filter(arg => {
      return !argsToRemove.some(argToRemove => arg.includes(argToRemove));
    });
    
    // 确保已有窗口大小设置
    const hasWindowSize = filteredArgs.some(arg => arg.startsWith('--window-size='));
    if (!hasWindowSize) {
      // 添加默认窗口大小
      filteredArgs.push('--window-size=1280,800');
    }
    
    // 使用 Playwright 启动 Chrome
    const context = await chromium.launchPersistentContext(userDataDir, {
      ...launchOptions,
      executablePath: executablePath || this.getBrowserPath(),
      acceptDownloads: true, // 允许下载文件
      downloadsPath: downloadPath, // 直接设置 Playwright 的下载路径
      // 不设置viewport，而是使用命令行参数设置窗口大小
      viewport: null,
      args: [
        ...filteredArgs,
        `--preload-script=${preloadPath}` // 添加预加载脚本
      ]
    });
    
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
    
    // 设置下载行为
    const pages = context.pages();
    if (pages.length > 0) {
      const page = pages[0];
      
      // 监听下载事件
      page.on('download', async download => {
        try {
          const downloadPath = launchOptions.args.find(arg => arg.startsWith('--download-default-directory='));
          if (downloadPath) {
            const downloadDir = downloadPath.split('=')[1];
            const suggestedFilename = await download.suggestedFilename();
            const savePath = path.join(downloadDir, suggestedFilename);
            
            // 使用 Playwright 的 saveAs 方法指定文件名和保存路径
            await download.saveAs(savePath);
            
            // 添加延时，确保文件完全保存
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 注入脚本以修改下载项的打开文件夹功能
            await page.evaluate((downloadDir) => {
            // 等待下载管理器页面加载完成
            setTimeout(() => {
              // 查找所有「打开文件夹」按钮并修改其行为
              const observer = new MutationObserver((mutations) => {
                const buttons = document.querySelectorAll('cr-icon-button[title="打开文件夹"], cr-icon-button[title="Open folder"], cr-icon-button[aria-label="打开文件夹"], cr-icon-button[aria-label="Open folder"]');
                
                buttons.forEach(button => {
                  if (!button.hasAttribute('data-modified')) {
                    button.setAttribute('data-modified', 'true');
                    
                    // 替换原有的点击事件
                    button.addEventListener('click', (event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      
                      // 使用自定义消息通知主进程打开文件夹
                      window.postMessage({
                        type: 'OPEN_DOWNLOAD_FOLDER',
                        path: downloadDir
                      }, '*');
                      
                      return false;
                    }, true);
                  }
                });
              });
              
              // 开始观察 DOM 变化
              observer.observe(document.body, { childList: true, subtree: true });
              
              // 添加消息监听器，接收来自主进程的响应
              window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'FOLDER_OPENED') {
                  console.log('文件夹已打开:', event.data.path);
                }
              });
            }, 1000);
          }, downloadDir);
        }
        } catch (error) {
          console.error(`下载处理出错: ${error.message}`);
        }
      });
    }
    
    // 如果有起始 URL，打开该页面
    if (options.url || options.startUrl) {
      // 获取现有页面，如果没有则创建新页面
      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      
      // 导航到指定 URL
      const targetUrl = options.url || options.startUrl;
      console.log(`将页面导航到: ${targetUrl}`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    }
    
    return context;
  }
  
  /**
   * 连接到 Chrome 浏览器
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
    // 检查指纹保护是否启用
    const fingerprintEnabled = 
      (profile.fingerprint && profile.fingerprint.enabled) || 
      (profile.fingerprintProtection && profile.fingerprintProtection.enabled);
    
    if (!fingerprintEnabled) {
      return { success: true, message: '指纹保护未启用' };
    }
    
    console.log(`[指纹防护] Chrome适配器应用指纹防护`);
    
    // 先调用基类的实现，注入 Brave 风格预加载脚本
    try {
      // 调用父类的实现
      const fs = require('fs');
      const path = require('path');
      
      // 获取指纹防护预加载脚本路径
      const fingerprintPreloadPath = path.join(process.cwd(), 'resources', 'fingerprint-scripts', 'preload-fingerprint-protection.js');
      
      // 确保指纹防护预加载脚本存在
      if (fs.existsSync(fingerprintPreloadPath)) {
        // 在现有页面上注入脚本
        const pages = context.pages();
        for (const page of pages) {
          await page.addInitScript({ path: fingerprintPreloadPath });
          console.log(`[指纹防护] 已在现有页面上注入指纹防护脚本`);
        }
        
        // 对新页面进行注入
        context.on('page', async page => {
          try {
            await page.addInitScript({ path: fingerprintPreloadPath });
            console.log(`[指纹防护] 已在新页面上注入指纹防护脚本`);
          } catch (error) {
            console.error(`[指纹防护] 注入指纹防护脚本失败:`, error);
          }
        });
      }
    } catch (error) {
      console.error(`[指纹防护] 应用 Brave 风格预加载脚本失败:`, error);
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
      console.log(`开始测试代理: ${type}://${host}:${port}`);
      
      // 创建一个临时浏览器实例来测试代理
      const browser = await chromium.launch({
        headless: true,
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
  
  // 使用基类中的navigateToUrl方法实现
  // 如果需要Chrome特定的功能，可以重写这个方法
  
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

module.exports = ChromeAdapter;
