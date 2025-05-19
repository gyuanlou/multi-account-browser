// 插件信息保护
(function() {
  // 创建空的插件数组
  const createEmptyPluginArray = function() {
    const plugins = {
      length: 0,
      item: function() { return null; },
      namedItem: function() { return null; },
      refresh: function() {},
      [Symbol.iterator]: function* () {}
    };
    return plugins;
  };
  
  // 创建空的 MIME 类型数组
  const createEmptyMimeTypeArray = function() {
    const mimeTypes = {
      length: 0,
      item: function() { return null; },
      namedItem: function() { return null; },
      [Symbol.iterator]: function* () {}
    };
    return mimeTypes;
  };
  
  // 修改 navigator.plugins
  Object.defineProperty(navigator, 'plugins', {
    get: function() {
      return createEmptyPluginArray();
    }
  });
  
  // 修改 navigator.mimeTypes
  Object.defineProperty(navigator, 'mimeTypes', {
    get: function() {
      return createEmptyMimeTypeArray();
    }
  });
  
  // 禁用 Flash 检测
  Object.defineProperty(navigator, 'pdfViewerEnabled', {
    get: function() {
      return false;
    }
  });
})();
