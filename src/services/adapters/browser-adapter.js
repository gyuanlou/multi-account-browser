/**
 * 浏览器适配器基类
 * 为不同浏览器提供统一的接口
 * 基于 Playwright API 实现
 */
class BrowserAdapter {
  constructor() {
    if (this.constructor === BrowserAdapter) {
      throw new Error('BrowserAdapter 是抽象类，不能直接实例化');
    }
  }
  
  /**
   * 获取浏览器可执行文件路径
   * @returns {string} 浏览器可执行文件路径
   */
  getBrowserPath() { 
    throw new Error('必须实现 getBrowserPath 方法'); 
  }
  
  /**
   * 构建浏览器启动参数
   * @param {Object} profile 配置文件
   * @param {string} userDataDir 用户数据目录
   * @param {number} debugPort 调试端口
   * @param {Object} options 启动选项
   * @returns {Object} 启动参数对象
   */
  buildLaunchArgs(profile, userDataDir, debugPort, options) { 
    throw new Error('必须实现 buildLaunchArgs 方法'); 
  }
  
  /**
   * 启动浏览器
   * @param {string} executablePath 浏览器可执行文件路径
   * @param {Object} launchOptions 启动选项
   * @param {Object} options 其他选项
   * @returns {Promise<Object>} 浏览器上下文 (BrowserContext)
   */
  async launchBrowser(executablePath, launchOptions, options) { 
    throw new Error('必须实现 launchBrowser 方法'); 
  }
  
  /**
   * 连接到浏览器
   * @param {string} browserURL 浏览器 URL 或 WebSocket 端点
   * @returns {Promise<Object>} 浏览器上下文 (BrowserContext)
   */
  async connectToBrowser(browserURL) { 
    throw new Error('必须实现 connectToBrowser 方法'); 
  }
  
  /**
   * 应用指纹保护
   * @param {Object} context 浏览器上下文
   * @param {Object} profile 配置文件
   * @returns {Promise<void>}
   */
  async applyFingerprintProtection(context, profile) {
    throw new Error('必须实现 applyFingerprintProtection 方法');
  }
  
  /**
   * 清除浏览器缓存
   * @param {Object} context 浏览器上下文
   * @returns {Promise<Object>} 清除结果
   */
  async clearCache(context) {
    throw new Error('必须实现 clearCache 方法');
  }
  
  /**
   * 清除本地存储
   * @param {Object} context 浏览器上下文
   * @param {string} url 网站 URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearLocalStorage(context, url) {
    throw new Error('必须实现 clearLocalStorage 方法');
  }
  
  /**
   * 清除 Cookie
   * @param {Object} context 浏览器上下文
   * @param {string} url 可选，指定网站的 URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearCookies(context, url) {
    throw new Error('必须实现 clearCookies 方法');
  }
  
  /**
   * 获取浏览器类型
   * @returns {string} 浏览器类型（chrome、edge、firefox、safari）
   */
  getBrowserType() {
    throw new Error('必须实现 getBrowserType 方法');
  }
  
  /**
   * 测试指纹保护
   * @param {Object} browser 浏览器实例
   * @returns {Promise<Array>} 测试结果
   */
  async testFingerprintProtection(browser) { 
    throw new Error('必须实现 testFingerprintProtection 方法'); 
  }
  
  /**
   * 设置代理
   * @param {Array} args 启动参数数组
   * @param {Object} proxyConfig 代理配置
   * @returns {Array} 更新后的启动参数数组
   */
  setupProxy(args, proxyConfig) { 
    throw new Error('必须实现 setupProxy 方法'); 
  }
  
  /**
   * 测试代理
   * @param {Object} proxyConfig 代理配置
   * @returns {Promise<Object>} 测试结果
   */
  async testProxy(proxyConfig) { 
    throw new Error('必须实现 testProxy 方法'); 
  }
  
  /**
   * 导航到 URL
   * @param {Object} page 页面实例
   * @param {string} url URL
   * @returns {Promise<void>}
   */
  async navigateTo(page, url) { 
    throw new Error('必须实现 navigateTo 方法'); 
  }
  
  /**
   * 查询元素
   * @param {Object} page 页面实例
   * @param {string} selector 选择器
   * @returns {Promise<Object>} 元素
   */
  async querySelector(page, selector) { 
    throw new Error('必须实现 querySelector 方法'); 
  }
  
  /**
   * 点击元素
   * @param {Object} page 页面实例
   * @param {string} selector 选择器
   * @returns {Promise<void>}
   */
  async click(page, selector) { 
    throw new Error('必须实现 click 方法'); 
  }
  
  /**
   * 输入文本
   * @param {Object} page 页面实例
   * @param {string} selector 选择器
   * @param {string} text 文本
   * @returns {Promise<void>}
   */
  async type(page, selector, text) { 
    throw new Error('必须实现 type 方法'); 
  }
  
  /**
   * 截图
   * @param {Object} page 页面实例
   * @param {Object} options 截图选项
   * @returns {Promise<Buffer>} 截图数据
   */
  async screenshot(page, options) { 
    throw new Error('必须实现 screenshot 方法'); 
  }
  
  /**
   * 清除 Cookie
   * @param {Object} browser 浏览器实例
   * @returns {Promise<Object>} 清除结果
   */
  async clearCookies(browser) { 
    throw new Error('必须实现 clearCookies 方法'); 
  }
  
  /**
   * 清除本地存储
   * @param {Object} browser 浏览器实例
   * @param {string} url URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearLocalStorage(browser, url) { 
    throw new Error('必须实现 clearLocalStorage 方法'); 
  }
  
  /**
   * 获取用户数据路径
   * @param {string} baseDir 基础目录
   * @param {string} profileId 配置文件 ID
   * @returns {string} 用户数据路径
   */
  getUserDataPath(baseDir, profileId) { 
    throw new Error('必须实现 getUserDataPath 方法'); 
  }
  
  /**
   * 清理用户数据目录
   * @param {string} userDataDir 用户数据目录
   * @returns {Promise<boolean>} 清理结果
   */
  async cleanupUserData(userDataDir) { 
    throw new Error('必须实现 cleanupUserData 方法'); 
  }
}

module.exports = BrowserAdapter;
