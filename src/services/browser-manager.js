/**
 * 浏览器管理服务
 * 负责浏览器实例的启动、关闭和控制
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium, firefox, webkit } = require('playwright');
const profileManager = require('./profile-manager');
const browserFactory = require('./browser-factory');

// 延迟加载 electron 模块
let electron;
function getElectron() {
  if (!electron) {
    electron = require('electron');
  }
  return electron;
}

class BrowserManager {
  constructor() {
    // 存储所有运行中的浏览器实例
    this.browserInstances = new Map();
    this.initialized = false;
    
    // 浏览器适配器缓存
    this.browserAdapters = new Map();
    
    // 延迟初始化，在需要时才设置事件监听
    this.init();
  }
  
  /**
   * 初始化浏览器管理器
   */
  init() {
    // 如果已经初始化，直接返回
    if (this.initialized) return;
    
    try {
      // 仅在主进程中运行时设置事件监听
      if (process.type === 'browser') {
        const { app } = getElectron();
        
        // 清理函数，确保应用退出时关闭所有浏览器实例
        if (app.isReady()) {
          app.on('will-quit', () => {
            this.closeAllInstances();
          });
          this.initialized = true;
        } else {
          app.on('ready', () => {
            app.on('will-quit', () => {
              this.closeAllInstances();
            });
            this.initialized = true;
          });
        }
      }
    } catch (error) {
      console.error('初始化浏览器管理器失败:', error);
    }
  }
  
  /**
   * 启动浏览器实例
   * @param {string} profileId 配置文件 ID
   * @param {Object} options 启动选项
   * @param {string} options.url 要访问的网址
   * @returns {Promise<Object>} 浏览器实例
   */
  async launchBrowser(profileId, options = {}) {
    // 获取配置文件
    const profile = await profileManager.getProfileById(profileId);
    if (!profile) {
      throw new Error(`找不到配置文件: ${profileId}`);
    }
    
    // 检查是否已有运行中的实例
    if (this.browserInstances.has(profileId)) {
      const instance = this.browserInstances.get(profileId);
      if (instance.status === 'running') {
        console.log(`浏览器实例已在运行中: ${profileId}`);
        return instance.browser;
      }
    }
    
    // 确保用户数据目录存在
    const app = getElectron().app;
    const baseUserDataDir = path.join(app.getPath('userData'), 'browser_profiles');
    
    // 获取浏览器类型
    const browserType = profile.startup?.browser || 'system';
    
    // 获取浏览器适配器
    let adapter;
    if (this.browserAdapters.has(browserType)) {
      adapter = this.browserAdapters.get(browserType);
    } else {
      adapter = browserFactory.createAdapter(browserType);
      this.browserAdapters.set(browserType, adapter);
    }
    
    // 获取浏览器特定的用户数据目录
    const userDataDir = adapter.getUserDataPath(baseUserDataDir, profileId);
    
    if (!fs.existsSync(userDataDir)) {
      try {
        fs.mkdirSync(userDataDir, { recursive: true });
        console.log(`创建用户数据目录: ${userDataDir}`);
      } catch (e) {
        console.error(`创建用户数据目录失败: ${userDataDir}`, e);
      }
    }
    
    // 清理浏览器特定的锁定文件
    try {
      await adapter.cleanupUserData(userDataDir);
      console.log(`清理浏览器用户数据目录成功: ${userDataDir}`);
    } catch (error) {
      console.error(`清理浏览器用户数据目录失败: ${error.message}`);
    }
    
    // 生成调试端口
    const debugPort = 9222 + Math.floor(Math.random() * 1000);
    
    // 构建启动参数
    const launchArgs = adapter.buildLaunchArgs(profile, userDataDir, debugPort, options);
    
    console.log(`正在启动 ${browserType} 浏览器，配置文件 ID: ${profileId}`);
    console.log(`调试端口: ${debugPort}`);
    console.log(`用户数据目录: ${userDataDir}`);

    try {
      // 准备启动选项
      const launchOptions = { ...options };
      
      // 添加启动URL
      if (!launchOptions.url && !launchOptions.startUrl) {
        // 如果配置了启始页，使用配置的启始页
        if (profile.startup && profile.startup.startUrl) {
          launchOptions.startUrl = profile.startup.startUrl;
          console.log(`使用配置的启始页: ${launchOptions.startUrl}`);
        } else {
          // 否则使用默认启始页
          launchOptions.startUrl = 'https://www.baidu.com';
          console.log(`使用默认启始页: ${launchOptions.startUrl}`);
        }
      }
      
      // 启动浏览器
      const browser = await adapter.launchBrowser(
        adapter.getBrowserPath(),
        launchArgs,
        launchOptions
      );
      
      // 如果配置了指纹保护，应用指纹保护设置
      if (profile.fingerprintProtection && profile.fingerprintProtection.enabled) {
        // 对于 Playwright，我们传入的是 browserContext 而不是 page
        await adapter.applyFingerprintProtection(browser, profile);
      }
      
      // 创建新的实例并添加到实例列表
      const instance = {
        profileId,
        profileName: profile.name,
        profile: profile,  // 保存完整的配置文件信息
        browser,
        browserType,
        adapter,
        debugPort,
        userDataDir,
        status: 'running',
        startTime: new Date(),
        process: browser.process ? browser.process() : null
      };
      
      this.browserInstances.set(profileId, instance);
      
      // 监听浏览器关闭事件
      browser.on('disconnected', () => {
        console.log(`浏览器实例已断开连接: ${profileId}`);
        if (this.browserInstances.has(profileId)) {
          const instance = this.browserInstances.get(profileId);
          instance.status = 'closed';
          instance.endTime = new Date();
        }
      });
      
      console.log(`浏览器实例启动成功，返回实例对象`);
      return browser;
    } catch (error) {
      console.error(`启动浏览器失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 关闭浏览器实例
   * @param {string} profileId 配置文件 ID
   * @returns {boolean} 是否成功关闭
   */
  async closeBrowser(profileId) {
    if (this.browserInstances.has(profileId)) {
      const instance = this.browserInstances.get(profileId);
      try {
        // 使用 Playwright API 关闭浏览器
        if (instance.browser) {
          await instance.browser.close();
        }
        // 如果进程仍然存在，强制关闭它
        if (instance.process && !instance.process.killed) {
          instance.process.kill();
        }
        instance.status = 'closed';
        instance.endTime = new Date();
        console.log(`浏览器实例 ${profileId} 已关闭`);
        return true;
      } catch (error) {
        console.error(`关闭浏览器实例 ${profileId} 失败:`, error);
        // 即使出错，也将状态设置为关闭
        instance.status = 'closed';
        instance.endTime = new Date();
        return true;
      }
    }
    return false;
  }
  
  /**
   * 获取所有运行中的浏览器实例
   * @returns {Array} 运行中的实例列表
   */
  getRunningInstances() {
    const runningInstances = [];
    
    for (const [id, instance] of this.browserInstances.entries()) {
      // 检查实例状态
      if (instance.status === 'running') {
        try {
          // 检查浏览器是否还有效
          // Playwright 中检查浏览器是否已关闭
          if (instance.browser) {
            // 检查浏览器是否已关闭
            try {
              // 尝试访问浏览器属性或方法，如果失败则表示浏览器已关闭
              if (typeof instance.browser.isConnected === 'function') {
                if (!instance.browser.isConnected()) {
                  console.log(`浏览器实例 ${id} 已断开连接`);
                  instance.status = 'closed';
                  continue;
                }
              }
              
              // 尝试获取页面信息
              if (typeof instance.browser.pages === 'function') {
                // 非阻塞方式检查浏览器页面
                Promise.resolve().then(async () => {
                  try {
                    const pages = await instance.browser.pages();
                    if (pages.length === 0) {
                      console.log(`浏览器实例 ${id} 没有活动的页面`);
                    }
                  } catch (e) {
                    console.log(`浏览器实例 ${id} 无法获取页面，可能已经关闭: ${e.message}`);
                    instance.status = 'closed';
                  }
                });
              } else if (typeof instance.browser.contexts === 'function') {
                // 如果有 contexts 方法，尝试获取上下文
                Promise.resolve().then(async () => {
                  try {
                    const contexts = await instance.browser.contexts();
                    if (contexts.length === 0) {
                      console.log(`浏览器实例 ${id} 没有活动的上下文`);
                    }
                  } catch (e) {
                    console.log(`浏览器实例 ${id} 无法获取上下文，可能已经关闭: ${e.message}`);
                    instance.status = 'closed';
                  }
                });
              }
            } catch (e) {
              // 忽略错误，不阻塞主进程
              console.log(`检查浏览器实例 ${id} 状态时出错: ${e.message}`);
            }
          } else {
            // 浏览器实例不存在，标记为已关闭
            instance.status = 'closed';
            continue;
          }
          
          // 如果状态仍然是运行中，则返回实例信息
          if (instance.status === 'running') {
            runningInstances.push({
              profileId: id,
              profileName: instance.profile.name,
              startTime: instance.startTime,
              status: instance.status
            });
          }
        } catch (error) {
          console.error(`检查浏览器实例 ${id} 状态失败:`, error);
          // 如果检查失败，假设实例仍然运行
          runningInstances.push({
            profileId: id,
            profileName: instance.profile.name,
            startTime: instance.startTime,
            status: 'running'
          });
        }
      }
    }
    
    return runningInstances;
  }
  
  /**
   * 获取指定配置文件的运行中浏览器实例
   * @param {string} profileId 配置文件 ID
   * @returns {Object|null} 运行中的浏览器实例，如果不存在则返回 null
   */
  getRunningInstance(profileId) {
    if (!this.browserInstances.has(profileId)) {
      return null;
    }
    
    const instance = this.browserInstances.get(profileId);
    
    // 检查浏览器实例是否仍在运行
    if (instance.browser) {
      // 对于 Playwright 实例，检查 browser 对象是否存在且未关闭
      try {
        // 如果浏览器对象存在且有 isConnected 方法，则检查连接状态
        if (typeof instance.browser.isConnected === 'function' && !instance.browser.isConnected()) {
          instance.status = 'closed';
          instance.endTime = instance.endTime || new Date();
          return null;
        }
        
        // 如果没有 isConnected 方法但有 _connection 属性，也可以检查连接状态
        if (instance.browser._connection && !instance.browser._connection.isConnected()) {
          instance.status = 'closed';
          instance.endTime = instance.endTime || new Date();
          return null;
        }
        
        // 如果以上检查都通过，则认为浏览器实例仍在运行
        return instance;
      } catch (error) {
        console.error(`检查浏览器实例状态时出错:`, error);
        // 如果检查过程中出错，保守起见，将状态设为关闭
        instance.status = 'closed';
        instance.endTime = instance.endTime || new Date();
        return null;
      }
    } else if (instance.status !== 'closed') {
      // 如果没有浏览器对象但状态不是关闭，则更新状态
      instance.status = 'closed';
      instance.endTime = instance.endTime || new Date();
    }
    
    return null;
  }
  
  /**
   * 关闭所有浏览器实例
   */
  closeAllInstances() {
    for (const [id, instance] of this.browserInstances.entries()) {
      if (instance.process && !instance.process.killed) {
        instance.process.kill();
        instance.status = 'closed';
        instance.endTime = new Date();
      }
    }
  }
  
  /**
   * 连接到运行中的浏览器实例
   * @param {string} profileId 配置文件 ID
   * @returns {Promise<Object>} 浏览器实例
   */
  async connectToBrowser(profileId) {
    if (!this.browserInstances.has(profileId)) {
      console.log(`找不到浏览器实例: ${profileId}`);
      // 尝试启动浏览器
      try {
        console.log(`尝试启动浏览器: ${profileId}`);
        const profile = await profileManager.getProfile(profileId);
        if (!profile) {
          throw new Error(`找不到配置文件: ${profileId}`);
        }
        
        // 获取浏览器类型
        const browserType = profile.startup?.browser || 'system';
        
        // 创建浏览器适配器
        let adapter;
        if (this.browserAdapters.has(browserType)) {
          adapter = this.browserAdapters.get(browserType);
        } else {
          adapter = browserFactory.createAdapter(browserType);
          this.browserAdapters.set(browserType, adapter);
        }
        
        const browser = await this.launchBrowser(profileId);
        console.log(`浏览器启动成功: ${typeof browser}`);
        return browser;
      } catch (launchError) {
        console.error(`启动浏览器失败: ${launchError.message}`);
        throw new Error(`找不到指定的浏览器实例`);
      }
    }
    
    const instance = this.browserInstances.get(profileId);
    console.log(`浏览器实例状态: ${instance.status}`);
    
    if (instance.status !== 'running') {
      throw new Error('浏览器实例未在运行');
    }
    
    // 直接返回实例中的浏览器对象
    console.log(`浏览器实例可用`);
    return instance.browser;
  }
  
  /**
   * 清除浏览器缓存
   * @param {string} profileId 配置文件 ID
   * @returns {Promise<Object>} 清除结果
   */
  async clearCache(profileId) {
    try {
      console.log(`清除浏览器缓存, 配置文件 ID: ${profileId}`);
      
      // 获取浏览器实例和适配器
      if (!this.browserInstances.has(profileId)) {
        throw new Error(`找不到浏览器实例: ${profileId}`);
      }
      
      const instance = this.browserInstances.get(profileId);
      if (instance.status !== 'running') {
        throw new Error('浏览器实例未在运行');
      }
      
      const { browser, adapter } = instance;
      
      // 使用适配器的方法清除缓存
      // 对于 Playwright，我们传入的是 browserContext
      const result = await adapter.clearCache(browser);
      
      console.log(`清除浏览器缓存成功`);
      return result;
    } catch (error) {
      console.error('清除浏览器缓存失败:', error);
      throw new Error(`清除浏览器缓存失败: ${error.message}`);
    }
  }
  
  /**
   * 清除本地存储
   * @param {string} profileId 配置文件 ID
   * @param {string} url 可选，指定网站的 URL
   * @returns {Promise<Object>} 清除结果
   */
  async clearLocalStorage(profileId, url = 'https://www.example.com') {
    try {
      console.log(`清除本地存储, 配置文件 ID: ${profileId}, URL: ${url}`);
      
      // 获取浏览器实例和适配器
      if (!this.browserInstances.has(profileId)) {
        throw new Error(`找不到浏览器实例: ${profileId}`);
      }
      
      const instance = this.browserInstances.get(profileId);
      if (instance.status !== 'running') {
        throw new Error('浏览器实例未在运行');
      }
      
      const { browser, adapter } = instance;
      
      // 使用适配器的方法清除本地存储
      // 对于 Playwright，我们传入的是 browserContext
      const result = await adapter.clearLocalStorage(browser, url);
      
      console.log(`清除本地存储成功`);
      return result;
    } catch (error) {
      console.error('清除本地存储失败:', error);
      throw new Error(`清除本地存储失败: ${error.message}`);
    }
  }
  
  /**
   * 构建浏览器启动参数 - 已迁移到浏览器适配器
   * @param {Object} profile 配置文件
   * @param {string} userDataDirectory 用户数据目录
   * @param {number} debugPort 调试端口
   * @param {Object} options 启动选项
   * @returns {Array} 启动参数数组
   * @private
   * @deprecated 该方法已迁移到浏览器适配器类中
   */
  _buildLaunchArgs(profile, userDataDirectory, debugPort, options = {}) {
    console.warn('警告: _buildLaunchArgs 方法已迁移到浏览器适配器类中');
    
    // 获取浏览器类型
    const browserType = profile.startup?.browser || 'system';
    
    // 获取浏览器适配器
    let adapter;
    if (this.browserAdapters.has(browserType)) {
      adapter = this.browserAdapters.get(browserType);
    } else {
      adapter = browserFactory.createAdapter(browserType);
      this.browserAdapters.set(browserType, adapter);
    }
    
    // 使用适配器的方法构建启动参数
    return adapter.buildLaunchArgs(profile, userDataDirectory, debugPort, options);
  }
  
  /**
   * 获取 Chromium 路径 - 已迁移到浏览器适配器
   * @returns {string} Chromium 可执行文件路径
   * @private
   * @deprecated 该方法已迁移到 ChromeAdapter 类中
   */
  _getChromiumPath() {
    console.warn('警告: _getChromiumPath 方法已迁移到 ChromeAdapter 类中');
    
    // 获取 Chrome 适配器
    let adapter;
    if (this.browserAdapters.has('chrome')) {
      adapter = this.browserAdapters.get('chrome');
    } else {
      adapter = browserFactory.createAdapter('chrome');
      this.browserAdapters.set('chrome', adapter);
    }
    
    // 使用适配器的方法获取浏览器路径
    return adapter.getBrowserPath();
  }
}

module.exports = new BrowserManager();
