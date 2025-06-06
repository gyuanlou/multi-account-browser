// AutomationPage.js - 自动化任务管理页面
const AutomationPage = {
  template: `
    <div class="automation-page">
      <h2>自动化任务管理</h2>
      
      <div class="automation-actions">
        <el-button type="primary" @click="createNewTask">
          <i class="el-icon-plus"></i> 新建任务
        </el-button>
        
        <el-input
          placeholder="搜索任务..."
          v-model="searchQuery"
          class="search-input"
          prefix-icon="el-icon-search"
          clearable>
        </el-input>
      </div>
      
      <!-- 任务列表 -->
      <div class="task-list" v-if="filteredTasks.length > 0">
        <el-card v-for="task in filteredTasks" :key="task.id" class="task-card">
          <div class="task-header">
            <div class="task-title">
              <h3>{{ task.name }}</h3>
              <el-tag :type="getStatusTagType(task.status)">{{ getStatusText(task.status) }}</el-tag>
            </div>
            
            <div class="task-actions">
              <!-- 单独的按钮，不使用按钮组 -->
              <div class="action-buttons">
                <el-tooltip content="运行任务" placement="top" :open-delay="500">
                  <el-button 
                    type="primary"
                    circle
                    :disabled="['running', 'pending'].includes(task.status)"
                    @click="runTask(task.id)">
                    <i class="el-icon-video-play"></i>
                  </el-button>
                </el-tooltip>
                
                <el-tooltip content="停止任务" placement="top" :open-delay="500">
                  <el-button 
                    type="warning" 
                    circle
                    :disabled="!['running', 'pending'].includes(task.status)"
                    @click="stopTask(task.id)">
                    <i class="el-icon-video-pause"></i>
                  </el-button>
                </el-tooltip>
                
                <el-tooltip content="编辑任务" placement="top" :open-delay="500">
                  <el-button 
                    type="info"
                    circle
                    @click="editTask(task)">
                    <i class="el-icon-edit"></i>
                  </el-button>
                </el-tooltip>
                
                <el-tooltip content="删除任务" placement="top" :open-delay="500">
                  <el-button 
                    type="danger" 
                    circle
                    @click="deleteTask(task.id)">
                    <i class="el-icon-delete"></i>
                  </el-button>
                </el-tooltip>
              </div>
            </div>
          </div>
          
          <div class="task-info">
            <div class="task-detail">
              <div class="detail-label">配置文件:</div>
              <div class="detail-value">{{ getProfileName(task.profileId) }}</div>
            </div>
            
            <div class="task-detail">
              <div class="detail-label">执行计划:</div>
              <div class="detail-value">{{ getScheduleText(task) }}</div>
            </div>
            
            <div class="task-detail">
              <div class="detail-label">上次执行:</div>
              <div class="detail-value">{{ task.lastRun ? formatDate(task.lastRun) : '从未' }}</div>
            </div>
            
            <div class="task-detail">
              <div class="detail-label">下次执行:</div>
              <div class="detail-value">{{ task.nextRun ? formatDate(task.nextRun) : '未计划' }}</div>
            </div>
          </div>
          
          <div class="task-description" v-if="task.description">
            {{ task.description }}
          </div>
          
          <div class="task-logs" v-if="task.status === 'running' || task.lastLog">
            <div class="log-header">
              <div>执行日志</div>
              <el-button size="small" type="text" @click="viewFullLog(task.id)">查看完整日志</el-button>
            </div>
            <pre class="log-content">{{ task.lastLog || '任务执行中...' }}</pre>
          </div>
        </el-card>
      </div>
      
      <el-empty v-else description="暂无自动化任务，点击'新建任务'按钮创建"></el-empty>
      
      <!-- 任务编辑对话框 -->
      <div v-if="dialogVisible" class="custom-dialog-wrapper">
        <div class="custom-dialog">
          <div class="custom-dialog-header">
            <h3>{{ isEditMode ? '编辑任务' : '新建任务' }}</h3>
            <button class="close-btn" @click="dialogVisible = false">×</button>
          </div>
        <el-form :model="currentTask" label-position="top" ref="taskForm" :rules="rules">
          <el-form-item label="任务名称" prop="name">
            <el-input v-model="currentTask.name" placeholder="输入任务名称"></el-input>
          </el-form-item>
          
          <el-form-item label="描述">
            <el-input 
              type="textarea" 
              v-model="currentTask.description" 
              placeholder="任务描述（可选）"
              :rows="2">
            </el-input>
          </el-form-item>
          
          <el-form-item label="选择配置文件" prop="profileId">
            <el-select v-model="currentTask.profileId" placeholder="选择配置文件" style="width: 100%;">
              <el-option 
                v-for="profile in profiles" 
                :key="profile.id" 
                :label="profile.name" 
                :value="profile.id">
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="任务类型" prop="type">
            <el-radio-group v-model="currentTask.type">
              <el-radio label="script">脚本</el-radio>
              <el-radio label="url">访问网址</el-radio>
              <el-radio label="command">浏览器命令</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item v-if="currentTask.type === 'script'" label="脚本内容" prop="script">
            <el-input 
              type="textarea" 
              v-model="currentTask.script" 
              placeholder="输入 JavaScript 脚本代码"
              :rows="8">
            </el-input>
            <div class="setting-description">
              脚本将在浏览器中执行，可以使用 Playwright API 进行自动化操作
            </div>
          </el-form-item>
          
          <el-form-item v-if="currentTask.type === 'url'" label="访问网址" prop="url">
            <el-input v-model="currentTask.url" placeholder="输入要访问的网址"></el-input>
          </el-form-item>
          
          <el-form-item v-if="currentTask.type === 'command'" label="浏览器命令" prop="command">
            <el-select v-model="currentTask.command" placeholder="选择浏览器命令" style="width: 100%;">
              <el-option label="刷新 Cookie" value="refreshCookies"></el-option>
              <el-option label="清除缓存" value="clearCache"></el-option>
              <el-option label="清除本地存储" value="clearLocalStorage"></el-option>
              <el-option label="更新指纹" value="updateFingerprint"></el-option>
              <el-option label="截图" value="takeScreenshot"></el-option>
            </el-select>
          </el-form-item>
          
          <el-divider></el-divider>
          
          <el-form-item label="执行计划" prop="runTime">
            <el-radio-group v-model="currentTask.runTime">
              <el-radio label="manual">手动执行</el-radio>
              <el-radio label="startup">启动时执行</el-radio>
              <el-radio label="schedule">定时执行</el-radio>
              <el-radio label="interval">间隔执行</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item v-if="currentTask.runTime === 'schedule'" label="执行时间" prop="scheduleTime">
            <el-time-picker
              v-model="currentTask.scheduleTime"
              placeholder="选择时间"
              format="HH:mm"
              style="width: 100%;">
            </el-time-picker>
          </el-form-item>
          
          <el-form-item v-if="currentTask.runTime === 'schedule'" label="执行日期">
            <el-checkbox-group v-model="currentTask.repeatDays">
              <el-checkbox label="0">周日</el-checkbox>
              <el-checkbox label="1">周一</el-checkbox>
              <el-checkbox label="2">周二</el-checkbox>
              <el-checkbox label="3">周三</el-checkbox>
              <el-checkbox label="4">周四</el-checkbox>
              <el-checkbox label="5">周五</el-checkbox>
              <el-checkbox label="6">周六</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          
          <el-form-item v-if="currentTask.runTime === 'interval'" label="执行间隔（分钟）" prop="intervalMinutes">
            <el-input-number
              v-model="currentTask.intervalMinutes"
              :min="1"
              :max="1440"
              style="width: 100%;">
            </el-input-number>
          </el-form-item>
          
          <el-form-item label="高级选项">
            <el-checkbox v-model="currentTask.closeAfterComplete">
              执行完成后关闭浏览器
            </el-checkbox>
          </el-form-item>
        </el-form>
        
        <div class="custom-dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveTask" :loading="saving">保存</el-button>
        </div>
      </div>
    </div>
      
      <!-- 日志查看对话框 -->
      <el-dialog
        title="任务执行日志"
        :visible.sync="logDialogVisible"
        width="80%"
        :close-on-click-modal="false">
        <div class="log-toolbar">
          <div class="log-info" v-if="currentTaskId">
            <span>任务名称: {{ getCurrentTaskName() }}</span>
            <span>状态: <el-tag size="small" :type="getStatusTagType(getCurrentTaskStatus())">{{ getStatusText(getCurrentTaskStatus()) }}</el-tag></span>
          </div>
          <div class="log-actions">
            <el-tooltip content="刷新日志" placement="top">
              <el-button size="small" icon="el-icon-refresh" circle @click="refreshLog"></el-button>
            </el-tooltip>
            <el-tooltip content="复制日志" placement="top">
              <el-button size="small" icon="el-icon-document-copy" circle @click="copyLog"></el-button>
            </el-tooltip>
            <el-tooltip content="下载日志" placement="top">
              <el-button size="small" icon="el-icon-download" circle @click="downloadLog"></el-button>
            </el-tooltip>
            <el-tooltip content="清空日志" placement="top">
              <el-button size="small" icon="el-icon-delete" circle @click="clearLog"></el-button>
            </el-tooltip>
          </div>
        </div>
        <div class="log-container">
          <pre class="full-log-content" ref="logContent">{{ currentTaskLog }}</pre>
        </div>
        <div class="log-footer">
          <el-checkbox v-model="autoRefreshLog">自动刷新日志</el-checkbox>
          <span class="log-timestamp">最后更新: {{ lastLogUpdateTime }}</span>
        </div>
      </el-dialog>
    </div>
  `,
  
  data() {
    return {
      tasks: [],
      profiles: [],
      searchQuery: '',
      dialogVisible: false,
      logDialogVisible: false,
      isEditMode: false,
      saving: false,
      currentTask: this.getDefaultTask(),
      currentTaskId: null,
      currentTaskLog: '',
      autoRefreshLog: false,
      logRefreshInterval: null,
      lastLogUpdateTime: '未更新',
      rules: {
        name: [
          { required: true, message: '请输入任务名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        profileId: [
          { required: true, message: '请选择配置文件', trigger: 'change' }
        ],
        script: [
          { required: true, message: '请输入脚本内容', trigger: 'blur' }
        ],
        url: [
          { required: true, message: '请输入网址', trigger: 'blur' },
          { type: 'url', message: '请输入正确的网址', trigger: 'blur' }
        ],
        command: [
          { required: true, message: '请选择浏览器命令', trigger: 'change' }
        ],
        scheduleTime: [
          { required: true, message: '请选择执行时间', trigger: 'change' }
        ],
        intervalMinutes: [
          { required: true, message: '请输入执行间隔', trigger: 'change' },
          { type: 'number', min: 1, message: '间隔必须大于0', trigger: 'change' }
        ]
      }
    };
  },
  
  computed: {
    filteredTasks() {
      // 确保任务列表存在且是数组
      if (!this.tasks || !Array.isArray(this.tasks)) {
        return [];
      }
      
      // 先过滤掉无效的任务
      const validTasks = this.tasks.filter(task => task && task.id);
      
      if (!this.searchQuery) {
        return validTasks;
      }
      
      const query = this.searchQuery.toLowerCase();
      return validTasks.filter(task => {
        return task.name && task.name.toLowerCase().includes(query) || 
               (task.description && task.description.toLowerCase().includes(query));
      });
    }
  },
  
  created() {
    // 加载任务列表
    this.loadTasks();
    
    // 加载配置文件列表
    this.loadProfiles();
    
    // 设置定时刷新任务状态
    this.statusRefreshInterval = setInterval(() => {
      this.refreshTaskStatus();
    }, 5000); // 每5秒刷新一次
  },
  
  beforeDestroy() {
    // 清除定时器
    if (this.statusRefreshInterval) {
      clearInterval(this.statusRefreshInterval);
    }
    // 清除日志刷新定时器
    this.stopLogRefreshTimer();
  },
  
  watch: {
    // 监听日志对话框的打开和关闭
    logDialogVisible(newVal) {
      if (newVal) {
        // 对话框打开时，如果自动刷新已启用，则启动定时器
        if (this.autoRefreshLog) {
          this.startLogRefreshTimer();
        }
      } else {
        // 对话框关闭时，清除定时器
        this.stopLogRefreshTimer();
      }
    },
    
    // 监听自动刷新选项的变化
    autoRefreshLog(newVal) {
      if (newVal && this.logDialogVisible) {
        this.startLogRefreshTimer();
      } else {
        this.stopLogRefreshTimer();
      }
    }
  },
  
  methods: {
    getDefaultTask() {
      return {
        name: '',
        description: '',
        profileId: '',
        type: 'script',
        script: '',
        url: '',
        command: '',
        runTime: 'manual',
        scheduleTime: null,
        repeatDays: ['1', '2', '3', '4', '5'], // 默认周一到周五
        intervalMinutes: 60,
        closeAfterComplete: true,
        status: 'idle',
        lastRun: null,
        nextRun: null,
        lastLog: ''
      };
    },
    
    async loadTasks() {
      try {
        const tasks = await window.ipcRenderer.invoke('get-automation-tasks');
        this.tasks = tasks;
      } catch (error) {
        this.$message.error('加载任务失败: ' + error.message);
      }
    },
    
    async loadProfiles() {
      try {
        const profiles = await window.ipcRenderer.invoke('get-profiles');
        this.profiles = profiles;
      } catch (error) {
        this.$message.error('加载配置文件失败: ' + error.message);
      }
    },
    
    async refreshTaskStatus() {
      try {
        // 确保任务列表存在
        if (!this.tasks || !Array.isArray(this.tasks)) {
          return;
        }
        
        // 刷新所有需要更新状态的任务
        for (let i = 0; i < this.tasks.length; i++) {
          const task = this.tasks[i];
          
          // 确保任务存在且有效
          if (!task || !task.id) {
            continue;
          }
          
          // 对于正在运行、等待中或停止中的任务，需要获取最新状态
          if (['running', 'pending', 'stopping'].includes(task.status)) {
            try {
              const status = await window.ipcRenderer.invoke('get-task-status', task.id);
              
              if (status) {
                // 更新任务状态和日志
                const oldStatus = task.status;
                task.status = status.status;
                task.lastLog = status.lastLog || task.lastLog;
                
                // 如果状态发生变化，使用 Vue 的 $set 确保响应式更新
                if (oldStatus !== status.status) {
                  // Vue 3 不需要 $set
                  // 强制触发响应式更新
                  this.tasks = [...this.tasks];
                }
                
                // 如果任务完成或失败，更新下次运行时间
                if (status.status === 'completed' || status.status === 'failed' || status.status === 'stopped') {
                  task.lastRun = new Date();
                  
                  // 更新下次运行时间
                  if (task.runTime === 'interval') {
                    const nextRun = new Date();
                    nextRun.setMinutes(nextRun.getMinutes() + task.intervalMinutes);
                    task.nextRun = nextRun;
                    // Vue 3 不需要 $set
                  // 强制触发响应式更新
                  this.tasks = [...this.tasks];
                  } else if (task.runTime === 'schedule') {
                    task.nextRun = this.calculateNextScheduledRun(task);
                    // Vue 3 不需要 $set
                  // 强制触发响应式更新
                  this.tasks = [...this.tasks];
                  }
                }
              } else {
                // 如果没有状态信息，但任务状态为 running，说明任务可能已经停止
                if (task.status === 'running' || task.status === 'pending') {
                  task.status = 'stopped';
                  // Vue 3 不需要 $set
                  // 强制触发响应式更新
                  this.tasks = [...this.tasks];
                }
              }
            } catch (taskError) {
              console.error(`刷新任务 ${task.id} 状态失败:`, taskError);
              // 如果获取状态失败，将任务标记为停止
              if (task.status === 'running' || task.status === 'pending' || task.status === 'stopping') {
                task.status = 'stopped';
                this.$set(this.tasks, i, { ...task });
              }
            }
          }
        }
      } catch (error) {
        console.error('刷新任务状态失败:', error);
      }
    },
    
    createNewTask() {
      this.isEditMode = false;
      this.currentTask = {
        name: '',
        description: '',
        profileId: '',
        type: 'script',
        script: '',
        url: '',
        command: '',
        runTime: 'manual',
        scheduleTime: null,
        repeatDays: ['1', '2', '3', '4', '5'],
        intervalMinutes: 60,
        closeAfterComplete: true,
        status: 'idle',
        lastRun: null,
        nextRun: null,
        lastLog: ''
      };
      this.dialogVisible = true;
    },
    
    editTask(task) {
      this.isEditMode = true;
      this.currentTask = JSON.parse(JSON.stringify(task));
      this.dialogVisible = true;
    },
    
    async saveTask() {
      this.$refs.taskForm.validate(async (valid) => {
        if (!valid) {
          return;
        }
        
        this.saving = true;
        
        try {
          // 根据任务类型清除不需要的字段
          const taskToSave = JSON.parse(JSON.stringify(this.currentTask));
          
          if (taskToSave.type !== 'script') {
            delete taskToSave.script;
          }
          
          if (taskToSave.type !== 'url') {
            delete taskToSave.url;
          }
          
          if (taskToSave.type !== 'command') {
            delete taskToSave.command;
          }
          
          if (taskToSave.runTime !== 'schedule') {
            delete taskToSave.scheduleTime;
            delete taskToSave.repeatDays;
          }
          
          if (taskToSave.runTime !== 'interval') {
            delete taskToSave.intervalMinutes;
          }
          
          // 计算下次运行时间
          if (taskToSave.runTime === 'schedule') {
            taskToSave.nextRun = this.calculateNextScheduledRun(taskToSave);
          } else if (taskToSave.runTime === 'interval') {
            const nextRun = new Date();
            nextRun.setMinutes(nextRun.getMinutes() + taskToSave.intervalMinutes);
            taskToSave.nextRun = nextRun;
          } else {
            taskToSave.nextRun = null;
          }
          
          const savedTask = await window.ipcRenderer.invoke('save-automation-task', taskToSave);
          
          this.dialogVisible = false;
          this.$message.success('任务已保存');
          
          // 刷新任务列表
          await this.loadTasks();
        } catch (error) {
          this.$message.error('保存任务失败: ' + error.message);
        } finally {
          this.saving = false;
        }
      });
    },
    
    async deleteTask(taskId) {
      try {
        await this.$confirm('此操作将永久删除该任务，是否继续？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        
        // 确保任务列表存在
        if (!this.tasks || !Array.isArray(this.tasks)) {
          throw new Error('任务列表不存在');
        }
        
        // 先从本地数组中移除任务，防止删除后渲染错误
        const index = this.tasks.findIndex(task => task && task.id === taskId);
        if (index !== -1) {
          this.tasks.splice(index, 1);
          // 强制触发响应式更新
          this.tasks = [...this.tasks];
        }
        
        await window.ipcRenderer.invoke('delete-automation-task', taskId);
        this.$message.success('任务已删除');
        
        // 刷新任务列表
        await this.loadTasks();
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除任务失败: ' + error.message);
        }
      }
    },
    
    async runTask(taskId) {
      try {
        // 确保任务列表存在
        if (!this.tasks || !Array.isArray(this.tasks)) {
          throw new Error('任务列表不存在');
        }
        
        // 先更新本地状态，提供即时反馈
        const index = this.tasks.findIndex(task => task && task.id === taskId);
        if (index !== -1) {
          // Vue 3 不需要 $set
          this.tasks[index].status = 'pending';
          // 强制触发响应式更新
          this.tasks = [...this.tasks];
        } else {
          // 如果找不到任务，可能需要刷新任务列表
          await this.loadTasks();
          // 重新尝试查找任务
          const newIndex = this.tasks.findIndex(task => task && task.id === taskId);
          if (newIndex === -1) {
            throw new Error('找不到指定的任务');
          }
        }
        
        await window.ipcRenderer.invoke('run-automation-task', taskId);
        this.$message.success('任务已启动');
        
        // 再次更新任务状态
        const updatedIndex = this.tasks.findIndex(task => task && task.id === taskId);
        if (updatedIndex !== -1) {
          // Vue 3 不需要 $set
          this.tasks[updatedIndex].status = 'running';
          this.tasks[updatedIndex].lastRun = new Date();
          // 强制触发响应式更新
          this.tasks = [...this.tasks];
        }
        
        // 立即刷新任务状态，获取最新信息
        setTimeout(() => this.refreshTaskStatus(), 1000);
      } catch (error) {
        this.$message.error('启动任务失败: ' + error.message);
        
        // 如果失败，尝试将状态恢复为 idle
        if (this.tasks && Array.isArray(this.tasks)) {
          const index = this.tasks.findIndex(task => task && task.id === taskId);
          if (index !== -1) {
            // Vue 3 不需要 $set
            this.tasks[index].status = 'idle';
            // 强制触发响应式更新
            this.tasks = [...this.tasks];
          }
        }
      }
    },
    
    async stopTask(taskId) {
      try {
        // 确保任务列表存在
        if (!this.tasks || !Array.isArray(this.tasks)) {
          throw new Error('任务列表不存在');
        }
        
        // 先更新本地状态，提供即时反馈
        const index = this.tasks.findIndex(task => task && task.id === taskId);
        if (index !== -1) {
          // Vue 3 不需要 $set
          this.tasks[index].status = 'stopping';
          // 强制触发响应式更新
          this.tasks = [...this.tasks];
        } else {
          // 如果找不到任务，可能需要刷新任务列表
          await this.loadTasks();
          // 重新尝试查找任务
          const newIndex = this.tasks.findIndex(task => task && task.id === taskId);
          if (newIndex === -1) {
            throw new Error('找不到指定的任务');
          }
        }
        
        await window.ipcRenderer.invoke('stop-task', taskId);
        this.$message.success('任务已停止');
        
        // 再次更新任务状态
        const updatedIndex = this.tasks.findIndex(task => task && task.id === taskId);
        if (updatedIndex !== -1) {
          // Vue 3 不需要 $set
          this.tasks[updatedIndex].status = 'stopped';
          // 强制触发响应式更新
          this.tasks = [...this.tasks];
        }
        
        // 立即刷新任务状态，获取最新信息
        setTimeout(() => this.refreshTaskStatus(), 1000);
      } catch (error) {
        this.$message.error('停止任务失败: ' + error.message);
        
        // 如果失败，尝试将状态恢复为 running
        if (this.tasks && Array.isArray(this.tasks)) {
          const index = this.tasks.findIndex(task => task && task.id === taskId);
          if (index !== -1) {
            // Vue 3 不需要 $set
            this.tasks[index].status = 'running';
            // 强制触发响应式更新
            this.tasks = [...this.tasks];
          }
        }
      }
    },
    
    /**
     * 获取任务日志
     * @param {string} taskId 任务ID
     * @returns {Promise<string>} 任务日志
     */
    async getTaskLog(taskId) {
      if (!taskId) {
        return '无效的任务ID';
      }
      
      try {
        // 直接从任务状态中获取日志
        const taskStatus = await window.ipcRenderer.invoke('get-task-status', taskId);
        let log = '';
        
        if (taskStatus && (taskStatus.log || taskStatus.lastLog)) {
          log = taskStatus.log || taskStatus.lastLog;
        } else {
          // 如果没有任务状态，尝试从任务列表中获取
          if (this.tasks && Array.isArray(this.tasks)) {
            const task = this.tasks.find(t => t && t.id === taskId);
            if (task && task.lastLog) {
              log = task.lastLog;
            }
          }
        }
        
        // 如果日志为空，返回默认消息
        if (!log) {
          return '暂无日志';
        }
        
        // 添加时间戳，如果日志中没有时间戳
        if (!log.includes('[') || !log.includes(']')) {
          const now = new Date();
          const timestamp = `[${now.toLocaleString()}] `;
          log = timestamp + log;
        }
        
        return log;
      } catch (error) {
        console.error('获取任务日志失败:', error);
        return `获取日志失败: ${error.message}`;
      }
    },
    
    /**
     * 查看完整日志
     * @param {string} taskId 任务ID
     */
    /**
     * 获取任务日志
     * @param {string} taskId 任务ID
     * @returns {Promise<string>} 任务日志
     */
    async getTaskLog(taskId) {
      if (!taskId) {
        return '无效的任务ID';
      }
      
      try {
        // 直接从任务状态中获取日志
        const taskStatus = await window.ipcRenderer.invoke('get-task-status', taskId);
        let log = '';
        
        if (taskStatus && (taskStatus.log || taskStatus.lastLog)) {
          log = taskStatus.log || taskStatus.lastLog;
        } else {
          // 如果没有任务状态，尝试从任务列表中获取
          if (this.tasks && Array.isArray(this.tasks)) {
            const task = this.tasks.find(t => t && t.id === taskId);
            if (task && task.lastLog) {
              log = task.lastLog;
            }
          }
        }
        
        // 如果日志为空，返回默认消息
        if (!log) {
          return '暂无日志';
        }
        
        // 添加时间戳，如果日志中没有时间戳
        if (!log.includes('[') || !log.includes(']')) {
          const now = new Date();
          const timestamp = `[${now.toLocaleString()}] `;
          log = timestamp + log;
        }
        
        return log;
      } catch (error) {
        console.error('获取任务日志失败:', error);
        return `获取日志失败: ${error.message}`;
      }
    },
    
    /**
     * 查看完整日志
     * @param {string} taskId 任务ID
     */
    async viewFullLog(taskId) {
      this.currentTaskId = taskId;
      this.logDialogVisible = true;
      this.currentTaskLog = '正在加载日志...';
      this.lastLogUpdateTime = new Date().toLocaleString();
      
      // 获取日志
      this.currentTaskLog = await this.getTaskLog(taskId);
    },
    
    /**
     * 刷新日志
     */
    async refreshLog() {
      if (!this.currentTaskId) return;
      
      try {
        this.currentTaskLog = await this.getTaskLog(this.currentTaskId);
        this.lastLogUpdateTime = new Date().toLocaleString();
      } catch (error) {
        this.$message.error('刷新日志失败: ' + error.message);
      }
    },
    
    /**
     * 启动日志刷新定时器
     */
    startLogRefreshTimer() {
      // 先清除可能存在的定时器
      this.stopLogRefreshTimer();
      
      // 如果自动刷新已启用且对话框已打开，则启动定时器
      if (this.autoRefreshLog && this.logDialogVisible) {
        this.logRefreshInterval = setInterval(() => {
          this.refreshLog();
        }, 3000); // 每3秒刷新一次
      }
    },
    
    /**
     * 停止日志刷新定时器
     */
    stopLogRefreshTimer() {
      if (this.logRefreshInterval) {
        clearInterval(this.logRefreshInterval);
        this.logRefreshInterval = null;
      }
    },
    
    /**
     * 复制日志到剪贴板
     */
    async copyLog() {
      if (!this.currentTaskLog) {
        this.$message.warning('无日志内容可复制');
        return;
      }
      
      try {
        // 先尝试使用现代API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(this.currentTaskLog);
        } else {
          // 兼容旧版浏览器
          const textarea = document.createElement('textarea');
          textarea.value = this.currentTaskLog;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        this.$message.success('日志已复制到剪贴板');
      } catch (error) {
        console.error('复制日志失败:', error);
        this.$message.error('复制日志失败: ' + error.message);
      }
    },
    
    /**
     * 下载日志文件
     */
    downloadLog() {
      if (!this.currentTaskLog) {
        this.$message.warning('无日志内容可下载');
        return;
      }
      
      try {
        // 获取当前任务名称作为文件名
        const taskName = this.getCurrentTaskName() || '任务日志';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `${taskName}_${timestamp}.log`;
        
        // 创建一个 Blob 对象
        const blob = new Blob([this.currentTaskLog], { type: 'text/plain' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 清理
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
        
        this.$message.success('日志已下载');
      } catch (error) {
        console.error('下载日志失败:', error);
        this.$message.error('下载日志失败: ' + error.message);
      }
    },
    
    /**
     * 清空日志
     */
    async clearLog() {
      if (!this.currentTaskId) return;
      
      try {
        await this.$confirm('此操作将清空当前任务的日志，是否继续？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        
        // 尝试清空任务日志
        try {
          await window.ipcRenderer.invoke('clear-task-log', this.currentTaskId);
        } catch (e) {
          console.warn('清空日志 IPC 调用失败:', e);
          // 如果后端没有实现清空日志功能，则只在前端清空
        }
        
        this.currentTaskLog = '日志已清空';
        this.lastLogUpdateTime = new Date().toLocaleString();
        
        // 刷新任务列表中的日志
        if (this.tasks && Array.isArray(this.tasks)) {
          const index = this.tasks.findIndex(t => t && t.id === this.currentTaskId);
          if (index !== -1) {
            this.tasks[index].lastLog = '';
            // 强制触发响应式更新
            this.tasks = [...this.tasks];
          }
        }
        
        this.$message.success('日志已清空');
      } catch (error) {
        if (error !== 'cancel') {
          console.error('清空日志失败:', error);
          this.$message.error('清空日志失败: ' + error.message);
        }
      }
    },
    

    
    /**
     * 清空日志
     */
    clearLog() {
      if (!this.currentTaskId) return;
      this.currentTaskLog = '日志已清空';
      this.lastLogUpdateTime = new Date().toLocaleString();
      this.$message.success('日志已清空');
    },
    
    /**
     * 获取当前任务名称
     * @returns {string} 任务名称
     */
    getCurrentTaskName() {
      if (!this.currentTaskId || !this.tasks || !Array.isArray(this.tasks)) {
        return '未知任务';
      }
      
      const task = this.tasks.find(t => t && t.id === this.currentTaskId);
      return task ? task.name : '未知任务';
    },
    
    /**
     * 获取当前任务状态
     * @returns {string} 任务状态
     */
    getCurrentTaskStatus() {
      if (!this.currentTaskId || !this.tasks || !Array.isArray(this.tasks)) {
        return 'unknown';
      }
      
      const task = this.tasks.find(t => t && t.id === this.currentTaskId);
      return task ? task.status : 'unknown';
    },
    
    getProfileName(profileId) {
      const profile = this.profiles.find(p => p.id === profileId);
      return profile ? profile.name : '未知配置';
    },
    
    getStatusText(status) {
      switch (status) {
        case 'idle': return '空闲';
        case 'running': return '运行中';
        case 'completed': return '已完成';
        case 'failed': return '失败';
        case 'stopped': return '已停止';
        default: return status;
      }
    },
    
    getStatusTagType(status) {
      switch (status) {
        case 'idle': return 'info';
        case 'running': return 'primary';
        case 'completed': return 'success';
        case 'failed': return 'danger';
        case 'stopped': return 'warning';
        default: return 'info';
      }
    },
    
    getScheduleText(task) {
      switch (task.runTime) {
        case 'manual':
          return '手动执行';
        case 'startup':
          return '启动时执行';
        case 'schedule':
          const time = task.scheduleTime ? new Date(task.scheduleTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const days = this.formatRepeatDays(task.repeatDays);
          return `${time} ${days}`;
        case 'interval':
          return `每 ${task.intervalMinutes} 分钟`;
        default:
          return '未知';
      }
    },
    
    formatRepeatDays(days) {
      if (!days || days.length === 0) return '';
      
      const dayMap = {
        '0': '周日',
        '1': '周一',
        '2': '周二',
        '3': '周三',
        '4': '周四',
        '5': '周五',
        '6': '周六'
      };
      
      // 检查是否是每天
      if (days.length === 7) {
        return '每天';
      }
      
      // 检查是否是工作日
      if (days.length === 5 && 
          days.includes('1') && 
          days.includes('2') && 
          days.includes('3') && 
          days.includes('4') && 
          days.includes('5') && 
          !days.includes('0') && 
          !days.includes('6')) {
        return '工作日';
      }
      
      // 检查是否是周末
      if (days.length === 2 && 
          days.includes('0') && 
          days.includes('6')) {
        return '周末';
      }
      
      // 其他情况，显示具体天数
      return days.map(d => dayMap[d]).join(', ');
    },
    
    formatDate(date) {
      if (!date) return '';
      
      const d = new Date(date);
      return d.toLocaleString();
    },
    
    calculateNextScheduledRun(task) {
      if (task.runTime !== 'schedule' || !task.scheduleTime || !task.repeatDays || task.repeatDays.length === 0) {
        return null;
      }
      
      const now = new Date();
      const scheduleTime = new Date(task.scheduleTime);
      
      // 创建下次运行时间
      const nextRun = new Date();
      nextRun.setHours(scheduleTime.getHours());
      nextRun.setMinutes(scheduleTime.getMinutes());
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);
      
      // 如果今天的时间已经过了，设置为明天
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      
      // 找到下一个符合重复日期的日期
      const repeatDays = task.repeatDays.map(d => parseInt(d));
      
      // 最多检查未来7天
      for (let i = 0; i < 7; i++) {
        const dayOfWeek = nextRun.getDay();
        if (repeatDays.includes(dayOfWeek)) {
          return nextRun;
        }
        nextRun.setDate(nextRun.getDate() + 1);
      }
      
      return null;
    },
  
    
    editTask(task) {
      this.isEditMode = true;
      this.currentTask = JSON.parse(JSON.stringify(task)); // 深拷贝
      this.dialogVisible = true;
    }
}
};
// 添加全局样式，确保对话框和日期选择器能够正确显示
const automationPageStyle = document.createElement('style');
automationPageStyle.textContent = `
  /* 自定义对话框样式 */
  .custom-dialog-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999999;
  }
  
  .custom-dialog {
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    width: 650px;
    max-width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 20px;
  }
  
  .custom-dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .custom-dialog-header h3 {
    margin: 0;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
  }
  
  .custom-dialog-footer {
    margin-top: 20px;
    text-align: right;
  }
  
  /* 确保日期选择器显示在对话框之上 */
  .el-picker__popper {
    z-index: 1000000 !important;
  }
  
  /* 确保下拉菜单显示在对话框之上 */
  .el-select__popper {
    z-index: 1000000 !important;
  }
  
  /* 自动化任务页面样式 */
  .automation-page {
    padding: 20px;

  
  .automation-actions {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  
  .search-input {
    width: 300px;
  }
  
  .task-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 20px;
  }
  
  .task-card {
    margin-bottom: 0;
  }
  
  .task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .action-buttons {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  
  .task-title {
    display: flex;
    align-items: center;
  }
  
  .task-title h3 {
    margin: 0;
    margin-right: 10px;
  }
  
  .task-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 15px;
  }
  
  .task-detail {
    display: flex;
  }
  
  .detail-label {
    font-weight: bold;
    margin-right: 5px;
    color: #606266;
  }
  
  .task-description {
    margin-bottom: 15px;
    color: #606266;
  }
  
  .task-logs {
    background-color: #f5f7fa;
    border-radius: 4px;
    padding: 10px;
  }
  
  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
    font-weight: bold;
  }
  
  .log-content {
    max-height: 100px;
    overflow-y: auto;
    font-family: monospace;
    margin: 0;
    white-space: pre-wrap;
    font-size: 12px;
  }
  
  .full-log-content {
    max-height: 60vh;
    overflow-y: auto;
    font-family: monospace;
    margin: 0;
    white-space: pre-wrap;
    font-size: 12px;
  }
  
  .log-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding: 10px;
    background-color: #f5f7fa;
    border-radius: 4px;
  }
  
  .log-info {
    display: flex;
    gap: 15px;
  }
  
  .log-actions {
    display: flex;
    gap: 10px;
  }
  
  .log-container {
    background-color: #1e1e1e;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 15px;
    max-height: 60vh;
    overflow-y: auto;
  }
  
  .full-log-content {
    font-family: 'Courier New', monospace;
    color: #e0e0e0;
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
  }
  
  .log-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 10px;
    font-size: 12px;
    color: #909399;
  }
`;
document.head.appendChild(automationPageStyle);
