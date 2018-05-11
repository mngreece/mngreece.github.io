
var character;
var light;
var textureLoader = new THREE.TextureLoader();
var loader = new THREE.JSONLoader();
var isLoaded = false;
var action = {}, mixer;
var activeActionName = 'idle';

var clock = new THREE.Clock();
var mixer;

var arrAnimations = [
  'idle',
  'alert',
  'walk',
  'run',
  'hello'
];
var actualAnimation = 0;

var recognition = new webkitSpeechRecognition();

var speechArea = document.getElementById("harrySpeech");


function harryInit (){

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = function(event) {

    harryActionMap (event);

  }
  recognition.start();
}

function harryActionMap (event){
  var lastSpeech = event.results[event.results.length-1][0]['transcript'];
  lastSpeech = lastSpeech.toLowerCase();

  nameSplit = closestObject.name.split("-");

  let nameString = "Product Number: ";
  nameSplit.forEach(function(m) {
    nameString += " "+m.toUpperCase();
  });


  if (/harry/.test(lastSpeech) || /hurry/.test(lastSpeech)){

    speechArea.value = "Hi there!\nDo you have a question about "+nameString+"?";
    action.alert.play();
  } else if (/stop/.test(lastSpeech)){

    speechArea.value = "Sure";
    action.alert.play();
  } else if (/cost/.test(lastSpeech) || /price/.test(lastSpeech)){

    speechArea.value = "It would cost $ 1000\nAdd "+nameString+" to basket?";
    action.idle.play();
  } else if (/sure/.test(lastSpeech) || /yes/.test(lastSpeech) || /yeah/.test(lastSpeech)){

    speechArea.value = nameString+" to basket!";
    action.idle.play();
  }

}


function harryLoadModel (scene) {

  loader.load('/models/obj/harry/default/harry2.json', function (geometry, materials) {
	materials.forEach(function (material) {
      material.skinning = true;
    });
    character = new THREE.SkinnedMesh(
      geometry,
      new THREE.MeshFaceMaterial(materials)
    );

    character.name = "harry";

    mixer = new THREE.AnimationMixer(character);

    character.rotation.x = 1.5;
    character.scale.x = 0.7;
    character.scale.y = 0.7;
    character.scale.z = 0.7;



    mixer = new THREE.AnimationMixer(character);

	   console.log(geometry.animations.length);

    action.hello = mixer.clipAction(geometry.animations[ 0 ]);
    action.idle = mixer.clipAction(geometry.animations[ 1 ]);
    action.run = mixer.clipAction(geometry.animations[ 2 ]);
    action.walk = mixer.clipAction(geometry.animations[ 1 ]);
//
    action.hello.setEffectiveWeight(1);
    action.idle.setEffectiveWeight(1);
    action.run.setEffectiveWeight(1);
    action.walk.setEffectiveWeight(1);

    action.hello.setLoop(THREE.LoopOnce, 0);
    action.hello.clampWhenFinished = true;

    action.hello.enabled = true;
    action.idle.enabled = true;
    action.run.enabled = true;
    action.walk.enabled = true;

    action.alert = mixer.clipAction(geometry.animations[ 2 ]);
    action.alert.setEffectiveWeight(1);
    action.alert.enabled = true;


    scene.add(character);

    harryAnimate();
//
    isLoaded = true;
//
    action.idle.play();
  });
}

function fadeAction (name) {
  var from = action[ activeActionName ].play();
  var to = action[ name ].play();

  from.enabled = true;
  to.enabled = true;

  if (to.loop === THREE.LoopOnce) {
    to.reset();
  }

  from.crossFadeTo(to, 0.3);
  activeActionName = name;

}


function harryAnimate () {
  requestAnimationFrame(harryAnimate);
  harryRender();

}

function harryRender () {
  var delta = clock.getDelta();
  mixer.update(delta);
}
