/**
 * 指纹防护预加载脚本
 * 在页面加载前注入，确保在最早期拦截指纹检测
 */

// 保存原始方法
const originalCreateElement = Document.prototype.createElement;
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
const originalGetExtension = WebGLRenderingContext.prototype.getExtension;

// 随机种子
let randomSeed = Math.floor(Math.random() * 10000000);

// 生成一致的随机数
function seededRandom() {
  randomSeed = (randomSeed * 9301 + 49297) % 233280;
  return randomSeed / 233280;
}

// 添加微小的噪声到 Canvas 数据
function addNoise(data) {
  for (let i = 0; i < data.length; i += 4) {
    // 只修改一些像素，保持大部分内容不变
    if (seededRandom() < 0.1) {
      // 添加微小的噪声
      data[i] = Math.max(0, Math.min(255, data[i] + Math.floor(seededRandom() * 2) - 1));
      data[i+1] = Math.max(0, Math.min(255, data[i+1] + Math.floor(seededRandom() * 2) - 1));
      data[i+2] = Math.max(0, Math.min(255, data[i+2] + Math.floor(seededRandom() * 2) - 1));
    }
  }
  return data;
}

// 修改 Canvas 相关方法
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
          imageData.data = addNoise(imageData.data);
          return imageData;
        };
        
        // 重写 measureText 方法
        context.measureText = function(text) {
          const metrics = originalMeasureText.apply(this, arguments);
          // 添加微小的随机变化
          const originalWidth = metrics.width;
          Object.defineProperty(metrics, 'width', {
            get: function() {
              return originalWidth + (seededRandom() * 0.02 - 0.01);
            }
          });
          return metrics;
        };
      } else if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        // 重写 getParameter 方法
        context.getParameter = function(parameter) {
          // 修改 WEBGL_debug_renderer_info 相关参数
          if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
            return 'Google Inc. (Intel)';
          }
          if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
            return 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)';
          }
          return originalGetParameter.apply(this, arguments);
        };
        
        // 重写 getExtension 方法
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
        addNoise(data);
        
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

// 修改 AudioContext 相关方法
if (typeof AudioContext !== 'undefined') {
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
          return originalGetFrequency + (seededRandom() * 0.01 - 0.005);
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
          if (seededRandom() < 0.1) {
            array[i] = Math.max(0, Math.min(255, array[i] + Math.floor(seededRandom() * 2) - 1));
          }
        }
        return array;
      };
      return analyser;
    };
    
    return context;
  };
}

// 修改 WebRTC 相关方法
if (typeof RTCPeerConnection !== 'undefined') {
  const originalRTCPeerConnection = RTCPeerConnection;
  window.RTCPeerConnection = function() {
    // 如果没有提供 iceServers，使用一个空数组
    if (!arguments[0]) {
      arguments[0] = { iceServers: [] };
    } else if (!arguments[0].iceServers) {
      arguments[0].iceServers = [];
    }
    
    // 创建 RTCPeerConnection 实例
    const pc = new originalRTCPeerConnection(...arguments);
    
    // 修改 createOffer 方法
    const originalCreateOffer = pc.createOffer;
    pc.createOffer = function() {
      const offerPromise = originalCreateOffer.apply(this, arguments);
      return offerPromise.then(function(offer) {
        // 修改 SDP 以隐藏本地 IP
        offer.sdp = offer.sdp.replace(/(\r\n|\n)a=candidate:.*?(\r\n|\n)/g, '$1a=candidate:1 1 udp 2113937151 192.168.1.1 58238 typ host$2');
        return offer;
      });
    };
    
    return pc;
  };
}

// 修改 Navigator 对象
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
            // 修改特定属性
            if (key === 'hardwareConcurrency') {
              return 4; // 固定为 4 核
            }
            if (key === 'deviceMemory') {
              return 8; // 固定为 8 GB
            }
            if (key === 'platform') {
              return 'Win32'; // 固定为 Windows
            }
            if (key === 'plugins') {
              // 返回空的插件列表
              return {
                length: 0,
                item: function() { return null; },
                namedItem: function() { return null; },
                refresh: function() {}
              };
            }
            if (key === 'languages') {
              return ['en-US', 'en'];
            }
            
            return originalNavigator[key];
          }
        });
      }
    }
    
    return navigatorProxy;
  }
});

// 修改 Screen 对象
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
            // 保持屏幕尺寸不变，但修改其他属性
            if (key === 'colorDepth' || key === 'pixelDepth') {
              return 24; // 固定为 24 位色深
            }
            
            return originalScreen[key];
          }
        });
      }
    }
    
    return screenProxy;
  }
});

// 修改 Date 对象以防止时区检测
const originalDate = Date;
const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
Date.prototype.getTimezoneOffset = function() {
  return -480; // 固定为 UTC+8 (北京时间)
};

// 防止 font 指纹识别
const originalFontFace = window.FontFace;
if (originalFontFace) {
  window.FontFace = function(family, source, descriptors) {
    // 添加随机延迟
    const delay = Math.floor(seededRandom() * 10);
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(new originalFontFace(family, source, descriptors));
      }, delay);
    });
  };
}

// 防止 DOMRect 指纹识别
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function() {
  const rect = originalGetBoundingClientRect.apply(this, arguments);
  
  // 创建一个新的 DOMRect 对象
  const newRect = {};
  for (const key in rect) {
    if (typeof rect[key] === 'number') {
      // 为数值属性添加微小的噪声
      Object.defineProperty(newRect, key, {
        get: function() {
          return rect[key] + (seededRandom() * 0.02 - 0.01);
        }
      });
    } else {
      newRect[key] = rect[key];
    }
  }
  
  return newRect;
};

console.log('[指纹防护] 预加载脚本已注入，Brave 风格防护已启用');
