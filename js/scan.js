/**
 * js/scan.js
 * 계산 화면(scan.html)에서 카메라 인식 결과를 판정 규칙(js/judge.js)에 넣고,
 * 장바구니(js/cart.js)와 화면 UI를 갱신하는 스크립트입니다.
 */

(function () {
  'use strict';

  const scanVideo = document.getElementById('scanVideo');
  const addedBanner = document.getElementById('addedBanner');
  const holdProgressWrap = document.getElementById('holdProgressWrap');
  const holdProgressFill = document.getElementById('holdProgressFill');
  const scanStatusLine = document.getElementById('scanStatusLine');

  const cartBody = document.getElementById('cartBody');
  const cartEmptyText = document.getElementById('cartEmptyText');
  const cartList = document.getElementById('cartList');
  const cartTotalCount = document.getElementById('cartTotalCount');
  const cartTotalAmount = document.getElementById('cartTotalAmount');
  const payButton = document.getElementById('payButton');

  let bannerTimerId = null;
  let highlightTimerId = null;
  let lastAddedClassName = null;

  // 판정기 생성
  const judge = window.ProductJudge.create();

  /**
   * 인식 상태 한 줄의 문구와 표시 상태를 바꿉니다.
   */
  function setStatusLine(state, text) {
    scanStatusLine.dataset.state = state;
    scanStatusLine.textContent = text;
  }

  /**
   * 카메라 아래 진행 막대를 갱신하거나 숨깁니다.
   */
  function updateHoldProgress(result) {
    if (!result.candidate || result.status === '대기') {
      holdProgressWrap.hidden = true;
      holdProgressFill.style.width = '0%';
      return;
    }

    holdProgressWrap.hidden = false;
    const percent = Math.round(result.progress * 100);
    holdProgressFill.style.width = percent + '%';
  }

  /**
   * 상품이 장바구니에 담겼을 때 카메라 영역에 1.5초 동안 크게 안내합니다.
   */
  function showAddedBanner(productName) {
    if (bannerTimerId !== null) {
      window.clearTimeout(bannerTimerId);
    }

    addedBanner.textContent = productName + ' 담았어요';
    addedBanner.hidden = false;

    bannerTimerId = window.setTimeout(function () {
      addedBanner.hidden = true;
      bannerTimerId = null;
    }, 1500);
  }

  /**
   * 장바구니 영역 UI를 현재 저장된 장바구니 데이터에 맞춰 다시 그립니다.
   */
  function renderCart(highlightClassName) {
    const items = window.ProductCart.getItems();
    const totalCount = window.ProductCart.getTotalCount();
    const totalPrice = window.ProductCart.getTotalPrice();

    cartTotalCount.textContent = totalCount + '개';
    cartTotalAmount.textContent = window.ProductCatalog.formatPrice(totalPrice);
    payButton.disabled = items.length === 0;

    if (items.length === 0) {
      cartBody.classList.remove('has-items');
      cartEmptyText.hidden = false;
      cartList.hidden = true;
      cartList.innerHTML = '';
      return;
    }

    cartBody.classList.add('has-items');
    cartEmptyText.hidden = true;
    cartList.hidden = false;
    cartList.innerHTML = '';

    items.forEach(function (item) {
      const li = document.createElement('li');
      li.className = 'cart-item';
      if (highlightClassName && item.className === highlightClassName) {
        li.classList.add('is-just-added');
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'cart-item-name';
      nameEl.textContent = item.name;

      const qtyEl = document.createElement('span');
      qtyEl.className = 'cart-item-qty';
      qtyEl.textContent = item.quantity + '개';

      const priceEl = document.createElement('span');
      priceEl.className = 'cart-item-price';
      priceEl.textContent = window.ProductCatalog.formatPrice(item.price * item.quantity);

      li.appendChild(nameEl);
      li.appendChild(qtyEl);
      li.appendChild(priceEl);
      cartList.appendChild(li);
    });

    // 방금 담긴 줄 강조 효과는 1.5초 후 자연스럽게 해제
    if (highlightClassName) {
      if (highlightTimerId !== null) {
        window.clearTimeout(highlightTimerId);
      }
      lastAddedClassName = highlightClassName;
      highlightTimerId = window.setTimeout(function () {
        lastAddedClassName = null;
        const highlighted = cartList.querySelectorAll('.cart-item.is-just-added');
        highlighted.forEach(function (el) {
          el.classList.remove('is-just-added');
        });
        highlightTimerId = null;
      }, 1500);
    }
  }

  /**
   * 모델/카메라 준비 상태가 바뀔 때 안내 문구를 갱신합니다.
   */
  function handleStatusChange(statusKey, message) {
    if (statusKey === 'running') {
      setStatusLine('idle', '상품을 카메라에 비춰 주세요');
      return;
    }
    if (statusKey === 'error') {
      setStatusLine('error', message);
      return;
    }
    setStatusLine('idle', message);
  }

  /**
   * 오류가 발생했을 때 상태 한 줄에 이유를 안내합니다.
   */
  function handleError(errorInfo) {
    setStatusLine('error', errorInfo.title + ' - ' + errorInfo.reason);
  }

  /**
   * 예측 결과가 나올 때마다 판정 규칙에 넣고 화면을 갱신합니다.
   */
  function handlePredictions(predictions) {
    const result = judge.evaluate(predictions, Date.now());
    updateHoldProgress(result);

    if (result.addedProduct) {
      window.ProductCart.addItem(result.addedProduct);
      showAddedBanner(result.addedProduct.name);
      renderCart(result.addedProduct.className);
      setStatusLine('detected', result.addedProduct.name + ' 담았어요!');
      return;
    }

    if (result.status === '인식 중' && result.candidate) {
      const percent = Math.round(result.progress * 100);
      const formattedPrice = window.ProductCatalog.formatPrice(result.candidate.price);
      setStatusLine('detected', result.candidate.name + ' ' + formattedPrice + ' (' + percent + '%)');
      return;
    }

    if (result.status === '치워 주세요') {
      setStatusLine('warning', '상품을 치워 주세요');
      return;
    }

    setStatusLine('idle', '상품을 카메라에 비춰 주세요');
  }

  // 처음 열릴 때 sessionStorage에 남아 있는 장바구니를 복원해 표시
  renderCart(lastAddedClassName);

  // 인식기 생성 및 실행
  const recognizer = window.ProductRecognizer.create({
    videoElement: scanVideo,
    modelBasePath: 'model/',
    onStatusChange: handleStatusChange,
    onPredictions: handlePredictions,
    onError: handleError
  });

  recognizer.start();

  // 화면을 떠날 때 카메라를 안전하게 끕니다.
  window.addEventListener('pagehide', function () {
    recognizer.stop();
  });
  window.addEventListener('beforeunload', function () {
    recognizer.stop();
  });
})();
