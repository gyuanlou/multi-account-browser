
    // 音频指纹防护
    (function() {
      // 1. 干扰 OfflineAudioContext.prototype.getChannelData
      if (window.OfflineAudioContext && OfflineAudioContext.prototype.getChannelData) {
        const originalGetChannelData = OfflineAudioContext.prototype.getChannelData;
        OfflineAudioContext.prototype.getChannelData = function() {
          const data = originalGetChannelData.apply(this, arguments);
          // 每隔一定间隔加微小噪声
          for (let i = 0; i < data.length; i += 100) {
            data[i] = data[i] + (Math.random() - 0.5) * 1e-5;
          }
          return data;
        };
      }
      // 2. 干扰 AudioContext.prototype.createAnalyser
      if (window.AudioContext && AudioContext.prototype.createAnalyser) {
        const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
        AudioContext.prototype.createAnalyser = function() {
          const analyser = originalCreateAnalyser.apply(this, arguments);
          if (analyser && analyser.getFloatFrequencyData) {
            const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
            analyser.getFloatFrequencyData = function(array) {
              // 在频谱数据上加微小扰动
              for (let i = 0; i < array.length; i += 10) {
                array[i] = array[i] + (Math.random() - 0.5) * 1e-3;
              }
              return originalGetFloatFrequencyData.call(this, array);
            };
          }
          return analyser;
        };
      }
    })();
    