import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const projectRoot = path.resolve(process.cwd());
const localConfigPath = path.join(projectRoot, '.local', 'wechat-ci', 'config.json');
const ciSdkVersion = '2.1.31';
const ciSdkRoot = path.join(projectRoot, '.local', 'wechat-ci-sdk');
const ciSdkEntry = path.join(ciSdkRoot, 'node_modules', 'miniprogram-ci', 'dist', 'index.js');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} 不存在: ${filePath}`);
  }
}

function normalizeCiModule(moduleValue) {
  return moduleValue.default || moduleValue;
}

async function loadMiniProgramCi() {
  try {
    return normalizeCiModule(await import('miniprogram-ci'));
  } catch (error) {
    if (!error || error.code !== 'ERR_MODULE_NOT_FOUND') {
      throw error;
    }
  }

  if (!fs.existsSync(ciSdkEntry)) {
    fs.mkdirSync(ciSdkRoot, { recursive: true });
    console.log(`miniprogram-ci 未安装在项目依赖中，将按需安装到 .local/wechat-ci-sdk (v${ciSdkVersion})`);
    execFileSync('npm', ['install', '--prefix', ciSdkRoot, '--no-audit', '--no-fund', `miniprogram-ci@${ciSdkVersion}`], {
      cwd: projectRoot,
      stdio: 'inherit',
    });
  }

  ensureFile(ciSdkEntry, 'miniprogram-ci SDK');
  return normalizeCiModule(await import(pathToFileURL(ciSdkEntry).href));
}

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      result[key] = true;
      continue;
    }
    result[key] = next;
    index += 1;
  }

  return result;
}

function resolveConfig(overrides) {
  ensureFile(localConfigPath, '本地 CI 配置');
  const baseConfig = readJson(localConfigPath);

  return {
    appid: String(overrides.appid || baseConfig.appid || ''),
    projectPath: path.resolve(String(overrides.projectPath || baseConfig.projectPath || projectRoot)),
    privateKeyPath: path.resolve(String(overrides.privateKeyPath || baseConfig.privateKeyPath || '')),
    robot: Number(overrides.robot || baseConfig.robot || 1),
    uploadVersion: String(overrides.version || baseConfig.uploadVersion || ''),
    uploadDesc: String(overrides.desc || baseConfig.uploadDesc || ''),
    previewDesc: String(overrides.desc || baseConfig.previewDesc || baseConfig.uploadDesc || ''),
    qrcodeOutputDest: path.resolve(
      String(overrides.qrcodeOutputDest || baseConfig.qrcodeOutputDest || path.join(projectRoot, 'miniprogram-ci-qrcode.png')),
    ),
  };
}

function createProject(config, ci) {
  ensureFile(config.privateKeyPath, '上传密钥');
  ensureFile(path.join(config.projectPath, 'project.config.json'), 'project.config.json');

  return new ci.Project({
    appid: config.appid,
    type: 'miniProgram',
    projectPath: config.projectPath,
    privateKeyPath: config.privateKeyPath,
    ignores: ['node_modules/**/*', '.local/**/*', 'dist-preview/**/*'],
  });
}

function buildSetting() {
  return {
    useProjectConfig: true,
  };
}

async function runUpload(config) {
  if (!config.uploadVersion) {
    throw new Error('缺少上传版本号，请在 .local/wechat-ci/config.json 或命令行 --version 中提供');
  }

  const ci = await loadMiniProgramCi();
  const result = await ci.upload({
    project: createProject(config, ci),
    version: config.uploadVersion,
    desc: config.uploadDesc,
    robot: config.robot,
    setting: buildSetting(),
    onProgressUpdate: console.log,
  });

  console.log(JSON.stringify(result, null, 2));
}

async function runPreview(config) {
  const outputDir = path.dirname(config.qrcodeOutputDest);
  fs.mkdirSync(outputDir, { recursive: true });

  const ci = await loadMiniProgramCi();
  const result = await ci.preview({
    project: createProject(config, ci),
    desc: config.previewDesc,
    robot: config.robot,
    setting: buildSetting(),
    qrcodeFormat: 'image',
    qrcodeOutputDest: config.qrcodeOutputDest,
    onProgressUpdate: console.log,
  });

  console.log(JSON.stringify(result, null, 2));
  console.log(`二维码已输出到: ${config.qrcodeOutputDest}`);
}

async function main() {
  const [command = 'upload', ...restArgs] = process.argv.slice(2);
  const args = parseArgs(restArgs);
  const config = resolveConfig(args);

  if (!config.appid) {
    throw new Error('缺少 appid，请在 .local/wechat-ci/config.json 中配置');
  }

  if (command === 'upload') {
    await runUpload(config);
    return;
  }

  if (command === 'preview') {
    await runPreview(config);
    return;
  }

  throw new Error(`不支持的命令: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
