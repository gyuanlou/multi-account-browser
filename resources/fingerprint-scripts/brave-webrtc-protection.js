/**
 * Brave 风格的 WebRTC 指纹防护
 * 基于 Brave 浏览器的 WebRTC 防护技术
 */

(function() {
  // 保存原始方法
  const originalRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  
  if (!originalRTCPeerConnection) {
    console.log('WebRTC API 不可用，无需防护');
    return;
  }
  
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
  
  // 生成随机 IP 地址
  function generateRandomIP(seed) {
    // 生成一个私有 IP 地址
    // 10.0.0.0 - 10.255.255.255
    // 172.16.0.0 - 172.31.255.255
    // 192.168.0.0 - 192.168.255.255
    
    let currentSeed = seed;
    const type = Math.floor(seededRandom(currentSeed++) * 3);
    
    let ip;
    if (type === 0) {
      // 10.x.x.x
      ip = `10.${Math.floor(seededRandom(currentSeed++) * 256)}.${Math.floor(seededRandom(currentSeed++) * 256)}.${Math.floor(seededRandom(currentSeed++) * 256)}`;
    } else if (type === 1) {
      // 172.16.x.x - 172.31.x.x
      ip = `172.${16 + Math.floor(seededRandom(currentSeed++) * 16)}.${Math.floor(seededRandom(currentSeed++) * 256)}.${Math.floor(seededRandom(currentSeed++) * 256)}`;
    } else {
      // 192.168.x.x
      ip = `192.168.${Math.floor(seededRandom(currentSeed++) * 256)}.${Math.floor(seededRandom(currentSeed++) * 256)}`;
    }
    
    return ip;
  }
  
  // 修改 SDP 中的 IP 地址
  function modifySDP(sdp, seed) {
    // 替换所有 IP 地址
    // 匹配 IPv4 地址
    const ipv4Regex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
    
    // 排除私有 IP 和本地 IP
    const excludeIPs = [
      '0.0.0.0',
      '127.0.0.1',
      '10.0.0.1'
    ];
    
    // 缓存已替换的 IP 地址，确保相同的 IP 地址被替换为相同的随机 IP
    const ipCache = {};
    let currentSeed = seed;
    
    // 替换 IP 地址
    return sdp.replace(ipv4Regex, function(match) {
      // 如果是排除的 IP，不替换
      if (excludeIPs.includes(match)) {
        return match;
      }
      
      // 如果已经替换过这个 IP，使用缓存的随机 IP
      if (ipCache[match]) {
        return ipCache[match];
      }
      
      // 生成一个随机的私有 IP 地址
      const randomIP = generateRandomIP(currentSeed++);
      ipCache[match] = randomIP;
      
      return randomIP;
    });
  }
  
  // 拦截 RTCPeerConnection
  window.RTCPeerConnection = window.webkitRTCPeerConnection = window.mozRTCPeerConnection = function(...args) {
    // 创建原始的 RTCPeerConnection
    const pc = new originalRTCPeerConnection(...args);
    const seed = getFingerprinterSeed();
    
    // 拦截 createOffer 方法
    const originalCreateOffer = pc.createOffer;
    pc.createOffer = function(options) {
      return originalCreateOffer.call(this, options)
        .then(function(offer) {
          // 修改 SDP
          const modifiedSDP = modifySDP(offer.sdp, seed);
          offer.sdp = modifiedSDP;
          return offer;
        });
    };
    
    // 拦截 createAnswer 方法
    const originalCreateAnswer = pc.createAnswer;
    pc.createAnswer = function(options) {
      return originalCreateAnswer.call(this, options)
        .then(function(answer) {
          // 修改 SDP
          const modifiedSDP = modifySDP(answer.sdp, seed);
          answer.sdp = modifiedSDP;
          return answer;
        });
    };
    
    // 拦截 setLocalDescription 方法
    const originalSetLocalDescription = pc.setLocalDescription;
    pc.setLocalDescription = function(description) {
      // 修改 SDP
      if (description && description.sdp) {
        description.sdp = modifySDP(description.sdp, seed);
      }
      return originalSetLocalDescription.call(this, description);
    };
    
    // 拦截 onicecandidate 事件
    const originalAddEventListener = pc.addEventListener;
    pc.addEventListener = function(type, listener, options) {
      if (type === 'icecandidate') {
        // 创建一个新的监听器，修改 ICE 候选项
        const newListener = function(event) {
          // 如果有 ICE 候选项
          if (event && event.candidate && event.candidate.candidate) {
            // 修改 ICE 候选项中的 IP 地址
            const originalCandidate = event.candidate.candidate;
            const modifiedCandidate = modifySDP(originalCandidate, seed);
            
            // 创建一个新的事件对象
            const newEvent = new Event('icecandidate');
            newEvent.candidate = {
              ...event.candidate,
              candidate: modifiedCandidate
            };
            
            // 调用原始监听器
            listener(newEvent);
            return;
          }
          
          // 如果没有 ICE 候选项，直接调用原始监听器
          listener(event);
        };
        
        return originalAddEventListener.call(this, type, newListener, options);
      }
      
      // 对于其他事件，使用原始方法
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // 拦截 onicecandidate 属性
    let originalOnIceCandidate = null;
    Object.defineProperty(pc, 'onicecandidate', {
      get: function() {
        return originalOnIceCandidate;
      },
      set: function(callback) {
        // 创建一个新的回调函数，修改 ICE 候选项
        originalOnIceCandidate = function(event) {
          // 如果有 ICE 候选项
          if (event && event.candidate && event.candidate.candidate) {
            // 修改 ICE 候选项中的 IP 地址
            const originalCandidate = event.candidate.candidate;
            const modifiedCandidate = modifySDP(originalCandidate, seed);
            
            // 创建一个新的事件对象
            const newEvent = new Event('icecandidate');
            newEvent.candidate = {
              ...event.candidate,
              candidate: modifiedCandidate
            };
            
            // 调用原始回调
            return callback.call(this, newEvent);
          }
          
          // 如果没有 ICE 候选项，直接调用原始回调
          return callback.call(this, event);
        };
        
        // 设置修改后的回调
        Object.defineProperty(this, '_onicecandidate', {
          value: originalOnIceCandidate,
          writable: true
        });
      },
      configurable: true
    });
    
    return pc;
  };
  
  console.log('Brave 风格的 WebRTC 指纹防护已启用');
})();
