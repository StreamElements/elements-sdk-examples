const cache = {};
// Register a custom composite field
window.widget.compositeFields.registerCompositeFieldProvider({
  // first comes the meta data 
  getCompositeFieldMetadata: () => ({
    displayName: 'Animated Timer',
    description: 'Set the time and it will count down',
    defaultMimeType: 'text/multiline',
    defaultBaseType: 'text',
    type: 'animatedTimer',
  }),

  // now define the create flow (what happens when a user adds a custom field to the canvas)
  async createCompositeFieldInstance({ compositeFieldId, configState }) {
    if (!cache[compositeFieldId]) {
      cache[compositeFieldId] = document.createElement("div");
    }  
    const htmlElement = cache[compositeFieldId];
    const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field  
    let fontSize=null;
    let targetDate = new Date();
    let timeWrapper1 = null;
    let timeWrapper2 = null;
    let timeWrapper3 = null;

    // create html
    function renderStaticState() {
      fontSize=measureText("0",field.style.fontSize,field.style.fontFamily,field.style.fontWeight);
      timeWrapper1 = document.createElement("div");
      timeWrapper2 = document.createElement("div");
      timeWrapper3 = document.createElement("div");
      if (field.text[0]?.content) {
        targetDate = new Date(field.text[0]?.content);
      }
      let innerStructureHtml = '<div class="figure {part} {part}-1"><span class="top"> </span><span class="top-back"><span> </span></span><span class="bottom"> </span><span class="bottom-back"><span> </span></span></div><div class="figure {part} {part}-2"><span class="top"> </span><span class="top-back"><span> </span></span><span class="bottom"> </span><span class="bottom-back"><span> </span></span></div>'
      htmlElement.innerHTML = "";
      htmlElement.classList.add("wrap");
      let countdown = document.createElement("div");
      Object.assign(countdown.style,field.style);
      countdown.classList.add("countdown");  

      // build hours
      timeWrapper1.classList.add("bloc-time");
      timeWrapper1.classList.add("hours");
      timeWrapper1.setAttribute("data-init-value", "24");
      timeWrapper1.innerHTML = innerStructureHtml.replaceAll('{part}', 'hours');
      countdown.appendChild(timeWrapper1);

      // build minutes
      timeWrapper2.classList.add("bloc-time");
      timeWrapper2.classList.add("min");
      timeWrapper2.setAttribute("data-init-value", "0");
      timeWrapper2.innerHTML = innerStructureHtml.replaceAll('{part}', 'min');;
      countdown.appendChild(timeWrapper2);

      // build seconds
      timeWrapper3.classList.add("bloc-time");
      timeWrapper3.classList.add("sec");
      timeWrapper3.setAttribute("data-init-value", "0");
      timeWrapper3.innerHTML = innerStructureHtml.replaceAll('{part}', 'sec');;
      countdown.appendChild(timeWrapper3);

      // set background color
      let figures=Array.from(countdown.querySelectorAll('.figure'));
      for (var i in figures){
        figures[i].style.backgroundColor=field.highlightedStyle.color;
        figures[i].style.width=(1.4*fontSize.width) +"px";
        figures[i].style.height=(1.2*fontSize.height) +"px";
        figures[i].style.lineHeight=(1.2*fontSize.height) +"px";
      }
      let tops=Array.from(countdown.querySelectorAll('.top'));
      for (var i in tops){
        tops[i].style.backgroundColor=field.highlightedStyle.color;
      }
      let topsBacks=Array.from(countdown.querySelectorAll('.top-back'));
      for (var i in tops){
        topsBacks[i].style.backgroundColor=field.highlightedStyle.color;
      }
      let bottomBacks=Array.from(countdown.querySelectorAll('.bottom-back'));
      for (var i in bottomBacks){
        bottomBacks[i].style.backgroundColor=field.highlightedStyle.color;
      }
      htmlElement.appendChild(countdown);
    }
    let countdown_interval=null;

    // initiate the timer
    function startTimer(targetDate){    
      countdown_interval = setInterval(function () {
        let timerObject=getTimeLeft(targetDate);
        if (timerObject.total_seconds > 0) {
          animateFigure(timeWrapper1.childNodes[0],timerObject.hourstens);
          animateFigure(timeWrapper1.childNodes[1],timerObject.hoursones);
          animateFigure(timeWrapper2.childNodes[0],timerObject.minutestens);
          animateFigure(timeWrapper2.childNodes[1],timerObject.minutesones);
          animateFigure(timeWrapper3.childNodes[0],timerObject.secondstens);
          animateFigure(timeWrapper3.childNodes[1],timerObject.secondsones);
        }
        else {
          clearInterval(countdown_interval);
        }
      }, 1000);
    }

    // load the fonts
    WebFont.load({
      custom: {
        families: [field.style.fontFamily],
        urls:['https://fonts.googleapis.com/css2?family='+ field.style.fontFamily+'&display=swap']
      },
      active: function() {           
      },
      inactive: function() {
      }
    });
    document.fonts.ready.then(function () {
      document.fonts.onloadingdone=function(){
        renderStaticState();   
        startTimer(targetDate); 
      }
    });
    // handle the timer after things has changed in the field
    let handle_configStateChanged=function (configState){
      field = configState.settings.compositeFields[compositeFieldId];
      renderStaticState();   
      startTimer(targetDate); 
    }
    window.widget.events.on("configStateChanged",handle_configStateChanged)
    return {
      get compositeFieldSchema() {
        const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field
        return {
          type: 'animatedTimer',
          baseType: 'text',
          value: field.text?.[0]?.content || 'Enter your text', // existing or default value for editor
          mimeType: 'text/multiline',
        };
      },
      get htmlElement() {
        return htmlElement;
      },
      async dispose() {
        // Unsubscribe from event handlers
        clearInterval(countdown_interval);
      },
    };
  },
});

// animate figure
function animateFigure (el, value) {

  let top = el.querySelector('.top');
  let bottom = el.querySelector('.bottom');
  let back_top = el.querySelector('.top-back');
  let back_bottom = el.querySelector('.bottom-back');  
  if (value.toString()!=top.innerHTML){
    // Before we begin, change the back value
    back_top.querySelector('span').innerHTML=value;

    // Also change the back bottom value
    back_bottom.querySelector('span').innerHTML=value;

    // Then animate
    const keyframesTop = [
      { transform: "rotateX(0) perspective(0)" },
      { transform: "rotateX(-180deg) perspective(300px)" }
    ];
    
    const options = {
      duration: 800,
      iterations: 1,
    };
    let anitop=top.animate(keyframesTop,options);
    anitop.onfinish = (event) => {
      top.innerHTML=value;
      bottom.innerHTML=value;
      top.animate([{ transform: "rotateX(0) perspective(0)" }],{duration:0,iterations:1});
    };

    const keyframesBottom = [
      { transform: "rotateX(0) perspective(300px)" }
    ];
    
    let anibottom=back_top.animate(keyframesBottom,options);
    anibottom.onfinish = (event) => {
      ;
    };
  }
  
}

// measuring the text size
function measureText(text, fontSize, fontFamily,fontWeight) {
    var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');
  context.font = fontSize+ ' ' + fontFamily;
  var metrics = context.measureText(text);

  const span = document.createElement('span');
  span.style.display = "inline";
  span.style.position = "absolute";
  span.innerHTML = text;
  span.style.fontFamily = fontFamily;
  span.style.fontSize = fontSize;
  span.style.fontWeight = fontWeight;
  span.style.lineHeight = fontSize;
  document.body.appendChild(span)
  let measuredWidth = span.offsetWidth;
  let measureHeight = span.offsetHeight;
  document.body.removeChild(span);
  return {width:metrics.width,height:measureHeight};
}

// getting the time left broken to units
function getTimeLeft(targetDate) {
  let now = new Date().getTime();
  let diff = targetDate.getTime() - now; // difference in milliseconds
  // if the date is in the past, return zeros
  if (diff <= 0) {
    return {
      hourstens: 0,
      hoursones: 0,
      minutestens: 0,
      minutesones: 0,
      secondstens: 0,
      secondsones: 0,
      total_seconds: 0
    };
  }

  // convert the difference to hours, minutes, and seconds
  let hours = Math.floor(diff % (99*1000 * 60 * 60) / (1000 * 60 * 60));
  let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  let seconds = Math.floor((diff % (1000 * 60)) / 1000);

  // split into tens and ones
  return {
    hourstens: Math.floor(hours / 10),
    hoursones: hours % 10,
    minutestens: Math.floor(minutes / 10),
    minutesones: minutes % 10,
    secondstens: Math.floor(seconds / 10),
    secondsones: seconds % 10,
    total_seconds: diff/1000
  };
}

