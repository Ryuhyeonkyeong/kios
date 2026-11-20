/**
 * js/config.js
 * 상품 인식 판정에 사용하는 기준값을 모아 둔 설정 파일입니다.
 */

(function (global) {
  'use strict';

  const KioskConfig = {
    // 상품 후보로 인정할 최소 확률 (0.9 = 90%)
    CONFIDENCE_THRESHOLD: 0.9,

    // 같은 후보가 끊기지 않고 유지되어야 장바구니에 담기는 시간 (밀리초)
    HOLD_TIME_MS: 1000,

    // 담은 상품을 치운 뒤 다시 같은 상품을 담기 위해 필요한 빈 상태 유지 시간 (밀리초)
    CLEAR_TIME_MS: 500,

    // 카메라 앞에 상품이 없을 때의 클래스 이름
    EMPTY_CLASS_NAME: '없음'
  };

  // 브라우저 환경과 Node.js 테스트 환경 모두에서 사용할 수 있도록 내보냅니다.
  global.KioskConfig = KioskConfig;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KioskConfig;
  }
})(typeof window !== 'undefined' ? window : globalThis);
