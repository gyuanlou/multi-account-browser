
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
    