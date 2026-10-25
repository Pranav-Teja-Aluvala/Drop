import {readFileSync,readdirSync,statSync} from 'node:fs';import path from 'node:path';
import {execFileSync} from 'node:child_process';
const patterns=[['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['AWS access key',/\bAKIA[A-Z0-9]{16}\b/],['GitHub token',/\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],['OpenAI-style token',/\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/]];
let scanned=0,findings=[];function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','test-results','design'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory()){walk(p);continue;}if(e.name==='scan-secrets.mjs'||! /\.(?:mjs|ts|tsx|html|json|md|txt|css|js|env)$/.test(e.name)&&!e.name.startsWith('.env'))continue;if(statSync(p).size>3000000)continue;const text=readFileSync(p,'utf8');scanned++;for(const [type,pattern]of patterns)if(pattern.test(text))findings.push({file:p,type});}}
walk('.');
let history;
if(process.argv.includes('--history')){
  // Inspect diffs without printing matching values or raw Git output.
  const commits=Number(execFileSync('git',['rev-list','--count','--all'],{encoding:'utf8'}).trim());
  const changes=execFileSync('git',['log','--all','--format=','--no-ext-diff','-p'],{encoding:'utf8',maxBuffer:64*1024*1024});
  const matches=patterns.filter(([,pattern])=>pattern.test(changes)).map(([type])=>({type}));
  history={commits,findings:matches};
}
console.log(JSON.stringify({scanned,findings,...(history?{history}:{}),note:`Pattern-based scan only; no entropy scan. ${history?'Reachable Git commit diffs checked with the same patterns.':'Git history not checked.'}`},null,2));
if(findings.length||history?.findings.length)process.exitCode=1;
