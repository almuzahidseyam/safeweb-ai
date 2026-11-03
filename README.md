# SafeWeb AI

Experimental browser tools for local image blurring and explainable URL warnings.

SafeWeb runs a bundled NSFWJS MobileNetV2 model in the browser. It blurs an image
when a Porn, Hentai or Sexy classification reaches 0.70. URL warnings use simple,
documented rules: embedded credentials, IP-address hosts, or a very long domain
with several hyphens. These rules are **not a trained phishing model**, and do
not provide a probability that a page is malicious. No warning means no matching
rule; it does not establish safety.

## Install

Use Node.js 22.13.0 and npm 10/11 (the model package's supported build environment).

```sh
npm ci
npm run build
```

In Chrome or Edge, open the extensions page, enable Developer mode, choose
**Load unpacked**, and select the generated **dist** directory. Reload tabs that
were already open. A release ZIP contains the same built extension; extract it
before loading. There is no separate model-download step or API key.

## Use

Open the extension popup to enable image blur or URL warnings. The page status
distinguishes a ready model, loading, disabled, unavailable, and failed scans.
**Scan images again** retries failed images and model initialization. Disabling
image blur restores the original inline filter. Re-enabling scans the page again.

The warning dialog explains the matched address patterns. You can leave to a
blank page or continue. It is an advisory overlay after a page loads, not a
network-level blocker. Legitimate development servers using an IP address also
trigger this warning.

## Limits and privacy

- Model weights, scripts and inference are local. SafeWeb does not upload images,
  browsing history or scan results; only the two toggle preferences are persisted.
- The extension does not fetch page-selected URLs in its privileged background
  worker. Images whose pixels are unavailable because of cross-origin restrictions
  are counted as unavailable; they are not silently labeled safe.
- Only ordinary HTTP(S) pages and loaded images at least 50×50 pixels are scanned.
  Browser internal pages, videos, CSS backgrounds, closed shadow roots, iframes
  and some protected pages are outside this implementation's coverage.
- Classification is serialized, inputs are resized to 224×224, and the pending
  queue is capped at 200 images. More images are picked up in later batches.
- The model can miss content or blur harmless images. Content may appear before
  inference completes. This is not parental control, malware protection or a
  guarantee that content stays hidden from a page that changes its own styles.
- Browser page access is needed for the content script; tab access reads URLs
  for warnings and popup status. There is no arbitrary image-download permission.

## Verify changes

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm audit
```

Unit tests cover source parsing, failed scan retries, stale predictions, disable
and re-enable behavior, queue bounds, and URL rules. The browser test installs the
actual built extension in a temporary Chromium profile, performs real model
inference on a generated geometric image, checks warnings/toggles/popup, and
rejects external model requests. CI runs these checks before packaging a release.

Source code lives in `src/`, popup assets in `popup/`, and reproducible build
instructions in `scripts/build.mjs`. Generated output is excluded from Git.

## Dependencies and license

Application code: [MIT](LICENSE). Dependencies retain their respective licenses;
the build includes linked legal notices alongside the bundle. Model and API:
[NSFWJS](https://github.com/infinitered/nsfwjs),
[TensorFlow.js](https://github.com/tensorflow/tfjs).
