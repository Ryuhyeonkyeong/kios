/**
 * js/receipt.js
 * 완료 화면(receipt.html)에서 저장된 영수증을 보여주고
 * 장바구니를 비우며, "새 주문 시작" 시 영수증을 지우는 스크립트입니다.
 */

(function () {
  'use strict';

  const RECEIPT_STORAGE_KEY = 'mongle_kiosk_receipt';

  const emptyReceiptCard = document.getElementById('emptyReceiptCard');
  const receiptCard = document.getElementById('receiptCard');
  const receiptOrderNumber = document.getElementById('receiptOrderNumber');
  const receiptPaidAt = document.getElementById('receiptPaidAt');
  const receiptMethod = document.getElementById('receiptMethod');
  const receiptItemList = document.getElementById('receiptItemList');
  const receiptTotalAmount = document.getElementById('receiptTotalAmount');
  const newOrderBtn = document.getElementById('newOrderBtn');

  /**
   * sessionStorage에 저장된 영수증 데이터를 불러옵니다.
   */
  function loadSavedReceipt() {
    try {
      const raw = window.sessionStorage.getItem(RECEIPT_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (err) {
      console.error('영수증 불러오기 실패:', err);
      return null;
    }
  }

  /**
   * 영수증 화면을 그립니다.
   * 결제를 거치지 않고 바로 들어온 경우 안내 문구만 보여줍니다.
   */
  function renderReceipt() {
    const receipt = loadSavedReceipt();

    if (!receipt || !Array.isArray(receipt.items) || receipt.items.length === 0) {
      emptyReceiptCard.hidden = false;
      receiptCard.hidden = true;
      return;
    }

    // 완료 화면에 들어오면 장바구니는 비우고, 영수증은 새로 고침해도 유지되도록 남겨 둡니다.
    window.ProductCart.clear();

    emptyReceiptCard.hidden = true;
    receiptCard.hidden = false;

    receiptOrderNumber.textContent = receipt.orderNumber;
    receiptPaidAt.textContent = receipt.paidAt;
    receiptMethod.textContent = receipt.paymentMethod;
    receiptTotalAmount.textContent = window.ProductCatalog.formatPrice(receipt.totalPrice);

    receiptItemList.innerHTML = '';
    receipt.items.forEach(function (item) {
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
      receiptItemList.appendChild(li);
    });
  }

  /**
   * "새 주문 시작" 버튼 클릭 시 저장해 둔 영수증을 지우고 시작 화면으로 돌아갑니다.
   */
  newOrderBtn.addEventListener('click', function () {
    try {
      window.sessionStorage.removeItem(RECEIPT_STORAGE_KEY);
    } catch (err) {
      console.error('영수증 삭제 실패:', err);
    }
    window.location.href = 'index.html';
  });

  renderReceipt();
})();
