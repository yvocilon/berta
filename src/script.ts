import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

(function () {
  // Set our main variables
  let scene,
    renderer,
    camera,
    model, // Our character
    neck, // Reference to the neck bone in the skeleton
    waist, // Reference to the waist bone in the skeleton
    possibleAnims, // Animations found in our file
    mixer, // THREE.js animations mixer
    idle,
    walkAnim,
    backAnim,
    leftAnim,
    rightAnim,
    jumpAnim,
    controls, // Idle, the default state our character returns to
    clock = new THREE.Clock(), // Used for anims, which run to a clock instead of frame rate
    currentlyAnimating = false, // Used to check whether characters neck is being used in another anim
    raycaster = new THREE.Raycaster(), // Used to detect the click on our character
    direction = "",
    loaderAnim = document.getElementById("js-loader");

  init();

  function init() {
    const MODEL_PATH = "boss.glb";
    const TREE = 'tree.glb';

    const canvas = document.querySelector("#c");
    const backgroundColor = 0xf1f1f1;

    const cubeLoader = new THREE.CubeTextureLoader();
    const cubeTexture = cubeLoader.load([
      'textures/cloudtop_ft.jpg',
      'textures/cloudtop_bk.jpg',
      'textures/cloudtop_up.jpg',
      'textures/cloudtop_dn.jpg',
      'textures/cloudtop_rt.jpg',
      'textures/cloudtop_lf.jpg',
    ]);



    // Init the scene
    scene = new THREE.Scene();
    //scene.background = new THREE.Color(backgroundColor);
    //scene.fog = new THREE.Fog(backgroundColor, 60, 100);
    scene.background = cubeTexture;

    // Init the renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Add a camera
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );

    camera.position.z = 30;
    camera.position.x = 0;
    camera.position.y = -3;

    var loader = new GLTFLoader();

    controls = new OrbitControls(camera, renderer.domElement);

    controls.maxPolarAngle = (Math.PI * 0.60)

    controls.minDistance = 5;
    controls.maxDistance = 100;

    controls.update();

    loader.load(
      MODEL_PATH,
      function (gltf) {
        model = gltf.scene;
        let fileAnimations = gltf.animations;



        model.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.material.metalness = 0;
            //o.material = stacy_mtl;
          }
          o.frustumCulled = false;
        });

        model.frustumCulled = false;

        model.scale.set(6, 6, 6);
        model.position.y = -11;

        scene.add(model);



        loaderAnim.remove();


        mixer = new THREE.AnimationMixer(model);

        let idleAnim = THREE.AnimationClip.findByName(fileAnimations, "idle");

        walkAnim = fileAnimations.find(val => val.name === "run-forward");
        backAnim = fileAnimations.find(val => val.name === "run-backward");
        rightAnim = fileAnimations.find(val => val.name === "strafe-right");
        leftAnim = fileAnimations.find(val => val.name === "strafe-left");
        jumpAnim = fileAnimations.find(val => val.name === "jump");

        idle = mixer.clipAction(idleAnim);

        walkAnim = mixer.clipAction(walkAnim);
        backAnim = mixer.clipAction(backAnim);
        leftAnim = mixer.clipAction(leftAnim);
        rightAnim = mixer.clipAction(rightAnim);

        animate(idle);

      },
      undefined, // We don't need this function
      function (error) {
        console.error(error);
      }
    );

    loader.load(
      TREE,
      function (gltf) {
        const tree = gltf.scene;


        tree.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.material.metalness = 0;
            //o.material = stacy_mtl;
          }
        });

        tree.scale.set(2, 2, 2);
        tree.position.y = -11;
        tree.position.z = -10;
        scene.add(tree);

      },
      undefined, // We don't need this function
      function (error) {
        console.error(error);
      }
    );

    let dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(20, 5, -4);
    dirLight.position.multiplyScalar(30);
    scene.add(dirLight);

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    var d = 150;

    dirLight.shadow.camera.left = - d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = - d;

    dirLight.shadow.camera.far = 3500;
    dirLight.shadow.bias = - 0.0001;

    let dirLightHeper = new THREE.DirectionalLightHelper(dirLight, 10);
    //scene.add(dirLightHeper);


    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    let hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 10);
    // scene.add(hemiLightHelper);

    // Floor
    let floorGeometry = new THREE.PlaneGeometry(250, 250, 1, 1);

    const texture = new THREE.TextureLoader().load('textures/floor.jpg', function (te) {
      te.wrapS = te.wrapT = THREE.RepeatWrapping;
      te.offset.set(0, 0);
      te.repeat.set(20, 20);
    });


    const aoMap = new THREE.TextureLoader().load('textures/floor-ao.jpg', function (te) {
      te.wrapS = te.wrapT = THREE.RepeatWrapping;
      te.offset.set(0, 0);
      te.repeat.set(20, 2);
    });
    const normalMap = new THREE.TextureLoader().load('textures/floor-normal.jpg', function (te) {
      te.wrapS = te.wrapT = THREE.RepeatWrapping;
      te.offset.set(0, 0);
      te.repeat.set(20, 2);
    });
    const roughnessMap = new THREE.TextureLoader().load('textures/floor-roughness.jpg', function (te) {
      te.wrapS = te.wrapT = THREE.RepeatWrapping;
      te.offset.set(0, 0);
      te.repeat.set(20, 2);
    });
    const bumpMap = new THREE.TextureLoader().load('textures/floor-height.jpg', function (te) {
      te.wrapS = te.wrapT = THREE.RepeatWrapping;
      te.offset.set(0, 0);
      te.repeat.set(20, 2);
    });

    let floorMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      aoMap,
      normalMap,
      roughnessMap,
      bumpMap
    });

    let floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -0.5 * Math.PI;
    floor.receiveShadow = true;
    floor.position.y = -11;


    const wall = createWall(250, 25);

    scene.add(wall(0, 0, -125));
    scene.add(wall(0, 0, 125));
    scene.add(wall(-125, 0, 0, Math.PI / 2));
    scene.add(wall(125, 0, 0, Math.PI / 2));

    scene.add(floor);
  }

  const speed = {
    left: 0.4,
    right: 0.4,
    forward: 0.45,
    backward: 0.3,
  }

  function update() {
    if (mixer) {
      mixer.update(clock.getDelta());
    }

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);

    if (direction) {


      switch (direction) {
        case "forward": {
          model.position.z += speed.forward;
          break;
        }
        case "backward": {
          model.position.z -= speed.backward;
          break;
        }
        case "left": {
          model.position.x += speed.left;
          break;
        }
        case "right": {
          model.position.x -= speed.right;
          break;
        }
      }
    }

    if (model) {
      controls.target = new THREE.Vector3(model.position.x, model.position.y + 10, model.position.z)
    }


    controls.update();

    requestAnimationFrame(update);
  }

  update();

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let canvasPixelWidth = canvas.width / window.devicePixelRatio;
    let canvasPixelHeight = canvas.height / window.devicePixelRatio;

    const needResize =
      canvasPixelWidth !== width || canvasPixelHeight !== height;

    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  const map = {
    87: "forward", //w
    68: "right", //d
    65: "left", // a
    83: "backward", // s
    38: "forward",
    39: "right", //d
    37: "left", // a
    40: "backward", // s
    32: "jump" //spacebar
  };

  function onKeyUp(event) {
    const key = map[event.which];

    if (key === direction) {
      fadeToIdle();
    }
  }

  let currentAnimation;

  function animate(to) {

    if (!currentAnimation) {
      currentAnimation = to;

      currentAnimation.play();
      return;
    }

    to.reset();
    to.play();

    currentAnimation.crossFadeTo(to, 0.25, true);
    currentAnimation = to;
  }

  function onKeyDown(event) {
    const key = map[event.which];

    const dontUpdate = direction === key;

    if (key) {
      direction = key;

      if (dontUpdate) {
        return;
      }

      if (key === 'jump') {
        animate(jumpAnim);
      }

      if (key === "forward") {
        animate(walkAnim);
      }

      if (key === "backward") {
        animate(backAnim);
      }
      if (key === "left") {
        animate(leftAnim);
      }

      if (key === "right") {
        animate(rightAnim);
      }

    } else {
      fadeToIdle();
    }
  }

  function fadeToIdle() {

    animate(idle);

    direction = '';
  }

  function createWall(width: number, height: number) {


    var geometry = new THREE.BoxGeometry(width, height, 1);


    const texture = new THREE.TextureLoader().load('textures/wall.jpg', function (te) {
      te.wrapS = te.wrapT = THREE.RepeatWrapping;
      te.offset.set(0, 0);
      te.repeat.set(20, 2);
    });


    const aoMap = new THREE.TextureLoader().load('textures/wall-ao.jpg', function (te) {
      te.wrapS = te.wrapT = THREE.RepeatWrapping;
      te.offset.set(0, 0);
      te.repeat.set(20, 2);
    });
    const normalMap = new THREE.TextureLoader().load('textures/wall-normal.jpg', function (te) {
      te.wrapS = te.wrapT = THREE.RepeatWrapping;
      te.offset.set(0, 0);
      te.repeat.set(20, 2);
    });
    const roughnessMap = new THREE.TextureLoader().load('textures/wall-roughness.jpg', function (te) {
      te.wrapS = te.wrapT = THREE.RepeatWrapping;
      te.offset.set(0, 0);
      te.repeat.set(20, 2);
    });
    const bumpMap = new THREE.TextureLoader().load('textures/wall-height.jpg', function (te) {
      te.wrapS = te.wrapT = THREE.RepeatWrapping;
      te.offset.set(0, 0);
      te.repeat.set(20, 2);
    });

    let material = new THREE.MeshStandardMaterial({
      map: texture,
      aoMap,
      normalMap,
      roughnessMap,
      bumpMap,
    });

    return function (x: number, y: number, z: number, rotation?: number) {

      var cube = new THREE.Mesh(geometry, material);
      cube.receiveShadow = true;
      cube.castShadow = true;
      cube.position.x = x;
      cube.position.y = y;
      cube.position.z = z;

      if (rotation) {
        cube.rotation.y = rotation;
      }


      return cube;
    }
  }
})();
