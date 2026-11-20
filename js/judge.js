/**
 * js/judge.js
 * AI 모델의 예측 결과를 바탕으로 "지금 상품을 장바구니에 담을지" 판정하는 모듈입니다.
 * 카메라나 화면(DOM) 없이도 순수 데이터와 시각(밀리초)만으로 동작합니다.
 */

(function (global) {
  'use strict';

  // Node.js 환경에서도 동작하도록 config와 products를 불러옵니다.
  const defaultConfig =
    global.KioskConfig ||
    (typeof require === 'function' ? require('./config.js') : null);
  const defaultCatalog =
    global.ProductCatalog ||
    (typeof require === 'function' ? require('./products.js') : null);

  /**
   * 판정기 인스턴스를 생성합니다.
   * @param {Object} [options] 선택 설정
   * @param {Object} [options.config] 판정 기준값 객체 (기본값: KioskConfig)
   * @param {Function} [options.findProduct] 클래스 이름으로 상품을 찾는 함수
   */
  function createJudge(options) {
    const opts = options || {};
    const config = opts.config || defaultConfig;
    const findProduct =
      opts.findProduct ||
      (defaultCatalog ? defaultCatalog.findProductByClassName : function () { return null; });

    // 내부 상태 변수
    let candidateProduct = null; // 현재 유지 시간을 재고 있는 후보 상품
    let candidateStartMs = null; // 후보가 시작된 시각 (밀리초)
    let lockedClassName = null; // 이미 담은 뒤 아직 치우지 않은 상품의 클래스 이름
    let clearStartMs = null; // 잠긴 상품이 화면에서 사라진 시각 (밀리초)

    /**
     * 예측 결과 목록에서 규칙 1(후보)에 맞는 상품을 찾습니다.
     * - 가장 확률이 높은 클래스가 빈 상태("없음")가 아니어야 합니다.
     * - 확률이 기준(0.9) 이상이어야 합니다.
     * - 가격표(js/products.js)에 등록된 상품이어야 합니다.
     */
    function findCandidateProduct(predictions) {
      if (!predictions || predictions.length === 0) {
        return null;
      }

      let top = predictions[0];
      for (let i = 1; i < predictions.length; i += 1) {
        if (predictions[i].probability > top.probability) {
          top = predictions[i];
        }
      }

      if (top.className === config.EMPTY_CLASS_NAME) {
        return null;
      }
      if (top.probability < config.CONFIDENCE_THRESHOLD) {
        return null;
      }

      return findProduct(top.className);
    }

    /**
     * 예측 결과와 현재 시각(밀리초)을 받아 판정 결과를 돌려줍니다.
     * @param {Array<{className: string, probability: number}>} predictions 예측 결과 목록
     * @param {number} [nowMs=Date.now()] 현재 시각 (밀리초)
     * @returns {{
     *   candidate: Object|null,
     *   progress: number,
     *   addedProduct: Object|null,
     *   status: '대기'|'인식 중'|'담김'|'치워 주세요'
     * }}
     */
    function evaluate(predictions, nowMs) {
      const currentMs = typeof nowMs === 'number' ? nowMs : Date.now();
      const detectedProduct = findCandidateProduct(predictions);

      // 이미 담은 상품이 잠겨 있는 상태 처리 (규칙 3, 규칙 4)
      if (lockedClassName !== null) {
        if (detectedProduct && detectedProduct.className === lockedClassName) {
          // 규칙 3: 같은 상품을 계속 비추고 있으면 다시 담지 않고 치워 달라고 안내
          clearStartMs = null;
          return {
            candidate: detectedProduct,
            progress: 1,
            addedProduct: null,
            status: '치워 주세요'
          };
        }

        if (detectedProduct && detectedProduct.className !== lockedClassName) {
          // 규칙 4: 치우지 않고 바로 다른 상품을 비추면 새 후보로 전환
          lockedClassName = null;
          clearStartMs = null;
        } else {
          // 후보가 없는 상태가 치움 시간(500ms) 이상 이어졌는지 확인
          if (clearStartMs === null) {
            clearStartMs = currentMs;
          }
          if (currentMs - clearStartMs >= config.CLEAR_TIME_MS) {
            lockedClassName = null;
            clearStartMs = null;
          }
          return {
            candidate: null,
            progress: 0,
            addedProduct: null,
            status: '대기'
          };
        }
      }

      // 후보가 없는 경우: 대기 상태로 초기화
      if (!detectedProduct) {
        candidateProduct = null;
        candidateStartMs = null;
        return {
          candidate: null,
          progress: 0,
          addedProduct: null,
          status: '대기'
        };
      }

      // 새 후보가 시작되었거나 중간에 다른 상품으로 바뀐 경우: 시간을 처음부터 다시 잼
      if (!candidateProduct || candidateProduct.className !== detectedProduct.className) {
        candidateProduct = detectedProduct;
        candidateStartMs = currentMs;
        return {
          candidate: candidateProduct,
          progress: 0,
          addedProduct: null,
          status: '인식 중'
        };
      }

      // 규칙 2: 같은 후보가 끊기지 않고 유지 시간(1000ms) 동안 이어졌는지 확인
      const elapsedMs = currentMs - candidateStartMs;
      const progress = Math.min(1, elapsedMs / config.HOLD_TIME_MS);

      if (elapsedMs >= config.HOLD_TIME_MS) {
        const added = candidateProduct;
        lockedClassName = candidateProduct.className;
        clearStartMs = null;
        candidateProduct = null;
        candidateStartMs = null;

        return {
          candidate: added,
          progress: 1,
          addedProduct: added,
          status: '담김'
        };
      }

      return {
        candidate: candidateProduct,
        progress: progress,
        addedProduct: null,
        status: '인식 중'
      };
    }

    /**
     * 판정기 내부 상태를 처음 상태로 되돌립니다.
     */
    function reset() {
      candidateProduct = null;
      candidateStartMs = null;
      lockedClassName = null;
      clearStartMs = null;
    }

    return {
      evaluate: evaluate,
      reset: reset
    };
  }

  const ProductJudge = {
    create: createJudge
  };

  global.ProductJudge = ProductJudge;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductJudge;
  }
})(typeof window !== 'undefined' ? window : globalThis);
