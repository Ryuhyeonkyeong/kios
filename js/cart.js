/**
 * js/cart.js
 * 장바구니에 담긴 상품 목록을 관리하고 sessionStorage에 저장하는 모듈입니다.
 * 새로 고침하거나 다른 화면에 다녀와도 장바구니가 유지됩니다.
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'mongle_kiosk_cart';

  /**
   * sessionStorage에서 장바구니 목록을 불러옵니다.
   * 저장된 값이 없거나 손상되었으면 빈 배열을 반환합니다.
   */
  function loadItems() {
    try {
      const raw = global.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('장바구니 불러오기 실패:', err);
      return [];
    }
  }

  /**
   * 현재 장바구니 목록을 sessionStorage에 저장합니다.
   */
  function saveItems(items) {
    try {
      global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('장바구니 저장 실패:', err);
    }
  }

  /**
   * 장바구니에 상품을 1개 담습니다.
   * 이미 같은 상품(className)이 있으면 수량만 1 올립니다.
   * @param {Object} product { className, name, price }
   * @returns {Array} 갱신된 장바구니 목록
   */
  function addItem(product) {
    if (!product || !product.className) {
      return loadItems();
    }

    const items = loadItems();
    const existing = items.find(function (item) {
      return item.className === product.className;
    });

    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({
        className: product.className,
        name: product.name,
        price: Number(product.price) || 0,
        quantity: 1
      });
    }

    saveItems(items);
    return items;
  }

  /**
   * 현재 장바구니 목록을 반환합니다.
   */
  function getItems() {
    return loadItems();
  }

  /**
   * 장바구니에 담긴 전체 상품 수량을 계산합니다.
   */
  function getTotalCount() {
    return loadItems().reduce(function (sum, item) {
      return sum + item.quantity;
    }, 0);
  }

  /**
   * 장바구니에 담긴 전체 합계 금액을 계산합니다.
   */
  function getTotalPrice() {
    return loadItems().reduce(function (sum, item) {
      return sum + item.price * item.quantity;
    }, 0);
  }

  /**
   * 장바구니를 비웁니다.
   */
  function clear() {
    saveItems([]);
  }

  global.ProductCart = {
    getItems: getItems,
    addItem: addItem,
    getTotalCount: getTotalCount,
    getTotalPrice: getTotalPrice,
    clear: clear
  };
})(window);
