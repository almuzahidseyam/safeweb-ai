import { assessURL } from './url-check.js';

async function checkTab(tabId, url) {
    const { phishingEnabled = true } = await chrome.storage.local.get('phishingEnabled');
    const reasons = phishingEnabled ? assessURL(url).reasons : [];
    try { await chrome.tabs.sendMessage(tabId, { action: 'urlWarning', url, reasons }); }
    catch { /* Restricted pages or a document that navigated before delivery. */ }
}

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (change.status === 'complete' || change.url) void checkTab(tabId, tab.url || change.url);
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message.action !== 'checkURL' || !sender.tab?.id) return false;
    // The browser supplies the sender URL; page data cannot choose another tab.
    checkTab(sender.tab.id, sender.url || sender.tab.url).then(() => reply({ ok: true }));
    return true;
});
chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local' || !changes.phishingEnabled) return;
    for (const tab of await chrome.tabs.query({})) void checkTab(tab.id, tab.url);
});
