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
      wrap.className = 'clipper';
      if (options.className) wrap.className += ' ' + options.className;
      canvasSource = document.createElement('canvas');
      canvasMask = document.createElement('canvas');
      canvasRect = document.createElement('canvas');
      canvasClipped = document.createElement('canvas');
      canvasMask.className = 'clipper-mask';
      canvasRect.className = 'clipper-area';
      rect = document.createElement('div');
      rect.className = 'clipper-rect';
      rect.innerHTML = '<div class="clipper-corner"></div>';
      wrap.appendChild(canvasMask);
      wrap.appendChild(canvasRect);
      wrap.appendChild(rect);
      if (options.debounce) onCrop = debounce(onCrop, options.debounce);
      var corner = rect.firstChild;
      corner.addEventListener('mousedown', onStartSEResize, false);
      rect.addEventListener('mousedown', onStartMove, false);
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
     * @desc Reset clipper by setting an image.
     * @param image {Image/Blob}
     */
    function reset(image) {
      // Transform image to dataURL to avoid cross-domain issues
      if (image instanceof Image) {
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.getContext('2d').drawImage(image, 0, 0);
        initClipper(canvas.toDataURL());
      } else if (image instanceof Blob) {
        var reader = new FileReader;
        reader.onload = function (e) {
          initClipper(e.target.result);
        };
        reader.readAsDataURL(image);
      } else {
        throw 'Unknown image type!';
      }
    }
    function initClipper(dataURL) {
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
      onCrop();
    }
    function crop() {
      var onCrop = options.onCrop;
      if (onCrop) {
        var sourceX = ~~ (clipX / fullWidth * image.width);
        var sourceY = ~~ (clipY / fullHeight * image.height);
        var sourceWidth = ~~ (clipWidth / fullWidth * image.width);
        var sourceHeight = ~~ (clipHeight / fullHeight * image.height);
        canvasClipped.width = sourceWidth;
        canvasClipped.height = sourceHeight;
        canvasClipped.getContext('2d').drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
        onCrop(canvasClipped);
      }
    }
    function onStartSEResize(e) {
      e.preventDefault();
      if (mouseData) return;
      var containerRect = wrap.getBoundingClientRect();
      mouseData = {
        x0: containerRect.left,
        y0: containerRect.top,
      };
      document.addEventListener('mousemove', onSEResize);
      document.addEventListener('mouseup', onStopSEResize);
    }
    function onSEResize(e) {
      var x = e.clientX - mouseData.x0;
      var y = e.clientY - mouseData.y0;
      if (x > fullWidth) x = fullWidth;
      if (y > fullHeight) y = fullHeight;
      var width = x - clipX;
      var height = y - clipY;
      var minHeight = options.minHeight || 5;
      var minWidth = options.minWidth || minHeight * (options.ratio || 1);
      if (width < minWidth) width = minWidth;
      if (height < minHeight) height = minHeight;
      var data = getRectByRatio({
        maxWidth: width,
        maxHeight: height,
      }, options.ratio);
      clipWidth = data.width;
      clipHeight = data.height;
      updateRect();
    }
    function onStopSEResize(_e) {
      document.removeEventListener('mousemove', onSEResize, false);
      document.removeEventListener('mouseup', onStopSEResize, false);
      mouseData = null;
    }
    function onStartMove(e) {
      e.preventDefault();
      if (mouseData) return;
      mouseData = {
        x0: e.clientX - clipX,
        y0: e.clientY - clipY,
      };
      document.addEventListener('mousemove', onMove, false);
      document.addEventListener('mouseup', onStopMove, false);
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
    function onStopMove() {
      document.removeEventListener('mousemove', onMove, false);
      document.removeEventListener('mouseup', onStopMove, false);
      mouseData = null;
    }

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
    var onCrop = crop;

    init();
    return {
      reset: reset,
      setRatio: setRatio,
    };
  }

  var defaultCSS = (
    '.clipper{position:absolute;overflow:visible;}'
    + '.clipper-area{position:absolute;}'
    + '.clipper-rect{position:absolute;border:1px solid rgba(255,255,255,.5);cursor:move;box-sizing:border-box;}'
    + '.clipper-corner{position:absolute;width:10px;height:10px;bottom:-5px;right:-5px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.5);cursor:se-resize;box-sizing:border-box;}'
  );
  var styles;

  return {
    create: create,
    initCSS: initCSS,
  };
});
