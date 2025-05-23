
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
    