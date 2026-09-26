document.addEventListener('DOMContentLoaded', () => {
    const privacyToggle = document.getElementById('toggle-privacy');
    const phishingToggle = document.getElementById('toggle-phishing');

    // Load initial state
    chrome.storage.local.get(['privacyEnabled', 'phishingEnabled'], (result) => {
        privacyToggle.checked = result.privacyEnabled !== undefined ? result.privacyEnabled : true;
        phishingToggle.checked = result.phishingEnabled !== undefined ? result.phishingEnabled : true;
    });

    // Save state on toggle
    privacyToggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ privacyEnabled: e.target.checked });
    });
    
    phishingToggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ phishingEnabled: e.target.checked });
    });

    // Manual scan button (Fixed Context Isolation Bug)
    document.getElementById('scan-now').addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "forceScan" }, (response) => {
                    if (chrome.runtime.lastError) {
                        alert("Please refresh the page first. SafeWeb AI needs to inject its scripts.");
                    } else {
                        // Just change button text temporarily to show feedback
                        const btn = document.getElementById('scan-now');
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '✅ Scanning...';
                        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                    }
                });
            }
        });
    });
});
