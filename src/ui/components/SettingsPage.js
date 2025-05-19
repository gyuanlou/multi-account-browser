// SettingsPage.js - 设置页面组件
const SettingsPage = {
  template: `
    <div class="settings-page">
      <h2>设置</h2>
      
      <el-tabs v-model="activeTab">
        <!-- 外观设置 -->
        <el-tab-pane label="外观" name="appearance">
          <div class="settings-section">
            <h3>主题设置</h3>
            
            <el-form label-position="top">
              <el-form-item label="主题模式">
                <el-radio-group v-model="settings.theme" @change="updateSetting('theme')">
                  <el-radio label="light">浅色模式</el-radio>
                  <el-radio label="dark">深色模式</el-radio>
                  <el-radio label="system">跟随系统</el-radio>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="界面布局">
                <el-slider 
                  v-model="settings.ui.sidebarWidth" 
                  :min="200" 
                  :max="400" 
                  :step="10"
                  show-input
                  @change="updateSetting('ui.sidebarWidth')"
                ></el-slider>
                <div class="setting-description">侧边栏宽度 (像素)</div>
              </el-form-item>
              
              <el-form-item>
                <el-checkbox v-model="settings.ui.showStatusBar" @change="updateSetting('ui.showStatusBar')">
                  显示状态栏
                </el-checkbox>
              </el-form-item>
              
              <el-form-item>
                <el-checkbox v-model="settings.ui.showToolbar" @change="updateSetting('ui.showToolbar')">
                  显示工具栏
                </el-checkbox>
              </el-form-item>
              
              <el-form-item label="默认页面">
                <el-select v-model="settings.ui.defaultTab" @change="updateSetting('ui.defaultTab')">
                  <el-option label="配置管理" value="profiles"></el-option>
                  <el-option label="浏览器实例" value="instances"></el-option>
                  <el-option label="自动化" value="automation"></el-option>
                </el-select>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        
        <!-- 安全设置 -->
        <el-tab-pane label="安全" name="security">
          <div class="settings-section">
            <h3>主密码保护</h3>
            
            <el-form label-position="top">
              <el-form-item>
                <el-switch
                  v-model="settings.security.masterPasswordEnabled"
                  @change="toggleMasterPassword"
                  active-text="启用主密码保护"
                ></el-switch>
                <div class="setting-description">
                  启用主密码保护后，需要输入密码才能访问敏感信息，如账号密码和代理设置
                </div>
              </el-form-item>
              
              <template v-if="settings.security.masterPasswordEnabled">
                <el-form-item v-if="!hasMasterPassword" label="设置主密码">
                  <el-input type="password" v-model="masterPassword" placeholder="输入主密码"></el-input>
                </el-form-item>
                
                <el-form-item v-if="!hasMasterPassword" label="确认主密码">
                  <el-input type="password" v-model="confirmMasterPassword" placeholder="再次输入主密码"></el-input>
                </el-form-item>
                
                <el-form-item v-if="!hasMasterPassword">
                  <el-button type="primary" @click="setMasterPassword">保存主密码</el-button>
                </el-form-item>
                
                <el-form-item v-if="hasMasterPassword">
                  <el-button type="danger" @click="resetMasterPassword">重置主密码</el-button>
                </el-form-item>
              </template>
              
              <el-form-item>
                <el-switch
                  v-model="settings.security.autoLock"
                  @change="updateSetting('security.autoLock')"
                  active-text="自动锁定"
                ></el-switch>
                <div class="setting-description">
                  在一段时间不活动后自动锁定应用程序
                </div>
              </el-form-item>
              
              <el-form-item v-if="settings.security.autoLock" label="锁定时间">
                <el-select v-model="settings.security.lockAfterMinutes" @change="updateSetting('security.lockAfterMinutes')">
                  <el-option label="5 分钟" :value="5"></el-option>
                  <el-option label="15 分钟" :value="15"></el-option>
                  <el-option label="30 分钟" :value="30"></el-option>
                  <el-option label="1 小时" :value="60"></el-option>
                </el-select>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        
        <!-- 性能设置 -->
        <el-tab-pane label="性能" name="performance">
          <div class="settings-section">
            <h3>资源管理</h3>
            
            <el-form label-position="top">
              <el-form-item label="最大浏览器实例数">
                <el-slider 
                  v-model="settings.performance.maxInstances" 
                  :min="1" 
                  :max="10" 
                  :step="1"
                  show-stops
                  show-input
                  @change="updateSetting('performance.maxInstances')"
                ></el-slider>
                <div class="setting-description">
                  限制同时运行的浏览器实例数量，以减少资源占用
                </div>
              </el-form-item>
              
              <el-form-item label="资源使用模式">
                <el-radio-group v-model="settings.performance.resourceSaving" @change="updateSetting('performance.resourceSaving')">
                  <el-radio label="performance">性能优先</el-radio>
                  <el-radio label="balanced">平衡模式</el-radio>
                  <el-radio label="memory">内存优先</el-radio>
                </el-radio-group>
                <div class="setting-description">
                  性能优先：最大化浏览器性能，但会使用更多资源<br>
                  平衡模式：在性能和资源使用之间取得平衡<br>
                  内存优先：最小化内存使用，但可能影响性能
                </div>
              </el-form-item>
              
              <el-form-item label="自动关闭不活动的浏览器">
                <el-select v-model="settings.performance.closeInactiveAfter" @change="updateSetting('performance.closeInactiveAfter')">
                  <el-option label="不自动关闭" :value="0"></el-option>
                  <el-option label="30 分钟后" :value="30"></el-option>
                  <el-option label="1 小时后" :value="60"></el-option>
                  <el-option label="2 小时后" :value="120"></el-option>
                </el-select>
                <div class="setting-description">
                  在指定时间内没有活动后自动关闭浏览器实例
                </div>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        
        <!-- 备份设置 -->
        <el-tab-pane label="备份" name="backup">
          <div class="settings-section">
            <h3>自动备份</h3>
            
            <el-form label-position="top">
              <el-form-item>
                <el-switch
                  v-model="settings.autoBackup.enabled"
                  @change="updateSetting('autoBackup.enabled')"
                  active-text="启用自动备份"
                ></el-switch>
                <div class="setting-description">
                  定期自动备份所有配置文件和设置
                </div>
              </el-form-item>
              
              <el-form-item v-if="settings.autoBackup.enabled" label="备份频率">
                <el-select v-model="settings.autoBackup.interval" @change="updateSetting('autoBackup.interval')">
                  <el-option label="每天" value="daily"></el-option>
                  <el-option label="每周" value="weekly"></el-option>
                  <el-option label="每月" value="monthly"></el-option>
                </el-select>
              </el-form-item>
              
              <el-form-item v-if="settings.autoBackup.enabled" label="保留备份数量">
                <el-slider 
                  v-model="settings.autoBackup.keepCount" 
                  :min="1" 
                  :max="10" 
                  :step="1"
                  show-stops
                  show-input
                  @change="updateSetting('autoBackup.keepCount')"
                ></el-slider>
                <div class="setting-description">
                  超过此数量的旧备份将被自动删除
                </div>
              </el-form-item>
              
              <el-divider></el-divider>
              
              <el-form-item>
                <el-button type="primary" @click="createBackup">立即创建备份</el-button>
                <el-button @click="restoreBackup">从备份恢复</el-button>
              </el-form-item>
              
              <el-form-item>
                <el-button @click="exportSettings">导出设置</el-button>
                <el-button @click="importSettings">导入设置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        
        <!-- 关于 -->
        <el-tab-pane label="关于" name="about">
          <div class="settings-section">
            <h3>多账号浏览器管理工具</h3>
            <p>版本: {{ appInfo.version }}</p>
            <p>平台: {{ appInfo.platform }}</p>
            <p>Electron: {{ appInfo.electron }}</p>
            <p>Chrome: {{ appInfo.chrome }}</p>
            
            <el-divider></el-divider>
            
            <p>本工具用于管理多个浏览器配置文件，支持指纹修改、代理设置和自动化操作。</p>
            
            <div class="about-actions">
              <el-button @click="checkForUpdates">检查更新</el-button>
              <el-button @click="resetAllSettings">重置所有设置</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  `,
  
  data() {
    return {
      activeTab: 'appearance',
      settings: {
        theme: 'light',
        language: 'zh-CN',
        autoBackup: {
          enabled: false,
          interval: 'daily',
          keepCount: 5
        },
        security: {
          masterPasswordEnabled: false,
          masterPasswordHash: null,
          autoLock: true,
          lockAfterMinutes: 30
        },
        performance: {
          maxInstances: 5,
          resourceSaving: 'balanced',
          closeInactiveAfter: 0
        },
        ui: {
          sidebarWidth: 280,
          showStatusBar: true,
          showToolbar: true,
          defaultTab: 'profiles'
        }
      },
      masterPassword: '',
      confirmMasterPassword: '',
      hasMasterPassword: false,
      appInfo: {
        version: '1.0.0',
        platform: '',
        electron: '',
        chrome: ''
      }
    };
  },
  
  async created() {
    // 加载设置
    await this.loadSettings();
    
    // 获取应用信息
    this.getAppInfo();
  },
  
  methods: {
    async loadSettings() {
      try {
        const settings = await window.ipcRenderer.invoke('get-all-settings');
        if (settings) {
          this.settings = settings;
          
          // 检查是否已设置主密码
          this.hasMasterPassword = !!settings.security.masterPasswordHash;
        }
      } catch (error) {
        this.$message.error('加载设置失败: ' + error.message);
      }
    },
    
    async updateSetting(key) {
      try {
        const value = this.getNestedValue(this.settings, key);
        await window.ipcRenderer.invoke('update-setting', key, value);
        
        // 如果更新的是主题，应用主题
        if (key === 'theme') {
          this.applyTheme(value);
        }
        
        this.$message.success('设置已更新');
      } catch (error) {
        this.$message.error('更新设置失败: ' + error.message);
      }
    },
    
    getNestedValue(obj, path) {
      return path.split('.').reduce((prev, curr) => prev && prev[curr], obj);
    },
    
    applyTheme(theme) {
      if (theme === 'system') {
        // 检测系统主题
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.className = prefersDark ? 'theme-dark' : 'theme-light';
      } else {
        document.body.className = `theme-${theme}`;
      }
      
      // 保存到本地存储
      localStorage.setItem('theme', theme);
    },
    
    async toggleMasterPassword(enabled) {
      if (enabled) {
        // 如果已经有主密码，需要验证
        if (this.hasMasterPassword) {
          this.$prompt('请输入当前主密码', '验证主密码', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            inputType: 'password'
          }).then(async ({ value }) => {
            const verified = await window.ipcRenderer.invoke('verify-master-password', value);
            if (!verified) {
              this.settings.security.masterPasswordEnabled = false;
              this.$message.error('密码验证失败');
            }
          }).catch(() => {
            this.settings.security.masterPasswordEnabled = false;
          });
        }
      } else {
        // 禁用主密码保护
        this.$confirm('禁用主密码保护将使您的敏感信息不受保护，确定要继续吗？', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          await window.ipcRenderer.invoke('clear-master-password');
          this.hasMasterPassword = false;
        }).catch(() => {
          this.settings.security.masterPasswordEnabled = true;
        });
      }
      
      this.updateSetting('security.masterPasswordEnabled');
    },
    
    async setMasterPassword() {
      if (!this.masterPassword) {
        this.$message.error('请输入主密码');
        return;
      }
      
      if (this.masterPassword !== this.confirmMasterPassword) {
        this.$message.error('两次输入的密码不一致');
        return;
      }
      
      try {
        await window.ipcRenderer.invoke('set-master-password', this.masterPassword);
        this.hasMasterPassword = true;
        this.masterPassword = '';
        this.confirmMasterPassword = '';
        this.$message.success('主密码设置成功');
      } catch (error) {
        this.$message.error('设置主密码失败: ' + error.message);
      }
    },
    
    async resetMasterPassword() {
      this.$confirm('重置主密码将清除当前密码，您需要设置新的密码。确定要继续吗？', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        await window.ipcRenderer.invoke('clear-master-password');
        this.hasMasterPassword = false;
        this.$message.success('主密码已重置，请设置新密码');
      }).catch(() => {
        // 取消操作
      });
    },
    
    async createBackup() {
      try {
        const result = await window.ipcRenderer.invoke('create-backup');
        if (result.success) {
          this.$message.success(`备份创建成功: ${result.fileName}`);
        } else {
          this.$message.error('创建备份失败');
        }
      } catch (error) {
        this.$message.error('创建备份失败: ' + error.message);
      }
    },
    
    async restoreBackup() {
      try {
        const { filePaths } = await window.ipcRenderer.invoke('show-open-dialog', {
          title: '选择备份文件',
          filters: [{ name: '备份文件', extensions: ['zip'] }],
          properties: ['openFile']
        });
        
        if (filePaths && filePaths.length > 0) {
          this.$confirm('恢复备份将覆盖当前的所有配置，确定要继续吗？', '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(async () => {
            const result = await window.ipcRenderer.invoke('restore-backup', filePaths[0]);
            if (result.success) {
              this.$message.success(`备份恢复成功，已恢复 ${result.restoredCount} 个配置`);
              // 重新加载页面
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              this.$message.error('恢复备份失败');
            }
          }).catch(() => {
            // 取消操作
          });
        }
      } catch (error) {
        this.$message.error('恢复备份失败: ' + error.message);
      }
    },
    
    async exportSettings() {
      try {
        const { filePath } = await window.ipcRenderer.invoke('show-save-dialog', {
          title: '导出设置',
          defaultPath: `settings_${new Date().toISOString().slice(0, 10)}.json`,
          filters: [{ name: '设置文件', extensions: ['json'] }]
        });
        
        if (filePath) {
          const result = await window.ipcRenderer.invoke('export-settings', filePath);
          if (result) {
            this.$message.success('设置导出成功');
          } else {
            this.$message.error('导出设置失败');
          }
        }
      } catch (error) {
        this.$message.error('导出设置失败: ' + error.message);
      }
    },
    
    async importSettings() {
      try {
        const { filePaths } = await window.ipcRenderer.invoke('show-open-dialog', {
          title: '导入设置',
          filters: [{ name: '设置文件', extensions: ['json'] }],
          properties: ['openFile']
        });
        
        if (filePaths && filePaths.length > 0) {
          this.$confirm('导入设置将覆盖当前的所有设置，确定要继续吗？', '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }).then(async () => {
            const result = await window.ipcRenderer.invoke('import-settings', filePaths[0]);
            if (result) {
              this.$message.success('设置导入成功');
              // 重新加载设置
              await this.loadSettings();
              // 应用主题
              this.applyTheme(this.settings.theme);
            } else {
              this.$message.error('导入设置失败');
            }
          }).catch(() => {
            // 取消操作
          });
        }
      } catch (error) {
        this.$message.error('导入设置失败: ' + error.message);
      }
    },
    
    async getAppInfo() {
      try {
        const info = await window.ipcRenderer.invoke('get-app-info');
        if (info) {
          this.appInfo = info;
        }
      } catch (error) {
        console.error('获取应用信息失败:', error);
      }
    },
    
    async checkForUpdates() {
      this.$message.info('正在检查更新...');
      
      try {
        const result = await window.ipcRenderer.invoke('check-for-updates');
        if (result.hasUpdate) {
          // 格式化发布说明
          const formattedNotes = result.releaseNotes.replace(/\n/g, '<br>');
          
          // 使用 HTML 字符串作为消息内容
          const messageHtml = `
            <div>
              <p>发现新版本 ${result.version}</p>
              <p>发布说明:</p>
              <div style="max-height: 200px; overflow: auto; margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9">
                ${formattedNotes}
              </div>
            </div>
          `;
          
          // 使用 Element Plus 的对话框
          this.$confirm(messageHtml, '更新可用', {
            confirmButtonText: '前往下载',
            cancelButtonText: '稍后更新',
            dangerouslyUseHTMLString: true,
            type: 'info',
            center: true
          }).then(() => {
            // 打开下载链接
            if (result.downloadUrl) {
              window.ipcRenderer.invoke('open-external-url', result.downloadUrl);
            }
          }).catch(() => {
            // 取消更新
          });
        } else {
          this.$message.success('当前已是最新版本');
        }
      } catch (error) {
        this.$message.error('检查更新失败: ' + error.message);
      }
    },
    
    async resetAllSettings() {
      this.$confirm('重置所有设置将恢复到默认值，确定要继续吗？', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        const result = await window.ipcRenderer.invoke('reset-settings');
        if (result) {
          this.$message.success('设置已重置为默认值');
          // 重新加载设置
          await this.loadSettings();
          // 应用主题
          this.applyTheme(this.settings.theme);
        } else {
          this.$message.error('重置设置失败');
        }
      }).catch(() => {
        // 取消操作
      });
    }
  }
};
