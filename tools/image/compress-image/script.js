// Compress Image Tool — with target size input + upscaler
(function () {
  'use strict';

  const uploadBox = document.getElementById('uploadBox');
  const fileInput = document.getElementById('fileInput');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValue = document.getElementById('qualityValue');
  const scaleSlider = document.getElementById('scaleSlider');
  const scaleValue = document.getElementById('scaleValue');
  const targetSizeInput = document.getElementById('targetSizeInput');
  const targetSizeUnit = document.getElementById('targetSizeUnit');
  const targetSizeBtn = document.getElementById('targetSizeBtn');

  const originalImg = document.getElementById('originalImg');
  const compressedImg = document.getElementById('compressedImg');
  const originalSize = document.getElementById('originalSize');
  const compressedSize = document.getElementById('compressedSize');
  const downloadBtn = document.getElementById('downloadBtn');
  const controlsPanel = document.getElementById('controlsPanel');
  const previewPanel = document.getElementById('previewPanel');
  const reductionBadge = document.getElementById('reductionBadge');

  let currentFile = null;
  let originalBlob = null;

  // Click upload
  uploadBox.onclick = () => fileInput.click();

  // Drag & drop
  ['dragenter', 'dragover'].forEach(evt => {
    uploadBox.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); uploadBox.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    uploadBox.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); uploadBox.classList.remove('drag-over'); });
  });
  uploadBox.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length && files[0].type.startsWith('image/')) {
      fileInput.files = files;
      handleFile(files[0]);
    }
  });

  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleFile(file);
  };

  function handleFile(file) {
    currentFile = file;
    originalBlob = file;
    originalImg.src = URL.createObjectURL(file);
    originalSize.textContent = TolzaFormatSize(file.size);
    controlsPanel.classList.remove('g-hidden');
    previewPanel.classList.remove('g-hidden');
    processImage();
  }

  // Slider changes
  qualitySlider.oninput = () => {
    qualityValue.textContent = qualitySlider.value;
    if (currentFile) processImage();
  };

  scaleSlider.oninput = () => {
    scaleValue.textContent = scaleSlider.value + '%';
    if (currentFile) processImage();
  };

  // Target size button
  targetSizeBtn.addEventListener('click', () => {
    if (!currentFile) return;
    const targetVal = parseFloat(targetSizeInput.value);
    if (!targetVal || targetVal <= 0) {
      TolzaToast('Enter a valid target size');
      return;
    }
    const targetBytes = targetSizeUnit.value === 'MB' ? targetVal * 1024 * 1024 : targetVal * 1024;
    compressToTargetSize(targetBytes);
  });

  // Also trigger on Enter key in target size input
  targetSizeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') targetSizeBtn.click();
  });

  function processImage() {
    if (!currentFile) return;
    const img = new Image();
    img.src = URL.createObjectURL(currentFile);

    img.onload = () => {
      const scale = parseInt(scaleSlider.value) / 100;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      // Use better interpolation for upscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const quality = qualitySlider.value / 100;
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          compressedImg.src = url;
          compressedSize.textContent = TolzaFormatSize(blob.size);
          downloadBtn.href = url;
          downloadBtn.download = 'tolza-' + (scale > 1 ? 'upscaled' : 'compressed') + '.jpg';
          downloadBtn.classList.remove('g-hidden');
          updateReductionBadge(originalBlob.size, blob.size);
        },
        'image/jpeg',
        quality
      );
    };
  }

  async function compressToTargetSize(targetBytes) {
    if (!currentFile) return;

    const img = new Image();
    img.src = URL.createObjectURL(currentFile);

    img.onload = () => {
      const scale = parseInt(scaleSlider.value) / 100;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Binary search for the right quality
      let lo = 0.01, hi = 1.0, bestBlob = null, attempts = 0;

      function tryQuality(q) {
        return new Promise((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', q);
        });
      }

      (async () => {
        while (hi - lo > 0.01 && attempts < 20) {
          const mid = (lo + hi) / 2;
          const blob = await tryQuality(mid);
          attempts++;
          if (!blob) break;
          bestBlob = blob;
          if (blob.size > targetBytes) {
            hi = mid;
          } else {
            lo = mid;
          }
        }

        if (bestBlob) {
          // Final pass at the found quality
          const finalBlob = await tryQuality(lo);
          if (finalBlob) bestBlob = finalBlob;

          const url = URL.createObjectURL(bestBlob);
          compressedImg.src = url;
          compressedSize.textContent = TolzaFormatSize(bestBlob.size);
          downloadBtn.href = url;
          downloadBtn.download = 'tolza-compressed.jpg';
          downloadBtn.classList.remove('g-hidden');

          // Update slider to reflect found quality
          const foundQ = Math.round(lo * 100);
          qualitySlider.value = foundQ;
          qualityValue.textContent = foundQ;

          updateReductionBadge(originalBlob.size, bestBlob.size);
          TolzaToast('Compressed to ~' + TolzaFormatSize(bestBlob.size));
        }
      })();
    };
  }

  function updateReductionBadge(origSize, newSize) {
    const pct = ((1 - newSize / origSize) * 100).toFixed(1);
    if (pct > 0) {
      reductionBadge.textContent = '-' + pct + '%';
      reductionBadge.className = 'reduction-badge reduction-green';
    } else {
      reductionBadge.textContent = '+' + Math.abs(pct) + '%';
      reductionBadge.className = 'reduction-badge reduction-amber';
    }
    reductionBadge.classList.remove('g-hidden');
  }
})();
