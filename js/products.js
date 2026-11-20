/**
 * js/products.js
 * 무인 계산대에서 사용할 상품 가격표와 도우미 함수를 정의한 파일입니다.
 */

(function (global) {
  'use strict';

  /**
   * 상품 목록 데이터
   * - className: Teachable Machine 모델의 클래스 이름
   * - name: 화면에 표시할 상품 이름
   * - price: 가격 (원 단위 숫자)
   * - color: 상품을 구분하기 위한 대표 색상 (HEX 값)
   */
  const PRODUCTS = [
    {
      className: '오예스',
      name: '오예스',
      price: 1500,
      color: '#78350F'
    },
    {
      className: '보성홍차 아이스티',
      name: '보성홍차 아이스티',
      price: 1700,
      color: '#F59E0B'
    },
    {
      className: '크리스피롤',
      name: '크리스피롤',
      price: 1200,
      color: '#10B981'
    },
    {
      className: '쿠크다스',
      name: '쿠크다스',
      price: 1300,
      color: '#E11D48'
    }
  ];

  /**
   * 모델의 클래스 이름으로 상품 정보를 찾습니다.
   * 일치하는 상품이 없으면 null을 반환합니다.
   * @param {string} className 모델이 인식한 클래스 이름
   * @returns {Object|null} 상품 객체 또는 null
   */
  function findProductByClassName(className) {
    if (!className) {
      return null;
    }
    return (
      PRODUCTS.find(function (product) {
        return product.className === className;
      }) || null
    );
  }

  /**
   * 숫자 금액을 "1,500원" 형태의 한국어 가격 문자열로 바꿉니다.
   * @param {number} price 원 단위 금액
   * @returns {string} 쉼표와 "원"이 붙은 가격 문자열
   */
  function formatPrice(price) {
    const numericPrice = Number(price) || 0;
    return numericPrice.toLocaleString('ko-KR') + '원';
  }

  // 다른 스크립트에서 불러와 쓸 수 있도록 전역 객체에 등록합니다.
  global.ProductCatalog = {
    PRODUCTS: PRODUCTS,
    findProductByClassName: findProductByClassName,
    formatPrice: formatPrice
  };
})(window);
