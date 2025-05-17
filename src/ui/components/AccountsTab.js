// AccountsTab.js - 账号密码标签页组件
const AccountsTab = {
  template: `
    <div class="tab-content">
      <div class="section-header">
        <h3>账号管理</h3>
        <p class="section-description">管理保存的账号和密码，用于自动填充网站登录表单</p>
      </div>

      <el-form label-position="top" :model="localProfile">
        <div class="accounts-list">
          <div v-if="localProfile.accounts && localProfile.accounts.length > 0">
            <div v-for="(account, index) in localProfile.accounts" :key="index" class="account-item">
              <el-card shadow="hover">
                <div class="account-header">
                  <h4>{{ account.website || '未命名网站' }}</h4>
                  <div class="account-actions">
                    <el-button type="danger" size="small" icon="el-icon-delete" circle @click="removeAccount(index)"></el-button>
                  </div>
                </div>
                
                <el-form-item label="网站">
                  <el-input v-model="account.website" placeholder="网站域名，例如: example.com"></el-input>
                </el-form-item>
                
                <el-form-item label="用户名/邮箱">
                  <el-input v-model="account.username" placeholder="用户名或邮箱"></el-input>
                </el-form-item>
                
                <el-form-item label="密码">
                  <el-input v-model="account.password" type="password" placeholder="密码" show-password></el-input>
                </el-form-item>
                
                <el-form-item label="备注">
                  <el-input v-model="account.notes" type="textarea" :rows="2" placeholder="可选，添加备注信息"></el-input>
                </el-form-item>
              </el-card>
            </div>
          </div>
          
          <el-empty v-else description="暂无保存的账号"></el-empty>
          
          <div class="add-account">
            <el-button type="primary" @click="addAccount">添加新账号</el-button>
          </div>
        </div>
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
    // 深拷贝配置
    const profile = JSON.parse(JSON.stringify(this.profile));
    
    // 确保 accounts 字段存在
    if (!profile.accounts) {
      profile.accounts = [];
    }
    
    return {
      localProfile: profile
    };
  },
  
  watch: {
    profile: {
      handler(newProfile) {
        this.localProfile = JSON.parse(JSON.stringify(newProfile));
        // 确保 accounts 字段存在
        if (!this.localProfile.accounts) {
          this.localProfile.accounts = [];
        }
      },
      deep: true
    },
    'localProfile.accounts': {
      handler(val) {
        console.log('账号列表已更新:', val);
        this.$emit('update:profile', this.localProfile);
      },
      deep: true
    }
  },
  
  methods: {
    addAccount() {
      if (!this.localProfile.accounts) {
        this.localProfile.accounts = [];
      }
      
      this.localProfile.accounts.push({
        website: '',
        username: '',
        password: '',
        notes: ''
      });
    },
    
    removeAccount(index) {
      this.$confirm('确定要删除这个账号吗？此操作不可恢复。', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.localProfile.accounts.splice(index, 1);
      }).catch(() => {
        // 取消删除
      });
    }
  }
};
