/**
 * Firefox 浏览器适配器
 * 提供 Firefox 浏览器特定的实现
 */
const fs = require('fs');
const path = require('path');
const { firefox } = require('playwright');
const BrowserAdapter = require('./browser-adapter');

class FirefoxAdapter extends BrowserAdapter {
  /**
   * 获取 Firefox 浏览器可执行文件路径
   * @returns {string} Firefox 可执行文件路径
   */
  getBrowserPath() {
    // 根据不同操作系统返回 Firefox 路径
    switch (process.platform) {
      case 'win32':
        return 'C:\\Program Files\\Mozilla Firefox\\firefox.exe';
      case 'darwin':
        return '/Applications/Firefox.app/Contents/MacOS/firefox';
      case 'linux':
        const possiblePaths = [
          '/usr/bin/firefox',
          '/usr/bin/firefox-esr'
        ];
        
        for (const firefoxPath of possiblePaths) {
          if (fs.existsSync(firefoxPath)) {
            return firefoxPath;
          }
        }
        throw new Error('找不到 Firefox 浏览器');
      default:
        throw new Error('不支持的操作系统');
    }
  }
  
  /**
   * 获取浏览器类型
   * @returns {string} 浏览器类型
   */
  getBrowserType() {
    return 'firefox';
  }
  
  /**
   * 清理浏览器用户数据目录
   * @param {string} userDataDir 用户数据目录路径
   * @returns {boolean} 是否成功清理
   */
  cleanupUserData(userDataDir) {
    try {
      // 如果需要清理特定文件，可以在这里实现
      return true;
    } catch (error) {
      console.error(`清理 Firefox 用户数据目录失败: ${error.message}`);
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
    return path.join(baseDir, `firefox_${profileId}`);
  }
  
  /**
   * 构建 Firefox 启动参数
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
    
    // 构建 Firefox 启动参数
    const args = [
      '--no-remote',
      '--wait-for-browser',
      '--foreground',
      '--start-debugger-server', `${debugPort}`,
      '-new-instance',
      // 反自动化检测参数
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--no-sandbox'
    ];
    
    // 应用指纹保护设置
    if (profile.fingerprintProtection && profile.fingerprintProtection.enabled) {
      if (profile.fingerprintProtection.webRTC === 'disabled') {
        args.push('-pref', 'media.peerconnection.enabled=false');
      }
      
      if (profile.fingerprintProtection.canvas === 'noise') {
        args.push('-pref', 'privacy.resistFingerprinting=true');
      }
    }
    
    // 构建 Firefox 启动配置
    const launchOptions = {
      executablePath: this.getBrowserPath(),
      args,
      headless: false,
      acceptDownloads: true, // 允许下载文件
      firefoxUserPrefs: {
        // 禁用自动更新
        'app.update.auto': false,
        'app.update.enabled': false,
        
        // 禁用遥测
        'toolkit.telemetry.enabled': false,
        'toolkit.telemetry.unified': false,
        
        // 禁用首次运行向导
        'browser.startup.homepage_override.mstone': 'ignore',
        'startup.homepage_welcome_url': 'about:blank',
        'startup.homepage_welcome_url.additional': '',
        'browser.startup.firstrunSkipsHomepage': true,
        
        // 禁用默认浏览器检查
        'browser.shell.checkDefaultBrowser': false,
        
        // 禁用 Firefox 账户
        'identity.fxaccounts.enabled': false,
        
        // 禁用 Pocket
        'extensions.pocket.enabled': false,
        
        // 禁用自动填充
        
        // 反自动化检测设置
        'dom.webdriver.enabled': false,  // 禁用 WebDriver 标志
        'dom.automation': false,  // 禁用自动化标志
        'general.useragent.override': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',  // 设置用户代理
        'privacy.resistFingerprinting': true,  // 启用指纹防护
        'network.http.referer.spoofSource': true,  // 欺骗引用来源
        'media.navigator.enabled': false,  // 禁用媒体设备访问
        'signon.autofillForms': false,
        'signon.rememberSignons': false,
        
        // 禁用地理位置
        'geo.enabled': false,
        
        // 禁用 WebRTC
        'media.peerconnection.enabled': profile.fingerprintProtection?.webRTC === 'disabled' ? false : true,
        
        // 启用指纹保护
        'privacy.resistFingerprinting': profile.fingerprintProtection?.enabled ? true : false,
        
        // 下载设置
        'browser.download.folderList': 2, // 使用自定义下载目录
        'browser.download.dir': downloadPath, // 设置下载目录
        'browser.download.useDownloadDir': true, // 使用下载目录而不是每次询问
        'browser.download.manager.showWhenStarting': false, // 下载开始时不显示下载管理器
        'browser.helperApps.neverAsk.saveToDisk': 'application/octet-stream, application/pdf, application/x-pdf, application/x-zip, application/zip, application/x-zip-compressed, multipart/x-zip', // 常见文件类型自动下载
        'browser.download.manager.showAlertOnComplete': false, // 下载完成时不显示警告
        'browser.download.manager.closeWhenDone': true // 下载完成时关闭下载管理器
      }
    };
    
    // 设置用户数据目录
    launchOptions.userDataDir = userDataDir;
    
    // 应用代理设置
    if (profile.proxy && profile.proxy.enabled) {
      const { type, host, port, username, password } = profile.proxy;
      
      // Firefox 使用不同的代理设置方式
      launchOptions.firefoxUserPrefs = {
        ...launchOptions.firefoxUserPrefs,
        'network.proxy.type': 1, // 手动代理配置
        'network.proxy.http': host,
        'network.proxy.http_port': parseInt(port),
        'network.proxy.ssl': host,
        'network.proxy.ssl_port': parseInt(port),
        'network.proxy.ftp': host,
        'network.proxy.ftp_port': parseInt(port),
        'network.proxy.socks': host,
        'network.proxy.socks_port': parseInt(port)
      };
      
      if (type === 'socks5') {
        launchOptions.firefoxUserPrefs['network.proxy.socks_version'] = 5;
      }
      
      // 如果有用户名和密码
      if (username && password) {
        launchOptions.firefoxUserPrefs['network.proxy.socks_username'] = username;
        launchOptions.firefoxUserPrefs['network.proxy.socks_password'] = password;
      }
    }
    
    return launchOptions;
  }
  
  /**
   * 启动 Firefox 浏览器
   * @param {string} executablePath Firefox 可执行文件路径
   * @param {Object} launchOptions 启动选项
   * @param {Object} options 其他选项
   * @returns {Promise<Object>} Playwright 浏览器实例
   */
  async launchBrowser(executablePath, launchOptions, options = {}) {
    // 使用 Playwright 启动 Firefox
    const context = await firefox.launchPersistentContext(launchOptions.userDataDir, {
      ...launchOptions,
      executablePath: executablePath || this.getBrowserPath()
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
          const downloadPath = launchOptions.firefoxUserPrefs['browser.download.dir'];
          if (downloadPath) {
            // 使用基类中的通用下载处理方法
            const result = await this._handleDownload(download, downloadPath, 'Firefox');
            
            if (!result.success) {
              console.error(`Firefox下载失败: ${result.error}`);
            } else {
              console.log(`Firefox下载: 文件已保存到 ${result.path}`);
              
               
          }
        }
      }catch (error) {
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
   * 连接到 Firefox 浏览器
   * @param {string} browserWSEndpoint WebSocket 端点
   * @returns {Promise<Object>} Playwright 浏览器实例
   */
  async connectToBrowser(browserWSEndpoint) {
    // Firefox 使用 Playwright 连接
    return await firefox.connect({ wsEndpoint: browserWSEndpoint });
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
      
      // Firefox 特有的额外设置
      if ((profile.fingerprint && profile.fingerprint.enabled) || 
          (profile.fingerprintProtection && profile.fingerprintProtection.enabled)) {
        
        // 注入 Firefox 特有的指纹防护代码
        await context.addInitScript(function() {
          // 修改 Firefox 特有属性
          Object.defineProperty(navigator, 'product', {
            get: function() { return 'Gecko'; }
          });
          
          Object.defineProperty(navigator, 'productSub', {
            get: function() { return '20100101'; }
          });
          
          // Firefox 特有的隐私设置
          Object.defineProperty(navigator, 'doNotTrack', {
            get: function() { return '1'; }
          });
          
          // 模拟 Firefox 的 privacy.resistFingerprinting 设置
          if (window.screen) {
            // 标准化屏幕尺寸为 1000x1000
            const originalScreen = window.screen;
            Object.defineProperties(window, {
              'screen': {
                get: function() {
                  return {
                    width: 1000,
                    height: 1000,
                    availWidth: 1000,
                    availHeight: 1000,
                    colorDepth: originalScreen.colorDepth,
                    pixelDepth: originalScreen.pixelDepth
                  };
                }
              }
            });
          }
        });
        
        // 如果有用户代理设置，进行额外设置
        if (profile.fingerprint?.userAgent) {
          await context.addInitScript(function(ua) {
            Object.defineProperty(navigator, 'userAgent', {
              get: function() { return ua; }
            });
            
            // Firefox 特有：修改 appVersion
            Object.defineProperty(navigator, 'appVersion', {
              get: function() { return ua.replace(/^.*?\//,''); }
            });
          }, profile.fingerprint.userAgent);
        }
      }
      
      return { success: true, message: '已应用 Firefox 指纹保护设置' };
    } catch (error) {
      console.error('应用 Firefox 指纹保护失败:', error);
      return { success: false, message: `应用 Firefox 指纹保护失败: ${error.message}` };
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
        executablePath: this.getBrowserPath(),
        headless: true,
        firefoxUserPrefs: {
          'network.proxy.type': 1, // 手动代理配置
          'network.proxy.http': host,
          'network.proxy.http_port': parseInt(port),
          'network.proxy.ssl': host,
          'network.proxy.ssl_port': parseInt(port),
          'network.proxy.ftp': host,
          'network.proxy.ftp_port': parseInt(port),
          'network.proxy.socks': host,
          'network.proxy.socks_port': parseInt(port)
        }
      };
      
      if (type === 'socks5') {
        launchOptions.firefoxUserPrefs['network.proxy.socks_version'] = 5;
      }
      
      // 如果有用户名和密码
      if (username && password) {
        launchOptions.firefoxUserPrefs['network.proxy.socks_username'] = username;
        launchOptions.firefoxUserPrefs['network.proxy.socks_password'] = password;
      }
      
      const browser = await firefox.launch(launchOptions);
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
    return path.join(baseDir, profileId, 'Firefox');
  }
  
  /**
   * 清理用户数据目录
   * @param {string} userDataDir 用户数据目录
   * @returns {Promise<boolean>} 清理结果
   */
  async cleanupUserData(userDataDir) {
    // Firefox 使用 .parentlock 文件
    const lockPath = path.join(userDataDir, '.parentlock');
    if (fs.existsSync(lockPath)) {
      try {
        fs.unlinkSync(lockPath);
        return true;
      } catch (error) {
        console.error(`清理 .parentlock 失败: ${error.message}`);
        return false;
      }
    }
    return true;
  }

}

module.exports = FirefoxAdapter;
