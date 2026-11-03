const privacy = document.getElementById('toggle-privacy');
const phishing = document.getElementById('toggle-phishing');
const status = document.getElementById('status');
const scan = document.getElementById('scan-now');
let tabId;
const settings = await chrome.storage.local.get(['privacyEnabled', 'phishingEnabled']);
privacy.checked = settings.privacyEnabled !== false; phishing.checked = settings.phishingEnabled !== false;
privacy.onchange = () => chrome.storage.local.set({ privacyEnabled: privacy.checked });
phishing.onchange = () => chrome.storage.local.set({ phishingEnabled: phishing.checked });
async function refresh(action = 'getStatus') {
    try {
        if (!tabId) throw new Error('No tab');
        const result = await chrome.tabs.sendMessage(tabId, { action });
        scan.disabled = !result.enabled || result.model === 'loading';
        if (!result.enabled) status.textContent = 'Image blur is off.';
        else if (result.model === 'loading') status.textContent = 'Loading the local image model…';
        else if (result.model !== 'ready') status.textContent = 'Image model unavailable. Try scanning again or reload the page.';
        else status.textContent = `${result.scanned} scans completed · ${result.blurred} images blurred · ${result.failed} scans unavailable${result.pending ? ' · scanning…' : ''}`;
    } catch { status.textContent = 'Unavailable on this page. Open a regular web page, or reload an existing tab after installation.'; scan.disabled = true; }
}
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); tabId = tab?.id;
scan.onclick = () => refresh('forceScan');
await refresh(); setInterval(refresh, 1000);
