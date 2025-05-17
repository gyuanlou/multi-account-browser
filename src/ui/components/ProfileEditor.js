// ProfileEditor.js - 配置编辑器组件
const ProfileEditor = {
  template: `
    <div class="form-container">
      <h2>{{ isNewProfile ? '创建新配置' : '编辑配置' }}</h2>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <basic-info-tab 
            :profile="localProfile" 
            @update:profile="updateProfile">
          </basic-info-tab>
        </el-tab-pane>
        
        <el-tab-pane label="账号密码" name="accounts">
          <accounts-tab 
            :profile="localProfile" 
            @update:profile="updateProfile">
          </accounts-tab>
        </el-tab-pane>
        
        <el-tab-pane label="指纹设置" name="fingerprint">
          <fingerprint-tab 
            :profile="localProfile" 
            @update:profile="updateProfile">
          </fingerprint-tab>
        </el-tab-pane>
        
        <el-tab-pane label="代理设置" name="proxy">
          <proxy-tab 
            :profile="localProfile" 
            @update:profile="updateProfile">
          </proxy-tab>
        </el-tab-pane>
        
        <el-tab-pane label="地理位置" name="geolocation">
          <geo-location-tab 
            :profile="localProfile" 
            @update:profile="updateProfile">
          </geo-location-tab>
        </el-tab-pane>
        
        <el-tab-pane label="启动选项" name="startup">
          <startup-tab 
            :profile="localProfile" 
            @update:profile="updateProfile">
          </startup-tab>
        </el-tab-pane>
      </el-tabs>
      
      <div class="form-actions">
        <div>
          <el-button @click="resetChanges">重置</el-button>
          <el-button type="success" @click="exportProfile" v-if="!isNewProfile">导出配置</el-button>
        </div>
        <div>
          <el-button type="primary" @click="saveProfile">保存</el-button>
        </div>
      </div>
    </div>
  `,
  
  props: {
    profile: {
      type: Object,
      required: true
    }
  },
  
  data() {
    // 深拷贝配置
    const profile = JSON.parse(JSON.stringify(this.profile));
    
    // 确保 tags 字段存在
    if (!profile.tags) {
      profile.tags = [];
    }
    
    return {
      localProfile: profile,
      activeTab: 'basic'
    };
  },
  
  computed: {
    isNewProfile() {
      return !this.profile.id;
    }
  },
  
  watch: {
    profile: {
      handler(newProfile) {
        this.localProfile = JSON.parse(JSON.stringify(newProfile));
        // 确保 tags 字段存在
        if (!this.localProfile.tags) {
          this.localProfile.tags = [];
        }
      },
      deep: true
    }
  },
  
  methods: {
    updateProfile(updatedProfile) {
      console.log('更新配置文件:', updatedProfile);
      // 使用深度比较，只有当值真正变化时才更新
      const newProfile = { ...this.localProfile };
      
      // 只更新传入的字段
      for (const key in updatedProfile) {
        if (JSON.stringify(newProfile[key]) !== JSON.stringify(updatedProfile[key])) {
          newProfile[key] = updatedProfile[key];
        }
      }
      
      // 只有在实际发生变化时才更新
      if (JSON.stringify(newProfile) !== JSON.stringify(this.localProfile)) {
        console.log('配置文件已更新');
        this.localProfile = newProfile;
      } else {
        console.log('配置文件未发生变化，跳过更新');
      }
    },
    
    saveProfile() {
      this.$emit('save', this.localProfile);
    },
    
    resetChanges() {
      this.localProfile = JSON.parse(JSON.stringify(this.profile));
    },
    
    confirmDelete() {
      this.$confirm('确定要删除这个配置吗？此操作不可恢复。', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$emit('delete', this.profile.id);
      }).catch(() => {
        // 取消删除
      });
    },
    
    exportProfile() {
      try {
        // 创建一个干净的对象用于导出
        const profileData = JSON.parse(JSON.stringify(this.localProfile));
        
        // 确保必要的字段存在
        if (!profileData.tags) profileData.tags = [];
        if (!profileData.notes) profileData.notes = '';
        if (!profileData.accounts) profileData.accounts = [];
        if (!profileData.cookies) profileData.cookies = [];
        if (!profileData.proxy) profileData.proxy = { enabled: false, type: 'http', host: '', port: 8080 };
        if (!profileData.fingerprint) profileData.fingerprint = {};
        if (!profileData.geoLocation) profileData.geoLocation = { enabled: false, country: 'CN', city: '北京', timezone: 'Asia/Shanghai' };
        if (!profileData.startup) profileData.startup = { startUrl: 'https://www.baidu.com', windowWidth: 1280, windowHeight: 800 };
        if (!profileData.automation) profileData.automation = { enabled: false, type: 'script', script: '' };
        
        // 创建一个 Blob 对象
        const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: 'application/json' });
        
        // 创建一个下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.localProfile.name || 'profile'}_${new Date().toISOString().slice(0, 10)}.json`;
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
        
        console.log('导出的配置数据:', profileData);
        this.$message.success('配置导出成功');
      } catch (error) {
        console.error('导出配置失败:', error);
        this.$message.error('导出配置失败: ' + error.message);
      }
    }
  }
};
