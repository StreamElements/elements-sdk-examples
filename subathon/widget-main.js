// get the configuration defined and stored by the controller
// make the time left exposed for text fields in the editor
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_timeleft", displayName: "Subathon Time Left", value: "24:00:00", categoryName: "Subathon" });
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_subT1Addition", displayName: "Time add for T1 Sub", value: 400, categoryName: "Subathon" });
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_subT2Addition", displayName: "Time add for T2 Sub", value: 500, categoryName: "Subathon" });
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_subT3Addition", displayName: "Time add for T3 Sub", value: 600, categoryName: "Subathon" });
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_subAddition", displayName: "Time add for Other Subs", value: 300, categoryName: "Subathon" });
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_tipAddition", displayName: "Time add for tip", value: 600, categoryName: "Subathon" });
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_cheerAddition", displayName: "Time add for cheer", value: 500, categoryName: "Subathon" });
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_followAddition", displayName: "Time add for follow", value: 200, categoryName: "Subathon" });
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_message", displayName: "Current Subathon Message", value: "", categoryName: "Subathon" });
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_pauseMessage", displayName: "Message when Subathon is paused", value:"Paused...", categoryName: "Subathon" });
window.widget.bindableData.registerBindableDataVariable({ key: "subathon_endMessage", displayName: "Message when Subathon ended", value: "Time's up", categoryName: "Subathon" });

var demoDuration=24*3600;
var demoMode=false;
// register required persistent data

window.widget.persistentStorage.registerPersistentDataVariable({
  key: "state",
  defaultValue: "stop"
});
window.widget.persistentStorage.registerPersistentDataVariable({
  key: "pauseDuration",
  defaultValue: false
});
window.widget.persistentStorage.registerPersistentDataVariable({
  key: "targetDate",
  defaultValue: Date.now()
});
window.widget.serviceModules.registerServiceModuleProvider({
  // ServiceModules are required to provide metadata about themselves
  getServiceModuleMetadata() {
    return {
      displayName: 'Subathon',
      description: 'the main service handling the subathon',
    };
  },

  // Will be called every time `configDataChanged` event fires
  async createServiceModuleInstance() {
    let managedData = {};
    let timerProc = null;
    // Fetch resources, subscribe to events
    // set up managed data & form elements
    // bring the managed data
    await fetchFreshManagedData();
    // validate that managedData is valid
    if (managedData.timeAdditions){
    // update latest time additions
     window.widget.bindableData.setValue({key:"subathon_subAddition",value:managedData.timeAdditions.sub[1]});
      window.widget.bindableData.setValue({key:"subathon_subT1Addition",value:managedData.timeAdditions.t1[1]});
      window.widget.bindableData.setValue({key:"subathon_subT2Addition",value:managedData.timeAdditions.t2[1]});
      window.widget.bindableData.setValue({key:"subathon_subT3Addition",value:managedData.timeAdditions.t3[1]});
      window.widget.bindableData.setValue({key:"subathon_tipAddition",value:managedData.timeAdditions.tip[1]});
      window.widget.bindableData.setValue({key:"subathon_cheerAddition",value:managedData.timeAdditions.cheer[1]});
      window.widget.bindableData.setValue({key:"subathon_followAddition",value:managedData.timeAdditions.follow[1]});
      window.widget.bindableData.setValue({key:"subathon_endMessage",value:managedData.messages.endMessage});
      window.widget.bindableData.setValue({key:"subathon_pauseMessage",value:managedData.messages.pauseMessage});
      // handle changes in managed data
      window.widget.events.on('managedDataChanged', handle_managedDataChanged);
      if (window.widget.persistentStorage.getValue({ key: "state" })=="play") {
        setTimer();
      } else {
        updateTimer();
      }
    }else{
      managedData = {
          "targetDuration": 24 * 3600,
          "timeAdditions": {
              "t1": [true, 360],
              "t2": [true, 480],
              "t3": [true, 600],
              "tip": [true, 40],
              "cheer": [true, 20],
              "follow": [true, 60],

          },
          "maxDuration": -1,
          "commands": { "pause": "!subpause", "resume": "!subresume", "addTime": "!subaddtime" },
          "messages":{"pauseMessage":"Paused...","endMessage":"Time's Up!"}
          
      }
      window.widget.events.on('managedDataChanged', handle_managedDataChanged);
      window.widget.persistentStorage.requestSetValue({ key: "pauseDuration", value: 0, requestKey: Date.now().toString() });
      window.widget.persistentStorage.requestSetValue({ key: "state", value: "stop", requestKey: Date.now().toString() });
      window.widget.persistentStorage.requestSetValue({ key: "targetDate", value: Date.now(), requestKey: Date.now().toString() });
        window.widget.events.on("previewModeChanged",function(previewMode){
          console.log(previewMode);
          if (previewMode=="static" || previewMode=="demo"){
            demoMode=true;
            setTimer();
          }

          
        });
    }
    
    // Handle events as they trigger (when sub comes in)
    // Define what happens when the managed data is changed by the control panel

    async function handle_managedDataChanged() {
      demoMode=false;
      //first lets bring the freshdata over
      await fetchFreshManagedData();
      window.widget.bindableData.setValue({key:"subathon_subAddition",value:managedData.timeAdditions.sub[1]});
      window.widget.bindableData.setValue({key:"subathon_subT1Addition",value:managedData.timeAdditions.t1[1]});
      window.widget.bindableData.setValue({key:"subathon_subT2Addition",value:managedData.timeAdditions.t2[1]});
      window.widget.bindableData.setValue({key:"subathon_subT3Addition",value:managedData.timeAdditions.t3[1]});
      window.widget.bindableData.setValue({key:"subathon_tipAddition",value:managedData.timeAdditions.tip[1]});
      window.widget.bindableData.setValue({key:"subathon_cheerAddition",value:managedData.timeAdditions.cheer[1]});
      window.widget.bindableData.setValue({key:"subathon_followAddition",value:managedData.timeAdditions.follow[1]});
     
      updateTimer();

    }
    
    async function handle_widgetEventReceived({ widgetEvent }){
      switch (widgetEvent.type){
        case "state":
          
          switch(widgetEvent.value){
            case "pause":
              window.widget.persistentStorage.requestSetValue({ key: "pauseDuration", value: (window.widget.persistentStorage.getValue({ key: "targetDate" }) - Date.now())/1000, requestKey: Date.now().toString() });
              break;
            case "play":
              if (window.widget.persistentStorage.getValue({ key: "pauseDuration" })==0){
                window.widget.persistentStorage.requestSetValue({ key: "targetDate", value: Date.now() + Number(managedData.targetDuration)*1000, requestKey: Date.now().toString() });
              }else{
                window.widget.persistentStorage.requestSetValue({ key: "targetDate", value: Date.now() + Number(window.widget.persistentStorage.getValue({ key: "pauseDuration" }))*1000, requestKey: Date.now().toString() });
                window.widget.persistentStorage.requestSetValue({ key: "pauseDuration", value: 0, requestKey: Date.now().toString() });
              }
                break;
            case "stop":
              break;
          }  
          window.widget.persistentStorage.requestSetValue({ key: "state", value: widgetEvent.value, requestKey: Date.now().toString() });     
          break;
        case "reset":
          window.widget.persistentStorage.requestSetValue({ key: "pauseDuration", value: 0, requestKey: Date.now().toString() });
          window.widget.persistentStorage.requestSetValue({ key: "state", value: "stop", requestKey: Date.now().toString() });
          break;

      }

    }
    window.widget.events.on("widgetEventReceived",handle_widgetEventReceived)
    // get managed data 
    async function fetchFreshManagedData() {
      managedData = await window.widget.api.fetchManagedData();
    }
    // handle chat events

    async function handle_chatEvents({ chatMessage }) {
      const [command] = chatMessage.textMessageDetails.message.split(' '); // Split by empty space to get each individual word
      console.log("command:" + command)
      switch (command) {

        case managedData.commands.addTime:
          console.log("add time");
          let str = chatMessage.textMessageDetails.message.split(' ')[1];
          if (isInt(str)) addTime(parseInt(str, 10));
          break;
        case managedData.commands.pause:
          if (window.widget.persistentStorage.getValue({ key: "state" })!="play") return;
          window.widget.persistentStorage.requestSetValue({
            key: "state",
            value: "pause",
            requestKey: Date.now().toString()
          });
          let pauseDuration = (window.widget.persistentStorage.getValue({ key: "targetDate" }) - Date.now() ) / 1000;
          window.widget.persistentStorage.requestSetValue({
            key: "pauseDuration",
            value: pauseDuration,
            requestKey: Date.now().toString()
          });
          removeTimer();
          break;
        case managedData.commands.resume:
          if (window.widget.persistentStorage.getValue({ key: "state" })!="pause") return;
          window.widget.persistentStorage.requestSetValue({
            key: "targetDate",
            value:  Date.now() + Number(window.widget.persistentStorage.getValue({ key: "pauseDuration" }))*1000,
            requestKey: Date.now().toString()
          });
            window.widget.persistentStorage.requestSetValue({
            key: "state",
            value: "play",
            requestKey: Date.now().toString()
          });
          window.widget.persistentStorage.requestSetValue({
            key: "pauseDuration",
            value: 0,
            requestKey: Date.now().toString()
          });
          break;
      }
    }
    window.widget.events.on('chatEventReceived', handle_chatEvents);

    // Define what happens when we receive an Activity]
    async function handle_activityReceived({activity}) {
      if (activity.isMock)return;
      if (window.widget.persistentStorage.getValue({ key: "state" })!="play") return; // only get events when the timer is running
      let str = "";
      // Update subathon end timestamp
      switch (activity.type) {
        case 'subscriber':
          if (activity.bulkGifted) { // Ignore gifting event and count only real subs
            return;
          }
          switch (activity.data.tier) {
            case "1000":
              str = managedData.timeAdditions.t1[1];
              if (isInt(str) && managedData.timeAdditions.t1[0]) addTime(parseInt(str, 10));
              break;
            case "2000":
              str = managedData.timeAdditions.t2[1];
              if (isInt(str) && managedData.timeAdditions.t2[0]) addTime(parseInt(str, 10));
              break;
            case "3000":
              str = managedData.timeAdditions.t2[1];
              if (isInt(str) && managedData.timeAdditions.t3[0]) addTime(parseInt(str, 10));
              break;
          }
          break;
        case 'tip':
          str = managedData.timeAdditions.tip[1];
          var amount=Math.floor(parseInt(str, 10)*activity.data.amount);
          window.widget.bindableData.setValue({key:"subathon_tipAddition",value:amount});
          console.log(amount);
          if (isInt(str) && managedData.timeAdditions.tip[0]) addTime(amount);
          break;
        case 'follow':
          str = managedData.timeAdditions.follow[1];
          if (isInt(str) && managedData.timeAdditions.follow[0]) addTime(parseInt(str, 10));
          break;
        case 'cheer':
          str = managedData.timeAdditions.cheer[1];
          var amount=Math.floor(parseInt(str, 10)*activity.data.amount/500);
          console.log(amount);
          window.widget.bindableData.setValue({key:"subathon_tipAddition",value:amount});
          if (isInt(str) && managedData.timeAdditions.cheer[0]) addTime(amount);
          break;
      }
    }
    window.widget.events.on('activityReceived', handle_activityReceived);

    // update ui when persistent storage is updated
    function handle_persistentStorageVariableValueChanged(keyvaluepair) {
      switch(keyvaluepair.key){
        case "state":
            if (keyvaluepair.value=="play") {
                setTimer();
            }else{
              if (!demoMode){
                removeTimer();  
              }
            }
            break;
      }
      updateTimer();
    }
    window.widget.events.on('persistentStorageVariableValueChanged', handle_persistentStorageVariableValueChanged);

    // handle dadding time from chat
    async function addTime(sec) {
      window.widget.persistentStorage.requestSetValue({
          key: "targetDate",
          value: Number(window.widget.persistentStorage.getValue({ key: "targetDate" })) + sec*1000,
          requestKey: Date.now().toString()
        });
    }
  
    //set widget timer
    function setTimer() { 
      clearInterval(timerProc);
      timerProc = setInterval(function () {
        updateTimer();
      }, 1000);
    }
    function removeTimer() {
      clearInterval(timerProc);
    }
    function updateTimer() {
      if ((window.widget.previewMode=="static"|| window.widget.previewMode=="demo") && demoMode){
        window.widget.bindableData.setValue({ key: "subathon_timeleft", value: sec2formatTime(demoDuration)});
        demoDuration=demoDuration-1
        return;
      }
      switch ( window.widget.persistentStorage.getValue({ key: "state" })){
        case "play":
          window.widget.bindableData.setValue({ key: "subathon_timeleft", value: getFormmattedTimerLeft() });
          if (window.widget.persistentStorage.getValue({ key: "targetDate" }) - Date.now()<=0){
            window.widget.bindableData.setValue({key:"subathon_message",value:managedData.messages.endMessage});
          }else{
            window.widget.bindableData.setValue({key:"subathon_message",value:""});
          }
         break;
        case "pause":
          if (window.widget.persistentStorage.getValue({ key: "pauseDuration" })!=0){
           window.widget.bindableData.setValue({ key: "subathon_timeleft", value: sec2formatTime(window.widget.persistentStorage.getValue({ key: "pauseDuration" })) });
            window.widget.bindableData.setValue({key:"subathon_message",value:managedData.messages.pauseMessage});
          }
          break;
        case "stop":
          window.widget.bindableData.setValue({ key: "subathon_timeleft", value: sec2formatTime(managedData.targetDuration) });
          window.widget.bindableData.setValue({key:"subathon_message",value:""});
            break;
      }
    }

    return {
      // Will be called every time `configDataChanged` event fires
      // and when widget shuts down
      async dispose() {
        // Unsubscribe from events, free resources
        window.widget.events.off('chatEventReceived', handle_chatEvents);
        window.widget.events.off('activityReceived', handle_activityReceived);
        window.widget.events.off('persistentStorageVariableValueChanged', handle_persistentStorageVariableValueChanged);
        window.widget.events.off('managedDataChanged', handle_managedDataChanged);
        window.widget.events.off("widgetEventReceived",handle_widgetEventReceived);
        window.widget.events.off("previewModeChanged",setTimer);
        removeTimer();
      }
    }
  },
});




// service functions
function getFormmattedTimerLeft() {
  var currentDuration = Math.max(0,window.widget.persistentStorage.getValue({ key: "targetDate" }) - Date.now()) ;
    return sec2formatTime(currentDuration / 1000);
}


function sec2formatTime(num) {
  return padTo2Digits(Math.floor(num / 3600)) + ":" + padTo2Digits(Math.floor((num % 3600) / 60)) + ":" + padTo2Digits(Math.floor(num % 60));
}

function padTo2Digits(num) {
  return num.toString().padStart(2, '0');
}

function isInt(str) {
  var parsed = parseInt(str, 10);
  return (String(parsed) == str);
}

