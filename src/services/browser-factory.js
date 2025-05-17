/**
 * 浏览器工厂
 * 负责检测系统中已安装的浏览器并创建适当的适配器
 * 统一使用 Playwright 实现
 */
const fs = require('fs');
const path = require('path');

// 导入适配器类
// 使用基于 Playwright 的适配器
let ChromeAdapter, EdgeAdapter, SafariAdapter, FirefoxAdapter;

// 使用延迟加载避免循环依赖
function loadAdapters() {
  if (!ChromeAdapter) {
    try {
      ChromeAdapter = require('./adapters/chrome-adapter');
    } catch (e) {
      console.warn('Chrome 适配器加载失败:', e.message);
    }
  }
  
  if (!EdgeAdapter) {
    try {
      EdgeAdapter = require('./adapters/edge-adapter');
    } catch (e) {
      console.warn('Edge 适配器加载失败:', e.message);
    }
  }
  
  if (!SafariAdapter) {
    try {
      SafariAdapter = require('./adapters/safari-adapter');
    } catch (e) {
      console.warn('Safari 适配器加载失败:', e.message);
    }
  }
  
  if (!FirefoxAdapter) {
    try {
      FirefoxAdapter = require('./adapters/firefox-adapter');
    } catch (e) {
      console.warn('Firefox 适配器加载失败:', e.message);
    }
  }
}

class BrowserFactory {
  constructor() {
    // 延迟加载适配器
    loadAdapters();
    
    this.adapters = {
      chrome: ChromeAdapter,
      edge: EdgeAdapter,
      safari: SafariAdapter,
      firefox: FirefoxAdapter
    };
    
    // 默认浏览器优先级
    this.browserPriority = {
      win32: ['chrome', 'edge', 'firefox'],
      darwin: ['chrome', 'safari', 'firefox'],
      linux: ['chrome', 'firefox']
    };
  }
  
  /**
   * 检测系统中已安装的浏览器
   * @returns {Array} 已安装的浏览器列表
   */
  detectInstalledBrowsers() {
    const installedBrowsers = [];
    const platform = process.platform;
    
    // 根据不同平台检测浏览器
    if (platform === 'win32') {
      // Windows 浏览器路径
      const paths = {
        chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        firefox: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe'
      };
      
      for (const [browser, browserPath] of Object.entries(paths)) {
        if (fs.existsSync(browserPath)) {
          installedBrowsers.push(browser);
        }
      }
    } else if (platform === 'darwin') {
      // macOS 浏览器路径
      const paths = {
        chrome: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        safari: '/Applications/Safari.app/Contents/MacOS/Safari',
        firefox: '/Applications/Firefox.app/Contents/MacOS/firefox'
      };
      
      for (const [browser, browserPath] of Object.entries(paths)) {
        if (fs.existsSync(browserPath)) {
          installedBrowsers.push(browser);
        }
      }
    } else if (platform === 'linux') {
      // Linux 浏览器路径
      const chromePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
      ];
      
      const firefoxPaths = [
        '/usr/bin/firefox',
        '/usr/bin/firefox-esr'
      ];
      
      for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
          installedBrowsers.push('chrome');
          break;
        }
      }
      
      for (const firefoxPath of firefoxPaths) {
        if (fs.existsSync(firefoxPath)) {
          installedBrowsers.push('firefox');
          break;
        }
      }
    }
    
    return installedBrowsers;
  }
  
  /**
   * 根据优先级选择浏览器
   * @param {string} preferredBrowser 首选浏览器
   * @returns {string} 选择的浏览器
   */
  selectBrowser(preferredBrowser = null) {
    // 如果指定了浏览器且已安装，则使用指定的浏览器
    if (preferredBrowser && this.isInstalled(preferredBrowser)) {
      return preferredBrowser;
    }
    
    // 否则按优先级选择
    const installedBrowsers = this.detectInstalledBrowsers();
    const platform = process.platform;
    const priority = this.browserPriority[platform] || ['chrome', 'firefox'];
    
    for (const browser of priority) {
      if (installedBrowsers.includes(browser)) {
        return browser;
      }
    }
    
    throw new Error('找不到支持的浏览器，请安装 Chrome、Edge、Safari 或 Firefox');
  }
  
  /**
   * 检查特定浏览器是否已安装
   * @param {string} browser 浏览器类型
   * @returns {boolean} 是否已安装
   */
  isInstalled(browser) {
    return this.detectInstalledBrowsers().includes(browser);
  }
  
  /**
   * 创建适配器实例
   * @param {string} browser 浏览器类型
   * @returns {Object} 适配器实例
   */
  createAdapter(browser = null) {
    // 确保适配器已加载
    loadAdapters();
    
    // 如果指定了 'system'，则自动选择系统默认浏览器
    let selectedBrowser = browser;
    if (!browser || browser === 'system') {
      selectedBrowser = this.selectBrowser();
      console.log(`使用系统默认浏览器: ${selectedBrowser}`);
    }
    
    const AdapterClass = this.adapters[selectedBrowser];
    
    if (!AdapterClass) {
      throw new Error(`不支持的浏览器类型: ${selectedBrowser}`);
    }
    
    return new AdapterClass();
  }
}

module.exports = new BrowserFactory();
