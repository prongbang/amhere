function docReady(fn) {
  // see if DOM is already available
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    // call on next available tick
    setTimeout(fn, 1);
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
docReady(function () {
  const scanRegionCamera = document.getElementById("scanTypeCamera");
  const scanRegionFile = document.getElementById("scanTypeFile");
  const scanButton = document.getElementById("scanButton");
  const stopButton = document.getElementById("stopButton");
  const qrFileInput = document.getElementById("qrInputFile");
  const requestPermissionButton = document.getElementById("requestPermission");
  const selectCameraContainer = document.getElementById(
    "selectCameraContainer"
  );
  const cameraSelection = document.getElementById("cameraSelection");
  const scannedCodeContainer = document.getElementById("scannedCodeContainer");
  const fileInput = document.getElementById("qrInputFile");
  const feedbackContainer = document.getElementById("feedback");
  const statusContainer = document.getElementById("status");
  const SCAN_TYPE_CAMERA = "camera";
  const SCAN_TYPE_FILE = "file";
  // declaration of html5 qrcode
  const html5QrCode = new Html5Qrcode("qr", /* verbose= */ true);
  var currentScanTypeSelection = SCAN_TYPE_CAMERA;
  var codesFound = 0;
  var lastMessageFound = null;
  const setPlaceholder = () => {
    const placeholder = document.createElement("div");
    placeholder.innerHTML = "QR viewfinder comes here";
    placeholder.className = "placeholder";
    document.getElementById("qr").appendChild(placeholder);
  };
  const setFeedback = (message) => {
    feedbackContainer.innerHTML = message;
  };
  const setStatus = (status) => {
    statusContainer.innerHTML = status;
  };
  const qrCodeSuccessCallback = (qrCodeMessage) => {
    setStatus("Pattern Found");
    setFeedback("");
    if (lastMessageFound === qrCodeMessage.toLocaleLowerCase()) {
      return;
    }
    ++codesFound;
    lastMessageFound = qrCodeMessage.toLocaleLowerCase();
    const result = document.createElement("div");
    result.innerHTML = `[${codesFound}] New code found: <strong>${qrCodeMessage}</strong>`;
    scannedCodeContainer.appendChild(result);
  };
  const qrCodeErrorCallback = (message) => {
    setStatus("Scanning");
  };
  const videoErrorCallback = (message) => {
    setFeedback(`Video Error, error = ${message}`);
  };
  const classExists = (element, needle) => {
    const classList = element.classList;
    for (var i = 0; i < classList.length; i++) {
      if (classList[i] == needle) {
        return true;
      }
    }
    return false;
  };
  const addClass = (element, className) => {
    if (!element || !className) throw "Both element and className mandatory";
    if (classExists(element, className)) return;
    element.classList.add(className);
  };
  const removeClass = (element, className) => {
    if (!element || !className) throw "Both element and className mandatory";
    if (!classExists(element, className)) return;
    element.classList.remove(className);
  };
  const onScanTypeSelectionChange = (event) => {
    const setupFileOption = () => {
      currentScanTypeSelection = SCAN_TYPE_FILE;
      html5QrCode.clear();
      setPlaceholder();
      if (stopButton.disabled != true) {
        stopButton.click();
      }
      addClass(scanRegionCamera, "disabled");
      removeClass(scanRegionFile, "disabled");
      qrFileInput.disabled = false;
      setFeedback("Select image file to scan QR code.");
    };
    const setupCameraOption = () => {
      currentScanTypeSelection = SCAN_TYPE_CAMERA;
      html5QrCode.clear();
      setPlaceholder();
      qrFileInput.value = "";
      qrFileInput.disabled = true;
      removeClass(scanRegionCamera, "disabled");
      addClass(scanRegionFile, "disabled");
      setFeedback("Click 'Start Scanning' to <b>start scanning QR Code</b>");
    };
    const val = event.target.value;
    if (val == "file") {
      setupFileOption();
    } else if (val == "camera") {
      setupCameraOption();
    } else {
      throw `Unsupported scan type ${val}`;
    }
  };
  document.querySelectorAll("input[name='scan-type']").forEach((input) => {
    input.addEventListener("change", onScanTypeSelectionChange);
  });
  requestPermissionButton.addEventListener("click", function () {
    if (currentScanTypeSelection != SCAN_TYPE_CAMERA) return;
    requestPermissionButton.disabled = true;
    Html5Qrcode.getCameras()
      .then((cameras) => {
        selectCameraContainer.innerHTML = `Select Camera (${cameras.length})`;
        if (cameras.length == 0) {
          return setFeedback("Error: Zero cameras found in the device");
        }
        for (var i = 0; i < cameras.length; i++) {
          const camera = cameras[i];
          const value = camera.id;
          const name = camera.label == null ? value : camera.label;
          const option = document.createElement("option");
          option.value = value;
          option.innerHTML = name;
          cameraSelection.appendChild(option);
        }
        cameraSelection.disabled = false;
        scanButton.disabled = false;
        scanButton.addEventListener("click", () => {
          if (currentScanTypeSelection != SCAN_TYPE_CAMERA) return;
          const cameraId = cameraSelection.value;
          cameraSelection.disabled = true;
          scanButton.disabled = true;
          // Start scanning.
          html5QrCode
            .start(
              cameraId,
              {
                fps: 10,
                qrbox: 250,
              },
              qrCodeSuccessCallback,
              qrCodeErrorCallback
            )
            .then((_) => {
              stopButton.disabled = false;
              setStatus("scanning");
              setFeedback("");
            })
            .catch((error) => {
              cameraSelection.disabled = false;
              scanButton.disabled = false;
              videoErrorCallback(error);
            });
        });
        stopButton.addEventListener("click", function () {
          stopButton.disabled = true;
          html5QrCode
            .stop()
            .then((ignore) => {
              cameraSelection.disabled = false;
              scanButton.disabled = false;
              setFeedback("Stopped");
              setFeedback(
                "Click 'Start Scanning' to <b>start scanning QR Code</b>"
              );
              scannedCodeContainer.innerHTML = "";
              setPlaceholder();
            })
            .catch((err) => {
              stopButton.disabled = false;
              setFeedback("Error");
              setFeedback("Race condition, unable to close the scan.");
            });
        });
      })
      .catch((err) => {
        requestPermissionButton.disabled = false;
        setFeedback(`Error: Unable to query any cameras. Reason: ${err}`);
      });
  });
  // File based scanning
  fileInput.addEventListener("change", (e) => {
    if (currentScanTypeSelection != SCAN_TYPE_FILE) return;
    if (e.target.files.length == 0) {
      return;
    }
    const file = e.target.files[0];
    html5QrCode
      .scanFile(file, true)
      .then(qrCodeSuccessCallback)
      .catch((err) => setFeedback(`Error scanning file. Reason: ${err}`));
  });
});
