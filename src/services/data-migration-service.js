/**
 * 数据迁移服务
 * 负责将资源文件复制到用户数据目录
 */
const fs = require('fs');
const path = require('path');
const electron = require('electron');

class DataMigrationService {
  constructor() {
    // 资源文件目录和用户数据目录初始化
    this.resourcesPath = null;
    this.userDataPath = null;
  }
  
  /**
   * 初始化路径
   * @private
   */
  _initPaths() {
    try {
      const { app } = electron;
      
      if (app && process.type === 'browser') {
        if (app.isReady()) {
          this.resourcesPath = path.join(app.getAppPath(), 'resources');
          this.userDataPath = app.getPath('userData');
        } else {
          // 如果 app 还没有准备好，使用当前工作目录
          this.resourcesPath = path.join(process.cwd(), 'resources');
          this.userDataPath = path.join(process.cwd(), 'user_data');
        }
      } else {
        // 如果在渲染进程中运行或无法获取 app 对象
        this.resourcesPath = path.join(process.cwd(), 'resources');
        this.userDataPath = path.join(process.cwd(), 'user_data');
      }
      
      // 确保用户数据目录存在
      this._ensureDirectoryExists(this.userDataPath);
    } catch (error) {
      console.error('初始化路径失败:', error);
      // 使用默认路径
      this.resourcesPath = path.join(process.cwd(), 'resources');
      this.userDataPath = path.join(process.cwd(), 'user_data');
      this._ensureDirectoryExists(this.userDataPath);
    }
  }
  
  /**
   * 复制资源文件到用户数据目录
   * @returns {Promise<void>}
   */
  async migrateResourceFiles() {
    try {
      console.log('开始迁移资源文件...');
      
      // 初始化路径
      this._initPaths();
      
      // 复制地理位置数据库
      await this._copyGeoIPDatabase();
      
      console.log('资源文件迁移完成');
      return true;
    } catch (error) {
      console.error('资源文件迁移失败:', error);
      return false;
    }
  }
  
  /**
   * 复制地理位置数据库
   * @private
   */
  async _copyGeoIPDatabase() {
    const sourceDir = path.join(this.resourcesPath, 'geoip-database');
    const targetDir = path.join(this.userDataPath, 'resources', 'geoip-database');
    
    // 确保目标目录存在
    this._ensureDirectoryExists(targetDir);
    
    // 检查源目录是否存在
    if (!fs.existsSync(sourceDir)) {
      console.warn('地理位置数据库源目录不存在:', sourceDir);
      return;
    }
    
    // 获取源目录中的所有文件
    const files = fs.readdirSync(sourceDir);
    
    // 复制每个文件
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      // 检查文件是否已存在且内容相同
      if (fs.existsSync(targetPath)) {
        const sourceContent = fs.readFileSync(sourcePath, 'utf8');
        const targetContent = fs.readFileSync(targetPath, 'utf8');
        
        if (sourceContent === targetContent) {
          console.log(`文件 ${file} 已存在且内容相同，跳过复制`);
          continue;
        }
      }
      
      // 复制文件
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`已复制 ${file} 到用户数据目录`);
    }
    
    console.log('地理位置数据库复制完成');
  }
  
  /**
   * 确保目录存在
   * @param {string} dirPath 目录路径
   * @private
   */
  _ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`已创建目录: ${dirPath}`);
    }
  }
}

module.exports = new DataMigrationService();
