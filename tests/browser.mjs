import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const server = createServer((req, res) => {
    if (req.url === '/image.svg') {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="white"/><circle cx="48" cy="48" r="24" fill="navy"/></svg>');
    }
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Extension test fixture</title><h1>Local test</h1><img src="/image.svg" alt="A blue circle">');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const profile = await mkdtemp(join(tmpdir(), 'safeweb-test-'));
let context;
try {
    const extension = resolve('dist');
    context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: true,
        args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).hostname;
    const page = await context.newPage(), errors = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    context.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:')) external.push(request.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const status = () => worker.evaluate(async () => {
        const [tab] = await chrome.tabs.query({ url: 'http://127.0.0.1/*' });
        return chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
    });
    let current;
    for (let n = 0; n < 120; n++) {
        try { current = await status(); } catch { /* Document initialization. */ }
        if (current?.model === 'unavailable') throw new Error('Bundled image model failed to initialize');
        if (current?.model === 'ready' && current.scanned >= 1) break;
        await new Promise(r => setTimeout(r, 500));
    }
    assert.equal(current?.model, 'ready'); assert.ok(current.scanned >= 1, JSON.stringify(current));
    assert.equal(current.failed, 0);
    assert.equal(await page.locator('#safeweb-url-warning').count(), 1, 'IP URL gets a warning after content script is ready');
    await worker.evaluate(() => chrome.storage.local.set({ privacyEnabled: false, phishingEnabled: false }));
    await page.waitForFunction(() => !document.getElementById('safeweb-url-warning'));
    assert.equal((await status()).enabled, false);
    await worker.evaluate(() => chrome.storage.local.set({ privacyEnabled: true }));
    for (let n = 0; n < 40 && (await status()).scanned < 1; n++) await new Promise(r => setTimeout(r, 100));
    assert.equal((await status()).scanned, 1, 'Re-enabling rescans the image');
    const popup = await context.newPage(); await page.bringToFront();
    await popup.goto(`chrome-extension://${id}/popup/popup.html`);
    await popup.waitForFunction(() => !document.getElementById('status').textContent.includes('Checking availability'));
    await mkdir('test-results', { recursive: true });
    await popup.screenshot({ path: 'test-results/popup.png', fullPage: true });
    assert.equal(await popup.getByLabel('Image blur').isChecked(), true);
    assert.equal(await popup.getByLabel('URL warnings').isChecked(), false);
    assert.deepEqual(errors, []); assert.deepEqual(external, [], 'Model and scripts must load without external requests');
    console.log('Unpacked extension: worker, actual model inference, warning, toggles, popup and local-only assets passed.');
} finally {
    await context?.close(); await new Promise(r => server.close(r));
    // Only the uniquely generated temporary browser profile is removed.
    await rm(profile, { recursive: true, force: true });
}
