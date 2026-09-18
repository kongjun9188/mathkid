/**
 * 构建配置一致性校验
 * 检查 workflow、gradle 配置、资源文件三者之间是否对得上，
 * 这些地方对不上时 GitHub Actions 会报很难懂的错。
 */
const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/HP/WorkBuddy/2026-09-18-15-57-31/mathkid';

let pass = 0, fail = 0, warn = 0;
const ok = (n, c, e) => { if (c) { console.log('  OK   ' + n); pass++; } else { console.log(' FAIL  ' + n + (e ? '  << ' + e : '')); fail++; } };
const warnFn = (n, d) => { console.log(' WARN  ' + n + (d ? '  << ' + d : '')); warn++; };

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const yml = read('.github/workflows/build-apk.yml');
const appGradle = read('app/build.gradle');
const rootGradle = read('build.gradle');
const settings = read('settings.gradle');
const manifest = read('app/src/main/AndroidManifest.xml');
const gradleProps = read('gradle.properties');

console.log('=== 1. Workflow 文件结构 ===');
ok('有 name 字段', /^name:\s*Build APK/m.test(yml));
ok('有 on 触发器', /^on:/m.test(yml));
ok('有 workflow_dispatch（可手动触发）', yml.includes('workflow_dispatch'));
ok('runs-on 已指定', yml.includes('runs-on: ubuntu-latest'));
ok('使用 checkout@v4', yml.includes('actions/checkout@v4'));
ok('使用 setup-java@v4', yml.includes('actions/setup-java@v4'));
ok('JDK 版本为 17', yml.includes("java-version: '17'"));
ok('使用 setup-gradle@v3', yml.includes('gradle/actions/setup-gradle@v3'));
ok('Gradle 版本为 8.2', yml.includes("gradle-version: '8.2'"));
ok('使用 setup-android@v3', yml.includes('android-actions/setup-android@v3'));
ok('使用 upload-artifact@v4', yml.includes('actions/upload-artifact@v4'));
ok('有 if-no-files-found: error（产物缺失会报错）', yml.includes('if-no-files-found: error'));
ok('有 keytool 生成签名步骤', yml.includes('keytool -genkeypair'));
ok('keytool 参数完整（storepass/keypass/alias/keyalg）',
  yml.includes('-storepass') && yml.includes('-keypass') && yml.includes('-alias') && yml.includes('-keyalg'));
ok('有 assembleRelease 构建命令', yml.includes('gradle assembleRelease'));
ok('有 APK 产物校验', yml.includes('未找到 APK 产物'));

console.log('\n=== 2. 签名配置一致性 ===');
// 从 workflow 提取 keytool 参数
const storePass = (yml.match(/-storepass\s+(\S+)/) || [])[1];
const keyPass = (yml.match(/-keypass\s+(\S+)/) || [])[1];
const alias = (yml.match(/-alias\s+(\S+)/) || [])[1];
const gradleStorePass = (appGradle.match(/storePassword\s+"([^"]+)"/) || [])[1];
const gradleKeyPass = (appGradle.match(/keyPassword\s+"([^"]+)"/) || [])[1];
const gradleAlias = (appGradle.match(/keyAlias\s+"([^"]+)"/) || [])[1];

ok('workflow 与 gradle 的 storePassword 一致',
  storePass === gradleStorePass, `workflow=${storePass} gradle=${gradleStorePass}`);
ok('workflow 与 gradle 的 keyPassword 一致',
  keyPass === gradleKeyPass, `workflow=${keyPass} gradle=${gradleKeyPass}`);
ok('workflow 与 gradle 的 keyAlias 一致',
  alias === gradleAlias, `workflow=${alias} gradle=${gradleAlias}`);

const gradleKsPath = (appGradle.match(/file\("(keystore\/[^"]+)"\)/) || [])[1];
ok('gradle 引用的签名路径正确', gradleKsPath === 'keystore/mathkid.jks', gradleKsPath);
ok('workflow 生成的签名路径与 gradle 一致',
  yml.includes('app/keystore/mathkid.jks') && gradleKsPath === 'keystore/mathkid.jks',
  'gradle 里 "keystore/mathkid.jks" 在 app 模块下即 app/keystore/mathkid.jks');
ok('release 构建绑定了签名配置', /release\s*\{[^}]*signingConfig\s+signingConfigs\.release/s.test(appGradle));

console.log('\n=== 3. 版本兼容性 ===');
const compileSdk = (appGradle.match(/compileSdk\s+(\d+)/) || [])[1];
const targetSdk = (appGradle.match(/targetSdk\s+(\d+)/) || [])[1];
const minSdk = (appGradle.match(/minSdk\s+(\d+)/) || [])[1];
ok('compileSdk 为 34', compileSdk === '34', compileSdk);
ok('targetSdk 为 34', targetSdk === '34', targetSdk);
ok('minSdk 为 21', minSdk === '21', minSdk);
ok('workflow 安装的 platform 与 compileSdk 匹配',
  yml.includes(`platforms;android-${compileSdk}`), `需 platforms;android-${compileSdk}`);
ok('workflow 安装的 build-tools 为 34.0.0', yml.includes('build-tools;34.0.0'));
ok('Java 编译版本为 17', appGradle.includes('JavaVersion.VERSION_17'));
ok('AGP 版本为 8.1.4', rootGradle.includes("com.android.application' version '8.1.4'"));
ok('gradle.properties 启用 AndroidX', gradleProps.includes('android.useAndroidX=true'));
ok('gradle.properties 设置 UTF-8 编码', gradleProps.includes('file.encoding=UTF-8'));

console.log('\n=== 4. namespace 与包名一致性 ===');
const ns = (appGradle.match(/namespace\s+'([^']+)'/) || [])[1];
const appId = (appGradle.match(/applicationId\s+"([^"]+)"/) || [])[1];
const manifestPkg = manifest.match(/package="([^"]+)"/);
const javaPkg = read('app/src/main/java/com/hefei/mathkid/MainActivity.java').match(/^package\s+([\w.]+);/m)[1];

ok('namespace 与 applicationId 一致', ns === appId, `${ns} vs ${appId}`);
ok('Java 包名与 namespace 一致', javaPkg === ns, `${javaPkg} vs ${ns}`);
ok('manifest 中已移除 package 属性（AGP 8 要求）', manifestPkg === null,
  manifestPkg ? '仍存在 package=' + manifestPkg[1] + '，AGP 8 会报错' : '');
ok('manifest 中 Activity 名用相对路径', manifest.includes('android:name=".MainActivity"'));
ok('settings.gradle 包含 :app', settings.includes("include ':app'"));

console.log('\n=== 5. 资源文件完整性 ===');
const iconRefs = [...manifest.matchAll(/android:(?:round)?[Ii]con="@mipmap\/(\w+)"/g)].map(m => m[1]);
ok('manifest 引用了图标', iconRefs.length > 0, iconRefs.join(', '));

iconRefs.forEach(icon => {
  const v26 = exists(`app/src/main/res/mipmap-anydpi-v26/${icon}.xml`);
  const base = exists(`app/src/main/res/mipmap/${icon}.xml`);
  ok(`图标 ${icon} 有 v26 自适应版本`, v26);
  ok(`图标 ${icon} 有基础版本（兼容 API 21~25）`, base,
     base ? '' : 'API 21~25 设备会因找不到资源而崩溃');
});

ok('colors.xml 定义了图标背景色', read('app/src/main/res/values/colors.xml').includes('ic_launcher_background'));
ok('图标前景引用的 drawable 存在', exists('app/src/main/res/drawable/ic_launcher_foreground.xml'));
ok('strings.xml 定义了 app_name', read('app/src/main/res/values/strings.xml').includes('app_name'));
ok('styles.xml 定义了 AppTheme', read('app/src/main/res/values/styles.xml').includes('AppTheme'));
ok('manifest 引用的主题存在', manifest.includes('@style/AppTheme'));
ok('游戏主体 index.html 存在', exists('app/src/main/assets/index.html'));

console.log('\n=== 6. 游戏资源加载路径 ===');
const java = read('app/src/main/java/com/hefei/mathkid/MainActivity.java');
const assetUrl = (java.match(/loadUrl\("([^"]+)"\)/) || [])[1];
ok('WebView 加载路径为 android_asset', assetUrl === 'file:///android_asset/index.html', assetUrl);
ok('已启用 JavaScript', java.includes('setJavaScriptEnabled(true)'));
ok('已启用 DOM Storage（存档需要）', java.includes('setDomStorageEnabled(true)'));
ok('index.html 用相对路径（无外部依赖）',
  !/src="https?:\/\//.test(read('app/src/main/assets/index.html')));
ok('index.html 无外部 CDN 引用',
  !/https?:\/\/(cdn|unpkg|jsdelivr)/.test(read('app/src/main/assets/index.html')),
  '离线环境必须零外部依赖');

console.log('\n============================');
console.log(`通过 ${pass} 项，失败 ${fail} 项，警告 ${warn} 项`);
console.log(fail === 0 ? '构建配置一致性校验通过 ✅' : '存在会导致构建失败的问题 ❌');
process.exit(fail > 0 ? 1 : 0);
