/**
 * Brave 风格的音频指纹防护
 * 基于 Brave 浏览器的音频防护技术
 */

(function() {
  // 保存原始方法
  const originalAudioContext = window.AudioContext || window.webkitAudioContext;
  const originalOfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  
  // 创建一个确定性但唯一的指纹噪声
  // 使用基于域名的种子
  function getFingerprinterSeed() {
    const domain = window.location.hostname || 'unknown';
    let seed = 0;
    for (let i = 0; i < domain.length; i++) {
      seed = ((seed << 5) - seed) + domain.charCodeAt(i);
      seed = seed & seed; // 转换为32位整数
    }
    return Math.abs(seed);
  }
  
  // 生成确定性随机数
  function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }
  
  // 添加噪声到音频数据
  function addNoiseToAudioData(audioBuffer, seed) {
    const numChannels = audioBuffer.numberOfChannels;
    let currentSeed = seed;
    
    // 对每个通道添加微小噪声
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      
      // 添加微小噪声，噪声幅度为信号幅度的 0.1%
      for (let i = 0; i < channelData.length; i++) {
        // 只修改一小部分样本，以保持音频基本不变
        if (seededRandom(currentSeed++) < 0.05) {
          const noise = (seededRandom(currentSeed++) * 2 - 1) * 0.0001;
          channelData[i] = Math.max(-1, Math.min(1, channelData[i] + noise));
        }
      }
    }
    
    return audioBuffer;
  }
  
  // 拦截 AudioContext
  window.AudioContext = window.webkitAudioContext = function(...args) {
    const audioContext = new originalAudioContext(...args);
    const seed = getFingerprinterSeed();
    
    // 拦截 createOscillator
    const originalCreateOscillator = audioContext.createOscillator;
    audioContext.createOscillator = function(...oscillatorArgs) {
      const oscillator = originalCreateOscillator.apply(this, oscillatorArgs);
      
      // 添加微小的频率偏移
      const originalSetFrequency = oscillator.frequency.setValueAtTime;
      oscillator.frequency.setValueAtTime = function(value, time) {
        // 添加微小的频率偏移，不超过 0.1Hz
        const offset = (seededRandom(seed + 1) * 0.2 - 0.1);
        return originalSetFrequency.call(this, value + offset, time);
      };
      
      return oscillator;
    };
    
    // 拦截 createAnalyser
    const originalCreateAnalyser = audioContext.createAnalyser;
    audioContext.createAnalyser = function(...analyserArgs) {
      const analyser = originalCreateAnalyser.apply(this, analyserArgs);
      
      // 拦截 getFloatFrequencyData
      const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
      analyser.getFloatFrequencyData = function(array) {
        originalGetFloatFrequencyData.call(this, array);
        
        // 添加微小噪声
        let currentSeed = seed + 2;
        for (let i = 0; i < array.length; i++) {
          if (seededRandom(currentSeed++) < 0.05) {
            const noise = (seededRandom(currentSeed++) * 2 - 1) * 0.5;
            array[i] = Math.max(-100, Math.min(0, array[i] + noise));
          }
        }
        
        return array;
      };
      
      // 拦截 getByteFrequencyData
      const originalGetByteFrequencyData = analyser.getByteFrequencyData;
      analyser.getByteFrequencyData = function(array) {
        originalGetByteFrequencyData.call(this, array);
        
        // 添加微小噪声
        let currentSeed = seed + 3;
        for (let i = 0; i < array.length; i++) {
          if (seededRandom(currentSeed++) < 0.05) {
            const noise = Math.floor(seededRandom(currentSeed++) * 2 - 1);
            array[i] = Math.max(0, Math.min(255, array[i] + noise));
          }
        }
        
        return array;
      };
      
      return analyser;
    };
    
    // 拦截 createScriptProcessor
    const originalCreateScriptProcessor = audioContext.createScriptProcessor;
    audioContext.createScriptProcessor = function(...processorArgs) {
      const processor = originalCreateScriptProcessor.apply(this, processorArgs);
      
      // 保存原始的 onaudioprocess 属性描述符
      const originalDescriptor = Object.getOwnPropertyDescriptor(processor, 'onaudioprocess');
      
      // 重新定义 onaudioprocess 属性
      Object.defineProperty(processor, 'onaudioprocess', {
        get: function() {
          return originalDescriptor.get.call(this);
        },
        set: function(callback) {
          // 创建一个新的回调函数，添加噪声
          const newCallback = function(event) {
            // 添加微小噪声到输出缓冲区
            const outputBuffer = event.outputBuffer;
            addNoiseToAudioData(outputBuffer, seed + 4);
            
            // 调用原始回调
            return callback.call(this, event);
          };
          
          // 设置新的回调
          originalDescriptor.set.call(this, newCallback);
        },
        configurable: true
      });
      
      return processor;
    };
    
    // 拦截 decodeAudioData
    const originalDecodeAudioData = audioContext.decodeAudioData;
    audioContext.decodeAudioData = function(arrayBuffer, successCallback, errorCallback) {
      return originalDecodeAudioData.call(this, arrayBuffer, function(audioBuffer) {
        // 添加微小噪声到解码后的音频数据
        const modifiedBuffer = addNoiseToAudioData(audioBuffer, seed + 5);
        
        // 调用原始成功回调
        if (successCallback) {
          successCallback(modifiedBuffer);
        }
        
        return modifiedBuffer;
      }, errorCallback);
    };
    
    return audioContext;
  };
  
  // 拦截 OfflineAudioContext
  window.OfflineAudioContext = window.webkitOfflineAudioContext = function(...args) {
    const offlineAudioContext = new originalOfflineAudioContext(...args);
    const seed = getFingerprinterSeed();
    
    // 拦截 startRendering
    const originalStartRendering = offlineAudioContext.startRendering;
    offlineAudioContext.startRendering = function() {
      // 调用原始方法，获取 Promise
      const renderPromise = originalStartRendering.call(this);
      
      // 拦截 Promise 的 then 方法
      return renderPromise.then(function(renderedBuffer) {
        // 添加微小噪声到渲染后的音频数据
        return addNoiseToAudioData(renderedBuffer, seed + 6);
      });
    };
    
    // 拦截其他方法，类似于 AudioContext
    // ...
    
    return offlineAudioContext;
  };
  
  console.log('Brave 风格的音频指纹防护已启用');
})();
