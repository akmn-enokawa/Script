// ==UserScript==
// @name         スマレジ - 商品管理ページにDatepicker導入
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  input#searchInsDateFromとinput#searchInsDateToにカーソルをフォーカスしたときにjQueryUIのdatepickerを使用します。
// @author       Your Name
// @match        https://www1.smaregi.jp/control/master/product/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://code.jquery.com/ui/1.13.0/jquery-ui.min.js
// @require      https://ajax.googleapis.com/ajax/libs/jqueryui/1/i18n/jquery.ui.datepicker-ja.min.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // jQueryUIのdatepickerを適用する関数
    function applyDatePicker(elementId) {
        $(elementId).datepicker({
      changeMonth: true,
      changeYear: true,
            dateFormat: 'yy/mm/dd',  // 日付のフォーマットを指定
            showAnim: 'fadeIn',      // アニメーションの設定
            beforeShow: function(input, inst) {
                setTimeout(function() {
                    inst.dpDiv.css({
                        top: $(input).offset().top + $(input).outerHeight(),
                        left: $(input).offset().left
                    });
                }, 0);
            },yearSuffix: ''
        });
    }

    // input#searchInsDateFromにdatepickerを適用する
    applyDatePicker('input#searchInsDateFrom');

    // input#searchInsDateToにdatepickerを適用する
    applyDatePicker('input#searchInsDateTo');
})();
