// 出题引擎自测：验证题目合法、答案正确、选项包含正确答案且不重复
const fs = require('fs');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];

// 只抽取纯计算函数（不依赖 DOM 的部分）
const start = js.indexOf('const rnd =');
const end = js.indexOf('// ---------- 全局状态');
const core = js.slice(start, end);

eval(core);

let fail = 0, checked = 0;

function check(type, n) {
  for (let i = 0; i < n; i++) {
    const q = makeQuestion(type);
    checked++;
    // 1) 题目文本非空
    if (!q.text || typeof q.text !== 'string') { console.log('❌ 题目为空', type, q); fail++; continue; }
    // 2) 答案必须是正整数
    if (!Number.isInteger(q.ans) || q.ans <= 0) { console.log('❌ 答案非法', type, q); fail++; continue; }

    // 3) 选项必须 4 个、包含正确答案、无重复
    const opts = makeOptions(q.ans);
    if (opts.length !== 4) { console.log('❌ 选项数量错误', type, opts); fail++; continue; }
    if (new Set(opts).size !== 4) { console.log('❌ 选项有重复', type, opts); fail++; continue; }
    if (!opts.includes(q.ans)) { console.log('❌ 选项缺正确答案', type, opts, q.ans); fail++; continue; }

    // 4) 按题目文本重算一遍，交叉验证答案
    const t = q.text.replace(/\u2212/g, '-').replace(/\s/g, '');
    let m;
    if ((m = t.match(/^(\d+)\+(\d+)=\?$/))) {
      if (+m[1] + +m[2] !== q.ans) { console.log('❌ 加法答案错', q); fail++; }
      if (+m[1] > 20 || +m[2] > 20) { console.log('❌ 加数超范围', q); fail++; }
    } else if ((m = t.match(/^(\d+)-(\d+)=\?$/))) {
      if (+m[1] - +m[2] !== q.ans) { console.log('❌ 减法答案错', q); fail++; }
      if (q.ans <= 0) { console.log('❌ 减法结果为负', q); fail++; }
    } else if ((m = t.match(/^(\d+)\+\(\)=(\d+)$/))) {
      if (+m[2] - +m[1] !== q.ans) { console.log('❌ 填空加法错', q, m); fail++; }
    } else if ((m = t.match(/^(\d+)-\(\)=(\d+)$/))) {
      if (+m[1] - +m[2] !== q.ans) { console.log('❌ 填空减法错', q, m); fail++; }
    } else if ((m = t.match(/^\(\)\+(\d+)=(\d+)$/))) {
      if (+m[2] - +m[1] !== q.ans) { console.log('❌ 填空(x+)错', q, m); fail++; }
    } else if ((m = t.match(/^\(\)-(\d+)=(\d+)$/))) {
      if (+m[1] + +m[2] !== q.ans) { console.log('❌ 填空(x-)错', q, m); fail++; }
    } else {
      console.log('❌ 题目格式无法识别:', JSON.stringify(q.text)); fail++;
    }
  }
}

console.log('=== 出题引擎自测 ===');
['add10', 'sub10', 'add20', 'sub20', 'mix20', 'missing'].forEach(t => check(t, 4000));
console.log(`\n共校验 ${checked} 道题，失败 ${fail} 道`);

// 进位/退位特征验证
let carryOK = 0, carryTot = 0;
for (let i = 0; i < 3000; i++) {
  const q = makeQuestion('add20');
  const m = q.text.replace(/\s/g,'').match(/^(\d+)\+(\d+)=\?$/);
  if (m) { carryTot++; if ((+m[1]) % 10 + (+m[2]) % 10 > 10) carryOK++; }
}
console.log(`进位加法中真正需要进位的比例: ${(carryOK/carryTot*100).toFixed(1)}% (应为 100%)`);

let borOK = 0, borTot = 0;
for (let i = 0; i < 3000; i++) {
  const q = makeQuestion('sub20');
  const m = q.text.replace(/\s/g,'').match(/^(\d+)\u2212(\d+)=\?$/);
  if (m) { borTot++; if ((+m[1]) % 10 < (+m[2])) borOK++; }
}
console.log(`退位减法中真正需要退位的比例: ${(borOK/borTot*100).toFixed(1)}% (应为 100%)`);

// 10以内减法不为负、结果范围
let rangeBad = 0;
for (let i = 0; i < 5000; i++) {
  const q1 = makeQuestion('sub10');
  if (q1.ans < 0 || q1.ans > 9) rangeBad++;
  const q2 = makeQuestion('add10');
  if (q2.ans > 10) rangeBad++;
  const q3 = makeQuestion('add20');
  if (q3.ans > 18) rangeBad++;
  const q4 = makeQuestion('sub20');
  if (q4.ans < 2 || q4.ans > 16) rangeBad++;
}
console.log(`数值范围越界次数: ${rangeBad} (应为 0)`);

process.exit(fail > 0 || rangeBad > 0 ? 1 : 0);
