/**
 * js/scan.js
 * 계산 화면(scan.html)에서 카메라 인식 결과를 판정 규칙(js/judge.js)에 넣고,
 * 장바구니(js/cart.js)와 직접 담기/수량 조절 UI를 제어하는 스크립트입니다.
 */

(function () {
  'use strict';

  const scanVideo = document.getElementById('scanVideo');
  const addedBanner = document.getElementById('addedBanner');
  const holdProgressWrap = document.getElementById('holdProgressWrap');
  const holdProgressFill = document.getElementById('holdProgressFill');
  const scanStatusLine = document.getElementById('scanStatusLine');
  const quickAddGrid = document.getElementById('quickAddGrid');

  const cartBody = document.getElementById('cartBody');
  const cartEmptyText = document.getElementById('cartEmptyText');
  const cartList = document.getElementById('cartList');
  const clearCartBtn = document.getElementById('clearCartBtn');
  const cartTotalCount = document.getElementById('cartTotalCount');
  const cartTotalAmount = document.getElementById('cartTotalAmount');
  const payButton = document.getElementById('payButton');

  let bannerTimerId = null;
  let highlightTimerId = null;

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
   * 상품을 장바구니에 1개 담고 배너와 강조 효과를 함께 보여줍니다.
   * (카메라 인식과 직접 담기 버튼 양쪽에서 공통으로 사용합니다.)
   */
  function addProductToCart(product) {
    window.ProductCart.addItem(product);
    showAddedBanner(product.name);
    renderCart(product.className);
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
    clearCartBtn.hidden = items.length === 0;

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

      const infoRow = document.createElement('div');
      infoRow.className = 'cart-item-info';

      const nameEl = document.createElement('span');
      nameEl.className = 'cart-item-name';
      nameEl.textContent = item.name;

      const priceEl = document.createElement('span');
      priceEl.className = 'cart-item-price';
      priceEl.textContent = window.ProductCatalog.formatPrice(item.price * item.quantity);

      infoRow.appendChild(nameEl);
      infoRow.appendChild(priceEl);

      // 수량 조절(−, +) 및 삭제 버튼 영역
      const controlsRow = document.createElement('div');
      controlsRow.className = 'cart-item-controls';

      const qtyGroup = document.createElement('div');
      qtyGroup.className = 'cart-qty-group';

      const minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'btn-qty';
      minusBtn.setAttribute('aria-label', item.name + ' 수량 줄이기');
      minusBtn.textContent = '−';
      minusBtn.addEventListener('click', function () {
        window.ProductCart.changeQuantity(item.className, -1);
        renderCart();
      });

      const qtyText = document.createElement('span');
      qtyText.className = 'cart-item-qty';
      qtyText.textContent = item.quantity + '개';

      const plusBtn = document.createElement('button');
      plusBtn.type = 'button';
      plusBtn.className = 'btn-qty';
      plusBtn.setAttribute('aria-label', item.name + ' 수량 늘리기');
      plusBtn.textContent = '+';
      plusBtn.addEventListener('click', function () {
        window.ProductCart.changeQuantity(item.className, 1);
        renderCart();
      });

      qtyGroup.appendChild(minusBtn);
      qtyGroup.appendChild(qtyText);
      qtyGroup.appendChild(plusBtn);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove-item';
      removeBtn.textContent = '삭제';
      removeBtn.addEventListener('click', function () {
        window.ProductCart.removeItem(item.className);
        renderCart();
      });

      controlsRow.appendChild(qtyGroup);
      controlsRow.appendChild(removeBtn);

      li.appendChild(infoRow);
      li.appendChild(controlsRow);
      cartList.appendChild(li);
    });

    // 방금 담긴 줄 강조 효과는 1.5초 후 자연스럽게 해제
    if (highlightClassName) {
      if (highlightTimerId !== null) {
        window.clearTimeout(highlightTimerId);
      }
      highlightTimerId = window.setTimeout(function () {
        const highlighted = cartList.querySelectorAll('.cart-item.is-just-added');
        highlighted.forEach(function (el) {
          el.classList.remove('is-just-added');
        });
        highlightTimerId = null;
      }, 1500);
    }
  }

  /**
   * 가격표의 모든 상품으로 "직접 담기" 버튼 목록을 만듭니다.
   */
  function renderQuickAddButtons() {
    quickAddGrid.innerHTML = '';

    window.ProductCatalog.PRODUCTS.forEach(function (product) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-add-btn';

      const nameEl = document.createElement('span');
      nameEl.className = 'quick-add-name';
      nameEl.textContent = product.name;

      const priceEl = document.createElement('span');
      priceEl.className = 'quick-add-price';
      priceEl.textContent = window.ProductCatalog.formatPrice(product.price);

      btn.appendChild(nameEl);
      btn.appendChild(priceEl);

      btn.addEventListener('click', function () {
        addProductToCart(product);
      });

      quickAddGrid.appendChild(btn);
    });
  }

  /**
   * "전체 비우기" 버튼 클릭 시 확인 후 장바구니를 비웁니다.
   */
  clearCartBtn.addEventListener('click', function () {
    if (window.confirm('장바구니를 모두 비울까요?')) {
      window.ProductCart.clear();
      renderCart();
    }
  });

  /**
   * "결제하기" 버튼 클릭 시 결제 화면(pay.html)으로 이동합니다.
   */
  payButton.addEventListener('click', function () {
    if (window.ProductCart.getItems().length === 0) {
      return;
    }
    window.location.href = 'pay.html';
  });

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
      addProductToCart(result.addedProduct);
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

  // 초기 화면 구성: 직접 담기 버튼 생성 및 저장된 장바구니 복원
  renderQuickAddButtons();
  renderCart();

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
