const uploadBox = document.getElementById("uploadBox");
const fileInput = document.getElementById("fileInput");
const qualitySlider = document.getElementById("qualitySlider");
const qualityValue = document.getElementById("qualityValue");

const originalImg = document.getElementById("originalImg");
const compressedImg = document.getElementById("compressedImg");

const originalSize = document.getElementById("originalSize");
const compressedSize = document.getElementById("compressedSize");

const downloadBtn = document.getElementById("downloadBtn");

let currentFile;

// Click upload
uploadBox.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  currentFile = file;

  originalImg.src = URL.createObjectURL(file);
  originalSize.textContent = (file.size / 1024).toFixed(2) + " KB";

  compressImage();
};

// Slider change
qualitySlider.oninput = () => {
  qualityValue.textContent = qualitySlider.value;
  if (currentFile) compressImage();
};

function compressImage() {
  const img = new Image();
  img.src = URL.createObjectURL(currentFile);

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    canvas.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);

        compressedImg.src = url;
        compressedSize.textContent =
          (blob.size / 1024).toFixed(2) + " KB";

        downloadBtn.href = url;
      },
      "image/jpeg",
      qualitySlider.value / 100
    );
  };
}
