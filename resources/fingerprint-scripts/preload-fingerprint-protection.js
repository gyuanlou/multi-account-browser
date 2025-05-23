
    // 多账户浏览器指纹防护脚本
    // 生成时间: 2025-05-23T03:51:22.664Z
    
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
      compatibleSites: '',
      time: '2025-05-23T03:51:22.664Z'
    };
    
    // 应用内部页面检测脚本
    
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
    
    
    // 检查是否已禁用指纹防护
    
    (function() {
      if (window.__FINGERPRINT_PROTECTION_DISABLED === true) {
        // 如果已禁用，直接返回而不执行任何其他代码
        return;
      }
    })();
    
    
    // 应用Canvas指纹防护
    
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
            const noise = 5;
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
            const noise = 5;
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
                return '"Intel Inc."';
              }
              
              if (param === 37446) { // UNMASKED_RENDERER_WEBGL
                return '"Intel Iris OpenGL Engine"';
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
    
    
    // 应用字体指纹防护
    
    // 字体指纹防护
    (function() {
      // 1. 重写 document.fonts.check，干扰字体检测
      if (document.fonts && document.fonts.check) {
        const originalCheck = document.fonts.check;
        document.fonts.check = function(font, text) {
          const allowedFonts = ["Arial","Arial Black","Arial Narrow","Calibri","Cambria","Cambria Math","Comic Sans MS","Courier","Courier New","Georgia","Helvetica","Impact","Lucida Console","Lucida Sans Unicode","Microsoft Sans Serif","Palatino Linotype","Tahoma","Times","Times New Roman","Trebuchet MS","Verdana"];
          for (const allowedFont of allowedFonts) {
            if (font.includes(allowedFont)) {
              // 对允许的字体正常返回
              return originalCheck.call(this, font, text);
            }
          }
          // 对不在允许列表的字体，随机返回true/false
          if (false) {
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
            return ["Arial","Arial Black","Arial Narrow","Calibri","Cambria","Cambria Math","Comic Sans MS","Courier","Courier New","Georgia","Helvetica","Impact","Lucida Console","Lucida Sans Unicode","Microsoft Sans Serif","Palatino Linotype","Tahoma","Times","Times New Roman","Trebuchet MS","Verdana"].join(', ');
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
              query: () => Promise.resolve({ families: (Array.isArray(["Arial","Arial Black","Arial Narrow","Calibri","Cambria","Cambria Math","Comic Sans MS","Courier","Courier New","Georgia","Helvetica","Impact","Lucida Console","Lucida Sans Unicode","Microsoft Sans Serif","Palatino Linotype","Tahoma","Times","Times New Roman","Trebuchet MS","Verdana"]) ? ["Arial","Arial Black","Arial Narrow","Calibri","Cambria","Cambria Math","Comic Sans MS","Courier","Courier New","Georgia","Helvetica","Impact","Lucida Console","Lucida Sans Unicode","Microsoft Sans Serif","Palatino Linotype","Tahoma","Times","Times New Roman","Trebuchet MS","Verdana"] : [["Arial","Arial Black","Arial Narrow","Calibri","Cambria","Cambria Math","Comic Sans MS","Courier","Courier New","Georgia","Helvetica","Impact","Lucida Console","Lucida Sans Unicode","Microsoft Sans Serif","Palatino Linotype","Tahoma","Times","Times New Roman","Trebuchet MS","Verdana"]]) })
            };
          },
          configurable: true
        });
      }
    })();
    
    
    // 应用硬件信息防护
    
    // 硬件信息防护
    (function() {
      // 修改 navigator.hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: function() {
          return 4;
        }
      });
      
      // 修改 navigator.deviceMemory
      if ('deviceMemory' in navigator) {
        Object.defineProperty(navigator, 'deviceMemory', {
          get: function() {
            return 8;
          }
        });
      }
      
      // 修改 screen 属性
      Object.defineProperty(screen, 'width', {
        get: function() {
          return 1920;
        }
      });
      
      Object.defineProperty(screen, 'height', {
        get: function() {
          return 1080;
        }
      });
      
      Object.defineProperty(screen, 'colorDepth', {
        get: function() {
          return 24;
        }
      });
      
      Object.defineProperty(screen, 'pixelDepth', {
        get: function() {
          return 24;
        }
      });
      
      // 修改 window.devicePixelRatio
      Object.defineProperty(window, 'devicePixelRatio', {
        get: function() {
          return 1.0;
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
    
    
    // 应用音频指纹防护
    
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
    
    
    // 应用WebGL指纹防护
    
    // WebGL 指纹防护
    (function() {
      // 1. 干扰 getParameter 返回 vendor/renderer
      const getParameterProxyHandler = {
        apply: function(target, thisArg, args) {
          const param = args[0];
          if (param === 37445) return '"Intel Inc."'; // UNMASKED_VENDOR_WEBGL
          if (param === 37446) return '"Intel Iris OpenGL Engine"'; // UNMASKED_RENDERER_WEBGL
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
    
    
    // 应用WebRTC防护
    
    // WebRTC 防护
    (function() {
      if (false) {
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
              if (true) {
                // 在这里可以修改 SDP 选项
              }
              return originalCreateOffer.call(this, options);
            };
            
            return pc;
          };
        }
      }
    })();
    
    
    // 应用传感器防护
    
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
          const compatibleSites = window.__FINGERPRINT_CONFIG__.compatibleSites.includes('
') ?
            window.__FINGERPRINT_CONFIG__.compatibleSites.split('
') :
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
    
    
    console.log('指纹防护脚本已加载');