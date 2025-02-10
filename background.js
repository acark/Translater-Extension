// background.js
chrome.action.onClicked.addListener((tab) => {
  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("chrome-extension://")
  ) {
    console.warn("Extension cannot run on Chrome internal pages.");
    return;
  }

  // Inject html2canvas.min.js, then tesseract.min.js, then content.js.
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      files: ["html2canvas.min.js"],
    },
    () => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: ["tesseract.min.js"],
        },
        () => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"],
          });
        }
      );
    }
  );
});
