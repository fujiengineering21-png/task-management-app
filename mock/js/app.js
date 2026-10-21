/* 起動と、モック用パネル（本物のアプリにはない） */
(function () {
  'use strict';
  const TB = window.TaskBoard;
  const { store } = TB;

  const LOADING_MS = 600; // 読み込み中の表示を見せる時間

  // 「再読み込み」ボタン：本物ではサーバーから読み直す。モックでは読み込み中を見せて通常に戻す
  // R-22 再読み込みしたら絞り込みは解除する
  function reload() {
    store.applyLocal((st) => store.ops.setFilter(store.ops.setScreen(st, 'loading'), []));
    setTimeout(() => store.applyLocal((st) => store.ops.setScreen(st, 'normal')), LOADING_MS);
  }
  TB.app = { reload };

  // モック用パネルのラジオボタンを、今の画面の状態に合わせる
  function syncPanel(s) {
    const radio = document.querySelector(`input[name="mock-screen"][value="${s.screen}"]`);
    if (radio) radio.checked = true;
  }

  store.subscribe(TB.board.render);
  store.subscribe(syncPanel);

  document.getElementById('open-label-manager').addEventListener('click', () => TB.labelModal.open());

  document.querySelectorAll('input[name="mock-screen"]').forEach((radio) => {
    radio.addEventListener('change', (e) => store.applyLocal((st) => store.ops.setScreen(st, e.target.value)));
  });
  const failSave = document.getElementById('mock-fail-save');
  failSave.checked = false;
  failSave.addEventListener('change', () => { TB.mock.failSave = failSave.checked; });
  document.getElementById('mock-reset').addEventListener('click', () => window.location.reload());

  // 起動：まず「読み込み中」を見せてから、見本データでボードを表示する（F-52）
  store.init('loading');
  setTimeout(() => store.applyLocal((st) => store.ops.setScreen(st, 'normal')), LOADING_MS);
})();
