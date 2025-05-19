/**
 * Brave 风格的指纹防护脚本
 * 参考 Brave 浏览器的防护机制实现
 * 用于防止网站通过各种方式收集浏览器指纹
 */

(function() {
  // 在页面上显示防护状态，便于调试
  const debugDiv = document.createElement('div');
  debugDiv.style.position = 'fixed';
  debugDiv.style.top = '10px';
  debugDiv.style.right = '10px';
  debugDiv.style.zIndex = '9999';
  debugDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  debugDiv.style.color = '#fff';
  debugDiv.style.padding = '10px';
  debugDiv.style.borderRadius = '5px';
  debugDiv.style.fontSize = '12px';
  debugDiv.style.maxWidth = '300px';
  debugDiv.style.maxHeight = '200px';
  debugDiv.style.overflow = 'auto';
  debugDiv.innerHTML = '<h3>指纹防护状态</h3><div id="fingerprint-debug-content"></div>';
  
  // 延迟添加到页面，确保页面已加载
  setTimeout(() => {
    document.body.appendChild(debugDiv);
  }, 1000);
  
  // 调试日志函数
  function debugLog(message) {
    console.log(message);
    setTimeout(() => {
      const debugContent = document.getElementById('fingerprint-debug-content');
      if (debugContent) {
        debugContent.innerHTML += '<div>' + message + '</div>';
      }
    }, 1000);
  }
  
  // 获取配置，如果没有配置则使用默认值
  const config = window.__FINGERPRINT_CONFIG__ || {
    canvasProtection: true,
    webrtcProtection: true,
    hardwareInfoProtection: true,
    audioContextProtection: true,
    pluginDataProtection: true,
    rectsProtection: true,
    timezoneProtection: true,
    fontProtection: true
  };
  
  debugLog('[指纹防护] 脚本已成功注入！');
  debugLog('[指纹防护] 加载配置: ' + JSON.stringify(config));
  
  // 使用配置中的随机种子，或生成一个新的随机种子
  const SEED = config.randomSeed || Math.floor(Math.random() * 2147483647);
  debugLog('[指纹防护] 使用随机种子:', SEED);
  
  // 全局种子值，用于生成一致的随机数
  let globalSeed = SEED;
  
  // 生成一致的随机数
  function seededRandom() {
    globalSeed = (globalSeed * 9301 + 49297) % 233280;
    return globalSeed / 233280;
  }
  
  /**
   * 生成伪造设备配置
   * @param {Object} config - 指纹防护配置
   * @returns {Object} 伪造设备配置
   */
  function generateFakeDeviceProfile(config) {
    debugLog('生成伪造设备配置，配置信息：', config);
    
    // 直接使用配置中的值，仅在缺失时生成默认值
    
    // 平台信息
    let platform = config.platform || 'Win32';
    let osName = 'Windows';
    
    if (platform === 'MacIntel') {
      osName = 'macOS';
    } else if (platform === 'Linux x86_64') {
      osName = 'Linux';
    }
    
    // User-Agent
    let userAgent = config.userAgent || '';
    if (!userAgent) {
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36';
    }
    
    // GPU 信息 - 优先使用配置中的值
    let gpuVendor = config.gpuVendor;
    let gpuRenderer = config.gpuRenderer;
    
    // 如果没有配置 GPU 信息，根据操作系统选择默认值
    if (!gpuVendor || !gpuRenderer) {
      const defaultGpuInfo = {
        'Windows': {
          vendor: 'Google Inc.',
          renderer: 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'
        },
        'macOS': {
          vendor: 'Apple',
          renderer: 'ANGLE (Apple, Apple M1, OpenGL 4.1)'
        },
        'Linux': {
          vendor: 'Mesa',
          renderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)'
        }
      };
      
      gpuVendor = gpuVendor || defaultGpuInfo[osName].vendor;
      gpuRenderer = gpuRenderer || defaultGpuInfo[osName].renderer;
    }
    
    // 屏幕分辨率 - 使用配置中的值
    const screenWidth = config.screenWidth || 1920;
    const screenHeight = config.screenHeight || 1080;
    
    // 语言 - 使用配置中的值
    let language = ['en-US', 'en'];
    if (config.language) {
      language = [config.language, config.language.split('-')[0]];
    }
    
    // 时区偏移 - 使用配置中的值或与地理位置相关的值
    let timezoneOffset = -480; // 默认 UTC+8
    
    // 如果有地理位置配置，则根据地理位置设置时区
    if (config.geoLocation && config.geoLocation.timezone) {
      // 将时区 ID 转换为偏移分钟数
      const timezoneMap = {
        'America/New_York': 240,      // UTC-4
        'America/Chicago': 300,       // UTC-5
        'America/Denver': 360,        // UTC-6
        'America/Los_Angeles': 420,   // UTC-7
        'Europe/London': 0,           // UTC+0
        'Europe/Berlin': -60,         // UTC+1
        'Europe/Moscow': -180,        // UTC+3
        'Asia/Dubai': -240,           // UTC+4
        'Asia/Shanghai': -480,        // UTC+8
        'Asia/Tokyo': -540,           // UTC+9
        'Australia/Sydney': -600,     // UTC+10
        'Pacific/Auckland': -720      // UTC+12
      };
      
      if (timezoneMap[config.geoLocation.timezone]) {
        timezoneOffset = timezoneMap[config.geoLocation.timezone];
      }
    }
    
    // 硬件信息 - 使用配置中的值或默认值
    const hardwareConcurrency = config.hardwareConcurrency || 4;
    const deviceMemory = config.deviceMemory || 8;
    
    // 返回伪造设备配置
    return {
      userAgent,
      platform,
      hardwareConcurrency,
      deviceMemory,
      language,
      timezoneOffset,
      screen: {
        width: parseInt(screenWidth),
        height: parseInt(screenHeight),
        colorDepth: 24
      },
      gpu: {
        vendor: gpuVendor,
        renderer: gpuRenderer
      },
      // 生成一个随机的指纹哈希，但对于同一个会话保持一致
      fingerprint: Array.from({length: 16}, () => Math.floor(seededRandom() * 16).toString(16)).join('').toUpperCase()
    };
  }
  
  // 生成一个一致的设备配置，传入用户配置
  const fakeDeviceProfile = generateFakeDeviceProfile(config);
  
  debugLog('[指纹防护] 伪造设备信息: ' + JSON.stringify(fakeDeviceProfile, null, 2));
  
  // 为对象添加噪声
  function addNoise(obj, properties, magnitude = 0.01) {
    const result = {};
    for (const prop in obj) {
      if (typeof obj[prop] === 'number' && properties.includes(prop)) {
        // 添加微小的噪声
        result[prop] = obj[prop] * (1 + (seededRandom() * 2 - 1) * magnitude);
      } else {
        result[prop] = obj[prop];
      }
    }
    return result;
  }

  // 保存原始方法
  const originalCreateElement = Document.prototype.createElement;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  const originalGetClientRects = Element.prototype.getClientRects;
  
  // 修改 Canvas 相关方法
  if (config.canvasProtection) {
    Document.prototype.createElement = function(tagName) {
      const element = originalCreateElement.apply(this, arguments);
      
      if (tagName.toLowerCase() === 'canvas') {
          // 重写 getContext 方法
          element.getContext = function(contextType) {
            const context = originalGetContext.apply(this, arguments);
            
            if (contextType === '2d') {
              // 重写 getImageData 方法
              context.getImageData = function() {
                const imageData = originalGetImageData.apply(this, arguments);
                const data = imageData.data;
                
                // 添加微小的噪声到像素数据
                for (let i = 0; i < data.length; i += 4) {
                  // 只修改一小部分像素
                  if (Math.random() < 0.1) {
                    data[i] = Math.max(0, Math.min(255, data[i] + Math.floor(Math.random() * 2) - 1));
                    data[i+1] = Math.max(0, Math.min(255, data[i+1] + Math.floor(Math.random() * 2) - 1));
                    data[i+2] = Math.max(0, Math.min(255, data[i+2] + Math.floor(Math.random() * 2) - 1));
                  }
                }
                
                return imageData;
              };
              
              // 重写 measureText 方法
              context.measureText = function(text) {
                const metrics = originalMeasureText.apply(this, arguments);
                // 添加微小的随机变化
                const originalWidth = metrics.width;
                Object.defineProperty(metrics, 'width', {
                  get: function() {
                    return originalWidth + (Math.random() * 0.02 - 0.01);
                  }
                });
                return metrics;
              };
          } 
          
          return context;
        };
        
        // 重写 toDataURL 方法
        element.toDataURL = function() {
          // 获取原始数据 URL
          const dataURL = originalToDataURL.apply(this, arguments);
          
          // 如果是空白 Canvas，直接返回
          if (this.width === 0 || this.height === 0) {
            return dataURL;
          }
          
          // 创建一个临时 Canvas 并添加微小的噪声
          const tempCanvas = originalCreateElement.call(document, 'canvas');
          tempCanvas.width = this.width;
          tempCanvas.height = this.height;
          
          const ctx = originalGetContext.call(tempCanvas, '2d');
          const img = new Image();
          
          // 同步方式处理
          const sync = function() {
            img.src = dataURL;
            ctx.drawImage(img, 0, 0);
            const imageData = originalGetImageData.call(ctx, 0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            
            // 添加微小的噪声
            for (let i = 0; i < data.length; i += 4) {
              // 只修改一小部分像素
              if (Math.random() < 0.1) {
                data[i] = Math.max(0, Math.min(255, data[i] + Math.floor(Math.random() * 2) - 1));
                data[i+1] = Math.max(0, Math.min(255, data[i+1] + Math.floor(Math.random() * 2) - 1));
                data[i+2] = Math.max(0, Math.min(255, data[i+2] + Math.floor(Math.random() * 2) - 1));
              }
            }
            
            ctx.putImageData(imageData, 0, 0);
            return originalToDataURL.call(tempCanvas, arguments[0], arguments[1]);
          };
          
          try {
            return sync();
          } catch (e) {
            // 如果同步方式失败，返回原始数据
            return dataURL;
          }
        };
      }
      
      return element;
   };
   console.log('[指纹防护] Canvas 防护已启用');
  }
  
  // WebGL 防护功能
  if (config.hardwareInfoProtection) {
    // 修改 getContext 方法，对 WebGL 上下文进行防护
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
      // 首先获取原始上下文
      const context = originalGetContext.apply(this, [contextType, ...args]);
      
      // 如果不是 WebGL 上下文或获取失败，直接返回
      if (!context) return context;
      
      // 如果是 WebGL 相关的上下文，进行防护
      if (contextType === 'webgl' || contextType === 'experimental-webgl' || contextType === 'webgl2') {
        debugLog('[指纹防护] 检测到 WebGL 上下文创建，应用防护');
        
        // 重写 getParameter 方法
        const originalGetParameter = context.getParameter;
        context.getParameter = function(parameter) {
          // WebGL 渲染器信息
          if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
            return fakeDeviceProfile.gpu.vendor;
          }
          if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
            return fakeDeviceProfile.gpu.renderer;
          }
          
          // 其他 WebGL 参数
          if (parameter === 7936) { // VENDOR
            return 'WebKit';
          }
          if (parameter === 7937) { // RENDERER
            return 'WebKit WebGL';
          }
          if (parameter === 35724) { // SHADING_LANGUAGE_VERSION
            return 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)';
          }
          if (parameter === 3379) { // MAX_TEXTURE_SIZE
            return 16384;
          }
          if (parameter === 3386) { // MAX_VIEWPORT_DIMS
            return [16384, 16384];
          }
          
          return originalGetParameter.apply(this, arguments);
        };
        
        // 重写 getExtension 方法
        const originalGetExtension = context.getExtension;
        context.getExtension = function(name) {
          if (name === 'WEBGL_debug_renderer_info') {
            // 返回一个修改过的扩展对象
            return {
              UNMASKED_VENDOR_WEBGL: 37445,
              UNMASKED_RENDERER_WEBGL: 37446
            };
          }
          
          return originalGetExtension.apply(this, arguments);
        };
        
        // 重写 getSupportedExtensions 方法
        const originalGetSupportedExtensions = context.getSupportedExtensions;
        context.getSupportedExtensions = function() {
          const extensions = originalGetSupportedExtensions.apply(this, arguments);
          
          // 过滤掉可能泄露硬件信息的扩展
          const filtered = extensions.filter(ext => {
            return !ext.includes('debug') && 
                  !ext.includes('WEBGL_debug_renderer_info') && 
                  !ext.includes('WEBGL_debug_shaders');
          });
          
          return filtered;
        };
        
        // 重写 readPixels 方法
        const originalReadPixels = context.readPixels;
        context.readPixels = function() {
          const result = originalReadPixels.apply(this, arguments);
          
          // 如果是 TypedArray，添加微小的噪声
          if (arguments[6] && arguments[6].constructor.name.includes('Array')) {
            const data = arguments[6];
            for (let i = 0; i < data.length; i += 4) {
              if (Math.random() < 0.05) { // 只修改 5% 的像素
                data[i] = Math.max(0, Math.min(255, data[i] + (Math.random() * 2 - 1)));
                if (i + 1 < data.length) data[i+1] = Math.max(0, Math.min(255, data[i+1] + (Math.random() * 2 - 1)));
                if (i + 2 < data.length) data[i+2] = Math.max(0, Math.min(255, data[i+2] + (Math.random() * 2 - 1)));
              }
            }
          }
          
          return result;
        };
      }
      
      return context;
    };
    
    debugLog('[指纹防护] WebGL 防护已启用');
  }
  
  // 修改 AudioContext 相关方法
  if (config.audioContextProtection && typeof AudioContext !== 'undefined') {
    const originalAudioContext = AudioContext;
    window.AudioContext = function() {
      const context = new originalAudioContext();
      
      // 修改 createOscillator 方法
      const originalCreateOscillator = context.createOscillator;
      context.createOscillator = function() {
        const oscillator = originalCreateOscillator.apply(this, arguments);
        const originalGetFrequency = oscillator.frequency.value;
        Object.defineProperty(oscillator.frequency, 'value', {
          get: function() {
            return originalGetFrequency + (Math.random() * 0.01 - 0.005);
          }
        });
        return oscillator;
      };
      
      // 修改 createAnalyser 方法
      const originalCreateAnalyser = context.createAnalyser;
      context.createAnalyser = function() {
        const analyser = originalCreateAnalyser.apply(this, arguments);
        const originalGetByteFrequencyData = analyser.getByteFrequencyData;
        analyser.getByteFrequencyData = function(array) {
          originalGetByteFrequencyData.apply(this, arguments);
          // 添加微小的噪声
          for (let i = 0; i < array.length; i++) {
            if (Math.random() < 0.1) {
              array[i] = Math.max(0, Math.min(255, array[i] + Math.floor(Math.random() * 2) - 1));
            }
          }
          return array;
        };
        return analyser;
      };
      
      return context;
    };
    console.log('[指纹防护] 音频指纹防护已启用');
  }
  
  // 修改 WebRTC 相关方法
  if (config.webrtcProtection && window.RTCPeerConnection) {
    const originalRTCPeerConnection = window.RTCPeerConnection;
    window.RTCPeerConnection = function() {
      const pc = new originalRTCPeerConnection(...arguments);
      
      // 重写 createOffer 方法
      const originalCreateOffer = pc.createOffer;
      pc.createOffer = function() {
        const offerConstraints = arguments[0] || {};
        offerConstraints.offerToReceiveAudio = true;
        offerConstraints.offerToReceiveVideo = false;
        
        return originalCreateOffer.apply(this, [offerConstraints]);
      };
      
      // 重写 setLocalDescription 方法
      const originalSetLocalDescription = pc.setLocalDescription;
      pc.setLocalDescription = function() {
        const desc = arguments[0];
        if (desc && desc.sdp) {
          // 修改 SDP 以防止 IP 泄露
          desc.sdp = desc.sdp.replace(/UDP\/TLS\/RTP\/SAVPF/g, 'TCP/TLS/RTP/SAVPF');
          desc.sdp = desc.sdp.replace(/127\.0\.0\.1/g, '0.0.0.0');
          desc.sdp = desc.sdp.replace(/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/g, '0.0.0.0');
        }
        return originalSetLocalDescription.apply(this, arguments);
      };
      
      return pc;
    };
    console.log('[指纹防护] WebRTC 防护已启用');
  }
  
  // 修改 Navigator 对象
  if (config.hardwareInfoProtection) {
    const originalNavigator = navigator;
    Object.defineProperty(window, 'navigator', {
      get: function() {
        // 创建一个代理对象
        const navigatorProxy = {};
        
        // 复制所有原始属性
        for (const key in originalNavigator) {
          if (typeof originalNavigator[key] === 'function') {
            navigatorProxy[key] = originalNavigator[key].bind(originalNavigator);
          } else {
            Object.defineProperty(navigatorProxy, key, {
              get: function() {
                // 使用伪造设备配置修改特定属性
                if (key === 'hardwareConcurrency') {
                  return fakeDeviceProfile.hardwareConcurrency;
                }
                if (key === 'deviceMemory') {
                  return fakeDeviceProfile.deviceMemory;
                }
                if (key === 'platform') {
                  return fakeDeviceProfile.platform;
                }
                if (key === 'userAgent') {
                  return fakeDeviceProfile.userAgent;
                }
                if (key === 'plugins' && config.pluginDataProtection) {
                  // 返回空的插件列表
                  return {
                    length: 0,
                    item: function() { return null; },
                    namedItem: function() { return null; },
                    refresh: function() {}
                  };
                }
                if (key === 'languages') {
                  return fakeDeviceProfile.language;
                }
                
                return originalNavigator[key];
              }
            });
          }
        }
        
        return navigatorProxy;
      }
    });
    debugLog('[指纹防护] 硬件信息防护已启用');
  }
  
  // 修改 Screen 对象
  if (config.hardwareInfoProtection) {
    const originalScreen = screen;
    Object.defineProperty(window, 'screen', {
      get: function() {
        const screenProxy = {};
        
        for (const key in originalScreen) {
          if (typeof originalScreen[key] === 'function') {
            screenProxy[key] = originalScreen[key].bind(originalScreen);
          } else {
            Object.defineProperty(screenProxy, key, {
              get: function() {
                // 使用伪造设备配置修改屏幕属性
                if (key === 'colorDepth' || key === 'pixelDepth') {
                  return fakeDeviceProfile.screen.colorDepth;
                }
                
                // 使用伪造设备的屏幕尺寸，但如果配置中指定了尺寸，则优先使用配置的值
                if (key === 'width') {
                  return config.screenWidth ? parseInt(config.screenWidth) : fakeDeviceProfile.screen.width;
                }
                if (key === 'height') {
                  return config.screenHeight ? parseInt(config.screenHeight) : fakeDeviceProfile.screen.height;
                }
                
                // 修改其他屏幕属性
                if (key === 'availWidth') {
                  return config.screenWidth ? parseInt(config.screenWidth) : fakeDeviceProfile.screen.width;
                }
                if (key === 'availHeight') {
                  return config.screenHeight ? parseInt(config.screenHeight) : fakeDeviceProfile.screen.height;
                }
                
                return originalScreen[key];
              }
            });
          }
        }
        
        return screenProxy;
      }
    });
    debugLog('[指纹防护] 屏幕信息防护已启用');
  }
  
  // 修改 Date 对象以防止时区检测
  if (config.timezoneProtection) {
    const originalDate = Date;
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() {
      return fakeDeviceProfile.timezoneOffset; // 使用伪造设备的时区偏移
    };
    debugLog('[指纹防护] 时区防护已启用');
  }
  
  // 防止 font 指纹识别
  if (config.fontProtection && window.FontFace) {
    const originalFontFace = window.FontFace;
    window.FontFace = function(family, source, descriptors) {
      // 添加随机延迟
      const delay = Math.floor(Math.random() * 10);
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(new originalFontFace(family, source, descriptors));
        }, delay);
      });
    };
    console.log('[指纹防护] 字体防护已启用');
  }
  
  // 防止 DOMRect 指纹识别
  if (config.rectsProtection) {
    Element.prototype.getBoundingClientRect = function() {
      const rect = originalGetBoundingClientRect.apply(this, arguments);
      
      // 创建一个新的 DOMRect 对象
      const newRect = {};
      for (const key in rect) {
        if (typeof rect[key] === 'number') {
          // 为数值属性添加微小的噪声
          Object.defineProperty(newRect, key, {
            get: function() {
              return rect[key] + (Math.random() * 0.02 - 0.01);
            }
          });
        } else {
          newRect[key] = rect[key];
        }
      }
      
      return newRect;
    };
    
    // 防止 getClientRects 指纹识别
    Element.prototype.getClientRects = function() {
      const rects = originalGetClientRects.apply(this, arguments);
      
      // 创建一个新的 DOMRectList 对象
      const newRects = {};
      Object.defineProperty(newRects, 'length', { value: rects.length });
      
      // 为每个 DOMRect 添加微小的噪声
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const newRect = {};
        
        for (const key in rect) {
          if (typeof rect[key] === 'number') {
            // 为数值属性添加微小的噪声
            Object.defineProperty(newRect, key, {
              get: function() {
                return rect[key] + (Math.random() * 0.02 - 0.01);
              }
            });
          } else {
            newRect[key] = rect[key];
          }
        }
        
        Object.defineProperty(newRects, i, { value: newRect });
      }
      
      // 添加 item 方法
      newRects.item = function(index) {
        return this[index];
      };
      
      return newRects;
    };
    
    console.log('[指纹防护] RECTS 矩形防护已启用');
  }
  
  
  
  console.log('[指纹防护] Brave 风格防护已启用');
})();
