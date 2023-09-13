let managedData={
    "spin": false,
    "premissions": [
        "moderators"
    ],
    "options": [
        {
            "label": "a sample long long label cab be found here 1"
        },
        {
            "label": "a sample label here 2"
        },
        {
            "label": "a sample label here 3"
        },
        {
            "label": "a sample label here 4"
        },
        {
            "label": "a sample label here 5"
        },
        {
            "label": "a sample label here 6"
        },
        {
            "label": "a sample label here 7"
        },
        {
            "label": "a sample label here 8"
        },
        {
            "label": "a sample label here 9"
        }
    ],
    "spinCommand": "!spinwheel",
    "spinPermissions": "Moderators"
}


const cache = {};

// get manageData

// set binded data for the results
window.widget.bindableData.registerBindableDataVariable({ key: "wheelWinner", displayName: "Wheel Winner", value: "", categoryName: "Wheel of Fortune" });
window.widget.bindableData.registerBindableDataVariable({ key: "wheelWinnerNumber", displayName: "Wheel Winning Number", value: null, categoryName: "Wheel of Fortune" });
window.widget.bindableData.registerBindableDataVariable({ key: "wheelOptionList", displayName: "Wheel Option List", value: "", categoryName: "Wheel of Fortune" });
window.widget.persistentStorage.registerPersistentDataVariable({
	key: "wheelIsSpinning",
	defaultValue: false
});

widget.compositeFields.registerCompositeFieldProvider({
    // first comes the meta data 
    getCompositeFieldMetadata: () => ({
        displayName: "Wheel of Fortune",
        description: "Spin the wheel of live stream",
        defaultMimeType: "text/multiline",
        defaultBaseType: "text",
        type: "wheel",
    }),

    // now define the create flow (what happens when a user/widget adds a custom field to the canvas)
    async createCompositeFieldInstance({ compositeFieldId, configState }) {
        // cache the html to survive disposes if they happen for any reason (we want to keep the continutity of animation at all cost)
        if (!cache[compositeFieldId + configState.referenceId]) {
            cache[compositeFieldId + configState.referenceId] = document.createElement("div");
        }
        const DEFAULT_TEXT_CONTENT_VALUE = "#FF4545,#FFFDCC,#F2BD6E";
        const htmlElement = cache[compositeFieldId + configState.referenceId];
        const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field
        const textContentOrDefaultValue = field.text?.[0]?.content || DEFAULT_TEXT_CONTENT_VALUE;

        // init data
        // init dom elements
        htmlElement.innerHTML = "";
        let wheel = document.createElement("div");
        wheel.id = "wheelOfFortune";
        let wheelCanvas = document.createElement("canvas");
        wheelCanvas.id = "wheel";
        wheelCanvas.width = "370";
        wheelCanvas.height = "370";
        if (field.style.width) {
            wheelCanvas.width = field.style.width.replace("px", "");
            wheelCanvas.height = field.style.width.replace("px", "");
        }
        let spinEl = document.createElement("div");
        spinEl.id = "spin";
        wheel.appendChild(wheelCanvas);
        wheel.appendChild(spinEl);
        htmlElement.appendChild(wheel);
        let colors = ['#FF4545', '#FFFDCC', '#F2BD6E'];
        if (validateColors(field.text?.[0]?.content)){
            colors=field.text?.[0]?.content.split(",");
        }
        let sectors = [];

        const PI = Math.PI;
        const TAU = 2 * PI;
        const rand = (m, M) => Math.random() * (M - m) + m;
        const ctx = wheelCanvas.getContext('2d');
        const dia = ctx.canvas.width;

        let arc = null;
        let tot = null;
        let rad = null;
        let getIndex = () => Math.floor(tot - (ang / TAU) * tot) % tot;
        // animation params

        let ang = 0;
        let angVel = 0;
        let spinPhase = 1;


        // Parameters for Phase 1

        let phase1Duration = 300; // Duration of counter-clockwise movement in milliseconds
        let phase1StartTime = 0; // Time when Phase 1 starts

        // Parameters for Phase 2
        let phase2Acceleration = 0.01; // Acceleration during Phase 2
        let maxAngVel = 0.2; // Maximum angular velocity that can be reached during Phase 2
        let phase2Duration = 2000; // Duration of Phase 2 in milliseconds
        let phase2StartTime = 0; // Time when Phase 2 starts

        // Parameters for Phase 3
        let friction = 0.995; // Fraction by which speed reduces each frame during Phase 3

        // Animation ID for cancelling animation
        let phase2AccelerationDuration=null;
        function drawSector(sector, i) {
            const ang = arc * i;
            ctx.save();
            // COLOR
            ctx.beginPath();
            ctx.fillStyle = sector.color;
            ctx.moveTo(rad, rad);
            ctx.arc(rad, rad, rad, ang, ang + arc);
            ctx.lineTo(rad, rad);
            ctx.fill();

            // TEXT
            ctx.translate(rad, rad);
            ctx.rotate(ang + arc / 2 + Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillStyle = field.style.color;
            ctx.font = (field.style.fontWeight ? field.style.fontWeight : 'normal') + " " + field.style.fontSize + " " + field.style.fontFamily;

            ctx.fillText(i+1, 0, -rad*.80);
            //
            ctx.restore();
        }

        function rotate() {
            const sector = sectors[getIndex()];
            ctx.canvas.style.transform = `rotate(${ang - PI / 2}rad)`;
            spinEl.textContent = !angVel ? '' : sector.label;// the default can change here: TO-DO tie this to custom field value
            spinEl.style.background = sector.color;
        }

        let animationId; // This will hold the ID of the animation

        let isSpinning = false;
        let lastPlayedArcIndex = null;
        function frame() {
            const now = Date.now();
            if (!isSpinning) return;
            let currentArcIndex = getIndex();
            // If we have moved to a new arc, play the sound
            if(lastPlayedArcIndex !== currentArcIndex && spinPhase!=1) {
                playSound();
                lastPlayedArcIndex = currentArcIndex;
            }
            if(spinPhase === 1) {
                ang -= angVel; // Applying constant negative velocity
        
                if(now - phase1StartTime >= phase1Duration) {
                    spinPhase = 2; // Transition to Phase 2
                    phase2StartTime = now;
                    angVel = 0; // Reset angular velocity
                }
            } else if(spinPhase === 2) {
                if(angVel < maxAngVel && now - phase2StartTime <= phase2Duration) {
                    angVel += phase2Acceleration; // Accelerate until it reaches the maximum angular velocity or time limit
                } else {
                    spinPhase = 3; // Transition to Phase 3
                }
                ang += angVel;
            } else if(spinPhase === 3) {
                angVel *= friction; // Apply friction
                ang += angVel;
                if (angVel < 0.002) {
                    angVel = 0;
                    const sector = sectors[getIndex()];
                    window.widget.bindableData.setValue({ key: "wheelWinnerNumber", value: getIndex() });
                    window.widget.bindableData.setValue({ key: "wheelWinner", value: sector.label });
                    showWinner();
                    cancelAnimationFrame(animationId);
                    isSpinning = false; // Stop the wheel
                    stopSpin();
                    return;
                }
            }
            ang %= TAU;
            rotate();
        }
        
        function engine() {
            if (isSpinning){
                frame();
                animationId = requestAnimationFrame(engine);
            } else {
                return;
            }
        }
        
        
          // Loads the tick audio sound in to an audio object.
          let wheelsound = new Audio('./sound/tick.mp3');
          let startSound= new Audio('./sound/start.mp3');
          // This function is called when the sound is to be played.
          function playSound()
          {
              // Stop and rewind the sound if it already happens to be playing.
              let progress = (wheelsound.currentTime / wheelsound.duration);
              if (!wheelsound.paused&& progress<0.1)return;
              wheelsound.pause();
              wheelsound.currentTime = 0;

              // Play the sound.
              wheelsound.play();
          }

        function handle_chatEventRecieved({ chatMessage }){
            console.log(chatMessage)
            const [command] = chatMessage.textMessageDetails.message.split(' '); // Split by empty space to get each individual word
            switch (command) {             
                 case managedData.spinCommand:
                    if (chatMessage.authorAttributes.isCreator || 
                        (chatMessage.authorAttributes.isModerator && managedData.spinPermissions.includes("Moderators")) ||
                        (chatMessage.authorAttributes.isPaidSubscriber && managedData.spinPermissions.includes("Subscribers"))||
                        (chatMessage.authorAttributes.isPlatformDonator && managedData.spinPermissions.includes("Tippers")) ){
                            startSpin();
                        }
                    
                    break;
            }
        }
        window.widget.events.on('chatEventReceived',handle_chatEventRecieved);
        function addSector(sector) {
            sectors.push(sector);
            return;
        }

        // TODO, move this to custom triggers when they are available
        function showWinner(){
            let winCover = document.querySelector('[data-composite-field="background-win_cover"]');
            let img=winCover.querySelector('img');
            img.animate([{ opacity: getComputedStyle(img).opacity }, { opacity: 1 }], { duration: 400, easing: 'ease-out', fill: 'forwards' });
        }
        function hideWinner(){
            let winCover = document.querySelector('[data-composite-field="background-win_cover"]');
            let img=winCover.querySelector('img');
            img.animate([{ opacity: getComputedStyle(img).opacity }, { opacity: 0 }], { duration: 400, easing: 'ease-out', fill: 'forwards' });
        }

        // update the form based on managedData
        function updateOptionList(){
            if(managedData.options){
                let optionsList = [];
                let index=1;
                for (let option of managedData.options){ 
                        optionsList.push("<li>"+ option.label +"</li>");   
                        index++;     
                }
                let decodedOptionList=decodeHTMLEntities(optionsList.filter(str => str && str.trim() !== "").join('\n'));
                window.widget.bindableData.setValue({ key: "wheelOptionList", value:"<ol class='optionList'>" + decodedOptionList +"</ol>"});
            }
        }

        // this will setup the wheel
        function initWheel() {
            if (managedData.options){
                let index=0;
                console.log(managedData);
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                sectors=[];
                for (let option of managedData.options) {
                    addSector({ color: colors[index%colors.length], label: option.label });
                    index++;
                }
                arc = TAU / sectors.length;
                tot = sectors.length;
                rad = dia / 2;
                sectors.forEach(drawSector);
                rotate(); // Initial rotation
                updateOptionList();
            }
        }

        // Reset wheel parameters to their initial values
        function resetParameters() {
            isSpinning = false; // The wheel is not spinning when parameters are reset  
            window.widget.bindableData.setValue({ key: "wheelWinner", value: "" }); // reset winners
            window.widget.bindableData.setValue({ key: "wheelWinnerNumber", value: null }); // reset winners
            angVel=0.005;   
            maxAngVel = Math.random() * 0.2 + 0.1;
            spinPhase = 1;
            lastPlayedArcIndex = -1;
            phase1Duration = 300;
            phase2StartTime = 0;
        }

        // start/stop wheel
        function startSpin() {
            if (!isSpinning) {
                resetParameters();
                hideWinner();
                phase1StartTime = Date.now(); // Reset the phase1StartTime each time you start a spin
                isSpinning = true;
                animationId = requestAnimationFrame(engine);
                startSound.pause();
                startSound.currentTime = 0;
                startSound.play();
                window.widget.persistentStorage.requestSetValue({
                    key: "wheelIsSpinning",
                    value: true,
                    requestKey: Date.now().toString()
                });
                } else {
                // If the wheel is already spinning, don't do anything
                angVel=0;
                console.log("Spin already in progress");
            }
        }
        function stopSpin(){
            if (window.widget.persistentStorage.getValue({key:"wheelIsSpinning"})){
                window.widget.persistentStorage.requestSetValue({
                    key: "wheelIsSpinning",
                    value: false,
                    requestKey: Date.now().toString()
                });
                angVel=0;
            }          

        }

        // Define what happens when the managed data is changed by the control panel
        async function handle_managedDataChanged() {
            //first lets check if this was a spin command
            let spin=managedData.spin;
            let perviousOptions=managedData.options; // make sure this is not the control panel setting the default
            await fetchFreshManagedData();
            if (spin!=managedData.spin && perviousOptions){
                if (managedData.spin){
                    startSpin();
                }else{
                    stopSpin();
                }
                return;
            }
            // if this is not a spin command, update the options list
            updateOptionList();
            initWheel();

        }
        window.widget.events.on('managedDataChanged', handle_managedDataChanged);

        // get managed data 
        async function fetchFreshManagedData() {
            managedData = await window.widget.api.fetchManagedData() || {};
        }
        fetchFreshManagedData().then(
                function(){
                    updateOptionList();
                    initWheel();
                }
            );
        return {
            get compositeFieldSchema() {
                return {
                    type: "wheel",
                    baseType: 'text',
                    placeholders: {},
                    text: [
                        {
                            content: textContentOrDefaultValue
                        }
                    ],
                    mimeType: "text/multiline"
                };
            },
            get htmlElement() {
                return htmlElement;
            },
            async dispose() {         
                window.widget.events.off('managedDataChanged', handle_managedDataChanged);
                window.widget.events.off('chatEventReceived',handle_chatEventRecieved);
            },
        };
        
    }
});

// helper functions

function decodeHTMLEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  function isValidColorCode(hex) {
    // Regular expression to match #FFF and #FFFFFF patterns
    const pattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return pattern.test(hex);
  }
  
  function validateColors(str) {
    const colors = str.split(',');
    return colors.every(isValidColorCode);
  }