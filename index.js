!function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.ImageCropper = factory(root);
  }
}(typeof window !== 'undefined' ? window : this, function () {
  function getRectByRatio(data, ratio) {
    var width = data.maxWidth;
    var height = ratio ? ~~ (data.maxWidth / ratio) : data.maxHeight;
    if (height > data.maxHeight) {
      height = data.maxHeight;
      width = ~~ (data.maxHeight * ratio);
    }
    return {
      width: width,
      height: height,
    };
  }
  function setStyles(el, styles) {
    for (var k in styles) {
      el.style[k] = styles[k];
    }
  }
  function debounce(func, time) {
    function call() {
      timer = null;
      func();
    }
    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
    function debouncedCall() {
      clearTimer();
      timer = setTimeout(call, time);
    }
    var timer;
    time = time || 0;
    return debouncedCall;
  }
  function initCSS(css) {
    styles = document.createElement('style');
    styles.innerHTML = css || defaultCSS;
    document.head.appendChild(styles);
  }

  function create(_options) {
    function createCanvas(width, height) {
      // create a canvas and set default width and height as 1px
      // so that no unexpected scroll bars will appear
      var canvas = document.createElement('canvas');
      canvas.width = width || 1;
      canvas.height = height || 1;
      return canvas;
    }
    function init() {
      styles || initCSS();
      for (var k in _options) options[k] = _options[k];
      _options = null;
      var container = options.container;
      maxWidth = options.width || container.clientWidth;
      maxHeight = options.height || container.clientHeight;
      container.innerHTML = '<div class="cropper cropper-hide"></div>';
      wrap = container.firstChild;
      if (options.className) wrap.className += ' ' + options.className;
      canvasSource = createCanvas();
      canvasMask = createCanvas();
      canvasRect = createCanvas();
      canvasClipped = createCanvas();
      canvasMask.className = 'cropper-mask';
      canvasRect.className = 'cropper-area';
      rect = document.createElement('div');
      rect.className = 'cropper-rect';
      rect.innerHTML = (options.directions || ['nw', 'ne', 'sw', 'se']).map(function (direction) {
        return '<div class="cropper-resizer cropper-resizer-' + direction + '"></div>';
      }).join('');
      wrap.appendChild(canvasMask);
      wrap.appendChild(canvasRect);
      wrap.appendChild(rect);
      setDebounce(options.debounce);
      rect.addEventListener('mousedown', onCropStart, false);
    }
    function setDebounce(debounceOption) {
      cancelDebounce && cancelDebounce();
      if (debounceOption === 'mouseup') {
        cancelDebounce = events.on('CANVAS_INIT CROP_END', crop);
      } else {
        // If debounceOption is falsy, debounce will ensure only
        // one crop is processed during one event loop
        cancelDebounce = events.on('UPDATE_RECT', debounce(crop, debounceOption));
      }
    }
    function setRatio(ratio) {
      if (ratio == null) ratio = 1;
      options.ratio = ratio;
      var data = getRectByRatio({
        maxWidth: cropWidth,
        maxHeight: cropHeight,
      }, ratio);
      cropWidth = data.width;
      cropHeight = data.height;
      updateRect();
    }
    /**
     * @desc Reset cropper by setting an image.
     * @param {Image/Blob} image
     * @param {Object} cropRect {x, y, width, height}
     */
    function reset(image, cropRect) {
      // Transform image to dataURL to avoid cross-domain issues
      if (!image) {
        wrap.classList.add('cropper-hide');
      } else if (image instanceof Image) {
        var canvas = createCanvas(image.width, image.height);
        canvas.getContext('2d').drawImage(image, 0, 0);
        initCropper(canvas.toDataURL(), cropRect);
      } else if (image instanceof Blob) {
        var reader = new FileReader;
        reader.onload = function (e) {
          initCropper(e.target.result, cropRect);
        };
        reader.readAsDataURL(image);
      } else {
        throw 'Unknown image type!';
      }
    }
    function initCropper(dataURL, cropRect) {
      image = new Image;
      image.onload = function () {
        initCanvas(cropRect);
      };
      image.src = dataURL;
    }
    function initCanvas(cropRect) {
      wrap.classList.remove('cropper-hide');
      var data = getRectByRatio({
        maxWidth: maxWidth,
        maxHeight: maxHeight,
      }, image.width / image.height);
      fullWidth = data.width;
      fullHeight = data.height;
      setStyles(wrap, {
        width: fullWidth + 'px',
        height: fullHeight + 'px',
        top: ((maxHeight - fullHeight) >> 1) + 'px',
        left: ((maxWidth - fullWidth) >> 1) + 'px',
      });
      var ctx;
      canvasSource.width = canvasMask.width = fullWidth;
      canvasSource.height = canvasMask.height = fullHeight;
      ctx = canvasSource.getContext('2d');
      // In case image has transparent pixels
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, fullWidth, fullHeight);
      ctx.drawImage(image, 0, 0, fullWidth, fullHeight);
      ctx = canvasMask.getContext('2d');
      ctx.drawImage(canvasSource, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(0, 0, fullWidth, fullHeight);
      setRect(cropRect || {});
      events.fire('CANVAS_INIT');
    }
    function setRect(rect) {
      rect = {
        x: rect.x,
        y: rect.y,
        width: rect.width || fullWidth,
        height: rect.height || fullHeight,
      };
      data = getRectByRatio({
        maxWidth: Math.min(fullWidth, rect.width),
        maxHeight: Math.min(fullHeight, rect.height),
      }, options.ratio);
      cropWidth = data.width;
      cropHeight = data.height;
      setRatio(options.ratio);
      cropX = rect.x == null ? (fullWidth - cropWidth) >> 1 : Math.min(rect.x, fullWidth - cropWidth);
      cropY = rect.y == null ? (fullHeight - cropHeight) >> 1 : Math.min(rect.y, fullHeight - cropHeight);
      updateRect();
    }
    function updateRect() {
      setStyles(rect, {
        left: cropX + 'px',
        top: cropY + 'px',
        width: cropWidth + 'px',
        height: cropHeight + 'px',
      });
      canvasRect.style.left = cropX + 'px';
      canvasRect.style.top = cropY + 'px';
      canvasRect.width = cropWidth;
      canvasRect.height = cropHeight;
      // Draw from canvasSource to avoid image flashing
      canvasRect.getContext('2d').drawImage(canvasSource, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      events.fire('UPDATE_RECT');
    }
    function getCropped() {
      var ratio = cropWidth / cropHeight;
      var sourceX = ~~ (cropX / fullWidth * image.width);
      var sourceY = ~~ (cropY / fullHeight * image.height);
      var sourceWidth, sourceHeight;
      // calculate the cropped rect by the smaller side
      // to avoid inaccuracy when image is largely scaled
      if (ratio >= 1) {
        sourceHeight = ~~ (cropHeight / fullHeight * image.height);
        sourceWidth = ~~ (sourceHeight * ratio);
      } else {
        sourceWidth = ~~ (cropWidth / fullWidth * image.width);
        sourceHeight = ~~ (sourceWidth / ratio);
      }
      canvasClipped.width = sourceWidth;
      canvasClipped.height = sourceHeight;
      canvasClipped.getContext('2d').drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
      return canvasClipped;
    }
    function crop() {
      var onCrop = options.onCrop;
      if (onCrop) {
        var canvas;
        onCrop({
          x: cropX,
          y: cropY,
          width: cropWidth,
          height: cropHeight,
          getCanvas: function () {
            if (!canvas) canvas = getCropped();
            return canvas;
          },
        });
      }
    }
    function onCropStart(e) {
      e.preventDefault();
      if (mouseData) return;
      events.fire('CROP_START');
      var matches = e.target.className.match(/cropper-resizer-(\w+)/);
      if (matches) {
        onResizeStart(e, matches[1]);
      } else {
        onMoveStart(e);
      }
    }
    function onCropEnd(_e) {
      mouseData = null;
      events.fire('CROP_END');
    }
    function onResizeStart(_e, direction) {
      events.fire('RESIZE_START');
      var containerRect = wrap.getBoundingClientRect();
      mouseData = {
        x0: containerRect.left,
        y0: containerRect.top,
        x1: containerRect.right,
        y1: containerRect.bottom,
        direction: direction,
      };
      document.addEventListener('mousemove', onResize, false);
      document.addEventListener('mouseup', onResizeEnd, false);
    }
    function onResize(e) {
      var direction = mouseData.direction;
      var dirW = ~direction.indexOf('w');
      var dirN = ~direction.indexOf('n');
      var minHeight = options.minHeight || 5;
      var minWidth = options.minWidth || minHeight * (options.ratio || 1);
      var min = Math.min;
      var max = Math.max;
      var x = min(max(e.clientX - mouseData.x0, 0), fullWidth);
      var y = min(max(e.clientY - mouseData.y0, 0), fullHeight);
      var width, height;
      if (dirW) width = max(cropX + cropWidth - x, minWidth);
      else width = max(x - cropX, minWidth);
      if (dirN) height = max(cropY + cropHeight - y, minHeight);
      else height = max(y - cropY, minHeight);
      var data = getRectByRatio({
        maxWidth: width,
        maxHeight: height,
      }, options.ratio);
      if (dirW) cropX = cropX + cropWidth - data.width;
      if (dirN) cropY = cropY + cropHeight - data.height;
      cropWidth = data.width;
      cropHeight = data.height;
      updateRect();
    }
    function onResizeEnd(e) {
      document.removeEventListener('mousemove', onResize, false);
      document.removeEventListener('mouseup', onResizeEnd, false);
      events.fire('RESIZE_END');
      onCropEnd(e);
    }
    function onMoveStart(e) {
      events.fire('MOVE_START');
      mouseData = {
        x0: e.clientX - cropX,
        y0: e.clientY - cropY,
      };
      document.addEventListener('mousemove', onMove, false);
      document.addEventListener('mouseup', onMoveEnd, false);
    }
    function onMove(e) {
      var x = e.clientX - mouseData.x0;
      var y = e.clientY - mouseData.y0;
      if (x < 0) x = 0;
      else if (x + cropWidth > fullWidth) x = fullWidth - cropWidth;
      if (y < 0) y = 0;
      else if (y + cropHeight > fullHeight) y = fullHeight - cropHeight;
      cropX = x;
      cropY = y;
      updateRect();
    }
    function onMoveEnd(e) {
      document.removeEventListener('mousemove', onMove, false);
      document.removeEventListener('mouseup', onMoveEnd, false);
      events.fire('MOVE_END');
      onCropEnd(e);
    }
    var events = function () {
      function forEachType(typeStr, handle) {
        typeStr.split(' ').forEach(function (type) {
          type && handle(type);
        });
      }
      function on(type, cb) {
        forEachType(type, function (type) {
          var list = callbacks[type];
          if (!list) list = callbacks[type] = [];
          list.push(cb);
        });
        return function () {
          off(type, cb);
        };
      }
      function off(type, cb) {
        forEachType(type, function (type) {
          var list = callbacks[type];
          if (list) {
            if (cb) {
              var i = list.indexOf(cb);
              if (~i) list.splice(i, 1);
            } else {
              delete callbacks[type];
            }
          }
        });
      }
      function fire(type, data) {
        forEachType(type, function (type) {
          var list = callbacks[type];
          list && list.forEach(function (callback) {
            callback(data, type);
          });
        });
      }
      var callbacks = {};
      return {
        on: on,
        off: off,
        fire: fire,
      };
    }();

    /**
     * canvasSource and canvasMask are scaled to fit container size.
     * canvasSource contains the scaled image for repainting in the future.
     * canvasMask contains the scaled the masked image.
     * canvasRect contains the cropped part of the scaled image, when
     * repainted, canvasSource serves as a source so that there is no extra
     * scaling and thus no image flashing.
     * canvasClipped contains the cropped part of the original image.
     */
    var canvasSource, canvasMask, canvasRect, canvasClipped;
    var wrap, rect;
    var options = {};
    var cropX, cropY, cropWidth, cropHeight;
    var fullWidth, fullHeight, maxWidth, maxHeight;
    var image, mouseData;
    var cancelDebounce;

    init();
    return {
      reset: reset,
      setRatio: setRatio,
      setDebounce: setDebounce,
      setRect: setRect,
    };
  }

  var defaultCSS = [
    '.cropper{position:absolute;overflow:visible;}',
    '.cropper-hide{display:none;}',
    '.cropper-area{position:absolute;}',
    '.cropper-rect{position:absolute;border:1px solid rgba(255,255,255,.5);cursor:move;box-sizing:border-box;}',
    '.cropper-resizer{position:absolute;width:10px;height:10px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.5);box-sizing:border-box;}',
    '.cropper-resizer-nw{top:-5px;left:-5px;cursor:nw-resize;}',
    '.cropper-resizer-ne{top:-5px;right:-5px;cursor:ne-resize;}',
    '.cropper-resizer-sw{bottom:-5px;left:-5px;cursor:sw-resize;}',
    '.cropper-resizer-se{bottom:-5px;right:-5px;cursor:se-resize;}',
  ].join('');
  var styles;

  return {
    create: create,
    initCSS: initCSS,
  };
});
