// CookieManagerPage.js - Cookie 和本地存储管理页面
const CookieManagerPage = {
  template: `
    <div class="cookie-manager-page">
      <h2>Cookie 和本地存储管理</h2>
      
      <div class="cookie-manager-header">
        <div class="profile-selector">
          <el-select 
            v-model="selectedProfileId" 
            placeholder="选择配置文件"
            @change="handleProfileChange">
            <el-option
              v-for="profile in profiles"
              :key="profile.id"
              :label="profile.name"
              :value="profile.id">
            </el-option>
          </el-select>
        </div>
        
        <div class="url-input">
          <el-input 
            v-model="url" 
            placeholder="输入网站 URL (例如: https://www.example.com)"
            clearable>
            <template #prepend>URL</template>
            <template #append>
              <el-button @click="loadCookies">加载</el-button>
            </template>
          </el-input>
        </div>
        
        <div class="storage-type">
          <el-radio-group v-model="storageType" @change="handleStorageTypeChange">
            <el-radio-button label="cookies">Cookies</el-radio-button>
            <el-radio-button label="localStorage">本地存储</el-radio-button>
            <el-radio-button label="sessionStorage">会话存储</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      
      <div class="cookie-manager-actions">
        <div class="cookie-actions">
          <el-button type="primary" @click="loadCookies" :disabled="!selectedProfileId || !url">
            <i class="el-icon-refresh"></i> 加载 Cookie
          </el-button>
          <el-button type="success" @click="showAddCookieDialog" :disabled="!selectedProfileId || !url">
            <i class="el-icon-plus"></i> 添加 Cookie
          </el-button>
          <el-button type="danger" @click="deleteAllDomainCookies" :disabled="!selectedProfileId || !url || cookies.length === 0">
            <i class="el-icon-delete"></i> 删除所有 Cookie
          </el-button>
        </div>
        <el-button-group>
          <el-button type="primary" @click="refreshData">
            <i class="el-icon-refresh"></i> 刷新
          </el-button>
          <el-button @click="addItem">
            <i class="el-icon-plus"></i> 添加
          </el-button>
          <el-button type="danger" @click="clearAll" :disabled="!hasData">
            <i class="el-icon-delete"></i> 清除全部
          </el-button>
        </el-button-group>
        
        <div class="export-import">
          <el-button @click="exportData" :disabled="!hasData">
            <i class="el-icon-download"></i> 导出
          </el-button>
          <el-button @click="importData">
            <i class="el-icon-upload2"></i> 导入
          </el-button>
        </div>
        
        <el-input
          placeholder="搜索..."
          v-model="searchQuery"
          class="search-input"
          prefix-icon="el-icon-search"
          clearable>
        </el-input>
      </div>
      
      <!-- Cookie 表格 -->
      <div v-if="storageType === 'cookies'" class="data-table">
        <el-table
          :data="filteredCookies"
          style="width: 100%"
          border
          v-loading="loading"
          max-height="500">
          <el-table-column prop="name" label="名称" min-width="150">
            <template #default="{ row }">
              <el-tooltip :content="row.name" placement="top">
                <span>{{ row.name }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="value" label="值" min-width="200">
            <template #default="{ row }">
              <el-tooltip :content="row.value" placement="top">
                <span>{{ truncateValue(row.value) }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="domain" label="域" min-width="150"></el-table-column>
          <el-table-column prop="path" label="路径" min-width="100"></el-table-column>
          <el-table-column label="属性" min-width="180">
            <template #default="{ row }">
              <el-tag size="small" v-if="row.httpOnly">HttpOnly</el-tag>
              <el-tag size="small" v-if="row.secure">Secure</el-tag>
              <el-tag size="small" v-if="row.sameSite">SameSite: {{ row.sameSite }}</el-tag>
              <el-tag size="small" v-if="row.session">Session</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="过期时间" min-width="180">
            <template #default="{ row }">
              {{ formatExpiry(row.expires) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="{ row }">
              <div class="button-container">
                <el-button
                  size="small"
                  type="primary"
                  @click="editItem(row)">编辑</el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="deleteItem(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 本地存储表格 -->
      <div v-else class="data-table">
        <el-table
          :data="filteredStorageItems"
          style="width: 100%"
          border
          v-loading="loading"
          max-height="500">
          <el-table-column prop="key" label="键" min-width="200">
            <template #default="{ row }">
              <el-tooltip :content="row.key" placement="top">
                <span>{{ row.key }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="value" label="值" min-width="400">
            <template #default="{ row }">
              <el-tooltip :content="row.value" placement="top">
                <span>{{ truncateValue(row.value) }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="150">
            <template #default="{ row }">
              <div class="button-container">
                <el-button
                  size="small"
                  type="primary"
                  @click="editItem(row)">编辑</el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="deleteItem(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <el-empty v-if="!loading && !hasData" description="暂无数据"></el-empty>
      
      <!-- Cookie 编辑对话框 -->
      <el-dialog
        :title="isEditMode ? '编辑 Cookie' : '添加 Cookie'"
        v-model="cookieDialogVisible"
        width="600px"
        :append-to-body="true"
        :close-on-click-modal="false"
        :destroy-on-close="false"
        :modal-append-to-body="false"
        :z-index="10000">
        <el-form :model="currentCookie" label-position="top" :rules="cookieRules" ref="cookieForm">
          <el-form-item label="名称" prop="name">
            <el-input v-model="currentCookie.name"></el-input>
          </el-form-item>
          <el-form-item label="值" prop="value">
            <el-input type="textarea" v-model="currentCookie.value" :rows="3"></el-input>
          </el-form-item>
          <el-form-item label="域" prop="domain">
            <el-input v-model="currentCookie.domain"></el-input>
          </el-form-item>
          <el-form-item label="路径" prop="path">
            <el-input v-model="currentCookie.path"></el-input>
          </el-form-item>
          <el-form-item label="过期时间">
            <div v-if="!currentCookie.session">
              <el-date-picker
                v-model="expiryDate"
                type="datetime"
                placeholder="选择过期时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format=""
                :clearable="true"
                :editable="true"
                :popper-class="'date-picker-higher-z'"
                style="width: 100%;"
                @change="handleDateChange">
              </el-date-picker>
            </div>
            <div v-else style="color: #909399; padding: 10px 0;">
              会话 Cookie不需要设置过期时间
            </div>
            <div class="cookie-option">
              <el-checkbox v-model="currentCookie.session" @change="handleSessionChange">会话 Cookie (关闭浏览器后过期)</el-checkbox>
            </div>
          </el-form-item>
          <el-form-item label="选项">
            <div class="cookie-options">
              <el-checkbox v-model="currentCookie.httpOnly">HttpOnly</el-checkbox>
              <el-checkbox v-model="currentCookie.secure">Secure</el-checkbox>
              <div class="same-site-option">
                <span>SameSite:</span>
                <el-select v-model="currentCookie.sameSite" placeholder="选择 SameSite 属性">
                  <el-option label="None" value="None"></el-option>
                  <el-option label="Lax" value="Lax"></el-option>
                  <el-option label="Strict" value="Strict"></el-option>
                </el-select>
              </div>
            </div>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="cookieDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveCookie" :loading="saving">保存</el-button>
          </span>
        </template>
      </el-dialog>
      
      <!-- 本地存储编辑对话框 -->
      <el-dialog
        :title="isEditMode ? '编辑存储项' : '添加存储项'"
        v-model="storageDialogVisible"
        width="600px"
        :append-to-body="true"
        :close-on-click-modal="false"
        :modal-append-to-body="false"
        :z-index="10000">
        <el-form :model="currentStorageItem" label-position="top" :rules="storageRules" ref="storageForm">
          <el-form-item label="键" prop="key">
            <el-input v-model="currentStorageItem.key"></el-input>
          </el-form-item>
          <el-form-item label="值" prop="value">
            <el-input type="textarea" v-model="currentStorageItem.value" :rows="5"></el-input>
          </el-form-item>
        </el-form>
        <span slot="footer" class="dialog-footer">
          <el-button @click="storageDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveStorageItem" :loading="saving">保存</el-button>
        </span>
      </el-dialog>
      
      <!-- 确认对话框 -->
      <el-dialog
        title="确认操作"
        v-model="confirmDialogVisible"
        width="400px"
        :append-to-body="true"
        :close-on-click-modal="false"
        :modal-append-to-body="false"
        :z-index="10000">
        <p>{{ confirmMessage }}</p>
        <span slot="footer" class="dialog-footer">
          <el-button @click="confirmDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmAction" :loading="processing">确定</el-button>
        </span>
      </el-dialog>
    </div>
  `,
  
  data() {
  return {
    profiles: [],
    selectedProfileId: '',
    selectedProfile: null,
    url: '',
    storageType: 'cookies',
    cookies: [],
    storageItems: [],
    loading: false,
    searchQuery: '',
    cookieDialogVisible: false,
    storageDialogVisible: false,
    confirmDialogVisible: false,
    confirmMessage: '',
    confirmCallback: null,
    isEditMode: false,
    currentCookie: {
      name: '',
      value: '',
      domain: '',
      path: '/',
      expires: null,
      session: false,
      httpOnly: false,
      secure: false,
      sameSite: 'None'
    },
    currentStorageItem: {
      key: '',
      value: ''
    },
    itemToDelete: null,
    processing: false,
    saving: false,
    confirmMessage: '',
    confirmCallback: null,
    
    // 状态
    isEditMode: false,
    saving: false,
    processing: false,
    expiryDate: null,
    expiryDateString: '',
    addCookieDialogVisible: false, // 添加 Cookie 对话框是否可见
      
      // 验证规则
      cookieRules: {
        name: [
          { required: true, message: '请输入 Cookie 名称', trigger: 'blur' }
        ],
        domain: [
          { required: true, message: '请输入域名', trigger: 'blur' }
        ]
      },
      storageRules: {
        key: [
          { required: true, message: '请输入键名', trigger: 'blur' }
        ]
      }
    };
  },
  
  computed: {
    filteredCookies() {
      if (!this.searchQuery) return this.cookies;
      
      const query = this.searchQuery.toLowerCase();
      return this.cookies.filter(cookie => 
        cookie.name.toLowerCase().includes(query) || 
        cookie.value.toLowerCase().includes(query) ||
        cookie.domain.toLowerCase().includes(query)
      );
    },
    
    filteredStorageItems() {
      if (!this.searchQuery) return this.storageItems;
      
      const query = this.searchQuery.toLowerCase();
      return this.storageItems.filter(item => 
        item.key.toLowerCase().includes(query) || 
        item.value.toLowerCase().includes(query)
      );
    },
    
    hasData() {
      return this.storageType === 'cookies' 
        ? this.cookies.length > 0 
        : this.storageItems.length > 0;
    }
  },
  
  created() {
    this.loadProfiles().then(() => {
      if (this.selectedProfileId) {
        this.handleProfileChange();
      }
    });
  },
  
  methods: {
    /**
     * 处理日期选择器变更
     * @param {Date|null} date 选择的日期对象
     */
    handleDateChange(date) {
      console.log('日期选择器变更:', date);
      
      if (date) {
        // 将日期对象转换为秒级时间戳
        this.currentCookie.expires = Math.floor(date.getTime() / 1000);
        console.log('设置过期时间:', this.currentCookie.expires, '日期:', date.toLocaleString());
      } else {
        this.currentCookie.expires = null;
        console.log('清除过期时间');
      }
      
      // 如果设置了过期时间，确保会话 Cookie 复选框不被选中
      if (date) {
        this.currentCookie.session = false;
      }
    },
    
    /**
     * 处理会话 Cookie 复选框变更
     * @param {boolean} isSession 是否为会话 Cookie
     */
    handleSessionChange(isSession) {
      if (isSession) {
        // 如果是会话 Cookie，清除过期时间
        this.expiryDate = null;
        this.currentCookie.expires = null;
      } else if (!this.expiryDate) {
        // 如果不是会话 Cookie 且没有过期时间，设置为一年后过期
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        this.expiryDate = oneYearLater.getTime();
        this.currentCookie.expires = Math.floor(this.expiryDate / 1000);
      }
    },
    
    showAddCookieDialog() {
      if (!this.selectedProfileId) {
        this.$message.warning('请先选择配置文件');
        return;
      }
      
      if (!this.url) {
        this.$message.warning('请先输入网站 URL');
        return;
      }
      
      // 重置当前 Cookie 数据
      this.currentCookie = {
        name: '',
        value: '',
        domain: this.extractDomain(this.url),
        path: '/',
        expires: null,
        session: false,
        httpOnly: false,
        secure: false,
        sameSite: 'None'
      };
      
      // 重置过期时间
      this.expiryDate = null;
      
      // 设置为非编辑模式
      this.isEditMode = false;
      
      // 显示对话框
      this.cookieDialogVisible = true;
    },
    // 直接编辑 Cookie 的方法
    directEditCookie(cookie) {
      console.log('直接编辑 Cookie:', cookie);
      
      if (!this.selectedProfileId) {
        this.$message.warning('请先选择配置文件');
        return;
      }
      
      if (!this.url) {
        this.$message.warning('请先输入网站 URL');
        return;
      }
      
      // 设置编辑模式
      this.isEditMode = true;
      
      // 设置当前 Cookie 数据
      this.currentCookie = { ...cookie };
      
      // 如果有过期时间，转换为 Date 对象
      if (cookie.expires) {
        this.expiryDate = new Date(cookie.expires * 1000); // 转换为 Date 对象
        console.log('设置编辑日期:', this.expiryDate.toLocaleString());
      } else {
        this.expiryDate = null;
      }
      
      // 显示编辑对话框
      this.cookieDialogVisible = true;
    },
    
    // 直接删除 Cookie 的方法
    directDeleteCookie(cookie) {
      console.log('直接删除 Cookie:', cookie);
      
      if (!this.selectedProfileId) {
        this.$message.warning('请先选择配置文件');
        return;
      }
      
      if (!this.url) {
        this.$message.warning('请先输入网站 URL');
        return;
      }
      
      // 使用 Element UI 的确认对话框
      this.$confirm(`确定要删除 Cookie "${cookie.name}" 吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          // 从浏览器删除 Cookie
          const result = await window.ipcRenderer.invoke('delete-cookie', {
            profileId: this.selectedProfileId,
            url: this.url,
            name: cookie.name
          });
          console.log('删除 Cookie 结果:', result);
          
          // 从本地数组中移除被删除的 Cookie
          const index = this.cookies.findIndex(c => c.name === cookie.name && c.domain === cookie.domain);
          if (index > -1) {
            this.cookies.splice(index, 1);
            console.log(`从列表中移除了 Cookie: ${cookie.name}`);
          }
          
          // 更新配置文件中的 Cookie
          await this.saveCookiesToProfile();
          
          // 不需要重新加载，因为我们已经从列表中移除了该 Cookie
          
          this.$message.success('Cookie 删除成功');
        } catch (error) {
          console.error('删除 Cookie 失败:', error);
          this.$message.error('删除 Cookie 失败: ' + error.message);
        }
      }).catch(() => {
        // 取消删除
      });
    },
    
    // 删除特定域名的所有 Cookie
    async deleteAllDomainCookies() {
      console.log('删除域名的所有 Cookie');
      
      if (!this.selectedProfileId) {
        this.$message.warning('请先选择配置文件');
        return;
      }
      
      if (!this.url) {
        this.$message.warning('请先输入网站 URL');
        return;
      }
      
      // 获取域名
      let domain;
      try {
        domain = new URL(this.url).hostname;
      } catch (e) {
        this.$message.error('无效的 URL');
        return;
      }
      
      // 使用 Element UI 的确认对话框
      this.$confirm(`确定要删除域名 "${domain}" 的所有 Cookie 吗？`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        try {
          // 先检查浏览器实例是否存在
          const runningInstances = await window.ipcRenderer.invoke('get-running-instances');
          const profileRunning = runningInstances.some(instance => instance.profileId === this.selectedProfileId);
          
          if (!profileRunning) {
            // 如果浏览器实例未启动，自动启动它
            this.$message.info(`浏览器实例未启动，正在自动启动...`);
            
            try {
              // 启动浏览器实例
              await window.ipcRenderer.invoke('launch-browser', this.selectedProfileId);
              this.$message.success(`浏览器实例启动成功，正在准备删除 Cookie...`);
              
              // 等待一下，确保浏览器实例完全启动
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (launchError) {
              console.error('启动浏览器实例失败:', launchError);
              this.$message.error(`启动浏览器实例失败: ${launchError.message}`);
              return;
            }
          }
          
          // 删除域名的所有 Cookie
          const result = await window.ipcRenderer.invoke('delete-domain-cookies', {
            profileId: this.selectedProfileId,
            url: this.url
          });
          
          console.log('删除域名 Cookie 结果:', result);
          
          if (result.success) {
            // 直接清空当前的 Cookie 列表，立即反映删除效果
            this.cookies = [];
            
            // 然后重新加载 Cookie 列表
            await this.loadCookies();
            
            this.$message.success(`成功删除 ${result.count} 个 Cookie`);
            
            // 强制刷新页面，确保显示最新的 Cookie 列表
            setTimeout(() => {
              window.location.reload();
            }, 1000); // 等待 1 秒后刷新，让用户看到成功消息
          } else {
            this.$message.error('删除域名 Cookie 失败');
          }
        } catch (error) {
          console.error('删除域名 Cookie 失败:', error);
          this.$message.error('删除域名 Cookie 失败: ' + error.message);
        }
      }).catch(() => {
        // 取消删除
      });
    },
    
    async loadProfiles() {
      try {
        this.profiles = await window.ipcRenderer.invoke('get-profiles');
        
        if (this.profiles.length > 0 && !this.selectedProfileId) {
          this.selectedProfileId = this.profiles[0].id;
        }
      } catch (error) {
        this.$message.error('加载配置文件失败: ' + error.message);
      }
    },
    
    async handleProfileChange() {
      try {
        // 获取当前选择的配置文件
        const profiles = await window.ipcRenderer.invoke('get-profiles');
        const selectedProfile = profiles.find(p => p.id === this.selectedProfileId);
        
        if (!selectedProfile) {
          console.log('找不到选中的配置文件');
          return;
        }
        
        this.selectedProfile = selectedProfile;
        console.log('已选中配置文件:', selectedProfile.name);
        
        // 如果配置文件存在且有启动页设置，则使用启动页作为默认 URL
        if (selectedProfile.startup && selectedProfile.startup.startUrl) {
          this.url = selectedProfile.startup.startUrl;
          console.log('已设置 URL 为启动页:', this.url);
        }
        
        // 如果有 URL，先尝试从配置文件中加载 Cookie
        if (this.url && this.storageType === 'cookies') {
          try {
            // 检查配置文件中是否有已保存的 Cookie
            if (selectedProfile.cookies && selectedProfile.cookies.length > 0) {
              // 提取当前域名
              const urlObj = new URL(this.url);
              const domain = urlObj.hostname;
              
              console.log('尝试从配置文件中加载域名为', domain, '的 Cookie');
              
              // 查找当前域名的 Cookie 记录
              const domainCookie = selectedProfile.cookies.find(c => c.domain === domain);
            
              if (domainCookie && domainCookie.cookies && domainCookie.cookies.length > 0) {
                // 使用配置文件中的 Cookie
                this.cookies = domainCookie.cookies;
                console.log(`从配置文件中加载了 ${this.cookies.length} 个 Cookie`);
                this.loading = false;
                return; // 已加载到 Cookie，不需要再从浏览器加载
              }
          }
        } catch (error) {
          console.error('从配置文件加载 Cookie 失败:', error);
        }
      }
      
      // 如果没有从配置文件中加载到 Cookie，则从浏览器加载
      if (this.url) {
        await this.loadCookies();
      }
      } catch (error) {
        console.error('处理配置文件变更失败:', error);
        this.$message.error('加载配置文件失败: ' + error.message);
      }
    },
    
    async handleStorageTypeChange() {
      if (this.url) {
        this.loadCookies();
      }
    },
    
    /**
   * 加载 Cookie 或本地存储数据
   * @param {boolean} forceRefresh 可选，强制从浏览器获取最新的 Cookie，而不是从配置文件中获取
   */
  async loadCookies(forceRefresh = false) {
    if (!this.selectedProfileId) {
      this.$message.warning('请先选择配置文件');
      return;
    }
    
    if (!this.url) {
      this.$message.warning('请输入网站 URL');
      return;
    }
    
    if (!this.isValidUrl(this.url)) {
      this.$message.error('请输入有效的 URL，例如: https://www.example.com');
      return;
    }
    
    // 先检查浏览器实例是否存在
    try {
      const runningInstances = await window.ipcRenderer.invoke('get-running-instances');
      const profileRunning = runningInstances.some(instance => instance.profileId === this.selectedProfileId);
      
      if (!profileRunning) {
        // 如果浏览器实例未启动，自动启动它
        this.$message.info(`浏览器实例未启动，正在自动启动...`);
        
        try {
          // 启动浏览器实例
          await window.ipcRenderer.invoke('launch-browser', this.selectedProfileId);
          this.$message.success(`浏览器实例启动成功，正在加载 Cookie...`);
          
          // 等待一下，确保浏览器实例完全启动
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (launchError) {
          console.error('启动浏览器实例失败:', launchError);
          this.$message.error(`启动浏览器实例失败: ${launchError.message}`);
          this.loading = false;
          return;
        }
      }
    } catch (error) {
      console.error('检查浏览器实例失败:', error);
    }
    
    this.loading = true;
    console.log(`加载数据, 强制刷新: ${forceRefresh}`);
    
    try {
      if (this.storageType === 'cookies') {
        // 加载 Cookie，并传入 forceRefresh 参数
        this.cookies = await window.ipcRenderer.invoke('get-cookies', this.selectedProfileId, this.url, forceRefresh);
        console.log(`加载到 ${this.cookies.length} 个 Cookie`);
        
        // 不需要每次加载时都保存，只在有变化时才保存
        // await this.saveCookiesToProfile();
      } else {
          // 加载本地存储
          const storageData = await window.ipcRenderer.invoke(
            'get-local-storage', 
            this.selectedProfileId, 
            this.url, 
            this.storageType === 'localStorage' ? 'localStorage' : 'sessionStorage'
          );
          
          // 转换为数组格式
          this.storageItems = Object.entries(storageData || {}).map(([key, value]) => ({ key, value }));
        }
      } catch (error) {
        this.$message.error('加载数据失败: ' + error.message);
      } finally {
        this.loading = false;
      }
    },
    
    async saveCookiesToProfile() {
      try {
        // 获取当前配置文件
        const profiles = await window.ipcRenderer.invoke('get-profiles');
        const profile = profiles.find(p => p.id === this.selectedProfileId);
        if (!profile) return;
        
        // 提取当前域名
        const urlObj = new URL(this.url);
        const domain = urlObj.hostname;
        
        // 确保 cookies 字段存在
        if (!profile.cookies) {
          profile.cookies = [];
        }
        
        // 查找当前域名的 Cookie 记录
        const domainCookieIndex = profile.cookies.findIndex(c => c.domain === domain);
        
        // 处理 Cookie 数据，确保它们是可序列化的
        const serializableCookies = this.cookies.map(cookie => {
          // 创建一个新的对象，只包含需要的属性
          return {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expires,
            size: cookie.size,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            session: cookie.session,
            sameSite: cookie.sameSite,
            priority: cookie.priority
          };
        });
        
        // 创建新的 Cookie 记录
        const cookieRecord = {
          domain,
          url: this.url,
          cookies: serializableCookies
        };
        
        // 更新或添加 Cookie 记录
        if (domainCookieIndex >= 0) {
          profile.cookies[domainCookieIndex] = cookieRecord;
        } else {
          profile.cookies.push(cookieRecord);
        }
        
        // 保存配置文件
        await window.ipcRenderer.invoke('save-profile', profile);
        console.log('Cookie 已保存到配置文件');
      } catch (error) {
        console.error('保存 Cookie 到配置文件失败:', error);
      }
    },
    
    refreshData() {
      this.loadCookies();
    },
    
    addItem() {
      if (!this.selectedProfileId) {
        this.$message.warning('请先选择配置文件');
        return;
      }
      
      if (!this.url) {
        this.$message.warning('请先输入网站 URL');
        return;
      }
      
      if (!this.isValidUrl(this.url)) {
        this.$message.error('请输入有效的 URL，例如: https://www.example.com');
        return;
      }
      
      this.isEditMode = false;
      
      if (this.storageType === 'cookies') {
        // 添加 Cookie
        try {
          const urlObj = new URL(this.url);
          this.currentCookie = {
            name: '',
            value: '',
            domain: urlObj.hostname,
            path: '/',
            secure: this.url.startsWith('https://'),
            httpOnly: false,
            sameSite: 'None',
            session: false,
            expires: null
          };
          this.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30天后
          this.cookieDialogVisible = true;
        } catch (error) {
          this.$message.error('无效的 URL: ' + error.message);
        }
      } else {
        // 添加本地存储项
        this.currentStorageItem = {
          key: '',
          value: ''
        };
        this.storageDialogVisible = true;
      }
    },
    
    editItem(item) {
      console.log('点击编辑按钮:', item);
      
      if (!this.selectedProfileId) {
        this.$message.warning('请先选择配置文件');
        return;
      }
      
      if (!this.url) {
        this.$message.warning('请先输入网站 URL');
        return;
      }
      
      this.isEditMode = true;
      console.log('设置编辑模式为 true');
      
      if (this.storageType === 'cookies') {
        // 编辑 Cookie
        this.currentCookie = { ...item };
        
        // 设置过期时间
        if (item.expires) {
          this.expiryDate = new Date(item.expires * 1000);
          
          // 格式化为 HTML datetime-local 输入框需要的格式 (YYYY-MM-DDThh:mm)
          const year = this.expiryDate.getFullYear();
          const month = String(this.expiryDate.getMonth() + 1).padStart(2, '0');
          const day = String(this.expiryDate.getDate()).padStart(2, '0');
          const hours = String(this.expiryDate.getHours()).padStart(2, '0');
          const minutes = String(this.expiryDate.getMinutes()).padStart(2, '0');
          
          this.expiryDateString = `${year}-${month}-${day}T${hours}:${minutes}`;
        } else {
          this.expiryDate = null;
          this.expiryDateString = '';
        }
        
        this.cookieDialogVisible = true;
      } else {
        // 编辑本地存储项
        this.currentStorageItem = { ...item };
        this.storageDialogVisible = true;
      }
    },
    
    async saveCookie() {
      try {
        // 验证表单
        const valid = await new Promise(resolve => {
          this.$refs.cookieForm.validate(valid => resolve(valid));
        });
        
        if (!valid) {
          this.$message.warning('请填写必填字段');
          return;
        }
        
        this.saving = true;
        
        try {
          // 检查配置文件 ID
          if (!this.selectedProfileId) {
            throw new Error('请选择一个配置文件');
          }
          
          // 检查 URL
          if (!this.url) {
            throw new Error('请输入网站 URL');
          }
          
          // 设置过期时间
          if (!this.currentCookie.session && this.expiryDate) {
            // 直接使用 expiryDate，它已经是 Date 对象
            if (this.expiryDate instanceof Date && !isNaN(this.expiryDate.getTime())) {
              this.currentCookie.expires = Math.floor(this.expiryDate.getTime() / 1000);
              console.log('保存时设置过期时间:', this.currentCookie.expires, '日期:', this.expiryDate.toLocaleString());
            } else {
              throw new Error('过期时间格式不正确');
            }
          } else if (this.currentCookie.session) {
            this.currentCookie.expires = null;
            console.log('保存会话 Cookie，无过期时间');
          }
          
          // 创建一个简单的可序列化的 Cookie 对象
          const serializableCookie = {
            name: this.currentCookie.name,
            value: this.currentCookie.value,
            domain: this.currentCookie.domain,
            path: this.currentCookie.path || '/',
            expires: this.currentCookie.expires,
            secure: !!this.currentCookie.secure,
            httpOnly: !!this.currentCookie.httpOnly,
            sameSite: this.currentCookie.sameSite || 'None',
            url: this.url
          };
          
          console.log('准备保存 Cookie:', JSON.stringify(serializableCookie, null, 2));
          
          // 启动浏览器
          console.log('启动浏览器实例...');
          await window.ipcRenderer.invoke('launch-browser', this.selectedProfileId);
          
          // 等待浏览器启动
          console.log('等待浏览器实例启动...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // 设置 Cookie
          console.log('设置 Cookie...');
          await window.ipcRenderer.invoke('set-cookie', {
            profileId: this.selectedProfileId,
            cookie: serializableCookie
          });
          
          // 刷新 Cookie 列表
          await this.loadCookies(true); // 强制刷新，确保显示最新数据
          
          this.$message.success('Cookie 保存成功');
          this.cookieDialogVisible = false;
        } catch (error) {
          console.error('保存 Cookie 失败:', error);
          this.$message.error(`保存 Cookie 失败: ${error.message}`);
        } finally {
          this.saving = false;
        }
      } catch (error) {
        console.error('表单验证失败:', error);
        this.$message.error(`表单验证失败: ${error.message}`);
        this.saving = false;
      }
    },
    
    async saveStorageItem() {
      try {
        this.saving = true;
        
        // 获取当前存储数据
        const storageData = await window.ipcRenderer.invoke(
          'get-local-storage', 
          this.selectedProfileId, 
          this.url, 
          this.storageType === 'localStorage' ? 'localStorage' : 'sessionStorage'
        );
        
        // 更新或添加项
        storageData[this.currentStorageItem.key] = this.currentStorageItem.value;
        
        // 保存回存储
        await window.ipcRenderer.invoke(
          'set-local-storage', 
          this.selectedProfileId, 
          this.url, 
          storageData,
          this.storageType === 'localStorage' ? 'localStorage' : 'sessionStorage'
        );
        
        this.$message.success('存储项保存成功');
        this.storageDialogVisible = false;
        this.loadCookies();
      } catch (error) {
        this.$message.error('保存存储项失败: ' + error.message);
      } finally {
        this.saving = false;
      }
    },
    
    deleteItem(item) {
      console.log('点击删除按钮:', item);
      
      if (!this.selectedProfileId) {
        this.$message.warning('请先选择配置文件');
        return;
      }
      
      if (!this.url) {
        this.$message.warning('请先输入网站 URL');
        return;
      }
      
      console.log('开始准备删除操作');
      
      if (this.storageType === 'cookies') {
        // 使用 Element UI 的内置确认对话框
        this.$confirm(`确定要删除 Cookie "${item.name}" 吗？`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          try {
            console.log(`准备删除 Cookie: ${item.name}, URL: ${this.url}`);
            
            // 先启动浏览器实例，确保可以连接
            await window.ipcRenderer.invoke('launch-browser', this.selectedProfileId);
            console.log('浏览器实例已启动，准备删除 Cookie');
            
            // 从浏览器删除 Cookie
            console.log('准备删除 Cookie:', item.name, 'URL:', this.url);
            await window.ipcRenderer.invoke('launch-browser', this.selectedProfileId);
            console.log('浏览器实例已启动，准备删除 Cookie');
            const result = await window.ipcRenderer.invoke('delete-cookie', {
              profileId: this.selectedProfileId,
              url: this.url,
              name: item.name
            });
            console.log('删除 Cookie 结果:', result);
            
            // 从本地数组中移除被删除的 Cookie
            const index = this.cookies.findIndex(c => c.name === item.name && c.domain === item.domain);
            if (index > -1) {
              this.cookies.splice(index, 1);
              console.log(`从内存中移除了 Cookie ${item.name}`);
            } else {
              console.warn(`在内存中找不到 Cookie ${item.name}`);
            }
            
            // 从配置文件中删除 Cookie
            try {
              // 获取当前配置文件
              const profiles = await window.ipcRenderer.invoke('get-profiles');
              const profile = profiles.find(p => p.id === this.selectedProfileId);
              if (profile && profile.cookies) {
                // 提取当前域名
                const urlObj = new URL(this.url);
                const domain = urlObj.hostname;
                
                // 查找当前域名的 Cookie 记录
                const domainCookieIndex = profile.cookies.findIndex(c => c.domain === domain);
                
                if (domainCookieIndex >= 0) {
                  // 从域名的 cookies 数组中移除指定的 cookie
                  const domainCookies = profile.cookies[domainCookieIndex];
                  if (domainCookies && domainCookies.cookies) {
                    const cookieIndex = domainCookies.cookies.findIndex(c => c.name === item.name);
                    if (cookieIndex >= 0) {
                      domainCookies.cookies.splice(cookieIndex, 1);
                      console.log(`从配置文件中移除了 Cookie ${item.name}`);
                      
                      // 保存配置文件
                      await window.ipcRenderer.invoke('save-profile', profile);
                      console.log('配置文件已更新');
                    }
                  }
                }
              }
            } catch (error) {
              console.error('从配置文件中删除 Cookie 失败:', error);
            }
            
            // 不需要再调用 saveCookiesToProfile，因为我们已经直接从配置文件中删除了 Cookie
            // 并且已经保存了更新后的配置文件
            
            // 重新加载 Cookie 列表，确保显示最新数据
            await this.loadCookies();
            
            this.$message.success('Cookie 删除成功');
          } catch (error) {
            console.error('删除 Cookie 失败:', error);
            this.$message.error('删除 Cookie 失败: ' + error.message);
          }
        }).catch(() => {
          // 取消删除
        });
      } else {
        // 使用 Element UI 的内置确认对话框
        this.$confirm(`确定要删除存储项 "${item.key}" 吗？`, '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          try {
            
            // 获取当前存储数据
            const storageData = await window.ipcRenderer.invoke(
              'get-local-storage', 
              this.selectedProfileId, 
              this.url, 
              this.storageType === 'localStorage' ? 'localStorage' : 'sessionStorage'
            );
            
            // 删除项
            delete storageData[item.key];
            
            // 保存回存储
            await window.ipcRenderer.invoke(
              'set-local-storage', 
              this.selectedProfileId, 
              this.url, 
              storageData,
              this.storageType === 'localStorage' ? 'localStorage' : 'sessionStorage'
            );
            
            // 从本地数组中移除被删除的存储项
            const index = this.storageItems.findIndex(i => i.key === item.key);
            if (index > -1) {
              this.storageItems.splice(index, 1);
            }
            
            this.$message.success('存储项删除成功');
          } catch (error) {
            console.error('删除存储项失败:', error);
            this.$message.error('删除存储项失败: ' + error.message);
          } finally {
            this.processing = false;
            this.confirmDialogVisible = false;
          }
        }).catch(() => {
          // 取消删除
        });
      }
    },
    
    clearAll() {
      if (this.storageType === 'cookies') {
        // 清除所有 Cookie
        this.$confirm('确定要清除所有 Cookie 吗？', '确认清除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          try {
            await window.ipcRenderer.invoke('clear-cookies', this.selectedProfileId, this.url);
            this.$message.success('所有 Cookie 已清除');
            this.loadCookies();
          } catch (error) {
            this.$message.error('清除 Cookie 失败: ' + error.message);
          }
        }).catch(() => {
          // 取消删除
        });
      } else {
        // 清除所有本地存储
        this.$confirm(`确定要清除所有${this.storageType === 'localStorage' ? '本地存储' : '会话存储'}数据吗？`, '确认清除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }).then(async () => {
          try {
            await window.ipcRenderer.invoke(
              'clear-local-storage', 
              this.selectedProfileId, 
              this.url,
              this.storageType === 'localStorage' ? 'localStorage' : 'sessionStorage'
            );
            this.$message.success(`所有${this.storageType === 'localStorage' ? '本地存储' : '会话存储'}数据已清除`);
            this.loadCookies();
          } catch (error) {
            this.$message.error('清除存储数据失败: ' + error.message);
          }
        }).catch(() => {
          // 取消删除
        });
      }
    },
    
    confirmAction() {
      console.log('点击确认按钮');
      console.log('confirmCallback 类型:', typeof this.confirmCallback);
      
      if (typeof this.confirmCallback === 'function') {
        console.log('调用 confirmCallback 函数');
        this.confirmCallback();
      } else {
        console.warn('confirmCallback 不是函数，无法调用');
      }
    },
    
    async exportData() {
      try {
        if (!this.selectedProfileId || !this.url) {
          this.$message.warning('请先选择配置文件和输入网站 URL');
          return;
        }
        
        if (this.storageType === 'cookies') {
          // 导出 Cookie
          const { filePath } = await window.ipcRenderer.invoke('show-save-dialog', {
            title: '导出 Cookie',
            defaultPath: `cookies_${new URL(this.url).hostname}_${new Date().toISOString().slice(0, 10)}.json`,
            filters: [{ name: 'JSON 文件', extensions: ['json'] }]
          });
          
          if (filePath) {
            try {
              // 先尝试重新加载最新的 Cookie 数据
              await this.loadCookies();
              
              // 确保有 Cookie 数据可导出
              if (!this.cookies || this.cookies.length === 0) {
                // 如果没有 Cookie 数据，尝试从浏览器直接获取
                const freshCookies = await window.ipcRenderer.invoke('get-cookies', this.selectedProfileId, this.url);
                if (freshCookies && freshCookies.length > 0) {
                  this.cookies = freshCookies;
                  console.log('直接从浏览器获取到 Cookie:', freshCookies);
                }
              }
              
              // 准备导出数据
              const cookiesToExport = this.cookies || [];
              
              // 写入文件
              const result = await window.ipcRenderer.invoke('write-file', {
                filePath,
                content: JSON.stringify(cookiesToExport, null, 2)
              });
              
              if (result.success) {
                this.$message.success(`已导出 ${cookiesToExport.length} 个 Cookie 到 ${filePath}`);
                console.log('导出的 Cookie 数据:', cookiesToExport);
              } else {
                throw new Error(result.error || '写入文件失败');
              }
            } catch (error) {
              console.error('导出 Cookie 失败:', error);
              this.$message.error('导出 Cookie 失败: ' + error.message);
            }
          }
        } else {
          // 导出本地存储
          const { filePath } = await window.ipcRenderer.invoke('show-save-dialog', {
            title: `导出${this.storageType === 'localStorage' ? '本地存储' : '会话存储'}`,
            defaultPath: `${this.storageType}_${new URL(this.url).hostname}_${new Date().toISOString().slice(0, 10)}.json`,
            filters: [{ name: 'JSON 文件', extensions: ['json'] }]
          });
          
          if (filePath) {
            try {
              // 如果有数据，直接将当前的 storageItems 数组转换为对象并写入文件
              if (this.storageItems && this.storageItems.length > 0) {
                const storageObj = {};
                this.storageItems.forEach(item => {
                  storageObj[item.key] = item.value;
                });
                
                const result = await window.ipcRenderer.invoke('write-file', {
                  filePath,
                  content: JSON.stringify(storageObj, null, 2)
                });
                
                if (result.success) {
                  this.$message.success(`已导出${this.storageType === 'localStorage' ? '本地存储' : '会话存储'}数据到 ${filePath}`);
                } else {
                  throw new Error(result.error || '写入文件失败');
                }
              } else {
                // 如果没有数据，则导出空对象
                const result = await window.ipcRenderer.invoke('write-file', {
                  filePath,
                  content: JSON.stringify({}, null, 2)
                });
                
                if (result.success) {
                  this.$message.success(`已导出空的${this.storageType === 'localStorage' ? '本地存储' : '会话存储'}数据到 ${filePath}`);
                } else {
                  throw new Error(result.error || '写入文件失败');
                }
              }
            } catch (error) {
              console.error('导出存储数据失败:', error);
              this.$message.error('导出存储数据失败: ' + error.message);
            }
          }
        }
      } catch (error) {
        console.error('导出数据失败:', error);
        this.$message.error('导出数据失败: ' + error.message);
      }
    },
    
    async importData() {
      try {
        if (!this.selectedProfileId || !this.url) {
          this.$message.warning('请先选择配置文件和输入网站 URL');
          return;
        }
        
        const { filePaths } = await window.ipcRenderer.invoke('show-open-dialog', {
          title: `导入${this.storageType === 'cookies' ? 'Cookie' : this.storageType === 'localStorage' ? '本地存储' : '会话存储'}`,
          filters: [{ name: 'JSON 文件', extensions: ['json'] }],
          properties: ['openFile']
        });
        
        if (filePaths && filePaths.length > 0) {
          // 读取文件
          let fileContent;
          try {
            const result = await window.ipcRenderer.invoke('read-file', {
              filePath: filePaths[0]
            });
            
            if (!result.success) {
              throw new Error(result.error || '读取文件失败');
            }
            
            fileContent = result.content;
          } catch (fsError) {
            console.error('读取文件失败:', fsError);
            this.$message.error('读取文件失败: ' + fsError.message);
            return;
          }
          
          // 解析 JSON
          let jsonData;
          try {
            jsonData = JSON.parse(fileContent);
          } catch (jsonError) {
            console.error('解析 JSON 失败:', jsonError);
            this.$message.error('解析 JSON 失败: ' + jsonError.message);
            return;
          }
          
          if (this.storageType === 'cookies') {
            // 导入 Cookie
            try {
              // 直接将读取的 Cookie 数据设置到当前的 cookies 数组
              if (Array.isArray(jsonData)) {
                this.cookies = jsonData;
                await this.saveCookiesToProfile();
                this.$message.success(`已导入 ${jsonData.length} 个 Cookie`);
              } else {
                // 如果不是数组，尝试使用 IPC 调用
                const result = await window.ipcRenderer.invoke('import-cookies', this.selectedProfileId, filePaths[0]);
                if (result && result.success) {
                  this.$message.success(`已导入 ${result.count} 个 Cookie`);
                  this.loadCookies();
                } else {
                  this.$message.error('导入 Cookie 失败');
                }
              }
            } catch (cookieError) {
              console.error('导入 Cookie 失败:', cookieError);
              this.$message.error('导入 Cookie 失败: ' + cookieError.message);
            }
          } else {
            // 导入本地存储
            try {
              // 保存到存储
              await window.ipcRenderer.invoke(
                'set-local-storage', 
                this.selectedProfileId, 
                this.url, 
                jsonData,
                this.storageType === 'localStorage' ? 'localStorage' : 'sessionStorage'
              );
              
              // 更新本地数据
              this.storageItems = Object.entries(jsonData).map(([key, value]) => ({ key, value }));
              
              this.$message.success(`已导入${this.storageType === 'localStorage' ? '本地存储' : '会话存储'}数据`);
            } catch (storageError) {
              console.error('导入存储数据失败:', storageError);
              this.$message.error('导入存储数据失败: ' + storageError.message);
            }
          }
        }
      } catch (error) {
        console.error('导入数据失败:', error);
        this.$message.error('导入数据失败: ' + error.message);
      }
    },
    
    truncateValue(value) {
      if (!value) return '';
      return value.length > 50 ? value.substring(0, 50) + '...' : value;
    },
    
    formatExpiry(timestamp) {
      if (!timestamp) return '会话结束时过期';
      
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    },
    
    isValidUrl(url) {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
};

// 添加全局样式
const cookieManagerStyle = document.createElement('style');
cookieManagerStyle.textContent = `
  .button-container {
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: center;
    justify-content: center;
  }
  
  /* 提高日期选择器的层级 */
  .el-picker__popper {
    z-index: 20000 !important;
  }
  
  /* 提高下拉菜单的层级 */
  .el-select-dropdown {
    z-index: 20000 !important;
  }
  
  /* 确保对话框内容显示在前面 */
  .el-dialog__wrapper {
    z-index: 10000 !important;
  }
  
  .el-dialog__wrapper .el-dialog {
    z-index: 10001 !important;
  }
  
  /* 确保模态背景显示在对话框后面 */
  .v-modal {
    z-index: 9999 !important;
  }
`;
document.head.appendChild(cookieManagerStyle);
