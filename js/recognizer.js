/**
 * js/recognizer.js
 * 카메라를 켜고 Teachable Machine 이미지 모델을 불러와
 * 상품(클래스) 인식을 반복 수행하는 재사용 가능한 모듈입니다.
 */

(function (global) {
  'use strict';

  /**
   * 인식기 인스턴스를 생성합니다.
   * @param {Object} options 설정 객체
   * @param {HTMLVideoElement} options.videoElement 카메라 영상을 보여줄 video 요소
   * @param {string} [options.modelBasePath='model/'] model.json, metadata.json이 있는 폴더 경로
   * @param {Function} [options.onStatusChange] 상태가 바뀔 때 호출되는 함수 (statusKey, message)
   * @param {Function} [options.onClassesLoaded] 모델 클래스 목록을 읽어왔을 때 호출되는 함수 (classNames)
   * @param {Function} [options.onPredictions] 예측 결과가 나올 때마다 호출되는 함수 ([{ className, probability }, ...])
   * @param {Function} [options.onError] 오류가 발생했을 때 호출되는 함수 ({ title, reason, solutions })
   */
  function createRecognizer(options) {
    const videoElement = options.videoElement;
    const modelBasePath = options.modelBasePath || 'model/';
    const onStatusChange = options.onStatusChange || function () {};
    const onClassesLoaded = options.onClassesLoaded || function () {};
    const onPredictions = options.onPredictions || function () {};
    const onError = options.onError || function () {};

    let model = null; // 불러온 Teachable Machine 모델
    let stream = null; // 카메라 미디어 스트림
    let isRunning = false; // 예측 반복 실행 여부
    let rafId = null; // requestAnimationFrame 식별자

    // 영상의 가운데 정사각형 영역만 잘라 모델에 넣기 위한 임시 캔버스
    const cropCanvas = document.createElement('canvas');
    const cropContext = cropCanvas.getContext('2d');

    /**
     * 상태 변경 알림을 보냅니다.
     */
    function updateStatus(statusKey, message) {
      onStatusChange(statusKey, message);
    }

    /**
     * 모델 불러오기 오류를 한국어 안내 정보로 변환합니다.
     */
    function buildModelError(err) {
      console.error('모델 불러오기 실패:', err);
      return {
        title: 'AI 모델을 불러오지 못했습니다',
        reason: 'model 폴더의 모델 파일(model.json, metadata.json, weights.bin)을 읽을 수 없거나, 라이브러리 연결에 실패했습니다.',
        solutions: [
          '프로젝트의 model 폴더 바로 아래에 model.json, metadata.json, weights.bin 세 파일이 모두 있는지 확인해 주세요.',
          '인터넷 연결이 되어 있는지 확인한 뒤 페이지를 새로 고침해 주세요.'
        ]
      };
    }

    /**
     * 카메라 시작 오류를 원인별로 분류해 한국어 안내 정보로 변환합니다.
     */
    function buildCameraError(err) {
      console.error('카메라 연결 실패:', err);
      const errorName = err && err.name ? err.name : '';

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        return {
          title: '카메라 권한이 거부되었습니다',
          reason: '브라우저에서 이 페이지의 카메라 사용을 허용하지 않았습니다.',
          solutions: [
            '브라우저 주소창 왼쪽의 아이콘(자물쇠 또는 설정 아이콘)을 눌러 카메라 권한을 "허용"으로 변경해 주세요.',
            '권한을 변경한 뒤 페이지를 새로 고침해 주세요.'
          ]
        };
      }

      if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError' || errorName === 'OverconstrainedError') {
        return {
          title: '사용할 수 있는 카메라를 찾지 못했습니다',
          reason: '기기에 연결된 카메라가 없거나, 카메라 장치를 인식할 수 없습니다.',
          solutions: [
            '컴퓨터나 휴대폰에 카메라가 정상적으로 연결되어 있는지 확인해 주세요.',
            '카메라가 없는 환경이라면 카메라가 있는 기기(노트북, 스마트폰 등)의 Chrome 브라우저에서 열어 주세요.'
          ]
        };
      }

      if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        return {
          title: '카메라를 사용할 수 없습니다',
          reason: '다른 프로그램이나 브라우저 탭에서 이미 카메라를 사용 중일 수 있습니다.',
          solutions: [
            '카메라를 사용 중인 다른 앱(화상 회의, 카메라 앱 등)을 종료해 주세요.',
            '종료한 뒤 페이지를 새로 고침해 주세요.'
          ]
        };
      }

      if (errorName === 'UnsupportedMediaDevices') {
        return {
          title: '카메라 기능을 지원하지 않는 환경입니다',
          reason: '현재 브라우저가 카메라 API를 지원하지 않거나, 보안 주소(localhost 또는 HTTPS)로 접속하지 않았습니다.',
          solutions: [
            '주소창이 http://localhost:3001 또는 https:// 로 시작하는지 확인해 주세요.',
            '최신 Chrome 또는 Safari 브라우저에서 다시 열어 주세요.'
          ]
        };
      }

      return {
        title: '카메라를 켜는 중 문제가 발생했습니다',
        reason: '일시적인 장치 오류 또는 브라우저 제한으로 카메라를 시작하지 못했습니다.',
        solutions: [
          '잠시 후 페이지를 새로 고침해 다시 시도해 주세요.',
          '문제가 계속되면 Chrome 브라우저에서 권한 설정을 확인해 주세요.'
        ]
      };
    }

    /**
     * video 요소에 아이폰(iOS Safari)에서도 인라인 재생이 되도록 속성을 설정합니다.
     */
    function prepareVideoElement() {
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('muted', '');
      videoElement.setAttribute('autoplay', '');
      videoElement.playsInline = true;
      videoElement.muted = true;
      videoElement.autoplay = true;
    }

    /**
     * 카메라를 켜고 video 요소에 연결합니다.
     */
    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const unsupportedErr = new Error('navigator.mediaDevices.getUserMedia 미지원');
        unsupportedErr.name = 'UnsupportedMediaDevices';
        throw unsupportedErr;
      }

      prepareVideoElement();

      // 후면/기본 웹캠 우선 연결 (정사각형 크롭을 위해 적당한 해상도 요청)
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });

      videoElement.srcObject = stream;

      // 영상 크기(videoWidth, videoHeight)를 알 수 있을 때까지 대기 후 재생
      await new Promise(function (resolve, reject) {
        function handleLoadedMetadata() {
          cleanup();
          resolve();
        }
        function handleError() {
          cleanup();
          reject(new Error('비디오 메타데이터 로드 실패'));
        }
        function cleanup() {
          videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
          videoElement.removeEventListener('error', handleError);
        }

        if (videoElement.readyState >= 1) {
          resolve();
          return;
        }
        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.addEventListener('error', handleError);
      });

      await videoElement.play();
    }

    /**
     * 현재 video 프레임의 가운데 정사각형 부분만 잘라 캔버스에 그립니다.
     * 화면의 정사각형 영역과 모델이 보는 영역을 일치시키기 위한 처리입니다.
     */
    function drawCenterSquareToCanvas() {
      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      if (!vw || !vh) {
        return false;
      }

      const squareSize = Math.min(vw, vh);
      const sx = (vw - squareSize) / 2;
      const sy = (vh - squareSize) / 2;

      if (cropCanvas.width !== squareSize || cropCanvas.height !== squareSize) {
        cropCanvas.width = squareSize;
        cropCanvas.height = squareSize;
      }

      cropContext.drawImage(
        videoElement,
        sx, sy, squareSize, squareSize,
        0, 0, squareSize, squareSize
      );
      return true;
    }

    /**
     * 앞의 예측이 끝난 뒤에 다음 예측을 이어서 실행하는 반복 루프입니다.
     */
    async function predictLoop() {
      if (!isRunning || !model) {
        return;
      }

      try {
        const hasFrame = drawCenterSquareToCanvas();
        if (hasFrame) {
          // Teachable Machine 웹캠 학습 방식(거울 모드)에 맞춰 두 번째 인자 flipped 를 true 로 전달
          const rawPredictions = await model.predict(cropCanvas, true);
          const formatted = rawPredictions.map(function (item) {
            return {
              className: item.className,
              probability: item.probability
            };
          });

          if (isRunning) {
            onPredictions(formatted);
          }
        }
      } catch (err) {
        console.error('예측 중 오류 발생:', err);
      }

      // 앞선 예측이 완전히 끝난 뒤 다음 프레임에서 다시 실행
      if (isRunning) {
        rafId = global.requestAnimationFrame(predictLoop);
      }
    }

    /**
     * 모델 불러오기 -> 카메라 켜기 -> 인식 시작 순서로 실행합니다.
     */
    async function start() {
      stop(); // 이미 실행 중인 상태가 있다면 먼저 정리

      // 1단계: 모델 불러오기
      updateStatus('loading-model', '모델 불러오는 중...');
      try {
        if (!global.tmImage || typeof global.tmImage.load !== 'function') {
          throw new Error('tmImage 라이브러리를 찾을 수 없습니다.');
        }
        const modelURL = modelBasePath + 'model.json';
        const metadataURL = modelBasePath + 'metadata.json';
        model = await global.tmImage.load(modelURL, metadataURL);

        // 모델에서 클래스 이름 목록을 읽어와 화면에 알림
        const labels = typeof model.getClassLabels === 'function' ? model.getClassLabels() : [];
        onClassesLoaded(labels);
      } catch (err) {
        updateStatus('error', '모델을 불러오지 못했습니다');
        onError(buildModelError(err));
        return false;
      }

      // 2단계: 카메라 권한 요청 및 연결
      updateStatus('requesting-camera', '카메라 권한을 허용해 주세요');
      try {
        await startCamera();
      } catch (err) {
        stopCameraOnly();
        updateStatus('error', '카메라를 시작할 수 없습니다');
        onError(buildCameraError(err));
        return false;
      }

      // 3단계: 인식 시작
      isRunning = true;
      updateStatus('running', '인식 중');
      predictLoop();
      return true;
    }

    /**
     * 카메라 스트림만 안전하게 종료합니다.
     */
    function stopCameraOnly() {
      if (stream) {
        stream.getTracks().forEach(function (track) {
          track.stop();
        });
        stream = null;
      }
      if (videoElement && videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    }

    /**
     * 예측 루프와 카메라를 모두 종료합니다.
     */
    function stop() {
      isRunning = false;
      if (rafId !== null) {
        global.cancelAnimationFrame(rafId);
        rafId = null;
      }
      stopCameraOnly();
    }

    return {
      start: start,
      stop: stop
    };
  }

  global.ProductRecognizer = {
    create: createRecognizer
  };
})(window);
