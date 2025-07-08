document.addEventListener('DOMContentLoaded', () => {
    const canvas = new fabric.Canvas('canvas');
    const imageLoader = document.getElementById('imageLoader');
    const uploadBtn = document.getElementById('uploadBtn');

    // Toolbar buttons
    const cropModeBtn = document.getElementById('cropModeBtn');
    const applyCropBtn = document.getElementById('applyCropBtn');
    const cancelCropBtn = document.getElementById('cancelCropBtn');
    const grayscaleBtn = document.getElementById('grayscaleBtn');
    const sepiaBtn = document.getElementById('sepiaBtn');
    const invertBtn = document.getElementById('invertBtn');
    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const downloadLink = document.getElementById('download');

    let imgObj = null;
    let cropRect = null;
    let cropping = false;

    // --- UPLOAD ---
    uploadBtn.addEventListener('click', () => imageLoader.click());
    imageLoader.addEventListener('change', handleImage, false);

    function handleImage(e) {
        const reader = new FileReader();
        reader.onload = function(event) {
            fabric.Image.fromURL(event.target.result, function(img) {
                imgObj = img;
                canvas.clear();
                canvas.setWidth(img.width);
                canvas.setHeight(img.height);
                img.set({ left: 0, top: 0, selectable: false, evented: false });
                canvas.add(img);
                canvas.sendToBack(img);
                resetFilters();
                exitCropMode();
            });
        }
        reader.readAsDataURL(e.target.files[0]);
    }

    // --- CROPPING ---
    cropModeBtn.addEventListener('click', () => {
        if (!imgObj) return alert('Upload an image first!');
        enterCropMode();
    });

    applyCropBtn.addEventListener('click', applyCrop);
    cancelCropBtn.addEventListener('click', exitCropMode);

    function enterCropMode() {
        if (cropping) return;
        cropping = true;
        cropModeBtn.style.display = 'none';
        applyCropBtn.style.display = 'inline-block';
        cancelCropBtn.style.display = 'inline-block';
        cropRect = new fabric.Rect({
            left: canvas.width/4,
            top: canvas.height/4,
            width: canvas.width/2,
            height: canvas.height/2,
            fill: 'rgba(0,0,0,0.2)',
            stroke: '#1b74e4',
            strokeWidth: 2,
            cornerColor: 'white',
            cornerSize: 10,
            transparentCorners: false,
            selectable: true,
            hasRotatingPoint: false
        });
        canvas.add(cropRect);
        canvas.setActiveObject(cropRect);
        cropRect.bringToFront();
        canvas.renderAll();
    }

    function exitCropMode() {
        cropping = false;
        cropModeBtn.style.display = 'inline-block';
        applyCropBtn.style.display = 'none';
        cancelCropBtn.style.display = 'none';
        if (cropRect) {
            canvas.remove(cropRect);
            cropRect = null;
        }
        canvas.discardActiveObject();
        canvas.renderAll();
    }

    function applyCrop() {
        if (!cropRect || !imgObj) return;
        // Get crop rectangle bounds
        const rect = cropRect.getBoundingRect();
        // Create a temp canvas to draw the cropped area
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = rect.width;
        tempCanvas.height = rect.height;
        const ctx = tempCanvas.getContext('2d');
        // Draw the image with filters applied
        const origFilters = imgObj.filters.slice();
        imgObj.clone((clonedImg) => {
            clonedImg.filters = origFilters;
            clonedImg.applyFilters();
            // Draw the filtered image onto temp canvas
            const fabricCanvas = new fabric.StaticCanvas(tempCanvas);
            fabricCanvas.add(clonedImg);
            clonedImg.set({ left: -rect.left, top: -rect.top });
            fabricCanvas.renderAll();
            // Create new image from cropped area
            const croppedDataUrl = fabricCanvas.toDataURL({ format: 'png', left: 0, top: 0, width: rect.width, height: rect.height });
            fabric.Image.fromURL(croppedDataUrl, function(newImg) {
                imgObj = newImg;
                canvas.clear();
                canvas.setWidth(rect.width);
                canvas.setHeight(rect.height);
                newImg.set({ left: 0, top: 0, selectable: false, evented: false });
                canvas.add(newImg);
                canvas.sendToBack(newImg);
                resetFilters();
                exitCropMode();
            });
        });
    }

    // --- FILTERS & ADJUSTMENTS ---
    grayscaleBtn.addEventListener('click', () => toggleFilter('Grayscale'));
    sepiaBtn.addEventListener('click', () => toggleFilter('Sepia'));
    invertBtn.addEventListener('click', () => toggleFilter('Invert'));

    brightnessSlider.addEventListener('input', () => applyAdjustment('Brightness', parseFloat(brightnessSlider.value)));
    contrastSlider.addEventListener('input', () => applyAdjustment('Contrast', parseFloat(contrastSlider.value)));

    function resetFilters() {
        if (!imgObj) return;
        imgObj.filters = [
            new fabric.Image.filters.Brightness({ brightness: 0 }),
            new fabric.Image.filters.Contrast({ contrast: 0 })
        ];
        brightnessSlider.value = 0;
        contrastSlider.value = 0;
        imgObj.applyFilters();
        canvas.renderAll();
    }
    
    function toggleFilter(type) {
        if (!imgObj) return;
        const filterClass = fabric.Image.filters[type];
        if (!filterClass) return;
        const idx = imgObj.filters.findIndex(f => f && f.type === type);
        if (idx > -1) {
            imgObj.filters.splice(idx, 1);
        } else {
            imgObj.filters.push(new filterClass());
        }
        imgObj.applyFilters();
        canvas.renderAll();
    }
    
    function applyAdjustment(type, value) {
        if (!imgObj) return;
        let filter = imgObj.filters.find(f => f && f.type === type);
        if (!filter) {
            filter = new fabric.Image.filters[type]({ [type.toLowerCase()]: value });
            imgObj.filters.push(filter);
        } else {
            filter[type.toLowerCase()] = value;
        }
        imgObj.applyFilters();
        canvas.renderAll();
    }

    // --- DOWNLOAD ---
    downloadLink.addEventListener('click', (e) => {
        if (!imgObj) {
            e.preventDefault();
            alert('Upload an image first!');
            return;
        }
        const dataURL = canvas.toDataURL({ format: 'png', quality: 1.0 });
        downloadLink.href = dataURL;
        downloadLink.download = 'edited-image.png';
    });
}); 