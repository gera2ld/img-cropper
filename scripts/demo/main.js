const preview = document.querySelector('#preview');
const cropper = ImageCropper.create({
  container: document.querySelector('#cropper'),
  onCrop: canvas => {
    const ctx = preview.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 200, 200);
    ctx.drawImage(canvas, 0, 0, 200, 200);
  },
});
document.querySelector('input[type=file]').addEventListener('change', e => {
  cropper.reset(e.target.files[0]);
}, false);