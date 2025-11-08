// Auto-connect to WS + Auto-scan DOM + Theme application

class WCCBridge {
  constructor() {
    this.ws = null;
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket('ws://localhost:3001');
    
    this.ws.onopen = () => {
      console.log('[WCC] ✅ Connected to Admin');
      this.ws.send(JSON.stringify({ type: 'hello', source: 'MetaMask' }));
    };
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'getUIMap') {
        this.sendUIMap();
      }
      
      if (msg.type === 'getScreenshot') {
        this.sendScreenshot();
      }
      
      if (msg.type === 'applyTheme') {
        this.applyTheme(msg.data);
      }
    };
    
    this.ws.onerror = () => {
      console.log('[WCC] ⚠️ WS unavailable (graceful fallback)');
    };
  }
  
  sendUIMap() {
    const elements = this.scanDOM();
    this.ws.send(JSON.stringify({ 
      type: 'uiMap', 
      data: { screen: 'home', elements } 
    }));
  }
  
  scanDOM() {
    // AI-powered auto-detection (no manual tags needed!)
    const interactiveEls = document.querySelectorAll('button, [role="button"], input, a');
    
    return Array.from(interactiveEls).map(el => {
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      
      return {
        role: this.guessRole(el), // AI heuristic
        selector: this.getSelector(el),
        text: el.textContent.trim(),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        styles: {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          borderRadius: styles.borderRadius,
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize
        }
      };
    });
  }
  
  guessRole(el) {
    const text = el.textContent.toLowerCase();
    if (text.includes('send')) return 'button.send';
    if (text.includes('receive')) return 'button.receive';
    if (text.includes('buy')) return 'button.buy';
    if (el.tagName === 'INPUT') return 'input.search';
    return 'button.generic';
  }
  
  getSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className) return `.${el.className.split(' ')[0]}`;
    return el.tagName.toLowerCase();
  }
  
  sendScreenshot() {
    // Simple canvas-based screenshot
    html2canvas(document.body).then(canvas => {
      this.ws.send(JSON.stringify({ 
        type: 'screenshot', 
        data: canvas.toDataURL() 
      }));
    });
  }
  
  applyTheme(themeData) {
    // Apply CSS vars
    Object.entries(themeData.cssVars || {}).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    
    // Apply element styles
    (themeData.elements || []).forEach(({ selector, style }) => {
      const el = document.querySelector(selector);
      if (el) Object.assign(el.style, style);
    });
    
    this.ws.send(JSON.stringify({ type: 'applyAck', ok: true }));
  }
}

// Auto-init if WS available
if (window.location.href.includes('chrome-extension://')) {
  new WCCBridge();
}
