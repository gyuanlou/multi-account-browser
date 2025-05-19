/**
 * 浏览器适配器基类
 * 为不同浏览器提供统一的接口
 * 基于 Playwright API 实现
 */
class BrowserAdapter {
  constructor() {
    if (this.constructor === BrowserAdapter) {
      throw new Error('BrowserAdapter 是抽象类，不能直接实例化');
    }
  }
  
  /**
   * 获取浏览器可执行文件路径
   * @returns {string} 浏览器可执行文件路径
   */
  getBrowserPath() { 
    throw new Error('必须实现 getBrowserPath 方法'); 
  }
  
  /**
   * 构建浏览器启动参数
   * @param {Object} profile 配置文件
   * @param {string} userDataDir 用户数据目录
   * @param {number} debugPort 调试端口
   * @param {Object} options 启动选项
   * @returns {Object} 启动参数对象
   */
  buildLaunchArgs(profile, userDataDir, debugPort, options) { 
    throw new Error('必须实现 buildLaunchArgs 方法'); 
  }
  
  /**
   * 启动浏览器
   * @param {string} executablePath 浏览器可执行文件路径
   * @param {Object} launchOptions 启动选项
   * @param {Object} options 其他选项
   * @returns {Promise<Object>} 浏览器上下文 (BrowserContext)
   */
  async launchBrowser(executablePath, launchOptions, options) { 
    throw new Error('必须实现 launchBrowser 方法'); 
  }
  
  /**
   * 连接到浏览器
   * @param {string} browserURL 浏览器 URL 或 WebSocket 端点
   * @returns {Promise<Object>} 浏览器上下文 (BrowserContext)
   */
  async connectToBrowser(browserURL) { 
    throw new Error('必须实现 connectToBrowser 方法'); 
  }
  
  /**
   * 应用指纹保护
   * @param {Object} context 浏览器上下文
   * @param {Object} profile 配置文件
   * @returns {Promise<void>}
   */
  async applyFingerprintProtection(context, profile) {
    const fs = require('fs');
    const path = require('path');
    
    // 获取指纹配置，兼容两种配置路径
    const fingerprint = profile.fingerprint || profile.fingerprintProtection || {};
    
    // 详细输出配置信息便于调试
    console.log(`[指纹防护] 配置文件信息:`, JSON.stringify(profile, null, 2));
    console.log(`[指纹防护] 指纹防护配置:`, JSON.stringify(fingerprint, null, 2));
    
    // 检查是否启用了指纹防护
    if (!fingerprint.enabled) {
      console.log(`[指纹防护] 指纹防护未启用`);
      return;
    }
    
    // 检查是否启用了 Brave 风格防护
    const useBraveStyle = fingerprint.protectionMode === 'brave';
    console.log(`[指纹防护] 防护模式: ${useBraveStyle ? 'Brave风格' : '标准'}`);
    
    // 获取指纹防护脚本路径
    const braveScriptPath = path.join(process.cwd(), 'resources', 'fingerprint-scripts', 'brave-fingerprint-protection.js');
    const standardScriptPath = path.join(process.cwd(), 'resources', 'fingerprint-scripts', 'preload-fingerprint-protection.js');
    
    // 选择使用哪个脚本
    const scriptPath = useBraveStyle ? braveScriptPath : standardScriptPath;
    console.log(`[指纹防护] 使用脚本路径: ${scriptPath}`);
    
    // 确保指纹防护脚本存在
    if (!fs.existsSync(scriptPath)) {
      console.warn(`[指纹防护] 指纹防护脚本不存在: ${scriptPath}`);
      return;
    }
    
    try {
      // 准备指纹防护配置，传递给脚本
      const fingerprintConfig = {
        enabled: true,
        canvasProtection: true,  // 默认启用 Canvas 防护
        webrtcProtection: fingerprint.webrtcMode === 'disabled',
        hardwareInfoProtection: fingerprint.hardwareInfoProtection === true,
        audioContextProtection: fingerprint.audioContextProtection === true,
        pluginDataProtection: fingerprint.pluginDataProtection === true,
        rectsProtection: fingerprint.rectsProtection === true,
        timezoneProtection: fingerprint.timezoneProtection === true,
        fontProtection: fingerprint.fontProtection === true,
        screenWidth: fingerprint.screenWidth,
        screenHeight: fingerprint.screenHeight,
        userAgent: fingerprint.userAgent,
        protectionMode: fingerprint.protectionMode
      };
      
      console.log(`[指纹防护] 传递给脚本的配置:`, JSON.stringify(fingerprintConfig, null, 2));
      
      // 添加调试脚本，在页面上显示指纹防护状态
      const debugScript = `
        // 创建调试面板
        setTimeout(() => {
          try {
            const debugPanel = document.createElement('div');
            debugPanel.id = 'fingerprint-debug-panel';
            debugPanel.style.position = 'fixed';
            debugPanel.style.bottom = '10px';
            debugPanel.style.left = '10px';
            debugPanel.style.zIndex = '9999999';
            debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            debugPanel.style.color = '#fff';
            debugPanel.style.padding = '10px';
            debugPanel.style.borderRadius = '5px';
            debugPanel.style.fontSize = '12px';
            debugPanel.style.fontFamily = 'monospace';
            debugPanel.style.maxWidth = '400px';
            debugPanel.style.maxHeight = '300px';
            debugPanel.style.overflow = 'auto';
            
            // 显示指纹防护状态
            const config = window.__FINGERPRINT_CONFIG__ || {};
            let html = '<h3>指纹防护状态</h3>';
            html += '<ul>';
            for (const key in config) {
              html += '<li><strong>' + key + ':</strong> ' + config[key] + '</li>';
            }
            html += '</ul>';
            debugPanel.innerHTML = html;
            
            document.body.appendChild(debugPanel);
            console.log('调试面板已添加到页面');
          } catch (e) {
            console.error('创建调试面板失败:', e);
          }
        }, 2000);
      `;
      
      // 在现有页面上注入脚本
      const pages = context.pages();
      for (const page of pages) {
        // 先注入配置
        await page.addInitScript(function(config) {
          window.__FINGERPRINT_CONFIG__ = config;
          console.log('指纹防护配置已注入:', config);
        }, fingerprintConfig);
        
        // 注入调试脚本
        await page.addInitScript(debugScript);
        
        // 再注入防护脚本
        await page.addInitScript({ path: scriptPath });
        console.log(`[指纹防护] 已在现有页面上注入${useBraveStyle ? 'Brave风格' : '标准'}指纹防护脚本`);
      }
      
      // 对新页面进行注入
      context.on('page', async page => {
        try {
          // 先注入配置
          await page.addInitScript(function(config) {
            window.__FINGERPRINT_CONFIG__ = config;
            console.log('指纹防护配置已注入:', config);
          }, fingerprintConfig);
          
          // 注入调试脚本
          await page.addInitScript(debugScript);
          
          // 再注入防护脚本
          await page.addInitScript({ path: scriptPath });
          console.log(`[指纹防护] 已在新页面上注入${useBraveStyle ? 'Brave风格' : '标准'}指纹防护脚本`);
        } catch (error) {
          console.error(`[指纹防护] 注入指纹防护脚本失败:`, error);
        }
      });
      
      // 如果用户配置了屏幕分辨率，应用屏幕分辨率设置
      if (profile.fingerprint?.screenWidth && profile.fingerprint?.screenHeight) {
        await context.addInitScript(function(size) {
          // 修改 window.screen 属性
          Object.defineProperty(window.screen, 'width', {
            get: function() { return size.width; }
          });
          Object.defineProperty(window.screen, 'height', {
            get: function() { return size.height; }
          });
          Object.defineProperty(window.screen, 'availWidth', {
            get: function() { return size.width; }
          });
          Object.defineProperty(window.screen, 'availHeight', {
            get: function() { return size.height; }
          });
          
          // 修改 window.innerWidth/Height
          Object.defineProperty(window, 'innerWidth', {
            get: function() { return size.width; }
          });
          Object.defineProperty(window, 'innerHeight', {
            get: function() { return size.height; }
          });
          
          console.log(`[指纹防护] 已设置屏幕分辨率为 ${size.width}x${size.height}`);
        }, { 
          width: parseInt(profile.fingerprint.screenWidth), 
          height: parseInt(profile.fingerprint.screenHeight) 
        });
      }
      
      console.log(`[指纹防护] 成功应用${useBraveStyle ? 'Brave风格' : '标准'}指纹防护`);
    } catch (error) {
      console.error(`[指纹防护] 应用指纹防护失败:`, error);
    }
  }
  
  /**
   * 清除浏览器缓存
   * @param {Object} context 浏览器上下文
   * @returns {Promise<Object>} 清除结果
   */
  async clearCache(context) {
    throw new Error('必须实现 clearCache 方法');
  }
  
  /**
   * 清除本地存储
   * @param {Object} context 浏览器上下文
   * @param {string} url 网站 URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearLocalStorage(context, url) {
    throw new Error('必须实现 clearLocalStorage 方法');
  }
  
  /**
   * 清除 Cookie
   * @param {Object} context 浏览器上下文
   * @param {string} url 可选，指定网站的 URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearCookies(context, url) {
    throw new Error('必须实现 clearCookies 方法');
  }
  
  /**
   * 获取浏览器类型
   * @returns {string} 浏览器类型（chrome、edge、firefox、safari）
   */
  getBrowserType() {
    throw new Error('必须实现 getBrowserType 方法');
  }
  
  
  
  /**
   * 设置代理
   * @param {Array} args 启动参数数组
   * @param {Object} proxyConfig 代理配置
   * @returns {Array} 更新后的启动参数数组
   */
  setupProxy(args, proxyConfig) { 
    throw new Error('必须实现 setupProxy 方法'); 
  }
  
  /**
   * 测试代理
   * @param {Object} proxyConfig 代理配置
   * @returns {Promise<Object>} 测试结果
   */
  async testProxy(proxyConfig) { 
    throw new Error('必须实现 testProxy 方法'); 
  }
  
  /**
   * 导航到 URL
   * @param {Object} page 页面实例
   * @param {string} url URL
   * @returns {Promise<void>}
   */
  async navigateTo(page, url) { 
    throw new Error('必须实现 navigateTo 方法'); 
  }
  
  /**
   * 查询元素
   * @param {Object} page 页面实例
   * @param {string} selector 选择器
   * @returns {Promise<Object>} 元素
   */
  async querySelector(page, selector) { 
    throw new Error('必须实现 querySelector 方法'); 
  }
  
  /**
   * 点击元素
   * @param {Object} page 页面实例
   * @param {string} selector 选择器
   * @returns {Promise<void>}
   */
  async click(page, selector) { 
    throw new Error('必须实现 click 方法'); 
  }
  
  /**
   * 输入文本
   * @param {Object} page 页面实例
   * @param {string} selector 选择器
   * @param {string} text 文本
   * @returns {Promise<void>}
   */
  async type(page, selector, text) { 
    throw new Error('必须实现 type 方法'); 
  }
  
  /**
   * 截图
   * @param {Object} page 页面实例
   * @param {Object} options 截图选项
   * @returns {Promise<Buffer>} 截图数据
   */
  async screenshot(page, options) { 
    throw new Error('必须实现 screenshot 方法'); 
  }
  
  /**
   * 清除 Cookie
   * @param {Object} browser 浏览器实例
   * @returns {Promise<Object>} 清除结果
   */
  async clearCookies(browser) { 
    throw new Error('必须实现 clearCookies 方法'); 
  }
  
  /**
   * 清除本地存储
   * @param {Object} browser 浏览器实例
   * @param {string} url URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearLocalStorage(browser, url) { 
    throw new Error('必须实现 clearLocalStorage 方法'); 
  }
  
  /**
   * 获取用户数据路径
   * @param {string} baseDir 基础目录
   * @param {string} profileId 配置文件 ID
   * @returns {string} 用户数据路径
   */
  getUserDataPath(baseDir, profileId) { 
    throw new Error('必须实现 getUserDataPath 方法'); 
  }
  
  /**
   * 清理用户数据目录
   * @param {string} userDataDir 用户数据目录
   * @returns {Promise<boolean>} 清理结果
   */
  async cleanupUserData(userDataDir) { 
    throw new Error('必须实现 cleanupUserData 方法'); 
  }
}

module.exports = BrowserAdapter;
