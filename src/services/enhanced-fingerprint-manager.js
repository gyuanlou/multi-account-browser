/**
 * 增强型指纹管理服务
 * 提供更强大的浏览器指纹防检测功能
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { chromium, firefox, webkit } = require('playwright');
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
      modifyWebRTCOffer: Math.random() > 0.5,
      // 新增防护选项
      rectsProtection: Math.random() > 0.3,  // 70% 概率启用 RECTS 矩形防护
      audioContextProtection: Math.random() > 0.3,  // 70% 概率启用音频指纹保护
      pluginDataProtection: Math.random() > 0.3,  // 70% 概率启用插件信息保护
      hardwareInfoProtection: Math.random() > 0.3  // 70% 概率启用硬件信息保护
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
      // 读取脚本模板 - 优先使用 Brave 风格的防护脚本
      let canvasScript = '';
      let fontScript = '';
      let hardwareScript = '';
      let webrtcScript = '';
      let audioScript = '';
      let pluginScript = '';
      let rectsScript = '';
      
      // 根据防护模式选择脚本
      const useBraveStyle = fingerprintConfig.protectionMode === 'brave';
      
      // 尝试读取 Canvas 防护脚本
      if (useBraveStyle) {
        try {
          canvasScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'brave-canvas-protection.js'), 'utf8');
          console.log('使用 Brave 风格的 Canvas 防护脚本');
        } catch (e) {
          console.warn('读取 Brave 风格的 Canvas 指纹保护脚本失败:', e.message);
          try {
            canvasScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'canvas-protection.js'), 'utf8');
          } catch (e2) {
            console.warn('读取 Canvas 指纹保护脚本失败:', e2.message);
          }
        }
      } else {
        try {
          canvasScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'canvas-protection.js'), 'utf8');
        } catch (e) {
          console.warn('读取 Canvas 指纹保护脚本失败:', e.message);
        }
      }
      
      // 尝试读取字体防护脚本
      if (useBraveStyle) {
        try {
          fontScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'brave-font-protection.js'), 'utf8');
          console.log('使用 Brave 风格的字体防护脚本');
        } catch (e) {
          console.warn('读取 Brave 风格的字体指纹保护脚本失败:', e.message);
          try {
            fontScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'font-protection.js'), 'utf8');
          } catch (e2) {
            console.warn('读取字体指纹保护脚本失败:', e2.message);
          }
        }
      } else {
        try {
          fontScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'font-protection.js'), 'utf8');
        } catch (e) {
          console.warn('读取字体指纹保护脚本失败:', e.message);
        }
      }
      
      // 尝试读取硬件信息防护脚本
      if (useBraveStyle) {
        try {
          hardwareScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'brave-hardware-protection.js'), 'utf8');
          console.log('使用 Brave 风格的硬件信息防护脚本');
        } catch (e) {
          console.warn('读取 Brave 风格的硬件信息防护脚本失败:', e.message);
          try {
            hardwareScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'hardware-protection.js'), 'utf8');
          } catch (e2) {
            console.warn('读取硬件信息保护脚本失败:', e2.message);
          }
        }
      } else {
        try {
          hardwareScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'hardware-protection.js'), 'utf8');
        } catch (e) {
          console.warn('读取硬件信息保护脚本失败:', e.message);
        }
      }
      
      // 尝试读取 WebRTC 防护脚本
      if (useBraveStyle) {
        try {
          webrtcScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'brave-webrtc-protection.js'), 'utf8');
          console.log('使用 Brave 风格的 WebRTC 防护脚本');
        } catch (e) {
          console.warn('读取 Brave 风格的 WebRTC 防护脚本失败:', e.message);
          try {
            webrtcScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'webrtc-protection.js'), 'utf8');
          } catch (e2) {
            console.warn('读取 WebRTC 保护脚本失败:', e2.message);
          }
        }
      } else {
        try {
          webrtcScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'webrtc-protection.js'), 'utf8');
        } catch (e) {
          console.warn('读取 WebRTC 保护脚本失败:', e.message);
        }
      }
      
      // 尝试读取音频防护脚本
      if (useBraveStyle) {
        try {
          audioScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'brave-audio-protection.js'), 'utf8');
          console.log('使用 Brave 风格的音频防护脚本');
        } catch (e) {
          console.warn('读取 Brave 风格的音频防护脚本失败:', e.message);
          try {
            audioScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'audio-protection.js'), 'utf8');
          } catch (e2) {
            console.warn('读取音频指纹保护脚本失败:', e2.message);
          }
        }
      } else {
        try {
          audioScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'audio-protection.js'), 'utf8');
        } catch (e) {
          console.warn('读取音频指纹保护脚本失败:', e.message);
        }
      }
      
      // 尝试读取插件信息防护脚本
      if (useBraveStyle) {
        try {
          pluginScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'brave-plugin-protection.js'), 'utf8');
          console.log('使用 Brave 风格的插件信息防护脚本');
        } catch (e) {
          console.warn('读取 Brave 风格的插件信息防护脚本失败:', e.message);
          try {
            pluginScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'plugin-protection.js'), 'utf8');
          } catch (e2) {
            console.warn('读取插件信息保护脚本失败:', e2.message);
          }
        }
      } else {
        try {
          pluginScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'plugin-protection.js'), 'utf8');
        } catch (e) {
          console.warn('读取插件信息保护脚本失败:', e.message);
        }
      }
      
      // 尝试读取 RECTS 矩形防护脚本
      try {
        rectsScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'rects-protection.js'), 'utf8');
      } catch (e) {
        console.warn('读取 RECTS 矩形防护脚本失败:', e.message);
      }
      
      try {
        rectsScript = fs.readFileSync(path.join(this.fingerprintScriptsDir, 'rects-protection.js'), 'utf8');
      } catch (e) {
        console.warn('读取 RECTS 矩形防护脚本失败:', e.message);
      }
      
      // 替换 Canvas 脚本中的变量 - 只有在使用原始脚本时才需要
      if (canvasScript.includes('{{CANVAS_NOISE_LEVEL}}')) {
        canvasScript = canvasScript
          .replace(/{{CANVAS_NOISE_LEVEL}}/g, fingerprintConfig.canvasNoiseLevel || 0)
          .replace(/{{WEBGL_VENDOR}}/g, fingerprintConfig.webglVendor || 'Google Inc.')
          .replace(/{{WEBGL_RENDERER}}/g, fingerprintConfig.webglRenderer || 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)');
      }
      
      // 替换字体脚本中的变量 - 只有在使用原始脚本时才需要
      if (fontScript.includes('{{ALLOWED_FONTS}}')) {
        fontScript = fontScript
          .replace(/{{ALLOWED_FONTS}}/g, JSON.stringify(fingerprintConfig.allowedFonts || this.commonFonts))
          .replace(/{{RANDOM_FONT_DETECTION}}/g, fingerprintConfig.randomFontDetection ? 'true' : 'false');
      }
      
      // 替换硬件信息脚本中的变量 - 只有在使用原始脚本时才需要
      if (hardwareScript.includes('{{HARDWARE_CONCURRENCY}}')) {
        hardwareScript = hardwareScript
          .replace(/{{HARDWARE_CONCURRENCY}}/g, fingerprintConfig.hardwareConcurrency || 4)
          .replace(/{{DEVICE_MEMORY}}/g, fingerprintConfig.deviceMemory || 8)
          .replace(/{{SCREEN_WIDTH}}/g, fingerprintConfig.screenWidth || 1920)
          .replace(/{{SCREEN_HEIGHT}}/g, fingerprintConfig.screenHeight || 1080)
          .replace(/{{COLOR_DEPTH}}/g, fingerprintConfig.colorDepth || 24)
          .replace(/{{DEVICE_PIXEL_RATIO}}/g, fingerprintConfig.devicePixelRatio || 1);
      }
      
      // 替换 WebRTC 脚本中的变量 - 只有在使用原始脚本时才需要
      if (webrtcScript.includes('{{DISABLE_WEBRTC}}')) {
        webrtcScript = webrtcScript
          .replace(/{{DISABLE_WEBRTC}}/g, !fingerprintConfig.webrtcEnabled ? 'true' : 'false')
          .replace(/{{MODIFY_WEBRTC_OFFER}}/g, fingerprintConfig.modifyWebRTCOffer ? 'true' : 'false');
      }
      
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
      
      // 添加新增的防护脚本
      ${fingerprintConfig.audioContextProtection ? audioScript : '// 音频指纹保护已禁用'}
      
      ${fingerprintConfig.pluginDataProtection ? pluginScript : '// 插件信息保护已禁用'}
      
      ${fingerprintConfig.rectsProtection ? rectsScript : '// RECTS 矩形防护已禁用'}
      `;
      
      return combinedScript;
    } catch (error) {
      console.error('生成指纹防护脚本失败:', error);
      throw new Error(`生成指纹防护脚本失败: ${error.message}`);
    }
  }
  
  /**
   * 应用指纹配置到浏览器
   * @param {Object} browser Playwright 浏览器实例
   * @param {Object} fingerprintConfig 指纹配置
   * @returns {Promise<boolean>} 是否应用成功
   */
  async applyFingerprint(browser, fingerprintConfig) {
    try {
      // 在 Playwright 中，我们通常使用 context 而不是直接使用 browser
      // 如果传入的是 context，直接使用；如果是 browser，则创建一个新的 context
      const context = browser.contexts ? browser.contexts()[0] : browser;
      
      // 获取浏览器页面
      const pages = await context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();
      
      // 生成指纹防护脚本
      const fingerprintScript = this.generateFingerprintScript(fingerprintConfig);
      
      // 在 Playwright 中，我们使用 addInitScript 而不是 evaluateOnNewDocument
      await context.addInitScript(fingerprintScript);
      
      // 设置 User-Agent - 在 Playwright 中，这通常在创建 context 时设置
      // 如果已经创建了 context，我们可以在页面级别设置
      await page.setExtraHTTPHeaders({
        'User-Agent': fingerprintConfig.userAgent
      });
      
      // 设置视口大小 - Playwright 使用 setViewportSize 而不是 setViewport
      await page.setViewportSize({
        width: fingerprintConfig.screen?.width || 1920,
        height: fingerprintConfig.screen?.height || 1080
        // Playwright 不支持在 setViewportSize 中设置 deviceScaleFactor
      });
      
      // 设置时区 - Playwright 使用不同的方式创建 CDP 会话
      // 在 Playwright 中，我们可以直接使用 context.setLocale 和 context.setTimezone
      await context.setTimezone(fingerprintConfig.timezone || 'Asia/Shanghai');
      
      // 设置地理位置（如果有） - Playwright 使用不同的 API
      if (fingerprintConfig.geolocation) {
        // 在 Playwright 中，我们可以直接设置 context 的地理位置
        await context.setGeolocation({
          latitude: fingerprintConfig.geolocation.latitude || 0,
          longitude: fingerprintConfig.geolocation.longitude || 0,
          accuracy: 100
        });
        
        // 注意：还需要授予地理位置权限
        await context.grantPermissions(['geolocation']);
      }
      
      return true;
    } catch (error) {
      console.error('应用指纹配置失败:', error);
      throw new Error(`应用指纹配置失败: ${error.message}`);
    }
  }
  
}
module.exports = new EnhancedFingerprintManager();
