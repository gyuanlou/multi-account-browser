// ProfileListItem.js - 配置列表项组件
const ProfileListItem = {
  template: `
    <el-menu-item :index="profile.id">
      <div class="profile-item">
        <span>{{ profile.name }}</span>
        <div class="profile-actions">
          <el-tag size="small" :type="isProxyEnabled ? 'success' : 'info'">
            {{ isProxyEnabled ? '代理' : '直连' }}
          </el-tag>
          <el-button 
            type="primary" 
            size="small" 
            icon="VideoPlay"
            circle
            class="action-btn launch-btn"
            title="启动浏览器实例"
            @click.stop="launchBrowser"
          ></el-button>
          <el-button 
            type="danger" 
            size="small" 
            icon="Delete"
            circle
            class="action-btn delete-btn"
            title="删除配置"
            @click.stop="confirmDelete"
          ></el-button>
        </div>
      </div>
    </el-menu-item>
  `,
  
  props: {
    profile: {
      type: Object,
      required: true
    }
  },
  
  computed: {
    isProxyEnabled() {
      // 使用计算属性确保代理状态变化能被正确检测
      return this.profile && this.profile.proxy && this.profile.proxy.enabled === true;
    }
  },
  
  methods: {
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
    
    launchBrowser() {
      console.log('启动浏览器实例:', this.profile.id);
      this.$emit('launch', this.profile.id);
    }
  }
};
