/**
 * 浏览器管理服务
 * 负责浏览器实例的启动、关闭和控制
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const profileManager = require('./profile-manager');

// 延迟加载 electron 模块

let electron;
function getElectron() {
  if (!electron) {
    electron = require('electron');
  }
  return electron;
}

class BrowserManager {
  constructor() {
    // 存储所有运行中的浏览器实例
    this.browserInstances = new Map();
    this.initialized = false;
    
    // 延迟初始化，在需要时才设置事件监听
    this.init();
  }
  
  /**
   * 初始化浏览器管理器
   */
  init() {
    // 如果已经初始化，直接返回
    if (this.initialized) return;
    
    try {
      // 仅在主进程中运行时设置事件监听
      if (process.type === 'browser') {
        const { app } = getElectron();
        
        // 清理函数，确保应用退出时关闭所有浏览器实例
        if (app.isReady()) {
          app.on('will-quit', () => {
            this.closeAllInstances();
          });
          this.initialized = true;
        } else {
          app.on('ready', () => {
            app.on('will-quit', () => {
              this.closeAllInstances();
            });
            this.initialized = true;
          });
        }
      }
    } catch (error) {
      console.error('初始化浏览器管理器失败:', error);
    }
  }
  
  /**
   * 启动浏览器实例
   * @param {string} profileId 配置文件 ID
   * @param {Object} options 启动选项
   * @param {string} options.url 要访问的网址
   * @returns {Promise<Object>} 浏览器实例
   */
  async launchBrowser(profileId, options = {}) {
    // 获取配置文件
    const profile = profileManager.getProfileById(profileId);
    if (!profile) {
      throw new Error('找不到指定的配置文件');
    }
    
    // 检查是否已经有运行中的实例
    if (this.browserInstances.has(profileId)) {
      const instance = this.browserInstances.get(profileId);
      if (instance.status === 'running' && instance.browser) {
        try {
          // 验证浏览器实例是否有效
          await instance.browser.pages();
          console.log(`使用现有的浏览器实例: ${profileId}`);
          return instance.browser;
        } catch (error) {
          console.log(`浏览器实例已无效，将重新启动: ${error.message}`);
          this.browserInstances.delete(profileId);
        }
      } else {
        // 如果实例存在但状态不是运行中，删除它
        this.browserInstances.delete(profileId);
      }
    }
    
    // 用户数据目录
    const userDataDir = path.join(
      process.env.HOME || process.env.USERPROFILE,
      '.config',
      'Multi Account Browser',
      'browser_profiles',
      profileId
    );
    
    // 确保用户数据目录存在
    if (!fs.existsSync(userDataDir)) {
      try {
        fs.mkdirSync(userDataDir, { recursive: true });
        console.log(`创建用户数据目录: ${userDataDir}`);
      } catch (e) {
        console.error(`创建用户数据目录失败: ${userDataDir}`, e);
      }
    }
    
    // 清理 SingletonLock 文件
    const singletonLockPath = path.join(userDataDir, 'SingletonLock');
    
    // 更强大的 SingletonLock 清理逻辑
    const cleanSingletonLock = async () => {
      if (fs.existsSync(singletonLockPath)) {
        console.log(`发现 SingletonLock 文件，尝试清理: ${singletonLockPath}`);
        
        // 方法 1: 直接删除
        try {
          fs.unlinkSync(singletonLockPath);
          console.log(`方法 1 成功: 已删除 SingletonLock 文件`);
          return true;
        } catch (error) {
          console.error(`方法 1 失败: ${error.message}`);
        }
        
        // 方法 2: 使用 fs.rmSync
        try {
          fs.rmSync(singletonLockPath, { force: true });
          console.log(`方法 2 成功: 已删除 SingletonLock 文件`);
          return true;
        } catch (error) {
          console.error(`方法 2 失败: ${error.message}`);
        }
        
        // 方法 3: 使用命令行
        try {
          if (process.platform === 'win32') {
            require('child_process').execSync(`del "${singletonLockPath}" /f /q`);
          } else {
            require('child_process').execSync(`rm -f "${singletonLockPath}"`);
          }
          console.log(`方法 3 成功: 已使用命令行删除 SingletonLock 文件`);
          return true;
        } catch (error) {
          console.error(`方法 3 失败: ${error.message}`);
        }
        
        // 方法 4: 使用 sudo
        try {
          require('child_process').execSync(`sudo rm -f "${singletonLockPath}"`);
          console.log(`方法 4 成功: 已使用 sudo 删除 SingletonLock 文件`);
          return true;
        } catch (error) {
          console.error(`方法 4 失败: ${error.message}`);
        }
        
        // 方法 5: 尝试改变文件权限
        try {
          fs.chmodSync(singletonLockPath, 0o666);
          fs.unlinkSync(singletonLockPath);
          console.log(`方法 5 成功: 已改变权限并删除 SingletonLock 文件`);
          return true;
        } catch (error) {
          console.error(`方法 5 失败: ${error.message}`);
        }
        
        // 如果所有方法都失败，等待一下再检查
        await new Promise(resolve => setTimeout(resolve, 1000));
        return !fs.existsSync(singletonLockPath);
      }
      
      return true; // 文件不存在，不需要清理
    };
    
    // 尝试清理 3 次
    let cleaned = false;
    for (let i = 0; i < 3; i++) {
      cleaned = await cleanSingletonLock();
      if (cleaned) break;
      
      console.log(`第 ${i+1} 次清理失败，等待后重试...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!cleaned) {
      console.error(`无法清理 SingletonLock 文件，可能会影响浏览器启动`);
    }

    // 使用 _buildLaunchArgs 构建启动参数
    const debugPort = 9222 + Math.floor(Math.random() * 1000);
    const args = this._buildLaunchArgs(profile, userDataDir, debugPort, options);
    
    // 添加必要的安全参数
    args.push(
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-sandbox'
    );
    
    // 确保启动 URL 存在
    let hasStartUrl = false;
    for (const arg of args) {
      if (arg.startsWith('http://') || arg.startsWith('https://')) {
        hasStartUrl = true;
        break;
      }
    }
    
    // 如果没有启动 URL，添加配置中的 startUrl
    if (!hasStartUrl && profile.startup && profile.startup.startUrl) {
      args.push(profile.startup.startUrl);
      console.log(`添加启动 URL: ${profile.startup.startUrl}`);
    }

    try {
      console.log(`正在启动浏览器，配置文件 ID: ${profileId}`);
      console.log(`调试端口: ${debugPort}`);
      console.log(`启动参数: ${args.join(' ')}`);
      
      // 添加更多参数来解决连接问题
      args.push(
        '--disable-background-networking',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-first-run',
        '--password-store=basic',
        '--use-mock-keychain',
        '--enable-automation',
        '--enable-blink-features=IdleDetection'
      );
      
      const browser = await puppeteer.launch({
        executablePath: this._getChromiumPath(),
        userDataDir: userDataDir,
        headless: false,
        defaultViewport: null,
        args: args,
        ignoreDefaultArgs: false,  // 使用默认参数
        pipe: true  // 使用管道而不是 WebSocket
      });
      
      // 创建新的实例并添加到实例列表
      const instance = {
        profileId,
        profileName: profile.name,
        profile: profile,  // 保存完整的配置文件信息
        browser,
        debugPort,
        status: 'running',
        startTime: new Date(),
        process: browser.process()
      };
      
      this.browserInstances.set(profileId, instance);
      
      // 监听浏览器关闭事件
      browser.on('disconnected', () => {
        console.log(`浏览器实例已断开连接: ${profileId}`);
        if (this.browserInstances.has(profileId)) {
          const instance = this.browserInstances.get(profileId);
          instance.status = 'closed';
          instance.endTime = new Date();
        }
      });
      
      // 返回浏览器实例本身，而不是实例信息
      console.log(`浏览器实例启动成功，返回实例对象`);
      return browser;
    } catch (error) {
      console.error(`启动浏览器失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 关闭浏览器实例
   * @param {string} profileId 配置文件 ID
   * @returns {boolean} 是否成功关闭
   */
  closeBrowser(profileId) {
    if (this.browserInstances.has(profileId)) {
      const instance = this.browserInstances.get(profileId);
      if (instance.process && !instance.process.killed) {
        instance.process.kill();
        instance.status = 'closed';
        instance.endTime = new Date();
        return true;
      }
    }
    return false;
  }
  
  /**
   * 获取所有运行中的浏览器实例
   * @returns {Array} 运行中的实例列表
   */
  getRunningInstances() {
    const runningInstances = [];
    
    for (const [id, instance] of this.browserInstances.entries()) {
      // 检查实例状态
      if (instance.status === 'running') {
        try {
          // 检查浏览器是否还有效
          if (instance.browser && typeof instance.browser.pages === 'function') {
            // 尝试获取页面信息，但不阻塞主进程
            instance.browser.pages().catch(e => {
              console.log(`浏览器实例 ${id} 无法获取页面，可能已经关闭: ${e.message}`);
              instance.status = 'closed';
            });
          }
          
          // 即使浏览器状态不明，也返回实例信息
          runningInstances.push({
            profileId: id,
            profileName: instance.profile.name,
            startTime: instance.startTime,
            status: instance.status
          });
        } catch (error) {
          console.error(`检查浏览器实例 ${id} 状态失败:`, error);
          // 如果检查失败，假设实例仍然运行
          runningInstances.push({
            profileId: id,
            profileName: instance.profile.name,
            startTime: instance.startTime,
            status: 'running'
          });
        }
      }
    }
    
    return runningInstances;
  }
  
  /**
   * 获取指定配置文件的运行中浏览器实例
   * @param {string} profileId 配置文件 ID
   * @returns {Object|null} 运行中的浏览器实例，如果不存在则返回 null
   */
  getRunningInstance(profileId) {
    if (!this.browserInstances.has(profileId)) {
      return null;
    }
    
    const instance = this.browserInstances.get(profileId);
    
    // 检查进程是否仍在运行
    if (instance.process && !instance.process.killed) {
      return instance;
    } else if (instance.status !== 'closed') {
      // 更新状态
      instance.status = 'closed';
      instance.endTime = instance.endTime || new Date();
    }
    
    return null;
  }
  
  /**
   * 关闭所有浏览器实例
   */
  closeAllInstances() {
    for (const [id, instance] of this.browserInstances.entries()) {
      if (instance.process && !instance.process.killed) {
        instance.process.kill();
        instance.status = 'closed';
        instance.endTime = new Date();
      }
    }
  }
  
  /**
   * 连接到运行中的浏览器实例
   * @param {string} profileId 配置文件 ID
   * @returns {Promise<Object>} Puppeteer 浏览器实例
   */
  async connectToBrowser(profileId) {
    if (!this.browserInstances.has(profileId)) {
      console.log(`找不到浏览器实例: ${profileId}`);
      // 尝试启动浏览器
      try {
        console.log(`尝试启动浏览器: ${profileId}`);
        const browser = await this.launchBrowser(profileId);
        console.log(`浏览器启动成功: ${typeof browser}`);
        return browser;
      } catch (launchError) {
        console.error(`启动浏览器失败: ${launchError.message}`);
        throw new Error(`找不到指定的浏览器实例`);
      }
    }
    
    const instance = this.browserInstances.get(profileId);
    console.log(`浏览器实例状态: ${instance.status}`);
    
    if (instance.status !== 'running') {
      throw new Error('浏览器实例未在运行');
    }
    
    // 直接返回实例中的浏览器对象
    console.log(`浏览器实例可用`);
    return instance.browser;
  }
  
  /**
   * 清除浏览器缓存
   * @param {string} profileId 配置文件 ID
   * @returns {Promise<Object>} 清除结果
   */
  async clearCache(profileId) {
    try {
      console.log(`清除浏览器缓存, 配置文件 ID: ${profileId}`);
      
      // 获取浏览器实例
      const browser = await this.connectToBrowser(profileId);
      
      // 创建新页面
      const page = await browser.newPage();
      
      // 创建 CDP 会话
      const client = await page.target().createCDPSession();
      
      // 清除不同类型的缓存
      await client.send('Network.clearBrowserCache');
      await client.send('Network.clearBrowserCookies');
      
      // 清除其他存储
      await page.evaluate(() => {
        // 清除内存缓存
        if (window.caches) {
          caches.keys().then(keys => {
            keys.forEach(key => caches.delete(key));
          });
        }
      });
      
      // 关闭页面
      await page.close();
      
      console.log(`清除浏览器缓存成功`);
      return { success: true, message: '浏览器缓存已清除' };
    } catch (error) {
      console.error('清除浏览器缓存失败:', error);
      throw new Error(`清除浏览器缓存失败: ${error.message}`);
    }
  }
  
  /**
   * 清除本地存储
   * @param {string} profileId 配置文件 ID
   * @param {string} url 可选，指定网站的 URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearLocalStorage(profileId, url = 'https://www.example.com') {
    try {
      console.log(`清除本地存储, 配置文件 ID: ${profileId}, URL: ${url}`);
      
      // 获取浏览器实例
      const browser = await this.connectToBrowser(profileId);
      
      // 创建新页面
      const page = await browser.newPage();
      
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
      
      console.log(`清除本地存储成功`);
      return { success: true, message: '本地存储已清除' };
    } catch (error) {
      console.error('清除本地存储失败:', error);
      throw new Error(`清除本地存储失败: ${error.message}`);
    }
  }
  
  /**
   * 构建浏览器启动参数
   * @param {Object} profile 配置文件
   * @param {string} userDataDirectory 用户数据目录
   * @param {number} debugPort 调试端口
   * @param {Object} options 启动选项
   * @returns {Array} 启动参数数组
   * @private
   */
  _buildLaunchArgs(profile, userDataDirectory, debugPort, options = {}) {
    const args = [
      `--user-data-dir=${userDataDirectory}`,
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${debugPort}`
    ];
    
    // 添加窗口大小设置
    const { windowWidth, windowHeight } = profile.startup;
    if (windowWidth && windowHeight) {
      args.push(`--window-size=${windowWidth},${windowHeight}`);
    }
    
    // 添加代理设置
    if (profile.proxy && profile.proxy.enabled) {
      const { type, host, port, username, password } = profile.proxy;
      
      console.log(`浏览器使用代理: ${type}://${host}:${port}`);
      
      // Chrome 浏览器的代理配置格式
      if (type === 'socks4' || type === 'socks5') {
        // SOCKS 代理配置
        args.push(`--proxy-server=socks5://${host}:${port}`);
      } else if (type === 'https') {
        // HTTPS 代理配置
        args.push(`--proxy-server=https://${host}:${port}`);
      } else {
        // HTTP 代理配置
        args.push(`--proxy-server=http://${host}:${port}`);
      }
      
      // 如果有用户名和密码，添加代理认证参数
      if (username && password) {
        args.push(`--proxy-auth=${username}:${password}`);
      }
    }
    
    // 添加指纹设置
    if (profile.fingerprint) {
      // UserAgent
      if (profile.fingerprint.userAgent) {
        args.push(`--user-agent=${profile.fingerprint.userAgent}`);
      }
      
      // 语言设置
      if (profile.fingerprint.language) {
        args.push(`--lang=${profile.fingerprint.language}`);
      }
      
      // WebRTC 设置
      if (profile.fingerprint.webrtcEnabled === false) {
        args.push('--disable-webrtc');
      }
    }
    
    // 添加起始页
    // 优先使用传入的 URL 参数
    if (options && options.url) {
      args.push(options.url);
      console.log(`使用传入的 URL: ${options.url}`);
    } else if (profile.startup && profile.startup.startUrl) {
      args.push(profile.startup.startUrl);
      console.log(`使用配置文件的起始页: ${profile.startup.startUrl}`);
    }
    
    return args;
  }
  
  /**
   * 获取 Chromium 路径
   * @returns {string} Chromium 可执行文件路径
   * @private
   */
  _getChromiumPath() {
    // 根据不同操作系统返回 Chromium 路径
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
        
        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            return path;
          }
        }
        throw new Error('找不到 Chrome 或 Chromium 浏览器');
      default:
        throw new Error('不支持的操作系统');
    }
  }
}

module.exports = new BrowserManager();
