/**
 * Brave 风格的字体指纹防护
 * 基于 Brave 浏览器的字体防护技术
 */

(function() {
  // 保存原始方法
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
  const originalGetComputedStyle = window.getComputedStyle;
  
  // 标准字体列表 - 这些字体在大多数系统上都可用
  const standardFonts = [
    'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria', 'Cambria Math', 
    'Comic Sans MS', 'Courier', 'Courier New', 'Georgia', 'Helvetica', 
    'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif', 
    'Palatino Linotype', 'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana'
  ];
  
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
  
  // 检查字体是否是标准字体
  function isStandardFont(fontFamily) {
    // 移除引号和处理字体列表
    const fontName = fontFamily.replace(/['"]/g, '').split(',')[0].trim();
    return standardFonts.some(font => 
      fontName.toLowerCase() === font.toLowerCase()
    );
  }
  
  // 拦截 measureText 方法
  CanvasRenderingContext2D.prototype.measureText = function(text) {
    // 获取当前字体
    const currentFont = this.font;
    const fontFamily = currentFont.split(' ').slice(-1)[0];
    
    // 检查是否使用非标准字体
    if (!isStandardFont(fontFamily)) {
      // 临时使用标准字体
      const originalFont = this.font;
      
      // 选择一个标准字体替代
      const seed = getFingerprinterSeed();
      const standardFont = standardFonts[Math.floor(seededRandom(seed) * standardFonts.length)];
      
      // 保持字体大小和样式，但替换字体族
      const fontParts = originalFont.split(' ');
      fontParts[fontParts.length - 1] = `"${standardFont}"`;
      this.font = fontParts.join(' ');
      
      // 使用标准字体测量
      const result = originalMeasureText.call(this, text);
      
      // 恢复原始字体
      this.font = originalFont;
      
      // 添加微小的随机偏移
      const width = result.width;
      const seedForText = seed + text.length;
      const widthOffset = (seededRandom(seedForText) * 0.02 - 0.01) * width; // ±1% 偏移
      
      // 修改宽度
      Object.defineProperty(result, 'width', {
        get: function() {
          return width + widthOffset;
        }
      });
      
      return result;
    }
    
    // 对于标准字体，添加微小的随机偏移
    const result = originalMeasureText.call(this, text);
    const width = result.width;
    
    const seed = getFingerprinterSeed();
    const seedForText = seed + text.length;
    const widthOffset = (seededRandom(seedForText) * 0.01 - 0.005) * width; // ±0.5% 偏移
    
    // 修改宽度
    Object.defineProperty(result, 'width', {
      get: function() {
        return width + widthOffset;
      }
    });
    
    return result;
  };
  
  // 拦截 getComputedStyle 方法
  window.getComputedStyle = function(element, pseudoElt) {
    const result = originalGetComputedStyle.call(window, element, pseudoElt);
    
    // 保存原始的 getPropertyValue 方法
    const originalGetPropertyValue = result.getPropertyValue;
    
    // 拦截 getPropertyValue 方法
    result.getPropertyValue = function(property) {
      // 如果查询的是字体相关属性
      if (property === 'font-family' || property === 'font') {
        const value = originalGetPropertyValue.call(this, property);
        
        // 检查是否包含非标准字体
        const fontFamily = value.split(',')[0].trim();
        if (!isStandardFont(fontFamily)) {
          // 返回一个标准字体
          const seed = getFingerprinterSeed();
          const standardFont = standardFonts[Math.floor(seededRandom(seed) * standardFonts.length)];
          
          // 如果是 'font' 属性，保留除字体族外的所有部分
          if (property === 'font') {
            const fontParts = value.split(' ');
            fontParts[fontParts.length - 1] = `"${standardFont}"`;
            return fontParts.join(' ');
          }
          
          return `"${standardFont}"`;
        }
      }
      
      return originalGetPropertyValue.call(this, property);
    };
    
    return result;
  };
  
  // 拦截 FontFace API
  if (window.FontFace) {
    const originalFontFace = window.FontFace;
    
    window.FontFace = function(family, source, descriptors) {
      console.log(`拦截 FontFace 加载: ${family}`);
      
      // 对于非标准字体，可以选择阻止加载或替换为标准字体
      if (!isStandardFont(family)) {
        const seed = getFingerprinterSeed();
        const standardFont = standardFonts[Math.floor(seededRandom(seed) * standardFonts.length)];
        
        // 可以选择:
        // 1. 阻止加载: 返回一个无效的 FontFace 对象
        // 2. 替换为标准字体: 使用标准字体创建 FontFace
        // 这里选择替换为标准字体
        return new originalFontFace(standardFont, source, descriptors);
      }
      
      return new originalFontFace(family, source, descriptors);
    };
  }
  
  // 拦截 document.fonts API
  if (document.fonts && document.fonts.load) {
    const originalLoad = document.fonts.load;
    
    document.fonts.load = function(font, text) {
      const fontFamily = font.split(' ').slice(-1)[0].replace(/['"]/g, '');
      
      if (!isStandardFont(fontFamily)) {
        console.log(`拦截 document.fonts.load: ${font}`);
        
        const seed = getFingerprinterSeed();
        const standardFont = standardFonts[Math.floor(seededRandom(seed) * standardFonts.length)];
        
        // 替换为标准字体
        const fontParts = font.split(' ');
        fontParts[fontParts.length - 1] = `"${standardFont}"`;
        const newFont = fontParts.join(' ');
        
        return originalLoad.call(this, newFont, text);
      }
      
      return originalLoad.call(this, font, text);
    };
  }
  
  console.log('Brave 风格的字体指纹防护已启用');
})();
