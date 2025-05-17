/**
 * 设置服务
 * 负责管理用户设置和偏好
 */
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const Store = require('electron-store');

class SettingsService {
  constructor() {
    try {
      // 初始化设置存储
      console.log('初始化设置服务...');
      this.store = new Store({
        name: 'settings',
        fileExtension: 'json',
        cwd: process.env.APPDATA || (
          process.platform === 'darwin' 
            ? path.join(process.env.HOME, 'Library', 'Application Support')
            : path.join(process.env.HOME, '.config')
        )
      });
      console.log('设置存储初始化成功');
    } catch (error) {
      console.error('初始化设置存储失败:', error);
      // 创建内存存储作为备用
      this.inMemoryStore = {};
      console.log('已创建内存存储作为备用');
    }
    
    // 默认设置
    this.defaultSettings = {
      theme: 'light', // 'light' 或 'dark'
      language: 'zh-CN', // 语言设置
      autoBackup: {
        enabled: false,
        interval: 'daily', // 'daily', 'weekly', 'monthly'
        keepCount: 5
      },
      security: {
        masterPasswordEnabled: false,
        masterPasswordHash: null,
        autoLock: true,
        lockAfterMinutes: 30
      },
      performance: {
        maxInstances: 5, // 最大浏览器实例数
        resourceSaving: 'balanced', // 'performance', 'balanced', 'memory'
        closeInactiveAfter: 0 // 0 表示不自动关闭，单位：分钟
      },
      ui: {
        sidebarWidth: 280,
        showStatusBar: true,
        showToolbar: true,
        defaultTab: 'profiles' // 默认打开的标签页
      }
    };
    
    // 初始化设置
    this.initSettings();
  }
  
  /**
   * 初始化设置
   */
  initSettings() {
    try {
      // 如果设置不存在，使用默认设置
      console.log('初始化设置...');
      
      // 检查是否使用内存存储
      if (this.inMemoryStore !== undefined) {
        console.log('使用内存存储初始化设置');
        this.inMemoryStore['settings'] = this.defaultSettings;
        return;
      }
      
      const currentSettings = this.store.get('settings');
      console.log('当前设置:', currentSettings ? '已存在' : '不存在');
      
      if (!currentSettings) {
        this.store.set('settings', this.defaultSettings);
        console.log('已设置默认设置');
      }
    } catch (error) {
      console.error('初始化设置失败:', error);
      // 如果出错，使用内存存储
      if (this.inMemoryStore === undefined) {
        this.inMemoryStore = {};
      }
      this.inMemoryStore['settings'] = this.defaultSettings;
      console.log('已创建内存设置');
    }
  }
  
  /**
   * 获取所有设置
   * @returns {Object} 设置对象
   */
  getAllSettings() {
    try {
      // 检查是否使用内存存储
      if (this.inMemoryStore !== undefined) {
        return this.inMemoryStore['settings'] || this.defaultSettings;
      }
      
      return this.store.get('settings') || this.defaultSettings;
    } catch (error) {
      console.error('获取设置失败:', error);
      return this.defaultSettings;
    }
  }
  
  /**
   * 获取特定设置
   * @param {string} key 设置键
   * @returns {any} 设置值
   */
  getSetting(key) {
    try {
      console.log(`获取设置: ${key}`);
      const settings = this.getAllSettings();
      const keys = key.split('.');
      
      let value = settings;
      for (const k of keys) {
        if (value === undefined || value === null) {
          console.log(`设置键 ${key} 的值为 undefined`);
          return undefined;
        }
        value = value[k];
      }
      
      console.log(`设置键 ${key} 的值:`, value);
      return value;
    } catch (error) {
      console.error(`获取设置 ${key} 失败:`, error);
      return undefined;
    }
  }
  
  /**
   * 更新设置
   * @param {string} key 设置键
   * @param {any} value 设置值
   * @returns {boolean} 是否成功更新
   */
  updateSetting(key, value) {
    try {
      console.log(`更新设置: ${key} = `, value);
      const settings = this.getAllSettings();
      const keys = key.split('.');
      
      // 递归更新嵌套对象
      const updateNestedObject = (obj, keyPath, val) => {
        const [currentKey, ...restKeys] = keyPath;
        
        if (restKeys.length === 0) {
          obj[currentKey] = val;
          return obj;
        }
        
        if (!obj[currentKey] || typeof obj[currentKey] !== 'object') {
          obj[currentKey] = {};
        }
        
        updateNestedObject(obj[currentKey], restKeys, val);
        return obj;
      };
      
      updateNestedObject(settings, keys, value);
      
      // 检查是否使用内存存储
      if (this.inMemoryStore !== undefined) {
        this.inMemoryStore['settings'] = settings;
        console.log(`已更新内存设置: ${key}`);
      } else {
        this.store.set('settings', settings);
        console.log(`已更新持久化设置: ${key}`);
      }
      
      // 如果更新的是主题，应用主题
      if (key === 'theme') {
        this.applyTheme(value);
      }
      
      return true;
    } catch (error) {
      console.error(`更新设置 ${key} 失败:`, error);
      
      // 如果出错，尝试使用内存存储
      try {
        if (this.inMemoryStore === undefined) {
          this.inMemoryStore = {};
          this.inMemoryStore['settings'] = this.defaultSettings;
        }
        
        const settings = this.inMemoryStore['settings'];
        const keys = key.split('.');
        
        // 递归更新嵌套对象
        const updateNestedObject = (obj, keyPath, val) => {
          const [currentKey, ...restKeys] = keyPath;
          
          if (restKeys.length === 0) {
            obj[currentKey] = val;
            return obj;
          }
          
          if (!obj[currentKey] || typeof obj[currentKey] !== 'object') {
            obj[currentKey] = {};
          }
          
          updateNestedObject(obj[currentKey], restKeys, val);
          return obj;
        };
        
        updateNestedObject(settings, keys, value);
        this.inMemoryStore['settings'] = settings;
        
        console.log(`已使用内存存储更新设置: ${key}`);
        return true;
      } catch (innerError) {
        console.error(`内存存储更新设置 ${key} 失败:`, innerError);
        return false;
      }
    }
  }
  
  /**
   * 重置设置为默认值
   * @returns {boolean} 是否成功重置
   */
  resetSettings() {
    try {
      console.log('重置设置为默认值');
      
      // 检查是否使用内存存储
      if (this.inMemoryStore !== undefined) {
        this.inMemoryStore['settings'] = this.defaultSettings;
        console.log('已重置内存设置');
      } else {
        this.store.set('settings', this.defaultSettings);
        console.log('已重置持久化设置');
      }
      
      return true;
    } catch (error) {
      console.error('重置设置失败:', error);
      
      // 如果出错，尝试使用内存存储
      try {
        if (this.inMemoryStore === undefined) {
          this.inMemoryStore = {};
        }
        this.inMemoryStore['settings'] = this.defaultSettings;
        console.log('已使用内存存储重置设置');
        return true;
      } catch (innerError) {
        console.error('内存存储重置设置失败:', innerError);
        return false;
      }
    }
  }
  
  /**
   * 应用主题
   * @param {string} theme 主题名称
   */
  applyTheme(theme) {
    // 在渲染进程中，这个方法会被忽略
    // 主题应用逻辑应该在渲染进程中处理
    if (process.type !== 'renderer') {
      return;
    }
    
    // 在渲染进程中应用主题
    document.body.className = `theme-${theme}`;
    
    // 存储主题偏好到本地存储
    localStorage.setItem('theme', theme);
  }
  
  /**
   * 获取当前主题
   * @returns {string} 主题名称
   */
  getCurrentTheme() {
    return this.getSetting('theme') || 'light';
  }
  
  /**
   * 切换主题
   * @returns {string} 新的主题名称
   */
  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.updateSetting('theme', newTheme);
    return newTheme;
  }
  
  /**
   * 导出设置
   * @param {string} filePath 导出文件路径
   * @returns {boolean} 是否成功导出
   */
  exportSettings(filePath) {
    try {
      const settings = this.getAllSettings();
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
      return true;
    } catch (error) {
      console.error('导出设置失败:', error);
      return false;
    }
  }
  
  /**
   * 导入设置
   * @param {string} filePath 导入文件路径
   * @returns {boolean} 是否成功导入
   */
  importSettings(filePath) {
    try {
      const settingsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.store.set('settings', settingsData);
      return true;
    } catch (error) {
      console.error('导入设置失败:', error);
      return false;
    }
  }
  
  /**
   * 设置主密码
   * @param {string} password 主密码
   * @returns {boolean} 是否成功设置
   */
  setMasterPassword(password) {
    try {
      const crypto = require('crypto');
      
      // 生成随机盐值
      const salt = crypto.randomBytes(16).toString('hex');
      
      // 使用 PBKDF2 生成密码哈希
      const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      
      // 存储密码哈希和盐值
      this.updateSetting('security.masterPasswordEnabled', true);
      this.updateSetting('security.masterPasswordHash', `${salt}:${hash}`);
      
      return true;
    } catch (error) {
      console.error('设置主密码失败:', error);
      return false;
    }
  }
  
  /**
   * 验证主密码
   * @param {string} password 要验证的密码
   * @returns {boolean} 是否验证成功
   */
  verifyMasterPassword(password) {
    try {
      const crypto = require('crypto');
      
      // 获取存储的密码哈希和盐值
      const storedHash = this.getSetting('security.masterPasswordHash');
      
      if (!storedHash) {
        return false;
      }
      
      const [salt, hash] = storedHash.split(':');
      
      // 使用相同的参数生成哈希
      const inputHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      
      // 比较哈希值
      return inputHash === hash;
    } catch (error) {
      console.error('验证主密码失败:', error);
      return false;
    }
  }
  
  /**
   * 清除主密码
   * @returns {boolean} 是否成功清除
   */
  clearMasterPassword() {
    try {
      this.updateSetting('security.masterPasswordEnabled', false);
      this.updateSetting('security.masterPasswordHash', null);
      return true;
    } catch (error) {
      console.error('清除主密码失败:', error);
      return false;
    }
  }
}

module.exports = new SettingsService();
