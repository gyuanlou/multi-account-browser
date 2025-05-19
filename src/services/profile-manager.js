/**
 * 配置文件管理服务
 * 负责浏览器配置文件的增删改查操作
 */
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Store = require('electron-store');
let electron;

// 延迟加载 electron 模块，避免在模块加载时使用 app 对象
function getElectron() {
  if (!electron) {
    electron = require('electron');
  }
  return electron;
}

class ProfileManager {
  constructor() {
    // 初始化配置存储
    this.store = new Store({
      name: 'profiles',
      fileExtension: 'json'
    });
    
    // 延迟初始化配置文件目录，确保 app 对象已准备好
    this.profilesDir = null;
    this.initProfilesDir();
  }
  
  /**
   * 初始化配置文件目录
   */
  initProfilesDir() {
    try {
      const { app } = getElectron();
      
      // 如果在主进程中运行
      if (process.type === 'browser') {
        // 如果 app 对象已准备好
        if (app.isReady()) {
          this.profilesDir = path.join(app.getPath('userData'), 'browser_profiles');
          if (!fs.existsSync(this.profilesDir)) {
            fs.mkdirSync(this.profilesDir, { recursive: true });
          }
        } else {
          // 如果 app 对象还没有准备好，等待它准备好
          app.on('ready', () => {
            this.profilesDir = path.join(app.getPath('userData'), 'browser_profiles');
            if (!fs.existsSync(this.profilesDir)) {
              fs.mkdirSync(this.profilesDir, { recursive: true });
            }
          });
        }
      } else {
        // 如果在渲染进程中运行，使用默认路径
        this.profilesDir = path.join(process.cwd(), 'user_data', 'browser_profiles');
        if (!fs.existsSync(this.profilesDir)) {
          fs.mkdirSync(this.profilesDir, { recursive: true });
        }
      }
    } catch (error) {
      console.error('初始化配置文件目录失败:', error);
      // 使用默认路径作为后备
      this.profilesDir = path.join(process.cwd(), 'user_data', 'browser_profiles');
      if (!fs.existsSync(this.profilesDir)) {
        fs.mkdirSync(this.profilesDir, { recursive: true });
      }
    }
  }
  
  /**
   * 获取所有配置文件
   * @returns {Array} 配置文件列表
   */
  getAllProfiles() {
    try {
      console.log('获取所有配置文件...');
      
      // 检查存储是否初始化
      if (!this.store) {
        console.error('存储对象未初始化');
        return [];
      }
      
      // 获取配置文件
      const profiles = this.store.get('profiles');
      
      if (!profiles) {
        console.log('没有找到配置文件，返回空数组');
        return [];
      }
      
      if (!Array.isArray(profiles)) {
        console.error('配置文件格式错误，应为数组，实际为:', typeof profiles);
        return [];
      }
      
      console.log(`找到 ${profiles.length} 个配置文件`);
      return profiles;
    } catch (error) {
      console.error('获取配置文件时出错:', error);
      return [];
    }
  }
  
  /**
   * 根据 ID 获取配置文件
   * @param {string} profileId 配置文件 ID
   * @returns {Object|null} 配置文件对象
   */
  getProfileById(profileId) {
    const profiles = this.getAllProfiles();
    return profiles.find(profile => profile.id === profileId) || null;
  }
  
  /**
   * 保存配置文件
   * @param {Object} profile 配置文件对象
   * @returns {Object} 保存后的配置文件
   */
  saveProfile(profile) {
    
    try {
      const profiles = this.getAllProfiles();
      console.log('当前配置文件数量:', profiles.length);
      
      // 确保 tags 字段存在
      if (!profile.tags) {
        profile.tags = [];
      }
      
      // 确保 notes 字段存在
      if (!profile.notes) {
        profile.notes = '';
      }
      
      // 确保 accounts 字段存在
      if (!profile.accounts) {
        profile.accounts = [];
      }
      
      // 确保 cookies 字段存在
      if (!profile.cookies) {
        profile.cookies = [];
      }
      
      if (!profile.id) {
        // 新建配置
        console.log('新建配置文件');
        profile.id = uuidv4();
        profile.createdAt = new Date().toISOString();
        profiles.push(profile);
      } else {
        // 更新配置
        console.log('更新配置文件:', profile.id);
        const index = profiles.findIndex(p => p.id === profile.id);
        if (index !== -1) {
          profile.updatedAt = new Date().toISOString();
          profiles[index] = profile;
        } else {
          console.log('未找到对应的配置文件，创建新的配置');
          profile.id = uuidv4();
          profile.createdAt = new Date().toISOString();
          profiles.push(profile);
        }
      }
      
      console.log('保存配置文件到存储中...');
      this.store.set('profiles', profiles);
      console.log('配置文件已保存到存储中');
      
      // 确保配置文件对应的用户数据目录存在
      if (this.profilesDir) {
        const userDataDir = path.join(this.profilesDir, profile.id);
        console.log('创建用户数据目录:', userDataDir);
        if (!fs.existsSync(userDataDir)) {
          fs.mkdirSync(userDataDir, { recursive: true });
          console.log('用户数据目录创建成功');
        } else {
          console.log('用户数据目录已存在');
        }
      } else {
        console.warn('配置文件目录未初始化，无法创建用户数据目录');
      }
      
      console.log('配置文件保存成功:', profile.id);
      return profile;
    } catch (error) {
      console.error('保存配置文件失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除配置文件
   * @param {string} profileId 配置文件 ID
   * @returns {boolean} 是否删除成功
   */
  deleteProfile(profileId) {
    console.log(`开始删除配置文件: ${profileId}`);
    
    try {
      const profiles = this.getAllProfiles();
      const newProfiles = profiles.filter(p => p.id !== profileId);
      
      if (profiles.length === newProfiles.length) {
        console.log(`没有找到要删除的配置: ${profileId}`);
        return false; // 没有找到要删除的配置
      }
      
      // 先关闭该配置文件的浏览器实例（如果有）
      const browserManager = require('./browser-manager');
      browserManager.closeBrowser(profileId);
      
      // 保存新的配置文件列表
      console.log(`保存新的配置文件列表，删除后还有 ${newProfiles.length} 个配置文件`);
      this.store.set('profiles', newProfiles);
      
      // 删除对应的用户数据目录
      if (this.profilesDir) {
        const userDataDir = path.join(this.profilesDir, profileId);
        console.log(`检查用户数据目录: ${userDataDir}`);
        
        if (fs.existsSync(userDataDir)) {
          console.log(`删除用户数据目录: ${userDataDir}`);
          try {
            fs.rmdirSync(userDataDir, { recursive: true });
            console.log(`用户数据目录删除成功`);
          } catch (dirError) {
            console.error(`删除用户数据目录失败:`, dirError);
          }
        } else {
          console.log(`用户数据目录不存在，无需删除`);
        }
      } else {
        console.warn(`配置文件目录未初始化，无法删除用户数据目录`);
      }
      
      console.log(`配置文件删除成功: ${profileId}`);
      return true;
    } catch (error) {
      console.error(`删除配置文件失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取配置文件的用户数据目录
   * @param {string} profileId 配置文件 ID
   * @returns {string} 用户数据目录路径
   */
  getProfileUserDataDir(profileId) {
    // 如果 profilesDir 还没有初始化，尝试初始化它
    if (!this.profilesDir) {
      this.initProfilesDir();
      
      // 如果仍然未初始化，使用默认路径
      if (!this.profilesDir) {
        this.profilesDir = path.join(process.cwd(), 'user_data', 'browser_profiles');
        if (!fs.existsSync(this.profilesDir)) {
          fs.mkdirSync(this.profilesDir, { recursive: true });
        }
      }
    }
    
    return path.join(this.profilesDir, profileId);
  }
  
  /**
   * 创建默认配置文件
   * @returns {Object} 默认配置文件
   */
  createDefaultProfile() {
    const defaultProfile = {
      name: '新配置',
      notes: '',
      tags: [],
      accounts: [],
      cookies: [],
      fingerprint: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        platform: 'Win32',
        language: 'zh-CN',
        screenWidth: 1920,
        screenHeight: 1080,
        colorDepth: 24,
        timezone: 'Asia/Shanghai',
        webglVendor: 'Google Inc. (Intel)',
        webglRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
        canvasNoise: true,
        webrtcEnabled: false
      },
      proxy: {
        enabled: false,
        type: 'http',
        host: '',
        port: 8080,
        username: '',
        password: '',
        autoRotate: false,
        rotateInterval: 30,
        testUrl: 'https://api.ipify.org?format=json'
      },
      geoLocation: {
        autoFromProxy: true,
        country: 'CN',
        city: 'Shanghai',
        latitude: 31.2304,
        longitude: 121.4737,
        timezone: 'Asia/Shanghai'
      },
      startup: {
        startUrl: 'https://www.baidu.com',
        windowWidth: 1280,
        windowHeight: 800,
        maximized: false
      }
    };
    
    return this.saveProfile(defaultProfile);
  }
}

module.exports = new ProfileManager();
