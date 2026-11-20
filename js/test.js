/**
 * js/test.js
 * 인식 테스트 화면(test.html)의 UI를 제어하는 스크립트입니다.
 * 카메라와 AI 모델 동작은 js/recognizer.js 모듈을 사용합니다.
 */

(function () {
  'use strict';

  const statusBadge = document.getElementById('statusBadge');
  const cameraVideo = document.getElementById('cameraVideo');
  const errorBox = document.getElementById('errorBox');
  const errorTitle = document.getElementById('errorTitle');
  const errorReason = document.getElementById('errorReason');
  const errorSolutions = document.getElementById('errorSolutions');
  const predictionList = document.getElementById('predictionList');

  // 클래스 이름을 키로 하여 각 줄의 DOM 요소를 저장해 둡니다.
  const rowMap = new Map();

  /**
   * 상태 배지의 글자와 스타일 상태를 바꿉니다.
   */
  function renderStatus(statusKey, message) {
    statusBadge.dataset.status = statusKey;
    statusBadge.textContent = message;
  }

  /**
   * 모델에서 읽어 온 클래스 목록으로 확률 막대 줄을 동적으로 만듭니다.
   */
  function buildPredictionRows(classNames) {
    predictionList.innerHTML = '';
    rowMap.clear();

    if (!classNames || classNames.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'prediction-empty';
      emptyItem.textContent = '모델에서 클래스 목록을 찾지 못했습니다.';
      predictionList.appendChild(emptyItem);
      return;
    }

    classNames.forEach(function (className) {
      const item = document.createElement('li');
      item.className = 'prediction-item';

      const nameEl = document.createElement('span');
      nameEl.className = 'prediction-name';
      nameEl.textContent = className;

      const barWrap = document.createElement('div');
      barWrap.className = 'prediction-bar-track';

      const barFill = document.createElement('div');
      barFill.className = 'prediction-bar-fill';
      barFill.style.width = '0%';
      barWrap.appendChild(barFill);

      const percentEl = document.createElement('span');
      percentEl.className = 'prediction-percent';
      percentEl.textContent = '0%';

      item.appendChild(nameEl);
      item.appendChild(barWrap);
      item.appendChild(percentEl);
      predictionList.appendChild(item);

      rowMap.set(className, {
        item: item,
        barFill: barFill,
        percentEl: percentEl
      });
    });
  }

  /**
   * 예측 결과 목록을 받아 막대 길이와 퍼센트를 갱신하고,
   * 가장 확률이 높은 클래스의 줄을 눈에 띄게 표시합니다.
   */
  function updatePredictions(predictions) {
    if (!predictions || predictions.length === 0) {
      return;
    }

    // 아직 줄이 만들어지지 않았다면 예측 결과의 클래스 이름으로 생성
    if (rowMap.size === 0) {
      buildPredictionRows(predictions.map(function (p) {
        return p.className;
      }));
    }

    // 가장 높은 확률 찾기
    let topClassName = null;
    let maxProbability = -1;

    predictions.forEach(function (item) {
      if (item.probability > maxProbability) {
        maxProbability = item.probability;
        topClassName = item.className;
      }
    });

    // 각 클래스 줄의 막대와 퍼센트, 강조 표시 업데이트
    predictions.forEach(function (item) {
      const row = rowMap.get(item.className);
      if (!row) {
        return;
      }

      const percent = Math.round(item.probability * 100);
      row.barFill.style.width = percent + '%';
      row.percentEl.textContent = percent + '%';

      const isTop = maxProbability > 0 && item.className === topClassName;
      row.item.classList.toggle('is-top', isTop);
    });
  }

  /**
   * 오류 안내 박스에 이유와 해결 방법을 표시합니다.
   */
  function showError(errorInfo) {
    errorTitle.textContent = errorInfo.title;
    errorReason.textContent = '이유: ' + errorInfo.reason;
    errorSolutions.innerHTML = '';

    (errorInfo.solutions || []).forEach(function (solution) {
      const li = document.createElement('li');
      li.textContent = solution;
      errorSolutions.appendChild(li);
    });

    errorBox.hidden = false;
  }

  // 인식기 생성 및 실행
  const recognizer = window.ProductRecognizer.create({
    videoElement: cameraVideo,
    modelBasePath: 'model/',
    onStatusChange: renderStatus,
    onClassesLoaded: buildPredictionRows,
    onPredictions: updatePredictions,
    onError: showError
  });

  recognizer.start();

  // 다른 페이지로 이동하거나 창을 닫을 때 카메라를 안전하게 끕니다.
  window.addEventListener('pagehide', function () {
    recognizer.stop();
  });
  window.addEventListener('beforeunload', function () {
    recognizer.stop();
  });
})();
