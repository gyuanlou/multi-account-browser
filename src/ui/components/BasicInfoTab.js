// BasicInfoTab.js - 基本信息标签页组件
const BasicInfoTab = {
  template: `
    <div class="tab-content">
      <el-form label-position="top" :model="localProfile">
        <el-form-item label="配置名称">
          <el-input v-model="localProfile.name" placeholder="请输入配置名称"></el-input>
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input 
            v-model="localProfile.notes" 
            type="textarea" 
            :rows="3" 
            placeholder="可选，添加备注信息">
          </el-input>
        </el-form-item>
        
        <el-form-item label="标签">
          <el-tag
            v-for="tag in localProfile.tags"
            :key="tag"
            closable
            @close="removeTag(tag)"
            style="margin-right: 5px; margin-bottom: 5px;">
            {{ tag }}
          </el-tag>
          <el-input
            v-if="inputTagVisible"
            ref="tagInput"
            v-model="inputTagValue"
            size="small"
            style="width: 100px"
            @keyup.enter="addTag"
            @blur="addTag">
          </el-input>
          <el-button v-else size="small" @click="showTagInput">+ 添加标签</el-button>
        </el-form-item>
        
        <el-form-item v-if="localProfile.createdAt">
          <template #label>
            <div>创建时间</div>
          </template>
          <div>{{ formatDate(localProfile.createdAt) }}</div>
        </el-form-item>
        
        <el-form-item v-if="localProfile.updatedAt">
          <template #label>
            <div>最后更新</div>
          </template>
          <div>{{ formatDate(localProfile.updatedAt) }}</div>
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
      localProfile: { ...this.profile },
      inputTagVisible: false,
      inputTagValue: ''
    };
  },
  
  watch: {
    'localProfile.name': function(val) {
      console.log('配置名称已更新:', val);
      this.$emit('update:profile', this.localProfile);
    },
    'localProfile.notes': function(val) {
      console.log('备注已更斴:', val);
      this.$emit('update:profile', this.localProfile);
    },
    'localProfile.tags': {
      handler(val) {
        console.log('标签已更新:', val);
        this.$emit('update:profile', this.localProfile);
      },
      deep: true
    },
    profile: {
      handler(val) {
        this.localProfile = { ...val };
        // 确保 tags 属性存在
        if (!this.localProfile.tags) {
          this.localProfile.tags = [];
        }
      },
      immediate: true,
      deep: true
    }
  },
  
  methods: {
    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString();
    },
    
    showTagInput() {
      this.inputTagVisible = true;
      this.$nextTick(() => {
        this.$refs.tagInput.focus();
      });
    },
    
    addTag() {
      if (this.inputTagValue) {
        if (!this.localProfile.tags) {
          this.localProfile.tags = [];
        }
        if (!this.localProfile.tags.includes(this.inputTagValue)) {
          this.localProfile.tags.push(this.inputTagValue);
        }
      }
      this.inputTagVisible = false;
      this.inputTagValue = '';
    },
    
    removeTag(tag) {
      this.localProfile.tags = this.localProfile.tags.filter(t => t !== tag);
    }
  }
};
