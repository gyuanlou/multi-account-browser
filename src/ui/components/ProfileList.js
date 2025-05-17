// ProfileList.js - 配置列表组件
const ProfileList = {
  template: `
    <div class="profile-sidebar">
      <div class="profile-header">
        <h3>账号配置</h3>
        <el-button type="primary" size="small" @click="createProfile">
          <el-icon><plus /></el-icon> 新建
        </el-button>
      </div>
      <el-input v-model="searchQuery" placeholder="搜索配置" prefix-icon="el-icon-search" clearable></el-input>
      <el-scrollbar height="calc(100vh - 280px)">
        <el-menu :default-active="selectedProfileId" @select="selectProfile">
          <profile-list-item 
            v-for="profile in paginatedProfiles" 
            :key="profile.id" 
            :profile="profile"
            :is-running="isProfileRunning(profile.id)"
            @delete="deleteProfile"
            @launch="launchBrowser"
            @close="closeBrowser">
          </profile-list-item>
        </el-menu>
      </el-scrollbar>
      <div class="pagination-container">
        <div class="pagination-info" v-if="filteredProfiles.length > 0">
          显示 {{ paginationInfo.start }}-{{ paginationInfo.end }} / {{ filteredProfiles.length }} 项
        </div>
        <el-pagination
          v-if="filteredProfiles.length > pageSize"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[5, 10, 20, 50]"
          :total="filteredProfiles.length"
          layout="sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange">
        </el-pagination>
      </div>
    </div>
  `,
  
  props: {
    profiles: {
      type: Array,
      required: true
    },
    selectedProfileId: {
      type: String,
      default: null
    },
    runningInstances: {
      type: Array,
      default: () => []
    }
  },
  
  data() {
    return {
      searchQuery: '',
      currentPage: 1,
      pageSize: 10, // 每页显示的配置数量
      pageSizeKey: 'profileList_pageSize' // 本地存储的键名
    };
  },
  
  computed: {
    filteredProfiles() {
      if (!this.searchQuery) {
        return this.profiles;
      }
      
      const query = this.searchQuery.toLowerCase();
      return this.profiles.filter(profile => 
        profile.name.toLowerCase().includes(query)
      );
    },
    
    paginatedProfiles() {
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      return this.filteredProfiles.slice(startIndex, endIndex);
    },
    
    paginationInfo() {
      // 计算当前页显示的项目范围
      const start = this.filteredProfiles.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
      const end = Math.min(this.currentPage * this.pageSize, this.filteredProfiles.length);
      return { start, end };
    },
    
    totalPages() {
      return Math.ceil(this.filteredProfiles.length / this.pageSize);
    }
  },
  
  created() {
    // 从本地存储加载每页显示数量
    const savedPageSize = localStorage.getItem(this.pageSizeKey);
    if (savedPageSize) {
      this.pageSize = parseInt(savedPageSize);
    }
  },
  
  methods: {
    // 判断配置文件是否有运行中的实例
    isProfileRunning(profileId) {
      return this.runningInstances.some(instance => instance.profileId === profileId && instance.status === 'running');
    },
    
    selectProfile(profileId) {
      this.$emit('select-profile', profileId);
    },
    
    handlePageChange(page) {
      this.currentPage = page;
      
      // 如果当前选中的配置不在当前页，自动选择当前页的第一个配置
      this.updateSelectedProfile();
    },
    
    handleSizeChange(size) {
      console.log('每页显示数量改变:', size);
      this.pageSize = size;
      // 保存到本地存储
      localStorage.setItem(this.pageSizeKey, size.toString());
      
      // 调整当前页，确保不超出总页数
      if (this.currentPage > this.totalPages) {
        this.currentPage = Math.max(1, this.totalPages);
      }
      
      this.updateSelectedProfile();
    },
    
    updateSelectedProfile() {
      // 如果当前页没有选中的配置，自动选择第一个
      if (this.paginatedProfiles.length > 0 && 
          !this.paginatedProfiles.some(p => p.id === this.selectedProfileId)) {
        this.$nextTick(() => {
          // 等待 DOM 更新后再选择
          this.selectProfile(this.paginatedProfiles[0].id);
        });
      }
    },
    
    createProfile() {
      console.log('点击了新建配置按钮');
      this.$emit('create-profile');
      console.log('已发送 create-profile 事件');
    },
    
    deleteProfile(profileId) {
      console.log('删除配置:', profileId);
      this.$emit('delete-profile', profileId);
      console.log('已发送 delete-profile 事件');
    },
    
    launchBrowser(profileId) {
      console.log('启动浏览器实例:', profileId);
      this.$emit('launch-browser', profileId);
    },
    
    closeBrowser(profileId) {
      console.log('关闭浏览器实例:', profileId);
      this.$emit('close-browser', profileId);
    }
  }
};
