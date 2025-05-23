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
   * @param {boolean} forceUpdate 是否强制更新脚本文件
   * @param {Object} config 指纹配置对象
   */
  ensureScriptsDirExists(forceUpdate = false, config = null) {
    const fs = require('fs');
    
    if (!fs.existsSync(this.fingerprintScriptsDir)) {
      fs.mkdirSync(this.fingerprintScriptsDir, { recursive: true });
      this.createDefaultScripts(config);
    } else if (forceUpdate) {
      this.createDefaultScripts(config);
    }
  }
  
  /**
   * 更新指纹脚本文件
   * 当设置变化时调用此方法强制更新脚本
   * @param {Object} config 指纹配置对象
   */
  updateFingerprintScripts(config = null) {
    console.log('开始更新指纹脚本文件...');
    
    // 如果没有提供配置，尝试获取当前激活的配置
    let currentConfig = config;
    if (!currentConfig) {
      try {
        // 尝试从配置文件或设置服务中获取当前指纹设置
        const settingsService = require('./settings-service');
        const settings = settingsService.getAllSettings();
        if (settings && settings.fingerprint) {
          currentConfig = settings.fingerprint;
          console.log('从设置服务获取到指纹配置');
        }
      } catch (error) {
        console.warn('获取当前指纹设置失败，使用默认值:', error);
      }
    }
    
    this.ensureScriptsDirExists(true, currentConfig); // 强制更新脚本并传递配置
    return true;
  }
  
  /**
   * 创建默认的指纹防检测脚本
   * @param {Object} config 可选的指纹配置对象
   */
  createDefaultScripts(config = {}) {
    // 获取配置或使用默认值
    const fingerprint = config || {};
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
      // 1. 重写 document.fonts.check，干扰字体检测
      if (document.fonts && document.fonts.check) {
        const originalCheck = document.fonts.check;
        document.fonts.check = function(font, text) {
          const allowedFonts = {{ALLOWED_FONTS}};
          for (const allowedFont of allowedFonts) {
            if (font.includes(allowedFont)) {
              // 对允许的字体正常返回
              return originalCheck.call(this, font, text);
            }
          }
          // 对不在允许列表的字体，随机返回true/false
          if ({{RANDOM_FONT_DETECTION}}) {
            return Math.random() > 0.5;
          }
          return false;
        };
      }

      // 2. 干扰 Canvas 字体测量（measureText）
      if (window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype.measureText) {
        const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = function(text) {
          const metrics = originalMeasureText.call(this, text);
          // 对宽度等属性加微小扰动
          if (metrics && typeof metrics.width === 'number') {
            const noise = (Math.random() - 0.5) * 0.1; // ±0.05 像素扰动
            metrics.width = metrics.width + noise;
          }
          return metrics;
        };
      }

      // 3. 干扰 HTMLElement.offsetWidth/offsetHeight 用于字体检测
      const elementProto = HTMLElement.prototype;
      ['offsetWidth', 'offsetHeight'].forEach(function(prop) {
        const original = Object.getOwnPropertyDescriptor(elementProto, prop);
        if (original && original.get) {
          Object.defineProperty(elementProto, prop, {
            get: function() {
              const value = original.get.apply(this);
              // 对字体检测相关元素加扰动
              if (this && this.style && this.style.fontFamily) {
                const noise = (Math.random() - 0.5) * 1; // ±0.5像素扰动
                return value + noise;
              }
              return value;
            },
            configurable: true
          });
        }
      });

      // 4. 干扰 getComputedStyle 的 font-family 返回值
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function(element, pseudoElt) {
        const style = originalGetComputedStyle.call(window, element, pseudoElt);
        const originalFontFamily = style.fontFamily;
        Object.defineProperty(style, 'fontFamily', {
          get: function() {
            // 只返回允许的字体
            return {{ALLOWED_FONTS}}.join(', ');
          },
          configurable: true
        });
        return style;
      };

      // 5. 干扰 window.navigator.fonts（如有）
      if (navigator.fonts) {
        Object.defineProperty(navigator, 'fonts', {
          get: function() {
            return {
              query: () => Promise.resolve({ families: (Array.isArray({{ALLOWED_FONTS}}) ? {{ALLOWED_FONTS}} : [{{ALLOWED_FONTS}}]) })
            };
          },
          configurable: true
        });
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
      
      // 传感器和设备方向API防护
      // 1. DeviceMotionEvent 防护
      if (window.DeviceMotionEvent) {
        // 拦截加速度计事件
        const originalAddEventListener = window.addEventListener;
        window.addEventListener = function(type, listener, options) {
          if (type === 'devicemotion') {
            // 拦截加速度计事件，返回伪造数据
            const fakeHandler = function(event) {
              // 创建一个伪造的事件
              const fakeEvent = new DeviceMotionEvent('devicemotion', {
                acceleration: {
                  x: Math.random() * 0.1,  // 轻微的随机值
                  y: Math.random() * 0.1,
                  z: Math.random() * 0.1
                },
                accelerationIncludingGravity: {
                  x: Math.random() * 0.1 - 9.8 * (Math.random() > 0.5 ? 1 : -1),  // 模拟重力
                  y: Math.random() * 0.1,
                  z: Math.random() * 0.1
                },
                rotationRate: {
                  alpha: Math.random() * 360,  // 0-360度
                  beta: Math.random() * 180 - 90,   // -90到90度
                  gamma: Math.random() * 180 - 90   // -90到90度
                },
                interval: 16  // 模拟60fps
              });
              listener(fakeEvent);
            };
            return originalAddEventListener.call(this, type, fakeHandler, options);
          }
          else if (type === 'deviceorientation') {
            // 拦截设备方向事件，返回伪造数据
            const fakeHandler = function(event) {
              // 创建一个伪造的事件
              const fakeEvent = new DeviceOrientationEvent('deviceorientation', {
                alpha: Math.random() * 360,  // 0-360度
                beta: Math.random() * 180 - 90,   // -90到90度
                gamma: Math.random() * 180 - 90,  // -90到90度
                absolute: true
              });
              listener(fakeEvent);
            };
            return originalAddEventListener.call(this, type, fakeHandler, options);
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
      }
      
      // 2. 拦截Sensor API
      if (window.Sensor) {
        // 拦截所有传感器API
        const sensors = [
          'Accelerometer', 
          'LinearAccelerationSensor', 
          'GravitySensor',
          'Gyroscope',
          'AbsoluteOrientationSensor',
          'RelativeOrientationSensor',
          'Magnetometer',
          'AmbientLightSensor'
        ];
        
        // 对每个传感器类型进行代理
        sensors.forEach(sensorType => {
          if (window[sensorType]) {
            const originalSensor = window[sensorType];
            window[sensorType] = function() {
              const sensor = new originalSensor(...arguments);
              
              // 拦截 start 方法
              const originalStart = sensor.start;
              sensor.start = function() {
                // 在调用原始方法后生成伪数据
                originalStart.call(this);
                
                // 创建伪造数据
                if (sensorType === 'Accelerometer' || sensorType === 'LinearAccelerationSensor' || sensorType === 'GravitySensor') {
                  Object.defineProperties(this, {
                    x: { value: Math.random() * 0.1, configurable: true },
                    y: { value: Math.random() * 0.1, configurable: true },
                    z: { value: 9.8 + Math.random() * 0.1, configurable: true }
                  });
                } else if (sensorType === 'Gyroscope') {
                  Object.defineProperties(this, {
                    x: { value: Math.random() * 0.01, configurable: true },
                    y: { value: Math.random() * 0.01, configurable: true },
                    z: { value: Math.random() * 0.01, configurable: true }
                  });
                } else if (sensorType.includes('OrientationSensor')) {
                  Object.defineProperties(this, {
                    quaternion: { value: [Math.random(), Math.random(), Math.random(), Math.random()], configurable: true }
                  });
                }
              };
              
              return sensor;
            };
          }
        });
      }
      
      // 3. 未来兼容性 - 预防权限策略问题
      if (navigator.permissions && navigator.permissions.query) {
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = function(permissionDesc) {
          // 拦截传感器相关的权限查询
          if (permissionDesc && (permissionDesc.name === 'accelerometer' || 
              permissionDesc.name === 'gyroscope' || 
              permissionDesc.name === 'magnetometer' || 
              permissionDesc.name === 'ambient-light-sensor')) {
            
            // 返回一个妥协的 Promise
            return Promise.resolve({
              state: 'granted',
              onchange: null
            });
          }
          
          // 其他权限请求正常处理
          return originalQuery.call(this, permissionDesc);
        };
      }
    })();
    `;
    
    // 传感器指纹防护脚本
    const sensorScript = `
    // 传感器防护
    (function() {
      // 检查当前网站是否在兼容性列表中
      function isCompatibleSite() {
        try {
          if (!window.__FINGERPRINT_CONFIG__ || !window.__FINGERPRINT_CONFIG__.compatibleSites) {
            return false;
          }
          
          const domain = window.location.hostname;
          // 兼容性列表可能使用逗号或换行符分隔
          const compatibleSites = window.__FINGERPRINT_CONFIG__.compatibleSites.includes('\n') ?
            window.__FINGERPRINT_CONFIG__.compatibleSites.split('\n') :
            window.__FINGERPRINT_CONFIG__.compatibleSites.split(',');
          
          for (const site of compatibleSites) {
            if (domain === site || domain.endsWith('.' + site)) {
              console.log('[指纹防护] 检测到兼容网站: ' + domain);
              return true;
            }
          }
          
          return false;
        } catch (error) {
          console.error('[指纹防护] 检查兼容网站时出错:', error);
          return false;
        }
      }
      
      // 获取当前网站是否需要兼容处理
      const isCompatible = isCompatibleSite();
      
      // 截获 DeviceMotion 和 DeviceOrientation 事件
      if (window.DeviceMotionEvent) {
        const originalAddEventListener = window.addEventListener;
        window.addEventListener = function(type, listener, options) {
          if (type === 'devicemotion' || type === 'deviceorientation') {
            // 对于兼容网站，允许原始事件通过，但在没有权限时提供模拟数据
            if (isCompatible) {
              try {
                return originalAddEventListener.call(this, type, listener, options);
              } catch (e) {
                console.log('[指纹防护] 兼容模式：使用模拟传感器数据');
              }
            }
            
            // 替换为模拟事件数据的处理函数
            const modifiedListener = function(event) {
              // 创建一个新的事件对象
              const modifiedEvent = {};
              Object.assign(modifiedEvent, event);
              
              // 针对不同事件类型模拟数据
              if (type === 'devicemotion') {
                // 模拟加速度数据
                modifiedEvent.acceleration = {
                  x: Math.random() * 0.1,
                  y: Math.random() * 0.1,
                  z: Math.random() * 0.1
                };
                modifiedEvent.accelerationIncludingGravity = {
                  x: Math.random() * 0.1 + 9.8,
                  y: Math.random() * 0.1,
                  z: Math.random() * 0.1
                };
                modifiedEvent.rotationRate = {
                  alpha: Math.random() * 0.1,
                  beta: Math.random() * 0.1,
                  gamma: Math.random() * 0.1
                };
              } else if (type === 'deviceorientation') {
                // 模拟方向数据
                modifiedEvent.alpha = Math.random() * 360;
                modifiedEvent.beta = Math.random() * 180 - 90;
                modifiedEvent.gamma = Math.random() * 180 - 90;
              }
              
              // 调用原始监听器
              listener.call(this, modifiedEvent);
            };
            
            return originalAddEventListener.call(this, type, modifiedListener, options);
          }
          
          return originalAddEventListener.call(this, type, listener, options);
        };
      }
      
      // 拦截各种传感器API
      if (window.Sensor) {
        const originalSensor = window.Sensor;
        window.Sensor = function(options) {
          // 对于兼容网站，尝试使用原始传感器
          if (isCompatible) {
            try {
              return new originalSensor(options);
            } catch (e) {
              console.log('[指纹防护] 兼容模式：使用模拟传感器');
            }
          }
          
          // 修改传感器数据
          const sensor = new originalSensor(options);
          // 截获读取操作
          return sensor;
        };
        window.Sensor.prototype = originalSensor.prototype;
      }
      
      // 模拟传感器权限
      if (navigator.permissions) {
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = function(permissionDesc) {
          if (permissionDesc.name === 'accelerometer' || 
              permissionDesc.name === 'gyroscope' || 
              permissionDesc.name === 'magnetometer' || 
              permissionDesc.name === 'ambient-light-sensor') {
              
            // 对于兼容网站，始终返回已授权状态
            if (isCompatible) {
              console.log('[指纹防护] 兼容模式：授予 ' + permissionDesc.name + ' 权限');
              return Promise.resolve({ 
                state: 'granted', 
                addEventListener: function() {}, 
                removeEventListener: function() {} 
              });
            } else {
              // 其他网站也模拟已授权，但可能会有其他限制
              return Promise.resolve({ state: 'granted', addEventListener: function() {} });
            }
          }
          return originalQuery.call(this, permissionDesc);
        };
      }
      
      // 抑制控制台错误
      const originalConsoleError = console.error;
      console.error = function(...args) {
        // 忽略权限策略相关错误
        if (args.length > 0 && typeof args[0] === 'string' && 
            (args[0].includes('Permission-Policy') || args[0].includes('Permissions-Policy'))) {
          // 对于兼容网站，输出一个友好的信息替代原始错误
          if (isCompatible) {
            console.log('[指纹防护] 已屏蔽权限策略错误消息');
          }
          return;
        }
        return originalConsoleError.apply(this, args);
      };
      
      // 抑制控制台警告
      const originalConsoleWarn = console.warn;
      console.warn = function(...args) {
        // 忽略权限策略相关警告
        if (args.length > 0 && typeof args[0] === 'string' && 
            (args[0].includes('Permission-Policy') || args[0].includes('Permissions-Policy'))) {
          // 对于兼容网站，输出一个友好的信息替代原始警告
          if (isCompatible) {
            console.log('[指纹防护] 已屏蔽权限策略警告消息');
          }
          return;
        }
        return originalConsoleWarn.apply(this, args);
      };
      // 2. DeviceMotion和DeviceOrientation事件防护
      if (window.DeviceMotionEvent || window.DeviceOrientationEvent) {
        // 拦截加速度计和方向事件
        const originalAddEventListener = window.addEventListener;
        window.addEventListener = function(type, listener, options) {
          if (type === 'devicemotion') {
            // 拦截加速度计事件，返回伪造数据
            const fakeHandler = function(event) {
              // 创建一个伪造的事件
              const fakeEvent = {};
              
              // 复制原始事件的所有属性
              for (let prop in event) {
                if (typeof event[prop] !== 'function' && prop !== 'acceleration' && 
                    prop !== 'accelerationIncludingGravity' && prop !== 'rotationRate') {
                  fakeEvent[prop] = event[prop];
                }
              }
              
              // 添加伪造的加速度数据
              Object.defineProperties(fakeEvent, {
                acceleration: {
                  get: function() {
                    return {
                      x: Math.random() * 0.1, 
                      y: Math.random() * 0.1,
                      z: Math.random() * 0.1
                    };
                  }
                },
                accelerationIncludingGravity: {
                  get: function() {
                    return {
                      x: Math.random() * 0.1 - 9.8 * (Math.random() > 0.5 ? 1 : -1),
                      y: Math.random() * 0.1,
                      z: Math.random() * 0.1
                    };
                  }
                },
                rotationRate: {
                  get: function() {
                    return {
                      alpha: Math.random() * 360, 
                      beta: Math.random() * 180 - 90, 
                      gamma: Math.random() * 180 - 90
                    };
                  }
                },
                interval: { value: 16 }
              });
              
              listener(fakeEvent);
            };
            return originalAddEventListener.call(this, type, fakeHandler, options);
          }
          else if (type === 'deviceorientation') {
            // 拦截设备方向事件，返回伪造数据
            const fakeHandler = function(event) {
              // 创建一个伪造的事件
              const fakeEvent = {};
              
              // 复制原始事件的所有属性
              for (let prop in event) {
                if (typeof event[prop] !== 'function' && 
                    prop !== 'alpha' && prop !== 'beta' && prop !== 'gamma') {
                  fakeEvent[prop] = event[prop];
                }
              }
              
              // 添加伪造的方向数据
              Object.defineProperties(fakeEvent, {
                alpha: { value: Math.random() * 360 },
                beta: { value: Math.random() * 180 - 90 },
                gamma: { value: Math.random() * 180 - 90 },
                absolute: { value: true }
              });
              
              listener(fakeEvent);
            };
            return originalAddEventListener.call(this, type, fakeHandler, options);
          }
          return originalAddEventListener.call(this, type, listener, options);
        };
      }
      
      // 3. 模拟传感器API权限
      if (window.DeviceMotionEvent && typeof window.DeviceMotionEvent.requestPermission === 'function') {
        window.DeviceMotionEvent.requestPermission = function() {
          return Promise.resolve('granted');
        };
      }
      
      if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
        window.DeviceOrientationEvent.requestPermission = function() {
          return Promise.resolve('granted');
        };
      }
      
      // 4. 对Permissions API进行模拟
      if (navigator.permissions && navigator.permissions.query) {
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = function(permissionDesc) {
          if (permissionDesc && (
              permissionDesc.name === 'accelerometer' || 
              permissionDesc.name === 'gyroscope' || 
              permissionDesc.name === 'magnetometer' || 
              permissionDesc.name === 'ambient-light-sensor')) {
            
            return Promise.resolve({
              state: 'granted',
              onchange: null
            });
          }
          
          return originalQuery.call(this, permissionDesc);
        };
      }
    })();
    `;
    
    // 音频指纹防护脚本
    const audioScript = `
    // 音频指纹防护
    (function() {
      // 1. 干扰 OfflineAudioContext.prototype.getChannelData
      if (window.OfflineAudioContext && OfflineAudioContext.prototype.getChannelData) {
        const originalGetChannelData = OfflineAudioContext.prototype.getChannelData;
        OfflineAudioContext.prototype.getChannelData = function() {
          const data = originalGetChannelData.apply(this, arguments);
          // 每隔一定间隔加微小噪声
          for (let i = 0; i < data.length; i += 100) {
            data[i] = data[i] + (Math.random() - 0.5) * 1e-5;
          }
          return data;
        };
      }
      // 2. 干扰 AudioContext.prototype.createAnalyser
      if (window.AudioContext && AudioContext.prototype.createAnalyser) {
        const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
        AudioContext.prototype.createAnalyser = function() {
          const analyser = originalCreateAnalyser.apply(this, arguments);
          if (analyser && analyser.getFloatFrequencyData) {
            const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
            analyser.getFloatFrequencyData = function(array) {
              // 在频谱数据上加微小扰动
              for (let i = 0; i < array.length; i += 10) {
                array[i] = array[i] + (Math.random() - 0.5) * 1e-3;
              }
              return originalGetFloatFrequencyData.call(this, array);
            };
          }
          return analyser;
        };
      }
    })();
    `;
    
    // WebGL 指纹防护脚本
    const webglScript = `
    // WebGL 指纹防护
    (function() {
      // 1. 干扰 getParameter 返回 vendor/renderer
      const getParameterProxyHandler = {
        apply: function(target, thisArg, args) {
          const param = args[0];
          if (param === 37445) return '{{WEBGL_VENDOR}}'; // UNMASKED_VENDOR_WEBGL
          if (param === 37446) return '{{WEBGL_RENDERER}}'; // UNMASKED_RENDERER_WEBGL
          return target.apply(thisArg, args);
        }
      };
      if (window.WebGLRenderingContext && WebGLRenderingContext.prototype.getParameter) {
        WebGLRenderingContext.prototype.getParameter = new Proxy(WebGLRenderingContext.prototype.getParameter, getParameterProxyHandler);
      }
      // 2. 干扰 getSupportedExtensions
      if (window.WebGLRenderingContext && WebGLRenderingContext.prototype.getSupportedExtensions) {
        const originalGetSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;
        WebGLRenderingContext.prototype.getSupportedExtensions = function() {
          // 返回伪造的扩展名列表
          return ['WEBGL_debug_renderer_info', 'OES_texture_float', 'OES_element_index_uint'];
        };
      }
      // 3. 干扰 readPixels（部分检测会分析像素）
      if (window.WebGLRenderingContext && WebGLRenderingContext.prototype.readPixels) {
        const originalReadPixels = WebGLRenderingContext.prototype.readPixels;
        WebGLRenderingContext.prototype.readPixels = function() {
          // 调用原始方法
          const result = originalReadPixels.apply(this, arguments);
          // 可以在此处对 pixels 数据加扰动（如有需要）
          return result;
        };
      }
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
    
    // 内部页面检测脚本
    const browserInternalPageCheckScript = `
    // 首先检测是否是浏览器内部页面，如果是则直接跳过后续脚本
    (function() {
      try {
        // 检查当前页面URL是否是浏览器内部页面
        const currentUrl = window.location.href;
        if (currentUrl.startsWith('chrome://') || 
            currentUrl.startsWith('edge://') || 
            currentUrl.startsWith('about:') || 
            currentUrl.startsWith('chrome-extension://') || 
            currentUrl.startsWith('devtools://') || 
            currentUrl.startsWith('view-source:')) {
          console.log('指纹防护: 检测到浏览器内部页面，跳过指纹防护');
          // 返回空对象以确保脚本不会报错
          window.__FINGERPRINT_CONFIG__ = window.__FINGERPRINT_CONFIG__ || {};
          // 注意：在浏览器内部页面上禁用所有指纹防护功能
          window.__FINGERPRINT_PROTECTION_DISABLED = true;
          // 终止脚本的运行
          return;
        }
      } catch (e) {
        console.error('指纹防护: 检测浏览器内部页面时出错', e);
      }
    })();
    `;
    
    // 检查是否已禁用指纹防护
    const checkDisabledScript = `
    (function() {
      if (window.__FINGERPRINT_PROTECTION_DISABLED === true) {
        // 如果已禁用，直接返回而不执行任何其他代码
        return;
      }
    })();
    `;
    
    // 保存脚本文件
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'canvas-protection.js'), canvasScript);
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'font-protection.js'), fontScript);
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'hardware-protection.js'), hardwareScript);
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'audio-protection.js'), audioScript);
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'webgl-protection.js'), webglScript);
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'webrtc-protection.js'), webrtcScript);
    
    // 生成标准整合脚本文件
    console.log('生成整合脚本文件...');
    
    // 确定使用哪种防护模式
    const protectionMode = fingerprint.protectionMode || 'standard';
    console.log(`使用指纹防护模式: ${protectionMode}`);
    
    // 根据保护模式调整参数
    let modeBasedConfig;
    
    // 确保commonFonts是有效的数组
    const defaultFonts = Array.isArray(this.commonFonts) && this.commonFonts.length > 0 
        ? this.commonFonts 
        : ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];
    
    if (protectionMode === 'balanced') {
      // 平衡模式 - 介于标准和增强之间
      modeBasedConfig = {
        canvasNoiseLevel: fingerprint.canvasNoiseLevel || '8', // 中等噪点
        webglVendor: fingerprint.webglVendor || 'Intel Inc.', // 标准供应商
        webglRenderer: fingerprint.webglRenderer || 'Intel Iris OpenGL Engine', // 标准渲染器
        randomFontDetection: fingerprint.randomFontDetection !== false, // 默认启用随机字体检测
        audioNoiseLevel: fingerprint.audioNoiseLevel || '0.008', // 中等音频噪点
        // 保持合理的硬件参数
        hardwareConcurrency: fingerprint.hardwareConcurrency || '6',
        deviceMemory: fingerprint.deviceMemory || '8',
        allowedFonts: fingerprint.allowedFonts || defaultFonts.slice(0, 15) // 中等数量的字体
      };
    } else if (protectionMode === 'brave') {
      // Brave风格 - 已在后面单独处理
      modeBasedConfig = {
        canvasNoiseLevel: fingerprint.canvasNoiseLevel || '15', // 高噪点
        webglVendor: fingerprint.webglVendor || 'Google Inc.',
        webglRenderer: fingerprint.webglRenderer || 'ANGLE (Google, Vulkan 1.3.0)',
        randomFontDetection: fingerprint.randomFontDetection !== false, // 默认为true
        audioNoiseLevel: fingerprint.audioNoiseLevel || '0.01',
        hardwareConcurrency: fingerprint.hardwareConcurrency || '8',
        deviceMemory: fingerprint.deviceMemory || '16',
        allowedFonts: fingerprint.allowedFonts || defaultFonts.slice(0, 10) // 较少字体
      };
    } else {
      // 标准模式 - 默认
      modeBasedConfig = {
        canvasNoiseLevel: fingerprint.canvasNoiseLevel || '5', // 低噪点
        webglVendor: fingerprint.webglVendor || 'Intel Inc.',
        webglRenderer: fingerprint.webglRenderer || 'Intel Iris OpenGL Engine',
        randomFontDetection: fingerprint.randomFontDetection === true, // 默认为false
        audioNoiseLevel: fingerprint.audioNoiseLevel || '0.005',
        hardwareConcurrency: fingerprint.hardwareConcurrency || '4',
        deviceMemory: fingerprint.deviceMemory || '8',
        allowedFonts: fingerprint.allowedFonts || defaultFonts // 全部字体
      };
    }
    
    // 从配置文件中获取值，或使用默认值
    const canvasNoiseLevel = modeBasedConfig.canvasNoiseLevel;
    const webglVendor = modeBasedConfig.webglVendor;
    const webglRenderer = modeBasedConfig.webglRenderer;
    const randomFontDetection = modeBasedConfig.randomFontDetection;
    const disableWebRTC = fingerprint.webrtcMode === 'disabled';
    const modifyWebRTCOffer = fingerprint.modifyWebRTCOffer !== false;
    const audioSampleRate = fingerprint.audioSampleRate || '44100';
    const audioNoiseLevel = modeBasedConfig.audioNoiseLevel;
    const hardwareConcurrency = modeBasedConfig.hardwareConcurrency;
    const deviceMemory = modeBasedConfig.deviceMemory;
    const screenWidth = fingerprint.screenWidth || '1920';
    const screenHeight = fingerprint.screenHeight || '1080';
    const colorDepth = fingerprint.colorDepth || '24';
    const devicePixelRatio = fingerprint.devicePixelRatio || '1.0';
    const allowedFonts = modeBasedConfig.allowedFonts;
    
    // 预处理脚本，替换模板变量
    // 处理音频指纹脚本
    const processedAudioScript = audioScript
      .replace(/{{AUDIO_SAMPLE_RATE}}/g, audioSampleRate)
      .replace(/{{AUDIO_NOISE_LEVEL}}/g, audioNoiseLevel);
      
    const processedCanvasScript = canvasScript
      .replace(/{{CANVAS_NOISE_LEVEL}}/g, canvasNoiseLevel)
      .replace(/{{WEBGL_VENDOR}}/g, `"${webglVendor}"`)
      .replace(/{{WEBGL_RENDERER}}/g, `"${webglRenderer}"`);
      
    // 确保allowedFonts一定是有效数组
    const safeAllowedFonts = Array.isArray(allowedFonts) && allowedFonts.length > 0 
        ? allowedFonts 
        : ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];
    
    const processedFontScript = fontScript
      .replace(/{{RANDOM_FONT_DETECTION}}/g, randomFontDetection.toString())
      .replace(/{{ALLOWED_FONTS}}/g, JSON.stringify(safeAllowedFonts));
      
    if (!Array.isArray(allowedFonts) || allowedFonts.length === 0) {
      console.warn('警告: 字体列表为空或无效，使用默认字体列表');
    }
      
    const processedWebglScript = webglScript
      .replace(/{{WEBGL_VENDOR}}/g, `"${webglVendor}"`)
      .replace(/{{WEBGL_RENDERER}}/g, `"${webglRenderer}"`);
      
    const processedWebrtcScript = webrtcScript
      .replace(/{{DISABLE_WEBRTC}}/g, disableWebRTC.toString())
      .replace(/{{MODIFY_WEBRTC_OFFER}}/g, modifyWebRTCOffer.toString());
    
    // 替换硬件信息相关的模板变量
    const processedHardwareScript = hardwareScript
      .replace(/{{HARDWARE_CONCURRENCY}}/g, hardwareConcurrency)
      .replace(/{{DEVICE_MEMORY}}/g, deviceMemory)
      .replace(/{{SCREEN_WIDTH}}/g, screenWidth)
      .replace(/{{SCREEN_HEIGHT}}/g, screenHeight)
      .replace(/{{COLOR_DEPTH}}/g, colorDepth)
      .replace(/{{DEVICE_PIXEL_RATIO}}/g, devicePixelRatio);
    
    const standardScript = `
    // 多账户浏览器指纹防护脚本
    // 生成时间: ${new Date().toISOString()}
    
    // 在窗口上定义指纹配置
    window.__FINGERPRINT_CONFIG__ = window.__FINGERPRINT_CONFIG__ || {
      enabled: true,
      mode: 'standard',
      canvasProtection: true,
      fontProtection: true,
      audioContextProtection: true,
      webglProtection: true,
      webrtcProtection: true,
      hardwareInfoProtection: true,
      sensorProtection: true,
      compatibleSites: '${fingerprint.compatibleSites || ""}',
      time: '${new Date().toISOString()}'
    };
    
    // 应用内部页面检测脚本
    ${browserInternalPageCheckScript}
    
    // 检查是否已禁用指纹防护
    ${checkDisabledScript}
    
    // 应用Canvas指纹防护
    ${processedCanvasScript}
    
    // 应用字体指纹防护
    ${processedFontScript}
    
    // 应用硬件信息防护
    ${processedHardwareScript}
    
    // 应用音频指纹防护
    ${processedAudioScript}
    
    // 应用WebGL指纹防护
    ${processedWebglScript}
    
    // 应用WebRTC防护
    ${processedWebrtcScript}
    
    // 应用传感器防护
    ${sensorScript}
    
    console.log('指纹防护脚本已加载');`;
    
    // 写入标准整合脚本文件
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'preload-fingerprint-protection.js'), standardScript);
    
    // 生成Brave风格整合脚本文件
    // 确保有一个默认的字体列表
    const defaultBraveFonts = ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];
    
    // 从配置中获取Brave风格的设置，或使用默认值
    const braveCanvasNoiseLevel = fingerprint.braveCanvasNoiseLevel || '15';
    const braveWebglVendor = fingerprint.braveWebglVendor || 'Google Inc.';
    const braveWebglRenderer = fingerprint.braveWebglRenderer || 'ANGLE (Google, Vulkan 1.3.0)';
    const braveRandomFontDetection = fingerprint.braveRandomFontDetection !== false; // 默认为true
    const braveDisableWebRTC = fingerprint.braveDisableWebRTC !== false; // 默认为true
    
    // 确保braveAllowedFonts是有效的数组
    const braveAllowedFonts = Array.isArray(fingerprint.braveAllowedFonts) && fingerprint.braveAllowedFonts.length > 0
        ? fingerprint.braveAllowedFonts
        : Array.isArray(this.commonFonts) && this.commonFonts.length > 0
            ? this.commonFonts.slice(0, 10)
            : defaultBraveFonts;
            
    const braveHardwareConcurrency = fingerprint.braveHardwareConcurrency || '8';
    const braveDeviceMemory = fingerprint.braveDeviceMemory || '16';
    const braveScreenWidth = fingerprint.screenWidth || '2560';
    const braveScreenHeight = fingerprint.screenHeight || '1440';
    const braveColorDepth = fingerprint.braveColorDepth || '24';
    const braveDevicePixelRatio = fingerprint.braveDevicePixelRatio || '2.0';
    
    // 对Brave模式进行更强的防护设置
    const braveCanvasScript = canvasScript
      .replace(/{{CANVAS_NOISE_LEVEL}}/g, braveCanvasNoiseLevel)
      .replace(/{{WEBGL_VENDOR}}/g, `"${braveWebglVendor}"`)
      .replace(/{{WEBGL_RENDERER}}/g, `"${braveWebglRenderer}"`);
      
    const braveFontScript = fontScript
      .replace(/{{RANDOM_FONT_DETECTION}}/g, braveRandomFontDetection.toString())
      .replace(/{{ALLOWED_FONTS}}/g, JSON.stringify(braveAllowedFonts));
      
    // 验证替换后的内容是否包含有效的JavaScript代码
    if (braveFontScript.includes('undefined') && !braveFontScript.includes('!== undefined')) {
      console.warn('警告: 生成的Brave字体脚本可能包含无效的JavaScript代码');
    }
      
    const braveWebglScript = webglScript
      .replace(/{{WEBGL_VENDOR}}/g, `"${braveWebglVendor}"`)
      .replace(/{{WEBGL_RENDERER}}/g, `"${braveWebglRenderer}"`);
      
    const braveWebrtcScript = webrtcScript
      .replace(/{{DISABLE_WEBRTC}}/g, braveDisableWebRTC.toString())
      .replace(/{{MODIFY_WEBRTC_OFFER}}/g, 'true');
      
    // 为Brave模式创建专门的硬件设置
    const braveHardwareScript = hardwareScript
      .replace(/{{HARDWARE_CONCURRENCY}}/g, braveHardwareConcurrency)
      .replace(/{{DEVICE_MEMORY}}/g, braveDeviceMemory)
      .replace(/{{SCREEN_WIDTH}}/g, braveScreenWidth)
      .replace(/{{SCREEN_HEIGHT}}/g, braveScreenHeight)
      .replace(/{{COLOR_DEPTH}}/g, braveColorDepth)
      .replace(/{{DEVICE_PIXEL_RATIO}}/g, braveDevicePixelRatio);
    
    // 添加域名隔离的指纹种子生成函数
    const domainSeedScript = `
    // 指纹种子生成与域名隔离 - 极简版本
    (function() {
      // 再次检查是否已禁用指纹防护
      if (window.__FINGERPRINT_PROTECTION_DISABLED === true) {
        return; // 如果在浏览器内部页面上，跳过所有操作
      }
      // 创建一个隔离的环境，使指纹防护不会影响页面布局
      const createIsolatedEnvironment = function() {
        try {
          // 创建隔离环境，不影响页面DOM和CSS
          return {
            // 安全的随机函数，不会修改原始Math.random
            random: function() { 
              return Math.random(); // 使用原始的随机函数
            },
            // 确保页面样式不受影响
            preserveStyles: function() {
              // 不做任何修改
            }
          };
        } catch (e) {
          console.warn('创建隔离环境失败:', e);
          return {
            random: Math.random,
            preserveStyles: function() {}
          };
        }
      };
      
      // 创建隔离环境
      const isolatedEnv = createIsolatedEnvironment();
      isolatedEnv.preserveStyles();
      
      // 基于域名创建唯一的种子值（模拟Brave的farbling技术）
      window.__getFingerprintSeed = function(domainKey) {
        try {
          // 获取当前域名，如果未提供则使用当前域名
          const domain = domainKey || 
            (window.location && window.location.hostname ? 
              window.location.hostname.split('.').slice(-2).join('.') : 
              'default-domain');
          
          // 创建一个基于域名的伪随机数生成器
          function createSeededRandom(seed) {
            if (!seed || typeof seed !== 'string') {
              seed = 'default-seed';
            }
            // 使用简单的哈希函数将域名转换为数字种子
            const numericSeed = Array.from(seed).reduce(
              (acc, char, i) => acc + char.charCodeAt(0) * Math.pow(31, seed.length - i - 1), 0
            ) % 2147483647;
            
            // 使用线性同余生成器算法
            let seed1 = numericSeed || 12345;
            return function() {
              seed1 = (seed1 * 16807) % 2147483647;
              return (seed1 - 1) / 2147483646;
            };
          }
          
          // 为当前域名创建一个固定的随机数生成器
          const sessionKey = '${new Date().toDateString()}';
          const combinedKey = domain + sessionKey;
          const random = createSeededRandom(combinedKey);
          
          // 返回一个基于域名的噪声函数，保证同一域名产生相同噪声
          return {
            random: random,
            // 为任意值添加微小的扰动，但扰动对于同一域名是一致的
            noise: function(value, scale = 0.01) {
              if (typeof value !== 'number') return value;
              return value + (random() * 2 - 1) * scale * value;
            },
            // 为像素添加噪声
            pixelNoise: function(pixel, intensity = 10) {
              if (typeof pixel !== 'number') return pixel;
              // 确保相同输入值对应相同的随机变化
              const r = Math.max(0, Math.min(255, pixel + (random() * 2 - 1) * intensity));
              return Math.floor(r);
            }
          };
        } catch (e) {
          console.warn('创建指纹种子时出错:', e);
          // 返回一个安全的后备实现
          return {
            random: function() { return Math.random(); },
            noise: function(value) { return value; },
            pixelNoise: function(pixel) { return pixel; }
          };
        }
      };
      
      // 默认使用当前域名创建种子 - 但不影响页面布局
      window.__domainFingerprint = window.__getFingerprintSeed();
      window.__isolatedFingerprint = true;
      
      // 保存原始的重要方法，防止意外修改
      if (!window.__savedOriginalFunctions) {
        window.__savedOriginalFunctions = {
          // DOM操作
          appendChild: Element.prototype.appendChild,
          insertBefore: Element.prototype.insertBefore,
          setAttribute: Element.prototype.setAttribute,
          // 样式操作
          getComputedStyle: window.getComputedStyle
        };
      }
      
      // 监测页面布局变化，但不主动修改
      const ensureLayoutPreservation = function() {
        try {
          // 仅监测布局问题，不进行主动修复
          if (document.body) {
            // 仅记录日志，不修改布局
            console.log('检测到指纹防护已加载，正在确保不影响页面布局');
          }
        } catch (e) {
          // 静默处理错误，不影响任何功能
        }
      };
      
      // 延迟检查布局完整性，但不进行修改
      setTimeout(ensureLayoutPreservation, 1000);
      
      console.log('域名隔离指纹种子已创建');
    {{ ... }}
    })();
    `;

    const braveScript = `
        // Brave风格指纹防护脚本
        // 生成时间: ${new Date().toISOString()}
        
        // 在窗口上定义指纹配置
        window.__FINGERPRINT_CONFIG__ = { 
          enabled: true,
          mode: 'brave',
          canvasProtection: true,
          fontProtection: true,
          audioContextProtection: true,
          webglProtection: true,
          webrtcProtection: true,
          hardwareInfoProtection: true,
          compatibleSites: '${fingerprint.compatibleSites || 'aliyun.com\\nalipay.com\\ntaobao.com\\ntmall.com\\nweibo.com\\nqq.com\\nbaidu.com'}',
          time: '${new Date().toISOString()}'
        };
        
        // 添加域名隔离的指纹种子生成
        ${domainSeedScript}
        
        // 应用增强版Canvas指纹防护
        ${braveCanvasScript.replace(/Math\.random\(\)/g, 'window.__domainFingerprint.random()')}
        
        // 应用增强版字体指纹防护
        ${braveFontScript.replace(/Math\.random\(\)/g, 'window.__domainFingerprint.random()')}
        
        // 应用增强版硬件信息防护
        ${braveHardwareScript}
        
        // 应用增强版音频指纹防护
        ${processedAudioScript.replace(/Math\.random\(\)/g, 'window.__domainFingerprint.random()')}
        
        // 应用增强版WebGL指纹防护
        ${braveWebglScript.replace(/Math\.random\(\)/g, 'window.__domainFingerprint.random()')}
        
        // 应用增强版WebRTC防护
        ${braveWebrtcScript}
        
        // 增强WebGL防护，添加更多Brave防护的API
        (function() {
          if (window.WebGLRenderingContext) {
            // 保护WebGL着色器精度格式
            if (WebGLRenderingContext.prototype.getShaderPrecisionFormat) {
              const originalGetShaderPrecisionFormat = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
              WebGLRenderingContext.prototype.getShaderPrecisionFormat = function() {
                const result = originalGetShaderPrecisionFormat.apply(this, arguments);
                if (result) {
                  // 基于域名的一致性修改精度范围
                  const random = window.__domainFingerprint.random();
                  // 对精度进行微调，保持合理范围
                  result.rangeMin = Math.max(result.rangeMin - 1, -128);
                  result.rangeMax = Math.min(result.rangeMax + 1, 127);
                  result.precision = Math.max(1, result.precision);
                }
                return result;
              };
            }
            
            // 保护顶点属性参数
            if (WebGLRenderingContext.prototype.getVertexAttrib) {
              const originalGetVertexAttrib = WebGLRenderingContext.prototype.getVertexAttrib;
              WebGLRenderingContext.prototype.getVertexAttrib = function(index, pname) {
                const result = originalGetVertexAttrib.apply(this, arguments);
                // 只对非关键参数进行修改
                const nonCriticalParams = [35714, 35715, 35716]; // 顶点属性的一些参数
                if (nonCriticalParams.includes(pname)) {
                  // 对参数稍作修改但保持一致性
                  if (typeof result === 'number') {
                    return window.__domainFingerprint.noise(result, 0.001);
                  }
                }
                return result;
              };
            }
          }
          
          // 更全面的Canvas API防护
          if (window.CanvasRenderingContext2D) {
            // 保护isPointInPath和isPointInStroke
            if (CanvasRenderingContext2D.prototype.isPointInPath) {
              const originalIsPointInPath = CanvasRenderingContext2D.prototype.isPointInPath;
              CanvasRenderingContext2D.prototype.isPointInPath = function(x, y) {
                // 给坐标添加微小偏移，但对同一域名保持一致
                const offsetX = window.__domainFingerprint.noise(x, 0.0001);
                const offsetY = window.__domainFingerprint.noise(y, 0.0001);
                return originalIsPointInPath.call(this, offsetX, offsetY);
              };
            }
            
            if (CanvasRenderingContext2D.prototype.isPointInStroke) {
              const originalIsPointInStroke = CanvasRenderingContext2D.prototype.isPointInStroke;
              CanvasRenderingContext2D.prototype.isPointInStroke = function(x, y) {
                // 给坐标添加微小偏移，但对同一域名保持一致
                const offsetX = window.__domainFingerprint.noise(x, 0.0001);
                const offsetY = window.__domainFingerprint.noise(y, 0.0001);
                return originalIsPointInStroke.call(this, offsetX, offsetY);
              };
            }
          }
          
          // 保护OffscreenCanvas (如果存在)
          if (window.OffscreenCanvas) {
            const originalConvertToBlob = OffscreenCanvas.prototype.convertToBlob;
            if (originalConvertToBlob) {
              OffscreenCanvas.prototype.convertToBlob = async function() {
                // 在转换为Blob前对数据进行微调
                const ctx = this.getContext('2d');
                if (ctx) {
                  const imageData = ctx.getImageData(0, 0, this.width, this.height);
                  const data = imageData.data;
                  // 每隔一定像素添加微小扰动
                  for (let i = 0; i < data.length; i += 16) {
                    data[i] = window.__domainFingerprint.pixelNoise(data[i], 5);
                  }
                  ctx.putImageData(imageData, 0, 0);
                }
                return originalConvertToBlob.apply(this, arguments);
              };
            }
          }
        })();`;
    
    // 写入Brave风格整合脚本文件
    fs.writeFileSync(path.join(this.fingerprintScriptsDir, 'brave-fingerprint-protection.js'), braveScript);
    
    console.log('指纹防护脚本生成完成');
  }
  
  /**
   * 生成随机的指纹配置
   * @param {Object} options 选项
   * @returns {Object} 随机指纹配置
   */
  generateRandomFingerprint(options = {}) {
    // 使用指定的随机种子或生成新的
    const seed = options.randomSeed || Math.floor(Math.random() * 2147483647);
    const random = this._createSeededRandom(seed);
    
    // 默认值
    const browser = options.browser || options.browserType || 'chrome';
    let os = options.os || 'windows';
    const language = options.language || this._getRandomItem(this.languages, random);
    
    // 如果是 Safari 浏览器，强制使用 macOS
    if (browser === 'safari' && os !== 'macos') {
      console.log('[指纹防护] Safari 浏览器只能在 macOS 上运行，强制使用 macOS');
      os = 'macos';
    }
    
    // 根据浏览器和操作系统生成 User-Agent
    let userAgent = '';
    let platform = '';
    
    // 各浏览器版本
    const chromeVersions = ['90.0.4430.212', '91.0.4472.124', '92.0.4515.107', '93.0.4577.63', '94.0.4606.81', '95.0.4638.54'];
    const firefoxVersions = ['88.0', '89.0', '90.0', '91.0', '92.0', '93.0'];
    const edgeVersions = ['90.0.818.51', '91.0.864.59', '92.0.902.78', '93.0.961.52', '94.0.992.31', '95.0.1020.40'];
    const safariVersions = ['14.1.1', '14.1.2', '15.0', '15.1', '15.2', '15.3', '15.4'];
    const webkitVersions = ['605.1.15', '605.1.33', '605.1.50', '605.1.55'];
    
    // 随机选择版本
    const chromeVersion = this._getRandomItem(chromeVersions, random);
    const firefoxVersion = this._getRandomItem(firefoxVersions, random);
    const edgeVersion = this._getRandomItem(edgeVersions, random);
    const safariVersion = this._getRandomItem(safariVersions, random);
    const webkitVersion = this._getRandomItem(webkitVersions, random);
    
    // 根据浏览器类型和操作系统生成 User-Agent
    if (browser === 'chrome') {
      if (os === 'windows') {
        userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
        platform = 'Win32';
      } else if (os === 'macos') {
        userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
        platform = 'MacIntel';
      } else if (os === 'linux') {
        userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
        platform = 'Linux x86_64';
      }
    } else if (browser === 'firefox') {
      if (os === 'windows') {
        userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
        platform = 'Win32';
      } else if (os === 'macos') {
        userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
        platform = 'MacIntel';
      } else if (os === 'linux') {
        userAgent = `Mozilla/5.0 (X11; Linux x86_64; rv:${firefoxVersion}) Gecko/20100101 Firefox/${firefoxVersion}`;
        platform = 'Linux x86_64';
      }
    } else if (browser === 'edge') {
      if (os === 'windows') {
        userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Edg/${edgeVersion}`;
        platform = 'Win32';
      } else if (os === 'macos') {
        userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Edg/${edgeVersion}`;
        platform = 'MacIntel';
      } else if (os === 'linux') {
        userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Edg/${edgeVersion}`;
        platform = 'Linux x86_64';
      }
    } else if (browser === 'safari') {
      if (os === 'macos') {
        userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/${webkitVersion} (KHTML, like Gecko) Version/${safariVersion} Safari/${webkitVersion}`;
        platform = 'MacIntel';
      } else {
        // Safari 主要在 macOS 上运行，如果选择了其他操作系统，则默认使用 macOS 版本
        userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/${webkitVersion} (KHTML, like Gecko) Version/${safariVersion} Safari/${webkitVersion}`;
        platform = 'MacIntel';
      }
    } else {
      // 默认使用 Chrome
      userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
      platform = 'Win32';
    }
    
    // 注意：已经在上面生成了 platform，这里不需要再次生成
    
    // 生成语言数组
    const languages = [language];
    
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
   * 创建基于种子的随机数生成器
   * @param {number} seed 随机种子
   * @returns {Function} 随机数生成器函数
   */
  _createSeededRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  
  /**
   * 从数组中随机选择一个元素
   * @param {Array} array 原始数组
   * @param {Function} randomFunc 随机函数
   * @returns {*} 随机选择的元素
   */
  _getRandomItem(array, randomFunc) {
    const random = randomFunc || Math.random;
    return array[Math.floor(random() * array.length)];
  }
  
  /**
   * 生成指纹防护脚本
   * @param {Object} fingerprintConfig 指纹配置
   * @returns {string} 指纹防护脚本
   */
  /**
   * 生成指纹防护脚本
   * @param {Object} fingerprintConfig 指纹配置
   * @param {string} protectionLevel 防护级别 ('minimal', 'balanced', 'standard', 'maximum')
   * @returns {string} 生成的指纹防护脚本
   */
  generateFingerprintScript(fingerprintConfig, protectionLevel = 'standard') {
    try {
      // 读取脚本模板 - 优先使用 Brave 风格的防护脚本
      let canvasScript = '';
      let fontScript = '';
      let hardwareScript = '';
      let webrtcScript = '';
      let audioScript = '';
      let pluginScript = '';
      let rectsScript = '';
      
      // 根据防护级别和模式选择脚本
      const useBraveStyle = fingerprintConfig.protectionMode === 'brave' || protectionLevel === 'maximum';
      
      // 根据防护级别调整噪点级别
      let canvasNoiseLevel = 10; // 默认噪点级别
      
      if (protectionLevel === 'minimal') {
        canvasNoiseLevel = 2; // 最小噪点
      } else if (protectionLevel === 'balanced') {
        canvasNoiseLevel = 5; // 平衡噪点
      } else if (protectionLevel === 'maximum') {
        canvasNoiseLevel = 15; // 最大噪点
      }
      
      // 如果配置中指定了噪点级别，使用配置中的值
      if (fingerprintConfig.canvasNoiseLevel !== undefined) {
        canvasNoiseLevel = fingerprintConfig.canvasNoiseLevel;
      }
      
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
          .replace('{{USER_AGENT}}', fingerprintConfig.userAgent || navigator.userAgent)
          .replace('{{PLATFORM}}', fingerprintConfig.platform || 'Win32')
          .replace('{{LANGUAGE}}', fingerprintConfig.language || 'zh-CN')
          .replace('{{SCREEN_WIDTH}}', fingerprintConfig.screenWidth || 1920)
          .replace('{{SCREEN_HEIGHT}}', fingerprintConfig.screenHeight || 1080)
          .replace('{{COLOR_DEPTH}}', fingerprintConfig.colorDepth || 24)
          .replace('{{DEVICE_PIXEL_RATIO}}', fingerprintConfig.devicePixelRatio || 1)
          .replace('{{WEBGL_VENDOR}}', fingerprintConfig.webglVendor || 'Google Inc.')
          .replace('{{WEBGL_RENDERER}}', fingerprintConfig.webglRenderer || 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)')
          .replace('{{CANVAS_NOISE_LEVEL}}', fingerprintConfig.canvasMode === 'noise' ? canvasNoiseLevel : 0)
          .replace(/{{ALLOWED_FONTS}}/g, JSON.stringify(fingerprintConfig.allowedFonts || this.commonFonts))
          .replace(/{{RANDOM_FONT_DETECTION}}/g, fingerprintConfig.randomFontDetection ? 'true' : 'false');
      }
      
      // 替换硬件信息脚本中的变量 - 只有在使用原始脚本时才需要
      if (hardwareScript.includes('{{HARDWARE_CONCURRENCY}}')) {
        hardwareScript = hardwareScript
          .replace('{{USER_AGENT}}', fingerprintConfig.userAgent || navigator.userAgent)
          .replace('{{PLATFORM}}', fingerprintConfig.platform || 'Win32')
          .replace('{{LANGUAGE}}', fingerprintConfig.language || 'zh-CN')
          .replace('{{SCREEN_WIDTH}}', fingerprintConfig.screenWidth || 1920)
          .replace('{{SCREEN_HEIGHT}}', fingerprintConfig.screenHeight || 1080)
          .replace('{{COLOR_DEPTH}}', fingerprintConfig.colorDepth || 24)
          .replace('{{DEVICE_PIXEL_RATIO}}', fingerprintConfig.devicePixelRatio || 1)
          .replace('{{WEBGL_VENDOR}}', fingerprintConfig.webglVendor || 'Google Inc.')
          .replace('{{WEBGL_RENDERER}}', fingerprintConfig.webglRenderer || 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)')
          .replace('{{CANVAS_NOISE_LEVEL}}', fingerprintConfig.canvasMode === 'noise' ? canvasNoiseLevel : 0)
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
          .replace('{{USER_AGENT}}', fingerprintConfig.userAgent || navigator.userAgent)
          .replace('{{PLATFORM}}', fingerprintConfig.platform || 'Win32')
          .replace('{{LANGUAGE}}', fingerprintConfig.language || 'zh-CN')
          .replace('{{SCREEN_WIDTH}}', fingerprintConfig.screenWidth || 1920)
          .replace('{{SCREEN_HEIGHT}}', fingerprintConfig.screenHeight || 1080)
          .replace('{{COLOR_DEPTH}}', fingerprintConfig.colorDepth || 24)
          .replace('{{DEVICE_PIXEL_RATIO}}', fingerprintConfig.devicePixelRatio || 1)
          .replace('{{WEBGL_VENDOR}}', fingerprintConfig.webglVendor || 'Google Inc.')
          .replace('{{WEBGL_RENDERER}}', fingerprintConfig.webglRenderer || 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)')
          .replace('{{CANVAS_NOISE_LEVEL}}', fingerprintConfig.canvasMode === 'noise' ? canvasNoiseLevel : 0)
          .replace(/{{DISABLE_WEBRTC}}/g, !fingerprintConfig.webrtcEnabled ? 'true' : 'false')
          .replace(/{{MODIFY_WEBRTC_OFFER}}/g, fingerprintConfig.modifyWebRTCOffer ? 'true' : 'false');
      }
      
      // 替换 WebGL 指纹防护脚本中的变量
      if (webglScript && (webglScript.includes('{{WEBGL_VENDOR}}') || webglScript.includes('{{WEBGL_RENDERER}}'))) {
        webglScript = webglScript
          .replace(/{{WEBGL_VENDOR}}/g, fingerprintConfig.webglVendor || 'Google Inc.')
          .replace(/{{WEBGL_RENDERER}}/g, fingerprintConfig.webglRenderer || 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)');
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
      
      // 添加 WebGL 指纹防护脚本
      ${fingerprintConfig.webglProtection !== false ? webglScript : '// WebGL 指纹保护已禁用'}
      
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
   * 检查是否为兼容网站
   * @param {string} url 当前网站URL
   * @param {string} compatibleSites 兼容网站列表（每行一个域名）
   * @returns {boolean} 是否为兼容网站
   */
  isCompatibleSite(url, compatibleSites) {
    if (!url || !compatibleSites) return false;
    
    try {
      // 提取域名
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // 将兼容网站列表分割为数组
      const siteList = compatibleSites.split('\n').map(site => site.trim()).filter(site => site);
      
      // 检查域名是否在兼容列表中
      for (const site of siteList) {
        if (domain === site || domain.endsWith('.' + site)) {
          console.log(`[指纹防护] 检测到兼容网站: ${domain}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`[指纹防护] 检查兼容网站时出错:`, error);
      return false;
    }
  }
  
  /**
   * 应用指纹防护
   * @param {Object} context 浏览器上下文
   * @param {Object} config 指纹配置
   * @returns {Promise<boolean>} 是否成功应用指纹防护
   */
  async applyFingerprint(context, config) {
    try {
      if (!context || !config) {
        console.error('[指纹防护] 参数无效');
        return false;
      }
      
      // 获取浏览器页面
      const pages = context.pages();
      if (pages.length === 0) {
        console.error('[指纹防护] 没有可用的页面');
        return false;
      }
      
      const page = pages[0];
      const url = page.url();
      
      // 检查是否为兼容网站
      const isCompatible = this.isCompatibleSite(url, config.compatibleSites);
      
      // 根据保护模式和兼容性调整指纹防护强度
      let protectionLevel = 'standard';
      
      if (isCompatible) {
        // 如果是兼容网站，降低防护强度
        console.log(`[指纹防护] 为兼容网站 ${url} 使用最低防护强度`);
        protectionLevel = 'minimal';
      } else if (config.protectionMode === 'balanced') {
        // 平衡模式
        protectionLevel = 'balanced';
      } else if (config.protectionMode === 'brave') {
        // 增强模式（Brave 风格）
        protectionLevel = 'maximum';
      }
      
      console.log(`[指纹防护] 使用防护级别: ${protectionLevel}`);
      
      // 根据防护级别调整配置
      const adjustedConfig = { ...config };
      
      if (protectionLevel === 'minimal') {
        // 最小防护：只保留基本的 User-Agent 和平台设置
        adjustedConfig.canvasMode = 'none';
        adjustedConfig.webrtcMode = 'default';
        adjustedConfig.fontProtection = false;
        adjustedConfig.hardwareInfoProtection = false;
        adjustedConfig.audioContextProtection = false;
        adjustedConfig.pluginDataProtection = false;
        adjustedConfig.rectsProtection = false;
        adjustedConfig.timezoneProtection = false;
      } else if (protectionLevel === 'balanced') {
        // 平衡防护：使用中等强度的设置
        adjustedConfig.canvasMode = 'noise';
        adjustedConfig.canvasNoiseLevel = 5; // 降低噪点级别
        adjustedConfig.webrtcMode = 'public_only';
        adjustedConfig.fontProtection = true;
        adjustedConfig.hardwareInfoProtection = true;
        adjustedConfig.audioContextProtection = true;
        adjustedConfig.pluginDataProtection = false; // 禁用插件保护
        adjustedConfig.rectsProtection = false; // 禁用矩形保护
        adjustedConfig.timezoneProtection = true;
      }
      // maximum 级别使用原始配置，所有防护开启
      
      // 生成指纹防护脚本
      const fingerprintScript = this.generateFingerprintScript(adjustedConfig, protectionLevel);
      
      // 根据浏览器类型调整设置
      const browserType = adjustedConfig.browserType || 'chrome';
      console.log(`[指纹防护] 浏览器类型: ${browserType}`);
      
      // 在所有页面上注入脚本
      for (const page of pages) {
        // 设置 User-Agent
        await page.setExtraHTTPHeaders({
          'User-Agent': adjustedConfig.userAgent
        });
        
        // 设置视口大小
        await page.setViewportSize({
          width: adjustedConfig.screenWidth || 1920,
          height: adjustedConfig.screenHeight || 1080
        });
        
        // 根据浏览器类型调整特定设置
        if (browserType === 'firefox') {
          // Firefox 特定的设置
          try {
            await page.evaluateOnNewDocument(`
              // Firefox 特定的指纹防护
              Object.defineProperty(navigator, 'buildID', {
                get: function() {
                  return '20210512';
                }
              });
              
              // 覆盖 Firefox 特有的 navigator.productSub
              Object.defineProperty(navigator, 'productSub', {
                get: function() {
                  return '20100101';
                }
              });
            `);
          } catch (error) {
            console.warn(`[指纹防护] 设置 Firefox 特定参数失败:`, error);
          }
        } else if (browserType === 'safari') {
          // Safari 特定的设置
          try {
            await page.evaluateOnNewDocument(`
              // Safari 特定的指纹防护
              Object.defineProperty(navigator, 'vendor', {
                get: function() {
                  return 'Apple Computer, Inc.';
                }
              });
              
              // 覆盖 Safari 特有的 navigator.productSub
              Object.defineProperty(navigator, 'productSub', {
                get: function() {
                  return '20030107';
                }
              });
            `);
          } catch (error) {
            console.warn(`[指纹防护] 设置 Safari 特定参数失败:`, error);
          }
        }
      }
      
      // 在浏览器上下文中注入脚本
      await context.addInitScript(fingerprintScript);
      
      // 设置时区
      if (adjustedConfig.timezoneProtection) {
        await context.setTimezone(adjustedConfig.timezone || 'Asia/Shanghai');
      }
      
      return true;
    } catch (error) {
      console.error('应用指纹配置失败:', error);
      throw new Error(`应用指纹配置失败: ${error.message}`);
    }
  }
  
}

// 创建单例实例
const instance = new EnhancedFingerprintManager();

// 导出实例和类
module.exports = instance;
module.exports.EnhancedFingerprintManager = EnhancedFingerprintManager;
