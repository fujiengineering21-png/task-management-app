/* 検証ガイド：チェックリストの記録（このブラウザに保存）・進み具合の表示・結果のコピー */
(function () {
  'use strict';

  const STORAGE_KEY = 'taskboard-mock-guide:v1';
  const STATUS = Object.freeze({ todo: '未確認', ok: 'OK', ng: '要修正' });
  const TOAST_MS = 4000;
  const RESET_CONFIRM_MS = 4000;

  const items = [...document.querySelectorAll('.checklist > li[data-id]')];
  let records = load();
  let storageWarned = false;

  /* ---------- 記録の読み書き（このブラウザの localStorage） ---------- */
  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      document.getElementById('storage-note').hidden = false; // 読めないときは、記録なしで始めたことを知らせる
      return {};
    }
  }

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (err) {
      if (storageWarned) return;
      storageWarned = true;
      document.getElementById('storage-note').hidden = false;
      toast('このブラウザでは記録を保存できません。ページを閉じると記録は消えます');
    }
  }

  function recordOf(id) {
    return { status: 'todo', memo: '', ...records[id] };
  }

  function update(id, changes) {
    records = { ...records, [id]: { ...recordOf(id), ...changes } };
    persist();
  }

  /* ---------- 画面の部品 ---------- */
  function el(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  let toastTimer = null;
  function toast(message) {
    const box = document.getElementById('toast');
    box.textContent = message;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, TOAST_MS);
  }

  // 段落の先頭に見出し（やること／こうなればOK）を付ける。本文は1つにまとめて、太字が入っても崩れないようにする
  function labelParagraph(p, className, tagClass, tagText) {
    const body = el('span', { class: 'check-text' });
    body.append(...p.childNodes);
    p.className = className;
    p.replaceChildren(el('span', { class: tagClass }, tagText), body);
  }

  /* ---------- チェック項目に「結果」と「メモ」を付ける ---------- */
  function enhance(li) {
    const { id, spec } = li.dataset;
    const [doText, expectText] = li.querySelectorAll(':scope > p');
    labelParagraph(doText, 'check-do', 'tag', 'やること');
    labelParagraph(expectText, 'check-expect', 'tag tag--ok', 'こうなればOK');

    const head = el('div', { class: 'check-head' });
    head.append(el('span', { class: 'check-id' }, id));
    if ('core' in li.dataset) head.append(el('span', { class: 'badge badge--core' }, '★ まずはここ'));
    if ('decide' in li.dataset) head.append(el('span', { class: 'badge badge--decide' }, '要判断'));
    if (spec) head.append(el('span', { class: 'check-spec' }, spec));
    li.prepend(head);

    const result = el('fieldset', { class: 'check-result' });
    result.append(el('legend', {}, `${id} の結果`));
    const segmented = el('div', { class: 'segmented' });
    Object.entries(STATUS).forEach(([key, label]) => {
      const input = el('input', { type: 'radio', name: `status-${id}`, value: key, id: `status-${id}-${key}` });
      input.checked = recordOf(id).status === key;
      input.addEventListener('change', () => {
        update(id, { status: key });
        paint(li);
        refresh();
      });
      segmented.append(input, el('label', { for: input.id, class: `seg seg--${key}` }, label));
    });
    const memo = el('input', {
      type: 'text', class: 'memo', 'aria-label': `${id} のメモ`,
      placeholder: '気づいたこと・直してほしいこと（なくてもよい）',
    });
    memo.value = recordOf(id).memo;
    memo.addEventListener('input', () => update(id, { memo: memo.value }));
    result.append(segmented, memo);
    li.append(result);
    paint(li);
  }

  function paint(li) {
    li.dataset.status = recordOf(li.dataset.id).status;
  }

  /* ---------- 進み具合 ---------- */
  function countStatus(list) {
    return list.reduce((acc, li) => {
      const { status } = recordOf(li.dataset.id);
      return { ...acc, [status]: acc[status] + 1 };
    }, { todo: 0, ok: 0, ng: 0 });
  }

  function refresh() {
    const total = items.length;
    const c = countStatus(items);
    document.getElementById('progress-ok').style.width = `${(c.ok / total) * 100}%`;
    document.getElementById('progress-ng').style.width = `${(c.ng / total) * 100}%`;
    document.getElementById('progress-text').textContent = `確認済み ${c.ok + c.ng} / ${total}（OK ${c.ok}・要修正 ${c.ng}）`;
    document.querySelectorAll('.group').forEach((group) => {
      const list = [...group.querySelectorAll('.checklist > li[data-id]')];
      const gc = countStatus(list);
      group.querySelector('.group-count').textContent = `確認済み ${gc.ok + gc.ng} / ${list.length}`;
    });
  }

  /* ---------- 結果のまとめとコピー ---------- */
  function buildReport() {
    const c = countStatus(items);
    const line = (li) => `${li.dataset.id} ${li.dataset.title}（${li.dataset.spec}）`;
    const ng = items.filter((li) => recordOf(li.dataset.id).status === 'ng');
    const memos = items.filter((li) => recordOf(li.dataset.id).status !== 'ng' && recordOf(li.dataset.id).memo.trim());
    const unchecked = items.filter((li) => recordOf(li.dataset.id).status === 'todo');

    const lines = [
      `【TaskBoard モック検証結果】${new Date().toLocaleDateString('ja-JP')}`,
      `確認済み ${c.ok + c.ng} / ${items.length}（OK ${c.ok}・要修正 ${c.ng}・未確認 ${c.todo}）`,
      '',
      '■ 要修正',
      ...(ng.length ? ng.flatMap((li) => {
        const memo = recordOf(li.dataset.id).memo.trim();
        return memo ? [`- ${line(li)}`, `  メモ：${memo}`] : [`- ${line(li)}`];
      }) : ['なし']),
    ];
    if (memos.length) {
      lines.push('', '■ メモ（OK・未確認の項目）', ...memos.map((li) => `- ${line(li)}：${recordOf(li.dataset.id).memo.trim()}`));
    }
    if (unchecked.length) {
      lines.push('', `■ 未確認：${unchecked.map((li) => li.dataset.id).join('、')}`);
    }
    return lines.join('\n');
  }

  async function copyReport() {
    const text = buildReport();
    const box = document.getElementById('report-text');
    box.value = text;
    try {
      await navigator.clipboard.writeText(text);
      toast('コピーしました。Claude のチャットに貼り付けてください');
    } catch (err) {
      // file:// で開いたときなど、自動でコピーできないブラウザがある
      box.scrollIntoView({ block: 'center' });
      box.focus();
      box.select();
      toast('自動でコピーできませんでした。「5. 結果の送り方」の枠の文字をコピーしてください');
    }
  }

  /* ---------- 記録のリセット（2回押して確定） ---------- */
  const resetBtn = document.getElementById('reset-records');
  let resetTimer = null;
  function disarmReset() {
    resetTimer = null;
    resetBtn.textContent = '記録をリセット';
  }
  resetBtn.addEventListener('click', () => {
    if (!resetTimer) {
      resetBtn.textContent = 'もう一度押すと記録が全部消えます';
      resetTimer = setTimeout(disarmReset, RESET_CONFIRM_MS);
      return;
    }
    clearTimeout(resetTimer);
    disarmReset();
    records = {};
    persist();
    items.forEach((li) => {
      li.querySelector('input[value="todo"]').checked = true;
      li.querySelector('.memo').value = '';
      paint(li);
    });
    refresh();
    toast('記録を消しました');
  });

  /* ---------- 起動 ---------- */
  items.forEach(enhance);
  refresh();
  document.querySelectorAll('[data-copy-report]').forEach((b) => b.addEventListener('click', copyReport));
  const coreOnly = document.getElementById('core-only');
  coreOnly.addEventListener('change', () => document.body.classList.toggle('core-only', coreOnly.checked));
  document.getElementById('report-text').value = buildReport();
})();
