/**
 * 指纹防护扩展 - 内容脚本
 * 负责修改浏览器 JavaScript API，防止通过 JavaScript 识别浏览器指纹
 */

// 默认配置
let config = {
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  languages: navigator.languages,
  screenWidth: window.screen.width,
  screenHeight: window.screen.height,
  colorDepth: window.screen.colorDepth,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  webglVendor: null,
  webglRenderer: null,
  canvasNoise: true,
  webrtcEnabled: false
};

// 接收来自背景脚本的配置更新
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'configUpdated') {
    config = { ...config, ...message.config };
    applyConfig();
    sendResponse({ success: true });
  }
});

// 请求初始配置
chrome.runtime.sendMessage({ type: 'getConfig' }, (response) => {
  if (response) {
    config = { ...config, ...response };
    applyConfig();
  }
});

// 应用配置，修改浏览器 API
function applyConfig() {
  // 修改 Navigator 属性
  modifyNavigator();
  
  // 修改 Screen 属性
  modifyScreen();
  
  // 修改 Canvas 指纹
  if (config.canvasNoise) {
    modifyCanvas();
  }
  
  // 修改 WebGL 指纹
  modifyWebGL();
  
  // 修改 WebRTC
  if (!config.webrtcEnabled) {
    blockWebRTC();
  }
  
  // 修改时区
  modifyTimezone();
  
  // 防止字体指纹识别
  blockFontFingerprinting();
  
  // 防止音频指纹识别
  blockAudioFingerprinting();
}

// 修改 Navigator 对象
function modifyNavigator() {
  const navigatorProps = {
    userAgent: config.userAgent,
    appVersion: config.userAgent.replace('Mozilla/', ''),
    platform: config.platform,
    language: config.language,
    languages: [config.language],
    doNotTrack: '1',
    hardwareConcurrency: Math.min(Math.max(2, navigator.hardwareConcurrency), 8),
    deviceMemory: Math.min(navigator.deviceMemory || 4, 8),
    maxTouchPoints: 0
  };
  
  // 创建 Navigator 代理
  const navigatorProxy = new Proxy(navigator, {
    get: function(target, key) {
      // 如果是我们要修改的属性，返回修改后的值
      if (navigatorProps.hasOwnProperty(key)) {
        return navigatorProps[key];
      }
      
      // 否则返回原始值
      const value = target[key];
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
  
  // 替换 window.navigator
  try {
    Object.defineProperty(window, 'navigator', {
      value: navigatorProxy,
      configurable: false,
      writable: false
    });
  } catch (e) {
    console.error('Failed to modify navigator:', e);
  }
}

// 修改 Screen 对象
function modifyScreen() {
  const screenProps = {
    width: config.screenWidth,
    height: config.screenHeight,
    availWidth: config.screenWidth,
    availHeight: config.screenHeight,
    colorDepth: config.colorDepth,
    pixelDepth: config.colorDepth
  };
  
  // 修改 Screen 属性
  for (const [key, value] of Object.entries(screenProps)) {
    try {
      Object.defineProperty(window.screen, key, {
        value: value,
        configurable: false,
        writable: false
      });
    } catch (e) {
      console.error(`Failed to modify screen.${key}:`, e);
    }
  }
}

// 修改 Canvas 指纹
function modifyCanvas() {
  // 保存原始方法
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  
  // 简单的伪随机数生成器
  function pseudoRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  
  // 修改 Canvas.toDataURL 方法
  HTMLCanvasElement.prototype.toDataURL = function() {
    // 如果是空白 Canvas 或者尺寸很小，不修改
    if (this.width <= 1 || this.height <= 1) {
      return originalToDataURL.apply(this, arguments);
    }
    
    // 获取 Canvas 上下文
    const context = this.getContext('2d');
    if (!context) {
      return originalToDataURL.apply(this, arguments);
    }
    
    // 获取图像数据
    const imageData = context.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    
    // 使用更复杂的噪点算法
    // 为每个 Canvas 生成唯一的种子，但对同一个 Canvas 保持一致
    const canvasId = this.width.toString() + this.height.toString() + data.length.toString();
    const seed = parseInt(canvasId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
    const rng = pseudoRandom(seed);
    
    // 添加微小噪点，但使用确定性随机数生成器
    for (let i = 0; i < data.length; i += 4) {
      // 只修改非透明像素
      if (data[i + 3] > 0) {
        // 添加随机噪点，但保持一致性
        const noise = Math.floor(rng() * 3) - 1; // -1, 0, or 1
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
    }
    
    // 将修改后的图像数据放回 Canvas
    context.putImageData(imageData, 0, 0);
    
    // 调用原始方法
    return originalToDataURL.apply(this, arguments);
  };
  
  // 修改 CanvasRenderingContext2D.getImageData 方法
  CanvasRenderingContext2D.prototype.getImageData = function() {
    // 调用原始方法
    const imageData = originalGetImageData.apply(this, arguments);
    
    // 如果是很小的区域，不修改
    if (imageData.width <= 1 || imageData.height <= 1) {
      return imageData;
    }
    
    const data = imageData.data;
    
    // 使用与 toDataURL 相同的算法来保持一致性
    const canvasId = imageData.width.toString() + imageData.height.toString() + data.length.toString();
    const seed = parseInt(canvasId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
    const rng = pseudoRandom(seed);
    
    // 添加微小噪点，但使用确定性随机数生成器
    for (let i = 0; i < data.length; i += 4) {
      // 只修改非透明像素
      if (data[i + 3] > 0) {
        // 添加随机噪点，但保持一致性
        const noise = Math.floor(rng() * 3) - 1; // -1, 0, or 1
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }
    }
    
    return imageData;
  };
  
  // 修改 CanvasRenderingContext2D.measureText 方法
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function(text) {
    const result = originalMeasureText.apply(this, arguments);
    
    // 添加微小的随机偏移来防止基于文本测量的指纹
    const textSeed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rng = pseudoRandom(textSeed);
    
    // 修改文本测量结果
    const originalWidth = result.width;
    Object.defineProperty(result, 'width', {
      get: function() {
        return originalWidth + (rng() - 0.5) * 0.1;
      }
    });
    
    return result;
  };
}

// 修改 WebGL 指纹
function modifyWebGL() {
  // 保存原始方法
  const getParameterProxied = WebGLRenderingContext.prototype.getParameter;
  
  // 修改 WebGL.getParameter 方法
  WebGLRenderingContext.prototype.getParameter = function(parameter) {
    // UNMASKED_VENDOR_WEBGL
    if (parameter === 37445 && config.webglVendor) {
      return config.webglVendor;
    }
    
    // UNMASKED_RENDERER_WEBGL
    if (parameter === 37446 && config.webglRenderer) {
      return config.webglRenderer;
    }
    
    // 调用原始方法
    return getParameterProxied.call(this, parameter);
  };
  
  // 对 WebGL2 也进行相同的修改
  if (window.WebGL2RenderingContext) {
    WebGL2RenderingContext.prototype.getParameter = WebGLRenderingContext.prototype.getParameter;
  }
}

// 阻止 WebRTC 泄露真实 IP
function blockWebRTC() {
  // 替换 RTCPeerConnection
  if (window.RTCPeerConnection) {
    const originalRTC = window.RTCPeerConnection;
    
    window.RTCPeerConnection = function() {
      const pc = new originalRTC(...arguments);
      
      // 拦截 onicecandidate 事件
      const originalAddEventListener = pc.addEventListener;
      pc.addEventListener = function(type, listener, options) {
        if (type === 'icecandidate') {
          const wrappedListener = function(e) {
            if (e.candidate) {
              // 创建一个新的事件，但移除 IP 地址信息
              const newEvent = new Event('icecandidate');
              newEvent.candidate = null;
              listener(newEvent);
              return;
            }
            listener(e);
          };
          return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      // 拦截 onicecandidate 事件
      let originalOnIceCandidate = pc.onicecandidate;
      Object.defineProperty(pc, 'onicecandidate', {
        get: function() {
          return originalOnIceCandidate;
        },
        set: function(cb) {
          originalOnIceCandidate = function(e) {
            if (e.candidate) {
              // 阻止泄露本地 IP 地址
              return;
            }
            if (cb) cb(e);
          };
        }
      });
      
      // 拦截可能泄露 IP 的方法
      const rtcMethods = [
        'createOffer',
        'createAnswer',
        'setLocalDescription',
        'setRemoteDescription'
      ];
      rtcMethods.forEach(method => {
        const original = pc[method];
        pc[method] = function() {
          const promise = original.apply(pc, arguments);
          return promise.catch(e => {
            console.warn(`WebRTC ${method} blocked by fingerprint defender`);
            return Promise.reject(e);
          });
        };
      });
      
      return pc;
    };
    
    // 复制原型和静态属性
    window.RTCPeerConnection.prototype = originalRTC.prototype;
    Object.setPrototypeOf(window.RTCPeerConnection, originalRTC);
  }
  
  // 禁用 WebRTC 相关的媒体枚举
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
    navigator.mediaDevices.enumerateDevices = async function() {
      // 返回空数组或者通用设备信息
      return [];
    };
  }
  
  // 修改 Intl.DateTimeFormat
  const originalDateTimeFormat = Intl.DateTimeFormat;
  
  Intl.DateTimeFormat = function() {
    const options = arguments[1] || {};
    if (!options.timeZone) {
      if (arguments[1]) {
        arguments[1].timeZone = config.timezone;
      } else {
        arguments[1] = { timeZone: config.timezone };
      }
    }
    return originalDateTimeFormat.apply(this, arguments);
  };
  
  // 复制原型和静态属性
  Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
  Object.setPrototypeOf(Intl.DateTimeFormat, originalDateTimeFormat);
  
  // 修改 Date 对象的时区相关方法
  const originalDate = Date;
  const timezoneOffset = getTimezoneOffset(config.timezone);
  
  // 获取指定时区的偏移量（分钟）
  function getTimezoneOffset(timezone) {
    try {
      // 使用当前时间计算偏移量
      const date = new Date();
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      return (utcDate - tzDate) / 60000; // 转换为分钟
    } catch (e) {
      return 0;
    }
  }
  
  // 修改 Date.prototype.getTimezoneOffset
  const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = function() {
    return timezoneOffset;
  };
}

// 防止字体指纹识别
function blockFontFingerprinting() {
  // 拦截 document.fonts.check 方法
  if (document.fonts && document.fonts.check) {
    const originalCheck = document.fonts.check;
    document.fonts.check = function() {
      // 对于不常见的字体，随机返回结果
      const fontName = arguments[1] || '';
      const commonFonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'sans-serif', 'serif', 'monospace',
                          '宋体', '黑体', '微软雅黑', '宋体', '楷体', '仿宋'];
      
      if (commonFonts.some(font => fontName.toLowerCase().includes(font.toLowerCase()))) {
        return originalCheck.apply(this, arguments);
      }
      
      // 对于不常见的字体，有 50% 的概率返回 true
      return Math.random() > 0.5;
    };
  }
  
  // 拦截 Element.getClientRects 和 getBoundingClientRect 方法
  const originalGetClientRects = Element.prototype.getClientRects;
  Element.prototype.getClientRects = function() {
    const rects = originalGetClientRects.apply(this, arguments);
    // 对于文本元素，添加微小的随机偏移
    if (this.tagName === 'SPAN' || this.tagName === 'DIV' || this.tagName === 'P') {
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const noise = (Math.random() - 0.5) * 0.2;
        rect.x += noise;
        rect.y += noise;
        rect.width += noise;
        rect.height += noise;
      }
    }
    return rects;
  };
  
  // 拦截 getBoundingClientRect 方法
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function() {
    const rect = originalGetBoundingClientRect.apply(this, arguments);
    // 对于文本元素，添加微小的随机偏移
    if (this.tagName === 'SPAN' || this.tagName === 'DIV' || this.tagName === 'P') {
      const noise = (Math.random() - 0.5) * 0.2;
      rect.x += noise;
      rect.y += noise;
      rect.width += noise;
      rect.height += noise;
    }
    return rect;
  };
}

// 防止音频指纹识别
function blockAudioFingerprinting() {
  if (window.AudioContext || window.webkitAudioContext) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    const originalAudioContext = AudioContextConstructor;
    
    const audioContextProxy = function() {
      const context = new originalAudioContext(...arguments);
      
      // 修改 createOscillator 方法
      const originalCreateOscillator = context.createOscillator;
      context.createOscillator = function() {
        const oscillator = originalCreateOscillator.apply(this, arguments);
        const originalGetFrequency = oscillator.frequency.value;
        Object.defineProperty(oscillator.frequency, 'value', {
          get: function() {
            return originalGetFrequency + (Math.random() - 0.5) * 0.1;
          }
        });
        return oscillator;
      };
      
      // 修改 createAnalyser 方法
      const originalCreateAnalyser = context.createAnalyser;
      context.createAnalyser = function() {
        const analyser = originalCreateAnalyser.apply(this, arguments);
        const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
        analyser.getFloatFrequencyData = function(array) {
          originalGetFloatFrequencyData.call(this, array);
          // 添加微小噪点
          for (let i = 0; i < array.length; i++) {
            array[i] += (Math.random() - 0.5) * 0.1;
          }
        };
        return analyser;
      };
      
      return context;
    };
    
    // 替换 AudioContext 构造函数
    window.AudioContext = audioContextProxy;
    if (window.webkitAudioContext) {
      window.webkitAudioContext = audioContextProxy;
    }
  }
}

// 立即应用配置
applyConfig();
