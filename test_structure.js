// 静态结构检查：标签配平、关键元素、中文完整性、无乱码
const fs = require('fs');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

const count = (re) => (html.match(re) || []).length;

const checks = [
  ['DOCTYPE 声明', /<!DOCTYPE html>/i.test(html)],
  ['UTF-8 编码声明', /meta charset="UTF-8"/i.test(html)],
  ['script 标签配平', count(/<script>/g) === count(/<\/script>/g)],
  ['style 标签配平', count(/<style>/g) === count(/<\/style>/g)],
  ['<div> 配平', count(/<div[\s>]/g) === count(/<\/div>/g)],
  ['app 容器存在', html.includes('id="app"')],
  ['hud 容器存在', html.includes('id="hud"')],
  ['stage 容器存在', html.includes('id="stage"')],
  ['LEVELS 关卡定义', html.includes('const LEVELS')],
  ['PETS 小动物定义', html.includes('const PETS')],
  ['中文标题正常', html.includes('数学小闯关')],
  ['含进位加法逻辑', html.includes("case 'add20'")],
  ['含退位减法逻辑', html.includes("case 'sub20'")],
  ['含填空题型', html.includes("case 'missing'")],
  ['含计时挑战', html.includes('timeLeft')],
  ['含语音鼓励', html.includes('speechSynthesis')],
  ['含音效合成', html.includes('AudioContext')],
  ['含本地存档', html.includes('localStorage')],
];

let bad = 0;
console.log('=== 静态结构检查 ===');
checks.forEach(([name, ok]) => {
  console.log((ok ? '  OK  ' : ' FAIL ') + name);
  if (!ok) bad++;
});

const mojibake = count(/\uFFFD/g);
console.log((mojibake === 0 ? '  OK  ' : ' FAIL ') + '无乱码字符（' + mojibake + ' 个）');
if (mojibake > 0) bad++;

console.log('\n=== 内容统计 ===');
console.log('关卡数量  :', count(/icon:\s*'/g));
console.log('小动物数量:', count(/need:\s*\d+/g));
console.log('表扬语数量:', count(/'(太棒了|真厉害|做得好|你真聪明|完全正确|好厉害呀|对了对了|你真棒)'/g));
console.log('文件大小  :', (html.length / 1024).toFixed(1) + ' KB');
console.log('总行数    :', html.split('\n').length);
console.log('\n检查结果  :', bad === 0 ? '全部通过 ✅' : bad + ' 项失败 ❌');

process.exit(bad > 0 ? 1 : 0);
