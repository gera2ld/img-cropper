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
  onClip: canvas => {
    canvasPreview.getContext('2d').drawImage(canvas, 0, 0, 200, 200);
  },
});
```

Documents
---
*function* ImageCropper.create(*options*)

*options* may have attributes below:

  * container: *Required* DOM element to contain the cropper. The cropper will be intialized with the width and height of its container if no `width` and `height` is explicitly defined.

  * width: *Optional* Maximum width of the cropper. If not defined, `container.clientWidth` will be used.

  * height: *Optional* Maximum height of the cropper. If not defined, `container.clientHeight` will be used.

  * minHeight: *Optional* Minimum height of the cropping rect, default as `5`.

  * ratio: *Optional* The `width / height` ratio, default as `1`.

  * onClip: *Optional* Function called with a canvas when cropped image is updated.

  * debounce: *Optional* A number to debounce the `onClip` call.