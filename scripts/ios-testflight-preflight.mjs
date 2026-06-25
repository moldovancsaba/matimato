import { accessSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';

const checks = [
  checkFullXcode(),
  checkSigningIdentities(),
  checkProvisioningProfiles(),
  checkAppStoreConnectCredentials(),
  checkExportOptions()
];

const failed = checks.filter((check) => !check.ok);
for (const check of checks) {
  console.log(`${check.ok ? 'ok' : 'missing'} - ${check.name}${check.detail ? `: ${check.detail}` : ''}`);
}

if (failed.length) {
  console.error('\nTestFlight preflight failed. Resolve every missing item before archive/upload.');
  process.exit(1);
}

function checkFullXcode() {
  const developerDir = process.env.DEVELOPER_DIR || '/Applications/Xcode.app/Contents/Developer';
  if (!existsSync(join(developerDir, 'usr/bin/xcodebuild'))) {
    return { ok: false, name: 'Full Xcode', detail: `${developerDir} does not contain xcodebuild` };
  }
  try {
    const version = execFileSync(join(developerDir, 'usr/bin/xcodebuild'), ['-version'], { encoding: 'utf8' }).trim().replace(/\n/g, ' ');
    return { ok: true, name: 'Full Xcode', detail: version };
  } catch (error) {
    return { ok: false, name: 'Full Xcode', detail: error instanceof Error ? error.message : 'xcodebuild failed' };
  }
}

function checkSigningIdentities() {
  try {
    const output = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], { encoding: 'utf8' });
    const valid = output.match(/Apple Distribution|iPhone Distribution|Apple Development|iPhone Developer/g) ?? [];
    if (!valid.length) return { ok: false, name: 'Code signing identity', detail: 'no Apple signing identity found in keychain' };
    return { ok: true, name: 'Code signing identity', detail: `${valid.length} Apple identity candidate(s)` };
  } catch (error) {
    return { ok: false, name: 'Code signing identity', detail: error instanceof Error ? error.message : 'security failed' };
  }
}

function checkProvisioningProfiles() {
  const profileDir = join(homedir(), 'Library/MobileDevice/Provisioning Profiles');
  if (!existsSync(profileDir)) return { ok: false, name: 'Provisioning profile', detail: `${profileDir} does not exist` };
  const profiles = readdirSync(profileDir).filter((file) => file.endsWith('.mobileprovision') || file.endsWith('.provisionprofile'));
  if (!profiles.length) return { ok: false, name: 'Provisioning profile', detail: 'no local provisioning profiles found' };
  return { ok: true, name: 'Provisioning profile', detail: `${profiles.length} local profile(s)` };
}

function checkAppStoreConnectCredentials() {
  const keyId = process.env.APP_STORE_CONNECT_API_KEY_ID;
  const issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID;
  const keyPath = process.env.APP_STORE_CONNECT_API_KEY_PATH;
  if (!keyId || !issuerId || !keyPath) {
    return { ok: false, name: 'App Store Connect API credentials', detail: 'set APP_STORE_CONNECT_API_KEY_ID, APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_API_KEY_PATH' };
  }
  try {
    accessSync(keyPath);
    return { ok: true, name: 'App Store Connect API credentials', detail: 'API key id, issuer id, and private key path are present' };
  } catch {
    return { ok: false, name: 'App Store Connect API credentials', detail: `cannot read ${keyPath}` };
  }
}

function checkExportOptions() {
  return existsSync('ios/exportOptions.plist')
    ? { ok: true, name: 'Export options', detail: 'ios/exportOptions.plist present' }
    : { ok: false, name: 'Export options', detail: 'ios/exportOptions.plist missing' };
}
