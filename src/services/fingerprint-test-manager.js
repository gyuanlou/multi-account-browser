/**
 * 指纹测试平台管理器
 * 提供多平台指纹测试功能
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class FingerprintTestPlatform {
  constructor(id, name, url, selectors, evaluationFn) {
    this.id = id;          // 平台ID
    this.name = name;      // 平台名称
    this.url = url;        // 测试URL
    this.selectors = selectors; // 结果选择器
    this.evaluationFn = evaluationFn; // 评估函数
  }
  
  async runTest(page) {
    try {
      console.log(`开始在 ${this.name} 上进行测试...`);
      await page.goto(this.url, { waitUntil: 'networkidle' });
      
      // 等待测试完成
      for (const selector of this.selectors) {
        await page.waitForSelector(selector, { timeout: 30000 });
      }
      
      // 提取结果
      const result = await page.evaluate(this.evaluationFn);
      
      // 保存截图
      const screenshotPath = path.join(
        app.getPath('userData'), 
        'fingerprint-tests', 
        `${this.id}-${new Date().getTime()}.png`
      );
      
      // 确保目录存在
      const dir = path.dirname(screenshotPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      return {
        platform: this.name,
        url: this.url,
        timestamp: new Date().toISOString(),
        data: result,
        screenshotPath
      };
    } catch (error) {
      console.error(`${this.name} 测试失败:`, error);
      return { 
        platform: this.name,
        url: this.url,
        timestamp: new Date().toISOString(),
        error: error.message 
      };
    }
  }
}

class FingerprintTestManager {
  constructor() {
    this.platforms = [
      // Yalala.com - 主要测试平台
      new FingerprintTestPlatform(
        'yalala',
        'Yalala',
        'https://www.yalala.com/',
        ['.fingerprint-result', '#canvas-result'],
        () => {
          // 提取指纹结果
          const fingerprintElement = document.querySelector('.fingerprint-result');
          const canvasElement = document.querySelector('#canvas-result');
          const webglElement = document.querySelector('#webgl-result');
          const audioElement = document.querySelector('#audio-result');
          
          return {
            fingerprint: fingerprintElement ? fingerprintElement.textContent : '未检测到指纹',
            canvas: canvasElement ? canvasElement.textContent : '未检测到Canvas指纹',
            webgl: webglElement ? webglElement.textContent : '未检测到WebGL指纹',
            audio: audioElement ? audioElement.textContent : '未检测到音频指纹',
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            plugins: Array.from(navigator.plugins || []).map(p => p.name),
            screenSize: `${window.screen.width}x${window.screen.height}`,
            colorDepth: window.screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          };
        }
      ),
      
      // AmIUnique.org - 详细的浏览器指纹分析
      new FingerprintTestPlatform(
        'amiunique',
        'AmIUnique',
        'https://amiunique.org/fp',
        ['.fingerprintTable'],
        () => {
          // 提取指纹数据
          const rows = document.querySelectorAll('.fingerprintTable tr');
          const data = {};
          
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              data[cells[0].textContent.trim()] = cells[1].textContent.trim();
            }
          });
          
          // 提取唯一性评分
          const uniquenessElement = document.querySelector('.uniqueness');
          const uniqueness = uniquenessElement ? uniquenessElement.textContent : '未知';
          
          return {
            uniqueness,
            details: data
          };
        }
      ),
      
      // Browserleaks.com - 浏览器信息泄露测试
      new FingerprintTestPlatform(
        'browserleaks',
        'Browserleaks',
        'https://browserleaks.com/canvas',
        ['.canvas-fingerprint'],
        () => {
          // 提取Canvas指纹
          const canvasElement = document.querySelector('.canvas-fingerprint');
          const canvasHash = canvasElement ? canvasElement.textContent : '未检测到';
          
          // 提取其他信息
          const userAgentElement = document.querySelector('.user-agent');
          const platformElement = document.querySelector('.platform');
          
          return {
            canvasHash,
            userAgent: userAgentElement ? userAgentElement.textContent : navigator.userAgent,
            platform: platformElement ? platformElement.textContent : navigator.platform,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            colorDepth: window.screen.colorDepth,
            plugins: Array.from(navigator.plugins || []).map(p => p.name).length
          };
        }
      )
    ];
    
    // 存储测试结果的目录
    this.testResultsDir = path.join(app.getPath('userData'), 'fingerprint-tests');
    this.ensureTestResultsDirExists();
  }
  
  // 确保测试结果目录存在
  ensureTestResultsDirExists() {
    if (!fs.existsSync(this.testResultsDir)) {
      fs.mkdirSync(this.testResultsDir, { recursive: true });
    }
  }
  
  // 获取所有测试平台
  getAllPlatforms() {
    return this.platforms;
  }
  
  // 根据ID获取平台
  getPlatformById(id) {
    return this.platforms.find(p => p.id === id);
  }
  
  // 在指定平台上运行测试
  async runTest(browser, platformId) {
    const platform = this.getPlatformById(platformId);
    if (!platform) {
      throw new Error(`未找到ID为 ${platformId} 的测试平台`);
    }
    
    // 获取浏览器上下文
    const context = browser.contexts ? browser.contexts()[0] : browser;
    const page = await context.newPage();
    
    try {
      const result = await platform.runTest(page);
      
      // 保存测试结果
      this.saveTestResult(result);
      
      return result;
    } finally {
      await page.close();
    }
  }
  
  // 运行所有测试
  async runAllTests(browser, platformIds = null) {
    const results = {};
    const platforms = platformIds 
      ? platformIds.map(id => this.getPlatformById(id)).filter(Boolean)
      : this.platforms;
    
    // 获取浏览器上下文
    const context = browser.contexts ? browser.contexts()[0] : browser;
    
    for (const platform of platforms) {
      const page = await context.newPage();
      try {
        results[platform.id] = await platform.runTest(page);
      } catch (error) {
        console.error(`在 ${platform.name} 上测试失败:`, error);
        results[platform.id] = { 
          platform: platform.name,
          url: platform.url,
          timestamp: new Date().toISOString(),
          error: error.message 
        };
      } finally {
        await page.close();
      }
    }
    
    // 保存测试结果
    this.saveTestResults(results);
    
    return results;
  }
  
  // 运行前后对比测试
  async runComparisonTest(browser, fingerprintConfig, platformIds = null) {
    const fingerprintManager = require('./enhanced-fingerprint-manager');
    const platforms = platformIds 
      ? platformIds.map(id => this.getPlatformById(id)).filter(Boolean)
      : this.platforms;
    
    console.log('开始无防护测试...');
    
    // 创建无防护的浏览器上下文
    const context1 = await browser.newContext();
    const beforeResults = {};
    
    for (const platform of platforms) {
      const page = await context1.newPage();
      try {
        beforeResults[platform.id] = await platform.runTest(page);
      } catch (error) {
        beforeResults[platform.id] = { 
          platform: platform.name,
          url: platform.url,
          timestamp: new Date().toISOString(),
          error: error.message 
        };
      } finally {
        await page.close();
      }
    }
    
    await context1.close();
    
    console.log('开始有防护测试...');
    
    // 创建有防护的浏览器上下文
    const context2 = await browser.newContext();
    await fingerprintManager.applyFingerprint(context2, fingerprintConfig);
    
    const afterResults = {};
    for (const platform of platforms) {
      const page = await context2.newPage();
      try {
        afterResults[platform.id] = await platform.runTest(page);
      } catch (error) {
        afterResults[platform.id] = { 
          platform: platform.name,
          url: platform.url,
          timestamp: new Date().toISOString(),
          error: error.message 
        };
      } finally {
        await page.close();
      }
    }
    
    await context2.close();
    
    // 保存对比结果
    const comparisonResult = {
      timestamp: new Date().toISOString(),
      fingerprintConfig,
      before: beforeResults,
      after: afterResults
    };
    
    this.saveComparisonResult(comparisonResult);
    
    return comparisonResult;
  }
  
  // 保存单个测试结果
  saveTestResult(result) {
    const filePath = path.join(
      this.testResultsDir, 
      `test-${result.platform}-${new Date().getTime()}.json`
    );
    
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    return filePath;
  }
  
  // 保存多个测试结果
  saveTestResults(results) {
    const filePath = path.join(
      this.testResultsDir, 
      `tests-${new Date().getTime()}.json`
    );
    
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    return filePath;
  }
  
  // 保存对比结果
  saveComparisonResult(result) {
    const filePath = path.join(
      this.testResultsDir, 
      `comparison-${new Date().getTime()}.json`
    );
    
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    return filePath;
  }
  
  // 获取最近的测试结果
  getRecentTestResults(count = 5) {
    try {
      const files = fs.readdirSync(this.testResultsDir)
        .filter(file => file.startsWith('test-') && file.endsWith('.json'))
        .sort((a, b) => {
          const timeA = parseInt(a.split('-').pop().replace('.json', ''));
          const timeB = parseInt(b.split('-').pop().replace('.json', ''));
          return timeB - timeA;  // 降序排列
        })
        .slice(0, count);
      
      return files.map(file => {
        const filePath = path.join(this.testResultsDir, file);
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      });
    } catch (error) {
      console.error('获取最近测试结果失败:', error);
      return [];
    }
  }
  
  // 获取最近的对比结果
  getRecentComparisonResults(count = 5) {
    try {
      const files = fs.readdirSync(this.testResultsDir)
        .filter(file => file.startsWith('comparison-') && file.endsWith('.json'))
        .sort((a, b) => {
          const timeA = parseInt(a.split('-').pop().replace('.json', ''));
          const timeB = parseInt(b.split('-').pop().replace('.json', ''));
          return timeB - timeA;  // 降序排列
        })
        .slice(0, count);
      
      return files.map(file => {
        const filePath = path.join(this.testResultsDir, file);
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      });
    } catch (error) {
      console.error('获取最近对比结果失败:', error);
      return [];
    }
  }
}

module.exports = new FingerprintTestManager();
