// content.js

// Load Font Awesome from the CDN (only once)
function loadFontAwesome() {
  if (!document.getElementById("fa-stylesheet")) {
    const link = document.createElement("link");
    link.id = "fa-stylesheet";
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    document.head.appendChild(link);
  }
}

// Run the main function immediately (script is injected on icon click)
loadFontAwesome();
main();

function main() {
  let selectionBox,
    startX,
    startY,
    endX,
    endY,
    isSelecting = false;

  // Create the toolbar (if not already present)
  function showToolbar() {
    if (document.getElementById("translationToolbar")) return;

    let toolbar = document.createElement("div");
    toolbar.id = "translationToolbar";
    toolbar.innerHTML = `
        <button id="startSelection" title="Select Region">
          <span class="btn-text">Select</span>
          <i class="fa-solid fa-object-group btn-icon"></i>
        </button>
        <button id="clearSelection" disabled title="Delete Selection">
          <span class="btn-text">Delete</span>
          <i class="fa-solid fa-eraser btn-icon"></i>
        </button>
        <button id="translateSelection" title="Translate">
          <span class="btn-text">Translate</span>
          <i class="fa-solid fa-language btn-icon"></i>
        </button>
        <button id="closeToolbar" title="Close">
          <i class="fa-solid fa-xmark btn-icon"></i>
        </button>
      `;
    document.body.appendChild(toolbar);

    document
      .getElementById("startSelection")
      .addEventListener("click", activateSelectionMode);
    document
      .getElementById("clearSelection")
      .addEventListener("click", clearSelection);
    document
      .getElementById("translateSelection")
      .addEventListener("click", translateSelectedRegion);
    document
      .getElementById("closeToolbar")
      .addEventListener("click", closeToolbar);
  }

  // Enable region selection by listening for mouse events.
  function activateSelectionMode() {
    document.addEventListener("mousedown", startDrawing);
    document.addEventListener("mouseup", stopDrawing);
  }

  // Begin drawing the selection box.
  function startDrawing(event) {
    if (event.target.closest("#translationToolbar")) return; // ignore clicks on the toolbar
    clearSelection();
    isSelecting = true;
    // Convert viewport coordinates to document coordinates.
    startX = event.clientX + window.scrollX;
    startY = event.clientY + window.scrollY;

    selectionBox = document.createElement("div");
    selectionBox.className = "selection-box";
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    document.body.appendChild(selectionBox);

    document.addEventListener("mousemove", drawSelection);
  }

  // Update the selection box dimensions as the mouse moves.
  function drawSelection(event) {
    if (!isSelecting || !selectionBox) return;
    endX = event.clientX + window.scrollX;
    endY = event.clientY + window.scrollY;

    const rectLeft = Math.min(startX, endX);
    const rectTop = Math.min(startY, endY);
    const rectWidth = Math.abs(endX - startX);
    const rectHeight = Math.abs(endY - startY);

    selectionBox.style.left = `${rectLeft}px`;
    selectionBox.style.top = `${rectTop}px`;
    selectionBox.style.width = `${rectWidth}px`;
    selectionBox.style.height = `${rectHeight}px`;
  }

  // Stop drawing the selection box.
  function stopDrawing() {
    isSelecting = false;
    document.removeEventListener("mousemove", drawSelection);
    const clearBtn = document.getElementById("clearSelection");
    if (clearBtn) clearBtn.disabled = false;
  }

  // Remove the current selection.
  function clearSelection() {
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
      const clearBtn = document.getElementById("clearSelection");
      if (clearBtn) clearBtn.disabled = true;
    }
  }

  // Capture the selected region, adjust for device pixel ratio, run OCR, and display the result.
  async function translateSelectedRegion() {
    if (!selectionBox) {
      console.warn("No region selected!");
      return;
    }

    const rect = selectionBox.getBoundingClientRect();
    const cropX = rect.left + window.scrollX;
    const cropY = rect.top + window.scrollY;
    const cropWidth = rect.width;
    const cropHeight = rect.height;
    const scale = window.devicePixelRatio || 1;

    try {
      const canvas = await html2canvas(document.body);
      let croppedCanvas = document.createElement("canvas");
      let ctx = croppedCanvas.getContext("2d");
      croppedCanvas.width = cropWidth;
      croppedCanvas.height = cropHeight;

      // Adjust the crop coordinates by the scaling factor.
      ctx.drawImage(
        canvas,
        cropX * scale,
        cropY * scale,
        cropWidth * scale,
        cropHeight * scale,
        0,
        0,
        cropWidth,
        cropHeight
      );

      let imageData = croppedCanvas.toDataURL();
      Tesseract.recognize(imageData, "eng").then(({ data: { text } }) => {
        showResult(text);
      });
    } catch (error) {
      console.error("Error capturing the image:", error);
    }

    clearSelection();
  }

  // Create and show the result view below the toolbar.
  // The result view is fixed so it remains visible.
  function showResult(text) {
    // Remove any existing result view.
    let existingResult = document.getElementById("translationResult");
    if (existingResult) {
      existingResult.remove();
    }

    let resultDiv = document.createElement("div");
    resultDiv.id = "translationResult";
    resultDiv.innerHTML = `
        <div class="result-header">
          <span class="result-title">Translation</span>
          <div class="result-buttons">
            <button id="copyResult" title="Copy">
              <i class="fa-solid fa-copy result-icon" id="copyIcon"></i>
            </button>
            <button id="closeResult" title="Close">
              <i class="fa-solid fa-xmark result-icon"></i>
            </button>
          </div>
        </div>
        <div class="result-content">${text.replace(/\n/g, "<br>")}</div>
      `;
    document.body.appendChild(resultDiv);

    // Add event listeners for the result buttons.
    document.getElementById("copyResult").addEventListener("click", () => {
      console.log("Copy button clicked");
      copyTextToClipboard(text);
    });
    document.getElementById("closeResult").addEventListener("click", () => {
      console.log("Close button clicked");
      resultDiv.remove();
    });
  }

  // Copy the text to the clipboard and temporarily change the copy icon.
  function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      const copyIcon = document.getElementById("copyIcon");
      if (copyIcon) {
        // Change icon to check mark
        copyIcon.className = "fa-solid fa-check result-icon";
        setTimeout(() => {
          copyIcon.className = "fa-solid fa-copy result-icon";
        }, 1000);
      }
    });
  }

  // Remove the toolbar and any result view.
  function closeToolbar() {
    const toolbar = document.getElementById("translationToolbar");
    if (toolbar) toolbar.remove();
    clearSelection();
    document.removeEventListener("mousedown", startDrawing);
    document.removeEventListener("mouseup", stopDrawing);
    document.removeEventListener("mousemove", drawSelection);
    const resultDiv = document.getElementById("translationResult");
    if (resultDiv) resultDiv.remove();
  }

  showToolbar();
}
