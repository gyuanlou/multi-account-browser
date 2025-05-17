/**
 * 地理位置服务
 * 负责根据 IP 地址获取地理位置信息和地理位置伪造
 */
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const electron = require('electron');

class GeoLocationService {
  constructor() {
    // IP-API 免费服务的 URL
    this.ipApiUrl = 'http://ip-api.com/json/';
    
    // 备用 IP 信息服务
    this.backupIpUrl = 'https://ipinfo.io/json';
    
    // 国家和城市数据
    this.countries = [];
    this.cities = {};
    this.timezones = [];
    
    // 数据库文件路径初始化
    this.dbPath = null;
    this.initDbPath();
    
    // 加载国家和时区数据
    this._loadGeoData();
  }
  
  /**
   * 初始化数据库路径
   */
  initDbPath() {
    try {
      const { app } = electron;
      
      if (app) {
        // 如果在主进程中运行
        if (process.type === 'browser') {
          if (app.isReady()) {
            this.dbPath = path.join(app.getAppPath(), 'resources', 'geoip-database');
          } else {
            // 如果 app 还没有准备好，使用当前工作目录
            this.dbPath = path.join(process.cwd(), 'resources', 'geoip-database');
          }
        } else {
          // 如果在渲染进程中运行
          this.dbPath = path.join(process.cwd(), 'resources', 'geoip-database');
        }
      } else {
        // 如果无法获取 app 对象
        this.dbPath = path.join(process.cwd(), 'resources', 'geoip-database');
      }
    } catch (error) {
      console.error('初始化数据库路径失败:', error);
      // 使用默认路径
      this.dbPath = path.join(process.cwd(), 'resources', 'geoip-database');
    }
  }
  
  /**
   * 根据 IP 地址获取地理位置信息
   * @param {string} ip IP 地址，如果为空则获取当前 IP
   * @returns {Promise<Object>} 地理位置信息
   */
  async getLocationFromIP(ip = '') {
    try {
      console.log(`开始获取IP地理位置信息: ${ip}`);
      
      // 首先尝试使用 IP-API
      try {
        const url = `${this.ipApiUrl}${ip}`;
        console.log(`请求IP-API: ${url}`);
        
        const response = await axios.get(url, { timeout: 5000 });
        console.log(`收到IP-API响应:`, response.data ? JSON.stringify(response.data).substring(0, 200) : 'null');
        
        if (response.data && response.data.status === 'success') {
          // 创建一个只包含基本数据类型的对象
          const result = {
            ip: String(response.data.query || ''),
            country: String(response.data.countryCode || ''),
            countryName: String(response.data.country || ''),
            region: String(response.data.regionName || ''),
            city: String(response.data.city || ''),
            latitude: Number(response.data.lat || 0),
            longitude: Number(response.data.lon || 0),
            timezone: String(response.data.timezone || ''),
            isp: String(response.data.isp || ''),
            org: String(response.data.org || '')
          };
          
          // 获取语言信息，但只保存第一个语言代码作为字符串
          try {
            const languages = this._getLanguagesFromCountry(response.data.countryCode);
            if (languages && languages.length > 0) {
              result.language = String(languages[0] || '');
            }
          } catch (langError) {
            console.warn('获取语言信息失败:', langError.message);
          }
          
          console.log(`返回IP-API结果:`, JSON.stringify(result));
          return result;
        }
      } catch (e) {
        console.log('IP-API 服务失败，尝试备用服务', e.message);
      }
      
      // 如果 IP-API 失败，尝试使用备用服务
      console.log(`请求备用IP服务: ${this.backupIpUrl}`);
      const backupResponse = await axios.get(this.backupIpUrl, { timeout: 5000 });
      console.log(`收到备用服务响应:`, backupResponse.data ? JSON.stringify(backupResponse.data).substring(0, 200) : 'null');
      
      if (backupResponse.data && backupResponse.data.country) {
        const countryCode = String(backupResponse.data.country || '');
        const city = String(backupResponse.data.city || '');
        const region = String(backupResponse.data.region || '');
        const loc = backupResponse.data.loc ? backupResponse.data.loc.split(',') : [0, 0];
        
        // 创建一个只包含基本数据类型的对象
        const result = {
          ip: String(backupResponse.data.ip || ''),
          country: countryCode,
          countryName: String(this._getCountryName(countryCode) || ''),
          region: region,
          city: city,
          latitude: Number(parseFloat(loc[0]) || 0),
          longitude: Number(parseFloat(loc[1]) || 0),
          timezone: String(backupResponse.data.timezone || ''),
          isp: String(backupResponse.data.org || ''),
          org: String(backupResponse.data.org || '')
        };
        
        // 获取语言信息，但只保存第一个语言代码作为字符串
        try {
          const languages = this._getLanguagesFromCountry(countryCode);
          if (languages && languages.length > 0) {
            result.language = String(languages[0] || '');
          }
        } catch (langError) {
          console.warn('获取语言信息失败:', langError.message);
        }
        
        console.log(`返回备用服务结果:`, JSON.stringify(result));
        return result;
      }
      
      throw new Error('所有 IP 信息服务均失败');
    } catch (error) {
      console.error('获取地理位置信息失败:', error);
      
      // 返回默认值，只包含基本数据类型
      const defaultResult = {
        ip: String(ip || '0.0.0.0'),
        country: 'US',
        countryName: '美国',
        region: 'California',
        city: 'Los Angeles',
        latitude: 34.0522,
        longitude: -118.2437,
        timezone: 'America/Los_Angeles',
        isp: 'Unknown',
        org: 'Unknown',
        language: 'en-US' // 添加默认语言
      };
      
      console.log(`返回默认地理位置信息:`, JSON.stringify(defaultResult));
      return defaultResult;
    }
  }
  
  /**
   * 获取国家名称
   * @param {string} countryCode 国家代码
   * @returns {string} 国家名称
   * @private
   */
  _getCountryName(countryCode) {
    const country = this.countries.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
  }
  
  /**
   * 获取所有国家列表
   * @returns {Array} 国家列表
   */
  getCountries() {
    return this.countries;
  }
  
  /**
   * 根据国家代码获取城市列表
   * @param {string} countryCode 国家代码
   * @returns {Array} 城市列表
   */
  getCities(countryCode) {
    return this.cities[countryCode] || [];
  }
  
  /**
   * 获取所有时区列表
   * @returns {Array} 时区列表
   */
  getTimezones() {
    return this.timezones;
  }
  
  /**
   * 根据国家代码获取默认语言
   * @param {string} countryCode 国家代码
   * @returns {Array} 语言代码数组
   * @private
   */
  _getLanguagesFromCountry(countryCode) {
    // 从国家数据中查找语言
    const country = this.countries.find(c => c.code === countryCode);
    if (country && country.languages && country.languages.length > 0) {
      return country.languages;
    }
    
    // 如果在数据库中找不到，使用默认映射
    const languageMap = {
      'CN': ['zh-CN'],
      'TW': ['zh-TW'],
      'HK': ['zh-HK', 'en-US'],
      'US': ['en-US'],
      'GB': ['en-GB'],
      'JP': ['ja-JP'],
      'KR': ['ko-KR'],
      'FR': ['fr-FR'],
      'DE': ['de-DE'],
      'ES': ['es-ES'],
      'IT': ['it-IT'],
      'RU': ['ru-RU']
    };
    
    return languageMap[countryCode] || ['en-US'];
  }
  
  /**
   * 加载地理数据
   * @private
   */
  _loadGeoData() {
    try {
      // 默认数据（以防文件加载失败）
      const defaultCountries = [
        { code: 'CN', name: '中国', languages: ['zh-CN'] },
        { code: 'US', name: '美国', languages: ['en-US'] },
        { code: 'JP', name: '日本', languages: ['ja-JP'] },
        { code: 'KR', name: '韩国', languages: ['ko-KR'] },
        { code: 'GB', name: '英国', languages: ['en-GB'] },
        { code: 'DE', name: '德国', languages: ['de-DE'] },
        { code: 'FR', name: '法国', languages: ['fr-FR'] },
        { code: 'IT', name: '意大利', languages: ['it-IT'] },
        { code: 'ES', name: '西班牙', languages: ['es-ES'] },
        { code: 'RU', name: '俄罗斯', languages: ['ru-RU'] }
      ];
      
      // 尝试从文件加载数据
      try {
        // 检查数据库目录是否存在
        if (fs.existsSync(this.dbPath)) {
          // 加载国家数据
          const countriesPath = path.join(this.dbPath, 'countries.json');
          if (fs.existsSync(countriesPath)) {
            const countriesData = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
            if (countriesData && countriesData.countries) {
              this.countries = countriesData.countries;
              console.log(`已加载 ${this.countries.length} 个国家数据`);
            }
          }
          
          // 加载城市数据
          const citiesPath = path.join(this.dbPath, 'cities.json');
          if (fs.existsSync(citiesPath)) {
            this.cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
            console.log(`已加载城市数据，包含 ${Object.keys(this.cities).length} 个国家的城市`);
          }
          
          // 加载时区数据
          const timezonesPath = path.join(this.dbPath, 'timezones.json');
          if (fs.existsSync(timezonesPath)) {
            const timezonesData = JSON.parse(fs.readFileSync(timezonesPath, 'utf8'));
            if (timezonesData && timezonesData.timezones) {
              this.timezones = timezonesData.timezones;
              console.log(`已加载 ${this.timezones.length} 个时区数据`);
            }
          }
        } else {
          console.warn('地理位置数据库目录不存在:', this.dbPath);
        }
      } catch (fileError) {
        console.error('从文件加载地理数据失败:', fileError);
      }
      
      // 如果没有成功加载数据，使用默认数据
      if (!this.countries || this.countries.length === 0) {
        this.countries = defaultCountries;
        console.log('使用默认国家数据');
      }
      
      if (!this.cities || Object.keys(this.cities).length === 0) {
        // 简化版默认城市数据
        this.cities = {
          'CN': [
            { name: '北京', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' },
            { name: '上海', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai' },
            { name: '广州', latitude: 23.1291, longitude: 113.2644, timezone: 'Asia/Shanghai' }
          ],
          'US': [
            { name: '纽约', latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York' },
            { name: '洛杉矶', latitude: 34.0522, longitude: -118.2437, timezone: 'America/Los_Angeles' },
            { name: '芝加哥', latitude: 41.8781, longitude: -87.6298, timezone: 'America/Chicago' }
          ]
        };
        console.log('使用默认城市数据');
      }
      
      if (!this.timezones || this.timezones.length === 0) {
        // 默认时区数据
        this.timezones = [
          { id: 'Asia/Shanghai', name: '中国标准时间 (UTC+8)', offset: 480 },
          { id: 'America/New_York', name: '美国东部时间 (UTC-5/-4)', offset: -300 },
          { id: 'America/Los_Angeles', name: '美国太平洋时间 (UTC-8/-7)', offset: -480 },
          { id: 'Europe/London', name: '英国时间 (UTC+0/+1)', offset: 0 },
          { id: 'Europe/Paris', name: '中欧时间 (UTC+1/+2)', offset: 60 },
          { id: 'Asia/Tokyo', name: '日本时间 (UTC+9)', offset: 540 },
          { id: 'Asia/Seoul', name: '韩国时间 (UTC+9)', offset: 540 }
        ];
        console.log('使用默认时区数据');
      }
    } catch (error) {
      console.error('加载地理数据失败:', error);
    }
  }
}

module.exports = new GeoLocationService();
