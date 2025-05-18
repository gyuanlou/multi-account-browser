/**
 * 自动化服务
 * 负责浏览器自动化操作和脚本管理
 */
const { chromium, firefox, webkit } = require('playwright');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const electron = require('electron');
const browserManager = require('./browser-manager');
// 直接定义状态常量，避免导入时序问题
const INSTANCE_STATUS = {
  STARTING: 'starting',  // 正在启动
  RUNNING: 'running',    // 正在运行
  CLOSING: 'closing',    // 正在关闭
  CLOSED: 'closed',      // 已关闭
  ERROR: 'error'         // 出错
};
const profileManager = require('./profile-manager');

class AutomationService {
  constructor() {
    // 存储正在运行的自动化任务
    this.runningTasks = new Map();
    
    // 脚本存储路径初始化
    this.scriptsPath = null;
    this.initScriptsPath();
    
    // 脚本缓存
    this.scriptsCache = null;
  }
  
  /**
   * 初始化脚本存储路径
   */
  initScriptsPath() {
    try {
      const { app } = electron;
      
      if (app) {
        // 如果在主进程中运行
        if (process.type === 'browser') {
          if (app.isReady()) {
            this.scriptsPath = path.join(app.getPath('userData'), 'automation-scripts');
          } else {
            // 如果 app 还没有准备好，使用当前工作目录
            this.scriptsPath = path.join(process.cwd(), 'user_data', 'automation-scripts');
          }
        } else {
          // 如果在渲染进程中运行
          this.scriptsPath = path.join(process.cwd(), 'user_data', 'automation-scripts');
        }
      } else {
        // 如果无法获取 app 对象
        this.scriptsPath = path.join(process.cwd(), 'user_data', 'automation-scripts');
      }
      
      // 确保脚本目录存在
      if (!fs.existsSync(this.scriptsPath)) {
        fs.mkdirSync(this.scriptsPath, { recursive: true });
      }
    } catch (error) {
      console.error('初始化脚本存储路径失败:', error);
      // 使用默认路径
      this.scriptsPath = path.join(process.cwd(), 'user_data', 'automation-scripts');
      
      // 确保脚本目录存在
      if (!fs.existsSync(this.scriptsPath)) {
        fs.mkdirSync(this.scriptsPath, { recursive: true });
      }
    }
  }
  
  /**
   * 运行自动化脚本
   * @param {string} profileId 配置文件 ID
   * @param {Object} script 自动化脚本
   * @returns {Promise<Object>} 执行结果
   */
  async runAutomationScript(profileId, script) {
    // 检查是否已有该配置的浏览器实例在运行
    let browser;
    try {
      browser = await browserManager.connectToBrowser(profileId);
    } catch (error) {
      // 如果没有运行中的实例，则启动一个新实例
      try {
        await browserManager.launchBrowser(profileId);
        // 等待浏览器启动
        await new Promise(resolve => setTimeout(resolve, 2000));
        browser = await browserManager.connectToBrowser(profileId);
      } catch (launchError) {
        throw new Error(`启动浏览器失败: ${launchError.message}`);
      }
    }
    
    // 创建任务 ID
    const taskId = `${profileId}-${Date.now()}`;
    
    // 创建自动化运行器
    const runner = new AutomationRunner(browser, script);
    
    // 存储任务信息
    this.runningTasks.set(taskId, {
      profileId,
      script,
      runner,
      startTime: new Date(),
      status: 'running'
    });
    
    try {
      // 运行脚本
      const result = await runner.run();
      
      // 更新任务状态
      if (this.runningTasks.has(taskId)) {
        const task = this.runningTasks.get(taskId);
        task.status = result.success ? 'completed' : 'failed';
        task.endTime = new Date();
        task.result = result;
      }
      
      return {
        taskId,
        success: result.success,
        results: result.results
      };
    } catch (error) {
      // 更新任务状态
      if (this.runningTasks.has(taskId)) {
        const task = this.runningTasks.get(taskId);
        task.status = 'error';
        task.endTime = new Date();
        task.error = error.message;
      }
      
      throw new Error(`自动化脚本执行失败: ${error.message}`);
    }
  }
  
  /**
   * 获取任务状态
   * @param {string} taskId 任务 ID
   * @returns {Object|null} 任务状态
   */
  getTaskStatus(taskId) {
    if (!this.runningTasks.has(taskId)) {
      return null;
    }
    
    const task = this.runningTasks.get(taskId);
    return {
      taskId,
      profileId: task.profileId,
      scriptName: task.script.name,
      status: task.status,
      startTime: task.startTime,
      endTime: task.endTime,
      result: task.result,
      error: task.error
    };
  }
  
  /**
   * 获取所有任务
   * @returns {Array} 任务列表
   */
  getAllTasks() {
    try {
      // 从设置中获取所有任务
      const settingsService = require('./settings-service');
      const savedTasks = settingsService.getSetting('automation-tasks') || [];
      
      // 合并运行中的任务状态
      return savedTasks.map(task => {
        // 检查任务是否正在运行
        const runningTask = Array.from(this.runningTasks.entries())
          .find(([_, rt]) => rt.taskId === task.id);
        
        if (runningTask) {
          const [_, rTask] = runningTask;
          // 更新任务状态
          return {
            ...task,
            status: rTask.status,
            startTime: rTask.startTime,
            endTime: rTask.endTime
          };
        }
        
        return task;
      });
    } catch (error) {
      console.error('获取任务列表失败:', error);
      return [];
    }
  }
  
  /**
   * 停止任务
   * @param {string} taskId 任务 ID
   * @returns {boolean} 是否成功停止
   */
  stopTask(taskId) {
    if (!this.runningTasks.has(taskId)) {
      return false;
    }
    
    const task = this.runningTasks.get(taskId);
    if (task.runner && task.status === 'running') {
      task.runner.stop();
      task.status = 'stopped';
      task.endTime = new Date();
      return true;
    }
    
    return false;
  }
  
  /**
   * 清理已完成的任务
   */
  cleanupTasks() {
    const now = new Date();
    
    for (const [taskId, task] of this.runningTasks.entries()) {
      // 清理超过 1 小时的已完成任务
      // 注意：这里的 task.status 是自动化任务的状态，不是浏览器实例状态
      // 但为了一致性，我们也定义了自动化任务的状态常量
      const TASK_STATUS = {
        RUNNING: 'running',
        COMPLETED: 'completed',
        FAILED: 'failed',
        STOPPED: 'stopped'
      };
      
      if (task.status !== TASK_STATUS.RUNNING && task.endTime) {
        const timeDiff = now - task.endTime;
        if (timeDiff > 3600000) { // 1 小时 = 3600000 毫秒
          this.runningTasks.delete(taskId);
        }
      }
    }
  }
  
  /**
   * 获取所有脚本
   * @returns {Array} 脚本列表
   */
  getAllScripts() {
    // 如果有缓存，直接返回
    if (this.scriptsCache) {
      return this.scriptsCache;
    }
    
    const scripts = [];
    
    try {
      // 读取脚本目录
      const files = fs.readdirSync(this.scriptsPath);
      
      // 过滤JSON文件
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      // 读取每个脚本文件
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.scriptsPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const script = JSON.parse(content);
          
          // 确保脚本有ID
          if (!script.id) {
            script.id = path.basename(file, '.json');
          }
          
          scripts.push(script);
        } catch (error) {
          console.error(`读取脚本文件 ${file} 失败:`, error);
        }
      }
      
      // 更新缓存
      this.scriptsCache = scripts;
    } catch (error) {
      console.error('获取脚本列表失败:', error);
    }
    
    return scripts;
  }
  
  /**
   * 根据ID获取脚本
   * @param {string} scriptId 脚本ID
   * @returns {Object|null} 脚本对象
   */
  getScriptById(scriptId) {
    if (!scriptId) {
      return null;
    }
    
    try {
      const filePath = path.join(this.scriptsPath, `${scriptId}.json`);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const script = JSON.parse(content);
      
      // 确保脚本有ID
      if (!script.id) {
        script.id = scriptId;
      }
      
      return script;
    } catch (error) {
      console.error(`获取脚本 ${scriptId} 失败:`, error);
      return null;
    }
  }
  
  /**
   * 保存脚本
   * @param {Object} script 脚本对象
   * @returns {Object} 保存结果
   */
  saveScript(script) {
    if (!script || !script.name) {
      throw new Error('脚本名称不能为空');
    }
    
    try {
      // 如果没有ID，生成一个新ID
      if (!script.id) {
        script.id = uuidv4();
      }
      
      // 添加创建时间和更新时间
      if (!script.createdAt) {
        script.createdAt = new Date().toISOString();
      }
      script.updatedAt = new Date().toISOString();
      
      // 保存脚本文件
      const filePath = path.join(this.scriptsPath, `${script.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(script, null, 2), 'utf8');
      
      // 清除缓存
      this.scriptsCache = null;
      
      return { success: true, id: script.id };
    } catch (error) {
      console.error('保存脚本失败:', error);
      throw new Error(`保存脚本失败: ${error.message}`);
    }
  }
  
  /**
   * 删除脚本
   * @param {string} scriptId 脚本ID
   * @returns {boolean} 是否成功删除
   */
  deleteScript(scriptId) {
    if (!scriptId) {
      return false;
    }
    
    try {
      const filePath = path.join(this.scriptsPath, `${scriptId}.json`);
      
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      // 删除文件
      fs.unlinkSync(filePath);
      
      // 清除缓存
      this.scriptsCache = null;
      
      return true;
    } catch (error) {
      console.error(`删除脚本 ${scriptId} 失败:`, error);
      return false;
    }
  }
}

/**
 * 自动化运行器类
 */
class AutomationRunner {
  constructor(browser, script) {
    this.browser = browser;
    this.script = script || {};
    
    // 确保脚本对象有必要的属性
    if (!this.script.steps) {
      this.script.steps = [];
    }
    
    this.variables = { ...(this.script.variables || {}) };
    this.currentTry = 0;
    this.stopped = false;
    
    console.log('AutomationRunner 初始化脚本:', JSON.stringify(this.script, null, 2));
  }
  
  /**
   * 运行自动化脚本
   * @returns {Promise<Object>} 执行结果
   */
  async run() {
    // 对于 Playwright，需要使用 context.newPage() 
    let page;
    if (this.browser.contexts && this.browser.contexts().length > 0) {
      // 如果是浏览器对象，使用第一个 context 创建页面
      page = await this.browser.contexts()[0].newPage();
    }
    const results = [];
    
    try {
      // 设置页面视口大小 - Playwright 使用不同的 API
      await page.setViewportSize({
        width: 1280,
        height: 800
      });
      
      // 设置默认超时时间
      page.setDefaultTimeout(30000);
      
      // 执行每个步骤
      for (let i = 0; i < this.script.steps.length; i++) {
        // 检查是否已停止
        if (this.stopped) {
          results.push({
            step: this.script.steps[i].type,
            success: false,
            error: '任务已手动停止'
          });
          break;
        }
        
        const step = this.script.steps[i];
        
        try {
          const result = await this.executeStep(page, step);
          results.push({
            step: step.type,
            success: true,
            result
          });
        } catch (error) {
          results.push({
            step: step.type,
            success: false,
            error: error.message
          });
          
          // 处理错误
          if (this.script.errorHandling) {
            const { onError, maxRetries, retryDelay } = this.script.errorHandling;
            
            if (onError === 'retry' && this.currentTry < maxRetries) {
              this.currentTry++;
              await page.waitForTimeout(retryDelay || 2000);
              // 重试当前步骤
              i--;
              continue;
            } else if (onError === 'abort') {
              break;
            }
            // 如果是 continue，则继续下一步
          } else {
            // 默认行为：失败时中止
            break;
          }
        }
      }
      
      return {
        success: results.every(r => r.success),
        results
      };
    } finally {
      await page.close();
    }
  }
  
  /**
   * 执行单个步骤
   * @param {Object} page Playwright 页面对象
   * @param {Object} step 步骤定义
   * @returns {Promise<any>} 执行结果
   */
  async executeStep(page, step) {
    // 替换变量
    const processValue = (value) => {
      if (typeof value !== 'string') return value;
      
      return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return this.variables[varName] !== undefined ? this.variables[varName] : match;
      });
    };
    
    switch (step.type) {
      case 'navigate':        
        // 在 Playwright 中，'networkidle' 表示 500ms 内没有网络请求
        return await page.goto(processValue(step.url), { 
          waitUntil: step.waitUntil || 'networkidle'
        });
        
      case 'wait':
        if (step.selector) {
          // Playwright 使用 waitForSelector 方法，但选项不同
          return await page.waitForSelector(processValue(step.selector), { 
            timeout: step.timeout || 30000,
            state: step.visible !== false ? 'visible' : 'attached'
          });
        } else if (step.time) {
          // Playwright 使用 page.waitForTimeout
          return await page.waitForTimeout(step.time);
        } else if (step.navigation) {
          // Playwright 使用 page.waitForNavigation
          // 在 Playwright 中，waitForNavigation 的参数与 Puppeteer 有所不同
          return await page.waitForNavigation({ 
            waitUntil: step.waitUntil || 'networkidle',
            timeout: step.timeout || 30000
          });
        }
        break;
        
      case 'input':
        const selector = processValue(step.selector);
        const value = processValue(step.value);
        
        // Playwright 使用 waitForSelector 方法，但选项不同
        await page.waitForSelector(selector, { state: 'visible' });
        
        // 清除现有内容
        if (step.clearFirst !== false) {
          // Playwright 有一个特定的清除方法
          await page.fill(selector, '');
        }
        
        if (step.humanize) {
          await this.humanTypeText(page, selector, value);
        } else {
          // Playwright 使用 fill 或 type
          await page.fill(selector, value);
        }
        return true;
        
      case 'click':
        const clickSelector = processValue(step.selector);
        // Playwright 使用 waitForSelector 方法，但选项不同
        await page.waitForSelector(clickSelector, { state: 'visible' });
        
        if (step.humanize) {
          // 模拟人类点击 - Playwright 的 API 类似
          const element = await page.$(clickSelector);
          const box = await element.boundingBox();
          
          // 随机点击元素内的位置
          const x = box.x + box.width * (0.3 + Math.random() * 0.4);
          const y = box.y + box.height * (0.3 + Math.random() * 0.4);
          
          await page.mouse.move(x, y, { steps: 5 });
          await page.waitForTimeout(100 + Math.random() * 200);
          await page.mouse.down();
          await page.waitForTimeout(50 + Math.random() * 100);
          await page.mouse.up();
        } else {
          // Playwright 的点击方法
          await page.click(clickSelector);
        }
        return true;
        
      case 'select':
        // Playwright 使用 selectOption 而不是 select
        await page.selectOption(
          processValue(step.selector), 
          processValue(step.value)
        );
        return true;
        
      case 'screenshot':
        // Playwright 的 screenshot 选项类似但有一些不同
        const screenshotOptions = {
          fullPage: step.fullPage === true,
          path: step.path ? processValue(step.path) : undefined,
          type: step.type || 'png',
          quality: step.type === 'jpeg' ? (step.quality || 80) : undefined
        };
        return await page.screenshot(screenshotOptions);
        
      case 'extract':
        const extractSelector = processValue(step.selector);
        // Playwright 使用 waitForSelector 方法，但选项不同
        await page.waitForSelector(extractSelector, { state: 'visible' });
        
        const result = await page.evaluate((sel, attr) => {
          const element = document.querySelector(sel);
          if (!element) return null;
          
          if (attr) {
            return element.getAttribute(attr);
          } else {
            return element.textContent;
          }
        }, extractSelector, step.attribute);
        
        if (step.variable) {
          this.variables[step.variable] = result;
        }
        return result;
        
      case 'evaluate':
        return await page.evaluate(processValue(step.function));
        
      case 'scroll':
        if (step.selector) {
          await page.waitForSelector(processValue(step.selector));
          await page.$eval(processValue(step.selector), (element) => {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          });
        } else {
          await page.evaluate((x, y) => {
            window.scrollBy(x, y);
          }, step.x || 0, step.y || 0);
        }
        return true;
        
      default:
        throw new Error(`不支持的步骤类型: ${step.type}`);
    }
  }
  
  /**
   * 模拟人类输入文本
   * @param {Object} page Playwright 页面对象
   * @param {string} selector 元素选择器
   * @param {string} text 要输入的文本
   */
  async humanTypeText(page, selector, text) {
    // Playwright 的元素选择和聚焦方法
    const element = await page.$(selector);
    await element.focus();
    
    // 模拟人类打字速度
    for (let i = 0; i < text.length; i++) {
      // Playwright 的键盘输入方法
      await page.keyboard.type(text[i]);
      // 随机暂停时间，模拟人类打字节奏
      await page.waitForTimeout(50 + Math.random() * 100);
    }
  }
  
  /**
   * 停止自动化任务
   */
  stop() {
    this.stopped = true;
  }
}

module.exports = new AutomationService();
