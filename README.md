# 🛡️ SafeWeb AI

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-lightgrey.svg)
![Tech](https://img.shields.io/badge/Tech-TensorFlow.js%20%7C%20Manifest%20V3-orange.svg)

An **All-in-One AI-powered Web Security & Privacy Extension** that runs entirely locally in your browser. SafeWeb AI utilizes client-side Machine Learning to protect you from phishing attacks and automatically censors sensitive images to protect your privacy.

## ✨ Features

* 🎣 **Phishing & Scam Detector:** Real-time URL feature extraction and ML-based Logistic Regression risk scoring. Instantly blocks suspicious and malicious websites using a highly optimized Background Service Worker.
* 🖼️ **Privacy Protector (NSFW Blur):** Uses **TensorFlow.js** and **NSFWJS (MobileNet)** to scan and classify images on the fly. Automatically blurs explicit, hentai, or sexy content.
* ⚡ **Enterprise-Grade Optimization:** 
  * Advanced SPA (Single Page Application) routing support.
  * Cross-Origin Resource Sharing (CORS) bypassing via Base64 Data URIs.
  * O(N) optimized DOM MutationObservers for infinite-scroll websites (Twitter, Reddit).
* 🔒 **100% Privacy:** Zero external server dependencies. All Machine Learning models execute locally on your device.

## 🚀 Installation (Developer Mode)

1. Clone or download this repository.
2. Open Google Chrome or Microsoft Edge and navigate to chrome://extensions/.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the safeweb-ai directory.
5. Pin the extension and enjoy browsing safely!

## 🛠️ Architecture
* **Manifest V3**: Fully compliant with the latest Chrome extension standards.
* **UI**: Modern, clean popup interface designed with Tailwind CSS.
* **ML Stack**: TensorFlow.js (tfjs), NSFWJS.

---
*Developed as an advanced experimental cybersecurity tool.*
