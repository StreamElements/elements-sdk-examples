let managedData = {};

// service module makes sure all data is fetched and window is loaded
window.controlPanel.serviceModules.registerServiceModuleProvider({
    // ServiceModules are required to provide metadata about themselves
    getServiceModuleMetadata() {
        return {
            displayName: 'Subathon',
            description: 'the main service handling the subathon',
        };
    },

    // Will be called every time `configDataChanged` event fires
    async createServiceModuleInstance() {
        // set up managed data & form elements

        managedData = await window.controlPanel.api.fetchManagedData();
        if (managedData.targetDuration == undefined) {
            // set default - state: stop,play,pause
            managedData = {
                "targetDuration": 24 * 3600,
                "timeAdditions": {
                    "t1": [true, 360],
                    "t2": [true, 480],
                    "t3": [true, 600],
                    "sub": [true, 360],
                    "tip": [true, 600],
                    "cheer": [true, 240],
                    "follow": [true, 60],

                },
                "maxDuration": -1,
                "commands": { "pause": "!subpause", "resume": "!subresume", "addTime": "!subaddtime" },
                "messages":{"pauseMessage":"Paused...","endMessage":"Time's Up!"}
            }
            storeManagedData();
        }
        updateTimer();
        if (window.controlPanel.persistentStorage.getValue({ key: "state" })=="play"){
            startTimer();
        }
        // check for changes in persistent data

        // register for managed data changes
        async function handle_managedDataChanged() {
            console.log("managed changed");
            managedData = await window.controlPanel.api.fetchManagedData() || {};
            console.log(managedData);
            // propogate values on fields
            updateFieldsFromManagedData();
        }
        window.controlPanel.events.on('managedDataChanged', handle_managedDataChanged);

        // register for persistent data changes
        function handle_persistentStorageVariableValueChanged(keyvaluepair) {
            console.log(keyvaluepair);
            switch (keyvaluepair.key) {
                case "state":
                    switch (keyvaluepair.value){
                        case "play":
                            startTimer();
                            document.getElementById("publishAlert").classList.add("d-none");
                            break;
                        case "resume":
                            startTimer();
                            break;
                        case "pause":
                            removeTimer();
                            updateTimer();
                    }
                    updateFieldsFromManagedData();
                    break;
                case "reset":
                    removeTimer();
                    updateTimer();
                    break;
                case "pauseDuration":
                        updateTimer();
                        break;
            }
        }

        window.controlPanel.events.on('persistentStorageVariableValueChanged', handle_persistentStorageVariableValueChanged);
        storeManagedData();

        // set up listners after we are sure things are ready for them
        // handle managed data

        // handle persistent data


        // set duration & message fields
        document.querySelector("#target-duration").addEventListener("change", handle_targetDurationFieldChange);

        async function handle_targetDurationFieldChange() {
            targetDurationArray = document.querySelector("#target-duration").value.split(":");
            managedData.targetDuration = (Number(targetDurationArray[0]) * 3600 + Number(targetDurationArray[1]) * 60 + Number(targetDurationArray[2]));
            storeManagedData();
        };


        document.querySelector(".durationField").addEventListener("keypress", function (event) {
            if (isNaN(String.fromCharCode(event.which))) {
                event.preventDefault();
            }
        });
        function updateManagedDataFromFields(){
            managedData.timeAdditions.t1=[document.getElementById("t1-enabled").checked,formatTime2sec(document.getElementById("t1-duration").value)];
            managedData.timeAdditions.t2=[document.getElementById("t2-enabled").checked,formatTime2sec(document.getElementById("t2-duration").value)];
            managedData.timeAdditions.t3=[document.getElementById("t3-enabled").checked,formatTime2sec(document.getElementById("t3-duration").value)];
            managedData.timeAdditions.sub=[document.getElementById("sub-enabled").checked,formatTime2sec(document.getElementById("sub-duration").value)];
            managedData.timeAdditions.tip=[document.getElementById("tip-enabled").checked,formatTime2sec(document.getElementById("tip-duration").value)];
            managedData.timeAdditions.cheer=[document.getElementById("cheer-enabled").checked,formatTime2sec(document.getElementById("cheer-duration").value)];
            managedData.timeAdditions.follow=[document.getElementById("follow-enabled").checked,formatTime2sec(document.getElementById("follow-duration").value)];
            managedData.commands.pause=document.getElementById("pause-command").value;
            managedData.commands.resume=document.getElementById("resume-command").value;
            managedData.messages.pasueMessage=document.getElementById("pause-message").value;
            managedData.messages.endMessage=document.getElementById("end-message").value;
            console.log(managedData.timeAdditions);
        }
        for (let f of document.querySelectorAll(".durationField, .messageField")){
            f.addEventListener("change", function () {  
                console.log("change");
                updateManagedDataFromFields();
                storeManagedData();
            })
        };
        for (let t of document.querySelectorAll(".durationToggle")){

            t.addEventListener("change", function () {
                toggleEnabledDurationField(this);
                storeManagedData();
            })
        };

        // toggle play btn  
        async function handle_playBtnLogic() {
            // start subathon
            switch (window.controlPanel.persistentStorage.getValue({ key: "state" })) {
                case "stop":
                    window.controlPanel.api.emitWidgetEvent({ widgetEvent: {type:"state",value:"play"}, outOfBand: true, requestKey: crypto.randomUUID() });
                    setTimeout(function(){
                        if (window.controlPanel.persistentStorage.getValue({key:"state"})!="play"){
                                document.getElementById("publishAlert").classList.remove("d-none");
                        }
                    },2000);
                    break;
                case "pause":
                    window.controlPanel.api.emitWidgetEvent({ widgetEvent: {type:"state",value:"play"}, outOfBand: true, requestKey: crypto.randomUUID() });
                    break;
                case "play":
                    window.controlPanel.api.emitWidgetEvent({ widgetEvent:{type:"state",value:"pause"}, outOfBand: true, requestKey: crypto.randomUUID() });            
                    break;
            }
        };
        document.querySelector("#play-btn").addEventListener("click", handle_playBtnLogic);

        // handle duration btns
        async function handle_durationBtnClick(event) {
            if (window.controlPanel.persistentStorage.getValue({ key: "state" }) == "pause") {
                return; // do not allow time additions while paused
            } else {
                managedData.targetDuration += Number(this.value);
                managedData.targetDuration=Math.max(managedData.targetDuration,0);
            }
            storeManagedData();
        }
        let durBtns = document.querySelectorAll(".durBtn")
        for (btn of durBtns) {
            btn.addEventListener("click", handle_durationBtnClick)
        }

        // handle reset
        document.querySelector("#reset-btn").addEventListener("click", function () {
            window.controlPanel.api.emitWidgetEvent({ widgetEvent: {type:"reset",value:""}, outOfBand: true, requestKey: crypto.randomUUID() });
        })

        // store managed data
        async function storeManagedData() {
            // this will store the data and once stored will invoke the update managed data (where the values in the form are propogated)
            await window.controlPanel.api.storeManagedData({ managedData: managedData });
        }

        // render the fields based on managed data
        function updateFieldsFromManagedData() {
            document.querySelector("#target-duration").value = sec2formatTime(managedData.targetDuration);
            document.querySelector('#target-duration').disabled = (window.controlPanel.persistentStorage.getValue({ key: "state" }) == "pause" ||window.controlPanel.persistentStorage.getValue({ key: "state" }) == "play");
            document.getElementById("pause-command").value=managedData.commands.pause;
            document.getElementById("resume-command").value=managedData.commands.resume;
            document.getElementById("pause-message").value=managedData.messages.pauseMessage;
            document.getElementById("end-message").value=managedData.messages.endMessage;
            for (let i in managedData.timeAdditions) {
                document.querySelector("#" + i + "-enabled").setAttribute("checked", managedData.timeAdditions[i][0]);
                document.querySelector("#" + i + "-duration").value = sec2formatTime(managedData.timeAdditions[i][1]);
            }
            switch (window.controlPanel.persistentStorage.getValue({ key: "state" })) {
                case "play":
                    document.querySelector("#addtime-group").style.display = "none";
                    document.querySelector("#play-btn").innerText = "Pause";
                    document.querySelector('#target-duration').disabled = true;
                    break;
                case "pause":
                    document.querySelector("#addtime-group").style.display = "none";
                    document.querySelector("#play-btn").innerText = "Continue";
                    document.querySelector('#target-duration').disabled = true;
                    break;
                case "stop":
                    document.querySelector("#addtime-group").style.display = "";
                    document.querySelector("#play-btn").innerText = "Start";
                    document.querySelector("#timer").innerText = sec2formatTime(managedData.targetDuration);
                    document.querySelector('#target-duration').disabled = false;
                    break;
            }
            if (managedData.maxDuration != -1) {

            }
        }


        return {
            // Will be called every time `configDataChanged` event fires
            // and when widget shuts down
            async dispose() {
                // Unsubscribe from events, free resources
                console.log("dispose");
                window.widget.events.off('chatEventReceived', handle_chatEvents);
                window.widget.events.off('activityReceived', handle_activityReceived);
                window.widget.events.off('persistentStorageVariableValueChanged', handle_persistentStorageVariableValueChanged);
                window.widget.events.off('managedDataChanged', handle_managedDataChanged);
            }
        }
    },
});

// handle timers
let timerProc = null;

async function startTimer() {
    removeTimer();
    timerProc = setInterval(function () {
        updateTimer();
    }, 1000);
}
function updateTimer() {
    switch (window.controlPanel.persistentStorage.getValue({ key: "state" })) {
        case "play":
            document.querySelector("#timer").innerText = getFormattedTimerLeft();
            break;
        case "pause":
            if (window.controlPanel.persistentStorage.getValue({ key: "pauseDuration" })!=0){
                document.querySelector("#timer").innerText = sec2formatTime(window.controlPanel.persistentStorage.getValue({ key: "pauseDuration" }));
            }
            break;
        case "stop":
            document.querySelector("#timer").innerText = sec2formatTime(managedData.targetDuration);
            break;
    }
}
function removeTimer() {
    clearTimeout(timerProc);
}

// supporting functions
function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function sec2formatTime(num) {
    return padTo2Digits(Math.floor(num / 3600)) + ":" + padTo2Digits(Math.floor((num % 3600) / 60)) + ":" + padTo2Digits(Math.floor(num % 60));
}

function formatTime2sec(str) {
    const parts = str.split(":").map(part => parseInt(part, 10));
    if (parts.length !== 3) {
        throw new Error("Invalid time format");
    }
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function formatTimeOnType(field) {
    if (field.value.length == 2) {
        field.value = field.value + ":"
    }
    if (field.value.length == 5) {
        field.value = field.value + ":"
    }
    if (field.value.length >= 8) {
        field.value = enforceSecFormat(field.value);
    }
}

function enforceSecFormat(str) {
    let strArr = str.split(":");
    for (i in strArr) {
        if (i != 0) {
            if (strArr[i] > 59) {
                strArr[i] = 59
            }
        }
    }
    return strArr.join(":");
}
function toggleEnabledDurationField(cb) {
    document.querySelector("#" + cb.attr("id").split("-")[0] + "-duration").setAttribute("readonly", !(cb.is(":checked")));
}

function getFormattedTimerLeft() {
    var currentDuration = Math.max(0,window.controlPanel.persistentStorage.getValue({ key: "targetDate" }) - Date.now());
    return sec2formatTime(currentDuration / 1000); 
}