
    // 字体指纹防护
    (function() {
      // 重写 document.fonts.check 方法
      if (document.fonts && document.fonts.check) {
        const originalCheck = document.fonts.check;
        document.fonts.check = function(font, text) {
          // 允许检测的字体列表
          const allowedFonts = {{ALLOWED_FONTS}};
          
          // 检查是否是允许的字体
          for (const allowedFont of allowedFonts) {
            if (font.includes(allowedFont)) {
              return originalCheck.call(this, font, text);
            }
          }
          
          // 对于不在允许列表中的字体，随机返回结果
          if ({{RANDOM_FONT_DETECTION}}) {
            return Math.random() > 0.5;
          }
          
          // 默认返回 false
          return false;
        };
      }
      
      // 修改 CSS 字体检测
      if (window.CSSFontFaceRule) {
        const originalGetPropertyValue = window.CSSStyleDeclaration.prototype.getPropertyValue;
        window.CSSStyleDeclaration.prototype.getPropertyValue = function(property) {
          if (property === 'font-family') {
            const value = originalGetPropertyValue.call(this, property);
            // 这里可以添加字体混淆逻辑
            return value;
          }
          return originalGetPropertyValue.call(this, property);
        };
      }
    })();
    