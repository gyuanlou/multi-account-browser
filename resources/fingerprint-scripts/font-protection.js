
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
    