export function createScanner({ classify, sourceOf, eligible, blur, restore, onChange = () => {} }) {
    let enabled = false, generation = 0, running = false, records = new WeakMap();
    let scanned = 0, failed = 0;
    const queue = new Set(), blurred = new Set();
    function restoreAll() { for (const image of blurred) restore(image); blurred.clear(); }
    async function drain() {
        if (running) return;
        running = true;
        try {
            while (enabled && queue.size) {
                const image = queue.values().next().value; queue.delete(image);
                const source = sourceOf(image), epoch = generation;
                if (!eligible(image)) continue;
                const previous = records.get(image);
                if (previous?.source === source && previous.status === 'done') continue;
                try {
                    const predictions = await classify(image);
                    if (!enabled || epoch !== generation || sourceOf(image) !== source || !eligible(image)) continue;
                    if (!Array.isArray(predictions) || !predictions.length || predictions.some(p => !Number.isFinite(p.probability))) throw new Error('Invalid predictions');
                    const explicit = predictions.some(p => ['Porn', 'Hentai', 'Sexy'].includes(p.className) && p.probability >= 0.7);
                    if (explicit) { blur(image); blurred.add(image); }
                    else { restore(image); blurred.delete(image); }
                    records.set(image, { source, status: 'done' }); scanned++;
                } catch {
                    if (enabled && epoch === generation && sourceOf(image) === source) {
                        records.set(image, { source, status: 'error' }); failed++;
                    }
                }
                for (const item of blurred) if (!eligible(item)) { restore(item); blurred.delete(item); }
                onChange();
            }
        } finally { running = false; onChange(); }
    }
    return {
        setEnabled(value) {
            enabled = value; generation++; queue.clear(); records = new WeakMap(); scanned = 0; failed = 0;
            restoreAll(); onChange();
        },
        enqueue(image, retry = false) {
            if (!enabled || !eligible(image) || queue.size >= 200) return;
            const record = records.get(image), source = sourceOf(image);
            if (record?.source === source && (!retry || record.status === 'done')) return;
            queue.add(image); void drain();
        },
        status: () => ({ enabled, scanned, failed, pending: queue.size + Number(running), blurred: blurred.size }),
    };
}
