import test from 'node:test';
import assert from 'node:assert/strict';
import { createScanner } from '../src/scanner.js';
import { assessURL } from '../src/url-check.js';
const tick = () => new Promise(resolve => setImmediate(resolve));
const explicit = [{ className: 'Porn', probability: .9 }];
function fixture(classify) {
    const scanner = createScanner({ classify, sourceOf: i => i.src, eligible: i => i.connected !== false,
        blur: i => i.blurred = true, restore: i => i.blurred = false });
    scanner.setEnabled(true); return scanner;
}
test('URL heuristics explain suspicious syntax without interpreting @ in path as credentials', () => {
    assert.equal(assessURL('https://example.org/@someone').reasons.length, 0);
    assert.equal(assessURL('https://trusted.example@evil.example/').reasons.length, 1);
    assert.equal(assessURL('http://127.0.0.1/').reasons.length, 1);
    assert.equal(assessURL('https://[::1]/').reasons.length, 1);
    for (const value of ['bad', 'chrome://extensions', 'https://example.org']) assert.deepEqual(assessURL(value), { reasons: [] });
});
test('failed classifications remain unavailable and manual retry can recover', async () => {
    let calls = 0; const scanner = fixture(async () => { if (++calls === 1) throw new Error('tainted canvas'); return explicit; });
    const image = { src: 'one' }; scanner.enqueue(image); await tick();
    assert.equal(scanner.status().scanned, 0); assert.equal(scanner.status().failed, 1);
    scanner.enqueue(image); await tick(); assert.equal(calls, 1);
    scanner.enqueue(image, true); await tick(); assert.equal(image.blurred, true); assert.equal(scanner.status().scanned, 1);
});
test('turning off invalidates an in-flight prediction and restores already blurred images', async () => {
    let resolve; const scanner = fixture(() => new Promise(r => resolve = r));
    const image = { src: 'one' }; scanner.enqueue(image); scanner.setEnabled(false); resolve(explicit); await tick();
    assert.notEqual(image.blurred, true); assert.equal(scanner.status().scanned, 0);
    scanner.setEnabled(true); scanner.enqueue(image); resolve(explicit); await tick(); assert.equal(image.blurred, true);
    scanner.setEnabled(false); assert.equal(image.blurred, false);
});
test('recycled image cannot receive an old source verdict; re-enable rescans cached images', async () => {
    let resolve; const scanner = fixture(() => new Promise(r => resolve = r));
    const image = { src: 'old' }; scanner.enqueue(image); image.src = 'new'; resolve(explicit); await tick();
    assert.notEqual(image.blurred, true); assert.equal(scanner.status().scanned, 0);
    scanner.enqueue(image); resolve(explicit); await tick(); assert.equal(image.blurred, true);
    scanner.setEnabled(false); scanner.setEnabled(true); scanner.enqueue(image); resolve(explicit); await tick();
    assert.equal(image.blurred, true); assert.equal(scanner.status().scanned, 1);
});
test('classification is serialized and pending queue stays bounded', async () => {
    let resolve, active = 0, peak = 0;
    const scanner = fixture(() => { active++; peak = Math.max(peak, active); return new Promise(r => resolve = () => { active--; r(explicit); }); });
    for (let n = 0; n < 1000; n++) scanner.enqueue({ src: String(n) });
    assert.equal(scanner.status().pending, 201); assert.equal(peak, 1);
    scanner.setEnabled(false); resolve(); await tick(); assert.equal(scanner.status().pending, 0);
});
test('invalid and low-confidence model responses never blur an image', async () => {
    for (const predictions of [[], [{ className: 'Porn', probability: NaN }], [{ className: 'Porn', probability: .4 }]]) {
        const scanner = fixture(async () => predictions), image = { src: 'one' };
        scanner.enqueue(image); await tick(); assert.notEqual(image.blurred, true);
        assert.equal(scanner.status().scanned, predictions[0]?.probability === .4 ? 1 : 0);
    }
});
