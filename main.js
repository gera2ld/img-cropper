function $(selector) {
  return document.querySelector(selector);
}
function setActiveItem(image) {
  if (activeItem) {
    activeItem.parentNode.classList.remove('active');
  }
  image && image.parentNode.classList.add('active');
  activeItem = image;
}
function cacheImage(image) {
  if (image) {
    const item = document.createElement('div');
    item.className = 'cache-item';
    item.appendChild(image);
    cacheList.appendChild(item);
  }
  setActiveItem(image);
}

const preview = $('#preview');
const cacheList = $('.cache-list');
var activeItem;
var ratio = 1;
var canvas;
const cropper = ImageCropper.create({
  container: $('#cropper'),
  onCrop: cropData => {
    canvas = cropData.getCanvas();
    const ctx = preview.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 200, 200);
    ctx.drawImage(canvas, 0, 0, 200, 200);
    ratio = canvas.width / canvas.height;
    $('#pos').innerHTML = `x: ${cropData.x}, y: ${cropData.y}, width: ${cropData.width}, height: ${cropData.height}`;
  },
  ratio,
});
cacheList.addEventListener('click', e => {
  for (var el = e.target; el && !el.classList.contains('cache-item'); el = el.parentNode);
  if (el) {
    const image = el.firstElementChild;
    setActiveItem(image);
    cropper.reset(image);
  }
});
$('input[type=file]').addEventListener('change', e => {
  const file = e.target.files[0];
  const image = file && URL.createObjectURL(file);
  cropper.reset(image, cacheImage);
  e.target.value = null;
});
$('#cbRatio').addEventListener('change', e => {
  cropper.setRatio(e.target.checked ? ratio : 0);
});
$('#cbMouseup').addEventListener('change', e => {
  cropper.setDebounce(e.target.checked ? 'mouseup' : 0);
});
$('#btOpen').addEventListener('click', e => {
  window.open(canvas.toDataURL($('#tType').value));
});
