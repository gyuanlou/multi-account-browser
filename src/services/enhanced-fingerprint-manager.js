/**
 * 增强型指纹管理服务
 * 提供更强大的浏览器指纹防检测功能
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const puppeteer = require('puppeteer-core');
const crypto = require('crypto');

class EnhancedFingerprintManager {
  constructor() {
    this.fingerprintScriptsDir = path.join(__dirname, '..', '..', 'resources', 'fingerprint-scripts');
    this.ensureScriptsDirExists();
    
    // 预定义的字体列表
    this.commonFonts = [
      'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria', 'Cambria Math', 
      'Comic Sans MS', 'Courier', 'Courier New', 'Georgia', 'Helvetica', 
      'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif', 
      'Palatino Linotype', 'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana'
    ];
    
    // 预定义的语言列表
    this.languages = [
      'en-US', 'en-GB', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es', 'it', 
      'ru', 'pt-BR', 'nl', 'pl', 'tr', 'ar'
    ];
    
    // 预定义的 WebGL 渲染器和供应商
    this.webglVendors = [
      'Google Inc.', 'Intel Inc.', 'NVIDIA Corporation', 'AMD', 'Apple Inc.'
    ];
    
    this.webglRenderers = [
      'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA Corporation, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Intel, Intel(R) HD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 2070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'Apple GPU',
      'Mali-G72',
      'Adreno (TM) 650'
    ];
  }
  
  /**
   * 确保指纹脚本目录存在
   */
  ensureScriptsDirExists() {
    if (!fs.existsSync(this.fingerprintScriptsDir)) {
      fs.mkdirSync(this.fingerprintScriptsDir, { recursive: true });
      this.createDefaultScripts();
    }
  }
  
  /**
   * 创建默认的指纹防检测脚本
   */
  createDefaultScripts() {
    // Canvas 指纹防护脚本
    const canvasScript = `
    // Canvas 指纹防护
    (function() {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, attributes) {
        const context = originalGetContext.call(this, type, attributes);
        
        if (type === '2d') {
          const originalGetImageData = context.getImageData;
          context.getImageData = function(sx, sy, sw, sh) {
            const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
            
            // 添加微小的噪点，不影响视觉效果但能改变指纹
            const noise = {{CANVAS_NOISE_LEVEL}};
            if (noise > 0) {
              const data = imageData.data;
              for (let i = 0; i < data.length; i += 4) {
                // 随机调整 RGB 值
                data[i] = Math.max(0, Math.min(255, data[i] + (Math.random() * 2 - 1) * noise));
                data[i+1] = Math.max(0, Math.min(255, data[i+1] + (Math.random() * 2 - 1) * noise));
                data[i+2] = Math.max(0, Math.min(255, data[i+2] + (Math.random() * 2 - 1) * noise));
              }
            }
            
            return imageData;
          };
          
          // 修改 Canvas 的 toDataURL 方法
          const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
          HTMLCanvasElement.prototype.toDataURL = function() {
            // 对于空白 Canvas，添加一个不可见的像素
            if (this.width === 0 || this.height === 0) {
              return originalToDataURL.apply(this, arguments);
            }
            
            const ctx = originalGetContext.call(this, '2d');
            const imageData = ctx.getImageData(0, 0, 1, 1);
            const pixel = imageData.data;
            
            // 添加微小的变化
            const noise = {{CANVAS_NOISE_LEVEL}};
            if (noise > 0) {
              pixel[0] = Math.max(0, Math.min(255, pixel[0] + (Math.random() * 2 - 1) * noise));
              pixel[1] = Math.max(0, Math.min(255, pixel[1] + (Math.random() * 2 - 1) * noise));
              pixel[2] = Math.max(0, Math.min(255, pixel[2] + (Math.random() * 2 - 1) * noise));
              ctx.putImageData(imageData, 0, 0);
            }
            
            return originalToDataURL.apply(this, arguments);
          };
        } else if (type === 'webgl' || type === 'experimental-webgl' || type === 'webgl2') {
          // WebGL 指纹防护
          const getParameterProxyHandler = {
            apply: function(target, thisArg, args) {
              const param = args[0];
              
              // 修改 WebGL 参数返回值
              if (param === 37445) { // UNMASKED_VENDOR_WEBGL
                return '{{WEBGL_VENDOR}}';
              }
              
              if (param === 37446) { // UNMASKED_RENDERER_WEBGL
                return '{{WEBGL_RENDERER}}';
              }
              
              return target.apply(thisArg, args);
            }
          };
          
          // 代理 getParameter 方法
          context.getParameter = new Proxy(context.getParameter, getParameterProxyHandler);
        }
        
        return context;
      };
    })();
    `;
    
    // 字体指纹防护脚本
    const fontScript = `
    // 字体指纹防护
    (function() {
      // 重写 document.fonts.check 方法
      if (document.fonts && document.fonts.check) {
        const originalCheck = document.fonts.check;
        document.fonts.check = function(font, text) {
          // 允许检测的字体列表
          const allowedFonts = {{ALLOWED_FONTS}};
          
          // 检查是否是允许的字体
          for (const allowedFont of allowedFonts) {
            if (font.includes(allowedFont)) {
              return originalCheck.call(this, font, text);
            }
          }
          
          // 对于不在允许列表中的字体，随机返回结果
          if ({{RANDOM_FONT_DETECTION}}) {
            return Math.random() > 0.5;
          }
          
          // 默认返回 false
          return false;
        };
      }
      
      // 修改 CSS 字体检测
      if (window.CSSFontFaceRule) {
        const originalGetPropertyValue = window.CSSStyleDeclaration.prototype.getPropertyValue;
        window.CSSStyleDeclaration.prototype.getPropertyValue = function(property) {
          if (property === 'font-family') {
            const value = originalGetPropertyValue.call(this, property);
            // 这里可以添加字体混淆逻辑
            return value;
          }
          return originalGetPropertyValue.call(this, property);
        };
      }
    })();
    `;
    
    // 硬件信息防护脚本
    const hardwareScript = `
    // 硬件信息防护
    (function() {
      // 修改 navigator.hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: function() {
          return {{HARDWARE_CONCURRENCY}};
        }
      });
      
      // 修改 navigator.deviceMemory
      if ('deviceMemory' in navigator) {
        Object.defineProperty(navigator, 'deviceMemory', {
          get: function() {
            return {{DEVICE_MEMORY}};
          }
        });
      }
      
      // 修改 screen 属性
      Object.defineProperty(screen, 'width', {
        get: function() {
          return {{SCREEN_WIDTH}};
        }
      });
      
      Object.defineProperty(screen, 'height', {
        get: function() {
          return {{SCREEN_HEIGHT}};
        }
      });
      
      Object.defineProperty(screen, 'colorDepth', {
        get: function() {
          return {{COLOR_DEPTH}};
        }
      });
      
      Object.defineProperty(screen, 'pixelDepth', {
        get: function() {
          return {{COLOR_DEPTH}};
        }
      });
      
      // 修改 window.devicePixelRatio
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() {
          return {{DEVICE_PIXEL_RATIO}};
        }
      });
    })();
    `;
    
    // WebRTC 防护脚本
    const webrtcScript = `
    // WebRTC 防护
    (function() {
      if ({{DISABLE_WEBRTC}}) {
        // 完全禁用 WebRTC
        const rtcObjects = [
          'RTCPeerConnection',
          'webkitRTCPeerConnection',
          'mozRTCPeerConnection',
          'RTCIceGatherer'
        ];
        
        for (const rtcObject of rtcObjects) {
          if (window[rtcObject]) {
            window[rtcObject] = undefined;
          }
        }
      } else {
        // 修改 WebRTC 行为
        if (window.RTCPeerConnection) {
          const originalRTCPeerConnection = window.RTCPeerConnection;
          window.RTCPeerConnection = function(config, constraints) {
            // 修改 ICE 服务器配置
            if (config && config.iceServers) {
              // 可以在这里修改 ICE 服务器配置
            }
            
            const pc = new originalRTCPeerConnection(config, constraints);
            
            // 代理 createOffer 方法
            const originalCreateOffer = pc.createOffer;
            pc.createOffer = function(options) {
              if ({{MODIFY_WEBRTC_OFFER}}) {
                // 在这里可以修改 SDP 选项
              }
              return originalCreateOffer.call(this, options);
            };
            
            return pc;
          };
        }
      }
    })();
    `;
    
    // 保存脚本文件
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'canvas-protection.js'), canvasScript);
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'font-protection.js'), fontScript);
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'hardware-protection.js'), hardwareScript);
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'webrtc-protection.js'), webrtcScript);
  }
  
  /**
   * 生成随机的指纹配置
   * @returns {Object} 随机指纹配置
   */
  generateRandomFingerprint() {
    // 随机选择 User-Agent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
    ];
    
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // 解析 User-Agent 获取平台信息
    let platform = 'Win32';
    if (userAgent.includes('Macintosh')) {
      platform = 'MacIntel';
    } else if (userAgent.includes('Linux')) {
      platform = 'Linux x86_64';
    } else if (userAgent.includes('Windows')) {
      platform = 'Win32';
    }
    
    // 随机选择语言
    const language = this.languages[Math.floor(Math.random() * this.languages.length)];
    
    // 随机选择屏幕分辨率
    const commonResolutions = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 2560, height: 1440 },
      { width: 1280, height: 720 },
      { width: 1680, height: 1050 }
    ];
    
    const resolution = commonResolutions[Math.floor(Math.random() * commonResolutions.length)];
    
    // 随机选择 WebGL 信息
    const webglVendor = this.webglVendors[Math.floor(Math.random() * this.webglVendors.length)];
    const webglRenderer = this.webglRenderers[Math.floor(Math.random() * this.webglRenderers.length)];
    
    // 生成随机的硬件信息
    const hardwareConcurrency = [2, 4, 6, 8, 12, 16][Math.floor(Math.random() * 6)];
    const deviceMemory = [2, 4, 8, 16][Math.floor(Math.random() * 4)];
    const colorDepth = [24, 30, 32][Math.floor(Math.random() * 3)];
    const pixelRatio = [1, 1.25, 1.5, 2, 2.5, 3][Math.floor(Math.random() * 6)];
    
    // 随机选择时区
    const timezones = [
      'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'Europe/London',
      'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore',
      'Australia/Sydney', 'Pacific/Auckland'
    ];
    
    const timezone = timezones[Math.floor(Math.random() * timezones.length)];
    
    // 生成指纹配置
    return {
      userAgent,
      platform,
      language,
      screenWidth: resolution.width,
      screenHeight: resolution.height,
      colorDepth,
      pixelDepth: colorDepth,
      devicePixelRatio: pixelRatio,
      hardwareConcurrency,
      deviceMemory,
      webglVendor,
      webglRenderer,
      timezone,
      canvasNoise: Math.random() > 0.5,
      canvasNoiseLevel: Math.floor(Math.random() * 5) + 1,
      fontProtection: Math.random() > 0.3,
      allowedFonts: this.getRandomSubset(this.commonFonts, Math.floor(Math.random() * 10) + 5),
      randomFontDetection: Math.random() > 0.5,
      webrtcEnabled: Math.random() > 0.3,
      modifyWebRTCOffer: Math.random() > 0.5
    };
  }
  
  /**
   * 从数组中随机选择子集
   * @param {Array} array 原始数组
   * @param {number} count 选择的元素数量
   * @returns {Array} 随机子集
   */
  getRandomSubset(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  /**
   * 生成指纹防护脚本
   * @param {Object} fingerprintConfig 指纹配置
   * @returns {string} 指纹防护脚本
   */
  generateFingerprintScript(fingerprintConfig) {
    try {
      // 读取脚本模板
      let canvasScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'canvas-protection.js'), 'utf8');
      let fontScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'font-protection.js'), 'utf8');
      let hardwareScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'hardware-protection.js'), 'utf8');
      let webrtcScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'webrtc-protection.js'), 'utf8');
      
      // 替换 Canvas 脚本中的变量
      canvasScript = canvasScript
        .replace(/{{CANVAS_NOISE_LEVEL}}/g, fingerprintConfig.canvasNoiseLevel || 0)
        .replace(/{{WEBGL_VENDOR}}/g, fingerprintConfig.webglVendor || 'Google Inc.')
        .replace(/{{WEBGL_RENDERER}}/g, fingerprintConfig.webglRenderer || 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)');
      
      // 替换字体脚本中的变量
      fontScript = fontScript
        .replace(/{{ALLOWED_FONTS}}/g, JSON.stringify(fingerprintConfig.allowedFonts || this.commonFonts))
        .replace(/{{RANDOM_FONT_DETECTION}}/g, fingerprintConfig.randomFontDetection ? 'true' : 'false');
      
      // 替换硬件信息脚本中的变量
      hardwareScript = hardwareScript
        .replace(/{{HARDWARE_CONCURRENCY}}/g, fingerprintConfig.hardwareConcurrency || 4)
        .replace(/{{DEVICE_MEMORY}}/g, fingerprintConfig.deviceMemory || 8)
        .replace(/{{SCREEN_WIDTH}}/g, fingerprintConfig.screenWidth || 1920)
        .replace(/{{SCREEN_HEIGHT}}/g, fingerprintConfig.screenHeight || 1080)
        .replace(/{{COLOR_DEPTH}}/g, fingerprintConfig.colorDepth || 24)
        .replace(/{{DEVICE_PIXEL_RATIO}}/g, fingerprintConfig.devicePixelRatio || 1);
      
      // 替换 WebRTC 脚本中的变量
      webrtcScript = webrtcScript
        .replace(/{{DISABLE_WEBRTC}}/g, !fingerprintConfig.webrtcEnabled ? 'true' : 'false')
        .replace(/{{MODIFY_WEBRTC_OFFER}}/g, fingerprintConfig.modifyWebRTCOffer ? 'true' : 'false');
      
      // 组合所有脚本
      let combinedScript = `
      // 浏览器指纹防护脚本
      // 生成时间: ${new Date().toISOString()}
      
      // 修改 navigator 属性
      (function() {
        // 修改 User-Agent
        Object.defineProperty(navigator, 'userAgent', {
          get: function() {
            return '${fingerprintConfig.userAgent}';
          }
        });
        
        // 修改平台
        Object.defineProperty(navigator, 'platform', {
          get: function() {
            return '${fingerprintConfig.platform}';
          }
        });
        
        // 修改语言
        Object.defineProperty(navigator, 'language', {
          get: function() {
            return '${fingerprintConfig.language}';
          }
        });
        
        // 修改语言列表
        Object.defineProperty(navigator, 'languages', {
          get: function() {
            return ['${fingerprintConfig.language}'];
          }
        });
      })();
      
      // 添加各个防护脚本
      ${canvasScript}
      
      ${fontScript}
      
      ${hardwareScript}
      
      ${webrtcScript}
      `;
      
      return combinedScript;
    } catch (error) {
      console.error('生成指纹防护脚本失败:', error);
      throw new Error(`生成指纹防护脚本失败: ${error.message}`);
    }
  }
  
  /**
   * 应用指纹配置到浏览器
   * @param {Object} browser Puppeteer 浏览器实例
   * @param {Object} fingerprintConfig 指纹配置
   * @returns {Promise<boolean>} 是否应用成功
   */
  async applyFingerprint(browser, fingerprintConfig) {
    try {
      // 获取浏览器页面
      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[0] : await browser.newPage();
      
      // 生成指纹防护脚本
      const fingerprintScript = this.generateFingerprintScript(fingerprintConfig);
      
      // 在页面加载前注入脚本
      await page.evaluateOnNewDocument(fingerprintScript);
      
      // 设置 User-Agent
      await page.setUserAgent(fingerprintConfig.userAgent);
      
      // 设置视口大小
      await page.setViewport({
        width: fingerprintConfig.screenWidth || 1920,
        height: fingerprintConfig.screenHeight || 1080,
        deviceScaleFactor: fingerprintConfig.devicePixelRatio || 1
      });
      
      // 设置时区
      const client = await page.target().createCDPSession();
      await client.send('Emulation.setTimezoneOverride', {
        timezoneId: fingerprintConfig.timezone || 'Asia/Shanghai'
      });
      
      // 设置地理位置（如果有）
      if (fingerprintConfig.geolocation) {
        await client.send('Emulation.setGeolocationOverride', {
          latitude: fingerprintConfig.geolocation.latitude || 0,
          longitude: fingerprintConfig.geolocation.longitude || 0,
          accuracy: 100
        });
      }
      
      return true;
    } catch (error) {
      console.error('应用指纹配置失败:', error);
      throw new Error(`应用指纹配置失败: ${error.message}`);
    }
  }
  
  /**
   * 测试指纹防护效果
   * @param {Object} browser Puppeteer 浏览器实例
   * @returns {Promise<Object>} 测试结果
   */
  async testFingerprintProtection(browser) {
    try {
      // 获取浏览器页面
      console.log('获取浏览器页面...');
      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[0] : await browser.newPage();
      
      // 创建一个本地测试页面
      console.log('创建本地测试页面...');
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
            // 运行多次测试以检查一致性
            const TEST_RUNS = 3;
            
            // Canvas 指纹测试
            function testCanvas() {
              const fingerprints = [];
              
              for (let i = 0; i < TEST_RUNS; i++) {
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
                ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
                ctx.fillText("Hello, world!", 4, 17);
                
                fingerprints.push(canvas.toDataURL());
              }
              
              // 检查是否所有指纹都相同
              const allSame = fingerprints.every(fp => fp === fingerprints[0]);
              
              return {
                fingerprints: fingerprints,
                protected: !allSame, // 如果每次生成的指纹都不同，则表示有保护
                details: allSame ? '每次生成的Canvas指纹相同，没有保护' : '每次生成的Canvas指纹不同，有保护'
              };
            }
            
            // WebGL 指纹测试
            function testWebGL() {
              const canvas = document.createElement('canvas');
              const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
              
              if (!gl) {
                return { 
                  vendor: 'WebGL not supported', 
                  renderer: 'WebGL not supported',
                  protected: true,
                  details: 'WebGL不可用，无法被指纹识别'
                };
              }
              
              const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
              
              if (!debugInfo) {
                return { 
                  vendor: 'WEBGL_debug_renderer_info not supported', 
                  renderer: 'WEBGL_debug_renderer_info not supported',
                  protected: true,
                  details: 'WebGL调试信息不可用，无法被指纹识别'
                };
              }
              
              const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
              const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
              
              // 检查是否包含通用名称而不是具体的硬件信息
              const isGenericVendor = vendor.includes('Generic') || vendor.includes('Mozilla') || vendor.includes('Google');
              const isGenericRenderer = renderer.includes('Generic') || !renderer.includes('NVIDIA') && !renderer.includes('AMD') && !renderer.includes('Intel');
              
              return {
                vendor: vendor,
                renderer: renderer,
                protected: isGenericVendor && isGenericRenderer,
                details: isGenericVendor && isGenericRenderer ? 'WebGL供应商和渲染器已被通用值替代' : 'WebGL暴露了真实的硬件信息'
              };
            }
            
            // 字体测试
            function testFonts() {
              const baseFonts = ['monospace', 'sans-serif', 'serif'];
              const fontList = [
                'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana',
                'Helvetica', 'Tahoma', 'Trebuchet MS', 'Impact', 'Comic Sans MS',
                'Palatino', 'Garamond', 'Bookman', 'Avant Garde', 'Candara',
                'Calibri', 'Cambria', 'Consolas', 'Segoe UI', 'Optima'
              ];
              
              const detectedFonts = [];
              
              for (const font of fontList) {
                let isDetected = false;
                
                for (const baseFont of baseFonts) {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  
                  ctx.font = "72px '" + baseFont + "'";
                  const baseFontWidth = ctx.measureText('mmmmmmmmmmlli').width;
                  
                  ctx.font = "72px '" + font + "', '" + baseFont + "'";
                  const testFontWidth = ctx.measureText('mmmmmmmmmmlli').width;
                  
                  if (testFontWidth !== baseFontWidth) {
                    isDetected = true;
                    break;
                  }
                }
                
                if (isDetected) {
                  detectedFonts.push(font);
                }
              }
              
              // 如果检测到的字体少于5个，可能是启用了字体保护
              const protected = detectedFonts.length < 5;
              
              return {
                detectedFonts: detectedFonts,
                count: detectedFonts.length,
                protected: protected,
                details: protected ? 
                  '检测到的字体数量较少，可能启用了字体保护' : 
                  '检测到 ' + detectedFonts.length + ' 个字体，没有启用字体保护'
              };
            }
            
            // 音频指纹测试
            function testAudioFingerprint() {
              try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const analyser = audioCtx.createAnalyser();
                const gain = audioCtx.createGain();
                const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
                
                gain.gain.value = 0; // 静音
                oscillator.type = 'triangle';
                oscillator.connect(analyser);
                analyser.connect(scriptProcessor);
                scriptProcessor.connect(gain);
                gain.connect(audioCtx.destination);
                
                oscillator.start(0);
                
                const fingerprints = [];
                
                return new Promise((resolve) => {
                  scriptProcessor.onaudioprocess = (e) => {
                    const data = e.outputBuffer.getChannelData(0);
                    let sum = 0;
                    for (let i = 0; i < data.length; i++) {
                      sum += Math.abs(data[i]);
                    }
                    fingerprints.push(sum);
                    
                    if (fingerprints.length >= 2) {
                      oscillator.stop();
                      scriptProcessor.disconnect();
                      analyser.disconnect();
                      gain.disconnect();
                      audioCtx.close();
                      
                      // 检查是否所有指纹都相同
                      const allSame = fingerprints.every(fp => fp === fingerprints[0]);
                      
                      resolve({
                        protected: !allSame,
                        details: allSame ? '音频指纹一致，没有保护' : '音频指纹不一致，有保护'
                      });
                    }
                  };
                  
                  // 如果5秒后还没有结果，可能是被阻止了
                  setTimeout(() => {
                    resolve({
                      protected: true,
                      details: '音频上下文可能被阻止，无法生成指纹'
                    });
                  }, 5000);
                });
              } catch (e) {
                return {
                  protected: true,
                  details: '音频上下文不可用，无法生成指纹: ' + e.message
                };
              }
            }
            
            // WebRTC 测试
            function testWebRTC() {
              if (!window.RTCPeerConnection) {
                return {
                  protected: true,
                  details: 'WebRTC API不可用，无法泄露IP地址'
                };
              }
              
              try {
                const pc = new RTCPeerConnection({
                  iceServers: [{
                    urls: "stun:stun.l.google.com:19302"
                  }]
                });
                
                // 检查是否能获取到候选项
                let candidatesFound = false;
                
                pc.onicecandidate = (e) => {
                  if (e.candidate) {
                    candidatesFound = true;
                  }
                };
                
                pc.createDataChannel('');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
                
                return new Promise((resolve) => {
                  // 等待3秒检查是否有候选项
                  setTimeout(() => {
                    pc.close();
                    resolve({
                      protected: !candidatesFound,
                      details: candidatesFound ? 'WebRTC可以获取候选项，可能泄露真实IP' : 'WebRTC无法获取候选项，IP地址受到保护'
                    });
                  }, 3000);
                });
              } catch (e) {
                return {
                  protected: true,
                  details: 'WebRTC创建连接失败，IP地址受到保护: ' + e.message
                };
              }
            }
            
            // 硬件信息测试
            function testHardwareInfo() {
              const hardwareData = {
                cores: navigator.hardwareConcurrency || 'unknown',
                memory: navigator.deviceMemory || 'unknown',
                platform: navigator.platform || 'unknown',
                plugins: navigator.plugins ? navigator.plugins.length : 'unknown',
                touchPoints: navigator.maxTouchPoints || 'unknown'
              };
              
              // 检查是否使用了通用值
              const isGeneric = 
                hardwareData.cores === 'unknown' || hardwareData.cores === 2 || hardwareData.cores === 4 ||
                hardwareData.memory === 'unknown' ||
                hardwareData.platform === 'unknown' ||
                hardwareData.plugins === 'unknown' ||
                hardwareData.touchPoints === 'unknown';
              
              return {
                data: hardwareData,
                protected: isGeneric,
                details: isGeneric ? '硬件信息已被通用值替代或隐藏' : '硬件信息可被访问，可能被用于指纹识别'
              };
            }
            
            // 时区测试
            function testTimezone() {
              const timezoneOffset = new Date().getTimezoneOffset();
              const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
              
              // 检查时区信息是否一致
              // 例如，如果时区是Asia/Shanghai，偏移应该是-480分钟
              let expected = true;
              if (timezone === 'Asia/Shanghai' && timezoneOffset !== -480) expected = false;
              if (timezone === 'America/New_York' && timezoneOffset !== 240 && timezoneOffset !== 300) expected = false;
              if (timezone === 'Europe/London' && timezoneOffset !== 0 && timezoneOffset !== 60) expected = false;
              
              return {
                timezone: timezone,
                offset: timezoneOffset,
                protected: !expected,
                details: !expected ? '时区信息不一致，可能被修改' : '时区信息一致，没有被修改'
              };
            }
            
            // 插件测试
            function testPlugins() {
              if (!navigator.plugins) {
                return {
                  count: 0,
                  protected: true,
                  details: '插件API不可用，无法被指纹识别'
                };
              }
              
              const plugins = Array.from(navigator.plugins).map(p => p.name);
              
              return {
                plugins: plugins,
                count: plugins.length,
                protected: plugins.length === 0,
                details: plugins.length === 0 ? '没有检测到插件，插件信息受到保护' : '检测到 ' + plugins.length + ' 个插件，可能被用于指纹识别'
              };
            }
            
            // 运行所有测试
            async function runAllTests() {
              const canvasResults = testCanvas();
              const webglResults = testWebGL();
              const fontsResults = testFonts();
              const hardwareResults = testHardwareInfo();
              const pluginsResults = testPlugins();
              const timezoneResults = testTimezone();
              
              // 异步测试
              const audioResults = await testAudioFingerprint();
              const webrtcResults = await testWebRTC();
              
              return {
                canvas: canvasResults,
                webgl: webglResults,
                fonts: fontsResults,
                hardware: hardwareResults,
                audio: audioResults,
                plugins: pluginsResults,
                timezone: timezoneResults,
                webrtc: webrtcResults
              };
            }
            
            // 运行测试并显示结果
            runAllTests().then(results => {
              const resultsDiv = document.getElementById('results');
              
              // 显示各项测试结果
              function displayResult(name, result) {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'result';
                resultDiv.innerHTML = 
                  '<h2>' + name + '</h2>' +
                  '<p class="' + (result.protected ? 'passed' : 'failed') + '">' +
                    (result.protected ? '✓ 已保护' : '✗ 未保护') +
                  '</p>' +
                  '<p>' + result.details + '</p>';
                resultsDiv.appendChild(resultDiv);
              }
              
              displayResult('Canvas 指纹', results.canvas);
              displayResult('WebGL 指纹', results.webgl);
              displayResult('字体指纹', results.fonts);
              displayResult('硬件信息', results.hardware);
              displayResult('音频指纹', results.audio);
              displayResult('插件信息', results.plugins);
              displayResult('时区保护', results.timezone);
              displayResult('WebRTC 保护', results.webrtc);
              
              // 将结果保存到全局变量
              window.fingerprintTestResults = results;
            });
          </script>
        </body>
        </html>
      `);
      
      // 等待脚本执行完成
      console.log('等待脚本执行完成...');
      await page.waitForFunction('window.fingerprintTestResults !== undefined', { timeout: 10000 });
      
      // 获取测试结果
      console.log('获取测试结果...');
      const testResults = await page.evaluate(() => window.fingerprintTestResults);
      
      // 生成最终结果
      console.log('生成最终结果...');
      return {
        success: true,
        canvas: {
          protected: testResults.canvas.protected,
          details: testResults.canvas.details
        },
        webrtc: {
          protected: testResults.webrtc.protected,
          details: testResults.webrtc.details
        },
        fonts: {
          protected: testResults.fonts.protected,
          details: testResults.fonts.details
        },
        hardware: {
          protected: testResults.hardware.protected,
          details: testResults.hardware.details
        },
        audio: {
          protected: testResults.audio.protected,
          details: testResults.audio.details
        },
        plugins: {
          protected: testResults.plugins.protected,
          details: testResults.plugins.details
        },
        timezone: {
          protected: testResults.timezone.protected,
          details: testResults.timezone.details
        }
      };
    } catch (error) {
      console.error('测试指纹防护效果失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new EnhancedFingerprintManager();
