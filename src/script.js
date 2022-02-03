import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import * as CANNON from 'cannon-es'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'

/**
 * Debug
 */
const gui = new dat.GUI()
const debugObject = {}

// debugObject.reset = () => {
//     for (const object of objectsToUpdate) {
//         // Remove body
//         object.body.removeEventListener('collide', playHitSound)
//         world.removeBody(object.body)
//         // Remove mesh
//         scene.remove(object.mesh)
//     }
// }
// gui.add(debugObject, 'reset')

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])

/**
 * Physics
 */
// World
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world)
// world.allowSleep = true
world.gravity.set(0,-9.82,0)

// Materials
const defaultMaterial = new CANNON.Material('default')

const phongMaterial = new THREE.MeshPhongMaterial()

const groundMaterial = new CANNON.Material('groundMaterial')
// groundMaterial.friction = 0.7
groundMaterial.restitution = 0

const wheelMaterial = new CANNON.Material('wheelMaterial')
// wheelMaterial.friction = 0.2
wheelMaterial.restitution = 0.4

const groundWheelContactMaterial = new CANNON.ContactMaterial(
    groundMaterial,
    wheelMaterial,
    {
        friction: .3,
        restitution: 0,
        // contactEquationStiffness: 1000,
    }
)
world.addContactMaterial(groundWheelContactMaterial)
// world.defaultContactMaterial = defaultContactMaterial

/**
 * Floor
 */
// Three.js
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)
// Cannon.js
const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body({
    mass: 0,
    material: groundMaterial
})
floorBody.addShape(floorShape)
// floorBody.position.set(0,-1,0)
floorBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(- 1, 0, 0),
    Math.PI * .5
)
world.addBody(floorBody)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(2048, 2048)
directionalLight.shadow.camera.far = 150
directionalLight.shadow.camera.left = - 40
directionalLight.shadow.camera.top = 40
directionalLight.shadow.camera.right = 40
directionalLight.shadow.camera.bottom = - 40
directionalLight.position.set(5, 40, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(20, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(- 12, 6, 10)
scene.add(camera)
// Car camera
const chaseCam = new THREE.Object3D()
chaseCam.position.set(0, 0, 0)
const chaseCamPivot = new THREE.Object3D()
// chaseCamPivot.position.set(0, 1, 12)
chaseCam.add(chaseCamPivot)
scene.add(chaseCam)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Utils
 */
const objectsToUpdate = []

// Sphere
const sphereGeometry = new THREE.SphereBufferGeometry(1, 20, 20)
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: .3,
    roughness: .4,
    envMap: environmentMapTexture
})

const createSphere = (radius, position) => {
    // Three.js mesh
    const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
    mesh.scale.set(radius, radius, radius)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    // Cannon.js body
    const shape = new CANNON.Sphere(radius)
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 3, 0),
        shape,
        material: defaultMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide', playHitSound)
    world.addBody(body)

    // Save in objects to update
    objectsToUpdate.push({
        mesh,
        body
    })
}

// createSphere(.5, {x: 0, y: 3, z: 0})

/**
 * Vehicle
 */
const gltfLoader = new GLTFLoader()
// Lamborghini 3D model
let parts = 0
let lamborghiniHuracan = null
let position = new THREE.Vector3()
let dimensions = new THREE.Vector3()
gltfLoader.load(
    'models/prova.glb',
    (gltf) => {
        lamborghiniHuracan = gltf.scene
        parts++
        // lamborghiniHuracan.scale.set(.01,.01,.01)
        // lamborghiniHuracan.scale.set(.5,.5,.5)
        lamborghiniHuracan.getWorldPosition(position)
        console.log(position);
        const boundingBox = new THREE.Box3().setFromObject(lamborghiniHuracan)
        boundingBox.getSize(dimensions)
        console.log(dimensions);
        // lamborghiniHuracan.up = 0
    }
)
let fLWheel = null
gltfLoader.load(
    'models/flwheel.glb',
    (gltf) => {
        fLWheel = gltf.scene
        for (const part of fLWheel.children) {
            
            // part.geometry.translate(0, 0, .7)
            // part.rotation.z = Math.PI
            part.castShadow = true
            part.receiveShadow = true
            // part.geometry.center()
        }
        console.log(fLWheel);
        parts++
        // fLWheel.scale.set(.5,.5,.5)
        // let wp = new THREE.Vector3()
        // fLWheel.getWorldPosition(wp)
        // console.log(wp);
    }
)
// let fRWheel = null
// gltfLoader.load(
//     'models/frwheel.glb',
//     (gltf) => {
//         fRWheel = gltf.scene
//     }
// )

const waitForCar = () => {
    if (parts == 2) {
        scene.add(lamborghiniHuracan)
        console.log(lamborghiniHuracan);
        // Three.js
        // const carBodyGeometry = new THREE.BoxGeometry(1, 1, 2)
        // const carBodyMesh = new THREE.Mesh(carBodyGeometry, phongMaterial)
        const carBodyMesh = lamborghiniHuracan
        // let wheelLFMesh = null
        let wheelRFMesh = null
        let wheelRBMesh = null
        let wheelLBMesh = null
        for (const part of lamborghiniHuracan.children) {
            // part.geometry.translate(0, 0, 1.3635436557324039)
            part.castShadow = true
            part.receiveShadow = true
            // part.position.set(0,0,0)
            // part.geometry.translate(0, -2, 0)
            // if (part.name == "body_01") {
                // carBodyMesh = part
                // part.geometry.rotateX(Math.PI * .5)
                // part.geometry.rotateY(Math.PI)
                // carBodyMesh.quaternion.set(0,0,0)
                // carBodyMesh.rotation.z = Math.PI * .5
                // carBodyMesh.rotation.x = Math.PI * .5
                // carBodyMesh.rotation.y = Math.PI * .5
                // console.log(carBodyMesh);
            // }
            if (part.name == "tire_01") {
                part.geometry.center()
                wheelLBMesh = part
            }
            if (part.name == "tire_02") {
                part.geometry.center()
                wheelRBMesh = part
            }
            // if (part.name == "tire_03") {
            //     part.geometry.center()
            //     wheelLFMesh = part
            // }
            if (part.name == "tire_04") {
                part.geometry.center()
                wheelRFMesh = part
            }
        }
        // carBodyMesh.scale.set(.01,.01,.01)
        carBodyMesh.position.y = 4
        carBodyMesh.castShadow = true
        scene.add(carBodyMesh)
        carBodyMesh.add(chaseCam)
        // Cannon.es
        const carBodyShape = new CANNON.Box(new CANNON.Vec3(dimensions.x, dimensions.y, dimensions.z))
        const carBody = new CANNON.Body({ mass: 50 })
        carBody.addShape(carBodyShape)
        carBody.position.x = carBodyMesh.position.x
        carBody.position.y = carBodyMesh.position.y
        carBody.position.z = carBodyMesh.position.z
        world.addBody(carBody)

        //front left wheel
        // const wheelLFGeometry = new THREE.CylinderGeometry(
        //     0.33,
        //     0.33,
        //     0.2
        // )
        // wheelLFGeometry.rotateZ(Math.PI / 2)
        // const wheelLFMesh = new THREE.Mesh(wheelLFGeometry, phongMaterial)
        // wheelLFMesh.translateX(.839)
        // wheelLFMesh.translateY(-1.19)
        // wheelLFMesh.translateZ(.33)
        // wheelLFMesh.castShadow = true
        // wheelLFMesh = fLWheel
        // wheelLFMesh.scale.set(.01,.01,.01)
        const wheelLFMesh = fLWheel
        scene.add(wheelLFMesh)
        const wheelLFShape = new CANNON.Sphere(.334)
        const wheelLFBody = new CANNON.Body({ mass: 5, material: wheelMaterial })
        wheelLFBody.addShape(wheelLFShape)
        wheelLFBody.position.x = wheelLFMesh.position.x
        wheelLFBody.position.y = wheelLFMesh.position.y
        wheelLFBody.position.z = wheelLFMesh.position.z
        world.addBody(wheelLFBody)

        //front right wheel
        // const wheelRFGeometry = new THREE.CylinderGeometry(
        //     0.33,
        //     0.33,
        //     0.2
        // )
        // wheelRFGeometry.rotateZ(Math.PI / 2)
        // const wheelRFMesh = new THREE.Mesh(wheelRFGeometry, phongMaterial)
        // wheelRFMesh.position.y = 3
        // wheelRFMesh.position.x = 1
        // wheelRFMesh.position.z = -1
        // wheelRFMesh.castShadow = true
        // scene.add(wheelRFMesh)
        // wheelRFMesh = fRWheel
        // wheelRFMesh.scale.set(.01,.01,.01)
        scene.add(wheelRFMesh)
        const wheelRFShape = new CANNON.Sphere(.334)
        const wheelRFBody = new CANNON.Body({ mass: 5, material: wheelMaterial })
        wheelRFBody.addShape(wheelRFShape)
        wheelRFBody.position.x = wheelRFMesh.position.x
        wheelRFBody.position.y = wheelRFMesh.position.y
        wheelRFBody.position.z = wheelRFMesh.position.z
        world.addBody(wheelRFBody)

        //back left wheel
        // const wheelLBGeometry = new THREE.CylinderGeometry(
        //     .4,
        //     .4,
        //     .33
        // )
        // wheelLBGeometry.rotateZ(Math.PI / 2)
        // const wheelLBMesh = new THREE.Mesh(wheelLBGeometry, phongMaterial)
        // wheelLBMesh.position.y = 3
        // wheelLBMesh.position.x = -1
        // wheelLBMesh.position.z = 1
        // wheelLBMesh.castShadow = true
        // wheelLBMesh.scale.set(.01,.01,.01)
        scene.add(wheelLBMesh)
        const wheelLBShape = new CANNON.Sphere(.35)
        const wheelLBBody = new CANNON.Body({ mass: 5, material: wheelMaterial })
        wheelLBBody.addShape(wheelLBShape)
        wheelLBBody.position.x = wheelLBMesh.position.x
        wheelLBBody.position.y = wheelLBMesh.position.y
        wheelLBBody.position.z = wheelLBMesh.position.z
        world.addBody(wheelLBBody)

        //back right wheel
        // const wheelRBGeometry = new THREE.CylinderGeometry(
        //     .4,
        //     .4,
        //     .33
        // )
        // wheelRBGeometry.rotateZ(Math.PI / 2)
        // const wheelRBMesh = new THREE.Mesh(wheelRBGeometry, phongMaterial)
        // wheelRBMesh.position.y = 3
        // wheelRBMesh.position.x = 1
        // wheelRBMesh.position.z = 1
        // wheelRBMesh.castShadow = true
        // wheelRBMesh.scale.set(.01,.01,.01)
        scene.add(wheelRBMesh)
        const wheelRBShape = new CANNON.Sphere(.35)
        const wheelRBBody = new CANNON.Body({ mass: 5, material: wheelMaterial })
        wheelRBBody.addShape(wheelRBShape)
        wheelRBBody.position.x = wheelRBMesh.position.x
        wheelRBBody.position.y = wheelRBMesh.position.y
        wheelRBBody.position.z = wheelRBMesh.position.z
        world.addBody(wheelRBBody)

        const leftFrontAxis = new CANNON.Vec3(1, 0, 0)
        const rightFrontAxis = new CANNON.Vec3(1, 0, 0)
        const leftBackAxis = new CANNON.Vec3(1, 0, 0)
        const rightBackAxis = new CANNON.Vec3(1, 0, 0)

        const constraintLF = new CANNON.HingeConstraint(carBody, wheelLFBody, {
            pivotA: new CANNON.Vec3(-.833, -1, -1.19133),
            axisA: leftFrontAxis,
            maxForce: 200,
            // collideConnected: false
        })
        world.addConstraint(constraintLF)
        const constraintRF = new CANNON.HingeConstraint(carBody, wheelRFBody, {
            pivotA: new CANNON.Vec3(.833, -1, -1.19133),
            axisA: rightFrontAxis,
            maxForce: 200,
            // collideConnected: false
        })
        world.addConstraint(constraintRF)
        const constraintLB = new CANNON.HingeConstraint(carBody, wheelLBBody, {
            pivotA: new CANNON.Vec3(-.8257, -1, 1.41825),
            axisA: leftBackAxis,
            maxForce: 200,
            // collideConnected: false
        })
        world.addConstraint(constraintLB)
        const constraintRB = new CANNON.HingeConstraint(carBody, wheelRBBody, {
            pivotA: new CANNON.Vec3(.8257, -1, 1.41825),
            axisA: rightBackAxis,
            maxForce: 200,
            // collideConnected: false
        })
        world.addConstraint(constraintRB)

        //rear wheel drive
        constraintLB.enableMotor()
        constraintRB.enableMotor()

        const keyMap = {}
        const onDocumentKey = (e) => {
            keyMap[e.key] = e.type === 'keydown'
            return false
        }

        let forwardVelocity = 0
        let rightVelocity = 0

        document.addEventListener('keydown', onDocumentKey, false)
        document.addEventListener('keyup', onDocumentKey, false)

        // let mouse = false
        // document.addEventListener('mousedown', () => {
        //     mouse = true
        //     console.log(mouse);
        // })
        // document.addEventListener('mouseup', () => {
        //     mouse = false
        //     console.log(mouse);
        // })



        /**
         * Animate
         */
        const clock = new THREE.Clock()
        let oldElapsedTime = 0

        const v = new THREE.Vector3()
        let thrusting = false
        let steering = false


        const tick = () =>
        {
            const elapsedTime = clock.getElapsedTime()
            const deltaTime = elapsedTime - oldElapsedTime
            oldElapsedTime = elapsedTime

            // Update physics world

            world.step(1 / 60, deltaTime, 3)

            // Copy coordinates from Cannon to Three.js
            carBodyMesh.position.set(
                carBody.position.x,
                carBody.position.y,
                carBody.position.z
            )
            carBodyMesh.quaternion.set(
                carBody.quaternion.x,
                carBody.quaternion.y,
                carBody.quaternion.z,
                carBody.quaternion.w
            )

            wheelLFMesh.position.set(
                wheelLFBody.position.x,
                wheelLFBody.position.y,
                wheelLFBody.position.z
            )
            wheelLFMesh.quaternion.set(
                wheelLFBody.quaternion.x,
                wheelLFBody.quaternion.y,
                wheelLFBody.quaternion.z,
                wheelLFBody.quaternion.w
            )

            wheelRFMesh.position.set(
                wheelRFBody.position.x,
                wheelRFBody.position.y,
                wheelRFBody.position.z
            )
            wheelRFMesh.quaternion.set(
                wheelRFBody.quaternion.x,
                wheelRFBody.quaternion.y,
                wheelRFBody.quaternion.z,
                wheelRFBody.quaternion.w
            )

            wheelLBMesh.position.set(
                wheelLBBody.position.x,
                wheelLBBody.position.y,
                wheelLBBody.position.z
            )
            wheelLBMesh.quaternion.set(
                wheelLBBody.quaternion.x,
                wheelLBBody.quaternion.y,
                wheelLBBody.quaternion.z,
                wheelLBBody.quaternion.w
            )

            wheelRBMesh.position.set(
                wheelRBBody.position.x,
                wheelRBBody.position.y,
                wheelRBBody.position.z
            )
            wheelRBMesh.quaternion.set(
                wheelRBBody.quaternion.x,
                wheelRBBody.quaternion.y,
                wheelRBBody.quaternion.z,
                wheelRBBody.quaternion.w
            )

            // move vehicle
            thrusting = false
            steering = false
            if (keyMap['w']) {
                if (forwardVelocity < 10.0) forwardVelocity += .1
                thrusting = true
            }
            if (keyMap['s']) {
                if (forwardVelocity > -10.0) forwardVelocity -= .1
                thrusting = true
            }
            if (keyMap['a']) {
                if (rightVelocity > -.5) rightVelocity -= 0.05
                steering = true
            }
            if (keyMap['d']) {
                if (rightVelocity < .5) rightVelocity += 0.05
                steering = true
            }
            if (keyMap[' ']) {
                if (forwardVelocity > 0) {
                    forwardVelocity -= .3
                }
                if (forwardVelocity < 0) {
                    forwardVelocity += .3
                }
            }
            
            
            if (!thrusting) {
                //not going forward or backwards so gradually slow down
                if (forwardVelocity > 0) {
                    forwardVelocity -= 0.05
                }
                if (forwardVelocity < 0) {
                    forwardVelocity += 0.05
                }
            }
            if (!steering) {
                if (rightVelocity > 0) {
                    rightVelocity -= .05
                }
                if (rightVelocity < 0) {
                    rightVelocity += .05
                }
            }
            
            constraintLB.setMotorSpeed(forwardVelocity)
            constraintRB.setMotorSpeed(forwardVelocity)
            constraintLF.axisA.z = rightVelocity
            constraintRF.axisA.z = rightVelocity

            // if (!mouse) {
                // camera.lookAt(carBodyMesh.position)

                // chaseCamPivot.getWorldPosition(v)
                // if (v.y < 1) {
                //     v.y = 1
                // }
                // camera.position.lerpVectors(camera.position, v, 0.05)
            // }


            // Update controls
            controls.update()

            // Render
            renderer.render(scene, camera)

            // Call tick again on the next frame
            window.requestAnimationFrame(tick)
        }

        tick()
    } else {
        setTimeout(waitForCar, 250);
    }
}

waitForCar()