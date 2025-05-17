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
      console.log(`清理 Firefox 用户数据目录: ${userDataDir}`);
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
    // Firefox 使用 Playwright，参数格式与 Puppeteer 不同
    const args = [];
    
    // 添加 Firefox 特定参数
    args.push(
      '-no-remote',
      '-foreground',
      '-new-instance'
    );
    
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
        'signon.autofillForms': false,
        'signon.rememberSignons': false,
        
        // 禁用地理位置
        'geo.enabled': false,
        
        // 禁用 WebRTC
        'media.peerconnection.enabled': profile.fingerprintProtection?.webRTC === 'disabled' ? false : true,
        
        // 启用指纹保护
        'privacy.resistFingerprinting': profile.fingerprintProtection?.enabled ? true : false
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
    // Firefox 使用 Playwright 启动
    const browser = await firefox.launch(launchOptions);
    
    // 创建一个新的上下文
    const context = await browser.newContext();
    
    // 如果有起始 URL，打开该页面
    if (options.url || options.startUrl) {
      // 获取现有页面，如果没有则创建新页面
      const pages = await context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      
      // 导航到指定 URL
      const targetUrl = options.url || options.startUrl;
      console.log(`将 Firefox 页面导航到: ${targetUrl}`);
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
   * @param {Object} page 页面实例
   * @param {Object} profile 配置文件
   * @returns {Promise<Object>} 应用结果
   */
  async applyFingerprintProtection(page, profile) {
    try {
      const fingerprintSettings = profile.fingerprintProtection || {};
      
      if (!fingerprintSettings.enabled) {
        return { success: true, message: '指纹保护未启用' };
      }
      
      // 注入指纹保护脚本
      await page.addInitScript(({ settings }) => {
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
          
          // Firefox 特有：修改 appVersion 和 product
          Object.defineProperty(navigator, 'appVersion', {
            value: settings.userAgent.replace(/^.*?\//,''),
            writable: false
          });
          
          Object.defineProperty(navigator, 'product', {
            value: 'Gecko',
            writable: false
          });
          
          Object.defineProperty(navigator, 'productSub', {
            value: '20100101',
            writable: false
          });
        }
      }, { settings: fingerprintSettings });
      
      return { success: true, message: '已应用指纹保护设置' };
    } catch (error) {
      console.error('应用指纹保护失败:', error);
      return { success: false, message: `应用指纹保护失败: ${error.message}` };
    }
  }
  
  /**
   * 测试指纹保护
   * @param {Object} browser 浏览器实例
   * @returns {Promise<Array>} 测试结果
   */
  async testFingerprintProtection(browser) {
    try {
      // 获取浏览器页面
      const context = browser.contexts()[0] || await browser.newContext();
      const page = context.pages()[0] || await context.newPage();
      
      // 创建一个本地测试页面
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>指纹防护测试</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .result { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
            .passed { color: green; }
            .failed { color: red; }
          </style>
        </head>
        <body>
          <h1>指纹防护测试</h1>
          <div id="results"></div>
          
          <script>
            // 测试结果数组
            const testResults = [];
            
            // Canvas 指纹测试
            function testCanvas() {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 50;
                const ctx = canvas.getContext('2d');
                
                ctx.textBaseline = "top";
                ctx.font = "14px 'Arial'";
                ctx.textBaseline = "alphabetic";
                ctx.fillStyle = "#f60";
                ctx.fillRect(125, 1, 62, 20);
                ctx.fillStyle = "#069";
                ctx.fillText("Hello, world!", 2, 15);
                
                // 获取两次数据URL，如果不同则说明有随机化
                const dataURL1 = canvas.toDataURL();
                const dataURL2 = canvas.toDataURL();
                
                return {
                  test: 'Canvas 指纹',
                  passed: dataURL1 !== dataURL2,
                  details: dataURL1 !== dataURL2 ? 
                    '通过: Canvas 指纹已被随机化' : 
                    '失败: Canvas 指纹未被保护'
                };
              } catch (e) {
                return {
                  test: 'Canvas 指纹',
                  passed: true,
                  details: '通过: Canvas API 已被阻止'
                };
              }
            }
            
            // WebRTC 测试
            function testWebRTC() {
              try {
                const rtcAvailable = typeof window.RTCPeerConnection !== 'undefined';
                return {
                  test: 'WebRTC 保护',
                  passed: !rtcAvailable,
                  details: !rtcAvailable ? 
                    '通过: WebRTC API 已被禁用' : 
                    '失败: WebRTC API 可用，可能泄露真实 IP'
                };
              } catch (e) {
                return {
                  test: 'WebRTC 保护',
                  passed: true,
                  details: '通过: WebRTC API 访问出错，可能已被禁用'
                };
              }
            }
            
            // Firefox 特有测试：检查浏览器标识
            function testFirefoxIdentity() {
              const isFirefox = navigator.userAgent.includes('Firefox');
              const isGecko = navigator.product === 'Gecko';
              
              return {
                test: 'Firefox 标识',
                passed: isFirefox && isGecko,
                details: isFirefox && isGecko ? 
                  '通过: 浏览器正确标识为 Firefox' : 
                  '失败: 浏览器未正确标识为 Firefox'
              };
            }
            
            // 隐私保护测试
            function testPrivacyResistFingerprinting() {
              // 检查 Firefox 的 privacy.resistFingerprinting 是否生效
              const screenSize = {
                width: window.screen.width,
                height: window.screen.height
              };
              
              // 如果 privacy.resistFingerprinting 生效，屏幕尺寸会被设为 1000x1000
              const isStandardized = screenSize.width === 1000 && screenSize.height === 1000;
              
              return {
                test: '隐私保护',
                passed: isStandardized,
                details: isStandardized ? 
                  '通过: Firefox 隐私保护已启用' : 
                  '失败: Firefox 隐私保护未启用'
              };
            }
            
            // 运行所有测试
            testResults.push(testCanvas());
            testResults.push(testWebRTC());
            testResults.push(testFirefoxIdentity());
            testResults.push(testPrivacyResistFingerprinting());
            
            // 显示结果
            const resultsDiv = document.getElementById('results');
            testResults.forEach(result => {
              const resultDiv = document.createElement('div');
              resultDiv.className = \`result \${result.passed ? 'passed' : 'failed'}\`;
              resultDiv.innerHTML = 
              \`<h3>\${result.test}: \${result.passed ? '通过' : '未通过'}</h3>
              <p>\${result.details}</p>\`;
              resultsDiv.appendChild(resultDiv);
            });
            
            // 将结果保存到全局变量
            window.fingerprintTestResults = testResults;
          </script>
        </body>
        </html>
      `);
      
      // 等待测试完成
      await page.waitForFunction('window.fingerprintTestResults && window.fingerprintTestResults.length > 0');
      
      // 获取测试结果
      const testResults = await page.evaluate(() => window.fingerprintTestResults);
      
      return testResults;
    } catch (error) {
      console.error('测试指纹保护失败:', error);
      return [{
        test: '测试执行',
        passed: false,
        details: `测试过程中出错: ${error.message}`
      }];
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
        console.log(`已删除 .parentlock 文件: ${lockPath}`);
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
