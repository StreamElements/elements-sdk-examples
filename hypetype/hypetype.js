let lettersCache = {};
let kernmap={};
preloadAll();
async function preloadAll() {
  let kernmapstring = await loadJSONFile("./kernmap.json");
  kernmap=JSON.parse(kernmapstring);
  for (i in kernmap){
    let fontObj=kernmap[i];
    let font=fontObj.font;
    let kern = fontObj.kern;
    if (lettersCache[font] != undefined) {
      continue;
    }
    lettersCache[font] = { "loaded": false };
    for (var i = 0; i < kern.length; i++) {
      for (let x = 0; x < kern[i].letters.length; x++) {
        let curLetter = kern[i].letters.substring(x, x + 1).toLowerCase();
        const filename = "fonts/" + font + '/' + curLetter + '.json' // the path to the animation json
        const jsonString = await loadJSONFile(filename);
        const jsonObject = JSON.parse(jsonString);
        lettersCache[font][curLetter] = jsonObject;
      }
    }
    lettersCache[font].loaded = true;
  }
};
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
    const htmlElement = document.createElement('div'); //  Create the base HTML element

    // parse the config.json
    const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field
    let size = field.style.fontSize.replace("px", "");
    let fontObj = kernmap[field.style.fontFamily.replaceAll('"', '')];
    if (fontObj == undefined) {
      fontObj = kernmap.Roboto;
    }
    let font = fontObj.font;
    let kern = fontObj.kern;
    let vsize = fontObj.vsize;

    // preloading the animation and putting them into a global cache (lettersCache).
    async function preload() {

      if (lettersCache[font] != undefined) {
        return;
      }
      lettersCache[font] = { "loaded": false };
      for (var i = 0; i < kern.length; i++) {
        for (let x = 0; x < kern[i].letters.length; x++) {
          let curLetter = kern[i].letters.substring(x, x + 1).toLowerCase();
          const filename = "fonts/" + font + '/' + curLetter + '.json' // the path to the animation json
          const jsonString = await loadJSONFile(filename);
          const jsonObject = JSON.parse(jsonString);
          lettersCache[font][curLetter] = jsonObject;
        }
      }
      lettersCache[font].loaded = true;
      // after a preload - make sure the composite field renders again
      window.widget.api.emitConfigDataChanged(window.widget.configData);
    };

    // this takes the content and converts each letter to a lottie animation. It is used for preview (isPlay=true), or for runtime (isPlay=false)
    function render(isPlay) {
      if (!lettersCache[font].loaded) return;
      lottie.destroy();
      //let content=widget.api.interpolateTextContentComponents({ textContent:  field.text?.[0]?.content})[0].text
      window.widget.compositeFields.applyHtmlElementTextContent({ // apply style to field
        htmlElement,
        textContent: field.text?.[0]?.content,
        style: field.style,
        highlightStyle: field.highlightedStyle,
      });
      let content = htmlElement.innerHTML; // get the interpulated text and manipulate it for the lottie animations
      htmlElement.innerHTML = "";
      let contentArr = splitString(content);//content.split(" "); // devide the content into words
      for (let x = 0; x < contentArr.length; x++) {
        if (contentArr[x] == "<br>") {
          let e = document.createElement("br");
          htmlElement.appendChild(e);
          continue;
        }
        let word = document.createElement("span");
        word.style.display = "inline-block";
        let wordContent=contentArr[x].replace(/<\/?[^>]+(>|$)/g, ''); // remove html tags created for formatting.
        for (let i = 0; i < wordContent.length; i++) {
          let curLetter = wordContent.substring(i, i + 1).toLowerCase();
          
            let e = document.createElement("span");
            // e.id = "l" + i + "_" + x + "_" + curLetter;
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
                let aniDuration = ani.getDuration(true);
                ani.goToAndStop(aniDuration - 1, true);
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

    function getKern(kernObj, letter) {
      for (var k of kernObj) {
        if (k.letters.indexOf(letter.toUpperCase()) != -1) {
          return k.kern;
        }
      }
      return 20;
    }


    function handle_startSequencePlaybackRequested() {
      // this will block the queue while alert is being played, until done or canceled
      return window.widget.queue.awaitTask(() => new Promise(resolve => {
        let animationTimeoutHandle = null;
        function doneSequencePlayback() {
          if (animationTimeoutHandle) {
            clearTimeout(animationTimeoutHandle);
            animationTimeoutHandle = null;
          }
          window.widget.events.off('cancelSequencePlaybackRequested', doneSequencePlayback); // making sure we resolve this without an extra cancel request
          // Back to initial rendering state                 
          resolve();
        }

        // Define what happens when the editor, widget container (or your code) sends a stop playback request
        window.widget.events.on('cancelSequencePlaybackRequested', doneSequencePlayback);

        // Our "animation" minimum is 1000 milliseconds but if there is an animation definition in the configState, it will take it
        let animationDuration = 2000; // default duration if not set
        const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field
        let animationDelay=0;
        let enterAnimationDuration=0;
        let exitAnimationDuration=0;
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
        let speed = animationDuration / content.length / 3;
        htmlElement.innerHTML = "";
        render(false);
        let contentArr = content.split(" ");

        let interval = setInterval(function () {
          setTimeout(function(){
            lottie.play(compositeFieldId + curWordIndx + "_" + curLetterIndx);
            if (curLetterIndx == contentArr[curWordIndx].length) {
              if (curWordIndx == contentArr.length - 1) {
                clearInterval(interval);
              } else {
                curWordIndx++;
                curLetterIndx = 0;
              }
            } else {
              curLetterIndx++
            }
          },animationDelay);

        }, speed)

        animationTimeoutHandle = setTimeout(doneSequencePlayback, animationDuration+animationDelay+enterAnimationDuration+exitAnimationDuration);
      }));
    }

    function handle_cancelSequencePlaybackRequested() {
      render(true);
    }
    // Define what happens when the editor, widget container (or your code) sends an emulation request 
    window.widget.events.on('startSequencePlaybackRequested', handle_startSequencePlaybackRequested);
    window.widget.events.on('cancelSequencePlaybackRequested', handle_cancelSequencePlaybackRequested);

    // Render initial state (after preloading)
     preload();
     render(true);

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
        
        // Unsubscribe from event handlers
        lottie.destroy();
        window.widget.events.off('startSequencePlaybackRequested', handle_startSequencePlaybackRequested);
        window.widget.events.off('cancelSequencePlaybackRequested', handle_cancelSequencePlaybackRequested);
      },
    };

  },
});

// helper
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

function splitString(inputString) {
  // Replace <br> with a unique placeholder
  inputString=inputString.replace(/<\/?(?!br)[^>]+(>|$)/gi, '');
  const stringWithPlaceholder = inputString.replace(/<br>/g, ' <br> ');
  
  // Split the string into an array based on spaces
  const splitArray = stringWithPlaceholder.split(' ');

  return splitArray;
}

function isNodeInDocument(node) {
  // Check if the node is an instance of Node and if it's connected to the document
  return node instanceof Node && node.isConnected;
}

