var scene, camera, renderer, light, mouse;
var WIDTH,HEIGHT;

var points = [];
var curve,tubeGeom,tubeMat,tubeMesh,splineMesh,tubeGeom_cpy;
var textureLoader,tex;

var buffer;
var baseShader, feedbackShader;
var baseTex, tex1, tex2, tempTex;
var baseMesh, feedbackMesh;

init();
render();


function init(){
  mouse = {
    position: {x: 0,y:0},
    target: {x:0,y: 0}
  }
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x222222, 0.6, 2.8);
  camera = new THREE.PerspectiveCamera(75, WIDTH/HEIGHT, 0.0091, 5000);
  camera.position.z = 5;
  // camera.position.z = -50;
  camera.rotation.z = Math.PI;

  light = new THREE.HemisphereLight( 0xe9eff2, 0x01010f, 3 );

  scene.add(light);

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setSize(WIDTH,HEIGHT);
  initFeedback();

  document.body.appendChild(renderer.domElement);
  document.addEventListener( 'mousemove', onMouseMove, false );

  textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = "Anonymous"
  textureLoader.load('assets/galaxy.jpg',function(texture){
    tex = texture;
    // tex.wrapS = THREE.RepeatWrapping;
    // tex.wrapT = THREE.RepeatWrapping;
    // tex.repeat.set(30,6);
    createTube();
  });


}

function initFeedback(){
  buffer = new THREE.Scene();
	tex1 = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  tex2 = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  tempTex = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });

  // renderer.setSize(window.innerWidth,window.innerHeight);

  var geometry = new THREE.PlaneBufferGeometry(WIDTH, HEIGHT);

  baseTex = new THREE.ImageUtils.loadTexture();

  baseShader = new THREE.ShaderMaterial({
  uniforms: {
      tex: { type: 't', value: baseTex},
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent
  });

  baseMesh = new THREE.Mesh(geometry, baseShader);


  buffer.add(camera)
  buffer.add(baseMesh);

  feedbackShader = new THREE.ShaderMaterial({
    uniforms: {
      tex: { type: 't', value: tex1 },
      step_w: { type: 'f', value: 1.0/WIDTH },
      step_h: { type: 'f', value: 1.0/HEIGHT }
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('sharpenShader').textContent,
    side:THREE.DoubleSide,
    depthTest:true
  });
  feedbackShader.uniforms.tex.value = tex1;

  feedbackMesh = new THREE.Mesh(geometry, feedbackShader);
  scene.add(camera);
  scene.add(feedbackMesh);
}
function renderFeedback(){
  baseShader.uniforms.tex.value = baseTex;
	feedbackShader.uniforms.tex.value = tex1;

	feedbackShader.uniforms.step_w.value = mouse.position.x;
	feedbackShader.uniforms.step_h.value = mouse.position.y ;

	renderer.render(scene, camera, tex2, false);

	renderer.render(scene, camera);
	// composer.render();
	//swap buffers
	tempTex = tex2;
	tex2 = tex1;
	tex1 = tempTex;

  feedbackMesh.position.z = -430;




}
function createTube(){
  for(var i = 0; i < 5; i++ ){
    points.push( new THREE.Vector3(0,0,2.5*(i/4)));
  }
  points[4].y = -0.06;

  curve = new THREE.CatmullRomCurve3(points);
  tubeGeom = new THREE.TubeGeometry(curve,70,0.02,50,false);
  tubeMat = new THREE.MeshStandardMaterial({
    side: THREE.BackSide,
    map: tex
  });

  var geometry = new THREE.Geometry();
  // Create vertices based on the curve
  geometry.vertices = this.curve.getPoints(70);
  // Create a line from the points with a basic line material
  splineMesh = new THREE.Line(geometry, new THREE.LineBasicMaterial());

  tubeMat.map.wrapS = THREE.RepeatWrapping;
  tubeMat.map.wrapT = THREE.RepeatWrapping;
  tubeMat.map.repeat.set(2,1);


  tubeMesh = new THREE.Mesh(tubeGeom,tubeMat);
  tubeMesh.position.z = 2.90;
  tubeMesh.scale.x = 4.5;
  tubeMesh.scale.y = 4.5;
  tubeGeom_cpy = tubeGeom.clone();

  scene.add(tubeMesh);




  // var geometry = new THREE.OctahedronGeometry(20);
  // var mesh = new THREE.Mesh(geometry,tubeMat);
  // scene.add(mesh);
}

function render(){
  requestAnimationFrame(render);
  // renderer.render(scene,camera);
  renderFeedback();

  updateCameraPosition();
  if(curve){updateCurve();}


}

function updateCurve(){
  if(tubeMat){
  tubeMat.map.offset.x -= (mouse.position.y) * 0.0575;
  }
  var index = 0, vertice_o = null, vertice = null;
  // For each vertice of the tube, move it a bit based on the spline
  for (var i = 0, j = tubeGeom.vertices.length; i < j; i += 1) {
    // Get the original tube vertice
    vertice_o = tubeGeom_cpy.vertices[i];
    // Get the visible tube vertice
    vertice = tubeGeom.vertices[i];
    // Calculate index of the vertice based on the Z axis
    // The tube is made of 50 rings of vertices
    index = Math.floor(i / 50);
    // Update tube vertice
    vertice.x +=
      (vertice_o.x + splineMesh.geometry.vertices[index].x - vertice.x) /
      10;
    vertice.y +=
      (vertice_o.y + splineMesh.geometry.vertices[index].y - vertice.y) /
      5;
  }
  // Warn ThreeJs that the points have changed
  tubeGeom.verticesNeedUpdate = true;

  // Update the points along the curve base on mouse position
  curve.points[2].x = -mouse.position.x * 0.51;
  curve.points[4].x = -mouse.position.y * 0.51;
  curve.points[4].y = -mouse.position.y * 0.521;
  curve.points[2].y = mouse.position.y * 0.51;

  // Warn ThreeJs that the spline has changed
  splineMesh.geometry.verticesNeedUpdate = true;
  splineMesh.geometry.vertices = curve.getPoints(70);
}

function onMouseMove(e){
  mouse.target.x = (e.clientX - WIDTH/2) /WIDTH/2;
  mouse.target.y = (HEIGHT/2 - e.clientY)/HEIGHT/2;
}

function updateCameraPosition() {
  // Update the mouse position with some lerp
  mouse.position.x += (mouse.target.x - mouse.position.x) / 20;
  mouse.position.y += (mouse.target.y - mouse.position.y) / 20;

  // Rotate Z & Y axis
  camera.rotation.z = mouse.position.y * 0.002;
  // camera.rotation.y = mouse.position.x * 0.008;
  // // Move a bit the camera horizontally & vertically
  camera.position.x = mouse.position.x * 0.0025;
  camera.position.y = -mouse.position.y * 0.000025;
}
