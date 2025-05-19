// RECTS 矩形防护
(function() {
  // 修改 Element.getBoundingClientRect
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function() {
    const rect = originalGetBoundingClientRect.call(this);
    
    // 创建一个可修改的副本
    const modifiedRect = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left
    };
    
    // 添加微小的随机偏移，不影响布局但改变指纹
    if (rect.width > 0 && rect.height > 0) {
      const noise = 0.01;  // 非常小的噪声，不影响视觉效果
      
      modifiedRect.x += (Math.random() * 2 - 1) * noise;
      modifiedRect.y += (Math.random() * 2 - 1) * noise;
      modifiedRect.width += (Math.random() * 2 - 1) * noise;
      modifiedRect.height += (Math.random() * 2 - 1) * noise;
      
      // 更新计算属性
      modifiedRect.top = modifiedRect.y;
      modifiedRect.right = modifiedRect.x + modifiedRect.width;
      modifiedRect.bottom = modifiedRect.y + modifiedRect.height;
      modifiedRect.left = modifiedRect.x;
    }
    
    return modifiedRect;
  };
  
  // 修改 Element.getClientRects
  const originalGetClientRects = Element.prototype.getClientRects;
  Element.prototype.getClientRects = function() {
    const originalRects = originalGetClientRects.call(this);
    
    // 创建一个新的 DOMRectList 类似对象
    const modifiedRects = {
      length: originalRects.length,
      item: function(index) {
        if (index >= this.length) return null;
        return this[index];
      },
      [Symbol.iterator]: function* () {
        for (let i = 0; i < this.length; i++) {
          yield this[i];
        }
      }
    };
    
    // 复制并修改每个 DOMRect
    for (let i = 0; i < originalRects.length; i++) {
      const rect = originalRects[i];
      
      // 创建修改后的矩形
      modifiedRects[i] = {
        x: rect.x + (Math.random() * 0.02 - 0.01),
        y: rect.y + (Math.random() * 0.02 - 0.01),
        width: rect.width + (Math.random() * 0.02 - 0.01),
        height: rect.height + (Math.random() * 0.02 - 0.01)
      };
      
      // 更新计算属性
      modifiedRects[i].top = modifiedRects[i].y;
      modifiedRects[i].right = modifiedRects[i].x + modifiedRects[i].width;
      modifiedRects[i].bottom = modifiedRects[i].y + modifiedRects[i].height;
      modifiedRects[i].left = modifiedRects[i].x;
    }
    
    return modifiedRects;
  };
})();
