/**
 * 指纹防护扩展 - 背景脚本
 * 负责修改 HTTP 请求头，防止通过请求头识别浏览器指纹
 */

// 存储配置信息
let config = {
  userAgent: '',
  acceptLanguage: '',
  platform: '',
  doNotTrack: '1'
};

// 接收来自主应用的配置信息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateConfig') {
    config = { ...config, ...message.config };
    sendResponse({ success: true });
  } else if (message.type === 'getConfig') {
    sendResponse(config);
  }
});

// 修改请求头
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // 跳过扩展自身的请求
    if (details.initiator && details.initiator.startsWith('chrome-extension://')) {
      return { requestHeaders: details.requestHeaders };
    }

    // 修改 User-Agent
    if (config.userAgent) {
      const uaIndex = details.requestHeaders.findIndex(h => h.name.toLowerCase() === 'user-agent');
      if (uaIndex !== -1) {
        details.requestHeaders[uaIndex].value = config.userAgent;
      }
    }

    // 修改 Accept-Language
    if (config.acceptLanguage) {
      const langIndex = details.requestHeaders.findIndex(h => h.name.toLowerCase() === 'accept-language');
      if (langIndex !== -1) {
        details.requestHeaders[langIndex].value = config.acceptLanguage;
      } else {
        details.requestHeaders.push({
          name: 'Accept-Language',
          value: config.acceptLanguage
        });
      }
    }

    // 添加 DNT (Do Not Track) 头
    const dntIndex = details.requestHeaders.findIndex(h => h.name.toLowerCase() === 'dnt');
    if (dntIndex !== -1) {
      details.requestHeaders[dntIndex].value = config.doNotTrack;
    } else {
      details.requestHeaders.push({
        name: 'DNT',
        value: config.doNotTrack
      });
    }

    return { requestHeaders: details.requestHeaders };
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'requestHeaders']
);

// 通知内容脚本配置已更新
function notifyContentScripts() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'configUpdated',
        config
      }).catch(() => {
        // 忽略错误，可能是页面还没有加载内容脚本
      });
    });
  });
}

// 配置更新后通知内容脚本
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'updateConfig') {
    notifyContentScripts();
  }
});
