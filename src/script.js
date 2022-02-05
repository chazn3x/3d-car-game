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
world.allowSleep = true
world.gravity.set(0,-9.82,0)

// Materials
const groundMaterial = new CANNON.Material('groundMaterial')
const wheelMaterial = new CANNON.Material('wheelMaterial')
const wheelGroundContactMaterial = new CANNON.ContactMaterial(
    wheelMaterial,
    groundMaterial,
    {
        friction: .3,
        restitution: 0,
        contactEquationStiffness: 1000,
    }
)
world.addContactMaterial(wheelGroundContactMaterial)
world.defaultContactMaterial.friction = 0

/**
 * Floor
 */
// Three.js
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
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
directionalLight.shadow.mapSize.set(4096 * 2, 4096 * 2)
directionalLight.shadow.camera.far = 2000
directionalLight.shadow.camera.left = - 100
directionalLight.shadow.camera.top = 100
directionalLight.shadow.camera.right = 100
directionalLight.shadow.camera.bottom = - 100
directionalLight.position.set(20, 1000, -20)
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
const camera = new THREE.PerspectiveCamera(32, sizes.width / sizes.height, 0.1, 1000)
// camera.position.set(- 12, 6, 10)
scene.add(camera)
// Car camera
const chaseCam = new THREE.Object3D()
chaseCam.position.set(0, 0, 0)
const chaseCamPivot = new THREE.Object3D()
chaseCamPivot.position.set(-8, 1.5, 0)
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
 * Vehicle
 */
const gltfLoader = new GLTFLoader()
// Lamborghini 3D model
let parts = 0
let lamborghiniHuracan = null
let dimensions = new THREE.Vector3()
gltfLoader.load(
    'models/prova4.glb',
    (gltf) => {
        lamborghiniHuracan = gltf.scene
        parts++
        const boundingBox = new THREE.Box3().setFromObject(lamborghiniHuracan)
        boundingBox.getSize(dimensions)
    }
)
// let fLWheel = null
// gltfLoader.load(
//     'models/flwheel2.glb',
//     (gltf) => {
//         fLWheel = gltf.scene
//         for (const part of fLWheel.children) {
            
//             // part.geometry.translate(0, 0, .7)
//             // part.rotation.z = Math.PI
//             part.castShadow = true
//             part.receiveShadow = true
//             // part.geometry.center()
//         }
//         console.log(fLWheel);
//         parts++
//         // fLWheel.scale.set(.5,.5,.5)
//         // let wp = new THREE.Vector3()
//         // fLWheel.getWorldPosition(wp)
//         // console.log(wp);
//     }
// )
// let fRWheel = null
// gltfLoader.load(
//     'models/frwheel.glb',
//     (gltf) => {
//         fRWheel = gltf.scene
//     }
// )

const waitForCar = () => {
    if (parts == 1) {
        // Three.js
        // Cannon.es
        const chassisShape = new CANNON.Box(new CANNON.Vec3(dimensions.x * .5, dimensions.y * .5, dimensions.z * .5))
        const chassisBody = new CANNON.Body({ mass: 170 })
        chassisBody.addShape(chassisShape)
        chassisBody.position.set(0,2,0)
        chassisBody.angularVelocity.set(0, 0, 0)
        const carBodyMesh = lamborghiniHuracan
        let wheelRFMesh = null
        let wheelRBMesh = null
        let wheelLBMesh = null
        let wheelLFMesh = null
        for (const part of lamborghiniHuracan.children) {
            part.geometry.translate(0, 0, .75)
            part.castShadow = true
            part.receiveShadow = true
            if (part.name == "tire_01") {
                part.geometry.center()
                part.geometry.rotateX(Math.PI * .5)
                wheelLBMesh = part
            }
            if (part.name == "tire_02") {
                part.geometry.center()
                part.geometry.rotateX(Math.PI * .5)
                wheelRBMesh = part
            }
            if (part.name == "tire_03") {
                part.geometry.center()
                part.geometry.rotateX(Math.PI * .5)
                wheelLFMesh = part
            }
            if (part.name == "tire_04") {
                part.geometry.center()
                part.geometry.rotateX(Math.PI * .5)
                wheelRFMesh = part
            }
        }
        carBodyMesh.position.copy(chassisBody.position)
        scene.add(carBodyMesh)
        carBodyMesh.add(chaseCam)

        
        const vehicle = new CANNON.RaycastVehicle({
            chassisBody,
        })

        const wheelOptions = {
            radius: .5,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 200,
            suspensionRestLength: .05,
            frictionSlip: 3.4,
            dampingRelaxation: 10,
            dampingCompression: 6.4,
            maxSuspensionForce: 500000,
            rollInfluence: .01,
            axleLocal: new CANNON.Vec3(0, 0, 1),
            chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, 1),
            maxSuspensionTravel: 0.2,
            customSlidingRotationalSpeed: -5,
            useCustomSlidingRotationalSpeed: true,
        }

        const front = {
            x: 1.42878,
            y: -.338002,
            z: .83953,
            radius: .334
        }
        const back = {
            x: -1.17947,
            y: -.354402,
            z: .82571,
            radius: .35
        }

        const wheelMeshes = []

        // front left
        wheelOptions.chassisConnectionPointLocal.set(front.x, front.y, -front.z)
        wheelOptions.radius = front.radius
        vehicle.addWheel(wheelOptions)
        wheelMeshes.push(wheelLFMesh)

        // front right
        wheelOptions.chassisConnectionPointLocal.set(front.x, front.y, front.z)
        wheelOptions.radius = front.radius
        vehicle.addWheel(wheelOptions)
        wheelMeshes.push(wheelRFMesh)
        
        // back left
        wheelOptions.chassisConnectionPointLocal.set(back.x, back.y, -back.z)
        wheelOptions.radius = back.radius
        vehicle.addWheel(wheelOptions)
        wheelMeshes.push(wheelLBMesh)
        
        // back right
        wheelOptions.chassisConnectionPointLocal.set(back.x, back.y, back.z)
        wheelOptions.radius = back.radius
        vehicle.addWheel(wheelOptions)
        wheelMeshes.push(wheelRBMesh)

        wheelMeshes.forEach(mesh => scene.add(mesh))
        
        vehicle.addToWorld(world)

        console.log(vehicle);
        
        // Add the wheel bodies
        const wheelBodies = []
        vehicle.wheelInfos.forEach((wheel) => {
            const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20)
            const wheelBody = new CANNON.Body({
                mass: 0,
                material: wheelMaterial,
            })
            wheelBody.type = CANNON.Body.KINEMATIC
            wheelBody.collisionFilterGroup = 0 // turn off collisions
            const quaternion = new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0)
            wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion)
            wheelBodies.push(wheelBody)
            world.addBody(wheelBody)
        })

        const keyMap = {}
        const onDocumentKey = (e) => {
            keyMap[e.key] = e.type === 'keydown'
            return false
        }

        document.addEventListener('keydown', onDocumentKey, false)
        document.addEventListener('keyup', onDocumentKey, false)
        
        /**
         * Animate
         */
        const clock = new THREE.Clock()
        let oldElapsedTime = 0

        const v = new THREE.Vector3()
        
        let driving = false
        let steering = false
        let breaking = false
        
        const maxSteering = 0.5
        const steeringAcceleration = .05
        const maxfwVelocity = 325
        const maxbwVelocity = -50
        const fwAcceleration = 590
        const bwAcceleration = - (fwAcceleration / 3)
        const engineBreak = 50
        let brakeForce = 0
        let forwardVelocity = 0
        let steeringAngle = 0
        let acceleration = 0

        const tick = () =>
        {
            const elapsedTime = clock.getElapsedTime()
            const deltaTime = elapsedTime - oldElapsedTime
            oldElapsedTime = elapsedTime

            // Update physics world
            world.step(1 / 60, deltaTime, 3)

            // Copy coordinates from Cannon to Three.js
            carBodyMesh.position.copy(chassisBody.position)
            carBodyMesh.quaternion.copy(chassisBody.quaternion)
            for (let i = 0; i < wheelMeshes.length; i++) {
                vehicle.updateWheelTransform(i)
                const transform = vehicle.wheelInfos[i].worldTransform
                const wheelMesh = wheelMeshes[i]
                wheelMesh.position.copy(transform.position)
                wheelMesh.quaternion.copy(transform.quaternion)
            }

            // move vehicle
            driving = false
            steering = false
            breaking = false
            forwardVelocity = vehicle.currentVehicleSpeedKmHour
            // key map
            if (keyMap['w'] || keyMap['ArrowUp']) {
                driving = true
                if (forwardVelocity < maxfwVelocity) acceleration = fwAcceleration
            }
            if (keyMap['s'] || keyMap['ArrowDown']) {
                driving = true
                if (forwardVelocity > maxbwVelocity) acceleration = bwAcceleration
            }
            if (keyMap['a'] || keyMap['ArrowLeft']) {
                steering = true
                if (steeringAngle < maxSteering) steeringAngle += steeringAcceleration
            }
            if (keyMap['d'] || keyMap['ArrowRight']) {
                steering = true
                if (steeringAngle > -maxSteering) steeringAngle -= steeringAcceleration
            }
            if (keyMap[' ']) {
                breaking = true
                if (driving) acceleration = 0
                if (forwardVelocity != 0) brakeForce = 17
            }
            
            // slowdown
            if (!driving) {
                if (forwardVelocity > .05) acceleration = -engineBreak
                else if (forwardVelocity < -.05) acceleration = engineBreak
                else acceleration = 0
            }
            // repositioning steering angle
            if (!steering) {
                if (steeringAngle > .05) steeringAngle -= .05
                else if (steeringAngle < -.05) steeringAngle += .05
                else steeringAngle = 0
            }
            // not breaking
            if (!breaking) brakeForce = 0

            // apply acceleration
            vehicle.applyEngineForce(acceleration, 0)
            vehicle.applyEngineForce(acceleration, 1)
            vehicle.applyEngineForce(acceleration, 2)
            vehicle.applyEngineForce(acceleration, 3)

            // apply steering force
            vehicle.setSteeringValue(steeringAngle, 0)
            vehicle.setSteeringValue(steeringAngle, 1)

            // apply brake force
            vehicle.setBrake(brakeForce, 2)
            vehicle.setBrake(brakeForce, 3)
            
            // if (!mouse) {
                camera.lookAt(carBodyMesh.position)

                chaseCamPivot.getWorldPosition(v)
                if (v.y < 1) {
                    v.y = 1
                }
                camera.position.lerpVectors(camera.position, v, .1)
            // }


            // Update controls
            // controls.update()

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