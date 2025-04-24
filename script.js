// === Utility functions. === //

const getWidthIncludingMargin = el => {
  const currentStyle = el.currentStyle || window.getComputedStyle(el);
  const marginLeft = parseInt(currentStyle.marginLeft.replace('px', ''));
  const marginRight = parseInt(currentStyle.marginRight.replace('px', ''));
  return el.clientWidth + marginLeft + marginRight;
};


const getCarouselWindows = (carouselEl, includeIllusory = false) => {
  // Use array prototype so result can be chained to .map, .forEach, etc.
  let windows =
      [].slice.call(carouselEl.getElementsByClassName('carousel-element'));
  if (!includeIllusory) {
    windows = windows.filter(w => !(w.classList.contains('illusory')));
  }
  return windows;
};


// This is only called once, when the DOM is ready.
const addCarouselLoopIllusion = carouselEl => {
  const carouselWindowEl =
      carouselEl.getElementsByClassName('carousel-elements')[0];
  const windows = getCarouselWindows(carouselEl, false);

  // Half the window width is the amount of space we want to fill with
  // illusory windows so we can guarantee the user can fully scroll to
  // an illusory window.
  let remainderLeftX = window.innerWidth / 2;
  let i = windows.length - 1;
  while (remainderLeftX > 0) {
    const w = windows[i].cloneNode(true);
    w.classList.add('illusory');
    carouselWindowEl.insertBefore(w, carouselWindowEl.firstChild);
    remainderLeftX -= getWidthIncludingMargin(w);
    // Modulus in js doesn't work with negative numbers.
    i = i === 0 ? windows.length - 1 : i - 1;
  }

  let remainderRightX = window.innerWidth / 2;
  i = 0;
  while (remainderRightX > 0) {
    const w = windows[i].cloneNode(true);
    w.classList.add('illusory');
    carouselWindowEl.appendChild(w);
    remainderRightX -= getWidthIncludingMargin(w);
    i = (i + 1) % windows.length;
  }
};


const getCarouselXs = carouselEl => {
  const allWindows = getCarouselWindows(carouselEl, true);
  const finalOffset =
      (window.innerWidth - allWindows[1].clientWidth) / 2;

  const widths = allWindows.map(getWidthIncludingMargin);
  const xs = [];
  let cumsum = -finalOffset;
  widths.map(w => {
    xs.push(cumsum);
    cumsum += w;
  });
  return xs;
};


// Return the index of the (non-illusory) window given its (illusory-inclusive)
// index.
const getCarouselWindowByIndex = (carouselEl, index) => {
  const allWindows = getCarouselWindows(carouselEl, true);
  let nLeftIllusory = 0;
  let i = 0;
  while (allWindows[i].classList.contains('illusory')) {
    nLeftIllusory++;
    i++;
  }
  let nRightIllusory = 0;
  i = allWindows.length - 1;
  while (allWindows[i].classList.contains('illusory')) {
    nRightIllusory++;
    i--;
  }
  const nReal = allWindows.length - nLeftIllusory - nRightIllusory;

  if (index < nLeftIllusory) {
    index = index + (nReal - nLeftIllusory);
  }
  else if (index >= nLeftIllusory + nReal) {
    index = index - (nLeftIllusory + nReal);
  }
  else {
    index = index - nLeftIllusory;
  }

  const xs = getCarouselXs(carouselEl);
  const x = xs[nLeftIllusory + index];
  return {index, x};
};


// Return the index of the (non-illusory) current window.
const getCurrentCarouselWindowIndex = carouselEl => {
  const carouselWindowEl =
      carouselEl.getElementsByClassName('carousel-elements')[0];
  let scrollLeft = carouselWindowEl.scrollLeft;
  const xs = getCarouselXs(carouselEl);
  const distances = xs.map(x => Math.abs(x - scrollLeft));
  let index = distances.indexOf(Math.min(...distances));
  return index;
};

const getCurrentCarouselWindow = carouselEl => {
  return getCarouselWindowByIndex(carouselEl, getCurrentCarouselWindowIndex(carouselEl));
};


// === Global variables and functions accessed by the HTML. === //

let scrollTimer = null;
let isAdjusting = false;

function scrollCarousel(carouselWindowsEl) {
  // DISABLED
  return;
  const carouselEl = carouselWindowsEl.parentNode;
  if (scrollTimer !== null) {
    clearTimeout(scrollTimer);
  }
  if (isAdjusting) {
    return;
  }
  // When done scrolling, move to center of closest window.
  scrollTimer = setTimeout(() => {
    isAdjusting = true;
    // This seems to trigger the event once more, so we need to prevent it
    // explicitly with the isAdjusting flag.
    carouselWindowsEl.scrollLeft = getCurrentCarouselWindow(carouselEl).x;
    setTimeout(() => {
      isAdjusting = false;
    }, 300);
  }, 300);
}

function moveCarousel(carouselEl, direction) {
  const carouselElements = carouselEl.getElementsByClassName('carousel-element');
  const numElements = carouselElements.length;
  const curIndex = getCurrentCarouselWindowIndex(carouselEl);
  const newIndex = (curIndex + direction) % numElements;
  const carouselWindowEl = carouselEl.getElementsByClassName('carousel-elements')[0];
  carouselWindowEl.scrollLeft = getCarouselWindowByIndex(carouselEl, newIndex).x;
}


// === Document ready. === //

// A self-executing function is a faster alternative to onload() because it only
// waits for the DOM to be ready, not for all the media to load. Should work on
// every browser.
(() => {
  // Add event listener for key presses. We need to do this manually to get an
  // event object.
  // document.addEventListener('keydown', e => {
  //   if (e.code === 'ArrowLeft') {
  //     moveClosestCarousel(-1);
  //   } else if (e.code === 'ArrowRight') {
  //     moveClosestCarousel(1);
  //   }
  // });

  // Activate all the carousels.
  for (let carouselEl of document.getElementsByClassName('carousel')) {
    // addCarouselLoopIllusion(carouselEl);

    // Control where they start.
    setTimeout(() => {
      const carouselWindowsEl = carouselEl.getElementsByClassName('carousel-elements')[0];
      let i = 0;
      for (let carouselWindow of carouselWindowsEl.children) {
        if (carouselWindow.classList.contains('favorite')) {
          break;
        }
        i++;
      }
      carouselWindowsEl.scrollLeft = getCarouselWindowByIndex(carouselEl, i).x;
    }, 2000);
  }
})();
