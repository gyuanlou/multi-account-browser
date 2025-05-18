// InstanceCard.js - 实例卡片组件
const InstanceCard = {
  template: `
    <div class="instance-card">
      <div class="instance-header">
        <h3>{{ profile.name || '未知配置' }}</h3>
        <el-tag :type="statusType">{{ statusText }}</el-tag>
      </div>
      
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="启动时间">{{ formatDate(instance.startTime) }}</el-descriptions-item>
        <el-descriptions-item label="代理设置" v-if="profile.proxy">
          {{ profile.proxy.enabled ? profile.proxy.host + ':' + profile.proxy.port : '直连' }}
        </el-descriptions-item>
        <el-descriptions-item label="地理位置" v-if="profile.geoLocation">
          {{ getLocationText() }}
        </el-descriptions-item>
      </el-descriptions>
      
      <div class="instance-actions">
        <el-button type="danger" size="small" @click="confirmClose">
          关闭
        </el-button>
        <el-button type="primary" size="small" @click="openDevTools">
          开发工具
        </el-button>
        <el-button size="small" @click="captureScreenshot">
          截图
        </el-button>
      </div>
    </div>
  `,
  
  props: {
    instance: {
      type: Object,
      required: true
    },
    profile: {
      type: Object,
      required: true
    }
  },
  
  computed: {
    statusType() {
      switch (this.instance.status) {
        case window.INSTANCE_STATUS.RUNNING:
          return 'success';
        case window.INSTANCE_STATUS.STARTING:
          return 'warning';
        case window.INSTANCE_STATUS.CLOSED:
          return 'danger';
        case window.INSTANCE_STATUS.ERROR:
          return 'danger';
        case window.INSTANCE_STATUS.CLOSING:
          return 'warning';
        default:
          return 'info';
      }
    },
    
    statusText() {
      switch (this.instance.status) {
        case window.INSTANCE_STATUS.RUNNING:
          return '运行中';
        case window.INSTANCE_STATUS.STARTING:
          return '启动中';
        case window.INSTANCE_STATUS.CLOSING:
          return '关闭中';
        case window.INSTANCE_STATUS.CLOSED:
          return '已关闭';
        case window.INSTANCE_STATUS.ERROR:
          return '错误';
        default:
          return '未知状态';
      }
    }
  },
  
  methods: {
    formatDate(dateString) {
      if (!dateString) return '未知';
      const date = new Date(dateString);
      return date.toLocaleString();
    },
    
    getLocationText() {
      const geo = this.profile.geoLocation;
      if (!geo) return '未设置';
      
      if (geo.autoFromProxy) {
        return '自动 (根据代理)';
      }
      
      return `${geo.country || ''} ${geo.city || ''}`;
    },
    
    confirmClose() {
      this.$confirm('确定要关闭这个浏览器实例吗？', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.$emit('close', this.instance.profileId);
      }).catch(() => {
        // 取消关闭
      });
    },
    
    async openDevTools() {
      try {
        await window.ipcRenderer.invoke('open-dev-tools', this.instance.profileId);
      } catch (error) {
        this.$message.error('打开开发工具失败: ' + error.message);
      }
    },
    
    async captureScreenshot() {
      try {
        const result = await window.ipcRenderer.invoke('capture-screenshot', this.instance.profileId);
        if (result.success) {
          this.$message.success('截图已保存: ' + result.path);
        } else if (result.canceled) {
          // 用户取消了截图，不显示错误信息
          console.log('用户取消了截图');
        } else {
          this.$message.error('截图失败: ' + result.error);
        }
      } catch (error) {
        this.$message.error('截图失败: ' + error.message);
      }
    }
  }
};
