// 音频指纹保护
(function() {
  // 获取配置，如果没有配置则使用默认值
  const config = window.__FINGERPRINT_CONFIG__ || {
    audioContextProtection: true,
    randomSeed: Math.floor(Math.random() * 2147483647)
  };
  
  // 调试日志函数
  const debugEnabled = config.debug || false;
  function debugLog(...args) {
    if (debugEnabled) {
      console.log(...args);
    }
  }
  
  debugLog('[指纹防护] Audio 防护已启用');
  debugLog('[指纹防护] 使用随机种子:', config.randomSeed);
  
  // 使用配置中的随机种子，或生成一个新的随机种子
  const SEED = config.randomSeed || Math.floor(Math.random() * 2147483647);
  
  // 全局种子值，用于生成一致的随机数
  let globalSeed = SEED;
  
  // 生成一致的随机数
  function seededRandom() {
    globalSeed = (globalSeed * 9301 + 49297) % 233280;
    return globalSeed / 233280;
  }
  
  // 保护 AudioContext
  const audioContextProtect = function() {
    const AudioContextConstructors = [
      window.AudioContext,
      window.webkitAudioContext
    ].filter(Boolean);
    
    AudioContextConstructors.forEach(function(OriginalAudioContext) {
      if (!OriginalAudioContext) return;
      
      // 替换 AudioContext 构造函数
      const OriginalProto = OriginalAudioContext.prototype;
      
      // 保护 createOscillator
      if (OriginalProto.createOscillator) {
        const originalCreateOscillator = OriginalProto.createOscillator;
        OriginalProto.createOscillator = function() {
          const oscillator = originalCreateOscillator.apply(this, arguments);
          const originalStart = oscillator.start;
          oscillator.start = function() {
            // 添加微小随机延迟，使用确定性随机数
            const args = arguments;
            const delay = seededRandom() * 0.01;
            if (args[0]) args[0] += delay;
            return originalStart.apply(this, args);
          };
          return oscillator;
        };
      }
      
      // 保护 createAnalyser
      if (OriginalProto.createAnalyser) {
        const originalCreateAnalyser = OriginalProto.createAnalyser;
        OriginalProto.createAnalyser = function() {
          const analyser = originalCreateAnalyser.apply(this, arguments);
          
          // 修改 getFloatFrequencyData 和 getByteFrequencyData
          const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
          analyser.getFloatFrequencyData = function(array) {
            originalGetFloatFrequencyData.call(this, array);
            // 添加微小噪声，使用确定性随机数
            for (let i = 0; i < array.length; i++) {
              array[i] += (seededRandom() * 0.1 - 0.05);
            }
          };
          
          const originalGetByteFrequencyData = analyser.getByteFrequencyData;
          analyser.getByteFrequencyData = function(array) {
            originalGetByteFrequencyData.call(this, array);
            // 添加微小噪声，使用确定性随机数
            for (let i = 0; i < array.length; i++) {
              array[i] += Math.floor(seededRandom() * 3 - 1);
              array[i] = Math.max(0, Math.min(255, array[i]));
            }
          };
          
          return analyser;
        };
      }
    });
  };
  
  // 保护 AudioBuffer
  const audioBufferProtect = function() {
    if (window.AudioBuffer) {
      const originalGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function(channel) {
        const array = originalGetChannelData.call(this, channel);
        
        // 只修改第一个和最后一个样本，以最小化音频质量影响
        // 使用确定性随机数生成噪声
        if (array.length > 0) {
          array[0] = array[0] + (seededRandom() * 0.0001 - 0.00005);
          array[array.length-1] = array[array.length-1] + (seededRandom() * 0.0001 - 0.00005);
        }
        
        return array;
      };
    }
  };
  
  // 执行音频保护
  audioContextProtect();
  audioBufferProtect();
})();
