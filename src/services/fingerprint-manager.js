/**
 * 指纹管理服务
 * 负责生成和应用浏览器指纹
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

class FingerprintManager {
  constructor() {
    // 预定义的用户代理列表
    this.userAgents = {
      'chrome': {
        'windows': [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36'
        ],
        'macos': [
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36'
        ],
        'linux': [
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36'
        ]
      },
      'firefox': {
        'windows': [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0'
        ],
        'macos': [
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:90.0) Gecko/20100101 Firefox/90.0',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0'
        ],
        'linux': [
          'Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0',
          'Mozilla/5.0 (X11; Linux x86_64; rv:90.0) Gecko/20100101 Firefox/90.0',
          'Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0'
        ]
      }
    };
    
    // 预定义的 WebGL 渲染器和供应商
    this.webglVendors = [
      'Google Inc. (Intel)',
      'Google Inc. (NVIDIA)',
      'Google Inc. (AMD)',
      'Google Inc.',
      'Mozilla'
    ];
    
    this.webglRenderers = [
      'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Intel HD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    ];
    
    // 预定义的语言列表
    this.languages = [
      'zh-CN', 'zh-TW', 'en-US', 'en-GB', 'ja-JP', 'ko-KR', 
      'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'ru-RU'
    ];
    
    // 预定义的平台列表
    this.platforms = [
      'Win32', 'MacIntel', 'Linux x86_64'
    ];
    
    // 预定义的屏幕分辨率
    this.screenResolutions = [
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1600, height: 900 },
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
      { width: 3840, height: 2160 }
    ];
  }
  
  /**
   * 生成随机指纹
   * @param {Object} options 指纹生成选项
   * @returns {Object} 生成的指纹
   */
  generateFingerprint(options = {}) {
    const os = options.os || this._getRandomItem(['windows', 'macos', 'linux']);
    const browser = options.browser || 'chrome';
    
    // 随机选择用户代理
    const userAgent = options.userAgent || this._getRandomUserAgent(browser, os);
    
    // 随机选择平台
    const platform = options.platform || this._getPlatformFromOS(os);
    
    // 随机选择语言
    const language = options.language || this._getRandomItem(this.languages);
    
    // 随机选择屏幕分辨率
    const screenResolution = options.screenResolution || this._getRandomItem(this.screenResolutions);
    
    // 随机选择 WebGL 信息
    const webglVendor = options.webglVendor || this._getRandomItem(this.webglVendors);
    const webglRenderer = options.webglRenderer || this._getRandomItem(this.webglRenderers);
    
    // 生成指纹对象
    return {
      userAgent,
      platform,
      language,
      screenWidth: screenResolution.width,
      screenHeight: screenResolution.height,
      colorDepth: 24,
      timezone: options.timezone || 'Asia/Shanghai',
      webglVendor,
      webglRenderer,
      canvasNoise: options.canvasNoise !== undefined ? options.canvasNoise : true,
      webrtcEnabled: options.webrtcEnabled !== undefined ? options.webrtcEnabled : false
    };
  }
  
  /**
   * 创建指纹注入脚本
   * @param {Object} fingerprint 指纹对象
   * @returns {string} 注入脚本内容
   */
  createFingerprintInjectionScript(fingerprint) {
    // 创建一个 JavaScript 脚本，用于在浏览器中注入指纹
    return `
      // 覆盖 navigator 属性
      const originalNavigator = window.navigator;
      const navigatorProxy = new Proxy(originalNavigator, {
        get: function(target, key) {
          switch (key) {
            case 'userAgent':
              return '${fingerprint.userAgent}';
            case 'platform':
              return '${fingerprint.platform}';
            case 'language':
            case 'languages':
              return ['${fingerprint.language}'];
            case 'hardwareConcurrency':
              return ${Math.floor(Math.random() * 8) + 2};
            case 'deviceMemory':
              return ${[2, 4, 8, 16][Math.floor(Math.random() * 4)]};
            default:
              return typeof target[key] === 'function' ? target[key].bind(target) : target[key];
          }
        }
      });
      
      // 覆盖 window.navigator
      Object.defineProperty(window, 'navigator', {
        value: navigatorProxy,
        writable: false,
        configurable: false
      });
      
      // 覆盖屏幕属性
      Object.defineProperties(window.screen, {
        'width': { value: ${fingerprint.screenWidth} },
        'height': { value: ${fingerprint.screenHeight} },
        'availWidth': { value: ${fingerprint.screenWidth} },
        'availHeight': { value: ${fingerprint.screenHeight} },
        'colorDepth': { value: ${fingerprint.colorDepth} }
      });
      
      // 覆盖 Canvas 指纹
      if (${fingerprint.canvasNoise}) {
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function() {
          const canvas = this;
          const context = canvas.getContext('2d');
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // 添加微小噪点
          for (let i = 0; i < data.length; i += 4) {
            data[i] = data[i] + Math.floor(Math.random() * 2);
            data[i+1] = data[i+1] + Math.floor(Math.random() * 2);
            data[i+2] = data[i+2] + Math.floor(Math.random() * 2);
          }
          
          context.putImageData(imageData, 0, 0);
          return originalToDataURL.apply(this, arguments);
        };
      }
      
      // 覆盖 WebGL 指纹
      const getParameterProxied = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL
        if (parameter === 37445) {
          return '${fingerprint.webglVendor}';
        }
        // UNMASKED_RENDERER_WEBGL
        if (parameter === 37446) {
          return '${fingerprint.webglRenderer}';
        }
        return getParameterProxied.call(this, parameter);
      };
      
      // 设置时区
      Object.defineProperty(Intl, 'DateTimeFormat', {
        get: function() {
          return function() {
            return {
              resolvedOptions: function() {
                return { timeZone: '${fingerprint.timezone}' };
              }
            };
          };
        }
      });
    `;
  }
  
  /**
   * 生成指纹防护扩展
   * @param {Object} fingerprint 指纹对象
   * @param {string} extensionDir 扩展目录
   * @returns {string} 扩展路径
   */
  generateFingerprintExtension(fingerprint, extensionDir) {
    // 创建扩展目录
    if (!fs.existsSync(extensionDir)) {
      fs.mkdirSync(extensionDir, { recursive: true });
    }
    
    // 创建 manifest.json
    const manifest = {
      name: 'Fingerprint Defender',
      version: '1.0',
      manifest_version: 2,
      description: 'Protects against browser fingerprinting',
      permissions: [
        'webRequest',
        'webRequestBlocking',
        '<all_urls>'
      ],
      background: {
        scripts: ['background.js']
      },
      content_scripts: [
        {
          matches: ['<all_urls>'],
          js: ['content.js'],
          run_at: 'document_start',
          all_frames: true
        }
      ]
    };
    
    // 创建 background.js
    const backgroundJs = `
      // 修改 User-Agent 头
      chrome.webRequest.onBeforeSendHeaders.addListener(
        function(details) {
          for (let i = 0; i < details.requestHeaders.length; i++) {
            if (details.requestHeaders[i].name === 'User-Agent') {
              details.requestHeaders[i].value = '${fingerprint.userAgent}';
              break;
            }
          }
          
          // 添加或修改 Accept-Language 头
          let hasAcceptLanguage = false;
          for (let i = 0; i < details.requestHeaders.length; i++) {
            if (details.requestHeaders[i].name === 'Accept-Language') {
              details.requestHeaders[i].value = '${fingerprint.language}';
              hasAcceptLanguage = true;
              break;
            }
          }
          
          if (!hasAcceptLanguage) {
            details.requestHeaders.push({
              name: 'Accept-Language',
              value: '${fingerprint.language}'
            });
          }
          
          return { requestHeaders: details.requestHeaders };
        },
        { urls: ['<all_urls>'] },
        ['blocking', 'requestHeaders']
      );
    `;
    
    // 创建 content.js
    const contentJs = this.createFingerprintInjectionScript(fingerprint);
    
    // 写入文件
    fs.writeFileSync(path.join(extensionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(path.join(extensionDir, 'background.js'), backgroundJs);
    fs.writeFileSync(path.join(extensionDir, 'content.js'), contentJs);
    
    return extensionDir;
  }
  
  /**
   * 应用指纹到 CDP 会话
   * @param {Object} client CDP 客户端
   * @param {Object} fingerprint 指纹对象
   * @returns {Promise<void>}
   */
  async applyFingerprintToCDP(client, fingerprint) {
    // 设置 User-Agent
    await client.send('Network.setUserAgentOverride', {
      userAgent: fingerprint.userAgent,
      acceptLanguage: fingerprint.language,
      platform: fingerprint.platform
    });
    
    // 设置地理位置（如果有）
    if (fingerprint.latitude && fingerprint.longitude) {
      await client.send('Emulation.setGeolocationOverride', {
        latitude: fingerprint.latitude,
        longitude: fingerprint.longitude,
        accuracy: 100
      });
    }
    
    // 设置时区
    if (fingerprint.timezone) {
      await client.send('Emulation.setTimezoneOverride', {
        timezoneId: fingerprint.timezone
      });
    }
    
    // 设置设备尺寸
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: fingerprint.screenWidth,
      height: fingerprint.screenHeight,
      deviceScaleFactor: 1,
      mobile: false
    });
    
    // 注入指纹脚本
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: this.createFingerprintInjectionScript(fingerprint)
    });
  }
  
  /**
   * 更新指定配置文件的指纹
   * @param {string} profileId 配置文件 ID
   * @param {Object} options 可选，指纹生成选项
   * @returns {Promise<Object>} 更新结果
   */
  async updateFingerprint(profileId, options = {}) {
    try {
      console.log(`更新指纹, 配置文件 ID: ${profileId}`);
      
      // 获取配置文件
      const profileManager = require('./profile-manager');
      const profile = profileManager.getProfileById(profileId);
      
      if (!profile) {
        throw new Error(`找不到指定的配置文件: ${profileId}`);
      }
      
      // 生成新的指纹
      const newFingerprint = this.generateFingerprint(options);
      console.log('生成新指纹:', JSON.stringify(newFingerprint, null, 2));
      
      // 更新配置文件中的指纹
      profile.fingerprint = newFingerprint;
      
      // 保存配置文件
      await profileManager.saveProfile(profile);
      
      // 尝试应用到正在运行的浏览器
      try {
        const browserManager = require('./browser-manager');
        const instance = browserManager.getRunningInstance(profileId);
        
        if (instance && instance.browser) {
          // 获取所有页面 - 在 Playwright 中使用 context.pages()
          // 首先确定是否有 context
          let pages = [];
          let context;
          
          if (instance.browser.contexts && instance.browser.contexts().length > 0) {
            // 如果是 browser 对象，获取所有 context 的页面
            context = instance.browser.contexts()[0];
            pages = await context.pages();
          } else {
            // 如果是 context 对象
            context = instance.browser;
            pages = await context.pages();
          }
          
          // 应用指纹到所有页面
          for (const page of pages) {
            try {
              // 在 Playwright 中，我们可以使用 page.context().addInitScript 来注入脚本
              // 或者使用 CDP 会话（如果需要特定的 CDP 功能）
              const session = await page.context().newCDPSession(page);
              
              // 应用指纹
              await this.applyFingerprintToCDP(session, newFingerprint);
            } catch (pageError) {
              console.warn(`应用指纹到页面失败:`, pageError);
              // 继续处理下一个页面
            }
          }
          
          console.log(`已将新指纹应用到 ${pages.length} 个页面`);
        }
      } catch (browserError) {
        console.warn(`应用指纹到运行中的浏览器失败:`, browserError);
        // 这不应该导致整个操作失败，因为指纹已经更新到配置文件
      }
      
      return { 
        success: true, 
        message: '指纹已成功更新', 
        fingerprint: newFingerprint 
      };
    } catch (error) {
      console.error('更新指纹失败:', error);
      throw new Error(`更新指纹失败: ${error.message}`);
    }
  }
  
  /**
   * 从操作系统获取平台字符串
   * @param {string} os 操作系统
   * @returns {string} 平台字符串
   * @private
   */
  _getPlatformFromOS(os) {
    switch (os) {
      case 'windows':
        return 'Win32';
      case 'macos':
        return 'MacIntel';
      case 'linux':
        return 'Linux x86_64';
      default:
        return 'Win32';
    }
  }
  
  /**
   * 获取随机用户代理
   * @param {string} browser 浏览器类型
   * @param {string} os 操作系统
   * @returns {string} 用户代理字符串
   * @private
   */
  _getRandomUserAgent(browser, os) {
    if (this.userAgents[browser] && this.userAgents[browser][os]) {
      const agents = this.userAgents[browser][os];
      return agents[Math.floor(Math.random() * agents.length)];
    }
    
    // 默认返回 Chrome Windows 用户代理
    return this.userAgents.chrome.windows[0];
  }
  
  /**
   * 从数组中随机选择一项
   * @param {Array} array 数组
   * @returns {*} 随机选择的项
   * @private
   */
  _getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

module.exports = new FingerprintManager();
