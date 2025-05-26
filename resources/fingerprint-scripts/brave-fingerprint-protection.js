
        // Brave风格指纹防护脚本
        // 生成时间: 2025-05-26T12:10:21.963Z
        
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
          compatibleSites: 'aliyun.com\nalipay.com\ntaobao.com\ntmall.com\nweibo.com\nqq.com\nbaidu.com',
          time: '2025-05-26T12:10:21.963Z'
        };
        
        // 添加域名隔离的指纹种子生成
        
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
          const sessionKey = 'Mon May 26 2025';
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
    
        
        // 应用增强版Canvas指纹防护
        
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
            const noise = 15;
            if (noise > 0) {
              const data = imageData.data;
              for (let i = 0; i < data.length; i += 4) {
                // 随机调整 RGB 值
                data[i] = Math.max(0, Math.min(255, data[i] + (window.__domainFingerprint.random() * 2 - 1) * noise));
                data[i+1] = Math.max(0, Math.min(255, data[i+1] + (window.__domainFingerprint.random() * 2 - 1) * noise));
                data[i+2] = Math.max(0, Math.min(255, data[i+2] + (window.__domainFingerprint.random() * 2 - 1) * noise));
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
            const noise = 15;
            if (noise > 0) {
              pixel[0] = Math.max(0, Math.min(255, pixel[0] + (window.__domainFingerprint.random() * 2 - 1) * noise));
              pixel[1] = Math.max(0, Math.min(255, pixel[1] + (window.__domainFingerprint.random() * 2 - 1) * noise));
              pixel[2] = Math.max(0, Math.min(255, pixel[2] + (window.__domainFingerprint.random() * 2 - 1) * noise));
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
                return '"Google Inc."';
              }
              
              if (param === 37446) { // UNMASKED_RENDERER_WEBGL
                return '"ANGLE (Google, Vulkan 1.3.0)"';
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
    
        
        // 应用增强版字体指纹防护
        
    // 字体指纹防护
    (function() {
      // 1. 重写 document.fonts.check，干扰字体检测
      if (document.fonts && document.fonts.check) {
        const originalCheck = document.fonts.check;
        document.fonts.check = function(font, text) {
          const allowedFonts = ["Arial","Arial Black","Arial Narrow","Calibri","Cambria","Cambria Math","Comic Sans MS","Courier","Courier New","Georgia"];
          for (const allowedFont of allowedFonts) {
            if (font.includes(allowedFont)) {
              // 对允许的字体正常返回
              return originalCheck.call(this, font, text);
            }
          }
          // 对不在允许列表的字体，随机返回true/false
          if (true) {
            return window.__domainFingerprint.random() > 0.5;
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
            const noise = (window.__domainFingerprint.random() - 0.5) * 0.1; // ±0.05 像素扰动
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
                const noise = (window.__domainFingerprint.random() - 0.5) * 1; // ±0.5像素扰动
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
            return ["Arial","Arial Black","Arial Narrow","Calibri","Cambria","Cambria Math","Comic Sans MS","Courier","Courier New","Georgia"].join(', ');
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
              query: () => Promise.resolve({ families: (Array.isArray(["Arial","Arial Black","Arial Narrow","Calibri","Cambria","Cambria Math","Comic Sans MS","Courier","Courier New","Georgia"]) ? ["Arial","Arial Black","Arial Narrow","Calibri","Cambria","Cambria Math","Comic Sans MS","Courier","Courier New","Georgia"] : [["Arial","Arial Black","Arial Narrow","Calibri","Cambria","Cambria Math","Comic Sans MS","Courier","Courier New","Georgia"]]) })
            };
          },
          configurable: true
        });
      }
    })();
    
        
        // 应用增强版硬件信息防护
        
    // 硬件信息防护
    (function() {
      // 修改 navigator.hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: function() {
          return 8;
        }
      });
      
      // 修改 navigator.deviceMemory
      if ('deviceMemory' in navigator) {
        Object.defineProperty(navigator, 'deviceMemory', {
          get: function() {
            return 16;
          }
        });
      }
      
      // 修改 screen 属性
      Object.defineProperty(screen, 'width', {
        get: function() {
          return 2560;
        }
      });
      
      Object.defineProperty(screen, 'height', {
        get: function() {
          return 1440;
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
          return 2.0;
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
    
        
        // 应用增强版音频指纹防护
        
    // 音频指纹防护
    (function() {
      // 1. 干扰 OfflineAudioContext.prototype.getChannelData
      if (window.OfflineAudioContext && OfflineAudioContext.prototype.getChannelData) {
        const originalGetChannelData = OfflineAudioContext.prototype.getChannelData;
        OfflineAudioContext.prototype.getChannelData = function() {
          const data = originalGetChannelData.apply(this, arguments);
          // 每隔一定间隔加微小噪声
          for (let i = 0; i < data.length; i += 100) {
            data[i] = data[i] + (window.__domainFingerprint.random() - 0.5) * 1e-5;
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
                array[i] = array[i] + (window.__domainFingerprint.random() - 0.5) * 1e-3;
              }
              return originalGetFloatFrequencyData.call(this, array);
            };
          }
          return analyser;
        };
      }
    })();
    
        
        // 应用增强版WebGL指纹防护
        
    // WebGL 指纹防护
    (function() {
      // 1. 干扰 getParameter 返回 vendor/renderer
      const getParameterProxyHandler = {
        apply: function(target, thisArg, args) {
          const param = args[0];
          if (param === 37445) return '"Google Inc."'; // UNMASKED_VENDOR_WEBGL
          if (param === 37446) return '"ANGLE (Google, Vulkan 1.3.0)"'; // UNMASKED_RENDERER_WEBGL
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
    
        
        // 应用增强版WebRTC防护
        
    // WebRTC 防护
    (function() {
      if (true) {
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
        })();