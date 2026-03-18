'use strict';

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {

    let output: vscode.OutputChannel = vscode.window.createOutputChannel("Jenkins Pipeline Linter");

    let lastInput: string;

    let validate = vscode.commands.registerCommand('jenkins.pipeline.linter.connector.validate', async () => {

        let url = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.url') as string | undefined;
        let user = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.user') as string | undefined;
        let pass = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.pass') as string | undefined;
        let token = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.token') as string | undefined;
        let crumbUrl = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.crumbUrl') as string | undefined;
        let strictssl = vscode.workspace.getConfiguration().get('jenkins.pipeline.linter.connector.strictssl') as boolean;

        if (url === undefined || url.length === 0) {
            url = await vscode.window.showInputBox({ prompt: 'Enter Jenkins Pipeline Linter Url.', value: lastInput });
        }
        if ((user !== undefined && user.length > 0) && (pass === undefined || pass.length === 0) && (token === undefined || token.length === 0)) {
            pass = await vscode.window.showInputBox({ prompt: 'Enter password.', password: true });
            if (pass === undefined || pass.length === 0) {
                token = await vscode.window.showInputBox({ prompt: 'Enter token.', password: false });
            }
        }
        if (url !== undefined && url.length > 0) {
            lastInput = url;

            if (crumbUrl !== undefined && crumbUrl.length > 0) {
                requestCrumb(url, crumbUrl, user, pass, token, strictssl, output);
            } else {
                validateRequest(url, user, pass, token, undefined, strictssl, output);
            }
        } else {
            output.appendLine('Jenkins Pipeline Linter Url is not defined.');
        }
        output.show(true);
    });
    context.subscriptions.push(validate);
}

function buildAuthHeaders(user: string | undefined, pass: string | undefined, token: string | undefined): Record<string, string> {
    const headers: Record<string, string> = {};
    if (user !== undefined && user.length > 0) {
        if (pass !== undefined && pass.length > 0) {
            headers['Authorization'] = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
        } else if (token !== undefined && token.length > 0) {
            headers['Authorization'] = 'Basic ' + Buffer.from(user + ':' + token).toString('base64');
        }
    }
    return headers;
}

function httpRequest(requestUrl: string, method: string, headers: Record<string, string>, strictssl: boolean, body?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(requestUrl);
        const isHttps = parsed.protocol === 'https:';
        const lib = isHttps ? https : http;

        const options: https.RequestOptions = {
            method: method,
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            headers: headers,
            rejectUnauthorized: strictssl
        };

        const req = lib.request(options, (res) => {
            const chunks: string[] = [];
            res.on('data', (chunk: Buffer) => {
                chunks.push(chunk.toString());
            });
            res.on('end', () => {
                resolve(chunks.join(''));
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body !== undefined) {
            req.write(body);
        }
        req.end();
    });
}

function requestCrumb(url: string, crumbUrl: string, user: string | undefined, pass: string | undefined, token: string | undefined, strictssl: boolean, output: vscode.OutputChannel) {
    const headers = buildAuthHeaders(user, pass, token);

    httpRequest(crumbUrl, 'GET', headers, strictssl).then((body) => {
        validateRequest(url, user, pass, token, body, strictssl, output);
    }).catch((err) => {
        output.appendLine(String(err));
    });
}

function validateRequest(url: string, user: string | undefined, pass: string | undefined, token: string | undefined, crumb: string | undefined, strictssl: boolean, output: vscode.OutputChannel) {
    output.clear();
    let activeTextEditor = vscode.window.activeTextEditor;
    if (activeTextEditor !== undefined) {
        let path = activeTextEditor.document.uri.fsPath;
        let content = fs.readFileSync(path, 'utf8');

        const headers: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...buildAuthHeaders(user, pass, token)
        };

        if (crumb !== undefined && crumb.length > 0) {
            let crumbSplit = crumb.split(':');
            headers['Jenkins-Crumb'] = crumbSplit[1];
        }

        const body = 'jenkinsfile=' + encodeURIComponent(content);

        httpRequest(url, 'POST', headers, strictssl, body).then((responseBody) => {
            output.appendLine(responseBody);
        }).catch((err) => {
            output.appendLine(String(err));
        });
    } else {
        output.appendLine('No active text editor. Open the jenkinsfile you want to validate.');
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}
