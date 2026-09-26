console.log("SafeWeb AI: Background service worker initialized (Vanilla JS version).");

let isPhishingEnabled = true;

const weights = [1.5, 4.0, 3.5, 1.2, -1.5];
const bias = -1.5;

// Prevent redundant scans and memory leaks
const lastScannedUrls = {};

// Clean up memory when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    delete lastScannedUrls[tabId];
});

function extractURLFeatures(urlStr) {
    try {
        const url = new URL(urlStr);
        const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(url.hostname) ? 1 : 0;
        const hasAt = urlStr.includes('@') ? 1 : 0;
        const domainLen = url.hostname.length > 30 ? 1 : 0;
        const hyphenCount = (url.hostname.match(/-/g) || []).length > 1 ? 1 : 0;
        const isHttps = url.protocol === 'https:' ? 1 : 0;
        
        return [domainLen, isIp, hasAt, hyphenCount, isHttps];
    } catch(e) {
        return [0, 0, 0, 0, 1];
    }
}

function predictPhishing(features) {
    let logit = bias;
    for (let i = 0; i < features.length; i++) {
        logit += features[i] * weights[i];
    }
    return 1 / (1 + Math.exp(-logit));
}

function checkTabPhishing(tabId, url) {
    if (!isPhishingEnabled || !url || !url.startsWith('http')) return;
    
    // Prevent double-execution bug for the same URL
    if (lastScannedUrls[tabId] === url) return;
    lastScannedUrls[tabId] = url;
    
    const features = extractURLFeatures(url);
    const riskScore = predictPhishing(features);
    
    if (riskScore > 0.70) {
        chrome.tabs.sendMessage(tabId, { action: "showPhishingWarning", risk: riskScore }, () => {
            chrome.runtime.lastError;
        });
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        checkTabPhishing(tabId, changeInfo.url);
    } else if (changeInfo.status === 'complete' && tab.url) {
        checkTabPhishing(tabId, tab.url);
    }
});

chrome.storage.local.get(['phishingEnabled'], (res) => {
    if (res.phishingEnabled !== undefined) isPhishingEnabled = res.phishingEnabled;
});
chrome.storage.onChanged.addListener((changes) => {
    if (changes.phishingEnabled) isPhishingEnabled = changes.phishingEnabled.newValue;
});

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function isSafeUrl(urlStr) {
    try {
        const url = new URL(urlStr);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
        const forbiddenHostnames = ['localhost', '127.0.0.1', '::1'];
        if (forbiddenHostnames.includes(url.hostname)) return false;
        return true;
    } catch(e) {
        return false;
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchImageAsDataURI") {
        if (!isSafeUrl(request.url)) {
            console.error("SafeWeb AI: Security Block - Attempted to fetch unsafe URL:", request.url);
            sendResponse({ success: false, error: "Unsafe URL blocked to prevent SSRF." });
            return false;
        }

        fetch(request.url)
            .then(res => {
                if (!res.ok) throw new Error("Fetch failed");
                return res.arrayBuffer().then(buffer => ({buffer, type: res.headers.get('content-type') || 'image/jpeg'}));
            })
            .then(({buffer, type}) => {
                sendResponse({ success: true, dataURI: \data:\;base64,\\ });
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; 
    }
});
