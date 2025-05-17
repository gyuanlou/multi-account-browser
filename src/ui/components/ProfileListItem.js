// ProfileListItem.js - 配置列表项组件
const ProfileListItem = {
  template: `
    <el-menu-item :index="profile.id" :class="{'profile-active': isRunning}">
      <div class="profile-item" style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold; flex: 1;">{{ profile.name }}</span>
        <div class="profile-actions" style="display: flex; gap: 8px; align-items: center;">
          <el-tag size="small" :type="isProxyEnabled ? 'success' : 'info'">
            {{ isProxyEnabled ? '代理' : '直连' }}
          </el-tag>
          <!-- 根据实例状态显示不同的按钮 -->
          <el-button 
            v-if="!isRunning"
            type="success" 
            size="small" 
            style="font-weight: bold; min-width: 70px; margin-right: 5px;"
            class="action-btn launch-btn"
            title="启动浏览器实例"
            @click.stop="launchBrowser"
          >
            <el-icon style="margin-right: 4px;"><video-play /></el-icon>
            启动
          </el-button>
          <el-button 
            v-else
            type="danger" 
            size="small" 
            style="font-weight: bold; min-width: 70px; margin-right: 5px;"
            class="action-btn stop-btn"
            title="关闭浏览器实例"
            @click.stop="closeBrowser"
          >
            <el-icon style="margin-right: 4px;"><video-pause /></el-icon>
            停止
          </el-button>
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
    },
    isRunning: {
      type: Boolean,
      default: false
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
    },
    
    closeBrowser() {
      console.log('关闭浏览器实例:', this.profile.id);
      this.$emit('close', this.profile.id);
    }
  }
};
