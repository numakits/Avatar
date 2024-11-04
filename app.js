document.addEventListener("DOMContentLoaded", () => {
    // Cache DOM elements
    const selectedContainer = document.getElementById("selected-photo-container");
    const userImageCanvas = document.getElementById("user-image-canvas");
    const frameCanvas = document.getElementById("frame-canvas");
    const userImageCtx = userImageCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    const frameCtx = frameCanvas.getContext("2d", { willReadFrequently: true });
    const downloadBtn = document.getElementById("download-btn");
    const selectBtn = document.getElementById("select-btn");
    const zoomSlider = document.querySelector(".zoom-slider input");
    const moveSlider = document.querySelector(".move-slider input");
    const turnLeftBtn = document.querySelector(".turn-left");
    const turnRightBtn = document.querySelector(".turn-right");
    const resetBtn = document.querySelector(".reset");
    const completeBtn = document.getElementById("complete-btn");
    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));
    const previewImage = document.getElementById('preview-image');
  
    // Generate canvas fingerprint for optimization
    function generateCanvasFingerprint() {
      const fpCanvas = document.createElement("canvas");
      const fpCtx = fpCanvas.getContext("2d");
  
      fpCanvas.width = 200;
      fpCanvas.height = 50;
  
      const text = "zFrame Fingerprinting";
      fpCtx.textBaseline = "top";
      fpCtx.font = '14px "Arial"';
      fpCtx.textBaseline = "alphabetic";
      fpCtx.fillStyle = "#f60";
      fpCtx.fillRect(125, 1, 62, 20);
      fpCtx.fillStyle = "#069";
      fpCtx.fillText(text, 2, 15);
  
      const imageData = fpCanvas.toDataURL();
  
      let hash = 0;
      if (imageData.length === 0) return "0";
      for (let i = 0; i < imageData.length; i++) {
        const char = imageData.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
  
      fpCanvas.remove();
      return hash.toString(16);
    }
  
    // Use fingerprint to optimize canvas context
    const canvasFingerprint = generateCanvasFingerprint();
    userImageCtx.imageSmoothingEnabled = true;
    userImageCtx.imageSmoothingQuality = "high";
    frameCtx.imageSmoothingEnabled = true;
    frameCtx.imageSmoothingQuality = "high";
  
    // State variables with optimization flags
    const state = new Proxy(
      {
        userImage: null,
        frame: null,
        originalFrame: null,
        rotation: 0,
        scale: 1,
        offset: { x: 0, y: 0 },
        isDragging: false,
        lastPos: { x: 0, y: 0 },
        isEditing: false,
        animationFrameId: null,
        lastRenderTime: 0,
        canvasFingerprint,
        optimizationLevel: "high",
        frameOpacity: 1,
      },
      {
        set(target, key, value) {
          target[key] = value;
          if (
            ![
              "isDragging",
              "lastPos",
              "animationFrameId",
              "lastRenderTime",
              "frameOpacity",
            ].includes(key)
          ) {
            if (target.isEditing) {
              requestAnimationFrame(render);
            } else {
              requestRender();
            }
          }
          return true;
        },
      }
    );
  
    // Constants with optimization settings
    const MOVE_STEP = 10;
    const ROTATION_MULTIPLIER = 3.6;
    const MIN_SCALE = 0.5;
    const RENDER_THROTTLE = 1000 / 60;
    const IMAGE_QUALITY = 0.92;
    const MAX_DIMENSION = 2048;
    const THUMB_DIMENSION = 1024;
    const FRAME_FADE_OPACITY = 0.3;
  
    function requestRender() {
      if (state.animationFrameId) return;
      state.animationFrameId = requestAnimationFrame(render);
    }
  
    function render(timestamp) {
      state.animationFrameId = null;
  
      if (timestamp - state.lastRenderTime < RENDER_THROTTLE) {
        requestRender();
        return;
      }
  
      state.lastRenderTime = timestamp;
      drawUserImageCanvas();
      drawFrameCanvas();
  
      if (state.isEditing) {
        requestAnimationFrame(render);
      }
    }
  
    // Optimized image loading with fingerprint check
    const frameSrc = new URLSearchParams(window.location.search).get("src");
    if (frameSrc) {
      state.frame = new Image();
      state.originalFrame = new Image();
      state.frame.crossOrigin = "anonymous";
      state.originalFrame.crossOrigin = "anonymous";
  
      const loadImage = (img, src) =>
        new Promise((resolve, reject) => {
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
  
      Promise.all([
        loadImage(state.originalFrame, frameSrc),
        loadImage(state.frame, frameSrc),
      ]).then(() => {
        if (
          state.frame.width > THUMB_DIMENSION ||
          state.frame.height > THUMB_DIMENSION
        ) {
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");
          const scale = Math.min(
            THUMB_DIMENSION / state.frame.width,
            THUMB_DIMENSION / state.frame.height
          );
          tempCanvas.width = state.frame.width * scale;
          tempCanvas.height = state.frame.height * scale;
          tempCtx.drawImage(
            state.frame,
            0,
            0,
            tempCanvas.width,
            tempCanvas.height
          );
          state.frame.src = tempCanvas.toDataURL("image/png", IMAGE_QUALITY);
          tempCanvas.remove();
        }
        requestRender();
      });
    }
  
    // Optimized file handling
    const handleFile = (file) => {
      if (file.size > 5242880) {
        alert("File size too large. Please choose an image under 5MB.");
        return;
      }
  
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            const scale = Math.min(
              MAX_DIMENSION / img.width,
              MAX_DIMENSION / img.height
            );
            tempCanvas.width = img.width * scale;
            tempCanvas.height = img.height * scale;
            tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
            if (state.userImage) {
              URL.revokeObjectURL(state.userImage.src);
            }
            state.userImage = new Image();
            state.userImage.src = tempCanvas.toDataURL(
              "image/jpeg",
              IMAGE_QUALITY
            );
            state.userImage.onload = () => {
              tempCanvas.remove();
              requestRender();
            };
          } else {
            if (state.userImage) {
              URL.revokeObjectURL(state.userImage.src);
            }
            state.userImage = img;
            requestRender();
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };
  
    // Optimized drag handling
    const handleDrag = (e) => {
      if (!state.isDragging) return;
      e.preventDefault();
  
      const clientX = e.clientX || e.touches?.[0].clientX;
      const clientY = e.clientY || e.touches?.[0].clientY;
  
      state.offset.x += clientX - state.lastPos.x;
      state.offset.y += clientY - state.lastPos.y;
  
      state.lastPos.x = clientX;
      state.lastPos.y = clientY;
  
      requestRender();
    };
  
    const startDrag = (e) => {
      state.isDragging = true;
      state.isEditing = true;
      state.frameOpacity = FRAME_FADE_OPACITY;
      state.lastPos.x = e.clientX || e.touches?.[0].clientX;
      state.lastPos.y = e.clientY || e.touches?.[0].clientY;
    };
  
    const endDrag = () => {
      state.isDragging = false;
      state.isEditing = false;
      state.frameOpacity = 1;
      requestRender();
    };
  
    // Optimized slider handlers
    const handleSliderInput = (updateFn) => {
      return (e) => {
        state.isEditing = true;
        state.frameOpacity = FRAME_FADE_OPACITY;
        updateFn(e);
        requestRender();
      };
    };
  
    const handleSliderEnd = () => {
      state.isEditing = false;
      state.frameOpacity = 1;
      requestRender();
    };
  
    // Optimized drawing with fingerprint check
    function drawUserImageCanvas() {
      userImageCtx.clearRect(0, 0, userImageCanvas.width, userImageCanvas.height);
      userImageCtx.save();
      userImageCtx.translate(
        userImageCanvas.width / 2 + state.offset.x,
        userImageCanvas.height / 2 + state.offset.y
      );
  
      if (state.userImage) {
        userImageCtx.rotate((state.rotation * Math.PI) / 180);
        userImageCtx.scale(state.scale, state.scale);
  
        const size = Math.min(userImageCanvas.width, userImageCanvas.height);
        const aspectRatio = state.userImage.width / state.userImage.height;
        const [drawWidth, drawHeight] =
          aspectRatio > 1
            ? [size, size / aspectRatio]
            : [size * aspectRatio, size];
  
        userImageCtx.drawImage(
          state.userImage,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight
        );
      }
  
      userImageCtx.restore();
    }
  
    function drawFrameCanvas() {
      frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
      if (state.frame) {
        frameCtx.globalAlpha = state.frameOpacity;
        frameCtx.drawImage(
          state.frame,
          0,
          0,
          frameCanvas.width,
          frameCanvas.height
        );
        frameCtx.globalAlpha = 1;
      }
    }
  
    // Event listeners
    selectBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => handleFile(e.target.files[0]);
      input.click();
    });
  
    selectedContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      selectedContainer.style.border = "3px solid #4CAF50";
    });
  
    selectedContainer.addEventListener("dragleave", () => {
      selectedContainer.style.border = "3px dashed rgb(156, 156, 156)";
    });
  
    selectedContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      selectedContainer.style.border = "3px dashed rgb(156, 156, 156)";
      handleFile(e.dataTransfer.files[0]);
    });
  
    // Touch and mouse events with passive listeners for better performance
    selectedContainer.addEventListener("mousedown", startDrag, {
      passive: false,
    });
    selectedContainer.addEventListener("touchstart", startDrag, {
      passive: false,
    });
    selectedContainer.addEventListener("mousemove", handleDrag, {
      passive: false,
    });
    selectedContainer.addEventListener("touchmove", handleDrag, {
      passive: false,
    });
    selectedContainer.addEventListener("mouseup", endDrag);
    selectedContainer.addEventListener("touchend", endDrag);
    selectedContainer.addEventListener("mouseleave", endDrag);
  
    // Optimized button handlers
    const handleRotate = (direction) => {
      state.isEditing = true;
      state.frameOpacity = FRAME_FADE_OPACITY;
      state.rotation += 90 * direction;
      setTimeout(() => {
        state.isEditing = false;
        state.frameOpacity = 1;
        requestRender();
      }, 500);
    };
  
    turnLeftBtn.addEventListener("click", () => handleRotate(-1));
    turnRightBtn.addEventListener("click", () => handleRotate(1));
  
    resetBtn.addEventListener("click", () => {
      state.rotation = 0;
      state.scale = 1;
      state.offset = { x: 0, y: 0 };
      zoomSlider.value = 50;
      moveSlider.value = 50;
    });
  
    // Optimized slider handlers
    zoomSlider.addEventListener(
      "input",
      handleSliderInput((e) => (state.scale = MIN_SCALE + e.target.value / 50))
    );
    zoomSlider.addEventListener("change", handleSliderEnd);
  
    moveSlider.addEventListener(
      "input",
      handleSliderInput(
        (e) => (state.rotation = (e.target.value - 50) * ROTATION_MULTIPLIER)
      )
    );
    moveSlider.addEventListener("change", handleSliderEnd);

    // Preview and download handlers
    completeBtn.addEventListener("click", () => {
      const previewCanvas = document.createElement("canvas");
      previewCanvas.width = state.originalFrame.width;
      previewCanvas.height = state.originalFrame.height;
      const previewCtx = previewCanvas.getContext("2d");

      const scaleRatio = state.originalFrame.width / userImageCanvas.width;

      previewCtx.save();
      previewCtx.translate(
        previewCanvas.width / 2 + state.offset.x * scaleRatio,
        previewCanvas.height / 2 + state.offset.y * scaleRatio
      );

      if (state.userImage) {
        previewCtx.rotate((state.rotation * Math.PI) / 180);
        previewCtx.scale(state.scale, state.scale);

        const size = Math.min(previewCanvas.width, previewCanvas.height);
        const aspectRatio = state.userImage.width / state.userImage.height;
        const [drawWidth, drawHeight] =
          aspectRatio > 1
            ? [size, size / aspectRatio]
            : [size * aspectRatio, size];

        previewCtx.drawImage(
          state.userImage,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight
        );
      }

      previewCtx.restore();
      previewCtx.drawImage(
        state.originalFrame,
        0,
        0,
        previewCanvas.width,
        previewCanvas.height
      );

      previewImage.src = previewCanvas.toDataURL("image/png");
      previewModal.show();
    });
  
    // Optimized download handler
    downloadBtn.addEventListener("click", () => {
      const downloadCanvas = document.createElement("canvas");
      downloadCanvas.width = state.originalFrame.width;
      downloadCanvas.height = state.originalFrame.height;
      const downloadCtx = downloadCanvas.getContext("2d");
  
      const scaleRatio = state.originalFrame.width / userImageCanvas.width;
  
      downloadCtx.save();
      downloadCtx.translate(
        downloadCanvas.width / 2 + state.offset.x * scaleRatio,
        downloadCanvas.height / 2 + state.offset.y * scaleRatio
      );
  
      if (state.userImage) {
        downloadCtx.rotate((state.rotation * Math.PI) / 180);
        downloadCtx.scale(state.scale, state.scale);
  
        const size = Math.min(downloadCanvas.width, downloadCanvas.height);
        const aspectRatio = state.userImage.width / state.userImage.height;
        const [drawWidth, drawHeight] =
          aspectRatio > 1
            ? [size, size / aspectRatio]
            : [size * aspectRatio, size];
  
        downloadCtx.drawImage(
          state.userImage,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight
        );
      }
  
      downloadCtx.restore();
      downloadCtx.drawImage(
        state.originalFrame,
        0,
        0,
        downloadCanvas.width,
        downloadCanvas.height
      );
  
      downloadCanvas.toBlob(
        (blob) => {
          const filename = frameSrc
            .split("/")
            .pop()
            .replace(/^\d+\./, "");
          const link = document.createElement("a");
          link.download = filename;
          link.href = URL.createObjectURL(blob);
          link.click();
          setTimeout(() => {
            URL.revokeObjectURL(link.href);
            downloadCanvas.remove();
          }, 100);
        },
        "image/png",
        1.0
      );
    });
  
    // Keyboard controls with throttling
    let keyTimeout;
    document.addEventListener("keydown", (e) => {
      if (keyTimeout) return;
      keyTimeout = setTimeout(() => {
        keyTimeout = null;
      }, 50);
  
      state.isEditing = true;
      state.frameOpacity = FRAME_FADE_OPACITY;
  
      switch (e.key) {
        case "ArrowLeft":
          state.offset.x -= MOVE_STEP;
          break;
        case "ArrowRight":
          state.offset.x += MOVE_STEP;
          break;
        case "ArrowUp":
          state.offset.y -= MOVE_STEP;
          break;
        case "ArrowDown":
          state.offset.y += MOVE_STEP;
          break;
      }
  
      setTimeout(() => {
        state.isEditing = false;
        state.frameOpacity = 1;
        requestRender();
      }, 100);
    });
  });