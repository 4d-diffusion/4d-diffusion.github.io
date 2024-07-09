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
  console.log('addCarouselLoopIllusion');

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
    i--;
    console.log('addCarouselLoopIllusion: added left');
  }

  let remainderRightX = window.innerWidth / 2;
  i = 0;
  while (remainderRightX > 0) {
    const w = windows[i].cloneNode(true);
    w.classList.add('illusory');
    carouselWindowEl.appendChild(w);
    remainderRightX -= getWidthIncludingMargin(w);
    i++;
    console.log('addCarouselLoopIllusion: added right');
  }
};


const getCarouselXs = carouselEl => {
  const allWindows = getCarouselWindows(carouselEl, true);
  // TODO(watsondaniel): check if this is ok
  const finalOffset =
      (window.innerWidth - allWindows[1].clientWidth) / 2;
  console.log('getCarouselXs: finalOffset', finalOffset);

  const widths = allWindows.map(getWidthIncludingMargin);
  const xs = [];
  let cumsum = -finalOffset;
  widths.map(w => {
    xs.push(cumsum);
    cumsum += w;
  });
  return xs;
};


// Return the index of the (non-illusory) current window.
const getCurrentCarouselWindow = carouselEl => {
  const carouselWindowEl =
      carouselEl.getElementsByClassName('carousel-elements')[0];

  let scrollLeft = carouselWindowEl.scrollLeft;
  const xs = getCarouselXs(carouselEl);
  const distances = xs.map(x => Math.abs(x - scrollLeft));
  let index = distances.indexOf(Math.min(...distances));

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
  console.log('getCurrentCarouselWindow: nLeftIllusory', nLeftIllusory);
  console.log('getCurrentCarouselWindow: nRightIllusory', nRightIllusory);
  const nReal = allWindows.length - nLeftIllusory - nRightIllusory;

  // TODO(watsondaniel): handle negative differences?
  if (index < nLeftIllusory) {
    index = index + (nReal - nLeftIllusory);
  }
  else if (index >= nLeftIllusory + nReal) {
    index = index - (nLeftIllusory + nReal);
  }
  else {
    index = index - nLeftIllusory;
  }

  let x = xs[nLeftIllusory + index];

  console.log('getCurrentCarouselWindow: scrollLeft', scrollLeft);
  console.log('getCurrentCarouselWindow: xs', xs);
  console.log('getCurrentCarouselWindow: distances', distances);
  return {index, x};
};


const loadCarouselWindowMedia = (windowEl, groupStr) => {
  const src = windowEl.dataset[groupStr];
  const srcEl = windowEl.getElementsByClassName('dynamic')[0];
  if (srcEl !== null && srcEl !== undefined &&
      srcEl.getAttribute('src') !== src) {
    srcEl.setAttribute('src', src);
  }
  if (srcEl.parentNode.tagName === 'VIDEO') {
    srcEl.parentNode.load();
    srcEl.parentNode.play();
  }
};


const activateCarousel = (carouselEl, windowIndex, groupStr) => {
  // TODO(watsondaniel): check if this is ok
  const windows = getCarouselWindows(carouselEl);

  // First adjust the scrollLeft to the specified or closest window.
  if (windowIndex === null) {
    windowIndex = getCurrentCarouselWindow(carouselEl).index;
  } else {
    windowIndex++;
  }
  const carouselWindowEl =
      carouselEl.getElementsByClassName('carousel-elements')[0];
  carouselWindowEl.scrollLeft = getCarouselXs(carouselEl)[windowIndex];

  // TODO(watsondaniel): don't return; find current groupStr instead!
  if (groupStr === null) {
    return;
  }
  loadCarouselWindowMedia(windows[windowIndex], groupStr);
  loadCarouselWindowMedia(
      windows[(windowIndex + 1) % windows.length], groupStr);
  loadCarouselWindowMedia(
      windows[(windowIndex - 1) % windows.length], groupStr);
};


// === Global functions accessed by the HTML. === //

// TODO(watsondaniel): can we avoid the global variables?
let scrollTimer = null;
let isAdjusting = false;

function scrollCarousel(carouselWindowsEl) {
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

function moveCarousel(carouselEl, increment) {
  // TODO(watsondaniel): check if this is ok
  const n = getCarouselWindows(carouselEl).length;
  const i = getCurrentCarouselWindow(carouselEl).index - 1;
  activateCarousel(carouselEl, (i + increment) % n, null);
}

const moveClosestCarousel = increment => {
  const carousels = [].slice.call(document.getElementsByClassName('carousel'));
  const hs = carousels.map(el => el.clientHeight);
  // NOTE: these are already offset by window.scrollY. Adding it back will make
  // the result constant.
  const yStart = carousels.map(el => el.getBoundingClientRect().top);
  const yEnd = yStart.map((y, i) => y + hs[i]);
  const yMax = window.innerHeight;

  const candidates = [];
  for (let i = 0; i < carousels.length; i++) {
    if (yStart[i] < yMax && yEnd[i] > 0) {
      candidates.push(i);
    }
  }

  const candidateCoverage = candidates.map(
      i => ((Math.min(yMax, yEnd[i]) - Math.max(0, yStart[i])) / hs[i]));
  const index = candidateCoverage.indexOf(Math.max(...candidateCoverage));
  moveCarousel(carousels[index], increment);
};

function changeCarouselGroup(toggleEl, groupStr) {
  const carouselEl = toggleEl.parentNode.parentNode;
  for (anyToggleEl of toggleEl.parentNode.children) {
    anyToggleEl.classList.remove('active');
  }
  toggleEl.classList.add('active');
  activateCarousel(carouselEl, null, groupStr);
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
  console.log('all carousels:', document.getElementsByClassName('carousel'));
  for (let carouselEl of document.getElementsByClassName('carousel')) {
    console.log('calling addCarouselLoopIllusion', carouselEl);
    addCarouselLoopIllusion(carouselEl);
    // TODO(watsondaniel): check if this is ok
    // const groupStr = Object.keys(getCarouselWindows(carouselEl)[0].dataset)[0];
    // activateCarousel(carouselEl, 0, groupStr);
  }
})();
