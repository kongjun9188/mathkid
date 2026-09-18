/**
 * 完整交互流程测试
 * 用 jsdom 真实加载游戏页面，模拟孩子从打开 App → 选关 → 答题 → 结算 的完整流程，
 * 验证界面能正常渲染、按钮能点、答对答错逻辑正确、星星能累计。
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('C:/Users/HP/.workbuddy/binaries/node/workspace/node_modules/jsdom');

const HTML = fs.readFileSync(
  'C:/Users/HP/WorkBuddy/2026-09-18-15-57-31/mathkid/app/src/main/assets/index.html',
  'utf8'
);

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { console.log('  OK   ' + name); pass++; }
  else { console.log(' FAIL  ' + name + (extra ? '  << ' + extra : '')); fail++; }
};

// 屏蔽 jsdom 不支持的 API
const dom = new JSDOM(HTML, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  beforeParse(window) {
    window.speechSynthesis = { speak() {}, cancel() {} };
    window.SpeechSynthesisUtterance = function () {};
    window.confirm = () => true;
  }
});

const { window } = dom;
const doc = window.document;

setTimeout(() => {
  console.log('=== 交互流程测试 ===\n');

  // ---- 1. 主页能渲染 ----
  console.log('[1] 主页加载');
  ok('应用容器存在', !!doc.getElementById('app'));
  ok('标题显示正确', doc.body.textContent.includes('数学小闯关'));
  ok('副标题显示一年级', doc.body.textContent.includes('一年级'));
  ok('显示二十以内', doc.body.textContent.includes('20 以内'));
  ok('显示星星数', !!doc.querySelector('.chip.star'));
  ok('显示小动物伙伴', doc.body.textContent.includes('我的伙伴'));
  ok('初始小动物是蛋蛋', doc.body.textContent.includes('蛋蛋'));

  const modes = doc.querySelectorAll('.mode');
  ok('渲染出 8 个关卡', modes.length === 8, '实际 ' + modes.length);
  ok('第 1 关可点击', !modes[0].disabled);
  ok('第 2 关初始锁定', modes[1].disabled, '应锁定，需先过第1关');
  ok('显示音量按钮', !!doc.getElementById('btnSound'));
  ok('显示重置按钮', !!doc.getElementById('btnReset'));

  // ---- 2. 进入第 1 关 ----
  console.log('\n[2] 进入第 1 关');
  modes[0].click();
  ok('题目区出现', doc.body.textContent.includes('= ?') || doc.body.textContent.includes('= '));
  ok('显示关卡标识', doc.body.textContent.includes('第1关'));
  ok('显示进度 1/8', doc.body.textContent.includes('1/8'));
  ok('显示进度条', !!doc.querySelector('.progress-bar'));
  ok('显示 4 个选项', doc.querySelectorAll('.opt').length === 4,
     '实际 ' + doc.querySelectorAll('.opt').length);
  ok('有返回按钮', !!doc.getElementById('btnBack'));

  // ---- 3. 答对一题 ----
  console.log('\n[3] 答对一题');
  // 从 jsdom 内部取正确答案
  const gameState = () => {
    // 通过重新渲染时的 DOM 反推答案：找选项里等于 expr 计算结果的
    const expr = doc.querySelector('.expr').textContent;
    const m = expr.replace(/\u2212/g, '-').match(/(\d+)\s*([+\-])\s*(\d+)/);
    if (!m) return null;
    return m[2] === '+' ? (+m[1] + +m[3]) : (+m[1] - +m[3]);
  };
  const rightAns = gameState();
  ok('能解析出正确答案', rightAns !== null, '表达式: ' + doc.querySelector('.expr').textContent);

  let correctBtn = null;
  doc.querySelectorAll('.opt').forEach(b => {
    if (parseInt(b.textContent, 10) === rightAns) correctBtn = b;
  });
  ok('正确答案在选项中', !!correctBtn);

  const starsBefore = parseInt(doc.querySelector('.chip.star').textContent.replace(/\D/g, ''), 10);
  if (correctBtn) correctBtn.click();
  ok('答对后按钮变绿', correctBtn.classList.contains('correct'));

  // ---- 4. 推进到下一题 ----
  console.log('\n[4] 自动进入下一题（等待动画）');
  setTimeout(() => {
    ok('进度推进到 2/8', doc.body.textContent.includes('2/8'),
       '当前: ' + (doc.querySelector('#chipProg') || {}).textContent);

    // ---- 5. 答错一题 ----
    console.log('\n[5] 答错一题');
    const expr2 = doc.querySelector('.expr').textContent;
    const m2 = expr2.replace(/\u2212/g, '-').match(/(\d+)\s*([+\-])\s*(\d+)/);
    const right2 = m2[2] === '+' ? (+m2[1] + +m2[3]) : (+m2[1] - +m2[3]);
    let wrongBtn = null;
    doc.querySelectorAll('.opt').forEach(b => {
      if (parseInt(b.textContent, 10) !== right2) wrongBtn = b;
    });
    if (wrongBtn) {
      wrongBtn.click();
      ok('答错后按钮变红', wrongBtn.classList.contains('wrong'));
      ok('答错不推进进度（可重试）', doc.body.textContent.includes('2/8'));
    }

    // ---- 6. 答错后仍可继续作答 ----
    console.log('\n[6] 答错后可重新作答');
    let retryBtn = null;
    doc.querySelectorAll('.opt').forEach(b => {
      if (!b.disabled && parseInt(b.textContent, 10) === right2) retryBtn = b;
    });
    ok('正确答案按钮仍可点击（可重试）', !!retryBtn);

    // ---- 7. 快速通关第 1 关 ----
    console.log('\n[7] 连续答对直到结算（需等待每题 780ms 动画）');
    let guard = 0;
    const autoPlay = setInterval(() => {
      guard++;
      if (guard > 200) {
        clearInterval(autoPlay);
        finish();
        return;
      }
      // 已到结算页
      if (doc.querySelector('.got-stars')) { clearInterval(autoPlay); finish(); return; }

      const exprEl = doc.querySelector('.expr');
      if (!exprEl) return;   // 动画过渡中，等待下一轮
      const txt = exprEl.textContent;
      const mm = txt.replace(/\u2212/g, '-').match(/(\d+)\s*([+\-])\s*(\d+)/);
      if (!mm) return;
      const ans = mm[2] === '+' ? (+mm[1] + +mm[3]) : (+mm[1] - +mm[3]);
      let btn = null;
      doc.querySelectorAll('.opt').forEach(b => {
        if (!b.disabled && parseInt(b.textContent, 10) === ans) btn = b;
      });
      if (btn) btn.click();
    }, 120);

    function finish() {
      console.log('\n[8] 结算页面');
      const body = doc.body.textContent;
      ok('显示星星评价', doc.querySelector('.got-stars') !== null);
      ok('显示得分 X / 8', body.includes('/ 8'));
      ok('显示累计星星', body.includes('累计'));
      ok('有再来一次按钮', !!doc.getElementById('btnAgain'));
      ok('有回主页按钮', !!doc.getElementById('btnHome'));
      ok('有下一关按钮', !!doc.getElementById('btnNext'));

      const starsNow = parseInt((doc.querySelector('.chip.star') || {textContent:'0'}).textContent.replace(/\D/g, ''), 10);
      ok('星星数增加了', starsNow > starsBefore, starsBefore + ' -> ' + starsNow);

      // ---- 9. 回主页，检查解锁 ----
      console.log('\n[9] 返回主页检查解锁');
      doc.getElementById('btnHome').click();
      setTimeout(() => {
        const ms = doc.querySelectorAll('.mode');
        ok('回到主页', doc.body.textContent.includes('我的伙伴'));
        ok('第 1 关显示星星', ms[0].textContent.includes('⭐'));
        ok('第 2 关已解锁', !ms[1].disabled);
        ok('本地存档已写入', !!window.localStorage.getItem('mathkid_save_v1'));

        const raw = window.localStorage.getItem('mathkid_save_v1');
        let saved = {};
        try { saved = JSON.parse(raw); } catch (e) {}
        ok('存档含 totalStars', typeof saved.totalStars === 'number', JSON.stringify(saved).slice(0,120));
        ok('存档含关卡星数', saved.stars && typeof saved.stars === 'object');

        console.log('\n============================');
        console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
        console.log(fail === 0 ? '交互流程全部正常 ✅' : '存在失败项 ❌');
        process.exit(fail > 0 ? 1 : 0);
      }, 120);
    }
  }, 1000);
}, 500);
