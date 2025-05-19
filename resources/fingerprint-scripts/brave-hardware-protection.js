/**
 * Brave 风格的硬件信息指纹防护
 * 基于 Brave 浏览器的硬件信息防护技术
 */

(function() {
  // 创建一个确定性但唯一的指纹噪声
  // 使用基于域名的种子
  function getFingerprinterSeed() {
    const domain = window.location.hostname || 'unknown';
    let seed = 0;
    for (let i = 0; i < domain.length; i++) {
      seed = ((seed << 5) - seed) + domain.charCodeAt(i);
      seed = seed & seed; // 转换为32位整数
    }
    return Math.abs(seed);
  }
  
  // 生成确定性随机数
  function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }
  
  // 获取种子
  const seed = getFingerprinterSeed();
  
  // 常见的硬件并发数
  const commonHardwareConcurrency = [2, 4, 6, 8, 12, 16];
  
  // 常见的设备内存
  const commonDeviceMemory = [2, 4, 8, 16];
  
  // 常见的屏幕分辨率
  const commonResolutions = [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 2560, height: 1440 },
    { width: 1280, height: 720 }
  ];
  
  // 常见的颜色深度
  const commonColorDepth = [24, 30, 48];
  
  // 常见的像素比
  const commonPixelRatio = [1, 1.25, 1.5, 2, 2.5, 3];
  
  // 选择一个确定性的随机值
  function getRandomValue(array, seed) {
    return array[Math.floor(seededRandom(seed) * array.length)];
  }
  
  // 拦截 navigator.hardwareConcurrency
  if (navigator.hardwareConcurrency !== undefined) {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: function() {
        return getRandomValue(commonHardwareConcurrency, seed);
      }
    });
  }
  
  // 拦截 navigator.deviceMemory
  if (navigator.deviceMemory !== undefined) {
    Object.defineProperty(navigator, 'deviceMemory', {
      get: function() {
        return getRandomValue(commonDeviceMemory, seed + 1);
      }
    });
  }
  
  // 拦截 navigator.platform
  const originalPlatform = navigator.platform;
  Object.defineProperty(navigator, 'platform', {
    get: function() {
      // 50% 的概率返回原始平台，50% 的概率返回通用平台
      if (seededRandom(seed + 2) < 0.5) {
        return originalPlatform;
      }
      
      // 根据原始平台选择一个合理的替代平台
      if (originalPlatform.includes('Win')) {
        return 'Win32';
      } else if (originalPlatform.includes('Mac')) {
        return 'MacIntel';
      } else if (originalPlatform.includes('Linux')) {
        return 'Linux x86_64';
      } else {
        return 'Win32'; // 默认值
      }
    }
  });
  
  // 拦截 navigator.userAgent
  const originalUserAgent = navigator.userAgent;
  Object.defineProperty(navigator, 'userAgent', {
    get: function() {
      // 保持原始 User Agent，但可以考虑修改硬件相关部分
      return originalUserAgent;
    }
  });
  
  // 拦截 screen 属性
  const randomResolution = getRandomValue(commonResolutions, seed + 3);
  const randomColorDepth = getRandomValue(commonColorDepth, seed + 4);
  const randomPixelRatio = getRandomValue(commonPixelRatio, seed + 5);
  
  // 保存原始屏幕属性
  const originalWidth = screen.width;
  const originalHeight = screen.height;
  const originalColorDepth = screen.colorDepth;
  const originalPixelDepth = screen.pixelDepth;
  const originalAvailWidth = screen.availWidth;
  const originalAvailHeight = screen.availHeight;
  
  // 拦截 screen.width
  Object.defineProperty(screen, 'width', {
    get: function() {
      // 如果原始宽度是标准分辨率，保持不变
      if (commonResolutions.some(res => res.width === originalWidth)) {
        return originalWidth;
      }
      return randomResolution.width;
    }
  });
  
  // 拦截 screen.height
  Object.defineProperty(screen, 'height', {
    get: function() {
      // 如果原始高度是标准分辨率，保持不变
      if (commonResolutions.some(res => res.height === originalHeight)) {
        return originalHeight;
      }
      return randomResolution.height;
    }
  });
  
  // 拦截 screen.colorDepth
  Object.defineProperty(screen, 'colorDepth', {
    get: function() {
      return randomColorDepth;
    }
  });
  
  // 拦截 screen.pixelDepth
  Object.defineProperty(screen, 'pixelDepth', {
    get: function() {
      return randomColorDepth; // 通常与 colorDepth 相同
    }
  });
  
  // 拦截 screen.availWidth
  Object.defineProperty(screen, 'availWidth', {
    get: function() {
      // 保持与 width 的比例关系
      const ratio = originalAvailWidth / originalWidth;
      return Math.floor(screen.width * ratio);
    }
  });
  
  // 拦截 screen.availHeight
  Object.defineProperty(screen, 'availHeight', {
    get: function() {
      // 保持与 height 的比例关系
      const ratio = originalAvailHeight / originalHeight;
      return Math.floor(screen.height * ratio);
    }
  });
  
  // 拦截 window.devicePixelRatio
  Object.defineProperty(window, 'devicePixelRatio', {
    get: function() {
      return randomPixelRatio;
    }
  });
  
  // 拦截 navigator.maxTouchPoints
  if (navigator.maxTouchPoints !== undefined) {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: function() {
        // 根据设备类型返回合理的值
        if (navigator.userAgent.includes('Mobile') || navigator.userAgent.includes('Android') || navigator.userAgent.includes('iPhone')) {
          return 5; // 移动设备通常有 5 个触摸点
        } else if (navigator.userAgent.includes('iPad') || navigator.userAgent.includes('Tablet')) {
          return 10; // 平板通常有 10 个触摸点
        } else {
          return 0; // 桌面设备通常没有触摸点
        }
      }
    });
  }
  
  // 拦截 navigator.getBattery()
  if (navigator.getBattery) {
    const originalGetBattery = navigator.getBattery;
    navigator.getBattery = function() {
      return originalGetBattery.call(navigator)
        .then(function(battery) {
          // 创建一个代理对象
          const batteryProxy = {};
          
          // 拦截 level 属性
          Object.defineProperty(batteryProxy, 'level', {
            get: function() {
              // 返回一个随机的电池电量
              return 0.7 + seededRandom(seed + 6) * 0.3; // 70% - 100%
            }
          });
          
          // 拦截 charging 属性
          Object.defineProperty(batteryProxy, 'charging', {
            get: function() {
              // 大多数情况下返回 true
              return seededRandom(seed + 7) < 0.8;
            }
          });
          
          // 拦截 chargingTime 属性
          Object.defineProperty(batteryProxy, 'chargingTime', {
            get: function() {
              // 如果正在充电，返回一个随机的充电时间
              if (batteryProxy.charging) {
                return Math.floor(seededRandom(seed + 8) * 3600); // 0 - 1小时
              }
              return Infinity;
            }
          });
          
          // 拦截 dischargingTime 属性
          Object.defineProperty(batteryProxy, 'dischargingTime', {
            get: function() {
              // 如果没有充电，返回一个随机的放电时间
              if (!batteryProxy.charging) {
                return Math.floor(7200 + seededRandom(seed + 9) * 10800); // 2 - 5小时
              }
              return Infinity;
            }
          });
          
          // 拦截事件监听器
          ['onchargingchange', 'onchargingtimechange', 'ondischargingtimechange', 'onlevelchange'].forEach(function(eventName) {
            Object.defineProperty(batteryProxy, eventName, {
              get: function() {
                return battery[eventName];
              },
              set: function(callback) {
                battery[eventName] = callback;
              }
            });
          });
          
          // 拦截 addEventListener 方法
          batteryProxy.addEventListener = function(type, listener, options) {
            return battery.addEventListener(type, listener, options);
          };
          
          // 拦截 removeEventListener 方法
          batteryProxy.removeEventListener = function(type, listener, options) {
            return battery.removeEventListener(type, listener, options);
          };
          
          return batteryProxy;
        });
    };
  }
  
  // 拦截 navigator.connection
  if (navigator.connection) {
    // 常见的连接类型
    const connectionTypes = ['wifi', 'cellular', 'ethernet', 'unknown'];
    
    // 常见的有效带宽
    const effectiveBandwidths = [0.5, 1, 5, 10, 20, 50, 100];
    
    // 拦截 type 属性
    Object.defineProperty(navigator.connection, 'type', {
      get: function() {
        return getRandomValue(connectionTypes, seed + 10);
      }
    });
    
    // 拦截 effectiveType 属性
    if ('effectiveType' in navigator.connection) {
      const effectiveTypes = ['slow-2g', '2g', '3g', '4g'];
      Object.defineProperty(navigator.connection, 'effectiveType', {
        get: function() {
          return getRandomValue(effectiveTypes, seed + 11);
        }
      });
    }
    
    // 拦截 downlink 属性
    if ('downlink' in navigator.connection) {
      Object.defineProperty(navigator.connection, 'downlink', {
        get: function() {
          return getRandomValue(effectiveBandwidths, seed + 12);
        }
      });
    }
    
    // 拦截 rtt 属性
    if ('rtt' in navigator.connection) {
      Object.defineProperty(navigator.connection, 'rtt', {
        get: function() {
          // 返回一个随机的 RTT 值 (50ms - 500ms)
          return Math.floor(50 + seededRandom(seed + 13) * 450);
        }
      });
    }
  }
  
  console.log('Brave 风格的硬件信息指纹防护已启用');
})();
