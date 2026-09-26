// SafeWeb AI Content Script
if (!window.safewebInitialized) {
    window.safewebInitialized = true;

    console.log("SafeWeb AI: Privacy Protector initialized.");

    let model = null;
    let isPrivacyEnabled = true;

    async function initModel() {
        try {
            console.log("SafeWeb AI: Loading NSFWJS Model...");
            model = await nsfwjs.load();
            console.log("SafeWeb AI: Model loaded successfully.");
            scanImages();
        } catch (err) {
            console.error("SafeWeb AI: Failed to load model. CSP block likely.", err);
        }
    }

    async function classifyAndBlur(imageElement, targetElementToBlur) {
        try {
            const predictions = await model.classify(imageElement);
            const topPrediction = predictions[0].className;
            
            if (topPrediction === 'Porn' || topPrediction === 'Hentai' || topPrediction === 'Sexy') {
                targetElementToBlur.style.setProperty('filter', 'blur(40px)', 'important');
                targetElementToBlur.style.setProperty('transition', 'filter 0.3s ease-in-out', 'important');
                targetElementToBlur.dataset.safewebBlurred = "true";
            } else {
                // Ensure safe images are unblurred in case it's a recycled img tag
                if (targetElementToBlur.dataset.safewebBlurred === "true") {
                    targetElementToBlur.style.removeProperty('filter');
                    delete targetElementToBlur.dataset.safewebBlurred;
                }
            }
        } catch (e) {
            // Ignore
        }
    }

    async function checkAndBlurImage(img) {
        if (!model || img.dataset.safewebScanned === img.src) return;
        if (img.width < 50 || img.height < 50) return;
        if (!img.complete || img.naturalWidth === 0) return;

        // Bind scan to this exact src to handle src-swapping
        img.dataset.safewebScanned = img.src;

        try {
            await classifyAndBlur(img, img);
        } catch (err) {
            if (err.name === 'SecurityError' || (err.message && err.message.toLowerCase().includes('tainted'))) {
                chrome.runtime.sendMessage({ action: "fetchImageAsDataURI", url: img.src }, (response) => {
                    if (response && response.success && response.dataURI) {
                        const tempImg = new Image();
                        tempImg.src = response.dataURI;
                        tempImg.onload = async () => {
                            // Only apply if the src hasn't changed while fetching!
                            if (img.src === img.dataset.safewebScanned) {
                                await classifyAndBlur(tempImg, img);
                            }
                        };
                    }
                });
            }
        }
    }

    function scanImages() {
        if (!isPrivacyEnabled || !model) return;
        const images = document.getElementsByTagName('img');
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (img.complete) {
                checkAndBlurImage(img);
            } else {
                img.addEventListener('load', () => checkAndBlurImage(img), { once: true });
            }
        }
    }

    const observer = new MutationObserver((mutations) => {
        if (!isPrivacyEnabled || !model) return;
        
        for (let i = 0; i < mutations.length; i++) {
            const mutation = mutations[i];
            
            // Handle src attribute swaps (e.g., Image Carousels, React recycling tags)
            if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                const img = mutation.target;
                if (img.complete) checkAndBlurImage(img);
                else img.addEventListener('load', () => checkAndBlurImage(img), { once: true });
                continue;
            }

            // Handle newly added DOM nodes
            if (mutation.type === 'childList') {
                const addedNodes = mutation.addedNodes;
                for (let j = 0; j < addedNodes.length; j++) {
                    const node = addedNodes[j];
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IMG') {
                            if (node.complete) checkAndBlurImage(node);
                            else node.addEventListener('load', () => checkAndBlurImage(node), { once: true });
                        }
                        
                        const newImages = node.getElementsByTagName('img');
                        for (let k = 0; k < newImages.length; k++) {
                            const img = newImages[k];
                            if (img.complete) checkAndBlurImage(img);
                            else img.addEventListener('load', () => checkAndBlurImage(img), { once: true });
                        }
                    }
                }
            }
        }
    });

    // Added attributeFilter for 'src' to catch dynamically changing images
    observer.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
    });

    chrome.storage.local.get(['privacyEnabled'], (result) => {
        if (result.privacyEnabled !== undefined) {
            isPrivacyEnabled = result.privacyEnabled;
        }
        if (isPrivacyEnabled) {
            initModel();
        }
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.privacyEnabled) {
            isPrivacyEnabled = changes.privacyEnabled.newValue;
            if (isPrivacyEnabled && !model) {
                initModel();
            } else if (!isPrivacyEnabled) {
                const blurredImages = document.querySelectorAll('img[data-safeweb-blurred="true"]');
                blurredImages.forEach(img => {
                    img.style.removeProperty('filter');
                    delete img.dataset.safewebBlurred;
                });
            }
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "forceScan") {
            scanImages();
            sendResponse({status: "scanning"});
        }
        
        if (request.action === "showPhishingWarning") {
            if (document.getElementById('safeweb-phishing-alert')) return;
            
            const warningDiv = document.createElement('div');
            warningDiv.id = 'safeweb-phishing-alert';
            warningDiv.style.cssText = \
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background-color: rgba(220, 38, 38, 0.98); color: white; z-index: 2147483647;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-family: sans-serif; text-align: center; padding: 20px; backdrop-filter: blur(10px);
            \;
            
            const riskPct = (request.risk * 100).toFixed(1);
            
            warningDiv.innerHTML = \
                <h1 style="font-size: 54px; margin-bottom: 10px; font-weight: 900;">⚠️ DANGER</h1>
                <h2 style="font-size: 26px; margin-bottom: 20px; font-weight: 600;">Suspicious Website Detected</h2>
                <p style="font-size: 18px; max-width: 600px; margin-bottom: 40px; line-height: 1.6;">
                    SafeWeb AI's Machine Learning engine analyzed this URL and found strong indicators of a phishing or scam attack.<br>
                    <strong>Risk Score: \%</strong>
                </p>
                <div style="display: flex; gap: 20px;">
                    <button id="safeweb-go-back" style="padding: 14px 28px; font-size: 16px; font-weight: bold; cursor: pointer; background: white; color: #dc2626; border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        Take Me Back (Safe)
                    </button>
                    <button id="safeweb-ignore" style="padding: 14px 28px; font-size: 16px; cursor: pointer; background: transparent; color: white; border: 2px solid white; border-radius: 8px; font-weight: 500;">
                        I trust this site (Proceed)
                    </button>
                </div>
            \;
            
            document.body.appendChild(warningDiv);
            
            document.getElementById('safeweb-go-back').addEventListener('click', () => {
                window.history.back();
                setTimeout(() => { window.location.href = 'https://www.google.com'; }, 500);
            });
            
            document.getElementById('safeweb-ignore').addEventListener('click', () => {
                warningDiv.remove();
            });
        }
    });
}
