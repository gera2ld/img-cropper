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
    function init() {
      styles || initCSS();
      for (var k in _options) options[k] = _options[k];
      _options = null;
      var container = options.container;
      maxWidth = options.width || container.clientWidth;
      maxHeight = options.height || container.clientHeight;
      container.innerHTML = '<div></div>';
      wrap = container.firstChild;
      wrap.className = 'cropper';
      if (options.className) wrap.className += ' ' + options.className;
      canvasSource = document.createElement('canvas');
      canvasMask = document.createElement('canvas');
      canvasRect = document.createElement('canvas');
      canvasClipped = document.createElement('canvas');
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
        cancelDebounce = events.on('CANVAS_INIT RESIZE_END MOVE_END', crop);
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
        maxWidth: clipWidth,
        maxHeight: clipHeight,
      }, ratio);
      clipWidth = data.width;
      clipHeight = data.height;
      updateRect();
    }
    /**
     * @desc Reset cropper by setting an image.
     * @param image {Image/Blob}
     */
    function reset(image) {
      // Transform image to dataURL to avoid cross-domain issues
      if (image instanceof Image) {
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, 0, 0);
        initCropper(canvas.toDataURL());
      } else if (image instanceof Blob) {
        var reader = new FileReader;
        reader.onload = function (e) {
          initCropper(e.target.result);
        };
        reader.readAsDataURL(image);
      } else {
        throw 'Unknown image type!';
      }
    }
    function initCropper(dataURL) {
      image = new Image;
      image.onload = initCanvas;
      image.src = dataURL;
    }
    function initCanvas() {
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
      data = getRectByRatio({
        maxWidth: fullWidth,
        maxHeight: fullHeight,
      }, options.ratio);
      clipWidth = data.width;
      clipHeight = data.height;
      setRatio(options.ratio);
      clipX = (fullWidth - clipWidth) >> 1;
      clipY = (fullHeight - clipHeight) >> 1;
      updateRect();
      events.fire('CANVAS_INIT');
    }
    function updateRect() {
      setStyles(rect, {
        left: clipX + 'px',
        top: clipY + 'px',
        width: clipWidth + 'px',
        height: clipHeight + 'px',
      });
      canvasRect.style.left = clipX + 'px';
      canvasRect.style.top = clipY + 'px';
      canvasRect.width = clipWidth;
      canvasRect.height = clipHeight;
      // Draw from canvasSource to avoid image flashing
      canvasRect.getContext('2d').drawImage(canvasSource, clipX, clipY, clipWidth, clipHeight, 0, 0, clipWidth, clipHeight);
      events.fire('UPDATE_RECT');
    }
    function getCropped() {
      var ratio = clipWidth / clipHeight;
      var sourceX = ~~ (clipX / fullWidth * image.width);
      var sourceY = ~~ (clipY / fullHeight * image.height);
      var sourceWidth, sourceHeight;
      // calculate the clipped rect by the smaller side
      // to avoid inaccuracy when image is largely scaled
      if (ratio >= 1) {
        sourceHeight = ~~ (clipHeight / fullHeight * image.height);
        sourceWidth = ~~ (sourceHeight * ratio);
      } else {
        sourceWidth = ~~ (clipWidth / fullWidth * image.width);
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
      if (dirW) width = max(clipX + clipWidth - x, minWidth);
      else width = max(x - clipX, minWidth);
      if (dirN) height = max(clipY + clipHeight - y, minHeight);
      else height = max(y - clipY, minHeight);
      var data = getRectByRatio({
        maxWidth: width,
        maxHeight: height,
      }, options.ratio);
      if (dirW) clipX = clipX + clipWidth - data.width;
      if (dirN) clipY = clipY + clipHeight - data.height;
      clipWidth = data.width;
      clipHeight = data.height;
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
        x0: e.clientX - clipX,
        y0: e.clientY - clipY,
      };
      document.addEventListener('mousemove', onMove, false);
      document.addEventListener('mouseup', onMoveEnd, false);
    }
    function onMove(e) {
      var x = e.clientX - mouseData.x0;
      var y = e.clientY - mouseData.y0;
      if (x < 0) x = 0;
      else if (x + clipWidth > fullWidth) x = fullWidth - clipWidth;
      if (y < 0) y = 0;
      else if (y + clipHeight > fullHeight) y = fullHeight - clipHeight;
      clipX = x;
      clipY = y;
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
     * canvasRect contains the clipped part of the scaled image, when
     * repainted, canvasSource serves as a source so that there is no extra
     * scaling and thus no image flashing.
     * canvasClipped contains the clipped part of the original image.
     */
    var canvasSource, canvasMask, canvasRect, canvasClipped;
    var wrap, rect;
    var options = {};
    var clipX, clipY, clipWidth, clipHeight;
    var fullWidth, fullHeight, maxWidth, maxHeight;
    var image, mouseData;
    var cancelDebounce;

    init();
    return {
      reset: reset,
      setRatio: setRatio,
      setDebounce: setDebounce,
    };
  }

  var defaultCSS = [
    '.cropper{position:absolute;overflow:visible;}',
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
