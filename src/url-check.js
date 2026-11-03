// Transparent URL heuristics, not a trained phishing model or a safety verdict.
export function assessURL(value) {
    try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) return { reasons: [] };
        const reasons = [];
        if (url.username || url.password) reasons.push('The address contains embedded credentials.');
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) || url.hostname.startsWith('[')) reasons.push('The address uses an IP address instead of a domain name.');
        if (url.hostname.length > 30 && (url.hostname.match(/-/g) || []).length >= 2) reasons.push('The domain is unusually long and contains several hyphens.');
        return { reasons };
    } catch { return { reasons: [] }; }
}
