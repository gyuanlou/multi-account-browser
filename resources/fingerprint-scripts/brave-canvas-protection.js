/**
 * Brave 风格的 Canvas 指纹防护
 * 基于 Brave 浏览器的 Canvas 防护技术
 */

(function() {
  // 获取配置，如果没有配置则使用默认值
  const config = window.__FINGERPRINT_CONFIG__ || {
    canvasProtection: true,
    randomSeed: Math.floor(Math.random() * 2147483647)
  };
  
  // 调试日志函数
  const debugEnabled = config.debug || false;
  function debugLog(...args) {
    if (debugEnabled) {
      console.log(...args);
    }
  }
  
  debugLog('[指纹防护] Canvas 防护已启用');
  debugLog('[指纹防护] 使用随机种子:', config.randomSeed);
  
  // 保存原始方法
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalToBlob = HTMLCanvasElement.prototype.toBlob;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  const originalReadPixels = WebGLRenderingContext.prototype.readPixels;
  const originalReadPixelsWebGL2 = WebGL2RenderingContext.prototype ? WebGL2RenderingContext.prototype.readPixels : null;
  
  // 使用配置中的随机种子，或生成一个新的随机种子
  const SEED = config.randomSeed || Math.floor(Math.random() * 2147483647);
  
  // 全局种子值，用于生成一致的随机数
  let globalSeed = SEED;
  
  // 生成一致的随机数
  function seededRandom() {
    globalSeed = (globalSeed * 9301 + 49297) % 233280;
    return globalSeed / 233280;
  }
  
  // 获取指纹种子，结合域名和全局种子
  function getFingerprinterSeed() {
    const domain = window.location.hostname || 'unknown';
    let domainSeed = 0;
    for (let i = 0; i < domain.length; i++) {
      domainSeed = ((domainSeed << 5) - domainSeed) + domain.charCodeAt(i);
      domainSeed = domainSeed & domainSeed; // 转换为32位整数
    }
    // 结合域名种子和全局种子，确保同一域名在同一配置下生成相同的噪声
    return Math.abs(domainSeed + SEED);
  }
  
  // 添加噪声到 ImageData
  function addNoiseToImageData(imageData, seed) {
    const data = imageData.data;
    const noise = 5; // 噪声强度
    
    // 生成确定性的噪声模式
    let noiseSeed = seed;
    for (let i = 0; i < data.length; i += 4) {
      // 只修改一小部分像素，以保持图像基本不变
      if (Math.abs(Math.sin(noiseSeed++ * 0.1)) < 0.05) {
        // 对 RGB 通道添加微小噪声
        const noiseValue = Math.floor(Math.abs(Math.sin(noiseSeed * 0.1)) * noise * 2 - noise);
        data[i] = Math.max(0, Math.min(255, data[i] + noiseValue));
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + noiseValue));
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + noiseValue));
        // 不修改 Alpha 通道
        noiseSeed++;
      }
    }
    
    return imageData;
  }
  
  // 添加噪声到 ArrayBuffer
  function addNoiseToArrayBuffer(buffer, seed) {
    const view = new Uint8Array(buffer);
    const noise = 5; // 噪声强度
    
    // 使用确定性随机数添加噪声
    let currentSeed = seed;
    for (let i = 0; i < view.length; i++) {
      // 只修改一小部分值，以保持数据基本不变
      if (seededRandom(currentSeed++) < 0.05) {
        view[i] = Math.max(0, Math.min(255, view[i] + Math.floor(seededRandom(currentSeed++) * noise * 2 - noise)));
      }
    }
    
    return buffer;
  }
  
  // 拦截 getContext 方法
  HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
    const context = originalGetContext.call(this, contextType, ...args);
    
    // 如果是 2D 上下文，拦截 getImageData 方法
    if (contextType === '2d' && context) {
      const seed = getFingerprinterSeed();
      
      // 拦截 getImageData
      context.getImageData = function(sx, sy, sw, sh) {
        const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
        
        // 检测是否可能是指纹收集
        const isTiny = (sw < 16 || sh < 16);
        const isHidden = (this.canvas.width === 0 || this.canvas.height === 0 || 
                          this.canvas.style.display === 'none' || 
                          this.canvas.style.visibility === 'hidden');
        
        // 如果是小画布或隐藏画布，更可能是指纹收集
        if (isTiny || isHidden) {
          return addNoiseToImageData(imageData, seed);
        }
        
        return imageData;
      };
    }
    
    // 如果是 WebGL 上下文，拦截 readPixels 方法
    if ((contextType === 'webgl' || contextType === 'experimental-webgl') && context) {
      const seed = getFingerprinterSeed();
      
      // 拦截 readPixels
      context.readPixels = function(x, y, width, height, format, type, pixels) {
        originalReadPixels.call(this, x, y, width, height, format, type, pixels);
        
        // 检测是否可能是指纹收集
        const isTiny = (width < 16 || height < 16);
        const isHidden = (this.canvas.width === 0 || this.canvas.height === 0 || 
                          this.canvas.style.display === 'none' || 
                          this.canvas.style.visibility === 'hidden');
        
        // 如果是小画布或隐藏画布，更可能是指纹收集
        if (isTiny || isHidden) {
          addNoiseToArrayBuffer(pixels.buffer || pixels, seed);
        }
        
        return pixels;
      };
    }
    
    // 如果是 WebGL2 上下文，拦截 readPixels 方法
    if (contextType === 'webgl2' && context && originalReadPixelsWebGL2) {
      const seed = getFingerprinterSeed();
      
      // 拦截 readPixels
      context.readPixels = function(x, y, width, height, format, type, pixels) {
        originalReadPixelsWebGL2.call(this, x, y, width, height, format, type, pixels);
        
        // 检测是否可能是指纹收集
        const isTiny = (width < 16 || height < 16);
        const isHidden = (this.canvas.width === 0 || this.canvas.height === 0 || 
                          this.canvas.style.display === 'none' || 
                          this.canvas.style.visibility === 'hidden');
        
        // 如果是小画布或隐藏画布，更可能是指纹收集
        if (isTiny || isHidden) {
          addNoiseToArrayBuffer(pixels.buffer || pixels, seed);
        }
        
        return pixels;
      };
    }
    
    return context;
  };
  
  // 拦截 toDataURL 方法
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    // 检测是否可能是指纹收集
    const isTiny = (this.width < 16 || this.height < 16);
    const isHidden = (this.width === 0 || this.height === 0 || 
                      this.style.display === 'none' || 
                      this.style.visibility === 'hidden');
    
    // 如果是小画布或隐藏画布，更可能是指纹收集
    if (isTiny || isHidden) {
      // 获取原始数据
      const dataURL = originalToDataURL.apply(this, args);
      
      // 如果是空白画布，直接返回原始数据
      if (dataURL === 'data:,') {
        return dataURL;
      }
      
      // 创建一个临时画布来添加噪声
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.width;
      tempCanvas.height = this.height;
      
      const ctx = tempCanvas.getContext('2d');
      const img = new Image();
      img.src = dataURL;
      
      // 同步绘制图像
      ctx.drawImage(img, 0, 0);
      
      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      
      // 添加噪声
      const seed = getFingerprinterSeed();
      addNoiseToImageData(imageData, seed);
      
      // 将修改后的图像数据放回画布
      ctx.putImageData(imageData, 0, 0);
      
      // 返回修改后的数据 URL
      return tempCanvas.toDataURL(...args);
    }
    
    // 对于正常使用的画布，返回原始数据
    return originalToDataURL.apply(this, args);
  };
  
  // 拦截 toBlob 方法
  HTMLCanvasElement.prototype.toBlob = function(callback, ...args) {
    // 检测是否可能是指纹收集
    const isTiny = (this.width < 16 || this.height < 16);
    const isHidden = (this.width === 0 || this.height === 0 || 
                      this.style.display === 'none' || 
                      this.style.visibility === 'hidden');
    
    // 如果是小画布或隐藏画布，更可能是指纹收集
    if (isTiny || isHidden) {
      // 创建一个临时画布来添加噪声
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.width;
      tempCanvas.height = this.height;
      
      const ctx = tempCanvas.getContext('2d');
      
      // 将原始画布内容绘制到临时画布
      ctx.drawImage(this, 0, 0);
      
      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      
      // 添加噪声
      const seed = getFingerprinterSeed();
      addNoiseToImageData(imageData, seed);
      
      // 将修改后的图像数据放回临时画布
      ctx.putImageData(imageData, 0, 0);
      
      // 使用临时画布生成 Blob
      return originalToBlob.call(tempCanvas, callback, ...args);
    }
    
    // 对于正常使用的画布，使用原始方法
    return originalToBlob.apply(this, [callback, ...args]);
  };
  
  console.log('Brave 风格的 Canvas 指纹防护已启用');
})();
