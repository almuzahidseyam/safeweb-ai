import { load } from 'nsfwjs/core';
import { MobileNetV2Model } from 'nsfwjs/models/mobilenet_v2';
import * as tf from '@tensorflow/tfjs';
import { createScanner } from './scanner.js';

if (!globalThis.safewebInitialized) {
    globalThis.safewebInitialized = true;
    let model, loading, modelState = 'off', enabled = false, warning, warningURL = '', lastDismissed = '';
    const originals = new WeakMap();
    const sourceOf = image => image.currentSrc || image.src;
    const scanner = createScanner({
        onChange: () => { if (enabled && model && !scanner.status().pending) scheduleScan(); },
        sourceOf,
        eligible: image => image.isConnected && image.complete && image.naturalWidth >= 50 && image.naturalHeight >= 50,
        classify: async image => {
            // Bound tensor dimensions, even for a very large page image.
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 224;
            canvas.getContext('2d').drawImage(image, 0, 0, 224, 224);
            return model.classify(canvas);
        },
        blur: image => {
            if (!originals.has(image)) originals.set(image, [image.style.getPropertyValue('filter'), image.style.getPropertyPriority('filter')]);
            image.style.setProperty('filter', 'blur(40px)', 'important');
        },
        restore: image => {
            const original = originals.get(image);
            if (!original) return;
            if (image.style.getPropertyValue('filter') === 'blur(40px)') {
                if (original[0]) image.style.setProperty('filter', ...original);
                else image.style.removeProperty('filter');
            }
            originals.delete(image);
        },
    });
    function scan(retry = false) {
        if (enabled && model) for (const image of document.images) scanner.enqueue(image, retry);
    }
    async function configure(value) {
        enabled = value; scanner.setEnabled(value);
        if (!value) { modelState = 'off'; return; }
        if (!model) {
            modelState = 'loading';
            try {
                loading ||= (async () => { await tf.ready(); return load('MobileNetV2', { modelDefinitions: [MobileNetV2Model] }); })();
                model = await loading;
            } catch { loading = null; modelState = enabled ? 'unavailable' : 'off'; return; }
        }
        modelState = enabled ? 'ready' : 'off'; scan();
    }
    let scheduled;
    function scheduleScan() {
        clearTimeout(scheduled);
        scheduled = setTimeout(() => scan(), 150);
    }
    new MutationObserver(scheduleScan).observe(document.documentElement, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'sizes'],
    });
    document.addEventListener('load', event => {
        if (event.target instanceof HTMLImageElement && enabled && model) scanner.enqueue(event.target);
    }, true);
    window.addEventListener('resize', scheduleScan);
    chrome.storage.local.get('privacyEnabled').then(({ privacyEnabled = true }) => configure(privacyEnabled));
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.privacyEnabled) void configure(changes.privacyEnabled.newValue !== false);
    });
    function showWarning(message) {
        if (message.url !== location.href) return;
        if (warning && warningURL !== message.url) { warning.remove(); warning = null; }
        if (!message.reasons?.length) { warning?.remove(); warning = null; return; }
        if (warning || lastDismissed === message.url) return;
        warning = document.createElement('div');
        warning.id = 'safeweb-url-warning';
        warningURL = message.url;
        const shadow = warning.attachShadow({ mode: 'closed' });
        shadow.innerHTML = `<style>
            :host { all: initial; position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: #111827aa; padding: 24px; box-sizing: border-box; }
            section { font: 16px/1.6 system-ui,sans-serif; color: #20252e; background: white; padding: 28px; max-width: 480px; border-radius: 12px; box-shadow: 0 12px 40px #0003; }
            h2 { margin: 0 0 12px; font-size: 23px; } p { margin: 12px 0; } ul { padding-left: 22px; }
            footer { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; } button { font: inherit; cursor: pointer; padding: 9px 15px; border: 1px solid #aeb7c5; border-radius: 6px; background: white; color: #20252e; } button:first-child { background: #25394c; color: white; } button:focus-visible { outline: 3px solid #7966a3; outline-offset: 3px; }
        </style><section role="alertdialog" aria-modal="true" aria-labelledby="title" aria-describedby="description" tabindex="-1">
            <h2 id="title">Check this address before continuing</h2><ul></ul>
            <p id="description">These are URL warning signs, not proof of phishing. SafeWeb cannot confirm whether this page is safe.</p>
            <footer><button id="leave">Leave page</button><button id="continue">Continue anyway</button></footer>
        </section>`;
        for (const reason of message.reasons) { const item = document.createElement('li'); item.textContent = reason; shadow.querySelector('ul').append(item); }
        const previous = document.activeElement;
        const buttons = [...shadow.querySelectorAll('button')];
        const dismiss = () => { lastDismissed = message.url; warning?.remove(); warning = null; previous?.focus(); };
        buttons[0].onclick = () => location.replace('about:blank'); buttons[1].onclick = dismiss;
        shadow.addEventListener('keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
            if (event.key === 'Tab') { event.preventDefault(); buttons[shadow.activeElement === buttons[0] ? 1 : 0].focus(); }
        });
        document.documentElement.append(warning); buttons[0].focus();
    }
    chrome.runtime.onMessage.addListener((message, sender, reply) => {
        if (message.action === 'urlWarning') showWarning(message);
        if (message.action === 'forceScan') {
            if (enabled && modelState === 'unavailable') void configure(true);
            else scan(true);
        }
        if (['forceScan', 'getStatus'].includes(message.action)) reply({ ...scanner.status(), model: modelState });
    });
    chrome.runtime.sendMessage({ action: 'checkURL' }).catch(() => {});
}
