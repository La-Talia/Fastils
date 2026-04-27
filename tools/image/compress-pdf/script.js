// Compress PDF Tool — re-renders PDF pages as JPEG images at adjustable quality/scale
(function () {
  'use strict';

  const fileInput = document.getElementById('fileInput');
  const uploadZone = document.getElementById('uploadZone');
  const controlsPanel = document.getElementById('controlsPanel');
  const resultPanel = document.getElementById('resultPanel');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValue = document.getElementById('qualityValue');
  const scaleSlider = document.getElementById('scaleSlider');
  const scaleValue = document.getElementById('scaleValue');
  const targetSizeInput = document.getElementById('targetSizeInput');
  const targetSizeUnit = document.getElementById('targetSizeUnit');
  const targetSizeBtn = document.getElementById('targetSizeBtn');
  const compressBtn = document.getElementById('compressBtn');
  const compressBtnWrap = document.getElementById('compressBtnWrap');
  const progressWrap = document.getElementById('progressWrap');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  let pdfFile = null;

  // Upload handling
  TolzaUpload('uploadZone', (files) => {
    const f = files[0];
    if (!f || f.type !== 'application/pdf') {
      TolzaToast('Please select a PDF file');
      return;
    }
    pdfFile = f;
    controlsPanel.classList.remove('g-hidden');
    compressBtnWrap.classList.remove('g-hidden');
    resultPanel.classList.add('g-hidden');
    TolzaToast('PDF loaded: ' + f.name);
  }, { accept: '.pdf,application/pdf' });

  qualitySlider.oninput = () => { qualityValue.textContent = qualitySlider.value; };
  scaleSlider.oninput = () => { scaleValue.textContent = scaleSlider.value + '%'; };

  targetSizeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') targetSizeBtn.click(); });

  // Target size compress
  targetSizeBtn.addEventListener('click', async () => {
    if (!pdfFile) return;
    const targetVal = parseFloat(targetSizeInput.value);
    if (!targetVal || targetVal <= 0) { TolzaToast('Enter a valid target size'); return; }
    const targetBytes = targetSizeUnit.value === 'MB' ? targetVal * 1024 * 1024 : targetVal * 1024;

    // Binary search over quality
    let lo = 1, hi = 100, bestBlob = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const mid = Math.round((lo + hi) / 2);
      qualitySlider.value = mid;
      qualityValue.textContent = mid;
      const blob = await doCompress(mid / 100, parseInt(scaleSlider.value) / 100);
      if (!blob) break;
      bestBlob = blob;
      if (blob.size > targetBytes) hi = mid - 1;
      else lo = mid + 1;
    }
    if (bestBlob) {
      qualitySlider.value = Math.max(lo - 1, 1);
      qualityValue.textContent = qualitySlider.value;
      const finalBlob = await doCompress(Math.max(lo - 1, 1) / 100, parseInt(scaleSlider.value) / 100);
      if (finalBlob) showResult(finalBlob);
      TolzaToast('Compressed to ~' + TolzaFormatSize(finalBlob ? finalBlob.size : bestBlob.size));
    }
  });

  // Normal compress button
  compressBtn.addEventListener('click', async () => {
    if (!pdfFile) return;
    const quality = qualitySlider.value / 100;
    const scale = parseInt(scaleSlider.value) / 100;
    const blob = await doCompress(quality, scale);
    if (blob) showResult(blob);
  });

  async function doCompress(quality, scale) {
    if (!window.pdfjsLib) { TolzaToast('PDF library not loaded. Refresh the page.'); return null; }

    compressBtn.disabled = true;
    progressWrap.classList.add('active');
    progressFill.style.width = '0%';
    progressText.textContent = 'Reading PDF...';

    try {
      const arrayBuf = await pdfFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
      const numPages = pdfDoc.numPages;

      // We need jsPDF to rebuild the PDF
      const { jsPDF } = window.jspdf;
      let newPdf = null;

      for (let i = 1; i <= numPages; i++) {
        progressText.textContent = `Processing page ${i} of ${numPages}...`;
        progressFill.style.width = ((i / numPages) * 90) + '%';

        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const imgData = canvas.toDataURL('image/jpeg', quality);
        const pageW = viewport.width * 0.264583;
        const pageH = viewport.height * 0.264583;
        const orient = pageW > pageH ? 'landscape' : 'portrait';

        if (i === 1) {
          newPdf = new jsPDF({ orientation: orient, unit: 'mm', format: [pageW, pageH] });
        } else {
          newPdf.addPage([pageW, pageH], orient);
        }
        newPdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
      }

      progressText.textContent = 'Finalizing...';
      progressFill.style.width = '95%';

      const blob = newPdf.output('blob');
      progressFill.style.width = '100%';
      progressText.textContent = 'Done!';

      setTimeout(() => {
        progressWrap.classList.remove('active');
        progressFill.style.width = '0%';
      }, 1500);

      compressBtn.disabled = false;
      return blob;

    } catch (err) {
      console.error('PDF compress error:', err);
      TolzaToast('Error: ' + err.message);
      progressText.textContent = 'Error — try again.';
      compressBtn.disabled = false;
      setTimeout(() => progressWrap.classList.remove('active'), 2000);
      return null;
    }
  }

  function showResult(blob) {
    const origSize = pdfFile.size;
    const newSize = blob.size;
    const pct = ((1 - newSize / origSize) * 100).toFixed(1);

    document.getElementById('origSizeVal').textContent = TolzaFormatSize(origSize);
    document.getElementById('newSizeVal').textContent = TolzaFormatSize(newSize);
    const redEl = document.getElementById('reductionVal');
    if (pct > 0) {
      redEl.textContent = '-' + pct + '%';
      redEl.className = 'pdf-stat-value green';
    } else {
      redEl.textContent = '+' + Math.abs(pct) + '%';
      redEl.className = 'pdf-stat-value amber';
    }

    const url = URL.createObjectURL(blob);
    const dlBtn = document.getElementById('pdfDownloadBtn');
    dlBtn.href = url;
    dlBtn.download = pdfFile.name.replace(/\.pdf$/i, '') + '-compressed.pdf';

    resultPanel.classList.remove('g-hidden');
  }
})();
