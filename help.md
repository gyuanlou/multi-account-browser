# 多账号浏览器管理工具实现方案

## 1. 项目概述

本项目旨在开发一个类似 adspower browser 的多账号浏览器管理工具，具有以下核心功能：

- 为不同账号提供独立的指纹设备信息
- 保持每个账号的 Cookie 隔离
- 支持网络代理设置
- 可以多开不同账号
- 根据 IP 地址自动匹配地理位置信息
- 支持浏览器自动化操作

## 2. 技术选型

### 2.1 核心技术栈

- **基础框架**：Electron + Node.js
- **前端界面**：Vue.js 3 + Element Plus
- **浏览器控制**：Puppeteer + Chrome DevTools Protocol (CDP)
- **数据存储**：SQLite + Electron-store
- **代理管理**：支持 HTTP/HTTPS/SOCKS 代理
- **地理位置服务**：IP-API 或 MaxMind GeoIP 数据库

### 2.2 项目结构

```
multi-account-browser/
├── package.json          # 项目配置文件
├── main.js              # Electron 主进程
├── preload.js           # 预加载脚本
├── src/
│   ├── ui/              # 前端界面
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   ├── services/        # 核心服务
│   │   ├── browser-manager.js
│   │   ├── profile-manager.js
│   │   ├── fingerprint-manager.js
│   │   ├── proxy-manager.js
│   │   └── geo-location-service.js
│   └── utils/           # 工具函数
├── extensions/          # 浏览器扩展
│   └── fingerprint-defender/
└── resources/           # 资源文件
    └── geoip-database/  # GeoIP 数据库
```

## 3. 核心功能模块

### 3.1 浏览器配置文件管理

每个账号对应一个独立的浏览器配置文件，包含以下信息：

- 基本信息（名称、创建时间、备注等）
- 指纹设置（浏览器、操作系统、语言等）
- 代理设置（代理类型、地址、认证信息等）
- 地理位置设置（经纬度、时区等）
- 启动选项（起始页面、窗口大小等）

### 3.2 浏览器指纹管理

浏览器指纹管理模块负责生成和应用指纹设置，包括：

- 基础浏览器信息（User-Agent、Platform、Language 等）
- 硬件相关指纹（Canvas、WebGL、AudioContext 等）
- 网络相关指纹（WebRTC 保护）
- 时区和地理位置信息

### 3.3 IP 地址与地理位置关联

#### 3.3.1 地理位置数据源

1. **在线 API**：
   - IP-API.com：提供免费的 IP 地理位置查询服务
   - IPinfo.io：提供更详细的 IP 地理位置信息（需要 API 密钥）

2. **离线数据库**：
   - MaxMind GeoIP2 数据库：提供高精度的 IP 地理位置映射
   - IP2Location：另一个流行的 IP 地理位置数据库

#### 3.3.2 地理位置伪造实现

1. **代理 IP 地理位置获取流程**：
   ```
   获取代理 IP → 查询地理位置数据库 → 获取对应地理信息 → 应用到浏览器实例
   ```

2. **地理位置信息包括**：
   - 经纬度坐标
   - 国家/地区
   - 城市
   - 时区
   - 语言偏好

3. **应用地理位置的方法**：
   - 使用 CDP 的 `Emulation.setGeolocationOverride` 方法设置浏览器地理位置
   - 使用 CDP 的 `Emulation.setTimezoneOverride` 方法设置时区
   - 修改 `navigator.language` 和 `Accept-Language` 头以匹配地区

4. **代码实现示例**：
   ```javascript
   async function applyGeoLocationFromIP(client, ip) {
     try {
       // 从 IP 获取地理位置信息
       const geoData = await geoLocationService.getLocationFromIP(ip);
       
       // 设置地理位置
       await client.send('Emulation.setGeolocationOverride', {
         latitude: geoData.latitude,
         longitude: geoData.longitude,
         accuracy: 100
       });
       
       // 设置时区
       await client.send('Emulation.setTimezoneOverride', {
         timezoneId: geoData.timezone
       });
       
       // 设置语言
       await client.send('Emulation.setLocaleOverride', {
         locale: geoData.languages[0] || 'en-US'
       });
       
       return { success: true, geoData };
     } catch (error) {
       return { success: false, error: error.message };
     }
   }
   ```

### 3.4 代理管理

#### 3.4.1 代理类型支持

- HTTP 代理
- HTTPS 代理
- SOCKS4 代理
- SOCKS5 代理

#### 3.4.2 代理配置结构

```javascript
const proxyConfig = {
  enabled: true,
  type: 'http', // 'http', 'https', 'socks4', 'socks5'
  host: '127.0.0.1',
  port: 8080,
  username: '', // 可选，用于需要认证的代理
  password: '', // 可选，用于需要认证的代理
  autoRotate: false, // 是否自动轮换代理
  rotateInterval: 30, // 轮换间隔（分钟）
  testUrl: 'https://api.ipify.org?format=json', // 用于测试代理连接的 URL
};
```

#### 3.4.3 代理管理功能

1. **代理测试**：
   - 测试代理连接是否可用
   - 获取通过代理的公网 IP
   - 测试代理速度和延迟

2. **代理轮换**：
   - 支持从代理池中自动轮换代理
   - 支持按国家/地区筛选代理
   - 支持代理失效自动切换

3. **代理应用**：
   - 启动浏览器时应用代理设置
   - 运行时动态切换代理

#### 3.4.4 代理实现代码示例

```javascript
// 设置浏览器代理
function setupBrowserProxy(launchArgs, proxyConfig) {
  if (!proxyConfig || !proxyConfig.enabled) {
    return launchArgs;
  }
  
  const { type, host, port, username, password } = proxyConfig;
  let proxyUrl;
  
  if (username && password) {
    proxyUrl = `${type}://${username}:${password}@${host}:${port}`;
  } else {
    proxyUrl = `${type}://${host}:${port}`;
  }
  
  launchArgs.push(`--proxy-server=${proxyUrl}`);
  return launchArgs;
}

// 测试代理连接
async function testProxy(proxyConfig) {
  const { type, host, port, username, password, testUrl } = proxyConfig;
  
  try {
    const axios = require('axios');
    const httpsProxyAgent = require('https-proxy-agent');
    const socksProxyAgent = require('socks-proxy-agent');
    
    let agent;
    let proxyUrl;
    
    if (username && password) {
      proxyUrl = `${type}://${username}:${password}@${host}:${port}`;
    } else {
      proxyUrl = `${type}://${host}:${port}`;
    }
    
    if (type === 'socks4' || type === 'socks5') {
      agent = new socksProxyAgent(proxyUrl);
    } else {
      agent = new httpsProxyAgent(proxyUrl);
    }
    
    const startTime = Date.now();
    const response = await axios.get(testUrl, {
      httpsAgent: agent,
      timeout: 10000
    });
    const endTime = Date.now();
    
    return {
      success: true,
      ip: response.data.ip,
      latency: endTime - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

## 4. Vue.js 用户界面

### 4.1 界面结构

#### 4.1.1 主界面布局

```
+------------------------------------------+
|  导航栏（配置管理、设置、帮助）          |
+------------------------------------------+
|                                          |
|  +--------------------+  +-------------+ |
|  | 配置列表           |  | 配置详情    | |
|  | - 账号1            |  | 名称:       | |
|  | - 账号2            |  | 代理:       | |
|  | - 账号3            |  | 指纹:       | |
|  |                    |  | 地理位置:   | |
|  +--------------------+  +-------------+ |
|                                          |
+------------------------------------------+
|  状态栏（运行中的实例、系统信息）        |
+------------------------------------------+
```

#### 4.1.2 主要视图组件

1. **配置列表视图**：显示所有账号配置，支持搜索、排序和筛选
2. **配置详情视图**：编辑账号配置的所有参数
3. **运行实例视图**：显示所有正在运行的浏览器实例
4. **指纹编辑器**：自定义或随机生成浏览器指纹
5. **代理管理器**：管理和测试代理设置

### 4.2 Vue.js 组件结构

```
App.vue
├── NavigationBar.vue
├── ProfileList.vue
│   └── ProfileListItem.vue
├── ProfileEditor.vue
│   ├── BasicInfoTab.vue
│   ├── FingerprintTab.vue
│   ├── ProxyTab.vue
│   ├── GeoLocationTab.vue
│   └── StartupTab.vue
├── RunningInstances.vue
│   └── InstanceCard.vue
└── StatusBar.vue
```

### 4.3 地理位置与 IP 关联界面

#### 4.3.1 代理与地理位置关联组件

```vue
<!-- GeoLocationTab.vue -->
<template>
  <div class="geo-location-tab">
    <el-form label-position="top">
      <!-- 地理位置设置方式 -->
      <el-form-item label="地理位置设置方式">
        <el-radio-group v-model="locationType">
          <el-radio label="auto">根据代理 IP 自动设置</el-radio>
          <el-radio label="manual">手动设置</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <!-- 自动设置时显示的信息 -->
      <template v-if="locationType === 'auto'">
        <el-alert
          title="系统将根据代理 IP 自动设置对应的地理位置信息"
          type="info"
          :closable="false">
        </el-alert>
        
        <el-form-item label="代理 IP 测试">
          <el-button type="primary" @click="testProxyIP" :loading="testing">
            测试当前代理 IP
          </el-button>
        </el-form-item>
        
        <div v-if="proxyTestResult" class="test-result">
          <el-descriptions border>
            <el-descriptions-item label="IP 地址">{{ proxyTestResult.ip }}</el-descriptions-item>
            <el-descriptions-item label="国家/地区">{{ proxyTestResult.country }}</el-descriptions-item>
            <el-descriptions-item label="城市">{{ proxyTestResult.city }}</el-descriptions-item>
            <el-descriptions-item label="经纬度">{{ proxyTestResult.latitude }}, {{ proxyTestResult.longitude }}</el-descriptions-item>
            <el-descriptions-item label="时区">{{ proxyTestResult.timezone }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </template>
      
      <!-- 手动设置地理位置 -->
      <template v-else>
        <el-form-item label="国家/地区">
          <el-select v-model="geoLocation.country" filterable>
            <el-option
              v-for="country in countries"
              :key="country.code"
              :label="country.name"
              :value="country.code">
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="城市">
          <el-select v-model="geoLocation.city" filterable>
            <el-option
              v-for="city in cities"
              :key="city.name"
              :label="city.name"
              :value="city.name">
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="经度">
          <el-input-number v-model="geoLocation.longitude" :min="-180" :max="180" :step="0.01"></el-input-number>
        </el-form-item>
        
        <el-form-item label="纬度">
          <el-input-number v-model="geoLocation.latitude" :min="-90" :max="90" :step="0.01"></el-input-number>
        </el-form-item>
        
        <el-form-item label="时区">
          <el-select v-model="geoLocation.timezone" filterable>
            <el-option
              v-for="timezone in timezones"
              :key="timezone.id"
              :label="timezone.name"
              :value="timezone.id">
            </el-option>
          </el-select>
        </el-form-item>
      </template>
    </el-form>
  </div>
</template>

<script>
export default {
  name: 'GeoLocationTab',
  props: {
    profile: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      locationType: this.profile.geoLocation?.autoFromProxy ? 'auto' : 'manual',
      geoLocation: {
        country: this.profile.geoLocation?.country || '',
        city: this.profile.geoLocation?.city || '',
        latitude: this.profile.geoLocation?.latitude || 0,
        longitude: this.profile.geoLocation?.longitude || 0,
        timezone: this.profile.geoLocation?.timezone || 'Asia/Shanghai'
      },
      testing: false,
      proxyTestResult: null,
      countries: [], // 国家列表
      cities: [], // 城市列表
      timezones: [] // 时区列表
    };
  },
  watch: {
    locationType(val) {
      this.$emit('update:profile', {
        ...this.profile,
        geoLocation: {
          ...this.profile.geoLocation,
          autoFromProxy: val === 'auto'
        }
      });
    },
    geoLocation: {
      deep: true,
      handler(val) {
        if (this.locationType === 'manual') {
          this.$emit('update:profile', {
            ...this.profile,
            geoLocation: {
              ...val,
              autoFromProxy: false
            }
          });
        }
      }
    }
  },
  created() {
    this.loadCountries();
    this.loadTimezones();
  },
  methods: {
    async testProxyIP() {
      this.testing = true;
      try {
        // 调用主进程测试代理 IP
        const result = await window.ipcRenderer.invoke('test-proxy', this.profile.proxy);
        if (result.success) {
          this.proxyTestResult = result;
        } else {
          this.$message.error(`代理测试失败: ${result.error}`);
        }
      } catch (error) {
        this.$message.error(`代理测试出错: ${error.message}`);
      } finally {
        this.testing = false;
      }
    },
    async loadCountries() {
      // 加载国家列表
      this.countries = await window.ipcRenderer.invoke('get-countries');
    },
    async loadCities() {
      // 根据选择的国家加载城市列表
      if (this.geoLocation.country) {
        this.cities = await window.ipcRenderer.invoke('get-cities', this.geoLocation.country);
      }
    },
    async loadTimezones() {
      // 加载时区列表
      this.timezones = await window.ipcRenderer.invoke('get-timezones');
    }
  }
};
</script>

## 5. 浏览器自动化功能

### 5.1 自动化功能概述

多账号浏览器管理工具支持以下自动化功能：

1. **基本操作自动化**：
   - 页面导航和点击
   - 表单填写和提交
   - 等待和定时操作

2. **高级自动化**：
   - 验证码识别和处理
   - 模拟人类行为（随机延迟、自然鼠标移动）
   - 条件判断和循环操作

3. **批量任务**：
   - 多账号批量执行相同任务
   - 任务排队和调度
   - 任务结果收集和报告

### 5.2 自动化实现方式

#### 5.2.1 Puppeteer 自动化

使用 Puppeteer 提供的 API 进行浏览器自动化控制：

```javascript
async function automateLogin(browser, credentials) {
  const page = await browser.newPage();
  
  try {
    // 导航到登录页面
    await page.goto('https://example.com/login');
    
    // 等待登录表单加载
    await page.waitForSelector('#username');
    
    // 模拟人类输入行为
    await humanTypeText(page, '#username', credentials.username);
    await humanTypeText(page, '#password', credentials.password);
    
    // 点击登录按钮
    await page.click('#login-button');
    
    // 等待登录成功
    await page.waitForNavigation();
    
    // 检查是否登录成功
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('.user-profile') !== null;
    });
    
    return {
      success: isLoggedIn,
      page: isLoggedIn ? page : null
    };
  } catch (error) {
    await page.close();
    return {
      success: false,
      error: error.message
    };
  }
}

// 模拟人类输入文本
async function humanTypeText(page, selector, text) {
  await page.focus(selector);
  
  for (const char of text) {
    await page.keyboard.type(char);
    // 随机延迟 50-150ms
    await page.waitForTimeout(50 + Math.random() * 100);
  }
}
```

#### 5.2.2 自动化脚本定义

用户可以通过 JSON 格式定义自动化脚本：

```javascript
const automationScript = {
  name: "登录支付宝",
  steps: [
    {
      type: "navigate",
      url: "https://auth.alipay.com/login/index.htm"
    },
    {
      type: "wait",
      selector: "#J-input-user",
      timeout: 5000
    },
    {
      type: "input",
      selector: "#J-input-user",
      value: "{{username}}",
      humanize: true
    },
    {
      type: "input",
      selector: "#password_rsainput",
      value: "{{password}}",
      humanize: true
    },
    {
      type: "click",
      selector: "#J-login-btn"
    },
    {
      type: "wait",
      selector: ".user-info",
      timeout: 10000
    },
    {
      type: "screenshot",
      name: "login-success"
    }
  ],
  variables: {
    username: "user123",
    password: "pass123"
  },
  errorHandling: {
    onError: "retry",  // retry, continue, abort
    maxRetries: 3,
    retryDelay: 2000
  }
};
```

#### 5.2.3 自动化脚本执行器

```javascript
class AutomationRunner {
  constructor(browser, script) {
    this.browser = browser;
    this.script = script;
    this.variables = { ...script.variables };
    this.currentTry = 0;
  }
  
  async run() {
    const page = await this.browser.newPage();
    const results = [];
    
    try {
      for (const step of this.script.steps) {
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
              await page.waitForTimeout(retryDelay);
              // 重试当前步骤
              step--;
              continue;
            } else if (onError === 'abort') {
              break;
            }
            // 如果是 continue，则继续下一步
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
  
  async executeStep(page, step) {
    // 替换变量
    const processValue = (value) => {
      if (typeof value !== 'string') return value;
      
      return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return this.variables[varName] || match;
      });
    };
    
    switch (step.type) {
      case 'navigate':
        return await page.goto(processValue(step.url));
        
      case 'wait':
        if (step.selector) {
          return await page.waitForSelector(processValue(step.selector), { timeout: step.timeout || 30000 });
        } else if (step.time) {
          return await page.waitForTimeout(step.time);
        }
        break;
        
      case 'input':
        const selector = processValue(step.selector);
        const value = processValue(step.value);
        
        if (step.humanize) {
          await humanTypeText(page, selector, value);
        } else {
          await page.type(selector, value);
        }
        return true;
        
      case 'click':
        await page.click(processValue(step.selector));
        return true;
        
      case 'screenshot':
        return await page.screenshot({ path: `${processValue(step.name)}.png` });
        
      case 'extract':
        const result = await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          return element ? element.textContent : null;
        }, processValue(step.selector));
        
        if (step.variable) {
          this.variables[step.variable] = result;
        }
        return result;
        
      default:
        throw new Error(`不支持的步骤类型: ${step.type}`);
    }
  }
}
```

## 6. 实现计划

### 6.1 开发阶段

1. **阶段一：基础架构搭建（2周）**
   - 搭建 Electron + Vue.js 项目框架
   - 实现基本的主进程和渲染进程通信
   - 设计并实现数据存储模块

2. **阶段二：核心功能开发（3周）**
   - 实现浏览器实例管理
   - 实现指纹修改功能
   - 实现代理管理功能
   - 实现地理位置与 IP 关联功能

3. **阶段三：用户界面开发（2周）**
   - 实现配置管理界面
   - 实现浏览器实例管理界面
   - 实现指纹编辑器和代理管理器

4. **阶段四：自动化功能开发（2周）**
   - 实现基本自动化操作
   - 实现自动化脚本编辑器
   - 实现批量任务管理

5. **阶段五：测试和优化（1周）**
   - 功能测试和 Bug 修复
   - 性能优化
   - 用户体验改进

### 6.2 部署和发布

1. **打包和分发**
   - 使用 electron-builder 打包为各平台可执行文件
   - 准备安装程序和更新机制

2. **文档和支持**
   - 编写用户手册和开发文档
   - 建立支持渠道

### 6.3 后续计划

1. **功能扩展**
   - 更多指纹防检测技术
   - 更多自动化功能
   - 云端同步和备份

2. **性能优化**
   - 降低资源占用
   - 提高多开稳定性

## 7. 总结

本项目将使用 Node.js 和 Electron 技术栈，结合 Vue.js 前端框架，开发一个功能完善的多账号浏览器管理工具。通过深度集成 Chrome DevTools Protocol，实现浏览器指纹的精确控制，并通过 IP 地址与地理位置的关联，提供真实的浏览环境模拟。

该工具将满足用户对多账号管理、指纹伪造、代理设置和自动化操作的需求，为用户提供安全、高效的多账号操作环境。
