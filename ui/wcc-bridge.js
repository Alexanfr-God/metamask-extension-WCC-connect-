/**
 * WCC Bridge - Auto-connect to Admin UI via WebSocket
 * Zero configuration, graceful fallback, AI-powered element detection
 */

class WCCBridge {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.isConnected = false;
    
    // Auto-start
    this.connect();
    
    // Expose globally for debugging
    window.WCCBridge = this;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    try {
      console.log('[WCC] 🔌 Connecting to ws://localhost:3001...');
      
      this.ws = new WebSocket('ws://localhost:3001');
      
      this.ws.onopen = () => {
        console.log('[WCC] ✅ Connected to Admin UI');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send hello message
        this.send({
          type: 'hello',
          walletType: 'MetaMask',
          timestamp: Date.now()
        });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('[WCC] Failed to parse message:', e);
        }
      };
      
      this.ws.onerror = (error) => {
        console.warn('[WCC] ⚠️ WebSocket error (this is OK if Admin UI is not running)');
      };
      
      this.ws.onclose = () => {
        console.log('[WCC] 🔌 Disconnected from Admin UI');
        this.isConnected = false;
        this.reconnect();
      };
      
    } catch (e) {
      console.warn('[WCC] Failed to connect (Admin UI not running)');
      this.reconnect();
    }
  }

  /**
   * Auto-reconnect with exponential backoff
   */
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WCC] Max reconnect attempts reached. Will retry when page reloads.');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`[WCC] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      this.connect();
    }, delay);
  }

  /**
   * Send message to Admin UI
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Handle incoming messages from Admin UI
   */
  handleMessage(message) {
    console.log('[WCC] 📨 Received:', message.type);
    
    switch (message.type) {
      case 'ping':
        this.send({ type: 'pong', timestamp: Date.now() });
        break;
        
      case 'getUIMap':
        this.sendUIMap();
        break;
        
      case 'getScreenshot':
        this.sendScreenshot(message.screen);
        break;
        
      case 'applyTheme':
        this.applyTheme(message.theme);
        break;
        
      default:
        console.log('[WCC] Unknown message type:', message.type);
    }
  }

  /**
   * AI-Powered DOM Scanner - Auto-detect element roles
   */
  scanDOM() {
    const elements = [];
    const interactiveSelectors = [
      'button',
      '[role="button"]',
      'a[href]',
      'input',
      '[class*="button"]',
      '[class*="btn"]',
      '[data-testid]'
    ];
    
    // Find all interactive elements
    const allElements = document.querySelectorAll(interactiveSelectors.join(','));
    
    allElements.forEach((el) => {
      const role = this.guessRole(el);
      const rect = el.getBoundingClientRect();
      
      // Skip invisible elements
      if (rect.width === 0 || rect.height === 0) return;
      
      const computedStyle = window.getComputedStyle(el);
      
      elements.push({
        role: role.name,
        confidence: role.confidence,
        selector: this.getUniqueSelector(el),
        text: el.textContent?.trim().slice(0, 50) || '',
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        styles: {
          backgroundColor: computedStyle.backgroundColor,
          color: computedStyle.color,
          borderRadius: computedStyle.borderRadius,
          fontSize: computedStyle.fontSize,
          fontWeight: computedStyle.fontWeight,
          padding: computedStyle.padding,
          margin: computedStyle.margin
        },
        attributes: {
          class: el.className,
          id: el.id,
          type: el.getAttribute('type'),
          'data-testid': el.getAttribute('data-testid')
        }
      });
    });
    
    console.log(`[WCC] 🔍 Found ${elements.length} elements`);
    return elements;
  }

  /**
   * AI Heuristics - Guess element role without manual tags
   */
  guessRole(el) {
    const text = el.textContent?.toLowerCase().trim() || '';
    const classes = el.className?.toLowerCase() || '';
    const testId = el.getAttribute('data-testid')?.toLowerCase() || '';
    const tagName = el.tagName.toLowerCase();
    
    // Balance displays
    if (
      /\$?\d+\.\d{2}/.test(text) ||
      classes.includes('balance') ||
      testId.includes('balance')
    ) {
      return { name: 'display.balance', confidence: 0.9 };
    }
    
    // Wallet addresses
    if (
      /0x[a-fA-F0-9]{40}/.test(text) ||
      classes.includes('address') ||
      testId.includes('address')
    ) {
      return { name: 'display.address', confidence: 0.95 };
    }
    
    // Send button
    if (
      text.includes('send') ||
      classes.includes('send') ||
      testId.includes('send')
    ) {
      return { name: 'button.send', confidence: 0.85 };
    }
    
    // Receive button
    if (
      text.includes('receive') ||
      text.includes('deposit') ||
      classes.includes('receive')
    ) {
      return { name: 'button.receive', confidence: 0.85 };
    }
    
    // Buy button
    if (
      text.includes('buy') ||
      classes.includes('buy') ||
      testId.includes('buy')
    ) {
      return { name: 'button.buy', confidence: 0.85 };
    }
    
    // Swap button
    if (
      text.includes('swap') ||
      classes.includes('swap') ||
      testId.includes('swap')
    ) {
      return { name: 'button.swap', confidence: 0.85 };
    }
    
    // Account selector
    if (
      classes.includes('account') ||
      testId.includes('account') ||
      (tagName === 'button' && text.includes('account'))
    ) {
      return { name: 'button.account', confidence: 0.8 };
    }
    
    // Generic button
    if (tagName === 'button' || el.getAttribute('role') === 'button') {
      return { name: 'button.generic', confidence: 0.6 };
    }
    
    // Input fields
    if (tagName === 'input') {
      const type = el.getAttribute('type') || 'text';
      return { name: `input.${type}`, confidence: 0.75 };
    }
    
    // Unknown
    return { name: 'unknown', confidence: 0.3 };
  }

  /**
   * Generate unique CSS selector for element
   */
  getUniqueSelector(el) {
    // Try data-testid first
    const testId = el.getAttribute('data-testid');
    if (testId) return `[data-testid="${testId}"]`;
    
    // Try ID
    if (el.id) return `#${el.id}`;
    
    // Try class combination
    if (el.className) {
      const classes = el.className.split(' ').filter(c => c).slice(0, 3).join('.');
      if (classes) return `.${classes}`;
    }
    
    // Fallback to tag + nth-child
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(el) + 1;
      return `${el.tagName.toLowerCase()}:nth-child(${index})`;
    }
    
    return el.tagName.toLowerCase();
  }

  /**
   * Send UI Map to Admin UI
   */
  sendUIMap() {
    const elements = this.scanDOM();
    
    this.send({
      type: 'uiMap',
      data: {
        elements,
        meta: {
          url: window.location.href,
          timestamp: Date.now(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      }
    });
    
    console.log('[WCC] 📤 Sent UI Map');
  }

  /**
   * Capture and send screenshot
   */
  async sendScreenshot(screen = 'current') {
    try {
      // Simple canvas-based screenshot
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      canvas.width = width;
      canvas.height = height;
      
      // Try to use html2canvas if available, otherwise send placeholder
      if (typeof html2canvas !== 'undefined') {
        const screenshot = await html2canvas(document.body);
        const dataUrl = screenshot.toDataURL('image/png');
        
        this.send({
          type: 'screenshot',
          screen,
          data: dataUrl
        });
        
        console.log('[WCC] 📸 Sent screenshot');
      } else {
        // Send placeholder
        console.warn('[WCC] html2canvas not available, sending placeholder');
        this.send({
          type: 'screenshot',
          screen,
          data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        });
      }
    } catch (e) {
      console.error('[WCC] Screenshot failed:', e);
    }
  }

  /**
   * Apply theme from Admin UI
   */
  applyTheme(theme) {
    try {
      console.log('[WCC] 🎨 Applying theme...');
      
      // Apply CSS variables to :root
      if (theme.cssVars) {
        Object.entries(theme.cssVars).forEach(([key, value]) => {
          document.documentElement.style.setProperty(key, value);
        });
      }
      
      // Apply styles to specific elements
      if (theme.elements) {
        theme.elements.forEach(({ selector, style }) => {
          const el = document.querySelector(selector);
          if (el && style) {
            Object.assign(el.style, style);
          }
        });
      }
      
      // Send acknowledgment
      this.send({
        type: 'applyAck',
        success: true,
        timestamp: Date.now()
      });
      
      console.log('[WCC] ✅ Theme applied');
    } catch (e) {
      console.error('[WCC] Theme application failed:', e);
      this.send({
        type: 'applyAck',
        success: false,
        error: e.message
      });
    }
  }

  /**
   * Public API for debugging
   */
  ping() {
    return this.send({ type: 'ping', timestamp: Date.now() });
  }
  
  scan() {
    return this.scanDOM();
  }
  
  status() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      wsState: this.ws?.readyState
    };
  }
}

// Auto-initialize (with try-catch to not break MetaMask if anything fails)
try {
  new WCCBridge();
  console.log('[WCC] 🚀 Bridge initialized');
} catch (e) {
  console.warn('[WCC] Failed to initialize (non-critical):', e);
}
