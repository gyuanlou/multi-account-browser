/**
 * 性能优化服务
 * 负责浏览器实例的性能优化和资源管理
 */
const os = require('os');
const { app } = require('electron');
const browserManager = require('./browser-manager');
const settingsService = require('./settings-service');

class PerformanceOptimizer {
  constructor() {
    // 存储不活动浏览器的计时器
    this.inactivityTimers = new Map();
    
    // 存储最后活动时间
    this.lastActivityTime = new Map();
    
    // 监控间隔（毫秒）
    this.monitorInterval = 60000; // 1分钟
    
    // 监控定时器
    this.monitorTimer = null;
    
    // 系统资源信息
    this.systemInfo = {
      totalMemory: os.totalmem(),
      cpuCount: os.cpus().length
    };
  }
  
  /**
   * 初始化性能优化服务
   */
  init() {
    // 获取性能设置
    const performanceSettings = settingsService.getSetting('performance') || {};
    
    // 设置最大实例数
    this.maxInstances = performanceSettings.maxInstances || 5;
    
    // 设置资源使用模式
    this.resourceMode = performanceSettings.resourceSaving || 'balanced';
    
    // 设置不活动关闭时间（分钟）
    this.closeInactiveAfter = performanceSettings.closeInactiveAfter || 0;
    
    // 启动监控
    this.startMonitoring();
    
    console.log('性能优化服务已初始化', {
      maxInstances: this.maxInstances,
      resourceMode: this.resourceMode,
      closeInactiveAfter: this.closeInactiveAfter
    });
  }
  
  /**
   * 启动资源监控
   */
  startMonitoring() {
    // 清除现有定时器
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }
    
    // 设置新定时器
    this.monitorTimer = setInterval(() => {
      this.monitorResources();
    }, this.monitorInterval);
    
    console.log('资源监控已启动');
  }
  
  /**
   * 停止资源监控
   */
  stopMonitoring() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    
    // 清除所有不活动计时器
    for (const timer of this.inactivityTimers.values()) {
      clearTimeout(timer);
    }
    this.inactivityTimers.clear();
    
    console.log('资源监控已停止');
  }
  
  /**
   * 监控系统资源和浏览器实例
   */
  async monitorResources() {
    try {
      // 获取运行中的实例
      const runningInstances = browserManager.getRunningInstances();
      
      // 检查是否超过最大实例数
      if (runningInstances.length > this.maxInstances) {
        console.log(`运行实例数 (${runningInstances.length}) 超过最大限制 (${this.maxInstances})，尝试关闭不活动实例`);
        await this.reduceInstances(runningInstances.length - this.maxInstances);
      }
      
      // 检查不活动实例
      if (this.closeInactiveAfter > 0) {
        await this.checkInactiveInstances(runningInstances);
      }
      
      // 应用资源优化策略
      await this.applyResourceOptimization(runningInstances);
      
    } catch (error) {
      console.error('监控资源失败:', error);
    }
  }
  
  /**
   * 减少运行实例数
   * @param {number} count 需要减少的实例数
   */
  async reduceInstances(count) {
    try {
      // 获取运行中的实例
      const runningInstances = browserManager.getRunningInstances();
      
      // 按最后活动时间排序
      const sortedInstances = [...runningInstances].sort((a, b) => {
        const lastActivityA = this.lastActivityTime.get(a.profileId) || 0;
        const lastActivityB = this.lastActivityTime.get(b.profileId) || 0;
        return lastActivityA - lastActivityB; // 最早不活动的排在前面
      });
      
      // 关闭指定数量的最不活跃实例
      for (let i = 0; i < count && i < sortedInstances.length; i++) {
        const instance = sortedInstances[i];
        console.log(`关闭不活跃实例: ${instance.profileId}`);
        await browserManager.closeBrowser(instance.profileId);
      }
    } catch (error) {
      console.error('减少实例数失败:', error);
    }
  }
  
  /**
   * 检查不活动实例
   * @param {Array} runningInstances 运行中的实例
   */
  async checkInactiveInstances(runningInstances) {
    const now = Date.now();
    const inactiveThreshold = this.closeInactiveAfter * 60 * 1000; // 转换为毫秒
    
    for (const instance of runningInstances) {
      const lastActivity = this.lastActivityTime.get(instance.profileId) || now;
      const inactiveTime = now - lastActivity;
      
      // 如果实例不活动时间超过阈值
      if (inactiveTime >= inactiveThreshold) {
        console.log(`实例 ${instance.profileId} 已不活动 ${Math.floor(inactiveTime / 60000)} 分钟，关闭中...`);
        await browserManager.closeBrowser(instance.profileId);
        
        // 清除不活动计时器
        if (this.inactivityTimers.has(instance.profileId)) {
          clearTimeout(this.inactivityTimers.get(instance.profileId));
          this.inactivityTimers.delete(instance.profileId);
        }
      } else if (!this.inactivityTimers.has(instance.profileId)) {
        // 设置不活动计时器
        const remainingTime = inactiveThreshold - inactiveTime;
        
        const timer = setTimeout(async () => {
          console.log(`实例 ${instance.profileId} 不活动计时器触发，关闭中...`);
          await browserManager.closeBrowser(instance.profileId);
          this.inactivityTimers.delete(instance.profileId);
        }, remainingTime);
        
        this.inactivityTimers.set(instance.profileId, timer);
      }
    }
  }
  
  /**
   * 应用资源优化策略
   * @param {Array} runningInstances 运行中的实例
   */
  async applyResourceOptimization(runningInstances) {
    // 获取系统资源使用情况
    const resourceUsage = this.getResourceUsage();
    const memoryUsagePercent = resourceUsage.memory.percent;
    
    console.log(`内存使用率 (${memoryUsagePercent}%)`);
    
    // 根据资源使用情况和设置的模式应用不同的优化策略
    switch (this.resourceMode) {
      case 'performance':
        // 性能模式，仅在内存使用率超过 90% 时应用优化
        if (memoryUsagePercent > 90) {
          console.log('内存使用率过高，应用性能模式优化');
          await this.applyBalancedMode(runningInstances);
        }
        break;
      case 'balanced':
        // 平衡模式，内存使用率超过 70% 时应用优化
        if (memoryUsagePercent > 70) {
          console.log(`内存使用率 (${memoryUsagePercent}%) 较高，应用平衡模式优化`);
          await this.applyBalancedMode(runningInstances);
        }
        break;
      case 'memory':
        // 内存节省模式，始终应用优化
        console.log('应用内存节省模式优化');
        await this.applyMemorySavingMode(runningInstances);
        break;
    }
  }
  
  /**
   * 应用平衡模式优化
   * @param {Array} runningInstances 运行中的实例
   */
  async applyBalancedMode(runningInstances) {
    // 获取系统可用内存
    const freeMemory = os.freemem();
    const totalMemory = this.systemInfo.totalMemory;
    const memoryUsageRatio = 1 - (freeMemory / totalMemory);
    
    // 如果内存使用率超过 70%，尝试优化
    if (memoryUsageRatio > 0.7) {
      console.log(`内存使用率 (${Math.round(memoryUsageRatio * 100)}%) 较高，应用平衡模式优化`);
      
      // 对每个实例应用优化
      for (const instance of runningInstances) {
        try {
          // 检查实例是否存在且有效
          const runningInstance = browserManager.getRunningInstance(instance.profileId);
          if (!runningInstance || runningInstance.status !== 'running') {
            console.log(`实例 ${instance.profileId} 不在运行状态，跳过优化`);
            continue;
          }
          
          // 尝试关闭不必要的浏览器标签页
          try {
            // 尝试连接到浏览器实例
            const puppeteer = require('puppeteer-core');
            const browser = await puppeteer.connect({
              browserURL: `http://localhost:${runningInstance.debugPort || 9222}`,
              defaultViewport: null
            }).catch(e => {
              console.log(`直接连接失败: ${e.message}`);
              return null;
            });
            
            if (!browser) continue;
            
            try {
              // 获取所有页面
              const pages = await browser.pages().catch(e => {
                console.log(`获取页面失败: ${e.message}`);
                return [];
              });
              
              // 如果有多个页面，对不活跃的页面应用优化
              if (pages.length > 1) {
                // 获取当前活跃页面
                let activePage = null;
                try {
                  activePage = await Promise.race([
                    Promise.all(pages.map(p => p.evaluate(() => document.visibilityState === 'visible').catch(() => false)))
                      .then(results => {
                        const activeIndex = results.findIndex(r => r === true);
                        return activeIndex >= 0 ? pages[activeIndex] : null;
                      }),
                    new Promise(resolve => setTimeout(() => resolve(null), 1000))
                  ]);
                } catch (e) {
                  console.log(`获取活跃页面失败: ${e.message}`);
                }
                
                if (!activePage) {
                  activePage = pages[0]; // 默认使用第一个页面
                }
                
                // 对其他页面应用优化
                for (const page of pages) {
                  if (page !== activePage) {
                    try {
                      // 限制不活跃页面的资源使用
                      await page.evaluate(() => {
                        // 降低页面更新频率
                        if (window.requestAnimationFrame) {
                          const originalRAF = window.requestAnimationFrame;
                          window.requestAnimationFrame = function(callback) {
                            return setTimeout(() => {
                              if (typeof callback === 'function') {
                                callback(performance.now());
                              }
                            }, 100);
                          };
                        }
                      }).catch(e => console.log(`页面脚本执行失败: ${e.message}`));
                    } catch (pageError) {
                      console.log(`优化页面失败: ${pageError.message}`);
                    }
                  }
                }
              }
              
              // 关闭连接
              await browser.disconnect().catch(() => {});
              
            } catch (browserError) {
              console.log(`操作浏览器失败: ${browserError.message}`);
              try { await browser.disconnect().catch(() => {}); } catch {}
            }
          } catch (error) {
            console.log(`连接到浏览器失败: ${error.message}`);
          }
        } catch (error) {
          console.error(`优化实例 ${instance.profileId} 失败:`, error);
        }
      }
    }
  }
  
  /**
   * 应用内存节省模式优化
   * @param {Array} runningInstances 运行中的实例
   */
  async applyMemorySavingMode(runningInstances) {
    console.log('应用内存节省模式优化');
    
    // 对每个实例应用严格的内存优化
    for (const instance of runningInstances) {
      try {
        // 连接到浏览器实例
        const browser = await browserManager.connectToBrowser(instance.profileId);
        
        // 获取所有页面
        const pages = await browser.pages();
        
        // 获取当前活跃页面
        const activePage = pages.find(p => p.isFocused) || pages[0];
        
        // 对所有页面应用优化
        for (const page of pages) {
          // 对不活跃页面应用更严格的优化
          if (page !== activePage) {
            // 暂停不活跃页面的 JavaScript 执行
            await page.evaluate(() => {
              // 存储原始定时器函数
              window._originalSetTimeout = window.setTimeout;
              window._originalSetInterval = window.setInterval;
              window._originalRequestAnimationFrame = window.requestAnimationFrame;
              
              // 替换为节流版本
              window.setTimeout = function(callback, delay) {
                return window._originalSetTimeout.call(window, callback, Math.max(delay, 1000));
              };
              
              window.setInterval = function(callback, delay) {
                return window._originalSetInterval.call(window, callback, Math.max(delay, 5000));
              };
              
              window.requestAnimationFrame = function(callback) {
                return window._originalSetTimeout.call(window, callback, 1000);
              };
            });
          } else {
            // 对活跃页面也应用一定的优化
            await page.evaluate(() => {
              // 降低动画和定时器频率
              if (window.requestAnimationFrame) {
                const originalRAF = window.requestAnimationFrame;
                window.requestAnimationFrame = function(callback) {
                  return originalRAF.call(window, () => {
                    setTimeout(callback, 50);
                  });
                };
              }
            });
          }
        }
      } catch (error) {
        console.error(`优化实例 ${instance.profileId} 失败:`, error);
      }
    }
  }
  
  /**
   * 记录浏览器实例活动
   * @param {string} profileId 配置文件 ID
   */
  recordActivity(profileId) {
    this.lastActivityTime.set(profileId, Date.now());
    
    // 重置不活动计时器
    if (this.inactivityTimers.has(profileId)) {
      clearTimeout(this.inactivityTimers.get(profileId));
      this.inactivityTimers.delete(profileId);
      
      // 如果启用了自动关闭，设置新的计时器
      if (this.closeInactiveAfter > 0) {
        const timer = setTimeout(async () => {
          console.log(`实例 ${profileId} 不活动计时器触发，关闭中...`);
          await browserManager.closeBrowser(profileId);
          this.inactivityTimers.delete(profileId);
        }, this.closeInactiveAfter * 60 * 1000);
        
        this.inactivityTimers.set(profileId, timer);
      }
    }
  }
  
  /**
   * 更新性能设置
   */
  updateSettings() {
    // 获取最新设置
    const performanceSettings = settingsService.getSetting('performance') || {};
    
    // 更新设置
    this.maxInstances = performanceSettings.maxInstances || 5;
    this.resourceMode = performanceSettings.resourceSaving || 'balanced';
    this.closeInactiveAfter = performanceSettings.closeInactiveAfter || 0;
    
    console.log('性能设置已更新', {
      maxInstances: this.maxInstances,
      resourceMode: this.resourceMode,
      closeInactiveAfter: this.closeInactiveAfter
    });
    
    // 重新应用优化
    this.monitorResources();
  }
  
  /**
   * 获取系统资源使用情况
   * @returns {Object} 资源使用情况
   */
  getResourceUsage() {
    const freeMemory = os.freemem();
    const totalMemory = this.systemInfo.totalMemory;
    const memoryUsage = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((memoryUsage / totalMemory) * 100);
    
    // 获取 CPU 负载
    const loadAvg = os.loadavg();
    const cpuCount = this.systemInfo.cpuCount;
    const cpuUsagePercent = Math.round((loadAvg[0] / cpuCount) * 100);
    
    return {
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: memoryUsage,
        percent: memoryUsagePercent
      },
      cpu: {
        count: cpuCount,
        loadAvg: loadAvg[0],
        percent: cpuUsagePercent
      },
      instances: {
        running: browserManager.getRunningInstances().length,
        max: this.maxInstances
      }
    };
  }
}

module.exports = new PerformanceOptimizer();
