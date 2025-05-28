/**
 * Safari 浏览器适配器
 * 提供 Safari 浏览器特定的实现
 */
const fs = require('fs');
const path = require('path');
const { webkit } = require('playwright');
const BrowserAdapter = require('./browser-adapter');

class SafariAdapter extends BrowserAdapter {
  /**
   * 获取 Safari 浏览器可执行文件路径
   * @returns {string} Safari 可执行文件路径
   */
  getBrowserPath() {
    // Safari 只在 macOS 上可用
    if (process.platform !== 'darwin') {
      throw new Error('Safari 只在 macOS 上可用');
    }
    
    return '/Applications/Safari.app/Contents/MacOS/Safari';
  }
  
  /**
   * 获取浏览器类型
   * @returns {string} 浏览器类型
   */
  getBrowserType() {
    return 'safari';
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
      console.error(`清理 Safari 用户数据目录失败: ${error.message}`);
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
    return path.join(baseDir, `safari_${profileId}`);
  }
  
  /**
   * 构建 Safari 启动参数
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
    
    // Safari 使用 Playwright 启动，参数格式与其他浏览器不同
    const args = [];
    
    // 构建 Safari 启动配置
    const launchOptions = {
      headless: false,
      executablePath: this.getBrowserPath(),
      acceptDownloads: true, // 允许下载文件
      downloadsPath: downloadPath, // 设置下载路径
      
      // 添加反自动化检测设置
      ignoreHTTPSErrors: true, // 忽略 HTTPS 错误
      bypassCSP: true, // 绕过内容安全策略
      permissions: ['geolocation', 'notifications'], // 预先授予权限，避免提示
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15', // 设置用户代理
      viewport: { width: 1280, height: 800 }, // 设置默认视窗大小
      locale: 'zh-CN', // 设置语言
      timezoneId: 'Asia/Shanghai', // 设置时区
      deviceScaleFactor: 1, // 设置设备缩放比例
      isMobile: false, // 非移动设备
      hasTouch: false // 禁用触摸功能
    };
    
    // Safari 需要启用 Web 驱动程序
    // 注意：用户可能需要在 Safari 开发菜单中启用"允许远程自动化"
    
    return launchOptions;
  }
  
  /**
   * 启动 Safari 浏览器
   * @param {string} executablePath Safari 可执行文件路径
   * @param {Object} launchOptions 启动选项
   * @param {Object} options 其他选项
   * @returns {Promise<Object>} Playwright 浏览器实例
   */
  async launchBrowser(executablePath, launchOptions, options = {}) {
    // 使用 Playwright 启动 Safari
    const context = await webkit.launchPersistentContext(launchOptions.userDataDir, {
      ...launchOptions,
      executablePath: executablePath || this.getBrowserPath()
    });
    
    // 设置下载行为
    const pages = context.pages();
    if (pages.length > 0) {
      const page = pages[0];
      
      // 加载下载处理预加载脚本
      const preloadPath = path.join(process.cwd(), 'src', 'preload', 'download-handler.js');
      console.log(`加载下载处理脚本: ${preloadPath}`);
      
      // 监听下载事件
      page.on('download', async download => {
        try {
          const downloadPath = launchOptions.downloadsPath;
          if (downloadPath) {
            // 使用基类中的通用下载处理方法，并传递页面对象以显示通知
            const result = await this._handleDownload(download, downloadPath, 'Safari', page);
            
            if (!result.success) {
              console.error(`Safari下载失败: ${result.error}`);
            } else {
              console.log(`Safari下载成功: ${result.path}`);
            }
          }
        } catch (error) {
          console.error(`下载处理出错: ${error.message}`);
        }
      });
    }
    // 如果有起始 URL，打开该页面
    if (options.url || options.startUrl) {
      // 获取现有页面，如果没有则创建新页面
      const pages = await context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      
      // 导航到指定 URL
      const targetUrl = options.url || options.startUrl;
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    }
    
    return context;
  }
  
  /**
   * 连接到 Safari 浏览器
   * @param {string} browserWSEndpoint WebSocket 端点
   * @returns {Promise<Object>} Playwright 浏览器实例
   */
  async connectToBrowser(browserWSEndpoint) {
    // Safari 使用 Playwright 连接
    return await webkit.connect({ wsEndpoint: browserWSEndpoint });
  }
  
  /**
   * 应用指纹保护
   * @param {Object} context 浏览器上下文
   * @param {Object} profile 配置文件
   * @returns {Promise<Object>} 应用结果
   */
  async applyFingerprintProtection(context, profile) {
    try {
      // 调用父类的实现
      await BrowserAdapter.prototype.applyFingerprintProtection.call(this, context, profile);
      
      // Safari 特有的额外设置
      if ((profile.fingerprint && profile.fingerprint.enabled) || 
          (profile.fingerprintProtection && profile.fingerprintProtection.enabled)) {
        
        // 注入 Safari 特有的指纹防护代码
        await context.addInitScript(function() {
          // 修改 Safari 特有属性
          Object.defineProperty(navigator, 'vendor', {
            get: function() { return 'Apple Computer, Inc.'; }
          });
          
          // 模拟 Safari 的 ITP (Intelligent Tracking Prevention)
          const originalCookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
          Object.defineProperty(Document.prototype, 'cookie', {
            get: function() {
              return originalCookieDesc.get.call(this);
            },
            set: function(value) {
              // 如果是第三方 Cookie，限制其存储时间
              if (value.includes('expires=') && !document.location.hostname.includes(value.split('=')[0])) {
                // 将过期时间限制为 7 天
                const expiresMatch = value.match(/expires=([^;]+)/);
                if (expiresMatch && expiresMatch[1]) {
                  const expiresDate = new Date(expiresMatch[1]);
                  const now = new Date();
                  const maxExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7天
                  
                  if (expiresDate > maxExpiry) {
                    value = value.replace(/expires=[^;]+/, `expires=${maxExpiry.toUTCString()}`);
                  }
                }
              }
              
              originalCookieDesc.set.call(this, value);
            },
            enumerable: true,
            configurable: true
          });
          
          // 模拟 Safari 的隐私模式
          Object.defineProperty(navigator, 'maxTouchPoints', {
            get: function() { return 0; }
          });
        });
        
        // 如果有用户代理设置，进行额外设置
        if (profile.fingerprint?.userAgent) {
          await context.addInitScript(function(ua) {
            Object.defineProperty(navigator, 'userAgent', {
              get: function() { return ua; }
            });
            
            // Safari 特有：修改 appVersion
            Object.defineProperty(navigator, 'appVersion', {
              get: function() { return ua.replace(/^.*?\//,''); }
            });
            
            // Safari 特有：修改 platform
            Object.defineProperty(navigator, 'platform', {
              get: function() { 
                if (ua.includes('Mac')) return 'MacIntel';
                if (ua.includes('iPhone') || ua.includes('iPad')) return 'iPhone';
                return 'MacIntel'; // 默认为 Mac
              }
            });
          }, profile.fingerprint.userAgent);
        }
      }
      
      return { success: true, message: '已应用 Safari 指纹保护设置' };
    } catch (error) {
      console.error('应用 Safari 指纹保护失败:', error);
      return { success: false, message: `应用 Safari 指纹保护失败: ${error.message}` };
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
      const launchOptions = {
        headless: true,
        proxy: {
          server: `${type}://${host}:${port}`
        }
      };
      
      // 如果有用户名和密码
      if (username && password) {
        launchOptions.proxy.username = username;
        launchOptions.proxy.password = password;
      }
      
      const browser = await webkit.launch(launchOptions);
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // 访问测试 URL
      await page.goto(url, { timeout: 30000, waitUntil: 'networkidle' });
      
      // 获取页面内容
      const content = await page.content();
      const ipData = await page.evaluate(() => {
        try {
          return JSON.parse(document.body.innerText);
        } catch (e) {
          return { ip: document.body.innerText.trim() };
        }
      });
      
      await browser.close();
      
      return {
        success: true,
        ip: ipData.ip,
        message: `代理测试成功，IP: ${ipData.ip}`
      };
    } catch (error) {
      console.error(`代理测试失败: ${error.message}`);
      return {
        success: false,
        message: `代理测试失败: ${error.message}`
      };
    }
  }
  
  /**
   * 导航到 URL
   * @param {Object} page 页面实例
   * @param {string} url URL
   * @returns {Promise<void>}
   */
  async navigateTo(page, url) {
    await page.goto(url, { waitUntil: 'networkidle' });
  }
  
  /**
   * 查询元素
   * @param {Object} page 页面实例
   * @param {string} selector 选择器
   * @returns {Promise<Object>} 元素
   */
  async querySelector(page, selector) {
    return await page.$(selector);
  }
  
  /**
   * 点击元素
   * @param {Object} page 页面实例
   * @param {string} selector 选择器
   * @returns {Promise<void>}
   */
  async click(page, selector) {
    await page.click(selector);
  }
  
  /**
   * 输入文本
   * @param {Object} page 页面实例
   * @param {string} selector 选择器
   * @param {string} text 文本
   * @returns {Promise<void>}
   */
  async type(page, selector, text) {
    await page.fill(selector, text);
  }
  
  /**
   * 截图
   * @param {Object} page 页面实例
   * @param {Object} options 截图选项
   * @returns {Promise<Buffer>} 截图数据
   */
  async screenshot(page, options) {
    return await page.screenshot(options);
  }
  
  /**
   * 清除 Cookie
   * @param {Object} browser 浏览器实例
   * @returns {Promise<Object>} 清除结果
   */
  async clearCookies(browser) {
    const context = browser.contexts()[0] || await browser.newContext();
    await context.clearCookies();
    return { success: true, message: 'Cookies 已清除' };
  }
  
  /**
   * 清除本地存储
   * @param {Object} browser 浏览器实例
   * @param {string} url URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearLocalStorage(browser, url) {
    const context = browser.contexts()[0] || await browser.newContext();
    const page = context.pages()[0] || await context.newPage();
    
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    }
    
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    return { success: true, message: '本地存储已清除' };
  }
  
  /**
   * 获取用户数据路径
   * @param {string} baseDir 基础目录
   * @param {string} profileId 配置文件 ID
   * @returns {string} 用户数据路径
   */
  getUserDataPath(baseDir, profileId) {
    return path.join(baseDir, profileId, 'Safari');
  }
  
  /**
   * 清理用户数据目录
   * @param {string} userDataDir 用户数据目录
   * @returns {Promise<boolean>} 清理结果
   */
  async cleanupUserData(userDataDir) {
    // Safari 没有特定的锁定文件，但我们可以清理缓存
    const cachePath = path.join(userDataDir, 'Cache');
    if (fs.existsSync(cachePath)) {
      try {
        // 递归删除缓存目录
        const deleteFolderRecursive = function(folderPath) {
          if (fs.existsSync(folderPath)) {
            fs.readdirSync(folderPath).forEach((file) => {
              const curPath = path.join(folderPath, file);
              if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
              } else {
                fs.unlinkSync(curPath);
              }
            });
            fs.rmdirSync(folderPath);
          }
        };
        
        deleteFolderRecursive(cachePath);
        return true;
      } catch (error) {
        console.error(`清理 Safari 缓存失败: ${error.message}`);
        return false;
      }
    }
    return true;
  }


}

module.exports = SafariAdapter;
