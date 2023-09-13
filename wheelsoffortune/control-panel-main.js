let managedData = {};

// Initialize SortableJS on the wheel-config div
let sortable = new Sortable(document.getElementById('wheel-config'), {
    handle: '.handle',
    animation: 150,
    onEnd: function() {
        updateNumbers();
        updateManagedData();
        storeManagedData();
    }
});

document.getElementById('add-option').addEventListener('click', () => {
    managedData.options.push({label:""});
    storeManagedData();
});
document.getElementById('spin-command').addEventListener('change', function() {
    managedData.spinCommand=this.value;
    storeManagedData();
});


function addItem(label,id){
    let item = document.createElement('div');
    item.classList.add('option','input-group', 'input-group-sm', 'mb-3', 'bg-dark','align-items-center');
    // create numbers
    let number = document.createElement('span');
    number.classList.add('option-number','input-group-text','border-0', 'bg-dark');
    
    // Create label
    let labelField = document.createElement('textarea');
    labelField.type = 'text';
    labelField.classList.add('option-label','form-control', 'bg-dark', 'text-white', 'border-0');
    labelField.placeholder = 'Enter you text';
    labelField.rows="1";
    labelField.value=label?label:"";
    labelField.style.height = 'auto';
    labelField.setAttribute("data-id",id);
    setTimeout(() => {
        labelField.style.height = labelField.scrollHeight + 'px';
    }, 0);
 
    labelField.addEventListener('change', function() {
        managedData.options[this.getAttribute("data-id")].label=this.value;
        storeManagedData();
    });
    labelField.addEventListener('input', autoResize, false);
    function autoResize() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    }
    // Create drag handle
    let handle = document.createElement('span');
    handle.classList.add('handle', 'input-group-text', 'bg-dark', 'text-white', 'border-0');
    handle.textContent = '☰';

    // Create remove button
    let removeBtn = document.createElement('span');
    removeBtn.classList.add('input-group-text', 'bg-dark', 'border-0');
    let remove = document.createElement('button');
    remove.classList.add('btn-close', 'btn-close-white', 'border-0','small');
    remove.setAttribute('aria-label', 'Close');
    remove.setAttribute("data-id",id);
    remove.addEventListener('click',function(){
        managedData.options.pop(Number(this.getAttribute("data-id")))
        storeManagedData();
    });
    removeBtn.append(remove);
    item.append(number, labelField, handle,removeBtn);
    document.getElementById('wheel-config').appendChild(item);   
    updateNumbers();
    return item;
};
//update option numbers
function updateNumbers() {
    let options = document.querySelectorAll('#wheel-config .input-group');
    options.forEach((option, index) => {
        let tf=option.querySelector('.option-number');
        tf.textContent= `${index + 1}.`;
        tf.setAttribute("data-id",index);
        
    }); 
}
function updateManagedData(){
   // options
   managedData.options=[];
   for (option of document.querySelectorAll(".option")){
       managedData.options.push({label:option.querySelector(".option-label").value});
   }
   // permissions and command
   managedData.spinPermissions=getCheckedValues("spinPermissions")
}

//check boxes
let dropdownMenuButton = document.getElementById('spinPermissions');
let checkboxes = document.querySelectorAll('.checkbox-menu input[type="checkbox"]');

checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        let selectedOptions = Array.from(checkboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
        dropdownMenuButton.textContent = selectedOptions.join(', ');
        if (selectedOptions.length==0){
            dropdownMenuButton.textContent="select permissions" ;
        }
        updateManagedData();
        storeManagedData();
    });
});

function handle_spin(){
    managedData.spin=true;
    storeManagedData();
}
function handle_stop(){
    managedData.spin=false;  
    storeManagedData();
}

// spin the wheel btn
document.getElementById('spin').addEventListener('click', handle_spin);


async function init() {
    window.controlPanel.events.on('persistentStorageVariableValueChanged',handle_persistentStorageVariableValueChanged);
    // what will happen if another control panel updates the managed data.
    window.controlPanel.events.on('managedDataChanged',handle_managedDataChanged);
    managedData = await window.controlPanel.api.fetchManagedData();
    if (!managedData || !managedData.options) {
        // set default
        managedData = {
            "spin": false,
            "premissions": ["moderators"],
            "options": [
                {label:""},
                {label:""},
                {label:""},
                {label:""},
                {label:""},
                {label:""},
                {label:""},
                {label:""},
                {label:""}
            ],
            "spinCommand": "!spinwheel"
        }
        storeManagedData(); 
    }else{
        updateForm();
    }
}
window.onload=init;

async function handle_managedDataChanged(){
    managedData = await window.controlPanel.api.fetchManagedData();
    updateForm(); 
}
// handle a stop comming from the widget
function handle_persistentStorageVariableValueChanged(keyvaluepair){
    console.log(keyvaluepair);
    if (keyvaluepair.key=="wheelIsSpinning"){
        if (managedData.spin != keyvaluepair.value ){
            console.log("persistent data changes managed data");
            if  (!keyvaluepair.value){
                handle_stop();
            }else{
                handle_spin();
            }
            
        }
    }
}

// store the data
async function storeManagedData() {
    // this will store the data and once stored will invoke the update managed data (where the values in the form are propogated)
    await window.controlPanel.api.storeManagedData({managedData:managedData});
}
async function updateForm() {
    // check if we need to update options
    let renderOptions=false;
    let options=document.querySelectorAll(".option-label");
    if (options.length==managedData.options.length){
        for (let o in managedData.options){
            let option=options[o];
            if (managedData.options[o].label!=option.value){
                renderOptions=true;
                break;
            }
        }
    }else{
        renderOptions=true;
    } 
    if (renderOptions){
            // clear current options
        let config=document.querySelector("#wheel-config");
        config.innerHTML="";
        // set values on form   
        for (o in managedData.options){
            let option=managedData.options[o];
            addItem(option.label,o);
        }
    }
    // update spin button
    if (managedData.spin){
        document.getElementById('spin').innerHTML="STOP";
        document.getElementById('spin').removeEventListener('click', handle_spin);
        document.getElementById('spin').addEventListener('click',handle_stop );
    }else{
        document.getElementById('spin').innerHTML="SPIN THE WHEEL";
        document.getElementById('spin').removeEventListener('click', handle_stop);
        document.getElementById('spin').addEventListener('click',handle_spin );
    }
    // update spin command
    document.getElementById("spin-command").value=managedData.spinCommand;

    // update spin permissions
    setCheckedValues("spinPermissions",managedData.spinPermissions);
    document.getElementById("spinPermissions").innerText=managedData.spinPermissions;

}
function fillRandomTasks(){
    let tasks=getRandomTasks(managedData.options.length);
    for (let o in managedData.options){
        if (managedData.options[o].label==""){
            managedData.options[o].label=tasks[o]
        }   
     }
    storeManagedData();
 }
 function clearTexts(){
     for (let o in managedData.options){
        managedData.options[o].label="";    
     }
     storeManagedData();
  }
  function addItems(x){
     for (let i=0;i<x;i++){
         managedData.options.push({label:""});
     }
     storeManagedData();
  }
  function removeOptions(){
     managedData.options=[];
     storeManagedData();
  }
  // generates random tasks
 function getRandomTasks(n) {
     let tempActivities = [...activities];  // Copy the activities array
     let currentIndex = tempActivities.length;
     let randomIndex;
 
     // While there remain elements to shuffle...
     while (currentIndex !== 0) {
         // Pick a remaining element...
         randomIndex = Math.floor(Math.random() * currentIndex);
         currentIndex--;
 
         // And swap it with the current element.
         [tempActivities[currentIndex], tempActivities[randomIndex]] = [tempActivities[randomIndex], tempActivities[currentIndex]];
     }
     // Get the first 'n' elements from the shuffled array
     return tempActivities.slice(0, n);
 }
// get a value from a list of checkboxes by their name
 function getCheckedValues(name) {
    // Get all checkboxes with the specified name
    const checkboxes = document.getElementsByName(name);
  
    // Initialize an empty array to hold the checked values
    let selected = [];
  
    // Loop through each checkbox to check if it's selected
    checkboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        selected.push(checkbox.value);
      }
    });
  
    // Convert the array of selected values into a comma-separated string
    return selected.join(',');
  }
 
  // set the values of the permissions list based on the managedData value
  function setCheckedValues(name, commaSeparatedValues) {
    // Split the comma-separated string into an array
    const valuesArray = commaSeparatedValues.split(',');
  
    // Get all checkboxes with the specified name
    const checkboxes = document.getElementsByName(name);
  
    // Loop through each checkbox to set its checked property
    checkboxes.forEach((checkbox) => {
      if (valuesArray.includes(checkbox.value)) {
        checkbox.checked = true;
      } else {
        checkbox.checked = false;
      }
    });
  }
  
 

const activities = [
    "Attempt to break a world record for the most marshmallows eaten in a minute.",
    "Host a funny 'roast me' session.",
    "Do a live dramatic reading of a ridiculous piece of fan-fiction.",
    "Try to do a makeup tutorial without a mirror.",
    "Make up a song on the spot about a random topic.",
    "Host a hilarious 'try not to laugh' challenge with water in your mouth.",
    "Do a comical 'dance like no one is watching' challenge.",
    "Try speaking in a made-up language and keep a straight face.",
    "Host a 'worst joke competition' with your viewers.",
    "Perform a skit of a funny scene from a famous movie.",
    "Play a game with the weirdest controller you can find or make.",
    "Host a funny 'caption this' contest using random images.",
    "Live stream a dramatic reenactment of a funny meme.",
    "Try to replicate a viral dance routine.",
    "Play a video game with the screen upside down.",
    "Attempt to draw a portrait of a viewer with your non-dominant hand.",
    "Host a silly costume competition with viewers.",
    "Stream a 'weird food combinations taste test'.",
    "Do a 'guess the object' game using only descriptions from viewers.",
    "Do a 'Simon says' session with your viewers.",
    "Attempt to learn and perform a magic trick live.",
    "Make a sandwich while blindfolded.",
    "Play a game using only voice commands.",
    "Live stream a play-by-play commentary of a pet's actions.",
    "Host an 'ugly selfie' competition.",
    "Attempt to set up and solve a Rubik's cube while wearing oven mitts.",
    "Try to make a DIY project with instructions from viewers.",
    "Read the funniest tweets about a trending topic.",
    "Do a 'worst gift you ever received' story time.",
    "Stream a session of you laughing at hilarious YouTube videos.",
    "Host a live 'Bad Advice' Q&A session.",
    "Perform stand-up comedy written by your viewers.",
    "Do a dramatic reading of song lyrics.",
    "Start a live 'Talent Show' for your viewers to participate in.",
    "Stage a live 'Lip Sync Battle' with viewer-chosen songs.",
    "Try to balance as many objects as you can on your head.",
    "Play a game of charades with your viewers.",
    "Host a 'Funny Hat' contest and wear the winning design.",
    "Make funny predictions about the next trending meme.",
    "Do a 'Bob Ross' style painting, but with a twist (like painting with your feet).",
    "Have a 'Bad Fashion Show' featuring your old clothes.",
    "Live stream your attempt to learn a viral TikTok dance.",
    "Give your best attempt at a stand-up comedy routine.",
    "Do a yoga challenge with difficult poses.",
    "Try to paint or draw something while blindfolded.",
    "Recreate funny YouTube video thumbnails.",
    "Have viewers vote on ingredients to make a smoothie, then drink it.",
    "Have a competition to see who can make the weirdest sound.",
    "Try to make and model balloon animals.",
    "Take on the 'Chubby Bunny' challenge.",
    "Host a mock 'Miss Universe' or 'Mr. Universe' pageant.",
    "Attempt to do the splits live on stream.",
    "Try to make as many origami figures as possible in one minute.",
    "Reenact a scene from a soap opera or telenovela.",
    "Play a video game with the weirdest settings.",
    "Sing a song using helium (only if it's safe and you feel comfortable).",
    "Attempt to make a funny viral trend from scratch.",
    "Try to juggle random household items.",
    "Perform a 'Miming Challenge' with viewer suggestions.",
    "Do a live 'Funny Face Challenge' with viewer votes on the winner."
];


