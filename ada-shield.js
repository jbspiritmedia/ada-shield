/**
 * ADA Shield by Help Lawyer
 * WCAG 2.1 AA Accessibility Compliance Widget
 * Version: 1.2.6
 * https://help-lawyer.com
 *
 * v1.0.1 fixes:
 *  - Elementor CSS specificity conflicts resolved with scoped !important overrides
 *  - SVG icon uses explicit fill="white" on all child elements (no CSS inheritance)
 *  - Dyslexia font loads via <link> tag, not @import (invalid in injected style tags)
 *  - stopPropagation on launcher click prevents Elementor event interception
 *  - position:fixed z-index hardened against Elementor stacking contexts
 *  - Pulse animation isolated to avoid Elementor animation interference
 */

(function (window, document) {
  'use strict';

  // ─── Config ───────────────────────────────────────────────────────────────
  var userConfig = window.HLAdaShieldConfig || {};
  var CONFIG = {
    primaryColor:  userConfig.primaryColor  || '#1E3C8A',
    hoverColor:    userConfig.hoverColor    || '#162d6b',
    position:      userConfig.position      || 'bottom-right',
    statementUrl:  userConfig.statementUrl  || '',
    storageKey:    userConfig.storageKey    || 'hl_ada_prefs',
    brandUrl:      userConfig.brandUrl      || 'https://help-lawyer.com/ada-shield',
    homeUrl:       userConfig.homeUrl       || 'https://help-lawyer.com',
    zIndex:        userConfig.zIndex        || 2147483647,
  };

  var SIDE = CONFIG.position === 'bottom-left' ? 'left' : 'right';

  // ─── State ────────────────────────────────────────────────────────────────
  var panelOpen       = false;
  var readingGuideEl  = null;
  var guideActive     = false;
  var fontSize        = 100;
  var prefs           = loadPrefs();

  // ─── Font loader (link tag — @import invalid in injected style) ───────────
  function loadDyslexiaFont() {
    if (document.getElementById('hl-lexend-font')) return;
    var link = document.createElement('link');
    link.id   = 'hl-lexend-font';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;600&display=swap';
    document.head.appendChild(link);
  }

  // ─── CSS injection ────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('hl-ada-styles')) return;

    // Use very high specificity selectors to win against Elementor
    var css = [
      // ── Keyframes
      '@keyframes hlPulseRing{0%{transform:scale(1);opacity:.6}70%{transform:scale(1.4);opacity:0}100%{opacity:0}}',

      // ── Reading guide
      '#hl-ada-guide{position:fixed !important;left:0 !important;top:0 !important;width:100% !important;height:3px !important;background:rgba(30,60,138,.38) !important;pointer-events:none !important;z-index:' + (CONFIG.zIndex - 1) + ' !important;display:none !important;}',
      '#hl-ada-guide.hl-guide-on{display:block !important;}',

      // ── Launcher button — every property !important to defeat Elementor resets
      '#hl-ada-launcher{',
        'all:unset !important;',
        'display:flex !important;',
        'align-items:center !important;',
        'justify-content:center !important;',
        'position:fixed !important;',
        SIDE + ':24px !important;',
        'bottom:24px !important;',
        'width:60px !important;',
        'height:60px !important;',
        'border-radius:50% !important;',
        'background:radial-gradient(circle, #ffffff 62%, ' + CONFIG.primaryColor + ' 62%) !important;',
        'cursor:pointer !important;',
        'box-shadow:0 4px 20px rgba(30,60,138,.45) !important;',
        'z-index:' + CONFIG.zIndex + ' !important;',
        'border:none !important;',
        'padding:0 !important;',
        'margin:0 !important;',
        'outline:none !important;',
        'box-sizing:border-box !important;',
        'transition:background .2s, transform .15s, box-shadow .2s !important;',
      '}',
      '#hl-ada-launcher:hover{background:' + CONFIG.hoverColor + ' !important;transform:scale(1.08) !important;box-shadow:0 6px 28px rgba(30,60,138,.55) !important;}',
      '#hl-ada-launcher:focus-visible{outline:3px solid #f5c518 !important;outline-offset:3px !important;}',

      // SVG inside launcher — explicit sizing, no fill inheritance needed (fill set on elements)
      '#hl-ada-launcher svg,#hl-ada-launcher svg *{pointer-events:none !important;} #hl-ada-launcher svg{width:28px !important;height:28px !important;display:block !important;overflow:visible !important;}',

      // Pulse ring via separate div (not ::after — Elementor sometimes strips pseudo-elements)
      '#hl-ada-pulse{',
        'position:fixed !important;',
        SIDE + ':20px !important;',
        'bottom:20px !important;',
        'width:64px !important;',
        'height:64px !important;',
        'border-radius:50% !important;',
        'border:2px solid rgba(30,60,138,.4) !important;',
        'z-index:' + (CONFIG.zIndex - 1) + ' !important;',
        'pointer-events:none !important;',
        'animation:hlPulseRing 2.4s ease-out infinite !important;',
        'box-sizing:border-box !important;',
      '}',

      // ── Panel
      '#hl-ada-panel{',
        'all:initial !important;',
        'display:flex !important;',
        'flex-direction:column !important;',
        'position:fixed !important;',
        SIDE + ':24px !important;',
        'bottom:90px !important;',
        'width:318px !important;',
        'max-height:80vh !important;',
        'background:#fff !important;',
        'border-radius:12px !important;',
        'box-shadow:0 12px 48px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.08) !important;',
        'z-index:' + CONFIG.zIndex + ' !important;',
        'overflow:hidden !important;',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important;',
        'font-size:13px !important;',
        'color:#1a1a1a !important;',
        'border:1px solid rgba(30,60,138,.12) !important;',
        'opacity:0 !important;',
        'transform:translateY(14px) scale(.96) !important;',
        'pointer-events:none !important;',
        'transition:opacity .22s cubic-bezier(.4,0,.2,1),transform .22s cubic-bezier(.4,0,.2,1) !important;',
        'box-sizing:border-box !important;',
      '}',
      '#hl-ada-panel.hl-open{opacity:1 !important;transform:translateY(0) scale(1) !important;pointer-events:all !important;}',

      // Panel header
      '#hl-ada-panel #hl-ada-header{background:' + CONFIG.primaryColor + ' !important;padding:15px 16px 13px !important;display:flex !important;align-items:center !important;justify-content:space-between !important;flex-shrink:0 !important;box-sizing:border-box !important;}',
      '#hl-ada-panel .hl-hd-left{display:flex !important;align-items:center !important;gap:10px !important;}',
      '#hl-ada-panel .hl-hd-icon{width:36px !important;height:36px !important;background:#ffffff !important;border-radius:8px !important;display:flex !important;align-items:center !important;justify-content:center !important;flex-shrink:0 !important;padding:3px !important;}'
      + '#hl-ada-panel .hl-hd-icon img{display:block !important;width:28px !important;height:28px !important;object-fit:contain !important;max-width:100% !important;border:none !important;}',
      '#hl-ada-panel .hl-hd-icon svg{width:18px !important;height:18px !important;display:block !important;}',
      '#hl-ada-panel .hl-hd-text h2{font-size:14px !important;font-weight:700 !important;color:#fff !important;margin:0 !important;padding:0 !important;border:none !important;line-height:1.2 !important;background:none !important;}',
      '#hl-ada-panel .hl-hd-text p{font-size:10px !important;color:rgba(255,255,255,.65) !important;margin:2px 0 0 !important;padding:0 !important;letter-spacing:.04em !important;font-weight:500 !important;background:none !important;}',
      '#hl-ada-panel #hl-ada-close{all:unset !important;background:rgba(255,255,255,.15) !important;border-radius:50% !important;width:26px !important;height:26px !important;cursor:pointer !important;display:flex !important;align-items:center !important;justify-content:center !important;font-size:13px !important;color:#fff !important;transition:background .15s !important;flex-shrink:0 !important;box-sizing:border-box !important;}',
      '#hl-ada-panel #hl-ada-close:hover{background:rgba(255,255,255,.3) !important;}',

      // Panel body
      '#hl-ada-panel #hl-ada-body{overflow-y:auto !important;flex:1 !important;padding:14px 12px 10px !important;box-sizing:border-box !important;margin:0 !important;}',

      // Section labels
      '#hl-ada-panel .hl-sec{font-size:9.5px !important;font-weight:700 !important;letter-spacing:.1em !important;text-transform:uppercase !important;color:#aaa !important;margin:12px 2px 7px !important;display:block !important;visibility:visible !important;opacity:1 !important;height:auto !important;min-height:12px !important;line-height:1.4 !important;padding:0 !important;background:transparent !important;}',
      '#hl-ada-panel .hl-sec:first-child{margin-top:2px !important;}',

      // Grid
      '#hl-ada-panel .hl-grid{display:grid !important;grid-template-columns:1fr 1fr !important;gap:7px !important;margin:0 !important;padding:0 !important;width:100% !important;}',

      // Feature buttons
      '#hl-ada-panel .hl-btn{all:unset !important;display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:center !important;gap:5px !important;padding:11px 6px !important;border-radius:9px !important;border:1.5px solid #ebebeb !important;background:#f8f8f8 !important;cursor:pointer !important;transition:all .15s !important;min-height:72px !important;text-align:center !important;position:relative !important;box-sizing:border-box !important;width:100% !important;}',
      '#hl-ada-panel .hl-btn:hover{border-color:' + CONFIG.primaryColor + ' !important;background:#eef2fc !important;}',
      '#hl-ada-panel .hl-btn:focus-visible{outline:2px solid ' + CONFIG.primaryColor + ' !important;outline-offset:2px !important;}',
      '#hl-ada-panel .hl-btn.hl-on{border-color:' + CONFIG.primaryColor + ' !important;background:' + CONFIG.primaryColor + ' !important;}',
      '#hl-ada-panel .hl-btn.hl-on .hl-ico{color:#fff !important;}',
      '#hl-ada-panel .hl-btn.hl-on .hl-lbl{color:#fff !important;}',
      '#hl-ada-panel .hl-btn.hl-on::after{content:"✓" !important;position:absolute !important;top:5px !important;right:7px !important;font-size:9px !important;color:rgba(255,255,255,.7) !important;font-weight:700 !important;}',
      '#hl-ada-panel .hl-ico{font-size:19px !important;line-height:1 !important;color:' + CONFIG.primaryColor + ' !important;font-style:normal !important;font-weight:600 !important;transition:color .15s !important;}',
      '#hl-ada-panel .hl-lbl{font-size:10.5px !important;font-weight:600 !important;color:#333 !important;line-height:1.2 !important;transition:color .15s !important;visibility:visible !important;opacity:1 !important;display:block !important;margin:0 !important;padding:0 !important;}',

      // Stepper
      '#hl-ada-panel .hl-stepper{grid-column:span 2 !important;display:flex !important;align-items:center !important;justify-content:space-between !important;padding:10px 12px !important;border-radius:9px !important;border:1.5px solid #ebebeb !important;background:#f8f8f8 !important;gap:8px !important;box-sizing:border-box !important;}',
      '#hl-ada-panel .hl-step-lbl{font-size:10.5px !important;font-weight:600 !important;color:#333 !important;flex:1 !important;}',
      '#hl-ada-panel .hl-step-val{font-size:12px !important;font-weight:700 !important;color:' + CONFIG.primaryColor + ' !important;min-width:40px !important;text-align:center !important;}',
      '#hl-ada-panel .hl-step-btn{all:unset !important;width:26px !important;height:26px !important;border-radius:50% !important;border:1.5px solid ' + CONFIG.primaryColor + ' !important;background:#fff !important;color:' + CONFIG.primaryColor + ' !important;font-size:16px !important;font-weight:600 !important;cursor:pointer !important;display:flex !important;align-items:center !important;justify-content:center !important;transition:all .15s !important;line-height:1 !important;flex-shrink:0 !important;box-sizing:border-box !important;}',
      '#hl-ada-panel .hl-step-btn:hover{background:' + CONFIG.primaryColor + ' !important;color:#fff !important;}',

      // Reset button
      '#hl-ada-panel #hl-ada-reset{all:unset !important;display:flex !important;align-items:center !important;justify-content:center !important;gap:5px !important;width:100% !important;margin-top:10px !important;padding:9px !important;border-radius:8px !important;border:1.5px solid #e8e8e8 !important;background:#fff !important;color:#666 !important;font-size:11.5px !important;font-weight:600 !important;cursor:pointer !important;transition:all .15s !important;box-sizing:border-box !important;}',
      '#hl-ada-panel #hl-ada-reset:hover{border-color:' + CONFIG.primaryColor + ' !important;color:' + CONFIG.primaryColor + ' !important;background:#f0f4ff !important;}',

      // Footer
      '#hl-ada-panel #hl-ada-footer{padding:9px 14px !important;border-top:1px solid #f0f0f0 !important;text-align:center !important;flex-shrink:0 !important;background:#fafafa !important;display:flex !important;align-items:center !important;justify-content:center !important;gap:5px !important;box-sizing:border-box !important;}',
      '#hl-ada-panel #hl-ada-footer a{font-size:10px !important;color:#bbb !important;text-decoration:none !important;font-weight:500 !important;font-family:inherit !important;}',
      '#hl-ada-panel #hl-ada-footer a:hover{color:' + CONFIG.primaryColor + ' !important;}',
      '#hl-ada-panel #hl-ada-footer .hl-dot{color:#ddd !important;font-size:10px !important;}',
      '#hl-ada-panel #hl-ada-footer .hl-stmt{color:' + CONFIG.primaryColor + ' !important;font-weight:600 !important;}',

      // ── Applied body classes (no !important on body overrides — let cascade work)
      'body.hl-high-contrast,body.hl-high-contrast *{background-color:#000 !important;color:#ff0 !important;border-color:#ff0 !important;}',
      'body.hl-high-contrast a,body.hl-high-contrast a *{color:#0ff !important;}',
      'body.hl-high-contrast #hl-ada-launcher,body.hl-high-contrast #hl-ada-panel,body.hl-high-contrast #hl-ada-panel *,body.hl-high-contrast #hl-ada-pulse{background-color:unset !important;color:unset !important;border-color:unset !important;}',

      'body.hl-dark-mode{filter:invert(1) hue-rotate(180deg) !important;}',
      'body.hl-dark-mode img,body.hl-dark-mode video,body.hl-dark-mode iframe{filter:invert(1) hue-rotate(180deg) !important;}',
      'body.hl-dark-mode #hl-ada-panel,body.hl-dark-mode #hl-ada-launcher,body.hl-dark-mode #hl-ada-pulse{filter:invert(1) hue-rotate(180deg) !important;}',

      'body.hl-monochrome{filter:grayscale(100%) !important;}',
      'body.hl-monochrome #hl-ada-panel,body.hl-monochrome #hl-ada-launcher,body.hl-monochrome #hl-ada-pulse{filter:none !important;}',

      'body.hl-dyslexia,body.hl-dyslexia p,body.hl-dyslexia h1,body.hl-dyslexia h2,body.hl-dyslexia h3,body.hl-dyslexia h4,body.hl-dyslexia h5,body.hl-dyslexia h6,body.hl-dyslexia li,body.hl-dyslexia a,body.hl-dyslexia span,body.hl-dyslexia label,body.hl-dyslexia button,body.hl-dyslexia input,body.hl-dyslexia td{font-family:"Lexend",sans-serif !important;letter-spacing:.05em !important;word-spacing:.1em !important;}',

      'body.hl-text-spacing p,body.hl-text-spacing li,body.hl-text-spacing h1,body.hl-text-spacing h2,body.hl-text-spacing h3,body.hl-text-spacing td{letter-spacing:.12em !important;word-spacing:.16em !important;}',

      'body.hl-line-height p,body.hl-line-height li,body.hl-line-height td{line-height:1.9 !important;}',

      'body.hl-link-underline a{text-decoration:underline !important;text-decoration-thickness:2px !important;text-underline-offset:3px !important;}',

      'body.hl-pause-anim *,body.hl-pause-anim *::before,body.hl-pause-anim *::after{animation-play-state:paused !important;transition:none !important;}',

      'body.hl-large-cursor,body.hl-large-cursor *{cursor:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Cpath d=\'M5 3 L5 32 L12 25 L17 36 L22 34 L17 23 L26 23 Z\' fill=\'%23000\' stroke=\'%23fff\' stroke-width=\'2\'/%3E%3C/svg%3E") 5 3,auto !important;}',

      'body.hl-focus-high *:focus,body.hl-focus-high *:focus-visible{outline:3px solid #f5c518 !important;outline-offset:4px !important;box-shadow:0 0 0 6px rgba(245,197,24,.25) !important;}',

      // Mobile
      '@media(max-width:380px){#hl-ada-panel{width:calc(100vw - 20px) !important;' + SIDE + ':10px !important;}}'
    ].join('');

    var style = document.createElement('style');
    style.id  = 'hl-ada-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── Help Lawyer Logo — actual PNG embedded as base64 ────────────────────
  // The real logo is embedded directly. No external requests, no SVG tracing.
  // Button uses radial-gradient white center so logo reads on blue background.
  // filter: brightness(0) invert(1) NOT used — we keep the authentic blue logo.

  // Use WordPress-provided URL if available (cleaner), fall back to embedded base64
  var HL_LOGO_B64 = 'data:image/jpeg;base64,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';
  var HL_LOGO_SRC = (userConfig.logoUrl) ? userConfig.logoUrl : HL_LOGO_B64;

  // Button: just the img tag — CSS handles sizing and white circle background
  var ICON_SVG = '<img src="' + HL_LOGO_SRC + '" alt="" '
    + 'style="width:38px;height:38px;object-fit:contain;display:block;" '
    + 'aria-hidden="true">';

  // Panel header: logo in white rounded pill
  var ICON_SVG_SMALL = '<img src="' + HL_LOGO_SRC + '" alt="Help Lawyer" '
    + 'style="width:28px;height:28px;object-fit:contain;display:block;" '
    + 'aria-hidden="true">';

  // ── Panel header icon — background-image, immune to all:initial CSS reset
  var ICON_SVG_SMALL = '<div aria-hidden="true" style="width:26px;height:26px;display:block;background-image:url(\'' + HL_LOGO_SRC + '\');background-size:contain;background-repeat:no-repeat;background-position:center;flex-shrink:0;"></div>';
  // ─── Build Widget ──────────────────────────────────────────────────────────
  function buildWidget() {
    // Pulse ring (separate element — more reliable than ::after with Elementor)
    var pulse = document.createElement('div');
    pulse.id = 'hl-ada-pulse';
    pulse.setAttribute('aria-hidden', 'true');

    // Launcher
    var btn = document.createElement('button');
    btn.id   = 'hl-ada-launcher';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open Accessibility Options — ADA Shield by Help Lawyer');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'hl-ada-panel');
    btn.innerHTML = ICON_SVG;

    // Panel
    var panel = document.createElement('div');
    panel.id = 'hl-ada-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Accessibility Options');

    // Header
    var header = document.createElement('div');
    header.id = 'hl-ada-header';
    header.innerHTML = ''
      + '<div class="hl-hd-left">'
      +   '<div class="hl-hd-icon">' + ICON_SVG_SMALL + '</div>'
      +   '<div class="hl-hd-text"><h2>Accessibility Options</h2><p>ADA SHIELD · HELP LAWYER</p></div>'
      + '</div>'
      + '<button id="hl-ada-close" type="button" aria-label="Close accessibility panel">✕</button>';

    // Body
    var body = document.createElement('div');
    body.id = 'hl-ada-body';
    body.innerHTML = buildBodyHTML();

    // Footer
    var footer = document.createElement('div');
    footer.id = 'hl-ada-footer';
    var footerInner = '';
    if (CONFIG.statementUrl) {
      footerInner += '<a href="' + CONFIG.statementUrl + '" class="hl-stmt" target="_blank" rel="noopener">Accessibility Statement</a><span class="hl-dot">·</span>';
    }
    footerInner += '<a href="' + CONFIG.brandUrl + '" target="_blank" rel="noopener">ADA Shield</a><span class="hl-dot">·</span><a href="' + CONFIG.homeUrl + '" target="_blank" rel="noopener">Help Lawyer</a>';
    footer.innerHTML = footerInner;

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);

    document.body.appendChild(pulse);
    document.body.appendChild(btn);
    document.body.appendChild(panel);

    bindEvents(btn, panel);
  }

  function buildBodyHTML() {
    return ''
      // Visual
      + '<span class="hl-sec">Visual</span>'
      + '<div class="hl-grid">'
      +   '<div class="hl-stepper">'
      +     '<span class="hl-step-lbl">Text Size</span>'
      +     '<button class="hl-step-btn" type="button" data-dir="-1" aria-label="Decrease text size">−</button>'
      +     '<span class="hl-step-val" id="hl-font-val" aria-live="polite">100%</span>'
      +     '<button class="hl-step-btn" type="button" data-dir="1" aria-label="Increase text size">+</button>'
      +   '</div>'
      +   makeBtn('highContrast', '◑',  'High Contrast')
      +   makeBtn('darkMode',     '🌙', 'Dark Mode')
      +   makeBtn('monochrome',   '◻',  'Monochrome')
      + '</div>'
      // Reading
      + '<span class="hl-sec">Reading</span>'
      + '<div class="hl-grid">'
      +   makeBtn('dyslexia',     'Aa', 'Dyslexia Font')
      +   makeBtn('textSpacing',  'A⇥', 'Text Spacing')
      +   makeBtn('lineHeight',   '↕',  'Line Height')
      +   makeBtn('linkUnderline','<u style="color:inherit">A</u>', 'Underline Links', true)
      +   '<button class="hl-btn" type="button" data-feat="readingGuide" aria-pressed="false" aria-label="Toggle reading guide" style="grid-column:span 2">'
      +     '<span class="hl-ico" style="font-size:13px">▶────</span><span class="hl-lbl">Reading Guide</span>'
      +   '</button>'
      + '</div>'
      // Motor
      + '<span class="hl-sec">Motor &amp; Navigation</span>'
      + '<div class="hl-grid">'
      +   makeBtn('pauseAnim',    '⏸', 'Pause Animations')
      +   makeBtn('largeCursor',  '↖', 'Large Cursor')
      +   '<button class="hl-btn" type="button" data-feat="focusHigh" aria-pressed="false" aria-label="Toggle focus highlight" style="grid-column:span 2">'
      +     '<span class="hl-ico">⊡</span><span class="hl-lbl">Focus Highlight</span>'
      +   '</button>'
      + '</div>'
      + '<button id="hl-ada-reset" type="button" aria-label="Reset all settings">↺ &nbsp;Reset All Settings</button>';
  }

  function makeBtn(feat, icon, label, isHTML) {
    var iconContent = isHTML ? icon : icon;
    return '<button class="hl-btn" type="button" data-feat="' + feat + '" aria-pressed="false" aria-label="Toggle ' + label + '">'
      + '<span class="hl-ico">' + iconContent + '</span>'
      + '<span class="hl-lbl">' + label + '</span>'
      + '</button>';
  }

  // ─── Events ───────────────────────────────────────────────────────────────
  function bindEvents(btn, panel) {

    // CRITICAL: stopPropagation prevents Elementor eating the click
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      panelOpen ? closePanel(btn, panel) : openPanel(btn, panel);
    });

    document.getElementById('hl-ada-close').addEventListener('click', function (e) {
      e.stopPropagation();
      closePanel(btn, panel);
    });

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panelOpen) closePanel(btn, panel);
    });

    // Outside click
    document.addEventListener('click', function (e) {
      if (panelOpen && !panel.contains(e.target) && e.target !== btn) {
        closePanel(btn, panel);
      }
    });

    // Feature clicks (delegated)
    panel.addEventListener('click', function (e) {
      e.stopPropagation();

      var featBtn = e.target.closest('.hl-btn[data-feat]');
      if (featBtn) {
        toggleFeature(featBtn);
        return;
      }

      var stepBtn = e.target.closest('.hl-step-btn[data-dir]');
      if (stepBtn) {
        stepFontSize(parseInt(stepBtn.getAttribute('data-dir'), 10));
        return;
      }

      var resetBtn = e.target.closest('#hl-ada-reset');
      if (resetBtn) resetAll();
    });

    // Focus trap
    panel.addEventListener('keydown', trapFocus);
  }

  function openPanel(btn, panel) {
    panel.classList.add('hl-open');
    btn.setAttribute('aria-expanded', 'true');
    panelOpen = true;
    setTimeout(function () {
      var closeBtn = document.getElementById('hl-ada-close');
      if (closeBtn) closeBtn.focus();
    }, 60);
  }

  function closePanel(btn, panel) {
    panel.classList.remove('hl-open');
    btn.setAttribute('aria-expanded', 'false');
    panelOpen = false;
    btn.focus();
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    var panel = document.getElementById('hl-ada-panel');
    var els = Array.prototype.slice.call(
      panel.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return !el.disabled; });
    if (!els.length) return;
    if (e.shiftKey) {
      if (document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
    } else {
      if (document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
    }
  }

  // ─── Feature logic ────────────────────────────────────────────────────────
  var classMap = {
    highContrast:  'hl-high-contrast',
    darkMode:      'hl-dark-mode',
    monochrome:    'hl-monochrome',
    dyslexia:      'hl-dyslexia',
    textSpacing:   'hl-text-spacing',
    lineHeight:    'hl-line-height',
    linkUnderline: 'hl-link-underline',
    pauseAnim:     'hl-pause-anim',
    largeCursor:   'hl-large-cursor',
    focusHigh:     'hl-focus-high',
  };

  function toggleFeature(btn) {
    var feat   = btn.getAttribute('data-feat');
    var isOn   = btn.classList.toggle('hl-on');
    btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    prefs[feat] = isOn;
    savePrefs();

    if (feat === 'readingGuide') {
      isOn ? enableGuide() : disableGuide();
      return;
    }
    if (feat === 'dyslexia' && isOn) loadDyslexiaFont();
    if (classMap[feat]) document.body.classList.toggle(classMap[feat], isOn);
  }

  function stepFontSize(dir) {
    fontSize = Math.min(150, Math.max(90, fontSize + dir * 10));
    var valEl = document.getElementById('hl-font-val');
    if (valEl) valEl.textContent = fontSize + '%';
    document.documentElement.style.fontSize = fontSize + '%';
    prefs.fontSize = fontSize;
    savePrefs();
  }

  // ─── Reading guide ────────────────────────────────────────────────────────
  function enableGuide() {
    if (!readingGuideEl) {
      readingGuideEl = document.createElement('div');
      readingGuideEl.id = 'hl-ada-guide';
      readingGuideEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(readingGuideEl);
    }
    readingGuideEl.classList.add('hl-guide-on');
    if (!guideActive) {
      document.addEventListener('mousemove', moveGuide);
      guideActive = true;
    }
  }

  function disableGuide() {
    if (readingGuideEl) readingGuideEl.classList.remove('hl-guide-on');
    if (guideActive) {
      document.removeEventListener('mousemove', moveGuide);
      guideActive = false;
    }
  }

  function moveGuide(e) {
    if (readingGuideEl) readingGuideEl.style.setProperty('top', (e.clientY - 1) + 'px', 'important');
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  function resetAll() {
    Object.values ? Object.values(classMap).forEach(function (c) { document.body.classList.remove(c); })
                  : Object.keys(classMap).forEach(function (k) { document.body.classList.remove(classMap[k]); });
    document.documentElement.style.fontSize = '';
    fontSize = 100;
    var valEl = document.getElementById('hl-font-val');
    if (valEl) valEl.textContent = '100%';
    disableGuide();

    var panel = document.getElementById('hl-ada-panel');
    if (panel) {
      panel.querySelectorAll('.hl-btn.hl-on').forEach(function (b) {
        b.classList.remove('hl-on');
        b.setAttribute('aria-pressed', 'false');
      });
    }

    prefs = {};
    savePrefs();
  }

  // ─── Persistence ──────────────────────────────────────────────────────────
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}'); }
    catch (e) { return {}; }
  }

  function savePrefs() {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(prefs)); }
    catch (e) {}
  }

  // ─── Apply saved preferences on load ─────────────────────────────────────
  function applyAllSaved() {
    if (prefs.fontSize && prefs.fontSize !== 100) {
      fontSize = prefs.fontSize;
      document.documentElement.style.fontSize = fontSize + '%';
      var valEl = document.getElementById('hl-font-val');
      if (valEl) valEl.textContent = fontSize + '%';
    }

    var panel = document.getElementById('hl-ada-panel');
    Object.keys(prefs).forEach(function (feat) {
      if (feat === 'fontSize' || !prefs[feat]) return;

      if (feat === 'readingGuide') { enableGuide(); }
      if (feat === 'dyslexia') loadDyslexiaFont();
      if (classMap[feat]) document.body.classList.add(classMap[feat]);

      if (panel) {
        var btn = panel.querySelector('.hl-btn[data-feat="' + feat + '"]');
        if (btn) { btn.classList.add('hl-on'); btn.setAttribute('aria-pressed', 'true'); }
      }
    });
  }

  // ─── Screen reader baseline enhancements ──────────────────────────────────
  function applyBaseEnhancements() {
    // Skip link
    if (!document.getElementById('hl-skip-link')) {
      var main = document.querySelector('main,[role="main"],#main,#content,.main-content,#primary');
      if (main) {
        if (!main.id) main.id = 'hl-main-content';
        var skip = document.createElement('a');
        skip.id   = 'hl-skip-link';
        skip.href = '#' + main.id;
        skip.textContent = 'Skip to main content';
        skip.setAttribute('style', [
          'position:fixed', 'top:-60px', 'left:0',
          'z-index:' + (CONFIG.zIndex + 1),
          'background:' + CONFIG.primaryColor, 'color:#fff',
          'padding:8px 16px', 'font-size:14px', 'font-weight:600',
          'text-decoration:none', 'border-radius:0 0 6px 0',
          'transition:top .2s', 'font-family:sans-serif'
        ].join(';'));
        skip.addEventListener('focus', function () { skip.style.top = '0'; });
        skip.addEventListener('blur',  function () { skip.style.top = '-60px'; });
        document.body.insertBefore(skip, document.body.firstChild);
      }
    }

    // lang attribute
    if (!document.documentElement.getAttribute('lang')) {
      document.documentElement.setAttribute('lang', 'en');
    }

    // Images missing alt
    document.querySelectorAll('img:not([alt])').forEach(function (img) {
      img.setAttribute('alt', '');
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildWidget();
    applyAllSaved();
    applyBaseEnhancements();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);
