// ==UserScript==
// @name        入荷データ参照画面 合計金額計算スクリプト
// @namespace   http://tampermonkey.net/
// @version     2.0
// @description 「原価(税抜) × 検品済数」の合計金額を計算し、表示するスクリプト
// @match       https://inventory1.smaregi.jp/control/ic_storages/inspect/*
// @grant       none
// ==/UserScript==

(function() {
    'use strict';

    // 画面に合計金額を表示する要素がなければ追加する
    if (!document.getElementById('totalAmount')) {
        const totalDiv = `
            <div class="form-group">
                <div class="fg-label">
                    <span class="label-num">12</span>
                    <label for="totalAmount">合計金額</label>
                </div>
                <div class="fg-value">
                    <div class="form-control-static" id="totalAmount">0 円（税抜）</div>
                </div>
            </div>
        `;

        const formHorizontalDiv = document.querySelector('div.form-horizontal');
        if (formHorizontalDiv) {
            formHorizontalDiv.insertAdjacentHTML('beforeend', totalDiv);
        } else {
            console.warn('div.form-horizontal が見つかりませんでした。合計金額表示要素を追加できません。');
            return;
        }
    }

    // 数値をカンマ区切りにする関数
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // 合計金額を計算する関数
    function calculateTotal() {
        const orderTotal = [];
        // tbody#bindingTarget 内の全tr要素を取得
        const rows = document.querySelectorAll('#bindingTarget > tr');

        rows.forEach(row => {
            // 「原価(税抜)」の要素を取得
            const costPriceElement = row.querySelector('td.num.cost-price > span');
            // 「検品済数」の要素を取得
            const quantityElement = row.querySelector('td.quantity.inspection-true > span');

            // 原価(税抜)の値を取得。カンマを除去してから数値(float)に変換
            const costPriceText = costPriceElement ? costPriceElement.textContent.replace(/,/g, '') : '0';
            const costPrice = parseFloat(costPriceText) || 0;

            // 検品済数の値を取得
            const quantityText = quantityElement ? quantityElement.textContent : '0';
            const quantity = parseFloat(quantityText) || 0;

            // 行ごとの合計を計算
            const total = costPrice * quantity;
            orderTotal.push(total);
        });

        // 全ての行の合計を計算
        const sum = orderTotal.reduce((acc, curr) => acc + curr, 0);
        const totalAmountElement = document.getElementById('totalAmount');
        if (totalAmountElement) {
            // 合計金額を表示。小数点以下は切り捨てて整数にし、カンマ区切りにする
            totalAmountElement.textContent = `${formatNumber(Math.floor(sum))} 円（税抜）`;
        }
    }

    // #bindingTarget の変更を監視し、変更があった場合に再計算を実行
    const bindingTarget = document.getElementById('bindingTarget');
    if (bindingTarget) {
        // MutationObserverのコールバックを定義
        const observerCallback = () => {
            // DOMの変更（行の追加/削除、値の更新など）を検知したら再計算
            calculateTotal();
        };

        const observer = new MutationObserver(observerCallback);

        // 監視を開始。子要素の追加/削除、および子孫要素の変更(テキスト含む)を監視対象とする
        observer.observe(bindingTarget, {
            childList: true,     // 子ノード(tr)の追加/削除
            subtree: true,       // 子孫ノード(spanなど)の変更
            characterData: true  // テキストノードの内容変更
        });

        // 初期計算の実行
        // データが非同期で読み込まれることを考慮し、少し待ってから実行
        setTimeout(calculateTotal, 500);

    } else {
        console.warn('#bindingTarget が見つかりませんでした。動的な更新の監視ができません。');
        // フォールバックとして、DOMロード完了後に一度だけ計算を試みる
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(calculateTotal, 1000);
        });
    }
})();