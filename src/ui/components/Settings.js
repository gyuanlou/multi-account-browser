// Settings.js - 设置页面组件
const Settings = {
  template: `
    <div>
      <div class="page-header">
        <h2>应用设置</h2>
        <el-button type="primary" @click="saveSettings">
          <el-icon><check /></el-icon> 保存设置
        </el-button>
      </div>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="常规设置" name="general">
          <el-form label-position="top" :model="settings.general">
            <el-form-item label="数据存储位置">
              <el-input v-model="settings.general.dataDir" placeholder="数据存储路径">
                <template #append>
                  <el-button @click="selectDataDir">浏览...</el-button>
                </template>
              </el-input>
            </el-form-item>
            
            <el-form-item label="浏览器路径">
              <el-input v-model="settings.general.browserPath" placeholder="浏览器可执行文件路径">
                <template #append>
                  <el-button @click="selectBrowserPath">浏览...</el-button>
                </template>
              </el-input>
            </el-form-item>
            
            <el-form-item label="语言">
              <el-select v-model="settings.general.language" style="width: 100%;">
                <el-option label="简体中文" value="zh-CN"></el-option>
                <el-option label="English" value="en-US"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="主题">
              <el-select v-model="settings.general.theme" style="width: 100%;">
                <el-option label="浅色" value="light"></el-option>
                <el-option label="深色" value="dark"></el-option>
                <el-option label="跟随系统" value="auto"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="开机自启">
              <el-switch v-model="settings.general.autoStart"></el-switch>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="代理设置" name="proxy">
          <el-form label-position="top" :model="settings.proxy">
            <el-form-item label="代理API">
              <el-input v-model="settings.proxy.apiUrl" placeholder="代理API URL"></el-input>
            </el-form-item>
            
            <el-form-item label="API密钥">
              <el-input v-model="settings.proxy.apiKey" placeholder="API密钥" show-password></el-input>
            </el-form-item>
            
            <el-form-item label="代理供应商">
              <el-select v-model="settings.proxy.provider" style="width: 100%;">
                <el-option label="自定义" value="custom"></el-option>
                <el-option label="Luminati" value="luminati"></el-option>
                <el-option label="Oxylabs" value="oxylabs"></el-option>
                <el-option label="Bright Data" value="brightdata"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="代理池">
              <el-table :data="settings.proxy.pool" style="width: 100%">
                <el-table-column prop="name" label="名称" width="120"></el-table-column>
                <el-table-column prop="host" label="主机" width="120"></el-table-column>
                <el-table-column prop="port" label="端口" width="80"></el-table-column>
                <el-table-column prop="type" label="类型" width="100"></el-table-column>
                <el-table-column fixed="right" label="操作" width="120">
                  <template #default="scope">
                    <el-button type="primary" size="small" @click="editProxy(scope.row, scope.$index)">
                      编辑
                    </el-button>
                    <el-button type="danger" size="small" @click="removeProxy(scope.$index)">
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <div style="margin-top: 10px;">
                <el-button type="primary" @click="addProxy">
                  添加代理
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="指纹设置" name="fingerprint">
          <el-form label-position="top" :model="settings.fingerprint">
            <el-form-item label="指纹生成API">
              <el-input v-model="settings.fingerprint.apiUrl" placeholder="指纹生成API URL"></el-input>
            </el-form-item>
            
            <el-form-item label="API密钥">
              <el-input v-model="settings.fingerprint.apiKey" placeholder="API密钥" show-password></el-input>
            </el-form-item>
            
            <el-form-item label="默认指纹生成策略">
              <el-select v-model="settings.fingerprint.strategy" style="width: 100%;">
                <el-option label="完全随机" value="random"></el-option>
                <el-option label="一致性随机" value="consistent"></el-option>
                <el-option label="基于操作系统" value="os-based"></el-option>
                <el-option label="基于地理位置" value="geo-based"></el-option>
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="高级设置" name="advanced">
          <el-form label-position="top" :model="settings.advanced">
            <el-form-item label="调试模式">
              <el-switch v-model="settings.advanced.debugMode"></el-switch>
            </el-form-item>
            
            <el-form-item label="日志级别">
              <el-select v-model="settings.advanced.logLevel" style="width: 100%;">
                <el-option label="错误" value="error"></el-option>
                <el-option label="警告" value="warn"></el-option>
                <el-option label="信息" value="info"></el-option>
                <el-option label="调试" value="debug"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="浏览器启动参数">
              <el-input 
                v-model="settings.advanced.browserArgs" 
                type="textarea" 
                :rows="5" 
                placeholder="每行一个参数，例如：--disable-extensions">
              </el-input>
            </el-form-item>
            
            <el-form-item label="清理数据">
              <el-button type="danger" @click="clearData">清理所有数据</el-button>
              <el-button type="warning" @click="resetSettings">重置设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      
      <!-- 代理编辑对话框 -->
      <el-dialog
        :title="proxyDialogTitle"
        v-model="proxyDialogVisible"
        width="500px">
        <el-form label-position="top" :model="currentProxy">
          <el-form-item label="名称">
            <el-input v-model="currentProxy.name" placeholder="代理名称"></el-input>
          </el-form-item>
          
          <el-form-item label="代理类型">
            <el-select v-model="currentProxy.type" style="width: 100%;">
              <el-option label="HTTP" value="http"></el-option>
              <el-option label="HTTPS" value="https"></el-option>
              <el-option label="SOCKS4" value="socks4"></el-option>
              <el-option label="SOCKS5" value="socks5"></el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="主机">
            <el-input v-model="currentProxy.host" placeholder="代理主机"></el-input>
          </el-form-item>
          
          <el-form-item label="端口">
            <el-input-number v-model="currentProxy.port" :min="1" :max="65535" style="width: 100%;"></el-input-number>
          </el-form-item>
          
          <el-form-item label="用户名">
            <el-input v-model="currentProxy.username" placeholder="用户名（可选）"></el-input>
          </el-form-item>
          
          <el-form-item label="密码">
            <el-input v-model="currentProxy.password" type="password" placeholder="密码（可选）"></el-input>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="proxyDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveProxy">保存</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  `,
  
  data() {
    return {
      activeTab: 'general',
      settings: {
        general: {
          dataDir: '',
          browserPath: '',
          language: 'zh-CN',
          theme: 'light',
          autoStart: false
        },
        proxy: {
          apiUrl: '',
          apiKey: '',
          provider: 'custom',
          pool: []
        },
        fingerprint: {
          apiUrl: '',
          apiKey: '',
          strategy: 'consistent'
        },
        advanced: {
          debugMode: false,
          logLevel: 'info',
          browserArgs: ''
        }
      },
      proxyDialogVisible: false,
      proxyDialogTitle: '添加代理',
      currentProxy: {
        name: '',
        type: 'http',
        host: '',
        port: 8080,
        username: '',
        password: ''
      },
      editingProxyIndex: -1
    };
  },
  
  created() {
    this.loadSettings();
  },
  
  methods: {
    async loadSettings() {
      try {
        const settings = await window.ipcRenderer.invoke('get-settings');
        this.settings = settings;
      } catch (error) {
        this.$message.error('加载设置失败: ' + error.message);
      }
    },
    
    async saveSettings() {
      try {
        await window.ipcRenderer.invoke('save-settings', this.settings);
        this.$message.success('设置已保存');
      } catch (error) {
        this.$message.error('保存设置失败: ' + error.message);
      }
    },
    
    async selectDataDir() {
      try {
        const result = await window.ipcRenderer.invoke('select-directory');
        if (result && result.filePath) {
          this.settings.general.dataDir = result.filePath;
        }
      } catch (error) {
        this.$message.error('选择目录失败: ' + error.message);
      }
    },
    
    async selectBrowserPath() {
      try {
        const result = await window.ipcRenderer.invoke('select-file', {
          title: '选择浏览器可执行文件',
          filters: [
            { name: '可执行文件', extensions: ['exe'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        });
        
        if (result && result.filePath) {
          this.settings.general.browserPath = result.filePath;
        }
      } catch (error) {
        this.$message.error('选择文件失败: ' + error.message);
      }
    },
    
    addProxy() {
      this.proxyDialogTitle = '添加代理';
      this.currentProxy = {
        name: '',
        type: 'http',
        host: '',
        port: 8080,
        username: '',
        password: ''
      };
      this.editingProxyIndex = -1;
      this.proxyDialogVisible = true;
    },
    
    editProxy(proxy, index) {
      this.proxyDialogTitle = '编辑代理';
      this.currentProxy = { ...proxy };
      this.editingProxyIndex = index;
      this.proxyDialogVisible = true;
    },
    
    saveProxy() {
      if (!this.currentProxy.name || !this.currentProxy.host || !this.currentProxy.port) {
        this.$message.warning('请填写完整的代理信息');
        return;
      }
      
      if (this.editingProxyIndex === -1) {
        // 添加新代理
        this.settings.proxy.pool.push({ ...this.currentProxy });
      } else {
        // 更新现有代理
        this.settings.proxy.pool[this.editingProxyIndex] = { ...this.currentProxy };
      }
      
      this.proxyDialogVisible = false;
    },
    
    removeProxy(index) {
      this.$confirm('确定要删除这个代理吗？', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.settings.proxy.pool.splice(index, 1);
      }).catch(() => {
        // 用户取消
      });
    },
    
    clearData() {
      this.$confirm('确定要清除所有数据吗？这将删除所有配置文件和浏览器数据。', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await window.ipcRenderer.invoke('clear-data');
          this.$message.success('数据已清除');
          this.loadSettings();
        } catch (error) {
          this.$message.error('清除数据失败: ' + error.message);
        }
      }).catch(() => {
        // 用户取消
      });
    },
    
    resetSettings() {
      this.$confirm('确定要重置所有设置吗？这将恢复默认设置，但不会删除配置文件。', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          await window.ipcRenderer.invoke('reset-settings');
          this.$message.success('设置已重置');
          this.loadSettings();
        } catch (error) {
          this.$message.error('重置设置失败: ' + error.message);
        }
      }).catch(() => {
        // 用户取消
      });
    }
  }
};
