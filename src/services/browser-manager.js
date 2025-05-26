/**
 * 浏览器管理服务
 * 负责浏览器实例的启动、关闭和控制
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { chromium, firefox, webkit } = require('playwright');
const profileManager = require('./profile-manager');
const browserFactory = require('./browser-factory');

// 浏览器实例状态常量
const INSTANCE_STATUS = {
  STARTING: 'starting',  // 正在启动
  RUNNING: 'running',    // 正在运行
  CLOSING: 'closing',    // 正在关闭
  CLOSED: 'closed',      // 已关闭
  ERROR: 'error'         // 出错
};

// 导出状态常量
exports.INSTANCE_STATUS = INSTANCE_STATUS;

// 延迟加载 electron 模块
let electron;
function getElectron() {
  if (!electron) {
    electron = require('electron');
  }
  return electron;
}

class BrowserManager extends EventEmitter {
  constructor() {
    // 调用 EventEmitter 的构造函数
    super();
    
    // 存储所有运行中的浏览器实例
    this.browserInstances = new Map();
    this.initialized = false;
    
    // 浏览器适配器缓存
    this.browserAdapters = new Map();
    
    // 窗口检查定时器
    this.windowCheckIntervals = new Map();
    
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
    if (this.isInstanceRunning(profileId)) {
      console.log(`浏览器实例已在运行中: ${profileId}`);
      return this.browserInstances.get(profileId).browser;
    }
    
    // 确保用户数据目录存在
    let baseUserDataDir;
    try {
      const electron = getElectron();
      if (!electron) {
        console.error('无法加载 Electron 模块');
        throw new Error('无法加载 Electron 模块');
      }
      
      const app = electron.app;
      if (!app) {
        console.error('Electron app 对象不存在');
        throw new Error('Electron app 对象不存在');
      }
      
      if (typeof app.getPath !== 'function') {
        console.error('app.getPath 方法不存在');
        throw new Error('app.getPath 方法不存在');
      }
      
      baseUserDataDir = path.join(app.getPath('userData'), 'browser_profiles');
    } catch (error) {
      console.error('获取用户数据目录时出错:', error);
      // 在非 Electron 环境中使用当前目录作为备选
      baseUserDataDir = path.join(process.cwd(), 'browser_profiles');
      
      // 确保目录存在
      if (!fs.existsSync(baseUserDataDir)) {
        fs.mkdirSync(baseUserDataDir, { recursive: true });
      }
    }
    
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
      } catch (e) {
        console.error(`创建用户数据目录失败: ${userDataDir}`, e);
      }
    }
    
    // 清理浏览器特定的锁定文件
    try {
      await adapter.cleanupUserData(userDataDir);
    } catch (error) {
      console.error(`清理浏览器用户数据目录失败: ${error.message}`);
    }
    
    // 生成调试端口
    const debugPort = 9222 + Math.floor(Math.random() * 1000);
    
    // 构建启动参数
    const launchArgs = adapter.buildLaunchArgs(profile, userDataDir, debugPort, options);
    
    // 启动浏览器

    try {
      // 准备启动选项
      const launchOptions = { ...options };
      
      // 添加启动URL
      if (!launchOptions.url && !launchOptions.startUrl) {
        if (profile.startup && profile.startup.startUrl) {
          launchOptions.startUrl = profile.startup.startUrl;
        } else {
          launchOptions.startUrl = 'https://www.baidu.com';
        }
      }
      
      // 启动浏览器
      const browser = await adapter.launchBrowser(
        adapter.getBrowserPath(),
        launchArgs,
        launchOptions
      );
      
      // 如果配置了指纹保护，应用指纹保护设置
      if ((profile.fingerprint && profile.fingerprint.enabled) || (profile.fingerprintProtection && profile.fingerprintProtection.enabled)) {
        // 对于 Playwright，我们传入的是 browserContext 而不是 page
        console.log(`[指纹防护] 在浏览器管理器中应用指纹防护设置`);
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
        status: INSTANCE_STATUS.RUNNING,
        startTime: new Date(),
        endTime: null,
        process: browser.process ? browser.process() : null,
        statusCheckInterval: null
      };
      
      this.browserInstances.set(profileId, instance);
      
      // 监听浏览器关闭事件
      browser.on('disconnected', () => {
        console.log(`浏览器实例已断开连接: ${profileId}`);
        this._markInstanceAsClosed(profileId, 'disconnected');
      });
      
      // 监听浏览器关闭事件 - 增强版
      if (browser.close && typeof browser.close === 'function') {
        const originalClose = browser.close.bind(browser);
        browser.close = async (...args) => {
          console.log(`浏览器 close 方法被调用: ${profileId}`);
          this._markInstanceAsClosed(profileId, 'close-method-called');
          return await originalClose(...args);
        };
      }
      
      // 使用CDP监听浏览器事件
      this._setupCDPEventListeners(browser, profileId);
      
      // 添加额外的检测机制
      // 1. 监听浏览器上下文关闭事件
      if (browser.contexts && typeof browser.contexts === 'function') {
        try {
          const contexts = browser.contexts();
          if (contexts && contexts.length > 0) {
            contexts.forEach(context => {
              if (context && typeof context.on === 'function') {
                context.on('close', () => {
                  console.log(`浏览器上下文已关闭: ${profileId}`);
                  this._markInstanceAsClosed(profileId, 'context-closed');
                });
              }
            });
          }
        } catch (error) {
          console.warn(`无法监听浏览器上下文关闭事件: ${error.message}`);
        }
      }
      
      // 2. 监听浏览器进程退出由_setupCDPEventListeners处理
      
      // 3. 监听页面关闭事件
      const monitorPages = async () => {
        try {
          // 获取所有页面
          if (browser.pages && typeof browser.pages === 'function') {
            const pages = await browser.pages();
            if (pages && pages.length > 0) {
              // 监听每个页面的关闭事件
              pages.forEach(page => {
                if (page && typeof page.on === 'function') {
                  // 监听页面关闭事件
                  page.on('close', () => {
                    console.log(`页面已关闭: ${profileId}`);
                    // 检查是否所有页面都已关闭
                    setTimeout(async () => {
                      try {
                        const remainingPages = await browser.pages();
                        if (!remainingPages || remainingPages.length === 0) {
                          console.log(`所有页面已关闭，关闭实例: ${profileId}`);
                          this._markInstanceAsClosed(profileId, 'all-pages-closed');
                        } else {
                          console.log(`还有 ${remainingPages.length} 个页面打开: ${profileId}`);
                        }
                      } catch (e) {
                        console.log(`检查剩余页面时出错: ${e.message}`);
                        // 如果出错，可能是浏览器已经关闭
                        this._markInstanceAsClosed(profileId, 'pages-check-error');
                      }
                    }, 500);
                  });
                  
                  // 监听页面错误事件，可能是用户关闭了浏览器窗口
                  page.on('error', (error) => {
                    console.log(`页面发生错误: ${profileId}, 错误: ${error.message}`);
                    // 检查浏览器是否还能连接
                    setTimeout(async () => {
                      try {
                        // 尝试获取页面，如果失败则认为浏览器已关闭
                        await browser.pages();
                      } catch (e) {
                        console.log(`检测到浏览器已关闭: ${profileId}, 原因: ${e.message}`);
                        this._markInstanceAsClosed(profileId, 'browser-error');
                      }
                    }, 1000);
                  });
                  
                  // 监听页面崩溃事件
                  page.on('crash', () => {
                    console.log(`页面崩溃: ${profileId}`);
                    // 检查浏览器是否还能连接
                    setTimeout(async () => {
                      try {
                        // 尝试获取页面，如果失败则认为浏览器已关闭
                        await browser.pages();
                      } catch (e) {
                        console.log(`检测到浏览器已关闭: ${profileId}, 原因: ${e.message}`);
                        this._markInstanceAsClosed(profileId, 'browser-crash');
                      }
                    }, 1000);
                  });
                }
              });
            }
          }
        } catch (e) {
          console.log(`监听页面关闭事件时出错: ${e.message}`);
        }
      };
      
      // 立即监听当前页面
      monitorPages();
      
      // 每隔一段时间重新监听，以捕获新打开的页面
      const pageMonitorInterval = setInterval(async () => {
        if (instance.status === INSTANCE_STATUS.RUNNING) {
          await monitorPages();
        } else {
          clearInterval(pageMonitorInterval);
        }
      }, 5000);
      
      // 将页面监听定时器保存到实例中
      instance.pageMonitorInterval = pageMonitorInterval;
      
      // 4. 启动定期检查浏览器状态
      this._startBrowserStatusCheck(profileId, browser);
      
      // 4. 添加关闭浏览器的钩子
      const originalClose = browser.close;
      if (typeof originalClose === 'function') {
        browser.close = async (...args) => {
          console.log(`浏览器关闭方法被调用: ${profileId}`);
          this._markInstanceAsClosed(profileId, 'close-method');
          return await originalClose.apply(browser, args);
        };
      }
      
      // 5. 标记实例为运行中并主动通知所有渲染进程
      this._markInstanceAsRunning(profileId, 'launch-success');
      // 获取实例列表会自动触发通知
      this.getRunningInstances();
      
      return browser;
    } catch (error) {
      console.error(`启动浏览器失败: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 关闭浏览器实例
   * @param {string} profileId 配置文件 ID
   * @returns {Promise<boolean>} 是否成功关闭
   */
  async closeBrowser(profileId) {
    if (!this.browserInstances.has(profileId)) {
      return false;
    }
    
    const instance = this.browserInstances.get(profileId);
    
    // 如果实例已经关闭，直接返回
    if (instance.status === INSTANCE_STATUS.CLOSED || instance.status === INSTANCE_STATUS.ERROR) {
      return true;
    }
    
    // 更新状态为正在关闭
    this._updateInstanceStatus(profileId, INSTANCE_STATUS.CLOSING, 'user-close');
    
    try {
      // 使用 Playwright API 关闭浏览器
      if (instance.browser) {
        await instance.browser.close();
      }
      // 如果进程仍然存在，强制关闭它
      if (instance.process && !instance.process.killed) {
        instance.process.kill();
      }
      
      // 关闭成功后更新状态
      this._markInstanceAsClosed(profileId, 'user-close-success');
      
      // 主动通知所有渲染进程实例列表已更新
      this.getRunningInstances();
      
      return true;
    } catch (error) {
      console.error(`关闭浏览器实例 ${profileId} 失败:`, error);
      // 关闭失败，更新状态
      this._updateInstanceStatus(profileId, INSTANCE_STATUS.ERROR, `close-failed: ${error.message}`);
      return false;
    }
  }
  
  
  /**
   * 获取所有运行中的浏览器实例
   * @returns {Array<Object>} 浏览器实例数组
  */
  getRunningInstances() {
    const instances = [];
    for (const [profileId, instance] of this.browserInstances.entries()) {
      // 只检查标记为运行中的实例
      if (instance.status === INSTANCE_STATUS.RUNNING) {
        // 基本检查：浏览器对象是否存在
        if (!instance.browser) {
          this._markInstanceAsClosed(profileId, 'no-browser-object');
          continue;
        }
        
        // 添加到运行中的实例列表
        instances.push({
          profileId,
          profileName: instance.profileName,
          browserType: instance.browserType,
          startTime: instance.startTime,
          status: instance.status  // 添加状态信息
        });
      }
    }
    
    // 发送实例列表更新事件
    this._notifyInstancesUpdated(instances);
    
    return instances;
  }
  
  /**
   * 通知所有活跃的渲染进程实例列表已更新
   * @param {Array} instances 实例列表
   * @private
   */
  _notifyInstancesUpdated(instances) {
    try {
      const { BrowserWindow } = getElectron();
      const windows = BrowserWindow.getAllWindows();
      
      // 向所有活跃的窗口发送实例列表更新事件
      for (const win of windows) {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('instances-updated', instances);
        }
      }
    } catch (error) {
      console.error('通知实例列表更新失败:', error);
    }
  }
  
  /**
   * 检查浏览器实例是否在运行
   * @param {string} profileId 配置文件 ID
   * @returns {boolean} 是否在运行
   */
  isInstanceRunning(profileId) {
    // 检查实例是否存在
    if (!profileId || !this.browserInstances.has(profileId)) {
      return false;
    }
    
    const instance = this.browserInstances.get(profileId);
    
    // 检查状态是否为 running
    return instance.status === INSTANCE_STATUS.RUNNING;
  }
  
  /**
   * 获取指定配置文件的运行中浏览器实例
   * @param {string} profileId 配置文件 ID
   * @returns {Object|null} 运行中的浏览器实例，如果不存在则返回 null
   */
  getRunningInstance(profileId) {
    if (!profileId) {
      console.warn('getRunningInstance: profileId 不能为空');
      return null;
    }
    
    // 检查实例是否在运行
    if (!this.isInstanceRunning(profileId)) {
      return null;
    }
    
    // 返回浏览器实例
    return this.browserInstances.get(profileId).browser;
  }
  
  /**
   * 关闭所有浏览器实例
   */
  closeAllInstances() {
    for (const [id, instance] of this.browserInstances.entries()) {
      if (instance.process && !instance.process.killed) {
        instance.process.kill();
        this._updateInstanceStatus(id, INSTANCE_STATUS.CLOSED, 'closeAllInstances');
        instance.endTime = new Date();
      }
    }
  }
  
  /**
   * 更新实例状态
   * @param {string} profileId 配置文件 ID
   * @param {string} status 新状态
   * @param {string} reason 状态变更原因
   * @private
   */
  _updateInstanceStatus(profileId, status, reason = 'unknown') {
    if (!this.browserInstances.has(profileId)) return;
    
    const instance = this.browserInstances.get(profileId);
    const oldStatus = instance.status;
    
    // 如果状态没有变化，不做任何操作
    if (oldStatus === status) return;
    
    // 更新状态
    instance.status = status;
    
    // 发送状态变化事件
    try {
      // 使用 getElectron 函数获取 Electron API
      const { BrowserWindow } = getElectron();
      const windows = BrowserWindow.getAllWindows();
      
      // 向所有活跃的窗口发送状态变化事件
      for (const win of windows) {
        if (!win.isDestroyed() && win.webContents) {
          win.webContents.send('instance-status-changed', {
            profileId,
            oldStatus,
            newStatus: status,
            reason
          });
        }
      }
      
      // 状态变化后，主动发送实例列表更新
      this.getRunningInstances();
    } catch (error) {
      console.error('发送状态变化事件失败:', error);
    }
    
    // 根据状态设置其他属性
    if (status === INSTANCE_STATUS.RUNNING) {
      instance.startTime = instance.startTime || new Date();
      instance.endTime = null;
    } else if (status === INSTANCE_STATUS.CLOSED || status === INSTANCE_STATUS.ERROR) {
      instance.endTime = instance.endTime || new Date();
      
      // 清除定时器
      if (instance.statusCheckInterval) {
        clearInterval(instance.statusCheckInterval);
        instance.statusCheckInterval = null;
      }
    }
    
    // 触发事件
    this.emit('instance-status-changed', {
      profileId,
      oldStatus,
      status,
      reason
    });
  }
  
  /**
   * 标记实例为已关闭
   * @param {string} profileId 配置文件 ID
   * @param {string} reason 关闭原因
   * @private
   */
  _markInstanceAsClosed(profileId, reason = 'unknown') {
    this._updateInstanceStatus(profileId, INSTANCE_STATUS.CLOSED, reason);
  }
  
  /**
   * 标记实例为正在运行
   * @param {string} profileId 配置文件 ID
   * @param {string} reason 运行原因
   * @private
   */
  _markInstanceAsRunning(profileId, reason = 'unknown') {
    this._updateInstanceStatus(profileId, INSTANCE_STATUS.RUNNING, reason);
  }
  
  /**
   * 开始浏览器状态检查
   * @param {string} profileId 配置文件 ID
   * @param {Object} browser 浏览器实例
   * @private
   */
  /**
   * 设置CDP事件监听器
   * @param {Object} browser 浏览器实例
   * @param {string} profileId 配置文件ID
   * @private
   */
  async _setupCDPEventListeners(browser, profileId) {
    if (!this.browserInstances.has(profileId)) return;
    
    const instance = this.browserInstances.get(profileId);
    
    try {
      // 检查是否支持CDP
      if (browser.createCDPSession && typeof browser.createCDPSession === 'function') {
        // 获取第一个页面
        const pages = await browser.pages();
        if (pages && pages.length > 0) {
          const page = pages[0];
          try {
            // 创建CDP会话
            const client = await page.createCDPSession();
            
            // 监听目标崩溃事件
            client.on('Inspector.targetCrashed', () => {
              console.log(`[CDP] 浏览器崩溃: ${profileId}`);
              this._markInstanceAsClosed(profileId, 'target-crashed');
            });
            
            // 监听目标销毁事件
            client.on('Target.targetDestroyed', () => {
              console.log(`[CDP] 浏览器目标被销毁: ${profileId}`);
              this._markInstanceAsClosed(profileId, 'target-destroyed');
            });
            
            console.log(`[CDP] 成功设置CDP事件监听器: ${profileId}`);
          } catch (error) {
            console.error(`[CDP] 创建CDP会话失败: ${error.message}`);
          }
        }
      }
      
      // 监听进程事件
      if (instance.process) {
        // 监听进程退出事件
        instance.process.on('exit', (code) => {
          console.log(`浏览器进程退出: ${profileId}, 退出码: ${code}`);
          this._markInstanceAsClosed(profileId, 'process-exit');
        });
        
        // 监听进程错误事件
        instance.process.on('error', (error) => {
          console.log(`浏览器进程错误: ${profileId}, 错误: ${error.message}`);
          this._markInstanceAsClosed(profileId, 'process-error');
        });
        
        console.log(`成功设置进程事件监听器: ${profileId}`);
      }
    } catch (error) {
      console.error(`设置CDP事件监听器失败: ${error.message}`);
    }
  }
  
  /**
   * 启动浏览器状态检查，作为事件监听的备用机制
   * @param {string} profileId 配置文件ID
   * @param {Object} browser 浏览器实例
   * @private
   */
  _startBrowserStatusCheck(profileId, browser) {
    if (!this.browserInstances.has(profileId)) return;
    
    const instance = this.browserInstances.get(profileId);
    
    // 清除现有的定时器
    if (instance.statusCheckInterval) {
      clearInterval(instance.statusCheckInterval);
    }
    
    // 作为备用机制，每10秒检查一次浏览器状态
    instance.statusCheckInterval = setInterval(async () => {
      try {
        // 如果实例已经不是运行状态，停止检查
        if (instance.status !== INSTANCE_STATUS.RUNNING) {
          clearInterval(instance.statusCheckInterval);
          instance.statusCheckInterval = null;
          return;
        }
        
        // 检查浏览器是否还连接
        let shouldMarkAsClosed = false;
        
        // 使用 isConnected 方法检查
        if (browser && typeof browser.isConnected === 'function') {
          try {
            const isConnected = browser.isConnected();
            if (!isConnected) {
              console.log(`备用检查发现浏览器已断开连接: ${profileId}`);
              shouldMarkAsClosed = true;
            }
          } catch (e) {
            console.log(`备用检查发现浏览器连接异常: ${e.message}`);
            shouldMarkAsClosed = true;
          }
        }
        
        // 如果检测到浏览器已关闭，标记实例为已关闭
        if (shouldMarkAsClosed) {
          this._markInstanceAsClosed(profileId, 'backup-check');
          clearInterval(instance.statusCheckInterval);
          instance.statusCheckInterval = null;
        }
      } catch (error) {
        console.error(`备用状态检查失败: ${profileId}`, error);
      }
    }, 10000); // 每10秒检查一次，仅作为备用机制
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
    
    if (instance.status !== INSTANCE_STATUS.RUNNING) {
      throw new Error(`浏览器实例未在运行，当前状态: ${instance.status}`);
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
      if (instance.status !== INSTANCE_STATUS.RUNNING) {
        throw new Error(`浏览器实例未在运行，当前状态: ${instance.status}`);
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
      if (instance.status !== INSTANCE_STATUS.RUNNING) {
        throw new Error(`浏览器实例未在运行，当前状态: ${instance.status}`);
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
