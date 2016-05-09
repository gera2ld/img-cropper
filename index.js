!function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.ImageCropper = factory(root);
  }
}(typeof window !== 'undefined' ? window : this, function (window) {
  function getRectByRatio(data, ratio) {
    var width = data.maxWidth;
    var height = ~~ (data.maxWidth / ratio);
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
  function bindAll() {
    var thisObj = arguments[0];
    var names = [].slice.call(arguments, 1);
    names.forEach(function (name) {
      thisObj[name] = thisObj[name].bind(thisObj);
    });
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
  function initStyles() {
    styles = document.createElement('style');
    styles.innerHTML = ImageCropper.styles;
    document.head.appendChild(styles);
  }

  var styles;

  /**
   * canvasSource and canvasMask are scaled to fit container size.
   * canvasSource contains the scaled image for repainting in the future.
   * canvasMask contains the scaled the masked image.
   * canvasRect contains the clipped part of the scaled image, when
   * repainted, canvasSource serves as a source so that there is no extra
   * scaling and thus no image flashing.
   * canvasClipped contains the clipped part of the original image.
   */
  function ImageCropper(options) {
    if (!styles) initStyles();
    var _this = this;
    _this.options = {};
    for (var k in options) _this.options[k] = options[k];
    options = _this.options;
    options.ratio = options.ratio || 1;
    var container = options.container;
    _this.maxWidth = options.width || container.clientWidth;
    _this.maxHeight = options.height || container.clientHeight;
    container.innerHTML = '<div></div>';
    var wrap = _this.wrap = container.firstElementChild;
    wrap.className = 'clipper';
    if (options.className) wrap.className += ' ' + options.className;
    _this.canvasSource = document.createElement('canvas');
    var canvasMask = _this.canvasMask = document.createElement('canvas');
    var canvasRect = _this.canvasRect = document.createElement('canvas');
    var canvasClipped = _this.canvasClipped = document.createElement('canvas');
    canvasMask.className = 'clipper-mask';
    canvasRect.className = 'clipper-area';
    var rect = _this.rect = document.createElement('div');
    rect.className = 'clipper-rect';
    rect.innerHTML = '<div class="clipper-corner"></div>';
    wrap.appendChild(canvasMask);
    wrap.appendChild(canvasRect);
    wrap.appendChild(rect);
    bindAll(_this, 'initCanvas', 'onStartSEResize', 'onSEResize', 'onStopSEResize', 'onStartMove', 'onMove', 'onStopMove', 'onCrop');
    if (options.debounce) _this.onCrop = debounce(_this.onCrop, options.debounce);
    var corner = rect.firstElementChild;
    corner.addEventListener('mousedown', _this.onStartSEResize, false);
    rect.addEventListener('mousedown', _this.onStartMove, false);
  }
  ImageCropper.styles = (
    '.clipper{position:absolute;overflow:visible;}'
    + '.clipper-area{position:absolute;}'
    + '.clipper-rect{position:absolute;border:1px solid rgba(255,255,255,.5);cursor:move;box-sizing:border-box;}'
    + '.clipper-corner{position:absolute;width:10px;height:10px;bottom:-5px;right:-5px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.5);cursor:se-resize;box-sizing:border-box;}'
  );
  /**
   * @desc Reset clipper by setting an image.
   * @param image {Image/Blob}
   */
  ImageCropper.prototype.reset = function (image) {
    var _this = this;
    // Transform image to dataURL to avoid cross-domain issues
    if (image instanceof Image) {
      var canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      _this.initClipper(canvas.toDataURL());
    } else if (image instanceof Blob) {
      var reader = new FileReader;
      reader.onload = function (e) {
        _this.initClipper(e.target.result);
      };
      reader.readAsDataURL(image);
    } else {
      throw 'Unknown image type!';
    }
  };
  ImageCropper.prototype.initClipper = function (dataURL) {
    var _this = this;
    var image = _this.image = new Image;
    image.src = dataURL;
    image.onload = _this.initCanvas;
  };
  ImageCropper.prototype.initCanvas = function () {
    var _this = this;
    var maxWidth = _this.maxWidth;
    var maxHeight = _this.maxHeight;
    var data = getRectByRatio({
      maxWidth: maxWidth,
      maxHeight: maxHeight,
    }, _this.image.width / _this.image.height);
    var fullWidth = _this.fullWidth = data.width;
    var fullHeight = _this.fullHeight = data.height;
    setStyles(_this.wrap, {
      width: fullWidth + 'px',
      height: fullHeight + 'px',
      top: ((maxHeight - fullHeight) >> 1) + 'px',
      left: ((maxWidth - fullWidth) >> 1) + 'px',
    });
    var canvasSource = _this.canvasSource;
    canvasSource.width = _this.canvasMask.width = fullWidth;
    canvasSource.height = _this.canvasMask.height = fullHeight;
    var ctx = canvasSource.getContext('2d');
    // In case image has transparent pixels
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, fullWidth, fullHeight);
    ctx.drawImage(_this.image, 0, 0, fullWidth, fullHeight);
    var ctx = _this.canvasMask.getContext('2d');
    ctx.drawImage(canvasSource, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(0, 0, fullWidth, fullHeight);
    data = getRectByRatio({
      maxWidth: fullWidth,
      maxHeight: fullHeight,
    }, _this.options.ratio);
    _this.clipWidth = data.width;
    _this.clipHeight = data.height;
    _this.clipX = (fullWidth - _this.clipWidth) >> 1;
    _this.clipY = (fullHeight - _this.clipHeight) >> 1;
    _this.updateRect();
  };
  ImageCropper.prototype.updateRect = function () {
    var _this = this;
    setStyles(_this.rect, {
      left: _this.clipX + 'px',
      top: _this.clipY + 'px',
      width: _this.clipWidth + 'px',
      height: _this.clipHeight + 'px',
    });
    var canvasRect = _this.canvasRect;
    canvasRect.style.left = _this.clipX + 'px';
    canvasRect.style.top = _this.clipY + 'px';
    canvasRect.width = _this.clipWidth;
    canvasRect.height = _this.clipHeight;
    // Draw from canvasSource to avoid image flashing
    canvasRect.getContext('2d').drawImage(_this.canvasSource, _this.clipX, _this.clipY, _this.clipWidth, _this.clipHeight, 0, 0, _this.clipWidth, _this.clipHeight);
    _this.onCrop();
  };
  ImageCropper.prototype.onStartSEResize = function (e) {
    e.preventDefault();
    var _this = this;
    if (_this.mouseData) return;
    var containerRect = _this.wrap.getBoundingClientRect();
    _this.mouseData = {
      x0: containerRect.left,
      y0: containerRect.top,
    };
    document.addEventListener('mousemove', _this.onSEResize);
    document.addEventListener('mouseup', _this.onStopSEResize);
  };
  ImageCropper.prototype.onSEResize = function (e) {
    var _this = this;
    var options = _this.options;
    var x = e.clientX - _this.mouseData.x0;
    var y = e.clientY - _this.mouseData.y0;
    if (x > _this.fullWidth) x = _this.fullWidth;
    if (y > _this.fullHeight) y = _this.fullHeight;
    var width = x - _this.clipX;
    var height = y - _this.clipY;
    var minHeight = options.minHeight || 5;
    var minWidth = options.minWidth || minHeight * options.ratio;
    if (width < minWidth) width = minWidth;
    if (height < minHeight) height = minHeight;
    var data = getRectByRatio({
      maxWidth: width,
      maxHeight: height,
    }, options.ratio);
    _this.clipWidth = data.width;
    _this.clipHeight = data.height;
    _this.updateRect();
  };
  ImageCropper.prototype.onStopSEResize = function (e) {
    var _this = this;
    document.removeEventListener('mousemove', _this.onSEResize, false);
    document.removeEventListener('mouseup', _this.onStopSEResize, false);
    _this.mouseData = null;
  };
  ImageCropper.prototype.onStartMove = function (e) {
    e.preventDefault();
    var _this = this;
    if (_this.mouseData) return;
    _this.mouseData = {
      x0: e.clientX - _this.clipX,
      y0: e.clientY - _this.clipY,
    };
    document.addEventListener('mousemove', _this.onMove, false);
    document.addEventListener('mouseup', _this.onStopMove, false);
  };
  ImageCropper.prototype.onMove = function (e) {
    var _this = this;
    var x = e.clientX - _this.mouseData.x0;
    var y = e.clientY - _this.mouseData.y0;
    if (x < 0) x = 0;
    else if (x + _this.clipWidth > _this.fullWidth) x = _this.fullWidth - _this.clipWidth;
    if (y < 0) y = 0;
    else if (y + _this.clipHeight > _this.fullHeight) y = _this.fullHeight - _this.clipHeight;
    _this.clipX = x;
    _this.clipY = y;
    _this.updateRect();
  };
  ImageCropper.prototype.onStopMove = function () {
    var _this = this;
    document.removeEventListener('mousemove', _this.onMove, false);
    document.removeEventListener('mouseup', _this.onStopMove, false);
    _this.mouseData = null;
  };
  ImageCropper.prototype.onCrop = function () {
    var _this = this;
    var onCrop = _this.options.onCrop;
    if (onCrop) {
      var image = _this.image;
      var sourceX = ~~ (_this.clipX / _this.fullWidth * image.width);
      var sourceY = ~~ (_this.clipY / _this.fullHeight * image.height);
      var sourceWidth = ~~ (_this.clipWidth / _this.fullWidth * image.width);
      var sourceHeight = ~~ (_this.clipHeight / _this.fullHeight * image.height);
      _this.canvasClipped.width = sourceWidth;
      _this.canvasClipped.height = sourceHeight;
      _this.canvasClipped.getContext('2d').drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
      onCrop(_this.canvasClipped);
    }
  };
  ImageCropper.create = function (options) {
    return new ImageCropper(options);
  };
  return ImageCropper;
});
