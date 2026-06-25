import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';

const ipaPath = process.env.MATIMATO_IPA_PATH ?? 'build/ios/export/Matimato.ipa';
const keyId = process.env.APP_STORE_CONNECT_API_KEY_ID;
const issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID;
const sourceKeyPath = process.env.APP_STORE_CONNECT_API_KEY_PATH;

if (!existsSync(ipaPath)) fail(`Missing IPA at ${ipaPath}. Run npm run ios:archive && npm run ios:export first.`);
if (!keyId || !issuerId || !sourceKeyPath) fail('Set APP_STORE_CONNECT_API_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, and APP_STORE_CONNECT_API_KEY_PATH.');
if (!existsSync(sourceKeyPath)) fail(`Cannot read APP_STORE_CONNECT_API_KEY_PATH at ${sourceKeyPath}.`);

const keyDir = join(homedir(), '.appstoreconnect/private_keys');
const targetKeyPath = join(keyDir, `AuthKey_${keyId}.p8`);
mkdirSync(keyDir, { recursive: true, mode: 0o700 });
copyFileSync(sourceKeyPath, targetKeyPath);

execFileSync('xcrun', [
  'altool',
  '--upload-app',
  '--type',
  'ios',
  '--file',
  ipaPath,
  '--apiKey',
  keyId,
  '--apiIssuer',
  issuerId
], { stdio: 'inherit' });

function fail(message) {
  console.error(message);
  process.exit(1);
}
