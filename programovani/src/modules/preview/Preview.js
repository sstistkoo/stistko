/**
 * Preview Module - Live náhled HTML kódu
 */
import { state } from '../../core/state.js';
import { eventBus } from '../../core/events.js';
import { debounce } from '../../utils/async.js';

export class Preview {
  constructor(container) {
    this.container = container;
    this.iframe = null;
    this.lastCode = null; // Ukládáme poslední kód pro porovnání
    this.init();
    this.setupEventListeners();
  }

  init() {
    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.className = 'preview-frame';
    this.iframe.id = 'previewFrame';
    this.iframe.sandbox = 'allow-scripts allow-forms';

    this.container.appendChild(this.iframe);

    // Load initial preview
    const code = state.get('editor.code');
    if (code) {
      this.update(code);
    }
  }

  setupEventListeners() {
    // Listen to editor changes
    if (state.get('settings.livePreview')) {
      eventBus.on('editor:change', debounce(({ code }) => {
        // Nektualizovat preview pokud je otevřený obrázek
        const activeFileId = state.get('files.active');
        const tabs = state.get('files.tabs') || [];
        const activeTab = tabs.find(t => t.id === activeFileId);
        if (activeTab && activeTab.content && activeTab.content.startsWith('[Image:')) {
          return; // Ignorovat změny editoru pro obrázky
        }
        this.update(code);
      }, 500));
    }

    // Manual refresh
    eventBus.on('preview:refresh', () => {
      // Nektualizovat preview pokud je otevřený obrázek
      const activeFileId = state.get('files.active');
      const tabs = state.get('files.tabs') || [];
      const activeTab = tabs.find(t => t.id === activeFileId);
      if (activeTab && activeTab.content && activeTab.content.startsWith('[Image:')) {
        return; // Ignorovat refresh pro obrázky
      }
      const code = state.get('editor.code');
      this.update(code);
    });

    // Listen to settings changes
    state.subscribe('settings.livePreview', enabled => {
      if (enabled) {
        // Nektualizovat preview pokud je otevřený obrázek
        const activeFileId = state.get('files.active');
        const tabs = state.get('files.tabs') || [];
        const activeTab = tabs.find(t => t.id === activeFileId);
        if (activeTab && activeTab.content && activeTab.content.startsWith('[Image:')) {
          return; // Ignorovat pro obrázky
        }
        const code = state.get('editor.code');
        this.update(code);
      }
    });
  }

  update(code) {
    try {
      // OCHRANA: Pokud se kód nezměnil, nepřegeneruj preview
      if (this.lastCode === code) {
        return;
      }
      this.lastCode = code;

      console.log('🔄 Preview update - kód délka:', code?.length || 0);

      // Get all open files to inject CSS/JS
      const tabs = state.get('files.tabs') || [];
      const enhancedCode = this.injectProjectFiles(code, tabs);

      // Completely reload iframe to avoid duplicate variable declarations
      const oldIframe = this.iframe;
      const newIframe = document.createElement('iframe');
      newIframe.className = 'preview-frame';
      newIframe.id = 'previewFrame';
      newIframe.sandbox = 'allow-scripts allow-forms';

      // Replace old iframe
      this.container.replaceChild(newIframe, oldIframe);
      this.iframe = newIframe;

      // Inject console capture script
      const wrappedCode = this.injectConsoleCapture(enhancedCode);

      // Use srcdoc instead of contentDocument to avoid cross-origin issues
      this.iframe.srcdoc = wrappedCode;

      // Emit update event after iframe loads
      this.iframe.onload = () => {
        eventBus.emit('preview:updated', { code: enhancedCode });
      };
    } catch (error) {
      console.error('Preview update error:', error);
      this.showError(error);
    }
  }

  injectProjectFiles(htmlCode, tabs) {
    let modifiedCode = htmlCode;

    // Find all CSS files and inject them
    const cssFiles = tabs.filter(tab => tab.type === 'css' || tab.name.endsWith('.css'));
    const jsFiles = tabs.filter(tab => tab.type === 'javascript' || tab.name.endsWith('.js'));
    const imageFiles = tabs.filter(tab => tab.content && tab.content.startsWith('[Image:'));

    if (imageFiles.length > 0) {
      console.log('🖼️ Preview: Preparing', imageFiles.length, 'images for injection');

      // Build image map for dynamic loading
      const imageMap = {};
      imageFiles.forEach(imageTab => {
        const base64Data = imageTab.content.replace('[Image:', '').replace(']', '');
        const fileName = imageTab.name;
        imageMap[fileName] = base64Data;

        // Also add without extension for partial matches
        const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        imageMap[fileNameWithoutExt] = base64Data;

        // Replace static img tags in HTML
        const regex = new RegExp(`(<img[^>]*src=["'])([^"']*${fileName})["']`, 'gi');
        modifiedCode = modifiedCode.replace(regex, `$1${base64Data}"`);

        const simpleRegex = new RegExp(`src=["']${fileName}["']`, 'gi');
        modifiedCode = modifiedCode.replace(simpleRegex, `src="${base64Data}"`);
      });

      // Inject image resolver script BEFORE any other scripts
      const imageResolverScript = `
<script id="image-resolver">
(function() {
  const IMAGE_MAP = ${JSON.stringify(imageMap)};
  console.log('🖼️ Image Resolver: Ready with', Object.keys(IMAGE_MAP).length / 2, 'images');

  // Function to fix image src
  function fixImageSrc(img) {
    const src = img.getAttribute('src');
    if (!src) return;

    const fileName = src.split('/').pop().split('?')[0];
    if (IMAGE_MAP[fileName]) {
      img.src = IMAGE_MAP[fileName];
    }
  }

  // Override Image constructor
  const OriginalImage = window.Image;
  window.Image = function() {
    const img = new OriginalImage();

    // Intercept src property
    let currentSrc = '';
    Object.defineProperty(img, 'src', {
      set: function(value) {
        const fileName = value.split('/').pop().split('?')[0];
        if (IMAGE_MAP[fileName]) {
          currentSrc = IMAGE_MAP[fileName];
        } else {
          currentSrc = value;
        }
        img.setAttribute('src', currentSrc);
      },
      get: function() {
        return currentSrc || img.getAttribute('src');
      }
    });

    return img;
  };

  // Override setAttribute
  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    if (name === 'src' && this.tagName === 'IMG') {
      const fileName = value.split('/').pop().split('?')[0];
      if (IMAGE_MAP[fileName]) {
        return originalSetAttribute.call(this, name, IMAGE_MAP[fileName]);
      }
    }
    return originalSetAttribute.call(this, name, value);
  };

  // MutationObserver to catch all img elements
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      // Check added nodes
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'IMG') {
          fixImageSrc(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll('img').forEach(fixImageSrc);
        }
      });

      // Check attribute changes
      if (mutation.type === 'attributes' && mutation.target.tagName === 'IMG') {
        fixImageSrc(mutation.target);
      }
    });
  });

  // Start observing when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
      });
      // Fix existing images
      document.querySelectorAll('img').forEach(fixImageSrc);
    });
  } else {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    });
    document.querySelectorAll('img').forEach(fixImageSrc);
  }
})();
</script>`;

      // Inject at the very beginning of <head> or before first script
      if (modifiedCode.includes('<head>')) {
        modifiedCode = modifiedCode.replace('<head>', `<head>\n${imageResolverScript}`);
      } else if (modifiedCode.includes('<script')) {
        modifiedCode = modifiedCode.replace('<script', `${imageResolverScript}\n<script`);
      } else {
        modifiedCode = imageResolverScript + '\n' + modifiedCode;
      }
    }

    // Build CSS inline styles
    if (cssFiles.length > 0) {
      const cssContent = cssFiles.map(tab => {
        return `/* ${tab.name} */\n${tab.content}`;
      }).join('\n\n');

      const styleTag = `<style id="injected-css">\n${cssContent}\n</style>`;

      // Try to inject before </head> or at start of <body>
      if (modifiedCode.includes('</head>')) {
        modifiedCode = modifiedCode.replace('</head>', `${styleTag}\n</head>`);
      } else if (modifiedCode.includes('<body>')) {
        modifiedCode = modifiedCode.replace('<body>', `<body>\n${styleTag}`);
      } else {
        modifiedCode = styleTag + '\n' + modifiedCode;
      }
    }

    // Build JS inline scripts
    if (jsFiles.length > 0) {
      const jsContent = jsFiles.map(tab => {
        return `/* ${tab.name} */\n${tab.content}`;
      }).join('\n\n');

      const scriptTag = `<script id="injected-js">\n${jsContent}\n</script>`;

      // Try to inject before </body> or at end
      if (modifiedCode.includes('</body>')) {
        modifiedCode = modifiedCode.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        modifiedCode = modifiedCode + '\n' + scriptTag;
      }
    }

    // Replace relative CSS/JS links with comment (since we injected them)
    modifiedCode = modifiedCode.replace(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (match, path) => {
      if (!path.startsWith('http') && !path.startsWith('//')) {
        const fileName = path.split('/').pop();
        const hasFile = cssFiles.some(tab => tab.name === fileName || tab.path === path);
        if (hasFile) {
          return `<!-- CSS file ${path} injected inline -->`;
        }
      }
      return match;
    });

    modifiedCode = modifiedCode.replace(/<script[^>]*src=["']([^"']+\.js)["'][^>]*><\/script>/gi, (match, path) => {
      if (!path.startsWith('http') && !path.startsWith('//')) {
        const fileName = path.split('/').pop();
        const hasFile = jsFiles.some(tab => tab.name === fileName || tab.path === path);
        if (hasFile) {
          return `<!-- JS file ${path} injected inline -->`;
        }
      }
      return match;
    });

    return modifiedCode;
  }

  injectConsoleCapture(code) {
    const consoleScript = `
      <script>
        (function() {
          // localStorage polyfill for sandboxed iframe - must override BEFORE any user code
          const storage = {};
          const localStoragePolyfill = {
            getItem: function(key) { return storage[key] || null; },
            setItem: function(key, value) { storage[key] = String(value); },
            removeItem: function(key) { delete storage[key]; },
            clear: function() { for (let k in storage) delete storage[k]; },
            get length() { return Object.keys(storage).length; },
            key: function(i) { return Object.keys(storage)[i] || null; }
          };

          // Override localStorage globally
          try {
            Object.defineProperty(window, 'localStorage', {
              get: function() { return localStoragePolyfill; },
              configurable: true
            });
          } catch (e) {
            window.localStorage = localStoragePolyfill;
          }

          const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
          };

          function sendToParent(type, args) {
            try {
              window.parent.postMessage({
                type: 'console',
                level: type,
                message: Array.from(args).map(arg => {
                  try {
                    return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                  } catch {
                    return String(arg);
                  }
                }).join(' '),
                timestamp: Date.now()
              }, '*');
            } catch (e) {}
          }

          console.log = function(...args) {
            originalConsole.log.apply(console, args);
            sendToParent('log', args);
          };

          console.error = function(...args) {
            originalConsole.error.apply(console, args);
            sendToParent('error', args);
          };

          console.warn = function(...args) {
            originalConsole.warn.apply(console, args);
            sendToParent('warn', args);
          };

          console.info = function(...args) {
            originalConsole.info.apply(console, args);
            sendToParent('info', args);
          };

          // Capture errors
          window.addEventListener('error', function(e) {
            sendToParent('error', [e.message + ' at ' + e.filename + ':' + e.lineno]);
          });

          window.addEventListener('unhandledrejection', function(e) {
            sendToParent('error', ['Unhandled Promise rejection:', e.reason]);
          });
        })();
      </script>
    `;

    // Insert as the FIRST thing after <head> tag to ensure it runs before any user scripts
    if (code.includes('<head>')) {
      return code.replace('<head>', '<head>' + consoleScript);
    } else if (code.includes('<head')) {
      // Handle <head with attributes
      return code.replace(/<head([^>]*)>/i, '<head$1>' + consoleScript);
    } else if (code.includes('</head>')) {
      // Fallback: before </head>
      return code.replace('</head>', consoleScript + '</head>');
    } else if (code.includes('<body')) {
      return code.replace('<body', consoleScript + '<body');
    } else {
      return consoleScript + code;
    }
  }

  showError(error) {
    const errorHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: monospace;
            padding: 20px;
            background: #1a1a2e;
            color: #ff6b6b;
          }
          h1 { font-size: 1.2rem; }
          pre {
            background: #0f0f1e;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        <h1>⚠️ Chyba v náhledu</h1>
        <pre>${this.escapeHTML(error.toString())}</pre>
      </body>
      </html>
    `;

    this.iframe.srcdoc = errorHTML;
  }

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  clear() {
    this.iframe.srcdoc = '<!DOCTYPE html><html><body></body></html>';
  }

  refresh() {
    const code = state.get('editor.code');
    this.update(code);
  }

  destroy() {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
  }
}
