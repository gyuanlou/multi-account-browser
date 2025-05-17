// AutomationTab.js - 自动化标签页组件
const AutomationTab = {
  template: `
    <div class="tab-content">
      <el-form label-position="top" :model="localAutomation">
        <el-form-item label="启用自动化">
          <el-switch v-model="localAutomation.enabled" active-text="启用" inactive-text="禁用"></el-switch>
        </el-form-item>
        
        <template v-if="localAutomation.enabled">
          <el-form-item label="自动化类型">
            <el-select v-model="localAutomation.type" style="width: 100%;">
              <el-option label="脚本" value="script"></el-option>
              <el-option label="录制回放" value="record"></el-option>
            </el-select>
          </el-form-item>
          
          <template v-if="localAutomation.type === 'script'">
            <el-form-item label="脚本内容">
              <el-input 
                v-model="localAutomation.script" 
                type="textarea" 
                :rows="15" 
                placeholder="// 输入自动化脚本，使用 JavaScript 语法
// 例如:
(async () => {
  // 等待页面加载
  await page.goto('https://example.com');
  
  // 等待元素出现并点击
  await page.waitForSelector('#login-button');
  await page.click('#login-button');
  
  // 输入文本
  await page.type('#username', 'myusername');
  await page.type('#password', 'mypassword');
  
  // 提交表单
  await page.click('#submit');
  
  // 等待导航完成
  await page.waitForNavigation();
  
  console.log('登录成功!');
})();"
              ></el-input>
            </el-form-item>
            
            <el-form-item label="运行时间">
              <el-radio-group v-model="localAutomation.runTime">
                <el-radio label="startup">浏览器启动时</el-radio>
                <el-radio label="manual">手动运行</el-radio>
                <el-radio label="schedule">定时运行</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <template v-if="localAutomation.runTime === 'schedule'">
              <el-form-item label="定时设置">
                <el-time-picker
                  v-model="localAutomation.scheduleTime"
                  format="HH:mm"
                  placeholder="选择时间">
                </el-time-picker>
              </el-form-item>
              
              <el-form-item label="重复">
                <el-select v-model="localAutomation.repeatDays" multiple placeholder="选择重复日期" style="width: 100%;">
                  <el-option label="周一" value="1"></el-option>
                  <el-option label="周二" value="2"></el-option>
                  <el-option label="周三" value="3"></el-option>
                  <el-option label="周四" value="4"></el-option>
                  <el-option label="周五" value="5"></el-option>
                  <el-option label="周六" value="6"></el-option>
                  <el-option label="周日" value="0"></el-option>
                </el-select>
              </el-form-item>
            </template>
          </template>
          
          <template v-if="localAutomation.type === 'record'">
            <el-form-item label="录制的操作">
              <div v-if="!localAutomation.recordedActions || localAutomation.recordedActions.length === 0" class="empty-record">
                <p>没有录制的操作</p>
                <el-button type="primary" @click="startRecording" :disabled="isRecording">
                  开始录制
                </el-button>
              </div>
              
              <div v-else>
                <el-table :data="localAutomation.recordedActions" style="width: 100%">
                  <el-table-column prop="type" label="操作类型" width="120"></el-table-column>
                  <el-table-column prop="selector" label="选择器" width="180"></el-table-column>
                  <el-table-column prop="value" label="值"></el-table-column>
                  <el-table-column fixed="right" label="操作" width="80">
                    <template #default="scope">
                      <el-button type="danger" size="small" @click="removeAction(scope.$index)">
                        删除
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
                
                <div style="margin-top: 10px;">
                  <el-button type="primary" @click="startRecording" :disabled="isRecording">
                    继续录制
                  </el-button>
                  <el-button type="danger" @click="clearRecording">
                    清空录制
                  </el-button>
                </div>
              </div>
            </el-form-item>
          </template>
          
          <el-form-item>
            <el-button type="success" @click="testAutomation">测试运行</el-button>
          </el-form-item>
        </template>
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
      localAutomation: {},
      isRecording: false
    };
  },
  
  watch: {
    localAutomation: {
      handler(val) {
        this.$emit('update:profile', { 
          ...this.profile, 
          automation: val 
        });
      },
      deep: true
    },
    'profile.automation': {
      handler(val) {
        this.localAutomation = { ...val };
        
        // 确保所有必要的字段都存在
        if (!this.localAutomation.type) {
          this.localAutomation.type = 'script';
        }
        
        if (!this.localAutomation.runTime) {
          this.localAutomation.runTime = 'manual';
        }
        
        if (!this.localAutomation.recordedActions) {
          this.localAutomation.recordedActions = [];
        }
      },
      immediate: true,
      deep: true
    }
  },
  
  methods: {
    startRecording() {
      this.isRecording = true;
      this.$message.info('请启动浏览器实例并开始操作。系统将记录您的操作。');
      
      // 通知主进程开始录制
      window.ipcRenderer.invoke('start-recording', this.profile.id)
        .then(result => {
          if (result.success) {
            // 录制成功后，更新录制的操作
            if (!this.localAutomation.recordedActions) {
              this.localAutomation.recordedActions = [];
            }
            
            this.localAutomation.recordedActions = [
              ...this.localAutomation.recordedActions,
              ...result.actions
            ];
            
            this.$message.success('录制完成！');
          } else {
            this.$message.error('录制失败: ' + result.error);
          }
          this.isRecording = false;
        })
        .catch(error => {
          this.$message.error('录制出错: ' + error.message);
          this.isRecording = false;
        });
    },
    
    removeAction(index) {
      this.localAutomation.recordedActions.splice(index, 1);
    },
    
    clearRecording() {
      this.$confirm('确定要清空所有录制的操作吗？', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.localAutomation.recordedActions = [];
        this.$message.success('已清空录制的操作');
      }).catch(() => {
        // 用户取消
      });
    },
    
    testAutomation() {
      if (!this.localAutomation.enabled) {
        this.$message.warning('请先启用自动化');
        return;
      }
      
      if (this.localAutomation.type === 'script' && !this.localAutomation.script) {
        this.$message.warning('脚本内容不能为空');
        return;
      }
      
      if (this.localAutomation.type === 'record' && 
          (!this.localAutomation.recordedActions || this.localAutomation.recordedActions.length === 0)) {
        this.$message.warning('没有录制的操作');
        return;
      }
      
      this.$confirm('确定要测试运行此自动化脚本吗？将会启动新的浏览器实例。', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }).then(() => {
        // 通知主进程测试运行自动化脚本
        window.ipcRenderer.invoke('test-automation', {
          profileId: this.profile.id,
          automation: this.localAutomation
        }).then(result => {
          if (result.success) {
            this.$message.success('自动化脚本运行成功');
          } else {
            this.$message.error('自动化脚本运行失败: ' + result.error);
          }
        }).catch(error => {
          this.$message.error('运行出错: ' + error.message);
        });
      }).catch(() => {
        // 用户取消
      });
    }
  }
};
