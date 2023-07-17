/* ****  In the following code lines, we will be defining a new composite field
for a running ticker based on recent session data items. *** */

// setup a cache for consistency
const cache = {};

// register the composite field
widget.compositeFields.registerCompositeFieldProvider({
  // first comes the meta data 
  getCompositeFieldMetadata: () => ({
    displayName: "Latest Ticker",
    description: "Show your latest contributors in an endless loop of recognition",
    previewImageUrl: import.meta.resolve("./images/follow.svg"),
    defaultMimeType: "text/multiline",
    defaultBaseType: "text",
    type: "latestTicker",
  }),

  // now define the create flow (what happens when a user/widget adds a custom field to the canvas)
  async createCompositeFieldInstance({ compositeFieldId, configState }) {
    // cache the html to survive disposes if they happen for any reason (we want to keep the continutity of animation at all cost)
    if (!cache[compositeFieldId + configState.referenceId]) {
      cache[compositeFieldId + configState.referenceId] = document.createElement("div");
    }
    const htmlElement = cache[compositeFieldId + configState.referenceId];
    let animations = []; // array of animations
    const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field

    // set the ticker width and the init the total width
    let tickerWidth = document.body.clientWidth;
    if (field.style.width && field.style.width != "auto") {
      tickerWidth = getItemWidth(field);
    }
    let totalWidth = 0;
    let calculatedDelay = 0;
    let speed = 0;
    let way = 0
    const matches = field.text[0].content.split(/({.*?})/).filter(Boolean);
    // get format and placeholders
    const formatArray = matches.map(match => {
      if (match.startsWith("{")) {
        return { type: "dynamic", content: match, visible: false, text: "", new: false };
      } else {
        return { type: "static", content: match, visible: false, text: match.replaceAll(" ", "&nbsp;"), new: false };
      }
    });

    // get listeners
    const dynamicParts = formatArray
      .filter(item => item.type === "dynamic") // filter out only dynamic parts
      .map(item => {
        const match = item.content.match(/(?:[^\.]*\.){2}([^\.]*)/);
        return match ? match[1] : null;
      }).filter(Boolean); // this will remove null items if any

    const listeners = [...new Set(dynamicParts)];
    // get dynamic items
    const dynamicItems = formatArray
      .filter(item => item.type === "dynamic") // filter out only dynamic parts
      .map(item => item.content); // extract the content

    const uniqueDynamicItems = [...new Set(dynamicItems)]; // create a unique list

    // Render initial state
    function render() {
      htmlElement.innerHTML = "";
      // set styles
      let coloredStyle = JSON.parse(JSON.stringify(field.style));
      coloredStyle.color = field.highlightedStyle.color;

      // create wrapper with styles
      let tickerWrapper = document.createElement("div");
      tickerWrapper.style.width = tickerWidth + "px";
      tickerWrapper.classList.add("ticker-wrap");
      tickerWrapper.style.height = field.style.fontSize;
      if (field.style.lineHeight) {
        tickerWrapper.style.height = field.style.lineHeight * Number(field.style.fontSize.replace("px", "")) + "px";
      }
      Object.assign(tickerWrapper.style, field.style);
      // create 2 tickers, one after the other
      // check how many items are in the recent array and create ticker items for each
      for (let d in uniqueDynamicItems) {
        let curdItem = findMatchingDynamicItem(uniqueDynamicItems[d], formatArray);
        curdItem.text = window.widget.api.interpolateTextContentComponents({ textContent: uniqueDynamicItems[d] })[0].text
      }
      setFilledItemsVisible(formatArray);
      // set visibilty to items until you hit an empty dynamic item
      let ticker1 = createTickerContainer(tickerWidth);
      ticker1.id = "ticker1";
      let ticker2 = createTickerContainer(tickerWidth);
      ticker2.id = "ticker2";
      tickerWrapper.appendChild(ticker1);
      tickerWrapper.appendChild(ticker2);
      htmlElement.appendChild(tickerWrapper);
      htmlElement.style.overflow = "hidden";
      htmlElement.style.position = "relative";

      // animation handling:
      // first calculate the speed based on the animation duration
      let userTimeOnScreen = 4000;
      if (field.animation && field.animation.static && field.animation.static.animationDuration) {
        userTimeOnScreen = field.animation.static.animationDuration.replace("s", "") * 1000;
      }
      let duration = userTimeOnScreen;
      speed = tickerWidth / duration
      way = Math.max(tickerWidth * 2, totalWidth);
      animateTicker(ticker1, speed);
      setTimeout(function () {
        animateTicker(ticker2, speed);
      }, way / speed / 2);
      // pause ticker when its not visible
      document.addEventListener('visibilitychange', handle_visibilityChange);
    }

    // visiblity change handler
    function handle_visibilityChange() {
      if (document.visibilityState === 'hidden') {
        for (let ani of animations) {
          ani.pause();
        }
      } else {
        for (let ani of animations) {
          ani.play();
        }
      }
    }

    // create a ticker container
    function createTickerContainer(minWidth) {
      // create a ticker object where all items will be
      let ticker = document.createElement("div");
      ticker.classList.add("ticker");
      ticker.style.position = "absolute";
      ticker.style.minWidth = minWidth + "px";
      ticker.style.left = minWidth + "px";
      setTickerContent(ticker);
      return ticker;
    }

    // setting the content of a ticker based on visibile items in formatArray
    function setTickerContent(ticker) {
      let tickerContent = "";
      for (let item of formatArray) {
        if (item.visible) {
          if (item.new) {
            let newItem = document.createElement("span");
            Object.assign(newItem.style, field.highlightedStyle);
            newItem.innerHTML = item.text;
            tickerContent += newItem.outerHTML;
            newItem = null;
            item.new = false;
          } else {
            tickerContent += `<span>${item.text}</span>`;
          }
        }
      }
      ticker.innerHTML = tickerContent
    }

    // animate a ticker
    function animateTicker(ticker, speed) {
      let options = {
        duration: way / speed,
        iterations: 1
      };
      let keyframes = [
        { transform: 'translateX(0px)', offset: 0 },
        { transform: 'translateX(-' + way + 'px)', offset: 1 }
      ];
      let ani = ticker.animate(keyframes, options);
      animations.push(ani);
      ani.onfinish = function () {
        let curWay = way;
        let newDelay = calculatedDelay;
        animations = animations.filter(animation => animation !== ani);
        synchTicker(ticker);
        if (curWay < way) {
          calculatedDelay = (way - curWay) / speed / 2;
        } else {
          calculatedDelay = 0
        }
        timers.push(setTimeout(function () {
          animateTicker(ticker, speed);
          timers.pop();
        }, newDelay));

      }

    }
    // update the content in a ticker and caculate the new way
    function synchTicker(ticker) {
      // get current width
      let curWidth = ticker.clientWidth;
      // sych content
      setTickerContent(ticker);
      // set delay for the next ticker coming
      if (ticker.clientWidth > tickerWidth) {
        way = ticker.clientWidth * 2;
      } else {
        way = tickerWidth * 2;
      }
    }

    // set items that should be visible - well visible
    function setFilledItemsVisible(formatArray) {
      let itemsArray = [];
      for (let item of formatArray) {
        if (item.type === "static" || item.text !== "") {
          if (!item.visible) {
            itemsArray.push(item);
          }
          item.visible = true;

        } else if (item.type === "dynamic" && item.text === "") {
          break;
        }
      }
      return itemsArray;
    }

    // a helper to get the item width from it's style
    function getItemWidth(item) {
      return Number(item.style.width.replace("px", ""));
    }
    // find an emptyDynamicItem if non available return the indexed item
    let indices = {};

    function findMatchingDynamicItem(value, formatArray) {
      // Find matching dynamic items
      const matchingDynamicIndices = formatArray
        .map((item, index) => item.type === "dynamic" && item.content.includes(value) ? index : -1)
        .filter(index => index !== -1);

      if (matchingDynamicIndices.length) {
        // Initialize index for this value if not done yet
        if (indices[value] === undefined) indices[value] = 0;

        // If there are matching dynamic items, return the item at currentIndex in the matchingDynamicIndices array
        const item = formatArray[matchingDynamicIndices[indices[value] % matchingDynamicIndices.length]];
        indices[value] = indices[value] + 1; // Increase index for this value

        return item;
      }

      return null; // Return null if there are no matching dynamic items
    }

    // handle a new item coming (just add them in the line)
    async function handle_sessionDataItemUpdated({ connectedPlatform, key, value }) {

      for (let listener of listeners) {
        if (key == listener) {
          let relevantDynamicItems = uniqueDynamicItems.map(match => {
            if (match.includes(key)) {
              return match;
            }
          });
          for (let dataKey of relevantDynamicItems) {
            let item = findMatchingDynamicItem(dataKey, formatArray);
            item.text = value[dataKey.match(/(?<=\{).*?(?=\})/)[0].split('.').pop()];
          }
        }
      }
      let newItems = setFilledItemsVisible(formatArray); // get all new items
      for (let item of newItems) {
        item.new = true; // setting items to show in the "new color"
      }
    }
    window.widget.events.on('sessionDataItemUpdated', handle_sessionDataItemUpdated);

    // preload the fonts before you start measuring (will probably be handled by the widget and become redundant)
    if (document.fonts.check(field.style.fontSize + " " + field.style.fontFamily)) {
      render();
    } else {
      WebFont.load({
        custom: {
          families: [field.style.fontFamily],
          urls: ['https://fonts.googleapis.com/css2?family=' + field.style.fontFamily + '&display=swap']
        },
        active: function () {
        },
        inactive: function () {
        }
      });

      // render the element after fonts are loaded so we can calculate the required size
      document.fonts.ready.then(function () {
        document.fonts.onloadingdone = function () {
          render();
        }
      });
    }
    // return the composite field schema
    return {
      get compositeFieldSchema() {
        return {
          type: "latestTicker",
          baseType: 'text',
          placeholders: {},
          value: htmlElement.innerHTML || "",
          mimeType: "text/multiline"
        };
      },
      get htmlElement() {
        return htmlElement;
      },
      async dispose() {
        // remove all animations
        while (animations.length > 0) { (animations.pop()).cancel() }
        // Unsubscribe from event handlesrs
        window.widget.events.off('sessionDataItemUpdated', handle_sessionDataItemUpdated);
        document.removeEventListener('visibilitychange', handle_visibilityChange);
      },
    };
  },
});

