# 多浏览器支持实现计划

## 一、架构设计

### 1. 浏览器适配器模式

我们将采用适配器设计模式，为每种浏览器创建专门的适配器类，统一接口但实现不同：

```
src/
└── services/
    ├── adapters/
    │   ├── browser-adapter.js     # 基础适配器接口
    │   ├── chrome-adapter.js      # Chrome 适配器
    │   ├── edge-adapter.js        # Edge 适配器
    │   ├── safari-adapter.js      # Safari 适配器
    │   └── firefox-adapter.js     # Firefox 适配器
    └── browser-factory.js         # 浏览器工厂，负责创建适当的适配器
```

### 2. 浏览器检测与自动选择

创建一个浏览器检测服务，能够：
- 检测系统中已安装的浏览器
- 按优先级选择合适的浏览器
- 允许用户手动指定浏览器

## 二、实现步骤

### 第一阶段：基础架构搭建

#### 1. 创建基础适配器接口

```javascript
// src/services/adapters/browser-adapter.js
class BrowserAdapter {
  constructor() {
    if (this.constructor === BrowserAdapter) {
      throw new Error('BrowserAdapter 是抽象类，不能直接实例化');
    }
  }
  
  // 基础方法
  getBrowserPath() { throw new Error('必须实现 getBrowserPath 方法'); }
  buildLaunchArgs(profile, userDataDir, debugPort, options) { throw new Error('必须实现 buildLaunchArgs 方法'); }
  launchBrowser(executablePath, args, options) { throw new Error('必须实现 launchBrowser 方法'); }
  connectToBrowser(browserWSEndpoint) { throw new Error('必须实现 connectToBrowser 方法'); }
  
  // 指纹保护方法
  applyFingerprintProtection(page, profile) { throw new Error('必须实现 applyFingerprintProtection 方法'); }
  testFingerprintProtection(browser) { throw new Error('必须实现 testFingerprintProtection 方法'); }
  
  // 代理方法
  setupProxy(args, proxyConfig) { throw new Error('必须实现 setupProxy 方法'); }
  testProxy(proxyConfig) { throw new Error('必须实现 testProxy 方法'); }
  
  // 自动化方法
  navigateTo(page, url) { throw new Error('必须实现 navigateTo 方法'); }
  querySelector(page, selector) { throw new Error('必须实现 querySelector 方法'); }
  click(page, selector) { throw new Error('必须实现 click 方法'); }
  type(page, selector, text) { throw new Error('必须实现 type 方法'); }
  screenshot(page, options) { throw new Error('必须实现 screenshot 方法'); }
  
  // Cookie和存储方法
  clearCookies(browser) { throw new Error('必须实现 clearCookies 方法'); }
  clearLocalStorage(browser, url) { throw new Error('必须实现 clearLocalStorage 方法'); }
  
  // 用户数据目录方法
  getUserDataPath(baseDir, profileId) { throw new Error('必须实现 getUserDataPath 方法'); }
  cleanupUserData(userDataDir) { throw new Error('必须实现 cleanupUserData 方法'); }
}
```

#### 2. 创建浏览器工厂

```javascript
// src/services/browser-factory.js
const fs = require('fs');
const path = require('path');
const ChromeAdapter = require('./adapters/chrome-adapter');
const EdgeAdapter = require('./adapters/edge-adapter');
const SafariAdapter = require('./adapters/safari-adapter');
const FirefoxAdapter = require('./adapters/firefox-adapter');

class BrowserFactory {
  constructor() {
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
  
  // 检测系统中已安装的浏览器
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
  
  // 根据优先级选择浏览器
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
  
  // 检查特定浏览器是否已安装
  isInstalled(browser) {
    return this.detectInstalledBrowsers().includes(browser);
  }
  
  // 创建适配器实例
  createAdapter(browser = null) {
    const selectedBrowser = browser || this.selectBrowser();
    const AdapterClass = this.adapters[selectedBrowser];
    
    if (!AdapterClass) {
      throw new Error(`不支持的浏览器类型: ${selectedBrowser}`);
    }
    
    return new AdapterClass();
  }
}

module.exports = new BrowserFactory();
```

### 第二阶段：实现具体适配器

#### 1. Chrome 适配器

```javascript
// src/services/adapters/chrome-adapter.js
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const BrowserAdapter = require('./browser-adapter');

class ChromeAdapter extends BrowserAdapter {
  getBrowserPath() {
    // 根据不同操作系统返回 Chrome 路径
    switch (process.platform) {
      case 'win32':
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      case 'darwin':
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      case 'linux':
        // 尝试多个可能的路径
        const possiblePaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser'
        ];
        
        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            return path;
          }
        }
        throw new Error('找不到 Chrome 或 Chromium 浏览器');
      default:
        throw new Error('不支持的操作系统');
    }
  }
  
  buildLaunchArgs(profile, userDataDir, debugPort, options = {}) {
    // 构建 Chrome 启动参数
    const args = [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-sync',
      '--disable-features=TranslateUI',
      '--disable-breakpad'
    ];
    
    // 应用指纹保护设置
    if (profile.fingerprintProtection && profile.fingerprintProtection.enabled) {
      // 添加指纹保护相关参数
    }
    
    // 应用代理设置
    if (profile.proxy && profile.proxy.enabled) {
      this.setupProxy(args, profile.proxy);
    }
    
    // 添加其他选项
    if (options.url) {
      args.push(options.url);
    }
    
    return args;
  }
  
  setupProxy(args, proxyConfig) {
    if (!proxyConfig || !proxyConfig.enabled) {
      return args;
    }
    
    const { type, host, port, username, password } = proxyConfig;
    let proxyUrl;
    
    if (username && password) {
      proxyUrl = `${type}://${username}:${password}@${host}:${port}`;
    } else {
      proxyUrl = `${type}://${host}:${port}`;
    }
    
    args.push(`--proxy-server=${proxyUrl}`);
    return args;
  }
  
  async launchBrowser(executablePath, args, options = {}) {
    return await puppeteer.launch({
      executablePath,
      args,
      headless: false,
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: null,
      ...options
    });
  }
  
  async connectToBrowser(browserWSEndpoint) {
    return await puppeteer.connect({
      browserWSEndpoint,
      defaultViewport: null
    });
  }
  
  async applyFingerprintProtection(page, profile) {
    // 实现 Chrome 特定的指纹保护逻辑
    // 这部分代码需要从现有的 enhanced-fingerprint-manager.js 中提取
  }
  
  async testFingerprintProtection(browser) {
    // 实现 Chrome 特定的指纹保护测试
    // 这部分代码需要从现有的 enhanced-fingerprint-manager.js 中提取
  }
  
  // 实现其他必要的方法...
  async clearCookies(browser) {
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    return { success: true };
  }
  
  async clearLocalStorage(browser, url) {
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    }
    
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    return { success: true };
  }
  
  getUserDataPath(baseDir, profileId) {
    return path.join(baseDir, profileId);
  }
  
  async cleanupUserData(userDataDir) {
    const singletonLockPath = path.join(userDataDir, 'SingletonLock');
    if (fs.existsSync(singletonLockPath)) {
      try {
        fs.unlinkSync(singletonLockPath);
        return true;
      } catch (error) {
        console.error(`清理 SingletonLock 失败: ${error.message}`);
        return false;
      }
    }
    return true;
  }
}

module.exports = ChromeAdapter;
```

#### 2. Edge 适配器

```javascript
// src/services/adapters/edge-adapter.js
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const BrowserAdapter = require('./browser-adapter');

class EdgeAdapter extends BrowserAdapter {
  getBrowserPath() {
    // 根据不同操作系统返回 Edge 路径
    switch (process.platform) {
      case 'win32':
        return 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
      case 'darwin':
        return '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge';
      case 'linux':
        const possiblePaths = [
          '/usr/bin/microsoft-edge',
          '/usr/bin/microsoft-edge-stable'
        ];
        
        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            return path;
          }
        }
        throw new Error('找不到 Microsoft Edge 浏览器');
      default:
        throw new Error('不支持的操作系统');
    }
  }
  
  // Edge 基于 Chromium，大部分方法可以复用 Chrome 的实现
  buildLaunchArgs(profile, userDataDir, debugPort, options = {}) {
    // 与 Chrome 类似，但可能有一些 Edge 特定的参数
    const args = [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-sync',
      '--disable-features=TranslateUI',
      '--disable-breakpad'
    ];
    
    // Edge 特定参数
    args.push('--disable-features=msEdgeTranslate');
    
    // 应用指纹保护设置
    if (profile.fingerprintProtection && profile.fingerprintProtection.enabled) {
      // 添加指纹保护相关参数
    }
    
    // 应用代理设置
    if (profile.proxy && profile.proxy.enabled) {
      this.setupProxy(args, profile.proxy);
    }
    
    // 添加其他选项
    if (options.url) {
      args.push(options.url);
    }
    
    return args;
  }
  
  // 其他方法与 Chrome 类似
  setupProxy(args, proxyConfig) {
    // 与 Chrome 相同
    if (!proxyConfig || !proxyConfig.enabled) {
      return args;
    }
    
    const { type, host, port, username, password } = proxyConfig;
    let proxyUrl;
    
    if (username && password) {
      proxyUrl = `${type}://${username}:${password}@${host}:${port}`;
    } else {
      proxyUrl = `${type}://${host}:${port}`;
    }
    
    args.push(`--proxy-server=${proxyUrl}`);
    return args;
  }
  
  async launchBrowser(executablePath, args, options = {}) {
    return await puppeteer.launch({
      executablePath,
      args,
      headless: false,
      ignoreDefaultArgs: ['--enable-automation'],
      defaultViewport: null,
      ...options
    });
  }
  
  async connectToBrowser(browserWSEndpoint) {
    return await puppeteer.connect({
      browserWSEndpoint,
      defaultViewport: null
    });
  }
  
  async applyFingerprintProtection(page, profile) {
    // 实现 Edge 特定的指纹保护逻辑
    // 大部分与 Chrome 相同，但可能有一些 Edge 特定的调整
  }
  
  async testFingerprintProtection(browser) {
    // 实现 Edge 特定的指纹保护测试
    // 大部分与 Chrome 相同，但可能有一些 Edge 特定的调整
  }
  
  // 其他方法实现...
}

module.exports = EdgeAdapter;
```

#### 3. Firefox 和 Safari 适配器

这两个适配器需要使用 Playwright 而不是 Puppeteer，实现方式会有较大差异。

### 第三阶段：修改现有服务

#### 1. 修改 browser-manager.js

```javascript
// src/services/browser-manager.js
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
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
    
    // 延迟初始化，在需要时才设置事件监听
    this.init();
  }
  
  // 初始化方法保持不变
  init() {
    // ...现有代码...
  }
  
  // 修改启动浏览器方法，使用适配器
  async launchBrowser(profileId, options = {}) {
    const profile = await profileManager.getProfile(profileId);
    if (!profile) {
      throw new Error(`找不到配置文件: ${profileId}`);
    }
    
    // 检查是否已有实例在运行
    if (this.browserInstances.has(profileId)) {
      console.log(`浏览器实例已经在运行: ${profileId}`);
      return this.browserInstances.get(profileId);
    }
    
    // 获取浏览器适配器
    const browserType = profile.browserType || null; // 允许配置文件指定浏览器类型
    const adapter = browserFactory.createAdapter(browserType);
    
    // 获取用户数据目录
    const userDataDir = path.join(
      getElectron().app.getPath('userData'),
      'browser_profiles',
      profileId
    );
    
    // 确保用户数据目录存在
    if (!fs.existsSync(userDataDir)) {
      try {
        fs.mkdirSync(userDataDir, { recursive: true });
        console.log(`创建用户数据目录: ${userDataDir}`);
      } catch (e) {
        console.error(`创建用户数据目录失败: ${userDataDir}`, e);
      }
    }
    
    // 清理浏览器特定的锁文件
    await adapter.cleanupUserData(userDataDir);
    
    // 使用适配器获取浏览器路径
    const executablePath = adapter.getBrowserPath();
    
    // 使用适配器构建启动参数
    const debugPort = 9222 + Math.floor(Math.random() * 1000);
    const args = adapter.buildLaunchArgs(profile, userDataDir, debugPort, options);
    
    // 启动浏览器进程
    const browserProcess = spawn(executablePath, args, {
      detached: true,
      stdio: 'ignore'
    });
    
    // 将进程与配置文件关联
    const instance = {
      process: browserProcess,
      profileId,
      debugPort,
      userDataDir,
      adapter,
      pid: browserProcess.pid,
      startTime: new Date(),
      url: options.url || null
    };
    
    this.browserInstances.set(profileId, instance);
    
    // 处理进程退出
    browserProcess.on('exit', (code) => {
      console.log(`浏览器进程退出，配置文件: ${profileId}, 退出码: ${code}`);
      this.browserInstances.delete(profileId);
    });
    
    // 等待浏览器启动
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return instance;
  }
  
  // 修改连接到浏览器方法，使用适配器
  async connectToBrowser(profileId) {
    const instance = this.browserInstances.get(profileId);
    if (!instance) {
      throw new Error(`没有找到运行中的浏览器实例: ${profileId}`);
    }
    
    const { debugPort, adapter } = instance;
    const browserWSEndpoint = `ws://127.0.0.1:${debugPort}/devtools/browser`;
    
    try {
      const browser = await adapter.connectToBrowser(browserWSEndpoint);
      return browser;
    } catch (error) {
      console.error(`连接到浏览器失败: ${error.message}`);
      throw error;
    }
  }
  
  // 其他方法保持不变，但在需要时使用适配器
  // ...
}

module.exports = new BrowserManager();
```

#### 2. 修改 enhanced-fingerprint-manager.js

```javascript
// src/services/enhanced-fingerprint-manager.js
const browserManager = require('./browser-manager');

class EnhancedFingerprintManager {
  // ...现有代码...
  
  // 修改应用指纹保护方法，使用适配器
  async applyFingerprintProtection(browser, profile) {
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    
    // 获取浏览器实例信息
    const instance = Array.from(browserManager.browserInstances.values())
      .find(inst => inst.profileId === profile.id);
    
    if (!instance) {
      throw new Error(`找不到浏览器实例: ${profile.id}`);
    }
    
    // 使用适配器应用指纹保护
    await instance.adapter.applyFingerprintProtection(page, profile);
    
    return { success: true };
  }
  
  // 修改测试指纹保护方法，使用适配器
  async testFingerprintProtection(browser) {
    // 获取浏览器实例信息
    const instance = Array.from(browserManager.browserInstances.values())
      .find(inst => inst.process.pid === browser.process().pid);
    
    if (!instance) {
      throw new Error('找不到对应的浏览器实例');
    }
    
    // 使用适配器测试指纹保护
    return await instance.adapter.testFingerprintProtection(browser);
  }
  
  // ...现有代码...
}

module.exports = new EnhancedFingerprintManager();
```

### 第四阶段：UI 修改

#### 1. 修改 BasicInfoTab.js 添加浏览器选择

```javascript
// src/ui/components/BasicInfoTab.js
// ...现有代码...

// 添加浏览器选择下拉框
<el-form-item label="浏览器">
  <el-select v-model="localProfile.browserType" placeholder="选择浏览器">
    <el-option label="系统默认" value=""></el-option>
    <el-option label="Chrome" value="chrome"></el-option>
    <el-option label="Edge" value="edge"></el-option>
    <el-option label="Safari" value="safari"></el-option>
    <el-option label="Firefox" value="firefox"></el-option>
  </el-select>
</el-form-item>

// ...现有代码...
```

## 三、依赖管理

### 1. 更新 package.json

```json
{
  "dependencies": {
    // ...现有依赖...
    "playwright": "^1.35.0",  // 添加 Playwright 支持
    "puppeteer-core": "^19.7.0"
  }
}
```

## 四、实施时间表

1. **第一阶段（基础架构）**: 3天
   - 创建适配器接口
   - 实现浏览器工厂
   - 修改浏览器管理器

2. **第二阶段（Chrome 和 Edge 适配器）**: 2天
   - 实现 Chrome 适配器
   - 实现 Edge 适配器
   - 基本测试

3. **第三阶段（Firefox 适配器）**: 2天
   - 添加 Playwright 依赖
   - 实现 Firefox 适配器
   - 基本测试

4. **第四阶段（Safari 适配器）**: 2天
   - 实现 Safari 适配器
   - 基本测试

5. **第五阶段（UI 修改和集成）**: 2天
   - 修改 UI 组件
   - 集成测试
   - 修复问题

6. **第六阶段（全面测试和优化）**: 3天
   - 在不同操作系统上测试
   - 性能优化
   - 文档更新

**总计时间**: 约14天

## 五、注意事项和风险

1. **浏览器差异**:
   - 不同浏览器的指纹特征有差异
   - 可能需要为每种浏览器开发特定的指纹保护方法

2. **自动化兼容性**:
   - Safari 和 Firefox 的自动化与 Chrome/Edge 不同
   - 需要使用 Playwright 而非 Puppeteer

3. **用户数据目录**:
   - 不同浏览器的用户数据目录结构不同
   - 需要针对每种浏览器进行适配

4. **性能考虑**:
   - 添加多浏览器支持可能增加复杂性和资源消耗
   - 需要进行性能测试和优化

5. **维护成本**:
   - 支持多种浏览器增加了维护成本
   - 每当浏览器更新时可能需要更新适配器
