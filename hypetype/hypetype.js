//set up a cache for htmls created and letters loaded
const cache = {};
const lettersCache = {};
let loadedFonts = 0;
// load kerning map with fontlist

// handle the preload of all participating fonts (once config data is loaded)
function handleFontPreloads(configData) {
  window.widget.events.off("configDataChanged", handleFontPreloads);
  preloadPriority();
}
window.widget.events.on("configDataChanged", handleFontPreloads);

// Register a custom composite field
widget.compositeFields.registerCompositeFieldProvider({
  // first comes the meta data 
  getCompositeFieldMetadata: () => ({
    type: 'hypeType',
    displayName: 'Hype Type',
    description: 'Animate letters with lottie animation',
    previewImageUrl: import.meta.resolve("./images/text_rotation_angleup_white_24dp.svg"),
    defaultMimeType: "text/multiline",
    defaultBaseType: "text"
  }),

  // now define the create flow (what happens when a user adds a custom field to the canvas)
  async createCompositeFieldInstance({ compositeFieldId, configState }) {
    // cache the html element so it keeps continuity during the element's life cycle
    if (!cache[compositeFieldId + configState.referenceId]) {
      cache[compositeFieldId + configState.referenceId] = document.createElement("div");
    }
    const htmlElement = cache[compositeFieldId + configState.referenceId];
    // parse the config.json
    let field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field

    // first load the kerning info with the list of supported fonts


    // set some defaults
    if (!field.style.fontSize) {
      field.style.fontSize = "22px";
    }
    let size = field.style.fontSize.toString().replace("px", "");
    let fontObj = kernmap[field.style.fontFamily.replaceAll('"', '')];
    if (!fontObj) {
      fontObj = kernmap["Roboto"];
    }
    let font = fontObj.font;
    let kern = fontObj.kern;
    let vsize = fontObj.vsize;

    let colorMap = [];
    let interval = null;
    let exitInterval = null;
    let enterTimeout = [];
    let exitTimeout = [];

    // reolace the colors in the lotty based on configData
    function updateColors() {
      let fontColor = field.style.color;
      let hFontColor = field.highlightedStyle.color;
      colorMap = getColorsFromLottie(lettersCache[font].w);
      for (let letter in lettersCache[font]) {
        lettersCache[font][letter] = replaceColorsInLottie(lettersCache[font][letter], colorMap, [fontColor, hFontColor]);
      }
    }
    // this takes the content and converts each letter to a lottie animation. It is used for preview (isPlay=true), or for runtime (isPlay=false)
    async function render(isPlay) {
      field = configState.settings.compositeFields[compositeFieldId];
      fontObj = kernmap[field.style.fontFamily.replaceAll('"', '')];
      if (!fontObj) {
        fontObj = kernmap["Roboto"];
      }
      font = fontObj.font;

      if (!lettersCache[font] || !lettersCache[font].loaded) {
        await preloadFont(fontObj);
      }
      removeRelatedLottie(compositeFieldId);
      updateColors();
      window.widget.compositeFields.applyHtmlElementTextContent({ // apply style to field
        htmlElement,
        textContent: field.text?.[0]?.content,
        style: field.style,
        highlightStyle: field.highlightedStyle,
      });
      let content = htmlElement.innerHTML; // get the interpulated text and manipulate it for the lottie animations
      htmlElement.innerHTML = "";
      let contentArr = splitString(content);// devide the content into words
      for (let x = 0; x < contentArr.length; x++) {
        if (contentArr[x] == "<br>") {
          let e = document.createElement("br");
          htmlElement.appendChild(e);
          continue;
        }
        // building the htmls
        let word = document.createElement("span");
        word.style.display = "inline-block";
        let wordContent = contentArr[x].replace(/<\/?[^>]+(>|$)/g, ''); // remove html tags created for formatting.
        for (let i = 0; i < wordContent.length; i++) {
          let curLetter = wordContent.substring(i, i + 1).toLowerCase();
          let e = document.createElement("span");
          e.style.display = "inline-block";
          e.style.verticalAlign = "middle";
          if (lettersCache[font][curLetter]) {
            let ani = lottie.loadAnimation({
              container: e, // the dom element that will contain the animation
              renderer: 'svg',
              loop: false,
              autoplay: false,
              name: compositeFieldId + x + "_" + i,
              animationData: lettersCache[font][curLetter], // the cached json object
              rendererSettings: {
                viewBoxOnly: false
              }
            });

            let curKern = getKern(kern, curLetter);
            let fontWidth = ((size / ani.animationData.h) * ani.animationData.w);
            let actualWidth = fontWidth * curKern / 100;// make it releative to animation height and set font size
            let actualHeight = size * vsize / 100;
            e.style.width = actualWidth + "px";
            e.style.height = actualHeight * +"px";
            e.style.position = "relative";
            e.firstChild.style.left = -((fontWidth - actualWidth) / 2) + "px";
            e.firstChild.style.top = -(size / 2) + "px";
            e.firstChild.style.width = fontWidth + "px";
            e.firstChild.style.height = size + "px";
            e.firstChild.style.display = "block";
            e.firstChild.style.position = "absolute";

            if (isPlay) {
              ani.addEventListener('DOMLoaded', function () {
                ani.setDirection(1);
                let aniDuration = ani.getDuration(true);
                ani.goToAndStop(aniDuration - 1, true);
              }
              );
            }
            word.appendChild(e);
          }

          htmlElement.appendChild(word);
          if (x != contentArr.length - 1) { // add space if not the last word
            let space = document.createElement("span");
            htmlElement.appendChild(space);
            space.innerHTML = " ";
            space.style.fontSize = size + "px";
          }
        }
      }
    }

    // get a letter's kern value
    function getKern(kernObj, letter) {
      for (var k of kernObj) {
        if (k.letters.indexOf(letter.toUpperCase()) != -1) {
          return k.kern;
        }
      }
      return 20;
    }

    // handle an alert coming in or a preview in the editor
    function handle_startSequencePlaybackRequested() {
      // this will block the queue while alert is being played, until done or canceled
      return window.widget.queue.awaitTask(() => new Promise(resolve => {
        // Our "animation" minimum is 2000 milliseconds but if there is an animation definition in the configState, it will take it
        let animationDuration = 2000; // default duration if not set
        const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field
        let animationDelay = 0;
        let enterAnimationDuration = 0;
        let exitAnimationDuration = 0;
        if (field.animation && field.animation.static && field.animation.static.animationDuration) {
          animationDuration = field.animation.static.animationDuration.replace("s", "") * 1000;
        }
        if (field.animation && field.animation.enter && field.animation.enter.animationDelay) {
          animationDelay = field.animation.enter.animationDelay.replace("s", "") * 1000;
        }
        if (field.animation && field.animation.enter && field.animation.enter.animationDuration) {
          enterAnimationDuration = field.animation.enter.animationDuration.replace("s", "") * 1000;
        }
        if (field.animation && field.animation.exit && field.animation.exit.animationDuration) {
          exitAnimationDuration = field.animation.exit.animationDuration.replace("s", "") * 1000;
        }
        window.widget.compositeFields.applyHtmlElementTextContent({
          htmlElement,
          textContent: field.text?.[0]?.content,
          style: field.style,
          highlightStyle: field.highlightedStyle,
        });

        let curWordIndx = 0;
        let curLetterIndx = 0;
        let content = htmlElement.innerText;
        const speedConst = 1;
        let speed = (speedConst * 1000 / content.length) / 2;
        htmlElement.innerHTML = "";
        render(false);
        let contentArr = content.split(" ");
        let timersCount = 0
        interval = setInterval(function () {
          enterTimeout.push(setTimeout(function () {
            lottie.setDirection(1);
            lottie.play(compositeFieldId + curWordIndx + "_" + curLetterIndx);
            if (curLetterIndx == contentArr[curWordIndx].length) {
              if (curWordIndx == contentArr.length - 1) {
               // clearInterval(interval);
              } else {
                curWordIndx++;
                curLetterIndx = 0;
              }
            } else {
              curLetterIndx++
            }
          }, animationDelay));
          timersCount++;
          if (timersCount == content.length) {
            clearInterval(interval);
          }
        }, speed)
        let curRevWordIndx = 0;
        let curRevLetterIndx = 0;
        let exitTimersCount = 0;
        exitInterval = setInterval(function () {
          exitTimeout.push(setTimeout(function () {
            lottie.setDirection(-1);
            lottie.play(compositeFieldId + curRevWordIndx + "_" + curRevLetterIndx);
            if (curRevLetterIndx == contentArr[curRevWordIndx].length - 1) {
              if (curRevWordIndx == contentArr.length - 1) {
                let ani = getAnimationByName(compositeFieldId + curRevWordIndx + "_" + curRevLetterIndx);
                ani.addEventListener('complete', function () {
                  ani.removeEventListener("complete");
                  clearTimeouts();
                  resolve();
                });
              } else {
                curRevWordIndx++;
                curRevLetterIndx = 0;
              }
            } else {
              curRevLetterIndx++
            }
          }, animationDelay + speed * content.length + animationDuration));
          exitTimersCount++
          if (exitTimersCount == content.length) {
            clearInterval(exitInterval);
          }
        }, speed)
      }));
    }
    // remove created lottie animations
    function removeRelatedLottie(compositeFieldId) {
      let animations = lottie.getRegisteredAnimations();
      for (let i in animations) {
        let ani = animations[i];
        if (ani.name.substring(0, compositeFieldId.length) == compositeFieldId) {
          ani.destroy();
        }
      }

    }
    // get animation by name
    function getAnimationByName(name) {
      let animations = lottie.getRegisteredAnimations();
      for (let i in animations) {
        let ani = animations[i];
        if (ani.name.substring(0, compositeFieldId.length) == compositeFieldId) {
          return ani;
        }
      }
    }
    // stop all intervals when playback is cancelled
    function handle_cancelSequencePlaybackRequested() {
      if ((interval || exitInterval) && window.widget.queue.lockCount > 0) {
        window.widget.queue.unlock();
      }
      clearTimeouts();
      render(true);
    }
    // handle config data change - mainly address preloading fonts
    async function handle_configDataChanged(configData) {
      configState = getConfigState(configData, configState.referenceId);
      field = configState.settings.compositeFields[compositeFieldId];
      if (!lettersCache[field.style.fontFamily].loaded) {
        let fontObj = { "font": kernmap[fontList[i]].font, "kern": kernmap[fontList[i]].kern, initialized: false }
        await preloadFont(fontObj);
      }
      updateColors();
      render(true);
    }
    // when going back to static mode in editor - render the text
    function handle_previewModeChanged(mode) {
      if (mode == "static") {
        render(true);
      }
    }
    // remove all the intervals and timeouts
    function clearTimeouts() {
      if (interval) {
        clearInterval(interval);
      }
      if (exitInterval) {
        clearInterval(exitInterval);
      }
      for (let i in enterTimeout) {
        clearTimeout(enterTimeout[i]);
      }
      enterTimeout = [];
      for (let i in exitTimeout) {
        clearTimeout(exitTimeout[i]);
      }
      exitTimeout = [];
    }
    // Define what happens when the editor, widget container (or your code) sends an emulation request 
    window.widget.events.on('startSequencePlaybackRequested', handle_startSequencePlaybackRequested);
    window.widget.events.on('cancelSequencePlaybackRequested', handle_cancelSequencePlaybackRequested);
    window.widget.events.on("configDataChanged", handle_configDataChanged);
    window.widget.events.on("previewModeChanged", handle_previewModeChanged);

    // Render initial state
    if (!lettersCache[font] || !lettersCache[font].loaded) {
      preloadFont(fontObj, function () { render(true) });
    } else {
      render(true);
    }
    return {
      get compositeFieldSchema() {
        return {
          type: 'hypeType',
          baseType: 'text',
          placeholders: {},
          value: htmlElement.innerHTML || 'Enter your text',
          mimeType: "text/multiline",
          basseType: "text"
        };
      },
      get htmlElement() {
        return htmlElement;
      },
      async dispose() {
        //  // clear intervalse
        clearTimeouts();
        // Unsubscribe from event handlers
        removeRelatedLottie(compositeFieldId);
        window.widget.events.off('startSequencePlaybackRequested', handle_startSequencePlaybackRequested);
        window.widget.events.off('cancelSequencePlaybackRequested', handle_cancelSequencePlaybackRequested);
        window.widget.events.off("configDataChanged", handle_configDataChanged);
        window.widget.events.off("previewModeChanged", handle_previewModeChanged);

      },
    };
  }
});
// helper functions
function loadJSONFile(filename) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.overrideMimeType("application/json");
    xhr.open("GET", filename, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        resolve(xhr.responseText);
      }
    };
    xhr.onerror = function () {
      reject(xhr.statusText);
    };
    xhr.send();
  });
}
//get config state from config data
function getConfigState(configData, referenceId) {
  for (let i in configData.configStates) {
    if (configData.configStates[i].referenceId == referenceId) {
      return configData.configStates[i];
    }
  }
}
// load fonts that are used in other states
async function preloadPriority() {
  let fontList = findFontFamily(window.widget.configData);
  for (let i in fontList) {
    if (lettersCache && lettersCache[fontList[i]]) continue;// if already loaded
    if (!kernmap[fontList[i]]) continue;
    let fontObj = { "font": kernmap[fontList[i]].font, "kern": kernmap[fontList[i]].kern, initialized: false }
    preloadFont(fontObj, handle_PriorityFontLoaded);
  }
}
// check if all fonts loaded, emit condfigdata change
function handle_PriorityFontLoaded() {
  let fontList = findFontFamily(window.widget.configData);
  for (let i in fontList) {
    if (!kernmap[fontList[i]]) continue;
    if (lettersCache[fontList[i]] && !lettersCache[fontList[i]].loaded) return;
  }

  window.widget.api.emitConfigDataChanged(window.widget.configData);
}
// get the fonts used in the configData
function findFontFamily(obj, result = []) {
  for (let key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      findFontFamily(obj[key], result);
    } else if (key === 'fontFamily') {
      result.push(obj[key]);
    }
  }
  return result;
}


// preload a font and put it in the cache
async function preloadFont(fontObj, returnFnc) {
  let font = fontObj.font;
  let kern = fontObj.kern;
  if (lettersCache[font] != undefined && lettersCache[font].loaded) {
    return;
  }
  lettersCache[font] = {};
  lettersCache[font].loaded = false;
  const filename = "fonts/" + font + '.json' // the path to the animation json
  await loadJSONFile(filename).then(
    function (jsonString) {
      // sort kerning
      const jsonObject = JSON.parse(jsonString);
      for (var i = 0; i < kern.length; i++) {
        for (let x = 0; x < kern[i].letters.length; x++) {
          let curLetter = kern[i].letters.substring(x, x + 1).toLowerCase();
          let jsonLetterObject = jsonObject[curLetter];
          lettersCache[font][curLetter] = jsonLetterObject;

        }
      }
      lettersCache[font].loaded = true;
      if (returnFnc) {
        returnFnc();
      }
    }
  )

}

function splitString(inputString) {
  // Replace <br> with a unique placeholder
  inputString = inputString.replace(/<\/?(?!br)[^>]+(>|$)/gi, '');
  const stringWithPlaceholder = inputString.replace(/<br>/g, ' <br> ');

  // Split the string into an array based on spaces
  const splitArray = stringWithPlaceholder.split(' ');

  return splitArray;
}

// go through a lottie file and get an array of colors used

function getColorsFromLottie(lottieJSON) {

  if (!lottieJSON || !lottieJSON.layers) return [];
  let colors = new Set();

  function traverseLayers(layers) {
    layers.forEach(layer => {
      if (layer.ty === 'gr') {
        traverseLayers(layer.it);
      } else if (layer.ty === 'fl' || layer.ty === 'st') {
        var color = layer.c.k;
        var colorHex = rgbToHex(Math.round(color[0] * 255), Math.round(color[1] * 255), Math.round(color[2] * 255));
        colors.add(colorHex);
      }
      if (layer.shapes) {
        traverseLayers(layer.shapes);
      }
      if (layer.layers) {
        traverseLayers(layer.layers);
      }
    });
  }

  if (lottieJSON.layers) {
    traverseLayers(lottieJSON.layers);
  }

  return [...colors];
}

// go through a lottie file and replace and array of colors with an array of ne colors
function replaceColorsInLottie(lottieJSON, originalColors, newColors) {
  originalColors = originalColors.slice(0, 2);
  if (!lottieJSON || !lottieJSON.layers) return lottieJSON;
  function traverseLayers(layers) {
    layers.forEach(function (layer) {
      if (layer.ty === 'gr') {
        traverseLayers(layer.it);
      } else if (layer.ty === 'fl' || layer.ty === 'st') {
        var color = layer.c.k;
        var colorHex = rgbToHex(Math.round(color[0] * 255), Math.round(color[1] * 255), Math.round(color[2] * 255));
        var index = originalColors.indexOf(colorHex);
        if (index > -1) {
          var newColor = hexToRgb(newColors[index]);
          layer.c.k = [newColor.r / 255, newColor.g / 255, newColor.b / 255, 1];
        }
      }
      if (layer.shapes) {
        traverseLayers(layer.shapes);
      }
      if (layer.layers) {
        traverseLayers(layer.layers);
      }
    });
  }

  traverseLayers(lottieJSON.layers);
  return lottieJSON;
}

// Converting from rgb to Hex and vice versa
function rgbToHex(r, g, b) {
  function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}


