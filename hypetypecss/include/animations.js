var thursday=async function(target,completeFnc,duration,delay){
  anime.timeline({loop: false,complete: completeFnc})
  .add({
    targets: target + ' .letter',
    delay:delay})
  .add({
    targets: target + ' .letter',
    scale: [0.3,1],
    opacity: [0,1],
    translateZ: 0,
    easing: "easeOutExpo",
    duration: 600,
    delay: (el, i) => 70 * (i+1)
  }).add({
    targets: target + ' .letter',
    opacity: 0,
    duration: 600,
    easing: "easeOutExpo",
    delay: (el, i) => duration +30 * (i+1)
  });
}
var sunnyMorning=async function(target,completeFnc,duration,delay){
  anime.timeline({loop: false,complete: completeFnc})
  .add({
    targets: target + ' .letter',
    delay:delay})
  .add({
    targets: target +' .letter',
    scale: [4,1],
    opacity: [0,1],
    translateZ: 0,
    easing: "easeOutExpo",
    duration: 950,
    delay: (el, i) => 70*i
  }).add({
    targets: target + ' .letter',
    opacity: 0,
    duration: 600,
    easing: "easeOutExpo",
    delay: (el, i) => duration +30 * (i+1)
  });
}
var beautifulQuestions=async function(target,completeFnc,duration,delay){
  anime.timeline({loop: false,complete: completeFnc})
  .add({
    targets: target + ' .letter',
    delay:delay})
  .add({
    targets: target +' .letter',
    translateY: ["1.1em", 0],
    translateZ: 0,
    duration: 750,
    delay: (el, i) => 50 * i
  }).add({
    targets: target + ' .letter',
    opacity: [0],
    duration: 300,
    translateY: [ 0,"1.1em"],
    translateZ: 0,
    easing: "easeOutExpo",
    delay: (el, i) => duration +30 * (i+1)
  });
}
var realityIsBroken=async function(target,completeFnc,duration,delay){
  anime.timeline({loop: false,complete: completeFnc})
  .add({
    targets: target + ' .letter',
    delay:delay})
  .add({
    targets: target +' .letter',
    translateY: ["1.1em", 0],
    translateX: ["0.55em", 0],
    translateZ: 0,
    rotateZ: [180, 0],
    duration: 750,
    easing: "easeOutExpo",
    delay: (el, i) => 50 * i
  }).add({
    targets: target +' .letter',
    translateY: [ 0,"1.1em"],
    translateX: [ 0,"0.55em"],
    translateZ: 0,
    opacity: [1,0],
    duration: 750,
    easing: "easeOutExpo",
    delay: (el, i) => duration +30 * (i+1)
  })
};

var raisingStrong=async function(target,completeFnc,duration,delay){
  anime.timeline({loop: false,complete: completeFnc})
  .add({
    targets: target + ' .letter',
    delay:delay})
  .add({
    targets: target +' .letter',
    translateY: [100,0],
    translateZ: 0,
    opacity: [0,1],
    easing: "easeOutExpo",
    duration: 750,
    delay: (el, i) =>  30 * i
  }).add({
    targets: target +' .letter',
    translateY: [0,-100],
    opacity: [1,0],
    easing: "easeInExpo",
    duration: 750,
    delay: (el, i) => duration + 30 * (i+1)
  })
}


