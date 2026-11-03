import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const dir of ['src', 'popup', 'scripts']) for (const file of readdirSync(dir).filter(name => /\.m?js$/.test(name))) {
    test(`source parses: ${dir}/${file}`, () => {
        const result = spawnSync(process.execPath, ['--check', `${dir}/${file}`], { encoding: 'utf8', windowsHide: true });
        assert.equal(result.status, 0, result.stderr);
    });
}
