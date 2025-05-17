
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
    