/**
 * 数据备份和导入导出服务
 * 负责配置文件的批量导入导出和自动备份功能
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const archiver = require('archiver');
const extract = require('extract-zip');
const profileManager = require('./profile-manager');

class DataBackupService {
  constructor() {
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    this.ensureBackupDirExists();
  }

  /**
   * 确保备份目录存在
   */
  ensureBackupDirExists() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 创建所有配置的备份
   * @param {string} backupName 备份名称（可选）
   * @returns {Promise<Object>} 备份结果
   */
  async createBackup(backupName = '') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = backupName 
        ? `${backupName}_${timestamp}.zip` 
        : `backup_${timestamp}.zip`;
      const backupPath = path.join(this.backupDir, fileName);
      
      // 获取所有配置
      const profiles = profileManager.getAllProfiles();
      
      // 创建一个文件来写入
      const output = fs.createWriteStream(backupPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
      });
      
      // 监听所有存档数据都已被写入
      const finishPromise = new Promise((resolve, reject) => {
        output.on('close', () => resolve({
          success: true,
          path: backupPath,
          size: archive.pointer(),
          fileName
        }));
        
        archive.on('error', (err) => {
          reject(err);
        });
      });
      
      // 将输出流与存档关联
      archive.pipe(output);
      
      // 添加配置文件数据
      archive.append(JSON.stringify(profiles, null, 2), { name: 'profiles.json' });
      
      // 添加用户数据目录
      const profilesDir = profileManager.profilesDir;
      if (fs.existsSync(profilesDir)) {
        archive.directory(profilesDir, 'browser_profiles');
      }
      
      // 完成存档
      await archive.finalize();
      
      return await finishPromise;
    } catch (error) {
      console.error('创建备份失败:', error);
      throw new Error(`创建备份失败: ${error.message}`);
    }
  }

  /**
   * 获取所有备份文件
   * @returns {Array} 备份文件列表
   */
  getBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      return files
        .filter(file => file.endsWith('.zip'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt); // 按创建时间降序排序
    } catch (error) {
      console.error('获取备份文件列表失败:', error);
      return [];
    }
  }

  /**
   * 恢复备份
   * @param {string} backupPath 备份文件路径
   * @returns {Promise<Object>} 恢复结果
   */
  async restoreBackup(backupPath) {
    try {
      const tempDir = path.join(app.getPath('temp'), `backup-restore-${Date.now()}`);
      
      // 确保临时目录存在
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // 解压备份文件
      await extract(backupPath, { dir: tempDir });
      
      // 读取配置文件
      const profilesPath = path.join(tempDir, 'profiles.json');
      if (!fs.existsSync(profilesPath)) {
        throw new Error('备份文件中没有找到配置数据');
      }
      
      const profilesData = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
      
      // 恢复配置文件
      let restoredCount = 0;
      for (const profile of profilesData) {
        try {
          // 保存配置
          await profileManager.saveProfile(profile);
          restoredCount++;
          
          // 恢复用户数据目录
          const sourceDir = path.join(tempDir, 'browser_profiles', profile.id);
          const targetDir = path.join(profileManager.profilesDir, profile.id);
          
          if (fs.existsSync(sourceDir)) {
            // 如果目标目录已存在，先删除
            if (fs.existsSync(targetDir)) {
              fs.rmdirSync(targetDir, { recursive: true });
            }
            
            // 复制目录
            fs.mkdirSync(targetDir, { recursive: true });
            this.copyDirSync(sourceDir, targetDir);
          }
        } catch (err) {
          console.error(`恢复配置 ${profile.id} 失败:`, err);
        }
      }
      
      // 清理临时目录
      fs.rmdirSync(tempDir, { recursive: true });
      
      return {
        success: true,
        restoredCount,
        totalCount: profilesData.length
      };
    } catch (error) {
      console.error('恢复备份失败:', error);
      throw new Error(`恢复备份失败: ${error.message}`);
    }
  }

  /**
   * 删除备份
   * @param {string} backupPath 备份文件路径
   * @returns {boolean} 是否删除成功
   */
  deleteBackup(backupPath) {
    try {
      fs.unlinkSync(backupPath);
      return true;
    } catch (error) {
      console.error('删除备份失败:', error);
      return false;
    }
  }

  /**
   * 导出选定的配置
   * @param {Array} profileIds 要导出的配置ID数组
   * @param {string} exportPath 导出文件路径
   * @returns {Promise<Object>} 导出结果
   */
  async exportProfiles(profileIds, exportPath) {
    try {
      // 获取所有配置
      const allProfiles = profileManager.getAllProfiles();
      
      // 筛选要导出的配置
      const profilesToExport = allProfiles.filter(p => profileIds.includes(p.id));
      
      if (profilesToExport.length === 0) {
        throw new Error('没有找到要导出的配置');
      }
      
      // 创建一个文件来写入
      const output = fs.createWriteStream(exportPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
      });
      
      // 监听所有存档数据都已被写入
      const finishPromise = new Promise((resolve, reject) => {
        output.on('close', () => resolve({
          success: true,
          path: exportPath,
          size: archive.pointer(),
          count: profilesToExport.length
        }));
        
        archive.on('error', (err) => {
          reject(err);
        });
      });
      
      // 将输出流与存档关联
      archive.pipe(output);
      
      // 添加配置文件数据
      archive.append(JSON.stringify(profilesToExport, null, 2), { name: 'profiles.json' });
      
      // 添加每个配置的用户数据目录
      for (const profile of profilesToExport) {
        const profileDir = path.join(profileManager.profilesDir, profile.id);
        if (fs.existsSync(profileDir)) {
          archive.directory(profileDir, `browser_profiles/${profile.id}`);
        }
      }
      
      // 完成存档
      await archive.finalize();
      
      return await finishPromise;
    } catch (error) {
      console.error('导出配置失败:', error);
      throw new Error(`导出配置失败: ${error.message}`);
    }
  }

  /**
   * 导入配置
   * @param {string} importPath 导入文件路径
   * @returns {Promise<Object>} 导入结果
   */
  async importProfiles(importPath) {
    try {
      const tempDir = path.join(app.getPath('temp'), `profile-import-${Date.now()}`);
      
      // 确保临时目录存在
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // 解压导入文件
      await extract(importPath, { dir: tempDir });
      
      // 读取配置文件
      const profilesPath = path.join(tempDir, 'profiles.json');
      if (!fs.existsSync(profilesPath)) {
        throw new Error('导入文件中没有找到配置数据');
      }
      
      const profilesData = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
      
      // 导入配置文件
      let importedCount = 0;
      for (const profile of profilesData) {
        try {
          // 为导入的配置生成新的ID，避免与现有配置冲突
          const oldId = profile.id;
          delete profile.id; // 删除ID，让 saveProfile 生成新ID
          
          // 保存配置
          const savedProfile = await profileManager.saveProfile(profile);
          importedCount++;
          
          // 导入用户数据目录
          const sourceDir = path.join(tempDir, 'browser_profiles', oldId);
          const targetDir = path.join(profileManager.profilesDir, savedProfile.id);
          
          if (fs.existsSync(sourceDir)) {
            // 如果目标目录已存在，先删除
            if (fs.existsSync(targetDir)) {
              fs.rmdirSync(targetDir, { recursive: true });
            }
            
            // 复制目录
            fs.mkdirSync(targetDir, { recursive: true });
            this.copyDirSync(sourceDir, targetDir);
          }
        } catch (err) {
          console.error(`导入配置失败:`, err);
        }
      }
      
      // 清理临时目录
      fs.rmdirSync(tempDir, { recursive: true });
      
      return {
        success: true,
        importedCount,
        totalCount: profilesData.length
      };
    } catch (error) {
      console.error('导入配置失败:', error);
      throw new Error(`导入配置失败: ${error.message}`);
    }
  }

  /**
   * 递归复制目录
   * @param {string} src 源目录
   * @param {string} dest 目标目录
   */
  copyDirSync(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * 设置自动备份
   * @param {Object} config 自动备份配置
   * @returns {boolean} 是否设置成功
   */
  setAutoBackupConfig(config) {
    try {
      const configPath = path.join(app.getPath('userData'), 'auto-backup-config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      console.error('设置自动备份配置失败:', error);
      return false;
    }
  }

  /**
   * 获取自动备份配置
   * @returns {Object} 自动备份配置
   */
  getAutoBackupConfig() {
    try {
      const configPath = path.join(app.getPath('userData'), 'auto-backup-config.json');
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      return {
        enabled: false,
        interval: 'daily', // 'daily', 'weekly', 'monthly'
        keepCount: 5, // 保留的备份数量
        lastBackup: null
      };
    } catch (error) {
      console.error('获取自动备份配置失败:', error);
      return {
        enabled: false,
        interval: 'daily',
        keepCount: 5,
        lastBackup: null
      };
    }
  }

  /**
   * 执行自动备份
   * @returns {Promise<Object>} 备份结果
   */
  async runAutoBackup() {
    try {
      const config = this.getAutoBackupConfig();
      
      if (!config.enabled) {
        return { success: false, reason: 'auto-backup-disabled' };
      }
      
      // 检查是否需要备份
      const now = new Date();
      const lastBackup = config.lastBackup ? new Date(config.lastBackup) : null;
      
      let shouldBackup = false;
      
      if (!lastBackup) {
        shouldBackup = true;
      } else {
        const diffDays = Math.floor((now - lastBackup) / (1000 * 60 * 60 * 24));
        
        if (config.interval === 'daily' && diffDays >= 1) {
          shouldBackup = true;
        } else if (config.interval === 'weekly' && diffDays >= 7) {
          shouldBackup = true;
        } else if (config.interval === 'monthly' && diffDays >= 30) {
          shouldBackup = true;
        }
      }
      
      if (!shouldBackup) {
        return { success: false, reason: 'not-scheduled-yet' };
      }
      
      // 执行备份
      const backupResult = await this.createBackup('auto');
      
      // 更新最后备份时间
      config.lastBackup = now.toISOString();
      this.setAutoBackupConfig(config);
      
      // 清理旧备份
      this.cleanupOldBackups(config.keepCount);
      
      return backupResult;
    } catch (error) {
      console.error('执行自动备份失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 清理旧备份
   * @param {number} keepCount 保留的备份数量
   */
  cleanupOldBackups(keepCount) {
    try {
      const backups = this.getBackups();
      
      // 只保留自动备份
      const autoBackups = backups.filter(b => b.name.startsWith('auto_'));
      
      // 如果自动备份数量超过保留数量，删除最旧的
      if (autoBackups.length > keepCount) {
        const toDelete = autoBackups.slice(keepCount);
        
        for (const backup of toDelete) {
          this.deleteBackup(backup.path);
        }
      }
    } catch (error) {
      console.error('清理旧备份失败:', error);
    }
  }
}

module.exports = new DataBackupService();
