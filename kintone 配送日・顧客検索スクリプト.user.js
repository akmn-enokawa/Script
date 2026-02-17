// ==UserScript==
// @name        kintone 配送日・顧客検索スクリプト
// @namespace   https://akaminekagu.cybozu.com/
// @version     3.4
// @description 特定のURLに検索条件ドロップダウン、入力欄、検索ボタン、カレンダーボタンを追加
// @match       https://akaminekagu.cybozu.com/k/7/
// @match       https://akaminekagu.cybozu.com/k/7/?view*
// @require     https://code.jquery.com/jquery-3.6.0.min.js
// @require     https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.js
// @require     https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/ja.js
// @grant       GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- 設定 ---
    const TARGET_ELEMENT_SELECTOR = 'div.kintone-app-headermenu-space';
    const VIEW_ID_CALENDAR = '9170';
    const CUSTOM_FORM_ID = 'kintone-custom-search-form';
    const LOCAL_STORAGE_KEY_DATE = 'selectedDate';
    const LOCAL_STORAGE_KEY_MODE = 'selectedSearchMode';

    // 検索モードの設定
    const SEARCH_MODES = {
        'date': { label: '配送日', viewId: '9559', fieldCode: 'f9165', operator: '=', useCalendar: true, placeholder: '日付を選択' },
        'name': { label: '名前', viewId: '5735116', fieldCode: 'f5118321', operator: 'like', useCalendar: false, placeholder: '名前を入力' },
        'address': { label: '住所', viewId: '5735118', fieldCode: 'f9166', operator: 'like', useCalendar: false, placeholder: '住所を入力' },
        'product': { label: '商品', viewId: '5735122', fieldCode: 'f5118324', operator: 'like', useCalendar: false, placeholder: '商品名を入力' },
        'phone': { label: '電話番号', viewId: '5735120', fieldCode: 'f5118322', operator: 'like', useCalendar: false, placeholder: '電話番号を入力' }
    };

    const URL_SUFFIX = '#sort_0=f9165&order_0=desc&size=20';
    let fpInstance = null;

    /**
     * GM_addStyle ポリフィル
     */
    function safeAddStyle(css) {
        if (typeof GM_addStyle !== 'undefined') {
            GM_addStyle(css);
        } else {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }
    }

    /**
     * 外部CSS読み込み（Flatpickrのみ）
     */
    function loadStyles() {
        if (document.getElementById('flatpickr-style')) return;

        const link = document.createElement('link');
        link.id = 'flatpickr-style';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
        document.head.appendChild(link);
    }

    /**
     * カスタムスタイル定義
     */
    function addCustomStyles() {
        safeAddStyle(`
            /* ▼ コンテナ設定 ▼ */
            #${CUSTOM_FORM_ID} {
                display: flex;
                align-items: center;
            }

            /* ▼ 全要素共通のフォント設定（メイリオ） ▼ */
            #${CUSTOM_FORM_ID},
            #${CUSTOM_FORM_ID} button,
            #${CUSTOM_FORM_ID} input,
            #${CUSTOM_FORM_ID} select {
                font-family: "Meiryo", "Hiragino Kaku Gothic ProN", "MS PGothic", sans-serif;
            }

            /* ▼ フォーム部品の共通スタイル ▼ */
            .custom-control {
                height: 48px;
                box-sizing: border-box;
                border: 1px solid #3498db;
                border-radius: 0;
                margin: 0;
                vertical-align: middle;
                font-size: 14px;
                position: relative;
            }

            /* 2つ目以降の要素は左の枠線を重ねる（隙間をなくす） */
            #${CUSTOM_FORM_ID} > .custom-control:not(:first-child) {
                margin-left: -1px;
            }

            /* ★★★ カレンダーボタンだけ左マージンを空ける（上書き） ★★★ */
            #${CUSTOM_FORM_ID} > .calendar-btn-margin {
                margin-left: 1px !important;
            }

            /* ▼ ドロップダウン & 入力欄 ▼ */
            select.custom-control,
            input.custom-control {
                display: block;
                padding: 0 12px;
                color: #333;
                background-color: #fff;
                z-index: 1;
            }

            select.custom-control:focus,
            input.custom-control:focus {
                outline: 0;
                border-color: #2774a7;
                z-index: 10;
            }

            select.custom-control {
                cursor: pointer;
                min-width: 90px;
            }

            input.custom-control {
                width: 200px;
            }

            /* ▼ ボタン ▼ */
            button.custom-control {
                display: inline-block;
                padding: 0 20px;
                line-height: 46px;
                text-align: center;
                white-space: nowrap;
                cursor: pointer;
                color: #fff;
                background-color: #3498db;
                z-index: 1;
            }

            button.custom-control:hover {
                background-color: rgba(52, 152, 219, 0.9);
                z-index: 10;
            }

            button.custom-control:active {
                background-color: #2774a7;
                border-color: #2774a7;
                z-index: 10;
            }

            /* ▼ その他レイアウト ▼ */
            body { height: 1000px !important; }
            [class="gaia-argoui-dialog-buttons-right"],
            [class="gaia-argoui-dialog-buttons-left"] {
                position: relative;
                bottom: 100px;
            }
            .ocean-ui-dialog-buttons,
            .gaia-argoui-dialog-buttons,
            .gaia-argoui-dialog-buttons-general {
                position: fixed;
                top: 820px;
                left: 30px;
            }
        `);
    }

    /**
     * フォーム生成
     */
    function renderSearchForm(targetElement) {
        if (targetElement.querySelector(`#${CUSTOM_FORM_ID}`)) return;

        targetElement.innerHTML = '';

        const form = document.createElement('form');
        form.id = CUSTOM_FORM_ID;
        form.addEventListener('submit', (e) => e.preventDefault());

        // 1. ドロップダウンボックス
        const selectBox = document.createElement('select');
        selectBox.className = 'custom-control';
        Object.keys(SEARCH_MODES).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = SEARCH_MODES[key].label;
            selectBox.appendChild(option);
        });

        // 2. 入力フィールド
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.className = 'custom-control';
        inputField.autocomplete = 'off';

        // 3. 検索ボタン
        const searchButton = document.createElement('button');
        searchButton.type = 'button';
        searchButton.textContent = '検 索';
        searchButton.className = 'custom-control';

        searchButton.addEventListener('click', () => {
            executeSearch(selectBox.value, inputField.value);
        });

        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeSearch(selectBox.value, inputField.value);
            }
        });

        // 4. カレンダーボタン（ここにだけ余白用のクラスを追加）
        const calendarButton = document.createElement('button');
        calendarButton.type = 'button';
        calendarButton.textContent = 'カレンダー';
        calendarButton.className = 'custom-control calendar-btn-margin'; // クラス追加
        calendarButton.addEventListener('click', () => {
            window.location.href = `https://akaminekagu.cybozu.com/k/7/?view=${VIEW_ID_CALENDAR}`;
        });

        form.append(selectBox, inputField, searchButton, calendarButton);
        targetElement.appendChild(form);

        // 初期設定
        const savedMode = localStorage.getItem(LOCAL_STORAGE_KEY_MODE) || 'date';
        selectBox.value = savedMode;

        updateInputMode(savedMode, inputField);

        selectBox.addEventListener('change', () => {
            const mode = selectBox.value;
            localStorage.setItem(LOCAL_STORAGE_KEY_MODE, mode);
            inputField.value = '';
            updateInputMode(mode, inputField);
        });
    }

    /**
     * モード切替
     */
    function updateInputMode(mode, inputElement) {
        const config = SEARCH_MODES[mode];
        inputElement.placeholder = config.placeholder;

        if (config.useCalendar) {
            const savedDate = localStorage.getItem(LOCAL_STORAGE_KEY_DATE);
            if (savedDate) inputElement.value = savedDate;
            initializeFlatpickr(inputElement);
        } else {
            if (fpInstance) {
                fpInstance.destroy();
                fpInstance = null;
            }
        }
    }

    /**
     * Flatpickr初期化
     */
    function initializeFlatpickr(element) {
        if (typeof flatpickr === 'undefined') {
            setTimeout(() => initializeFlatpickr(element), 500);
            return;
        }
        if (fpInstance) fpInstance.destroy();

        flatpickr.localize(flatpickr.l10ns.ja);
        fpInstance = flatpickr(element, {
            dateFormat: 'Y-m-d',
            allowInput: true,
            onClose: (selectedDates, dateStr) => {
                if (dateStr) {
                    localStorage.setItem(LOCAL_STORAGE_KEY_DATE, dateStr);
                }
            }
        });
    }

    /**
     * 検索実行
     */
    function executeSearch(mode, value) {
        if (!value) {
            alert('検索キーワードを入力してください。');
            return;
        }

        const config = SEARCH_MODES[mode];
        const baseUrl = 'https://akaminekagu.cybozu.com/k/7/';
        const queryPart = `${config.fieldCode} ${config.operator} "${value}"`;
        const encodedQuery = encodeURIComponent(queryPart);
        const finalUrl = `${baseUrl}?view=${config.viewId}&q=${encodedQuery}${URL_SUFFIX}`;

        if (mode === 'date') {
            localStorage.setItem(LOCAL_STORAGE_KEY_DATE, value);
        }

        window.location.href = finalUrl;
    }

    /**
     * 監視開始
     */
    function startObserver() {
        loadStyles();
        addCustomStyles();

        const observer = new MutationObserver(() => {
            const targetElement = document.querySelector(TARGET_ELEMENT_SELECTOR);
            if (targetElement) {
                if (!targetElement.querySelector(`#${CUSTOM_FORM_ID}`)) {
                    renderSearchForm(targetElement);
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    startObserver();

})();
