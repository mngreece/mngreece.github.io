var closestObject = -1;

;(function(){
    var markerToModel =
        [
            ["9507387", "default"],
            ["1862001", 'brown-sidetable'],
            ["1862001", 'brown-double-basin']
        ];
    //////////////////////////////////////////////////////////////////////////////////
    //		Init
    //////////////////////////////////////////////////////////////////////////////////

    // init renderer
    var renderer	= new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });
    harryInit();
    renderer.setClearColor(new THREE.Color('lightgrey'), 0)
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.top = '0px'
    renderer.domElement.style.left = '0px'
    document.body.appendChild( renderer.domElement );

    // init scene and camera
    var scene	= new THREE.Scene();
    // array of functions for the rendering loop
    var onRenderFcts= [];

    ////////////////////////////////////////////////////////////////////////////////
    //          handle urlOptions
    ////////////////////////////////////////////////////////////////////////////////

    var hasHash = location.hash.substring(1) !== '' ? true : false
    if( hasHash === true ){
        var urlOptions = JSON.parse(decodeURIComponent(location.hash.substring(1)))
    }else{
        var urlOptions = {
            trackingBackend: 'artoolkit',
        }
    }
    window.urlOptions = urlOptions
    urlOptionsUpdate()
    function urlOptionsUpdate(){
        location.hash = '#'+encodeURIComponent(JSON.stringify(urlOptions))
    }

    //////////////////////////////////////////////////////////////////////////////////
    //		Initialize a basic camera
    //////////////////////////////////////////////////////////////////////////////////

    // Create a camera
    if( urlOptions.trackingBackend === 'artoolkit' ){
        var camera = new THREE.Camera();
    }else if( urlOptions.trackingBackend === 'aruco' ){
        var camera = new THREE.PerspectiveCamera(42, renderer.domElement.width / renderer.domElement.height, 0.01, 100);
    }else console.assert(false)
    scene.add(camera);

    ////////////////////////////////////////////////////////////////////////////////
    //          handle arToolkitSource
    ////////////////////////////////////////////////////////////////////////////////

    var artoolkitProfile = new ARjs.Profile()
    artoolkitProfile.sourceWebcam()
        .trackingBackend(urlOptions.trackingBackend)
    console.log(artoolkitProfile);
    var arToolkitSource = new ARjs.Source(artoolkitProfile.sourceParameters)

    arToolkitSource.init(function onReady(){
        onResize()
    })

    // handle resize
    window.addEventListener('resize', function(){
        onResize()
    })
    function onResize(){
        arToolkitSource.onResizeElement()
        arToolkitSource.copyElementSizeTo(renderer.domElement)
        if( urlOptions.trackingBackend === 'artoolkit' ){
            if( arToolkitContext.arController !== null ){
                arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas)
            }
        }else if( urlOptions.trackingBackend === 'aruco' ){
            arToolkitSource.copyElementSizeTo(arToolkitContext.arucoContext.canvas)
            camera.aspect = renderer.domElement.width / renderer.domElement.height;
            camera.updateProjectionMatrix();
        }else console.assert(false)
    }

    ////////////////////////////////////////////////////////////////////////////////
    //          initialize arToolkitContext
    ////////////////////////////////////////////////////////////////////////////////

    // create atToolkitContext
    var arToolkitContext = new ARjs.Context(artoolkitProfile.contextParameters)
    // initialize it
    arToolkitContext.init(function onCompleted(){
        // if artoolkit, copy projection matrix to camera
        if( arToolkitContext.parameters.trackingBackend === 'artoolkit' ){
            camera.projectionMatrix.copy( arToolkitContext.getProjectionMatrix() );
        }
    })

    // update artoolkit on every frame
    onRenderFcts.push(function(){
        if( arToolkitSource.ready === false )	return

        arToolkitContext.update( arToolkitSource.domElement )
    })

    //////////////////////////////////////////////////////////////////////////////
    //		get multiMarkerFile
    //////////////////////////////////////////////////////////////////////////////

    function getMarkers(trackingBackend) {

        var file = THREEx.ArMultiMarkerUtils.createDefaultMultiMarkerFile(trackingBackend);

        file.subMarkersControls = [];

        file.subMarkersControls.push( {
                parameters: {
                    type : 'pattern',
                    patternUrl : '/models/obj/harry/default/pattern-marker.patt',
                },
                poseMatrix: new THREE.Matrix4().makeTranslation(0,0, 0).toArray()
            }
        );

        markerToModel.forEach(function(m) {

            file.subMarkersControls.push( {
                    parameters: {
                        type : 'pattern',
                        patternUrl : '/models/obj/'+m[0]+'/'+m[1]+'/pattern-marker.patt',
                    },
                    poseMatrix: new THREE.Matrix4().makeTranslation(0,0, 0).toArray()
                }
            );

        })

        return JSON.stringify(file);
    }

    multiMarkerFile = getMarkers(urlOptions.trackingBackend);

    //////////////////////////////////////////////////////////////////////////////
    //		Create ArMultiMarkerControls
    //////////////////////////////////////////////////////////////////////////////
    // build a markerRoot
    var markerRoot = new THREE.Group()
    scene.add(markerRoot)

    // build a multiMarkerControls
    var multiMarkerControls = THREEx.ArMultiMarkerControls.fromJSON(arToolkitContext, scene, markerRoot, multiMarkerFile)

    // build a smoothedControls
    var smoothedRoot = new THREE.Group()
    scene.add(smoothedRoot)
    var smoothedControls = new THREEx.ArSmoothedControls(smoothedRoot)
    onRenderFcts.push(function(delta){
        // update smoothedControls parameters depending on how many markers are visible in multiMarkerControls
        multiMarkerControls.updateSmoothedControls(smoothedControls)
        // update smoothedControls position
        smoothedControls.update(markerRoot)
    })

    //////////////////////////////////////////////////////////////////////////////
    //		markerHelpers
    //////////////////////////////////////////////////////////////////////////////

    // display THREEx.ArMarkerHelper if needed - useful to debug
    var markerHelpers = []
    multiMarkerControls.subMarkersControls.forEach(function(subMarkerControls){
        // add an helper to visuable each sub-marker
        var markerHelper = new THREEx.ArMarkerHelper(subMarkerControls)

        var url = subMarkerControls.parameters.patternUrl.split('/');
        markerHelper.object3d.name = "marker-"+markerHelpers.length;

console.log(markerHelpers);

        markerHelpers.push(markerHelper)


        if (url[(url.length-3)] == 'harry' ){
          addHarry(
              subMarkerControls.object3d
          );
        } else {
            addProduct(
                url[(url.length-3)],
                url[(url.length-2)],
                subMarkerControls.object3d
            );
        }
    })

    function markerHelpersToggleVisibility(){
        var wasVisible = markerHelpers[0].object3d.visible
        markerHelpers.forEach(function(markerHelper){
            markerHelper.object3d.visible = wasVisible ? false : true
        })
    }
    window.markerHelpersToggleVisibility = markerHelpersToggleVisibility

    //////////////////////////////////////////////////////////////////////////////
    //		init UI
    //////////////////////////////////////////////////////////////////////////////

    // document.querySelector('#recordButton').addEventListener('click', function(){
    //     urlOptionsUpdate()
    //
    //     THREEx.ArMultiMarkerUtils.navigateToLearnerPage('learner.html', urlOptions.trackingBackend)
    // })
    //
    // window.resetMarkerFile = function(){
    //     THREEx.ArMultiMarkerUtils.storeDefaultMultiMarkerFile(urlOptions.trackingBackend)
    //     location.reload()
    // }


    function trackingBackendSet(trackingBackend){
        THREEx.ArMultiMarkerUtils.storeDefaultMultiMarkerFile(trackingBackend)

        urlOptions.trackingBackend = trackingBackend
        urlOptionsUpdate()

        location.reload()
    }
    window.trackingBackendSet = trackingBackendSet

    //////////////////////////////////////////////////////////////////////////////////
    //		Add simple object on smoothedRoot
    //////////////////////////////////////////////////////////////////////////////////


    ;(function(){
        var arWorldRoot = new THREE.Group()
        var averageMatrix = THREEx.ArMultiMarkerControls.computeCenter(multiMarkerFile)
        averageMatrix.decompose(arWorldRoot.position, arWorldRoot.quaternion, arWorldRoot.scale)
        smoothedRoot.add(arWorldRoot)

        var mesh = new THREE.AxisHelper()
        arWorldRoot.add(mesh)


        // add a torus knot
        var geometry	= new THREE.CubeGeometry(1,1,1);
        var material	= new THREE.MeshNormalMaterial({
            transparent : true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        var ambientLight = new THREE.AmbientLight( 0xcccccc, 0.5 );
        ambientLight.position.x = 2;
        arWorldRoot.add( ambientLight );

        var pointLight = new THREE.PointLight( 0x888888, 0.5 );
        arWorldRoot.add( pointLight );
        pointLight.position.x = 5;
        pointLight.position.y = 5;
        pointLight.position.z = 5;

        onRenderFcts.push(function(delta){
            // mesh.rotation.x += delta * Math.PI
        })
    })()

    function addProduct(productNumber, variation, scene){

        var onProgress = function ( xhr ) {

            if ( xhr.lengthComputable ) {

                var percentComplete = xhr.loaded / xhr.total * 100;
                console.log( Math.round( percentComplete, 2 ) + '% downloaded' );

            }

        };

        var onError = function ( xhr ) { };

        THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );

        new THREE.MTLLoader()
            .setPath( '/models/obj/'+productNumber+'/'+variation+'/' )
            .load( productNumber+'.mtl', function ( materials ) {

                materials.preload();

                new THREE.OBJLoader()
                    .setMaterials( materials )
                    .setPath( '/models/obj/'+productNumber+'/'+variation+'/' )
                    .load( productNumber+'.obj', function ( object ) {

                        object.position.y = 0;
                        object.position.z = 0;
                        object.scale.x = 0.5;
                        object.scale.y = 0.5;
                        object.scale.z = 0.5;
                        object.name = productNumber+"-"+variation;
                        scene.add( object );

                    }, onProgress, onError );

            } );
    }

    function addHarry(scene){

      harryLoadModel(scene);

      // var placeholderCube = new THREE.Mesh( new THREE.BoxBufferGeometry( 1, 1, 1 ), new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
      //
      // placeholderCube.name = "harry";
      //
      // scene.add(placeholderCube);
    }

    //////////////////////////////////////////////////////////////////////////////////
    //		render the whole thing on the page
    //////////////////////////////////////////////////////////////////////////////////
    var stats = new Stats();

    var closestDist = 0;
    var harryObject = -1;

    // document.body.appendChild( stats.dom );

    function getMarkerPosition(scene, camera){
        var children = scene.children;

        closestObject = false;
        harryObject = scene.getObjectByName("harry");



        if (harryObject){
closestDist = 100000;

            markerToModel.forEach(function(modelDetails) {



                var markerObject = scene.getObjectByName(modelDetails[0] + '-' + modelDetails[1]);

                if (markerObject && markerObject.parent.visible){
                  var marker = markerObject;
                  var length = marker.parent.position.distanceTo(harryObject.parent.position)

                  if(length < closestDist || !closestObject ){
                     closestDist = length;
                     closestObject = marker;
                  }

                }


                //console.log(m);
                //console.log(m);


           });

           // if (closestObject){
           //  //    harryMarkerObject.rotation = closestObject.rotation;
           //    //  harryMarkerObject.position.x = closestObject.position.x;
           //    //  harryMarkerObject.position.x = closestObject.position.x;
           //    //  console.log(closestObject.name);
           //
           //
           //
           // }
     }
    }

    // render the scene
    onRenderFcts.push(function(){
      getMarkerPosition( scene, camera );
        harryAnimate();

        renderer.render( scene, camera );

        stats.update();
    })





    // run the rendering loop
    var lastTimeMsec= null
    requestAnimationFrame(function animate(nowMsec){
        // keep looping
        requestAnimationFrame( animate );
        // measure time
        lastTimeMsec	= lastTimeMsec || nowMsec-1000/60
        var deltaMsec	= Math.min(200, nowMsec - lastTimeMsec)
        lastTimeMsec	= nowMsec
        // call each update function
        onRenderFcts.forEach(function(onRenderFct){
            onRenderFct(deltaMsec/1000, nowMsec/1000)
        })
    })
})()
