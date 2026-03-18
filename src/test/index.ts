import * as path from 'path';
import * as Mocha from 'mocha';
import { readdirSync } from 'fs';

export function run(): Promise<void> {
    const mocha = new Mocha({ ui: 'tdd', color: true });
    const testsRoot = __dirname;

    return new Promise((resolve, reject) => {
        readdirSync(testsRoot)
            .filter(f => f.endsWith('.test.js'))
            .forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        mocha.run(failures => {
            if (failures > 0) {
                reject(new Error(`${failures} tests failed.`));
            } else {
                resolve();
            }
        });
    });
}
