/* ****  In the following code lines, we will be defining a new composite field for a custom composite text field with css animated letters *** */

// this is a base function that is reused to creat a few animation alternatives.

// animations are taken from https://tobiasahlin.com/moving-letters/ under MIT license

// anime.js is referenced here https://animejs.com/ also under MIT license

//set up a cache for htmls created
const cache = {};
function createHypeType(aniName, aniFnc, speed,icon) {
    window.widget.compositeFields.registerCompositeFieldProvider({
        // register details that will be exposed to "add component" in the editor
        getCompositeFieldMetadata: () => ({
            type: 'hypeTypeCss'+ slugify(aniName),
            displayName: 'Hype Type - ' + aniName,
            description: 'Animate letters with css animation',
            previewImageUrl: icon,
            defaultMimeType: "text/multiline",
            defaultBaseType: "text"
        }),
        // override the base text field rendering
        async createCompositeFieldInstance({ compositeFieldId, configState }) {
            // Define the HTML strucutre for your custom composite text field
            const DEFAULT_TEXT_CONTENT_VALUE = 'Enter text to animate';
            
            // cache the html element so it keeps continuity during the element's life cycle
            if (!cache[compositeFieldId+configState.referenceId]) {
              cache[compositeFieldId+configState.referenceId] = document.createElement("div");
            }  
            const htmlElement = cache[compositeFieldId+configState.referenceId];

            // parse the config.json
            const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field
            const textContentOrDefaultValue = field.text?.[0]?.content || DEFAULT_TEXT_CONTENT_VALUE; // set default value - this will be returned as value for the editor
            const aniSpeed=speed;

            // prepare the html for rendering
            function prepareHtml() {     
                console.log("prepare");         
                htmlElement.innerHTML="";
                // set style to the main element
                Object.assign(htmlElement.style, field.style);
                 // interpulate the binded data and split the text into single letter spans
                             
                widget.api.interpolateTextContentComponents({ textContent: textContentOrDefaultValue }).forEach((component) => {
                    for (let i = 0; i < component.text.length; i++) {
                        let curLetter=component.text.substring(i, i + 1);
                        let span=null;                            
                        switch(curLetter){
                            default:    
                            span = document.createElement('span');                         
                            span.appendChild(document.createTextNode(curLetter));
                            if (component.isHighlighted) {
                                Object.assign(span.style, field.highlightedStyle);
                            } else {
                                Object.assign(span.style, field.style);
                            }
                            span.classList.add("letter");
                            
                            break;
                        case "\n":
                            span = document.createElement('br');    
                            htmlElement.appendChild(document.createElement("br"));
                            break
                        case " ":
                            span = document.createElement('span');
                            span.innerHTML=" ";
                            break;
                        }
                        span.style.width=""; // can't have it or it will not render properly
                        htmlElement.appendChild(span);
                        
                        
                    }
                    
                }
                );
                
            }
            // handle the play behavior
            async function handle_startSequencePlaybackRequested() {          
              prepareHtml();     
              return window.widget.queue.awaitTask(() => new Promise(resolve => {
                  prepareHtml();

                  const letters = Array.from(htmlElement.querySelectorAll('.letter'));
                  const letterCount = letters.length;

                  let animationDuration=1000+2*letterCount*aniSpeed;
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
                  // call the animation and resolve the await when it ends or when browser stops.
                  aniFnc(letters, handle_animationEnd, Math.min(enterAnimationDuration+exitAnimationDuration+animationDuration-2*letterCount*aniSpeed),animationDelay);               
                  window.widget.events.on('cancelSequencePlaybackRequested', handle_animationEnd);
                  // resolve & cleanup function
                  async function handle_animationEnd() {
                        window.widget.events.off('cancelSequencePlaybackRequested', handle_animationEnd);
                        const letters = Array.from(htmlElement.querySelectorAll('.letter'));
                        anime.remove(letters)
                        resolve();
                    }
                }));
                // Define what happens when the editor, widget container (or your code) sends a stop playback request
             
            }

            // when animation stops, prepare the canvas for editing
            

            // when animation ends in the editor - prepare the canvas for editing
            async function handle_previewModeChanged(previewMode){
                switch(previewMode){
                    case "static": 
                    case "none": 
                        prepareHtml();
                        break;
                }
            }
             // Define what happens when we are in edit mode (production, static and demo) 
            window.widget.events.on('previewModeChanged',handle_previewModeChanged );

            // Define what happens when the editor, widget container (or your code) sends an emulation request  
            window.widget.events.on('startSequencePlaybackRequested', handle_startSequencePlaybackRequested);



            // Define the editor's setting UI for this composite field
            prepareHtml();
            return {
                get compositeFieldSchema() {
                    return {
                        type: 'hypeTypeCss' + slugify(aniName),
                        baseType: 'text',
                        placeholders: {},
                        mimeType: "text/multiline",
                        basseType: "text",
                        text: [
                            { 
                                content: textContentOrDefaultValue
                            }
                          ]
                    };
                },
                get htmlElement() {
                    return htmlElement;
                },
                async dispose() {
                    // Unsubscribe from event handlers
                    console.log("dispose");
                    window.widget.events.off('previewModeChanged',handle_previewModeChanged );
                    window.widget.events.off('startSequencePlaybackRequested', handle_startSequencePlaybackRequested);
                   
                },
            };

        }
    })
}

// helper function
const slugify = str =>
    str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');

let icon="";
if (import.meta.resolve){
    icon=import.meta.resolve("./images/text_rotation_angleup_white_24dp.svg");
}
// create different animations from the same code.
createHypeType("Thursday",thursday,50);
createHypeType("Sunny Morning",sunnyMorning,50);
createHypeType("Beautiful Questions",beautifulQuestions,40);
createHypeType("Reality Is Broken",realityIsBroken,40);
createHypeType("Raising Strong",raisingStrong,30);
