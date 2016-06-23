const $ = selector => document.querySelector(selector);
const preview = $('#preview');
var ratio = 1;
const cropper = ImageCropper.create({
  container: $('#cropper'),
  onCrop: cropData => {
    const canvas = cropData.getCanvas();
    const ctx = preview.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 200, 200);
    ctx.drawImage(canvas, 0, 0, 200, 200);
    ratio = canvas.width / canvas.height;
  },
  ratio,
});
$('input[type=file]').addEventListener('change', e => {
  cropper.reset(e.target.files[0]);
}, false);
$('#cbRatio').addEventListener('change', e => {
  cropper.setRatio(e.target.checked ? ratio : 0);
}, false);
$('#cbMouseup').addEventListener('change', e => {
  cropper.setDebounce(e.target.checked ? 'mouseup' : 0);
}, false);
