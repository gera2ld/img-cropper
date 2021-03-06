ImageCropper
===
![Bower](https://img.shields.io/bower/v/img-cropper.svg)
![NPM](https://img.shields.io/npm/v/img-cropper.svg)
![Downloads](https://img.shields.io/npm/dt/img-cropper.svg)

Installation
---
``` sh
# Via NPM
$ npm i img-cropper

# Via Bower
$ bower i img-cropper
```

Usage
---
``` js
const ImageCropper = require('img-cropper');

const cropper = ImageCropper.create({
  container: document.getElementById('cropper'),
  onCrop: cropData => {
    canvasPreview.getContext('2d').drawImage(cropData.getCanvas(), 0, 0, 200, 200);
  },
});
```

Documents
---
* *function* ImageCropper.create(options)

  *options* have properties below:

  * container: *Required*

    DOM element to contain the cropper. The cropper will be intialized
    with the width and height of its container if no `width` and
    `height` is explicitly defined.

  * width *(Optional)*

    Maximum width of the cropper.
    If not defined, `container.clientWidth` will be used.

  * height *(Optional)*

    Maximum height of the cropper.
    If not defined, `container.clientHeight` will be used.

  * minHeight *(Optional)*

    Minimum height of the cropping rect, default as `5`.

  * ratio *(Optional)*

    The `width / height` ratio, default as `1`, `0` stands for unlimited.

  * directions *(Optional)*

    An array of resizer directions, default as `['nw', 'ne', 'sw', 'se']`.

  * onCrop *(Optional)*

    Function called with `cropData` when cropped image is updated.

  * debounce *(Optional)*

    Either `'mouseup'` or the number of time in milliseconds to debounce the `onCrop` call.

  Returns an object with properties below:

  * *function* reset(sourceImage, *(optional)* cropRect, *(optional)* callback)

    `sourceImage` can be <img>, <canvas>, Blob or URL string.

    `cropRect` can be an object with optional `x, y, width, height` properties.

    `callback` will be called with a cachable <img> if specified.

  * *function* setRatio(ratio)

  * *function* setDebounce(debounce)

    `debounce` is the same as in options.

  * *function* setRect(cropRect)

    Modify the crop rect manually, the same as in `reset`.
