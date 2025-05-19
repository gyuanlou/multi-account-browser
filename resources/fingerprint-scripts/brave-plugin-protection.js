/**
 * Brave 风格的插件信息指纹防护
 * 基于 Brave 浏览器的插件信息防护技术
 */

(function() {
  // 创建一个空的插件列表
  const emptyPluginArray = Object.create(PluginArray.prototype);
  Object.defineProperty(emptyPluginArray, 'length', { value: 0 });
  
  // 创建一个空的 MIME 类型列表
  const emptyMimeTypeArray = Object.create(MimeTypeArray.prototype);
  Object.defineProperty(emptyMimeTypeArray, 'length', { value: 0 });
  
  // 拦截 navigator.plugins
  Object.defineProperty(navigator, 'plugins', {
    get: function() {
      return emptyPluginArray;
    }
  });
  
  // 拦截 navigator.mimeTypes
  Object.defineProperty(navigator, 'mimeTypes', {
    get: function() {
      return emptyMimeTypeArray;
    }
  });
  
  // 拦截 navigator.pdfViewerEnabled
  if (navigator.pdfViewerEnabled !== undefined) {
    Object.defineProperty(navigator, 'pdfViewerEnabled', {
      get: function() {
        return false;
      }
    });
  }
  
  // 拦截 navigator.javaEnabled
  const originalJavaEnabled = navigator.javaEnabled;
  navigator.javaEnabled = function() {
    return false;
  };
  
  // 拦截 Plugin 构造函数
  if (window.Plugin) {
    const originalPlugin = window.Plugin;
    window.Plugin = function(name, description, filename, length) {
      return new originalPlugin(name, description, filename, length);
    };
  }
  
  // 拦截 MimeType 构造函数
  if (window.MimeType) {
    const originalMimeType = window.MimeType;
    window.MimeType = function(type, description, suffixes, plugin) {
      return new originalMimeType(type, description, suffixes, plugin);
    };
  }
  
  // 拦截 navigator.plugins.refresh
  if (navigator.plugins.refresh) {
    navigator.plugins.refresh = function(reloadDocuments) {
      // 不执行任何操作
    };
  }
  
  // 拦截 navigator.plugins.item
  if (navigator.plugins.item) {
    navigator.plugins.item = function(index) {
      return undefined;
    };
  }
  
  // 拦截 navigator.plugins.namedItem
  if (navigator.plugins.namedItem) {
    navigator.plugins.namedItem = function(name) {
      return undefined;
    };
  }
  
  // 拦截 navigator.mimeTypes.item
  if (navigator.mimeTypes.item) {
    navigator.mimeTypes.item = function(index) {
      return undefined;
    };
  }
  
  // 拦截 navigator.mimeTypes.namedItem
  if (navigator.mimeTypes.namedItem) {
    navigator.mimeTypes.namedItem = function(name) {
      return undefined;
    };
  }
  
  // 拦截 navigator.plugins 的 forEach 方法
  if (navigator.plugins.forEach) {
    navigator.plugins.forEach = function(callback, thisArg) {
      // 不执行任何操作
    };
  }
  
  // 拦截 navigator.mimeTypes 的 forEach 方法
  if (navigator.mimeTypes.forEach) {
    navigator.mimeTypes.forEach = function(callback, thisArg) {
      // 不执行任何操作
    };
  }
  
  // 拦截 navigator.plugins 的索引访问
  for (let i = 0; i < 10; i++) {
    Object.defineProperty(navigator.plugins, i, {
      get: function() {
        return undefined;
      }
    });
  }
  
  // 拦截 navigator.mimeTypes 的索引访问
  for (let i = 0; i < 10; i++) {
    Object.defineProperty(navigator.mimeTypes, i, {
      get: function() {
        return undefined;
      }
    });
  }
  
  // 拦截 navigator.plugins 的常见插件名称
  const commonPluginNames = [
    'Chrome PDF Plugin',
    'Chrome PDF Viewer',
    'Native Client',
    'Shockwave Flash',
    'Adobe Acrobat',
    'QuickTime Plugin',
    'Java Applet Plug-in',
    'Silverlight Plug-In',
    'Microsoft Office',
    'Windows Media Player Plug-in'
  ];
  
  // 为每个常见插件名称添加属性拦截
  commonPluginNames.forEach(function(name) {
    Object.defineProperty(navigator.plugins, name, {
      get: function() {
        return undefined;
      }
    });
  });
  
  // 拦截 navigator.mimeTypes 的常见 MIME 类型
  const commonMimeTypes = [
    'application/pdf',
    'application/x-google-chrome-pdf',
    'application/x-nacl',
    'application/x-pnacl',
    'application/x-shockwave-flash',
    'application/futuresplash',
    'application/x-java-applet',
    'application/x-silverlight',
    'application/x-silverlight-2',
    'video/quicktime',
    'application/x-mplayer2'
  ];
  
  // 为每个常见 MIME 类型添加属性拦截
  commonMimeTypes.forEach(function(type) {
    Object.defineProperty(navigator.mimeTypes, type, {
      get: function() {
        return undefined;
      }
    });
  });
  
  console.log('Brave 风格的插件信息指纹防护已启用');
})();
