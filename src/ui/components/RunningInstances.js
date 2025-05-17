// RunningInstances.js - 运行实例组件
const RunningInstances = {
  template: `
    <div>
      <div class="page-header">
        <h2>浏览器实例</h2>
        <el-button type="primary" @click="showLaunchDialog">
          <el-icon><plus /></el-icon> 启动新实例
        </el-button>
      </div>
      
      <div v-if="instances.length === 0" class="empty-state">
        <el-empty description="没有运行中的浏览器实例"></el-empty>
      </div>
      
      <div v-else class="instances-container">
        <instance-card 
          v-for="instance in instances" 
          :key="instance.profileId"
          :instance="instance"
          :profile="getProfileById(instance.profileId)"
          @close="closeBrowser">
        </instance-card>
      </div>
      
      <!-- 启动新实例对话框 -->
      <el-dialog
        title="启动浏览器实例"
        v-model="launchDialogVisible"
        width="500px">
        <el-form label-position="top">
          <el-form-item label="选择配置">
            <el-select v-model="selectedProfileId" placeholder="选择配置文件" style="width: 100%;">
              <el-option 
                v-for="profile in profiles" 
                :key="profile.id" 
                :label="profile.name" 
                :value="profile.id">
              </el-option>
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="launchDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="launchBrowser" :disabled="!selectedProfileId">
              启动
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  `,
  
  props: {
    instances: {
      type: Array,
      required: true
    },
    profiles: {
      type: Array,
      required: true
    }
  },
  
  data() {
    return {
      launchDialogVisible: false,
      selectedProfileId: null
    };
  },
  
  methods: {
    getProfileById(profileId) {
      return this.profiles.find(p => p.id === profileId) || {};
    },
    
    showLaunchDialog() {
      this.launchDialogVisible = true;
      this.selectedProfileId = this.profiles.length > 0 ? this.profiles[0].id : null;
    },
    
    launchBrowser() {
      if (this.selectedProfileId) {
        this.$emit('launch-browser', this.selectedProfileId);
        this.launchDialogVisible = false;
      }
    },
    
    closeBrowser(profileId) {
      this.$emit('close-browser', profileId);
    }
  }
};
