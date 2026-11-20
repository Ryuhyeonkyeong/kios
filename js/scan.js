/**
 * js/scan.js
 * 계산 화면(scan.html)의 카메라 인식 상태 표시를 제어하는 스크립트입니다.
 * 카메라와 AI 모델은 js/recognizer.js, 상품 정보는 js/products.js를 사용합니다.
 */

(function () {
  'use strict';

  const scanVideo = document.getElementById('scanVideo');
  const scanStatusLine = document.getElementById('scanStatusLine');

  /**
   * 인식 상태 한 줄의 문구와 표시 상태를 바꿉니다.
   */
  function setStatusLine(state, text) {
    scanStatusLine.dataset.state = state;
    scanStatusLine.textContent = text;
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
   * 오류가 발생했을 때 상태 한 줄에 이유를 간단히 안내합니다.
   */
  function handleError(errorInfo) {
    setStatusLine('error', errorInfo.title + ' - ' + errorInfo.reason);
  }

  /**
   * 예측 결과에서 가장 확률이 높은 클래스를 찾아 상태 한 줄을 갱신합니다.
   * - "없음"이면 "상품을 카메라에 비춰 주세요"
   * - 가격표에 있는 상품이면 "상품이름 1,500원 (98%)" 형태로 표시
   */
  function handlePredictions(predictions) {
    if (!predictions || predictions.length === 0) {
      return;
    }

    let topPrediction = predictions[0];
    predictions.forEach(function (item) {
      if (item.probability > topPrediction.probability) {
        topPrediction = item;
      }
    });

    if (topPrediction.className === '없음') {
      setStatusLine('idle', '상품을 카메라에 비춰 주세요');
      return;
    }

    const percent = Math.round(topPrediction.probability * 100);
    const product = window.ProductCatalog.findProductByClassName(topPrediction.className);

    if (product) {
      const formattedPrice = window.ProductCatalog.formatPrice(product.price);
      setStatusLine('detected', product.name + ' ' + formattedPrice + ' (' + percent + '%)');
      return;
    }

    // 가격표에 등록되지 않은 클래스가 인식된 경우
    setStatusLine('idle', '상품을 카메라에 비춰 주세요');
  }

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
