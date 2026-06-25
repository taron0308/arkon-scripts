// ARKON MAIN CODE
// Requires these libraries loaded before this file:
// lottie-web, GSAP, ScrollTrigger, SplitType.
// Requires arkon-translations.js loaded before this file.

// Inject styles that were previously in Webflow Footer <style> tags.
(function () {
  const css = "/* SplitType responsive fix:\n   words stay whole, so translated Armenian/Russian headings wrap by words, not letters */\n.split-word,\n.word {\n  display: inline-block;\n  white-space: nowrap;\n}\n\n.split-char,\n.char {\n  display: inline-block;\n}\n\n#my-text-1,\n#my-text-2,\n#my-text-3,\n#my-text-4,\n[data-split-text=\"true\"] {\n  word-break: normal;\n  overflow-wrap: normal;\n  hyphens: none;\n}\n\n.is-active-language {\n  opacity: 0.5;\n  pointer-events: none;\n}\n\n.slider-image-wrap{overflow:hidden}\n.slider-zoom-image{width:100%;height:100%;object-fit:cover;transform:scale(1);will-change:transform}";
  if (!css || document.getElementById('arkon-external-main-styles')) return;
  const style = document.createElement('style');
  style.id = 'arkon-external-main-styles';
  style.textContent = css;
  document.head.appendChild(style);
})();


(function () {
  const lottieUrl = 'https://cdn.prod.website-files.com/6a328a07dbff5b64e53d4f84/6a328b69f876d2a30c2400b5_c6965982d404004d0d52c79975d9013b_Flow%201.json';
  const loader = document.querySelector('.loader-wrapper');
  let anim;
  let currentPercent = 0;
  let targetPercent = 30;
  let progressInterval;

  function hideLoader() {
    if (loader) {
      loader.style.transition = 'transform 0.8s cubic-bezier(0.77, 0, 0.175, 1)';
      loader.style.transform = 'translateY(-100%)';
      setTimeout(function () { loader.style.display = 'none'; }, 800);
    }
  }

  function startSmoothProgress() {
    if (progressInterval) return;
    progressInterval = setInterval(function () {
      let distance = targetPercent - currentPercent;
      let speed = 0.3;
      if (distance > 0) speed += distance * 0.04;
      currentPercent += speed;
      if (currentPercent >= targetPercent && targetPercent < 90) targetPercent += 0.5;

      if (anim && anim.totalFrames) {
        const totalFrames = anim.totalFrames;
        const targetFrame = (Math.min(currentPercent, 95) / 100) * totalFrames;
        anim.goToAndStop(targetFrame, true);
      }

      if (currentPercent >= 95 && targetPercent >= 95) {
        clearInterval(progressInterval);
        setTimeout(hideLoader, 200);
      }
    }, 16);
  }

  function updateProgressGoal() {
    if (document.readyState === 'loading') targetPercent = 30;
    else if (document.readyState === 'interactive') targetPercent = 70;
    else if (document.readyState === 'complete') targetPercent = 95;
  }

  function initLottieImmediate() {
    const container = document.getElementById('lottie-container');
    if (!container || anim || !window.lottie) return;

    anim = lottie.loadAnimation({
      container: container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      path: lottieUrl
    });

    anim.addEventListener('DOMLoaded', function () {
      updateProgressGoal();
      startSmoothProgress();
    });
  }

  const checkContainer = setInterval(function () {
    if (document.getElementById('lottie-container') && window.lottie) {
      clearInterval(checkContainer);
      initLottieImmediate();
    }
  }, 10);

  document.addEventListener('readystatechange', updateProgressGoal);
  window.addEventListener('load', updateProgressGoal);
})();

(function () {
  const STORAGE_KEY = 'siteLanguage';
  const DEFAULT_LANG = 'en';
  const languageLabels = { en: 'EN', ru: 'RU', hy: 'HY' };
  const translations = window.arkonTranslations || {};

  // Elements that use letter animation. Keep your real IDs here.
  const splitTargetIds = ['my-text-1', 'my-text-2', 'my-text-3', 'my-text-4'];

  let splitInstances = [];
  let splitTweens = [];
  let nodeRecords = [];
  let attrRecords = [];

  function normalizeText(value) {
    return String(value || '')
      .replace(/ /g, ' ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isExcludedElement(element) {
    if (!element || element.nodeType !== 1) return true;
    return !!element.closest(
      'script, style, noscript, svg, canvas, iframe, [data-no-i18n], [data-lang], [data-current-lang]'
    );
  }

  function buildAnyLanguageIndex() {
    const index = Object.create(null);
    Object.keys(translations).forEach((lang) => {
      const dict = translations[lang] || {};
      Object.keys(dict).forEach((key) => {
        const normalized = normalizeText(dict[key]);
        if (normalized && !index[normalized]) index[normalized] = key;
      });
    });
    return index;
  }

  const anyTextToKey = buildAnyLanguageIndex();

  function revertSplitAnimation() {
    splitTweens.forEach((tween) => {
      try { tween.kill(); } catch (e) {}
    });
    splitTweens = [];

    if (window.ScrollTrigger) {
      splitTargetIds.forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;
        ScrollTrigger.getAll().forEach((trigger) => {
          if (trigger.trigger === element) trigger.kill();
        });
      });
    }

    splitInstances.forEach((instance) => {
      try { instance.revert(); } catch (e) {}
    });
    splitInstances = [];
  }

  function cacheTextNodes() {
    nodeRecords = [];
    if (!document.body) return;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || isExcludedElement(parent)) return NodeFilter.FILTER_REJECT;
          const text = normalizeText(node.nodeValue);
          if (!text || !anyTextToKey[text]) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const originalText = node.nodeValue || '';
      const key = anyTextToKey[normalizeText(originalText)];
      if (!key) continue;
      nodeRecords.push({
        node,
        key,
        leading: (originalText.match(/^\s*/) || [''])[0],
        trailing: (originalText.match(/\s*$/) || [''])[0]
      });
    }

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      if (isExcludedElement(element)) return;
      const key = element.getAttribute('data-i18n');
      if (!key) return;
      Array.from(element.childNodes).forEach((node) => {
        if (node.nodeType !== Node.TEXT_NODE || !normalizeText(node.nodeValue)) return;
        const originalText = node.nodeValue || '';
        nodeRecords.push({
          node,
          key,
          leading: (originalText.match(/^\s*/) || [''])[0],
          trailing: (originalText.match(/\s*$/) || [''])[0]
        });
      });
    });
  }

  function cacheAttributes() {
    attrRecords = [];
    const attrs = ['placeholder', 'title', 'alt', 'aria-label'];

    document.querySelectorAll('body *').forEach((element) => {
      if (isExcludedElement(element)) return;
      attrs.forEach((attr) => {
        if (!element.hasAttribute(attr)) return;
        const value = element.getAttribute(attr) || '';
        const key = anyTextToKey[normalizeText(value)];
        if (key) attrRecords.push({ element, attr, key });
      });
    });
  }

  function updateCurrentLanguage(lang) {
    document.querySelectorAll('[data-current-lang]').forEach((element) => {
      element.textContent = languageLabels[lang] || String(lang).toUpperCase();
    });

    document.querySelectorAll('[data-lang]').forEach((element) => {
      const itemLang = element.getAttribute('data-lang');
      const isActive = itemLang === lang;
      element.classList.toggle('is-active-language', isActive);
      if (isActive) element.setAttribute('aria-current', 'true');
      else element.removeAttribute('aria-current');
    });
  }

  function applyLanguageOnly(lang) {
    if (!translations[lang]) lang = DEFAULT_LANG;
    const dictionary = translations[lang] || {};

    nodeRecords.forEach((record) => {
      const value = dictionary[record.key];
      if (!value) return;
      if (record.node && record.node.nodeType === Node.TEXT_NODE) {
        record.node.nodeValue = record.leading + value + record.trailing;
      }
    });

    attrRecords.forEach((record) => {
      const value = dictionary[record.key];
      if (value) record.element.setAttribute(record.attr, value);
    });

    updateCurrentLanguage(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }

  function initSplitAnimation() {
    if (!window.gsap || !window.SplitType) return;
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    splitTargetIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      element.setAttribute('data-split-text', 'true');

      const split = new SplitType(element, {
        types: 'words, chars',
        tagName: 'span',
        wordClass: 'split-word',
        charClass: 'split-char'
      });
      splitInstances.push(split);

      const tween = gsap.from(split.chars, {
        scrollTrigger: window.ScrollTrigger ? {
          trigger: element,
          start: 'top 85%',
          toggleActions: 'play none none none'
        } : undefined,
        opacity: 0,
        y: 30,
        duration: 0.6,
        stagger: 0.03,
        ease: 'power2.out'
      });

      splitTweens.push(tween);
    });
  }

  function setLanguage(lang) {
    revertSplitAnimation();
    cacheTextNodes();
    cacheAttributes();
    applyLanguageOnly(lang);
    initSplitAnimation();
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  function bindDropdown() {
    document.querySelectorAll('[data-lang]').forEach((button) => {
      if (button.getAttribute('data-i18n-bound') === 'true') return;
      button.setAttribute('data-i18n-bound', 'true');
      button.addEventListener('click', function (event) {
        event.preventDefault();
        setLanguage(button.getAttribute('data-lang'));
      });
    });
  }

  function init() {
    bindDropdown();
    setLanguage(localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG);
  }

  window.setArkonLanguage = setLanguage;
  window.arkonRefreshI18n = function () {
    bindDropdown();
    setLanguage(localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG);
  };
  window.arkonI18nDebug = function () {
    revertSplitAnimation();
    const missing = [];
    document.querySelectorAll('body *').forEach((element) => {
      if (isExcludedElement(element)) return;
      if (element.children.length > 0) return;
      const text = normalizeText(element.textContent);
      if (text && !anyTextToKey[text]) missing.push(text);
    });
    initSplitAnimation();
    const unique = [...new Set(missing)].slice(0, 200);
    console.table(unique);
    return unique;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

(function () {
  const ABOUT_PATCH_KEY = 'siteLanguage';

  const aboutPatchMap = {
    "Fonudation": {
      ru: "Основание",
      hy: "Հիմնադրում",
      en: "Foundation"
    },
    "Building expertise and strong foundations in construction": {
      ru: "Формирование экспертизы и прочной основы в строительстве.",
      hy: "Փորձագիտության և շինարարության ամուր հիմքերի ձևավորում։",
      en: "Building expertise and strong foundations in construction."
    },
    "Expanding capabilities and delivering complex projects": {
      ru: "Расширение возможностей и реализация сложных проектов.",
      hy: "Հնարավորությունների ընդլայնում և բարդ նախագծերի իրականացում։",
      en: "Expanding capabilities and delivering complex projects."
    },
    "Committed to innovation responsibility and progress.": {
      ru: "Приверженность инновациям, ответственности и прогрессу.",
      hy: "Հանձնառություն նորարարությանը, պատասխանատվությանը և առաջընթացին։",
      en: "Committed to innovation, responsibility and progress."
    },
    "Our mission is to deliver high quality work": {
      ru: "Наша миссия — выполнять работу высокого качества",
      hy: "Մեր առաքելությունն է մատուցել բարձրորակ աշխատանք",
      en: "Our mission is to deliver high-quality work"
    },
    "Iquam egestas. Ridiculus aliquam nunc felis sed aliquam id. Molestie sit accumsan vitae amet tortor pharetra. Lectus a tellus sed amet. Cras dolor est.": {
      ru: "Arkon создаёт водную инфраструктуру через точное проектирование, надёжное строительство и ответственное долгосрочное выполнение. Компания сосредоточена на качестве, безопасности и системах, которые будут служить сообществам годами.",
      hy: "Arkon-ը ստեղծում է ջրային ենթակառուցվածք՝ ճշգրիտ ինժեներական աշխատանքի, հուսալի շինարարության և պատասխանատու երկարաժամկետ իրականացման միջոցով։ Ընկերությունը կենտրոնացած է որակի, անվտանգության և այնպիսի համակարգերի վրա, որոնք տարիներ շարունակ կծառայեն համայնքներին։",
      en: "Arkon delivers water infrastructure through precise engineering, reliable construction and responsible long-term execution. The company is focused on quality, safety and systems built to serve communities for years."
    },
    "Earning confidence through integrity and relability.": {
      ru: "Заслуживаем доверие через честность и надёжность.",
      hy: "Վաստակում ենք վստահություն ազնվության և հուսալիության միջոցով։",
      en: "Earning confidence through integrity and reliability."
    }
  };

  const records = [];

  function normalizeText(value) {
    return String(value || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isExcludedElement(element) {
    if (!element || element.nodeType !== 1) return true;
    return !!element.closest(
      "script, style, noscript, svg, canvas, iframe, [data-no-i18n], [data-lang], [data-current-lang]"
    );
  }

  function cacheAboutPatchNodes() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || isExcludedElement(parent)) return NodeFilter.FILTER_REJECT;

          const text = normalizeText(node.nodeValue);
          if (!aboutPatchMap[text]) return NodeFilter.FILTER_REJECT;

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const original = normalizeText(node.nodeValue);

      if (!records.some((record) => record.node === node)) {
        records.push({
          node: node,
          original: original,
          leading: (node.nodeValue.match(/^\s*/) || [""])[0],
          trailing: (node.nodeValue.match(/\s*$/) || [""])[0]
        });
      }
    }
  }

  function applyAboutPatch(lang) {
    const selectedLang = lang || localStorage.getItem(ABOUT_PATCH_KEY) || "en";

    records.forEach((record) => {
      const replacement = aboutPatchMap[record.original]?.[selectedLang];

      if (replacement && record.node && record.node.nodeType === Node.TEXT_NODE) {
        record.node.nodeValue = record.leading + replacement + record.trailing;
      }
    });
  }

  function initAboutPatch() {
    cacheAboutPatchNodes();
    applyAboutPatch();

    const originalSetArkonLanguage = window.setArkonLanguage;

    if (typeof originalSetArkonLanguage === "function" && !window.__aboutPatchWrapped) {
      window.__aboutPatchWrapped = true;

      window.setArkonLanguage = function (lang) {
        originalSetArkonLanguage(lang);

        setTimeout(function () {
          cacheAboutPatchNodes();
          applyAboutPatch(lang);
        }, 50);
      };
    }

    document.querySelectorAll("[data-lang]").forEach((button) => {
      button.addEventListener("click", function () {
        const lang = button.getAttribute("data-lang");

        setTimeout(function () {
          cacheAboutPatchNodes();
          applyAboutPatch(lang);
        }, 100);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAboutPatch);
  } else {
    initAboutPatch();
  }
})();

window.addEventListener("load",()=>{if(!window.gsap)return;document.querySelectorAll(".w-slider").forEach(slider=>{let active=-1;function visibleIndex(){let mask=slider.querySelector(".w-slider-mask"),slides=[...slider.querySelectorAll(".w-slide")];if(!mask)return 0;let m=mask.getBoundingClientRect(),center=m.left+m.width/2,best=0,dist=1e9;slides.forEach((s,i)=>{let r=s.getBoundingClientRect(),c=r.left+r.width/2,d=Math.abs(c-center);if(d<dist){dist=d;best=i}});return best}function run(){let i=visibleIndex();if(i===active)return;active=i;[...slider.querySelectorAll(".w-slide")].forEach((s,n)=>{let img=s.querySelector(".slider-zoom-image");if(!img)return;gsap.killTweensOf(img);gsap.set(img,{scale:1,transformOrigin:"center center"});if(n===i)gsap.to(img,{scale:1.12,duration:7,ease:"none"})})}setInterval(run,150);setTimeout(run,500);slider.addEventListener("click",()=>setTimeout(run,300))})});

// Note: custom next.click autoplay was removed from this file.
// Use Webflow's native Slider autoplay instead to avoid double/autoplay conflicts.
