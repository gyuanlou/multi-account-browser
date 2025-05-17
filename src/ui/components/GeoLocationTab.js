// GeoLocationTab.js - 地理位置标签页组件
const GeoLocationTab = {
  template: `
    <div class="tab-content">
      <el-form label-position="top" :model="localGeoLocation">
        <!-- 地理位置设置方式 -->
        <el-form-item label="地理位置设置方式">
          <el-radio-group v-model="locationType">
            <el-radio label="auto">根据代理 IP 自动设置</el-radio>
            <el-radio label="manual">手动设置</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <!-- 自动设置时显示的信息 -->
        <template v-if="locationType === 'auto'">
          <el-alert
            title="系统将根据代理 IP 自动设置对应的地理位置信息"
            type="info"
            :closable="false">
          </el-alert>
          
          <el-form-item label="代理 IP 测试">
            <el-button type="primary" @click="testProxyIP" :loading="testing">
              测试当前代理 IP
            </el-button>
          </el-form-item>
          
          <div v-if="proxyTestResult" class="test-result">
            <el-descriptions border>
              <el-descriptions-item label="IP 地址">{{ proxyTestResult.ip }}</el-descriptions-item>
              <el-descriptions-item label="国家/地区">{{ proxyTestResult.countryName || proxyTestResult.country }}</el-descriptions-item>
              <el-descriptions-item label="城市">{{ proxyTestResult.city }}</el-descriptions-item>
              <el-descriptions-item label="经纬度">{{ proxyTestResult.latitude }}, {{ proxyTestResult.longitude }}</el-descriptions-item>
              <el-descriptions-item label="时区">{{ proxyTestResult.timezone }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </template>
        
        <!-- 手动设置地理位置 -->
        <template v-else>
          <el-form-item label="国家/地区">
            <el-select v-model="localGeoLocation.country" filterable @change="loadCities">
              <el-option
                v-for="country in countries"
                :key="country.code"
                :label="country.name"
                :value="country.code">
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="城市">
            <el-select v-model="localGeoLocation.city" filterable>
              <el-option
                v-for="city in cities"
                :key="city.name"
                :label="city.name"
                :value="city.name">
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="经度">
            <el-input-number v-model="localGeoLocation.longitude" :min="-180" :max="180" :step="0.01"></el-input-number>
          </el-form-item>
          
          <el-form-item label="纬度">
            <el-input-number v-model="localGeoLocation.latitude" :min="-90" :max="90" :step="0.01"></el-input-number>
          </el-form-item>
          
          <el-form-item label="时区">
            <el-select v-model="localGeoLocation.timezone" filterable>
              <el-option
                v-for="timezone in timezones"
                :key="timezone.id"
                :label="timezone.name"
                :value="timezone.id">
              </el-option>
            </el-select>
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
      localGeoLocation: {},
      locationType: 'manual',
      testing: false,
      proxyTestResult: null,
      countries: [],
      cities: [],
      timezones: []
    };
  },
  
  watch: {
    localGeoLocation: {
      handler(val) {
        this.$emit('update:profile', { 
          ...this.profile, 
          geoLocation: val 
        });
      },
      deep: true
    },
    'profile.geoLocation': {
      handler(val) {
        this.localGeoLocation = { ...val };
        this.locationType = val && val.autoFromProxy ? 'auto' : 'manual';
      },
      immediate: true,
      deep: true
    },
    locationType(val) {
      this.localGeoLocation.autoFromProxy = val === 'auto';
    }
  },
  
  created() {
    this.loadCountries();
    this.loadTimezones();
    
    if (this.localGeoLocation.country) {
      this.loadCities();
    }
  },
  
  methods: {
    async testProxyIP() {
      if (!this.profile.proxy || !this.profile.proxy.enabled) {
        this.$message.warning('请先启用代理设置');
        return;
      }
      
      console.log('开始测试代理IP:', JSON.stringify(this.profile.proxy));
      this.testing = true;
      this.proxyTestResult = null;
      
      try {
        // 创建一个新的代理配置对象，只包含简单的数据类型
        const proxyConfig = {
          enabled: this.profile.proxy.enabled,
          type: this.profile.proxy.type,
          host: this.profile.proxy.host,
          port: parseInt(this.profile.proxy.port),
          testUrl: this.profile.proxy.testUrl
        };
        
        // 只在有用户名和密码时添加
        if (this.profile.proxy.username) {
          proxyConfig.username = this.profile.proxy.username;
        }
        
        if (this.profile.proxy.password) {
          proxyConfig.password = this.profile.proxy.password;
        }
        
        console.log('发送代理配置到主进程:', JSON.stringify(proxyConfig));
        
        const result = await window.ipcRenderer.invoke('test-proxy', proxyConfig);
        console.log('收到代理测试结果:', JSON.stringify(result));
        
        if (result.success) {
          this.proxyTestResult = result;
          
          // 更新地理位置信息
          const geoLocation = {
            country: result.country,
            city: result.city || '',
            latitude: result.latitude || 0,
            longitude: result.longitude || 0,
            timezone: result.timezone || 'UTC',
            autoFromProxy: true
          };
          
          // 如果有语言信息，也添加到地理位置设置中
          if (result.language) {
            geoLocation.language = result.language;
          }
          
          this.localGeoLocation = {
            ...this.localGeoLocation,
            ...geoLocation
          };
          
          console.log('更新地理位置信息:', JSON.stringify(this.localGeoLocation));
        } else {
          this.$message.error(`代理测试失败: ${result.error}`);
        }
      } catch (error) {
        console.error('代理测试过程中发生错误:', error);
        this.$message.error(`代理测试出错: ${error.message}`);
      } finally {
        this.testing = false;
        console.log('代理测试完成');
      }
    },
    
    async loadCountries() {
      try {
        this.countries = await window.ipcRenderer.invoke('get-countries');
      } catch (error) {
        console.error('加载国家列表失败:', error);
        this.countries = [
          { code: 'CN', name: '中国' },
          { code: 'US', name: '美国' },
          { code: 'JP', name: '日本' },
          { code: 'KR', name: '韩国' },
          { code: 'GB', name: '英国' }
        ];
      }
    },
    
    async loadCities() {
      try {
        if (this.localGeoLocation.country) {
          this.cities = await window.ipcRenderer.invoke('get-cities', this.localGeoLocation.country);
        }
      } catch (error) {
        console.error('加载城市列表失败:', error);
        this.cities = [];
      }
    },
    
    async loadTimezones() {
      try {
        this.timezones = await window.ipcRenderer.invoke('get-timezones');
      } catch (error) {
        console.error('加载时区列表失败:', error);
        this.timezones = [
          { id: 'Asia/Shanghai', name: '中国标准时间 (UTC+8)' },
          { id: 'America/New_York', name: '美国东部时间 (UTC-5/-4)' },
          { id: 'America/Los_Angeles', name: '美国太平洋时间 (UTC-8/-7)' },
          { id: 'Europe/London', name: '英国时间 (UTC+0/+1)' },
          { id: 'Asia/Tokyo', name: '日本时间 (UTC+9)' }
        ];
      }
    }
  }
};
