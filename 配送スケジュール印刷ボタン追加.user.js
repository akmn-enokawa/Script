// ==UserScript==
// @name         配送スケジュール印刷ボタン追加
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  kintoneのダウンロードリスト画面に配送スケジュール印刷ボタンを追加します
// @author       You
// @match        https://akaminekagu.cybozu.com/k/downloadList?app=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cybozu.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ボタンを追加する関数
    function addButton() {
        // すでにボタンが存在する場合は何もしない
        if (document.getElementById('custom-delivery-print-btn')) {
            return;
        }

        const targetSelector = '.select-cybozu';
        const targetElement = document.querySelector(targetSelector);

        if (targetElement) {
            // ボタンを作成
            const button = document.createElement('button');
            button.id = 'custom-delivery-print-btn';
            button.innerText = '配送スケジュール印刷';

            // スタイル適用 (青背景、白文字、いい感じのデザイン)
            Object.assign(button.style, {
                backgroundColor: '#3498db', // 明るめの青
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                marginLeft: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'background-color 0.3s ease',
                verticalAlign: 'middle' // 隣の要素と高さを合わせるため
            });

            // ホバー効果
            button.onmouseover = function () {
                button.style.backgroundColor = '#2980b9'; // 少し濃い青
            };
            button.onmouseout = function () {
                button.style.backgroundColor = '#3498db';
            };

            // クリックイベント
            button.onclick = function (e) {
                e.preventDefault(); // デフォルトの動作を防ぐ
                window.location.href = 'https://app.akaminekagu.com/delivery/';
            };

            // 要素の挿入 (targetElementの直後)
            targetElement.parentNode.insertBefore(button, targetElement.nextSibling);

            // 並びを調整するためにFlexboxなどが使われている場合の親要素の調整（必要に応じて）
            // 今回は単純に隣に追加
        }
    }

    // ページ読み込み完了時と、動的な変更を監視してボタンを追加
    window.addEventListener('load', addButton);

    // KintoneはSPAのような挙動をすることがあるため、MutationObserverで監視
    const observer = new MutationObserver((mutations) => {
        addButton();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
