/**
 * js/pay.js
 * 결제 화면(pay.html)에서 주문 내역 표시, 결제 수단 선택,
 * 모의 결제 진행(2초) 및 영수증 데이터 저장을 처리하는 스크립트입니다.
 */

(function () {
  'use strict';

  const RECEIPT_STORAGE_KEY = 'mongle_kiosk_receipt';
  const ORDER_SEQ_STORAGE_KEY = 'mongle_kiosk_order_seq';

  const emptyPayCard = document.getElementById('emptyPayCard');
  const payContentCard = document.getElementById('payContentCard');
  const orderItemList = document.getElementById('orderItemList');
  const orderTotalCount = document.getElementById('orderTotalCount');
  const orderTotalAmount = document.getElementById('orderTotalAmount');
  const paymentMethods = document.getElementById('paymentMethods');
  const confirmPayBtn = document.getElementById('confirmPayBtn');
  const moreItemsBtn = document.getElementById('moreItemsBtn');

  let selectedMethod = null;
  let isProcessing = false;

  /**
   * 숫자를 두 자리 문자열로 맞춥니다. (예: 5 -> "05")
   */
  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  /**
   * 숫자를 세 자리 문자열로 맞춥니다. (예: 1 -> "001")
   */
  function pad3(num) {
    return String(num).padStart(3, '0');
  }

  /**
   * 오늘 날짜와 순번으로 주문 번호를 만듭니다. (예: "1120-001")
   * 순번은 localStorage에 저장하며 날짜가 바뀌면 001부터 다시 셉니다.
   */
  function createOrderNumber(now) {
    const monthDay = pad2(now.getMonth() + 1) + pad2(now.getDate());
    let nextSeq = 1;

    try {
      const raw = window.localStorage.getItem(ORDER_SEQ_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.dateKey === monthDay && typeof saved.seq === 'number') {
          nextSeq = saved.seq + 1;
        }
      }
      window.localStorage.setItem(
        ORDER_SEQ_STORAGE_KEY,
        JSON.stringify({ dateKey: monthDay, seq: nextSeq })
      );
    } catch (err) {
      console.error('주문 번호 순번 저장 실패:', err);
    }

    return monthDay + '-' + pad3(nextSeq);
  }

  /**
   * 날짜 객체를 "2026.11.20 21:05" 형식의 문자열로 바꿉니다.
   */
  function formatPaidAt(now) {
    const year = now.getFullYear();
    const month = pad2(now.getMonth() + 1);
    const day = pad2(now.getDate());
    const hours = pad2(now.getHours());
    const minutes = pad2(now.getMinutes());
    return year + '.' + month + '.' + day + ' ' + hours + ':' + minutes;
  }

  /**
   * 장바구니 데이터를 읽어 주문 내역을 화면에 그립니다.
   */
  function renderOrderSummary() {
    const items = window.ProductCart.getItems();

    if (items.length === 0) {
      emptyPayCard.hidden = false;
      payContentCard.hidden = true;
      return;
    }

    emptyPayCard.hidden = true;
    payContentCard.hidden = false;
    orderItemList.innerHTML = '';

    items.forEach(function (item) {
      const li = document.createElement('li');
      li.className = 'order-item-row';

      const nameEl = document.createElement('span');
      nameEl.className = 'order-item-name';
      nameEl.textContent = item.name;

      const qtyEl = document.createElement('span');
      qtyEl.className = 'order-item-qty';
      qtyEl.textContent = item.quantity + '개';

      const priceEl = document.createElement('span');
      priceEl.className = 'order-item-price';
      priceEl.textContent = window.ProductCatalog.formatPrice(item.price * item.quantity);

      li.appendChild(nameEl);
      li.appendChild(qtyEl);
      li.appendChild(priceEl);
      orderItemList.appendChild(li);
    });

    orderTotalCount.textContent = window.ProductCart.getTotalCount() + '개';
    orderTotalAmount.textContent = window.ProductCatalog.formatPrice(window.ProductCart.getTotalPrice());
  }

  /**
   * 결제 수단 버튼 클릭 시 선택 상태를 표시하고 "결제하기" 버튼을 활성화합니다.
   */
  paymentMethods.addEventListener('click', function (event) {
    if (isProcessing) {
      return;
    }
    const button = event.target.closest('.payment-method-btn');
    if (!button) {
      return;
    }

    selectedMethod = button.dataset.method;
    const allButtons = paymentMethods.querySelectorAll('.payment-method-btn');
    allButtons.forEach(function (btn) {
      const isSelected = btn === button;
      btn.classList.toggle('is-selected', isSelected);
      btn.setAttribute('aria-checked', String(isSelected));
    });

    confirmPayBtn.disabled = false;
  });

  /**
   * "결제하기" 버튼 클릭 시 영수증을 저장하고 2초 후 완료 화면으로 이동합니다.
   */
  confirmPayBtn.addEventListener('click', function () {
    if (isProcessing || !selectedMethod) {
      return;
    }

    const items = window.ProductCart.getItems();
    if (items.length === 0) {
      renderOrderSummary();
      return;
    }

    isProcessing = true;
    confirmPayBtn.disabled = true;
    confirmPayBtn.textContent = '결제 중...';
    moreItemsBtn.classList.add('is-disabled');
    moreItemsBtn.setAttribute('aria-disabled', 'true');

    // 영수증 정보를 결제하기를 누르는 순간 따로 저장
    const now = new Date();
    const receiptData = {
      orderNumber: createOrderNumber(now),
      paidAt: formatPaidAt(now),
      paymentMethod: selectedMethod,
      items: items,
      totalCount: window.ProductCart.getTotalCount(),
      totalPrice: window.ProductCart.getTotalPrice()
    };

    try {
      window.sessionStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(receiptData));
    } catch (err) {
      console.error('영수증 저장 실패:', err);
    }

    window.setTimeout(function () {
      window.location.href = 'receipt.html';
    }, 2000);
  });

  renderOrderSummary();
})();
