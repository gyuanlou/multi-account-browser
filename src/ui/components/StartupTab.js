// StartupTab.js - 启动选项标签页组件
const StartupTab = {
  template: `
    <div class="tab-content">
      <el-form label-position="top" :model="localStartup">
        <el-form-item label="起始页面">
          <el-input v-model="localStartup.startUrl" placeholder="输入起始页面 URL"></el-input>
        </el-form-item>
        
        <el-form-item label="窗口大小">
          <el-row :gutter="10">
            <el-col :span="11">
              <el-input-number v-model="localStartup.windowWidth" :min="800" :max="3840" placeholder="宽度"></el-input-number>
            </el-col>
            <el-col :span="2" style="text-align: center;">x</el-col>
            <el-col :span="11">
              <el-input-number v-model="localStartup.windowHeight" :min="600" :max="2160" placeholder="高度"></el-input-number>
            </el-col>
          </el-row>
        </el-form-item>
        
        <el-form-item label="启动选项">
          <el-checkbox v-model="localStartup.incognito">无痕模式</el-checkbox>
          <el-checkbox v-model="localStartup.maximized">最大化窗口</el-checkbox>
          <el-checkbox v-model="localStartup.hideToolbar">隐藏工具栏</el-checkbox>
        </el-form-item>
        
        <el-form-item label="自动关闭">
          <el-switch v-model="localStartup.autoClose" active-text="启用" inactive-text="禁用"></el-switch>
        </el-form-item>
        
        <template v-if="localStartup.autoClose">
          <el-form-item label="自动关闭时间（分钟）">
            <el-input-number v-model="localStartup.autoCloseTime" :min="1" :max="1440" placeholder="关闭时间"></el-input-number>
          </el-form-item>
        </template>
        
        <el-form-item label="额外启动参数">
          <el-input 
            v-model="localStartup.extraArgs" 
            type="textarea" 
            :rows="3" 
            placeholder="每行一个参数，例如：--disable-extensions">
          </el-input>
        </el-form-item>
      </el-form>
    </div>
  `,
  
  props: {
    profile: {
      type: Object,
      required: true
    }
  },
  
  data() {
    return {
      localStartup: {}
    };
  },
  
  watch: {
    localStartup: {
      handler(val) {
        this.$emit('update:profile', { 
          ...this.profile, 
          startup: val 
        });
      },
      deep: true
    },
    'profile.startup': {
      handler(val) {
        this.localStartup = { ...val };
        
        // 确保所有必要的字段都存在
        if (!this.localStartup.startUrl) {
          this.localStartup.startUrl = 'https://www.baidu.com';
        }
        
        if (!this.localStartup.windowWidth) {
          this.localStartup.windowWidth = 1280;
        }
        
        if (!this.localStartup.windowHeight) {
          this.localStartup.windowHeight = 800;
        }
      },
      immediate: true,
      deep: true
    }
  }
};
