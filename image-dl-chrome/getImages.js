// getImages.js
// Runs in the webpage context

// On startup get images + page specific data and send to extension
chrome.runtime.sendMessage({
  images: fetchImages(),
  other: pageSpecific()
});

// Fetch all images on the page
function fetchImages() {
  const images = Array.from(document.querySelectorAll("img")).map(i => ({
    src: i.src,
    width: i.naturalWidth,
    height: i.naturalHeight
  }));

  const video_thumbs = Array.from(document.querySelectorAll("video")).map(
    v => ({
      src: v.poster,
      width: maxSize([v.width, v.naturalWidth, v.videoWidth]),
      height: maxSize([v.height, v.naturalHeight, v.videoHeight])
    })
  );

  const all = images.concat(video_thumbs);

  return uniqueImages(all);
}

// Given a list of images, deduplicate images with the same src
function uniqueImages(images) {
  const unique = new Map();
  images.forEach(i => unique.set(i.src, i));
  return Array.from(unique.values());
}

// Some websites have more useful source info in the page, that the extension
// doesn't have access to. This function is an ad hoc fetch for different info
// based on the website, e.g. the user from instagram or artstation
function pageSpecific() {
  const url = window.location.href;

  let msg = "";
  if (url.includes("artstation")) {
    msg = document.querySelector(".name a").text.replace(" ", "-");
  } else if (url.includes("instagram")) {
    msg = document
      .querySelector("header a")
      .href.replace(/http.*\/([\w.]+)\//g, "$1")
      .replace(/\./g, "-");
  } else if (url.includes("dribbble")) {
    msg = document.querySelector("h2 span span a").innerText.replace(/ /g, "-");
  }
  return msg;
}

function maxSize(sizes) {
  return Math.max(...sizes.map(x => (x === undefined ? 0 : x)));
}
