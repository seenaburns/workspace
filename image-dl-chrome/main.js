// Global data
let page_url = "";

let g_images = [];
let g_minWidth = 300;
let g_minHeight = 300;

// Global references to UI elements (for convenience)
const ui = {};

document.addEventListener("DOMContentLoaded", main);
function main() {
  // Initialize ui references
  ui.minWidthSlider = document.querySelector("#minWidthSlider");
  ui.minHeightSlider = document.querySelector("#minHeightSlider");
  ui.download = document.querySelector("#download");
  ui.err = document.querySelector("#err");
  ui.selectAll = document.querySelector("#select-all");

  // Initialize sliders
  // Need to not be arrow functions for this binding
  ui.minWidthSlider.oninput = function() {
    document.querySelector("#minWidth").innerHTML = this.value;
    g_minWidth = this.value;
    updateImages();
  };
  ui.minHeightSlider.oninput = function() {
    document.querySelector("#minHeight").innerHTML = this.value;
    g_minHeight = this.value;
    updateImages();
  };

  // Initialize buttons
  ui.download.onclick = () => {
    download();
  };

  ui.selectAll.onclick = () => {
    Array.from(document.querySelectorAll("img")).map(x =>
      x.classList.add("selected")
    );
  };

  // Run getImages on page context
  runGetImages();

  // Load the current url and set the filename input
  getCurrentTabUrl(url => {
    page_url = url;
    setFilenameInput(defaultFilename(url, ""));
  });

  console.log("loaded");
}

// Download all selected images
function download() {
  ui.err.innerHTML = "";

  const filename = getFilenameInput();

  if (filename == "") {
    ui.err.innerHTML = "empty filename";
    return;
  }

  const selected = Array.from(document.querySelectorAll(".selected"))
    .map(x => x.src)
    .map(x => modifyImageSrc(page_url, x));
  selected.forEach((x, index) => {
    // Try to determine extension from source
    const ext = x
      .replace(/\?.*$/, "")
      .split(".")
      .pop();

    // Create filenames
    const image_filename = mkFilename(filename, index, ext);
    console.log("Downloading " + x + " to " + image_filename);

    // Download image
    chrome.downloads.download({
      url: x,
      filename: image_filename
    });

    // Save metadata if set
    if (document.querySelector("#check-save-metadata").checked) {
      const metadata = {
        path: image_filename,
        source: page_url
      };
      const metadata_filename = mkFilename(filename, index, "json");
      saveJson(metadata_filename, metadata);
    }
  });
}

// Javascript in page context is run separately
// runGetImages executes script, onMessage handler deals with the response
function runGetImages() {
  chrome.windows.getCurrent(function(currentWindow) {
    chrome.tabs.query(
      { active: true, windowId: currentWindow.id },
      activeTabs => {
        chrome.tabs.executeScript(activeTabs[0].id, {
          file: "/getImages.js",
          allFrames: true
        });
      }
    );
  });

  console.log("ran");
}

// Handling getImages.js response (has access to page contents)
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  console.log("Message recieved:", msg);

  g_images = msg.images;
  updateImages();

  setFilenameInput(defaultFilename(page_url, msg.other));
});

// Get the current tab's url
function getCurrentTabUrl(callback) {
  let queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, tabs => {
    var tab = tabs[0];
    var url = tab.url;
    callback(url);
  });
}

// Per webpage src modification rules
function modifyImageSrc(url, src) {
  if (url.includes("tumblr.com")) {
    return src.replace(/_\d*\./g, "_1280.");
  }
  return src;
}

//
// Image Grid
//

// Set image grid contents
function updateImages() {
  let grid = document.querySelector("#image-grid");
  grid.innerHTML = "";

  console.log("Update images", g_images);

  g_images
    .filter(i => i.width >= g_minWidth && i.height >= g_minHeight)
    .forEach(i => grid.appendChild(createImageGridItem(i)));
}

function createImageGridItem(image) {
  // Create container
  let container = document.createElement("div");
  container.classList.add("iw");

  let img = document.createElement("img");
  img.src = image.src;
  img.onclick = e => {
    e.target.classList.toggle("selected");
  };

  container.appendChild(img);

  // Once the image loads, show the size information
  img.onload = () => {
    let img_size = document.createElement("div");
    img_size.classList.add("imgsize");
    img_size.innerHTML = img.naturalWidth + "x" + img.naturalHeight;
    container.appendChild(img_size);
  };

  return container;
}

//
// Filename
//

// Set filename input
function setFilenameInput(s) {
  document.querySelector("#filename").value = s;
}

function getFilenameInput() {
  return document.querySelector("#filename").value;
}

// Combine base, image index and extension into the actual saved file
function mkFilename(base, index, ext) {
  return base + "-" + index + "." + ext;
}

// Per website default filenames based on the page url, and page specific getImages
// The final fallback is the url, with '.' and '/` replaced
function defaultFilename(url, other) {
  if (url.includes("twitter.com") && url.includes("status")) {
    return url.replace(/https:\/\/twitter.com\/(\w+)\/status\/(\w+)/g, "$1-$2");
  }
  if (url.includes("instagram.com")) {
    return other + "-" + url.replace(/http.*\/p\/([\w-]+)\/.*/g, "$1") + "-ig";
  }
  if (url.includes("tumblr.com")) {
    return url.replace(
      /https?:\/\/([\w-]+).tumblr.com\/(post|image)\//g,
      "$1-"
    );
  }
  if (url.includes("artstation.com")) {
    return other + "-" + url.replace(/http.*\/(\w+)/g, "$1");
  }
  if (url.includes("dribbble.com")) {
    return (
      other +
      "-dribbble-" +
      url.replace(/https?:\/\/dribbble.com\/shots\//g, "")
    );
  }
  return url
    .replace(/.*:\/\//g, "")
    .replace(/\./g, "__")
    .replace(/\//g, "--");
}

// Save json data as a file
// Writes a data blob and then uses a trick/hack to download it by clicking an
// invisible link to the data
function saveJson(filename, data) {
  let json = JSON.stringify(data);
  let blob = new Blob([json], { type: "octet/stream" });
  let url = window.URL.createObjectURL(blob);

  let a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";

  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
