;(function(){
    //////////////////////////////////////////////////////////////////////////////////
    //		Init
    //////////////////////////////////////////////////////////////////////////////////

    // init renderer
    var renderer	= new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });
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
    console.log(arToolkitContext);
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

    // if no localStorage.ARjsMultiMarkerFile, then write one with default marker
    if( localStorage.getItem('ARjsMultiMarkerFile') === null ){
        THREEx.ArMultiMarkerUtils.storeDefaultMultiMarkerFile(urlOptions.trackingBackend)
    }

    // get multiMarkerFile from localStorage
    console.assert( localStorage.getItem('ARjsMultiMarkerFile') !== null )
    var multiMarkerFile = localStorage.getItem('ARjsMultiMarkerFile')

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
    var markerToModel = {"http://127.0.0.1:8080/ar.js/examples/marker-training/examples/pattern-files/pattern-letterC.patt":[9507387, 'default'],
    "http://127.0.0.1:8080/ar.js/examples/marker-training/examples/pattern-files/pattern-letterB.patt":[1862001, 'brown-sidetable'],
    "http://127.0.0.1:8080/ar.js/examples/marker-training/examples/pattern-files/pattern-letterA.patt":[9507387, 'default'],
    "http://127.0.0.1:8080/ar.js/examples/marker-training/examples/pattern-files/pattern-letterF.patt":[1862001, 'default'],
    "http://127.0.0.1:8080/ar.js/examples/marker-training/examples/pattern-files/pattern-hiro.patt":[1862001, 'default']};
    console.log("test");
    multiMarkerControls.subMarkersControls.forEach(function(subMarkerControls){
        // add an helper to visuable each sub-marker
        var markerHelper = new THREEx.ArMarkerHelper(subMarkerControls)

        markerHelpers.push(markerHelper)
        // subMarkerControls.object3d.add( markerHelper.object3d )
        console.log(subMarkerControls);
        addProduct(
          markerToModel[subMarkerControls.parameters.patternUrl][0],
          markerToModel[subMarkerControls.parameters.patternUrl][1],
          subMarkerControls.object3d
        );
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

    document.querySelector('#recordButton').addEventListener('click', function(){
        urlOptionsUpdate()

        THREEx.ArMultiMarkerUtils.navigateToLearnerPage('learner.html', urlOptions.trackingBackend)
    })

    window.resetMarkerFile = function(){
        THREEx.ArMultiMarkerUtils.storeDefaultMultiMarkerFile(urlOptions.trackingBackend)
        location.reload()
    }


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
        // markerRoot.add(arWorldRoot)


        // var screenAsPortal = new THREEx.ScreenAsPortal(multiMarkerFile)
        // arWorldRoot.add(screenAsPortal.object3d)

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
                        scene.add( object );

                    }, onProgress, onError );

            } );
    }

    //////////////////////////////////////////////////////////////////////////////////
    //		render the whole thing on the page
    //////////////////////////////////////////////////////////////////////////////////
    var stats = new Stats();
    // document.body.appendChild( stats.dom );

    // render the scene
    onRenderFcts.push(function(){
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
