
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
    