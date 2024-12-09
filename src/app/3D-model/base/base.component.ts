import { Component, OnInit, NgZone, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as BABYLON from '@babylonjs/core';
import "@babylonjs/loaders";
import * as GUI from '@babylonjs/gui/2D';

interface DefaultModelSize {
  x: number;
  y: number;
  z: number;
}

@Component({
  selector: 'app-base',
  templateUrl: './base.component.html',
  styleUrl: './base.component.css'
})
export class BaseComponent  implements OnInit, AfterViewInit {
 // Add to class properties
 public isViewMode: boolean = false;

 //model List 
 public availableModels = [
   { name: 'My Model', file: 'myModel.glb', scale: 0.4, position: { x: 7.3, y: 5.5, z: 4.3 }, icon: 'fas fa-box', url: 'https://example.com/myModel' },
   { name: 'Shelf', file: 'shelf.glb', scale: 1, position: { x: 1, y: 7.5, z: 1 }, icon: 'fas fa-archive', url: '' },
   { name: 'White-house', file: 'white-house.glb', scale: 20, position: { x: 1, y: 7.5, z: 1 }, icon: 'fas fa-archive', url: '' },
   { name: 'Box Shelf', file: 'box_shelf.glb', scale: 0.01, position: { x: 1, y: 1, z: 1 }, icon: 'fas fa-boxes', url: null },
   { name: 'Pikachu', file: 'pikachu.glb', scale: 0.1, position: { x: 1, y: 1, z: 1 }, icon: 'fas fa-boxes', url: null },
   { name: 'Pica Pool', file: 'picapool.glb', scale: 4, position: { x: 1, y: 1, z: 1 }, icon: 'fas fa-cube', url: null },
   { name: 'Anniversary', file: 'anniversary.glb', scale: 30, position: { x: 1, y: 1, z: 1 }, icon: 'fas fa-cube', url: null }
 ];

 //HTML Objects
 public isDimensionsExpanded = false;
 // Add to class properties
 public isModelMovementEnabled: boolean = true;
 //================================================================================================
 public UNITS: string = 'cm';
 // Add these constants at the top of the class
 private readonly WALL_MARGIN: number = 0.5; // Margin from walls
 private readonly STACK_SPACING: number = 0.1; // Space between stacked models
 private readonly MODEL_SPACING = 0.2;

 private engine!: BABYLON.Engine;
 private scene!: BABYLON.Scene;
 // Add to class properties
 public isArcRotateCamera: boolean = true;

 private camera!: BABYLON.ArcRotateCamera | BABYLON.UniversalCamera;

 private walls: BABYLON.Mesh[] = [];
 public minDimensions = { width: 20, height: 15, depth: 20 };
 public maxDimensions = { width: 1000, height: 500, depth: 1000 };
 public innerBoxSize = { width: 600, height: 350, depth: 400 };

 private isDraggingModel = false; // Flag to track dragging state for the glbModel
 public selectedModels: BABYLON.AbstractMesh[] = [];
 public selectedModel: BABYLON.AbstractMesh | undefined; // Store the selected model

 private previousPointerPosition!: BABYLON.Vector2;
 private wallOpacity: number = 0.5;

 //GLB MODEL
 private glbModels: BABYLON.AbstractMesh[] = [];
 private distanceLines: BABYLON.Mesh[] = [];
 private distanceTexts: GUI.TextBlock[] = [];
 private advancedTexture!: GUI.AdvancedDynamicTexture;

 // Shadow generator
 private shadowGenerator!: BABYLON.ShadowGenerator;
 private moveInterval: any;

 // Add to class properties
 private highlightLayer!: BABYLON.HighlightLayer;

 private readonly DEFAULT_MODEL_SIZE: DefaultModelSize = {
   x: 1,
   y: 1,
   z: 1
 };

 private modelSizeX: number = 0;
 private modelSizeY: number = 0;
 private modelSizeZ: number = 0;

 // Glow layer
 private glowLayer!: BABYLON.GlowLayer;
 // Add to class properties
 private modelTooltip!: GUI.Rectangle;
 private textBlock!: GUI.TextBlock;

 //Camera Movement controll
 private cameraSpeed = 0.5;
 private cameraRotationSpeed = 0.02;
 private cameraInterval: any;

 constructor(private ngZone: NgZone, @Inject(PLATFORM_ID) private platformId: Object) { 
  this.handleScrollBound = this.handleScroll.bind(this);
}

 ngOnInit() {
   // this.ngZone.runOutsideAngular(() => this.createScene());
 }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => this.createScene());

        // Add event listener for keyboard event
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    // Define the key that will trigger the function (e.g., 's' key)
    if (event.key === 'x' || event.key === 'X') {
      this.storeCurrentCameraPositionAndAngle();
    }
  }

 //Setting Container 
 public settingsClicked: boolean = false;
 clickSettings() { this.settingsClicked = !this.settingsClicked; return; }
 // View mode toggle ----------------------------------------------------------------
 toggleViewMode(): void {
   this.isViewMode = !this.isViewMode;

   if (this.isViewMode) {
     // Enter view mode
     this.toggleModelMovement(false);
     // this.toggleCameraType(true);
     this.setupCamera();
     this.adjustWallVisibility(false);
   } else {
     // Exit view mode
     this.toggleModelMovement(true);
     this.adjustWallVisibility(true);
     // this.toggleCameraType(false);
   }

   // Set focus back to the canvas
   const canvas = this.engine.getRenderingCanvas();
   if (canvas) {
     canvas.focus();
   }
 }

 // Add toggleCameraType method
 toggleCameraType(enable: boolean = false): void {
   this.isArcRotateCamera = enable;
   console.log('isArcRotateCamera:', this.isArcRotateCamera);
   this.setupCamera();

   // Set focus back to the canvas
   const canvas = this.engine.getRenderingCanvas();
   if (canvas) {
     canvas.focus();
   }
 }

 // Add toggleModelMovement method
 toggleModelMovement(enable?: boolean): void {
   if (enable !== undefined) {
     this.isModelMovementEnabled = enable;
   } else {
     this.isModelMovementEnabled = !this.isModelMovementEnabled;
   }

   if (!this.isModelMovementEnabled) {
     this.clearSelectedModels();
     this.updateDistanceLinesAndTexts();
     this.applyOutlineEffect(false);
   }
 }

 //Add Axis 
 createAxes(size: number): void {
   const axesViewer = new BABYLON.AxesViewer(this.scene, size);
 }

 createFloor(): void {
   const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 200, height: 200 }, this.scene);
   const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", this.scene);
   groundMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
   ground.material = groundMaterial;
   ground.receiveShadows = true;
 }
 // Add setupCamera method
 setupCamera(): void {
   const canvas = this.engine.getRenderingCanvas();

   if (this.camera) {
     this.camera.dispose();
   }

   if (this.isArcRotateCamera) {
     this.camera = new BABYLON.ArcRotateCamera(
       'ArcRotateCamera',
       BABYLON.Tools.ToRadians(45),
       BABYLON.Tools.ToRadians(60),
       40,
       BABYLON.Vector3.Zero(),
       this.scene
     );
     this.updateCameraPosition();
   } else {
     this.camera = new BABYLON.UniversalCamera('UniversalCamera', new BABYLON.Vector3(0, 5, -10), this.scene);
     this.camera.setTarget(BABYLON.Vector3.Zero());

     // Enable camera movement
     this.camera.keysUp.push(87); // W
     this.camera.keysDown.push(83); // S
     this.camera.keysLeft.push(65); // A
     this.camera.keysRight.push(68); // D
     this.camera.speed = 0.5;
   }

   this.camera.attachControl(canvas, true);
 }

 //camera Functions  ----------------------------------------------------------------
 // Add to class properties
 private cameraPositionsAndAngles: { position: BABYLON.Vector3, alpha: number, beta: number }[] = [];
  createScene(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = new BABYLON.Scene(this.engine);

    this.scene.clearColor = new BABYLON.Color4(0.95, 0.95, 0.95, 1); // White

    // Setup camera
    this.setupCamera();

    // Light setup
    const light1 = new BABYLON.HemisphericLight('Light1', new BABYLON.Vector3(0, 1, 0), this.scene);
    const light2 = new BABYLON.PointLight('Light2', new BABYLON.Vector3(10, 10, 10), this.scene);
    const light3 = new BABYLON.PointLight('Light3', new BABYLON.Vector3(-10, -10, -10), this.scene);

    // Directional light for shadows
    const directionalLight = new BABYLON.DirectionalLight('DirectionalLight', new BABYLON.Vector3(-1, -2, -1), this.scene);
    directionalLight.position = new BABYLON.Vector3(20, 40, 20);
    directionalLight.intensity = 0.7;

    // Shadow generator
    this.shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 32;

    // Highlight layer
    this.highlightLayer = new BABYLON.HighlightLayer("highlightLayer", this.scene);

    // Log camera angles
    this.logCameraAngles();

    // Create walls and box
    this.createWalls();

    // Setup pointer controls
    this.setupPointerControls();

    // Create advanced dynamic texture for GUI
    this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Run the render loop
    this.engine.runRenderLoop(() => this.scene.render());

    // Create model tooltip
    this.createModelTooltip();

    // Resize engine on window resize
    window.addEventListener('resize', () => this.engine.resize());

    // Create axes and floor
    // this.createAxes(10);
    // this.createFloor();
  }

 //Auto Zoom OF Camera as per wall size Chnage
 updateCameraPosition(): void {
   if (this.camera instanceof BABYLON.ArcRotateCamera) {
     const maxDimension = Math.max(
       this.innerBoxSize.width,
       this.innerBoxSize.height,
       this.innerBoxSize.depth
     );

     // Set camera radius based on max dimension
     this.camera.radius = maxDimension * 1.5; // Adjust multiplier as needed

     // Update camera position based on box dimensions
     const alpha = BABYLON.Tools.ToRadians(45); // Horizontal angle
     const beta = BABYLON.Tools.ToRadians(60);  // Vertical angle

     // Calculate optimal beta (vertical angle) based on height-to-width ratio
     const heightToWidthRatio = this.innerBoxSize.height / this.innerBoxSize.width;
     const optimalBeta = BABYLON.Tools.ToRadians(45 + (heightToWidthRatio * 15));

     this.camera.alpha = alpha;
     this.camera.beta = optimalBeta;

     // Set camera limits
     this.camera.lowerRadiusLimit = 1;
     this.camera.upperRadiusLimit = maxDimension * 3;

     // Update camera target to center of box
     this.camera.setTarget(BABYLON.Vector3.Zero());
   }
 }

 startCameraMove(direction: string) {
   if (this.cameraInterval) return;

   this.cameraInterval = setInterval(() => {
     if (this.camera instanceof BABYLON.ArcRotateCamera) {
       switch (direction) {
         case 'left':
           this.camera.alpha -= this.cameraRotationSpeed;
           break;
         case 'right':
           this.camera.alpha += this.cameraRotationSpeed;
           break;
         case 'up':
           this.camera.beta -= this.cameraRotationSpeed;
           break;
         case 'down':
           this.camera.beta += this.cameraRotationSpeed;
           break;
         case 'zoomIn':
           this.camera.radius -= this.cameraSpeed;
           break;
         case 'zoomOut':
           this.camera.radius += this.cameraSpeed;
           break;
       }
       this.camera.beta = BABYLON.Scalar.Clamp(
         this.camera.beta,
         0.1,
         Math.PI - 0.1
       );
     } else if (this.camera instanceof BABYLON.UniversalCamera) {
       switch (direction) {
         case 'left':
           this.camera.cameraRotation.y -= this.cameraRotationSpeed;
           break;
         case 'right':
           this.camera.cameraRotation.y += this.cameraRotationSpeed;
           break;
         case 'up':
           this.camera.cameraRotation.x -= this.cameraRotationSpeed;
           break;
         case 'down':
           this.camera.cameraRotation.x += this.cameraRotationSpeed;
           break;
         case 'zoomIn':
           this.camera.position.z += this.cameraSpeed;
           break;
         case 'zoomOut':
           this.camera.position.z -= this.cameraSpeed;
           break;
       }
     }
   }, 50);
 }

 stopCameraMove() {
   if (this.cameraInterval) {
     clearInterval(this.cameraInterval);
     this.cameraInterval = null;
   }
 }

  zoomIn() {
    if (this.camera instanceof BABYLON.ArcRotateCamera) {
      const minRadius = 1; // Set a minimum radius to prevent zooming to zero or negative values
      this.camera.radius = Math.max(this.camera.radius - 5, this.camera.lowerRadiusLimit ?? minRadius);
    } else if (this.camera instanceof BABYLON.UniversalCamera) {
      this.camera.position.z += 5;
    }
  }

  zoomOut() {
    if (this.camera instanceof BABYLON.ArcRotateCamera) {
      this.camera.radius = Math.min(this.camera.radius + 5, this.camera.upperRadiusLimit ?? Infinity);
    } else if (this.camera instanceof BABYLON.UniversalCamera) {
      this.camera.position.z -= 5;
    }
  }

 logCameraAngles(): void {
   this.scene.onBeforeRenderObservable.add(() => {
     if (!this.camera) return;

     let cameraInfo = '';

     if (this.camera instanceof BABYLON.ArcRotateCamera) {
       const alphaInDegrees = this.camera.alpha * (180 / Math.PI);
       const betaInDegrees = this.camera.beta * (180 / Math.PI);
       const radius = this.camera.radius;

       cameraInfo = `
         Distance (Radius): ${radius.toFixed(2)} ${this.UNITS}<br>
         Alpha (Horizontal Angle): ${alphaInDegrees.toFixed(2)}°<br>
         Beta (Vertical Angle): ${betaInDegrees.toFixed(2)}°<br>
         Camera Position: X: ${this.camera.position.x.toFixed(2)}, Y: ${this.camera.position.y.toFixed(2)}, Z: ${this.camera.position.z.toFixed(2)}
       `;
     } else if (this.camera instanceof BABYLON.UniversalCamera) {
       cameraInfo = `
         Camera Position: X: ${this.camera.position.x.toFixed(2)}, Y: ${this.camera.position.y.toFixed(2)}, Z: ${this.camera.position.z.toFixed(2)}
       `;
     }

     const cameraInfoElement = document.getElementById('cameraInfo');
     if (cameraInfoElement) {
       cameraInfoElement.innerHTML = cameraInfo;
     }

     this.adjustWallVisibility(!this.isViewMode);
   });
 }

  storeCurrentCameraPositionAndAngle(): void {
    if (this.camera instanceof BABYLON.ArcRotateCamera) {
      this.cameraPositionsAndAngles.push({
        position: this.camera.position.clone(),
        alpha: this.camera.alpha,
        beta: this.camera.beta
      });
      console.log('Camera position and angle stored:', this.cameraPositionsAndAngles);
    } else if (this.camera instanceof BABYLON.UniversalCamera) {
      this.cameraPositionsAndAngles.push({
        position: this.camera.position.clone(),
        alpha: 0, // UniversalCamera does not have alpha and beta
        beta: 0
      });
      console.log('Camera position stored:', {
        position: this.camera.position.clone()
      });
    }
  }
 //End Camera Controllers ----------------------------------------------------------------
 //Wall Functions ----------------------------------------------------------------

 // Update updateDimension method
 updateDimension(dimension: 'width' | 'height' | 'depth', value: number) {
   this.innerBoxSize[dimension] = Number(value); // Ensure value is a number

   if (this.scene) {
     // Recreate walls with new dimensions
     this.walls.forEach(wall => wall.dispose());
     this.createWalls();

     // Update camera position based on new dimensions
     this.updateCameraPosition();

     // Update model positions to fit new dimensions
     this.glbModels.forEach(model => {
       this.clampModel();
     });

     // Update distance lines if a model is selected
     if (this.selectedModel) {
       this.updateDistanceLinesAndTexts();
     }
   }
 }

 createWalls(): void {
   const { width, height, depth } = this.innerBoxSize;
   const wallThickness = 0.05;

   const createWall = (name: string, opacity: number, width: number, height: number, depth: number, position: BABYLON.Vector3, color: string) => {
     const wall = BABYLON.MeshBuilder.CreateBox(name, { width, height, depth }, this.scene);
     wall.position = position;

     const wallMaterial = new BABYLON.StandardMaterial(`${name}Material`, this.scene);
     wallMaterial.diffuseColor = BABYLON.Color3.FromHexString(color);
     wallMaterial.alpha = opacity;
     wall.material = wallMaterial;

     return wall;
   };

   this.walls = [
     createWall('LeftWall', 0.5, wallThickness, height, depth, new BABYLON.Vector3(-width / 2, 0, 0), "#f7cb39"),
     createWall('RightWall', 0.5, wallThickness, height, depth, new BABYLON.Vector3(width / 2, 0, 0), "#f7cb39"),
     createWall('BackWall', 0.5, width, height, wallThickness, new BABYLON.Vector3(0, 0, -depth / 2), "#969696"),
     createWall('FrontWall', 0.5, width, height, wallThickness, new BABYLON.Vector3(0, 0, depth / 2), "#969696"),
     createWall('BottomWall', 0.5, width, wallThickness, depth, new BABYLON.Vector3(0, -height / 2, 0), "#000000"),
     createWall('TopWall', 0.5, width, wallThickness, depth, new BABYLON.Vector3(0, height / 2, 0), "#969696")
   ];

   // Enable shadows for walls
   this.walls.forEach(wall => {
     wall.receiveShadows = true;
     this.shadowGenerator.addShadowCaster(wall);
   });
 }

 adjustWallVisibility(enable: boolean = true): void {
   // Get the camera's position in the scene
   if (enable) {
     const cameraPosition = this.camera.position;

     // Left Wall: Camera X position should be greater than 0 to show
     this.walls[0].setEnabled(cameraPosition.x > 0);

     // Right Wall: Camera X position should be less than 0 to show
     this.walls[1].setEnabled(cameraPosition.x < 0);

     // Back Wall: Camera Z position should be greater than 0 to show
     this.walls[2].setEnabled(cameraPosition.z > 0);

     // Front Wall: Camera Z position should be less than 0 to show
     this.walls[3].setEnabled(cameraPosition.z < 0);

     // Bottom Wall: Camera Y position should be greater than 0 to show
     this.walls[4].setEnabled(true);

     // Top Wall: Always hide the top wall, or change the condition as needed
     this.walls[5].setEnabled(false);
   } else {
     console.log("Hide Walls");
     this.walls[0].setEnabled(false);//Left Wall
     this.walls[1].setEnabled(false); //Right Wall
     this.walls[2].setEnabled(false);//Back Wall
     this.walls[3].setEnabled(false);//Front Wall
     this.walls[4].setEnabled(true);//Bottom Wall
     this.walls[5].setEnabled(false);//Top Wall
   }
 }

 setupPointerControls(): void {
   const canvas = this.engine.getRenderingCanvas();

   if (canvas) {
    canvas.addEventListener('click', () => {
      if (this.camera instanceof BABYLON.UniversalCamera && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    });
  }

   this.scene.onPointerObservable.add((pointerInfo) => {
     switch (pointerInfo.type) {
       case BABYLON.PointerEventTypes.POINTERDOWN:
         // Check if a model is clicked
         if (this.isModelClicked(pointerInfo)) {
           this.isDraggingModel = true;
           if (this.isModelMovementEnabled) this.disableCameraRotation();
           this.applyOutlineEffect(true);
           this.addToSelectedModels(this.selectedModel!);
           this.openUrlModel(this.selectedModel!);
           this.showTooltip(this.selectedModel!);
         } else {
           // Clicked outside any model
           this.isDraggingModel = false;
           this.selectedModel = undefined;
           this.enableCameraRotation();
           this.applyOutlineEffect(false);
           this.clearSelectedModels();
           this.hideTooltip(false);
         }
         break;

       case BABYLON.PointerEventTypes.POINTERMOVE:
         if (this.isDraggingModel && this.selectedModel && this.isModelMovementEnabled) {
           if (this.isArcRotateCamera) {
             this.moveModel(pointerInfo.event as PointerEvent);
           }
           this.applyOutlineEffect(true);
         } else {
           this.handleMouseMovement(pointerInfo.event as PointerEvent);
         }
         break;

       case BABYLON.PointerEventTypes.POINTERUP:
         if (this.isDraggingModel) {
           this.isDraggingModel = false;
           this.enableCameraRotation();
         }
         break;
     }
   });
 }

 handleMouseMovement(event: PointerEvent): void {
   if (this.isPlayMode && this.isCursorRotation) {
     const movementX = event.movementX || 0;
     const movementY = event.movementY || 0;

     if (this.camera instanceof BABYLON.ArcRotateCamera) {
       this.camera.alpha += movementX * 0.001;
       this.camera.beta += movementY * 0.001;
     } else if (this.camera instanceof BABYLON.UniversalCamera) {
       this.camera.cameraRotation.y += movementX * 0.001;
       this.camera.cameraRotation.x += movementY * 0.001;
     }
   }
   //  else if (this.isArcRotateCamera && this.camera instanceof BABYLON.ArcRotateCamera) {
   //   const movementX = event.movementX || 0;
   //   const movementY = event.movementY || 0;

   //   this.camera.alpha += movementX * 0.001;
   //   this.camera.beta += movementY * 0.001;
   // }
 }

 addToSelectedModels(model: BABYLON.AbstractMesh): void {
   if (!this.selectedModels.includes(model)) {
     // Ensure unique names
     let modelName = model.name;
     let count = 1;
     while (this.selectedModels.some(m => m.name === modelName)) {
       modelName = `${model.name}_${count}`;
       count++;
     }
     model.name = modelName;

     // Calculate available space
     const availableWidth = this.innerBoxSize.width - (2 * this.WALL_MARGIN);
     const availableHeight = this.innerBoxSize.height - (2 * this.WALL_MARGIN);
     const availableDepth = this.innerBoxSize.depth - (2 * this.WALL_MARGIN);

     // Calculate stacking position
     const sameModelCount = this.selectedModels.filter(m =>
       m.name.startsWith(model.name.split('_')[0])).length;

     const stackHeight = sameModelCount * (this.modelSizeY + this.STACK_SPACING);
     const stacksInHeight = Math.floor(availableHeight / (this.modelSizeY + this.STACK_SPACING));
     const stackDepth = Math.floor(stackHeight / availableHeight) * (this.modelSizeZ + this.STACK_SPACING);
     const stacksInDepth = Math.floor(availableDepth / (this.modelSizeZ + this.STACK_SPACING));
     const stackWidth = Math.floor((stackHeight / availableHeight) * (stackDepth / availableDepth)) * (this.modelSizeX + this.STACK_SPACING);
     if (model.position.y + stackHeight > availableHeight) {
       console.log(model.position.y, stackHeight, availableHeight);
       model.position.y = 0;
     }
     // Position within bounds
     if (stackWidth < availableWidth) {
       model.position.x = -this.innerBoxSize.width / 2 + this.WALL_MARGIN + stackWidth;
       model.position.y = -this.innerBoxSize.height / 2 + this.WALL_MARGIN + (stackHeight % availableHeight);
       model.position.z = -this.innerBoxSize.depth / 2 + this.WALL_MARGIN + (stackDepth % availableDepth);
       // Add to selected models if within bounds
       this.selectedModels.push(model);
     } else {
       console.warn('No more space available for new models');
     }
   }
 }

 clearSelectedModels(): void {
   if (this.selectedModel) {
     this.applyOutlineEffect(false);
   }

   this.selectedModel = undefined;
   this.updateSelectedModelsList();
   this.hideTooltip(false);
 }

 updateSelectedModelsList(): void {
   const selectedModelsListElement = document.getElementById('selectedModelsList');
   if (selectedModelsListElement) {
     selectedModelsListElement.innerHTML = this.selectedModels.map(model => `<li>${model.name}</li>`).join('');
   }
 }

 selectModelFromList(model: BABYLON.AbstractMesh): void {
   if (this.selectedModel) {
     this.applyOutlineEffect(false);
   }

   this.selectedModel = model;
   this.updateDistanceLinesAndTexts();

   if (this.selectedModel) {
     this.applyOutlineEffect(true);
   }
 }

 selectModelFromListZoomIn(model: BABYLON.AbstractMesh): void {
   if (this.selectedModel) {
     this.applyOutlineEffect(false);
   }

   this.selectedModel = model;
   this.zoomInOnModel();

   if (this.selectedModel) {
     this.applyOutlineEffect(true);
   }
 }

 disableCameraRotation(): void {
   this.camera.detachControl();
 }

 enableCameraRotation(): void {
   this.camera.attachControl(this.engine.getRenderingCanvas(), true);
 }

 private setCameraPositionAndAngle(position: BABYLON.Vector3): void {
   if (this.camera instanceof BABYLON.ArcRotateCamera) {
     const alpha = BABYLON.Tools.ToRadians(45); // Horizontal angle
     const beta = BABYLON.Tools.ToRadians(60);  // Vertical angle

     this.camera.setPosition(new BABYLON.Vector3(position.x + 10, position.y + 10, position.z + 10));
     this.camera.alpha = alpha;
     this.camera.beta = beta;
     this.camera.setTarget(position);
   } else if (this.camera instanceof BABYLON.UniversalCamera) {
     this.camera.position = new BABYLON.Vector3(position.x + 10, position.y + 10, position.z + 10);
     this.camera.setTarget(position);
   }
 }

 // Add 3D Model
 addModel(glbUrl: string, ration: number, defaultModelSize: DefaultModelSize = this.DEFAULT_MODEL_SIZE, url: string): Promise<BABYLON.AbstractMesh | null> {
   return new Promise((resolve, reject) => {
     const modelPath = `/models/${glbUrl}`;
     BABYLON.SceneLoader.ImportMesh(
       '',
       modelPath,
       '',
       this.scene,
       (meshes) => {
         const glbModel = meshes[0];

         // Set initial position
         glbModel.position = new BABYLON.Vector3(0, -this.innerBoxSize.height / 2, 5);
         glbModel.scaling = new BABYLON.Vector3(ration, ration, ration);

         // Compute bounding box
         glbModel.computeWorldMatrix(true);
         glbModel.refreshBoundingInfo({});

         const boundingInfo = glbModel.getBoundingInfo();
         const min = boundingInfo.boundingBox.minimumWorld;
         const max = boundingInfo.boundingBox.maximumWorld;

         // Set model sizes, use default if bounding box calculation fails
         this.modelSizeX = ((max.x - min.x) * ration) || defaultModelSize.x;
         this.modelSizeY = ((max.y - min.y) * ration) || defaultModelSize.y;
         this.modelSizeZ = ((max.z - min.z) * ration) || defaultModelSize.z;

         // Check for valid position that doesn't overlap with existing models
         let validPosition = false;
         let attempts = 0;
         const maxAttempts = 100;

         while (!validPosition && attempts < maxAttempts) {
           validPosition = true;

           // Check collision with all existing models
           for (const existingModel of this.glbModels) {
             if (this.checkCollision(glbModel, existingModel)) {
               validPosition = false;
               // Try new position
               glbModel.position.x += this.modelSizeX + this.MODEL_SPACING;
               if (glbModel.position.x > this.innerBoxSize.width / 2 - this.WALL_MARGIN) {
                 glbModel.position.x = -this.innerBoxSize.width / 2 + this.WALL_MARGIN;
                 glbModel.position.z += this.modelSizeZ + this.MODEL_SPACING;

                 if (glbModel.position.z > this.innerBoxSize.depth / 2 - this.WALL_MARGIN) {
                   glbModel.position.z = -this.innerBoxSize.depth / 2 + this.WALL_MARGIN;
                   glbModel.position.y += this.modelSizeY + this.MODEL_SPACING;
                 }
               }
               break;
             }
           }
           attempts++;
         }

         if (attempts >= maxAttempts) {
           console.warn('Could not find valid position for model');
           resolve(null);
           return;
         }

         this.glbModels.push(glbModel);

         // Add event listener for click event
         glbModel.actionManager = new BABYLON.ActionManager(this.scene);
         glbModel.actionManager.registerAction(
           new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, () => {
             window.open(url, '_blank');
           })
         );
         glbModel.receiveShadows = true;
         this.shadowGenerator.addShadowCaster(glbModel);

         // Set unique name
         let modelName = glbUrl;
         let count = 1;
         while (this.glbModels.some(m => m.name === modelName)) {
           modelName = `${glbUrl}_${count}`;
           count++;
         }
         glbModel.name = modelName;

         this.selectedModel = glbModel;
         this.addToSelectedModels(glbModel);
         console.log(`Model Size - X: ${this.modelSizeX}, Y: ${this.modelSizeY}, Z: ${this.modelSizeZ}`);
         resolve(glbModel);
       },
       null,
       (scene, message, exception) => {
         console.error(`Failed to load model: ${message}`, exception);
         reject(exception);
       }
     );
   });
 }

 deleteSelectedModel(): void {
   if (!this.selectedModel) return;

   // Remove the model from the scene
   this.selectedModel.dispose();

   // Remove the model from the glbModels array
   const index = this.glbModels.indexOf(this.selectedModel);
   if (index > -1) {
     this.glbModels.splice(index, 1);
   }

   // Remove the model from the selectedModels array
   const selectedIndex = this.selectedModels.indexOf(this.selectedModel);
   if (selectedIndex > -1) {
     this.selectedModels.splice(selectedIndex, 1);
   }

   // Remove highlight
   this.applyOutlineEffect(false);

   // Clear the selected model
   this.selectedModel = undefined;

   // Remove glow effect
   this.applyOutlineEffect(false);

   // Clear distance lines and texts
   this.updateDistanceLinesAndTexts();

   // Update the selected models list
   this.updateSelectedModelsList();
 }

 isModelClicked(pointerInfo: BABYLON.PointerInfo): boolean {
   const ray = this.scene.createPickingRay(
     pointerInfo.event.clientX,
     pointerInfo.event.clientY,
     BABYLON.Matrix.Identity(),
     this.camera
   );
   const pickResult = this.scene.pickWithRay(ray);

   if (pickResult?.hit) {
     // Check if the picked mesh is any of the models or part of their hierarchy
     for (const glbModel of this.glbModels) {
       if (pickResult.pickedMesh && (pickResult.pickedMesh === glbModel || pickResult.pickedMesh.isDescendantOf(glbModel))) {
         this.selectedModel = glbModel;
         return true;
       }
     }
   }
   return false;
 }
 moveModel(event: PointerEvent): void {
   if (this.selectedModel) {
     const pickInfo = this.scene.pick(event.clientX, event.clientY, undefined, false);
     if (pickInfo.hit) {
       const cursorWorldPosition = pickInfo.pickedPoint!;

       // Get the bounding box of the model
       const boundingInfo = this.selectedModel.getBoundingInfo();
       const min = boundingInfo.boundingBox.minimumWorld;
       const max = boundingInfo.boundingBox.maximumWorld;

       // Calculate the model's size
       this.modelSizeX = max.x - min.x;
       this.modelSizeY = max.y - min.y;
       this.modelSizeZ = max.z - min.z;

       // Update the position
       this.selectedModel.position.x = cursorWorldPosition.x;
       this.selectedModel.position.y = cursorWorldPosition.y;
       this.selectedModel.position.z = cursorWorldPosition.z;

       this.clampModel();

       // Check for collisions with other models
       for (const model of this.glbModels) {
         if (model !== this.selectedModel && this.checkCollision(this.selectedModel, model)) {
           // Handle collision (e.g., revert position)
           this.selectedModel.position.x = cursorWorldPosition.x;
           this.selectedModel.position.y = cursorWorldPosition.y;
           this.selectedModel.position.z = cursorWorldPosition.z;
         }
       }

       // Update distance lines and texts
       this.updateDistanceLinesAndTexts();
       this.showTooltip(this.selectedModel);
     }
   }
 }

 zoomInOnModel(): void {
   if (!this.selectedModel || !(this.camera instanceof BABYLON.ArcRotateCamera)) return;

   const boundingInfo = this.selectedModel.getBoundingInfo();
   const center = boundingInfo.boundingBox.centerWorld;
   const radius = boundingInfo.boundingBox.extendSizeWorld.length() * 2;

   // Set the camera target to the center of the model
   this.camera.setTarget(center);

   // Smoothly zoom in to the model
   const animation = new BABYLON.Animation(
     "zoomInAnimation",
     "radius",
     60,
     BABYLON.Animation.ANIMATIONTYPE_FLOAT,
     BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
   );

   const keys = [
     { frame: 0, value: this.camera.radius },
     { frame: 30, value: radius }
   ];

   animation.setKeys(keys);

   this.camera.animations = [];
   this.camera.animations.push(animation);

   this.scene.beginAnimation(this.camera, 0, 30, false);
 }

 movePosition(axis: string, amount: number) {
   if (!this.selectedModel) return;

   const newPosition = this.selectedModel.position.clone();

   switch (axis) {
     case 'x':
       newPosition.x += amount;
       break;
     case 'y':
       newPosition.y += amount;
       break;
     case 'z':
       newPosition.z += amount;
       break;
   }

   // Check boundaries before applying movement
   if (this.isWithinBounds(newPosition)) {
     this.selectedModel.position = newPosition;
     this.updateDistanceLinesAndTexts();
   }
 }

  startMovePosition(axis: string, initialAmount: number) {
    let amount = initialAmount;
    this.moveInterval = setInterval(() => {
      this.movePosition(axis, amount);
      amount += initialAmount; // Increase the amount over time
    }, 10);
  }

  stopMovePosition() {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
  }

 private isWithinBounds(position: BABYLON.Vector3): boolean {
   const halfWidth = (this.innerBoxSize.width / 2) - this.WALL_MARGIN;
   const halfHeight = (this.innerBoxSize.height / 2) - this.WALL_MARGIN;
   const halfDepth = (this.innerBoxSize.depth / 2) - this.WALL_MARGIN;

   return (
     Math.abs(position.x) <= halfWidth &&
     Math.abs(position.y) <= halfHeight &&
     Math.abs(position.z) <= halfDepth
   );
 }

 rotateModel(axis: string, amount: number): void {
   if (!this.selectedModel) return;

   // Check if the model has a rotationQuaternion
   if (!this.selectedModel.rotationQuaternion) {
     this.selectedModel.rotationQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
       this.selectedModel.rotation.y,
       this.selectedModel.rotation.x,
       this.selectedModel.rotation.z
     );
   }

   const rotationQuaternion = this.selectedModel.rotationQuaternion;
   const rotationAmount = BABYLON.Tools.ToRadians(90) * amount;
   switch (axis) {
     case 'x':
       rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, rotationAmount));
       break;
     case 'y':
       rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, rotationAmount));
       break;
     case 'z':
       rotationQuaternion.multiplyInPlace(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z, rotationAmount));
       break;
   }

   this.selectedModel.rotationQuaternion = rotationQuaternion;

   // Log the quaternion values
   console.log(`Rotation Quaternion - X: ${rotationQuaternion.x}, Y: ${rotationQuaternion.y}, Z: ${rotationQuaternion.z}, W: ${rotationQuaternion.w}`);
 }

 scaleModel(axis: string, factor: number): void {
   if (!this.selectedModel) return;

   switch (axis) {
     case 'x':
       this.selectedModel.scaling.x *= factor;
       break;
     case 'y':
       this.selectedModel.scaling.y *= factor;
       break;
     case 'z':
       this.selectedModel.scaling.z *= factor;
       break;
   }

   // Log the new scaling values
   console.log(`Scaling - X: ${this.selectedModel.scaling.x}, Y: ${this.selectedModel.scaling.y}, Z: ${this.selectedModel.scaling.z}`);
 }

 clampModel() {
   if (!this.selectedModel) return;

   // Clamp the model's positions within the inner box
   this.selectedModel.position.x = BABYLON.Scalar.Clamp(
     this.selectedModel.position.x,
     -this.innerBoxSize.width / 2 + this.WALL_MARGIN + this.modelSizeX / 2,
     this.innerBoxSize.width / 2 - this.WALL_MARGIN - this.modelSizeX / 2
   );
   this.selectedModel.position.y = BABYLON.Scalar.Clamp(
     this.selectedModel.position.y,
     -this.innerBoxSize.height / 2 + this.WALL_MARGIN + this.modelSizeY / 2,
     this.innerBoxSize.height / 2 - this.WALL_MARGIN - this.modelSizeY / 2
   );
   this.selectedModel.position.z = BABYLON.Scalar.Clamp(
     this.selectedModel.position.z,
     -this.innerBoxSize.depth / 2 + this.WALL_MARGIN + this.modelSizeZ / 2,
     this.innerBoxSize.depth / 2 - this.WALL_MARGIN - this.modelSizeZ / 2
   );
 }

 checkCollision(model1: BABYLON.AbstractMesh, model2: BABYLON.AbstractMesh): boolean {
   const pos1 = model1.position;
   const pos2 = model2.position;

   // Use either bounding box dimensions or default sizes
   const size1 = {
     x: this.modelSizeX || this.DEFAULT_MODEL_SIZE.x,
     y: this.modelSizeY || this.DEFAULT_MODEL_SIZE.y,
     z: this.modelSizeZ || this.DEFAULT_MODEL_SIZE.z
   };

   const size2 = {
     x: this.modelSizeX || this.DEFAULT_MODEL_SIZE.x,
     y: this.modelSizeY || this.DEFAULT_MODEL_SIZE.y,
     z: this.modelSizeZ || this.DEFAULT_MODEL_SIZE.z
   };

   // Add spacing to the collision check
   return (
     Math.abs(pos1.x - pos2.x) < (size1.x + size2.x) / 2 + this.MODEL_SPACING &&
     Math.abs(pos1.y - pos2.y) < (size1.y + size2.y) / 2 + this.MODEL_SPACING &&
     Math.abs(pos1.z - pos2.z) < (size1.z + size2.z) / 2 + this.MODEL_SPACING
   );
 }

 updateDistanceLinesAndTexts(): void {
   // Clear previous lines and texts
   this.distanceLines.forEach(line => line.dispose());
   this.distanceTexts.forEach(text => this.advancedTexture.removeControl(text));
   this.distanceLines = [];
   this.distanceTexts = [];

   if (this.selectedModel) {
     const modelPosition = this.selectedModel.position;

     // Calculate distances to each wall
     const distances = {
       left: modelPosition.x + this.innerBoxSize.width / 2,
       right: this.innerBoxSize.width / 2 - modelPosition.x,
       back: modelPosition.z + this.innerBoxSize.depth / 2,
       front: this.innerBoxSize.depth / 2 - modelPosition.z,
       top: this.innerBoxSize.height / 2 - modelPosition.y,
       bottom: modelPosition.y + this.innerBoxSize.height / 2
     };

     // Create lines and texts for each distance
     for (const [side, distance] of Object.entries(distances)) {
       const line = BABYLON.MeshBuilder.CreateLines(`line-${side}`, {
         points: [
           modelPosition,
           this.getWallPosition(side, modelPosition)
         ],
         colors: [new BABYLON.Color4(0, 0, 0, 1), new BABYLON.Color4(0, 0, 0, 1)]
       }, this.scene);
       this.distanceLines.push(line);

       // Create an invisible TransformNode at the midpoint of the line
       const vertices = line.getVerticesData(BABYLON.VertexBuffer.PositionKind);
       let transformNode: BABYLON.TransformNode | null = null;
       if (vertices) {
         const midpoint = BABYLON.Vector3.Center(
           new BABYLON.Vector3(vertices[0], vertices[1], vertices[2]),
           new BABYLON.Vector3(vertices[3], vertices[4], vertices[5])
         );
         transformNode = new BABYLON.TransformNode(`transformNode-${side}`, this.scene);
         transformNode.position = midpoint;
       }

       const text = new GUI.TextBlock();
       text.text = `${distance.toFixed(2)} ${this.UNITS}`;
       text.color = "black";
       text.fontSize = 14;
       text.fontWeight = "bold";
       this.advancedTexture.addControl(text);
       if (transformNode) {
         text.linkWithMesh(transformNode);
       }
       this.distanceTexts.push(text);
     }

     // Display model dimensions
     // const dimensionsText = new GUI.TextBlock();
     // dimensionsText.text = `Width: ${this.modelSizeX.toFixed(2)} ${this.UNITS}\nHeight: ${this.modelSizeY.toFixed(2)} ${this.UNITS}\nLength: ${this.modelSizeZ.toFixed(2)} ${this.UNITS}`;
     // dimensionsText.color = "black";
     // dimensionsText.fontSize = 14;
     // dimensionsText.fontWeight = "bold";
     // this.advancedTexture.addControl(dimensionsText);
     // dimensionsText.linkWithMesh(this.selectedModel);
     // this.distanceTexts.push(dimensionsText);
   }
 }

 getWallPosition(side: string, modelPosition: BABYLON.Vector3): BABYLON.Vector3 {
   switch (side) {
     case 'left':
       return new BABYLON.Vector3(-this.innerBoxSize.width / 2, modelPosition.y, modelPosition.z);
     case 'right':
       return new BABYLON.Vector3(this.innerBoxSize.width / 2, modelPosition.y, modelPosition.z);
     case 'back':
       return new BABYLON.Vector3(modelPosition.x, modelPosition.y, -this.innerBoxSize.depth / 2);
     case 'front':
       return new BABYLON.Vector3(modelPosition.x, modelPosition.y, this.innerBoxSize.depth / 2);
     case 'top':
       return new BABYLON.Vector3(modelPosition.x, this.innerBoxSize.height / 2, modelPosition.z);
     case 'bottom':
       return new BABYLON.Vector3(modelPosition.x, -this.innerBoxSize.height / 2, modelPosition.z);
     default:
       return modelPosition;
   }
 }

 //Start Glow Funcyion ------------------------------------------------------------------
 applyOutlineEffect(enable: boolean): void {
   if (!this.selectedModel) return;

   if (!this.highlightLayer) {
     this.highlightLayer = new BABYLON.HighlightLayer("highlightLayer", this.scene);
   }

   try {
     if (enable) {
       // Remove highlight from all other selected models
       this.selectedModels.forEach((model) => {
         if (model !== this.selectedModel) {
           model.getChildMeshes().forEach((mesh) => {
             this.highlightLayer.removeMesh(mesh as BABYLON.Mesh);
           });
         }
       });

       // Add highlight to the selected model
       this.selectedModel.getChildMeshes().forEach((mesh) => {
         this.highlightLayer.addMesh(mesh as BABYLON.Mesh, BABYLON.Color3.Red());
       });
     } else {
       // Remove highlight from the selected model
       this.selectedModel.getChildMeshes().forEach((mesh) => {
         this.highlightLayer.removeMesh(mesh as BABYLON.Mesh);
       });
     }
   } catch (error) {
     console.warn('Error applying outline effect:', error);
   }
 }
 //Glow Effect End ------------------------------------------------------------------

 //Open URL in Model ----------------------------------------------------------------
 private openUrlModel(model: BABYLON.AbstractMesh): void {

   // Open URL if isModelMovementEnabled is false
   if (!this.isModelMovementEnabled && this.selectedModel) {
     const modelData = this.availableModels.find(model => model.file === this.selectedModel?.name.split('_')[0]);
     if (modelData && modelData.url) {
       window.open(modelData.url, '_blank');
     }
   }
 }
 //End Open URL in Model ----------------------------------------------------------------
 //ToolTip Functions ----------------------------------------------------------------
 private createModelTooltip(): void {
   // Create new advanced texture if not exists
   if (!this.advancedTexture) {
     this.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);
   }

   if (!this.modelTooltip) {
     this.modelTooltip = new GUI.Rectangle("tooltip");
     this.modelTooltip.color = "white";
     this.modelTooltip.background = (new BABYLON.Color4(0, 0, 0, 0.7)).toHexString();
     this.modelTooltip.widthInPixels = 150;
     this.modelTooltip.heightInPixels = 30;
     this.modelTooltip.zIndex = 100;
     this.modelTooltip.isVisible = false;

     this.advancedTexture.addControl(this.modelTooltip);

     this.textBlock = new GUI.TextBlock("textTooltip", "This is tooltip text");
     this.modelTooltip.addControl(this.textBlock);
   }
 }

 // Add new methods for tooltip handling

 // Update showTooltip method
 private showTooltip(model: BABYLON.AbstractMesh): void {
   if (this.selectedModel) model = this.selectedModel;
   const text = `Name: ${model.name}\nID: ${model.id}`;
   this.textBlock.text = text;
   this.modelTooltip.linkWithMesh(model);
   // this.modelTooltip.push(dimensionsText);
   this.modelTooltip.left = (20) + "px";
   this.modelTooltip.top = (20) + "px";
   // this.modelTooltip.isVisible = true;
   this.hideTooltip(true);
 }


 // Update hideTooltip method
 private hideTooltip(event: boolean): void {
   if (this.modelTooltip) {
     this.modelTooltip.isVisible = event;
   }
 }
 //End ToolTip Functions ----------------------------------------------------------------

 //Start Play Mode Function ----------------------------------------------------------------
 public isPlayMode: boolean = false;
 private playInterval: any;
 // Add togglePlayMode method
 togglePlayMode(): void {
   if (this.cameraPositionsAndAngles.length === 0 && this.isPlayMode == false) return;
   this.isPlayMode = !this.isPlayMode;

   if (this.isPlayMode) {
     // Enter play mode
     console.log('Enable Play Mode');
     this.startPlayMode();
     this.disableCameraRotation();
   } else {
     // Exit play mode
     console.log('Disable Play Mode');
     this.stopPlayMode();
     this.enableCameraRotation();
   }

   // Set focus back to the canvas
   const canvas = this.engine.getRenderingCanvas();
   if (canvas) {
     canvas.focus();
   }
 }

 startPlayMode(): void {
   let index = 0;

   const moveToNextPosition = () => {
     if (!this.isPlayMode) return; // Exit if play mode is stopped

     if (index >= this.cameraPositionsAndAngles.length) {
       index = 0; // Loop back to the start
     }

     const { position, alpha, beta } = this.cameraPositionsAndAngles[index];

     if (this.camera instanceof BABYLON.ArcRotateCamera) {
       this.animateCameraPosition(this.camera, position, alpha, beta, moveToNextPosition);
     } else if (this.camera instanceof BABYLON.UniversalCamera) {
       this.animateUniversalCameraPosition(this.camera, position, moveToNextPosition);
     }

     index++;
   };

   moveToNextPosition(); // Start the first movement
 }

 stopPlayMode(): void {
   if (this.playInterval) {
     clearInterval(this.playInterval);
     this.playInterval = null;
   }

   // Stop all animations on the camera
   if (this.camera) {
     this.scene.stopAnimation(this.camera);
   }
 }

 private animateCameraPosition(camera: BABYLON.ArcRotateCamera, position: BABYLON.Vector3, alpha: number, beta: number, onComplete: () => void): void {
   const animationPosition = new BABYLON.Animation(
     "cameraPositionAnimation",
     "position",
     30,
     BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
     BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
   );

   const keysPosition = [
     { frame: 0, value: camera.position.clone() },
     { frame: 100, value: position }
   ];

   animationPosition.setKeys(keysPosition);

   const animationAlpha = new BABYLON.Animation(
     "cameraAlphaAnimation",
     "alpha",
     30,
     BABYLON.Animation.ANIMATIONTYPE_FLOAT,
     BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
   );

   const keysAlpha = [
     { frame: 0, value: camera.alpha },
     { frame: 100, value: alpha }
   ];

   animationAlpha.setKeys(keysAlpha);

   const animationBeta = new BABYLON.Animation(
     "cameraBetaAnimation",
     "beta",
     30,
     BABYLON.Animation.ANIMATIONTYPE_FLOAT,
     BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
   );

   const keysBeta = [
     { frame: 0, value: camera.beta },
     { frame: 100, value: beta }
   ];

   animationBeta.setKeys(keysBeta);

   camera.animations = [];
   camera.animations.push(animationPosition);
   camera.animations.push(animationAlpha);
   camera.animations.push(animationBeta);

   this.scene.beginAnimation(camera, 0, 100, false, 1, onComplete);
 }

 private animateUniversalCameraPosition(camera: BABYLON.UniversalCamera, position: BABYLON.Vector3, onComplete: () => void): void {
   const animationPosition = new BABYLON.Animation(
     "cameraPositionAnimation",
     "position",
     30,
     BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
     BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
   );

   const keysPosition = [
     { frame: 0, value: camera.position.clone() },
     { frame: 100, value: position }
   ];

   animationPosition.setKeys(keysPosition);

   camera.animations = [];
   camera.animations.push(animationPosition);

   this.scene.beginAnimation(camera, 0, 100, false, 1, onComplete);
 }
 //End play mode function ----------------------------------------------------------------

 //Add Cursor ratation Function ----------------------------------------------------------------
 // Add to class properties
 public isCursorRotation: boolean = false;
 private currentCameraIndex: number = 0;
 private handleScrollBound: (event: WheelEvent) => void;

 // Add toggleCursorRotation method
 toggleCursorRotation(): void {
   this.isCursorRotation = !this.isCursorRotation;

   if (this.isCursorRotation) {
     // Enable cursor rotation
     console.log("Enable cursor rotation");
     this.enableCursorRotation();
     this.disableCameraRotation();
   } else {
     // Disable cursor rotation
     console.log("Disable cursor rotation");
     this.disableCursorRotation();
     this.enableCameraRotation();
   }

   // Set focus back to the canvas
   const canvas = this.engine.getRenderingCanvas();
   if (canvas) {
     canvas.focus();
   }
 }

 enableCursorRotation(): void {
   this.handleScrollBound = this.handleScroll.bind(this);
   window.addEventListener('wheel', this.handleScrollBound);
 }

 disableCursorRotation(): void {
   window.removeEventListener('wheel', this.handleScrollBound);

   // Stop all animations on the camera
   if (this.camera) {
     this.scene.stopAnimation(this.camera);
   }
 }

 handleScroll(event: WheelEvent): void {
   if (event.deltaY < 0) {
     // Scroll up
     console.log("UP scroll");
     this.moveToNextCameraPosition();
   } else if (event.deltaY > 0) {
     // Scroll down
     this.moveToPreviousCameraPosition();
   }
 }

 moveToNextCameraPosition(): void {
   if (this.currentCameraIndex < this.cameraPositionsAndAngles.length - 1) {
     this.currentCameraIndex++;
     const { position, alpha, beta } = this.cameraPositionsAndAngles[this.currentCameraIndex];
     this.animateScrollerCameraPosition(this.camera, position, alpha, beta);
   }
 }

 moveToPreviousCameraPosition(): void {
   if (this.currentCameraIndex > 0) {
     this.currentCameraIndex--;
     const { position, alpha, beta } = this.cameraPositionsAndAngles[this.currentCameraIndex];
     this.animateScrollerCameraPosition(this.camera, position, alpha, beta);
   }
 }

 private animateScrollerCameraPosition(camera: BABYLON.Camera, position: BABYLON.Vector3, alpha?: number, beta?: number, onComplete?: () => void): void {
   const animationPosition = new BABYLON.Animation(
     "cameraPositionAnimation",
     "position",
     30,
     BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
     BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
   );

   const keysPosition = [
     { frame: 0, value: camera.position.clone() },
     { frame: 100, value: position }
   ];

   animationPosition.setKeys(keysPosition);

   camera.animations = [];
   camera.animations.push(animationPosition);

   if (camera instanceof BABYLON.ArcRotateCamera && alpha !== undefined && beta !== undefined) {
     const animationAlpha = new BABYLON.Animation(
       "cameraAlphaAnimation",
       "alpha",
       30,
       BABYLON.Animation.ANIMATIONTYPE_FLOAT,
       BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
     );

     const keysAlpha = [
       { frame: 0, value: camera.alpha },
       { frame: 100, value: alpha }
     ];

     animationAlpha.setKeys(keysAlpha);

     const animationBeta = new BABYLON.Animation(
       "cameraBetaAnimation",
       "beta",
       30,
       BABYLON.Animation.ANIMATIONTYPE_FLOAT,
       BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
     );

     const keysBeta = [
       { frame: 0, value: camera.beta },
       { frame: 100, value: beta }
     ];

     animationBeta.setKeys(keysBeta);

     camera.animations.push(animationAlpha);
     camera.animations.push(animationBeta);
   }

   this.scene.beginAnimation(camera, 0, 100, false, 1, onComplete);
 }
 //End Cursor ratation Function ----------------------------------------------------------------
 //Add Export/Import Functionality ----------------------------------------------------------------
 exportModels(): void {
   const modelData = this.selectedModels.map(model => ({
     name: model.name,
     position: {
       x: model.position.x,
       y: model.position.y,
       z: model.position.z
     },
     rotation: model.rotationQuaternion ? {
       x: model.rotationQuaternion.x,
       y: model.rotationQuaternion.y,
       z: model.rotationQuaternion.z,
       w: model.rotationQuaternion.w
     } : null,
     scaling: {
       x: model.scaling.x,
       y: model.scaling.y,
       z: model.scaling.z
     },
     modelFile: model.name.split('_')[0] // Get original model file name
   }));

   const dataStr = JSON.stringify(modelData);
   const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

   const exportName = 'modelLayout_' + new Date().toISOString().slice(0, 10) + '.json';

   const linkElement = document.createElement('a');
   linkElement.setAttribute('href', dataUri);
   linkElement.setAttribute('download', exportName);
   linkElement.click();
 }

 importModels(): void {
   if (this.selectedModels.length > 0) {
     if (!confirm('Importing will remove all existing models. Do you want to continue?')) {
       return;
     }
     // Clear existing models
     this.clearAllModels();
   }

   const input = document.createElement('input');
   input.type = 'file';
   input.accept = '.json';

   input.onchange = (event: Event) => {
     const file = (event.target as HTMLInputElement).files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onload = (e) => {
         const text = e.target?.result;
         try {
           const modelData = JSON.parse(text as string);
           this.loadSavedModels(modelData);
         } catch (error) {
           console.error('Error parsing JSON:', error);
           alert('Error loading file. Please ensure it is a valid model layout file.');
         }
       };
       reader.readAsText(file);
     }
   };

   input.click();
 }

 private clearAllModels(): void {
   // Remove all models from scene and arrays
   this.selectedModels.forEach(model => {
     model.dispose();
   });
   this.glbModels = [];
   this.selectedModels = [];
   this.selectedModel = undefined;
   this.updateDistanceLinesAndTexts();
   this.applyOutlineEffect(false)
 }

 private async loadSavedModels(modelData: any[]): Promise<void> {
   for (const data of modelData) {
     try {
       const model = await this.addModel(data.modelFile, data.scaling.x, this.DEFAULT_MODEL_SIZE, "");
       if (model) {
         // Set position
         model.position = new BABYLON.Vector3(
           data.position.x,
           data.position.y,
           data.position.z
         );

         // Set rotation if exists
         if (data.rotation) {
           model.rotationQuaternion = new BABYLON.Quaternion(
             data.rotation.x,
             data.rotation.y,
             data.rotation.z,
             data.rotation.w
           );
         }

         // Set scaling
         model.scaling = new BABYLON.Vector3(
           data.scaling.x,
           data.scaling.y,
           data.scaling.z
         );
       }
     } catch (error) {
       console.error(`Error loading model ${data.modelFile}:`, error);
     }
   }
 }
 //End Export/Import Functionality ----------------------------------------------------------------

 //Start Export/Import possition and angle Functionality ----------------------------------------------------------------
 exportCameraPositions(): void {
   console.log("Export Camera Positions", this.cameraPositionsAndAngles);
   const dataStr = JSON.stringify(this.cameraPositionsAndAngles, null, 2);
   const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

   const exportFileDefaultName = 'cameraPositionsAndAngles.json';

   const linkElement = document.createElement('a');
   linkElement.setAttribute('href', dataUri);
   linkElement.setAttribute('download', exportFileDefaultName);
   linkElement.click();
 }

 // Method to import cameraPositionsAndAngles from a JSON file
 importCameraPositions(): void {
   if (this.cameraPositionsAndAngles.length > 0) {
     if (!confirm('Importing will remove Existing Angles. Do you want to continue?')) {
       return;
     }
     // Clear existing models
     this.cameraPositionsAndAngles = [];
   }

   const input = document.createElement('input');
   input.type = 'file';
   input.accept = '.json';

   input.onchange = (event: Event) => {
     const file = (event.target as HTMLInputElement).files?.[0];
     if (file) {
       const reader = new FileReader();
       reader.onload = (e) => {
         const text = e.target?.result;
         try {
           this.cameraPositionsAndAngles = JSON.parse(text as string);
           this.cameraPositionsAndAngles.map((data: any) => {
             data.position = new BABYLON.Vector3(data.position.x, data.position.y, data.position.z);
             return data;
           });
           console.log('Imported camera positions:', this.cameraPositionsAndAngles);
         } catch (error) {
           console.error('Error parsing JSON:', error);
           alert('Error loading file. Please ensure it is a valid model layout file.');
         }
       };
       reader.readAsText(file);
     }
   };

   input.click();
 }
 //End Export/Import possition and angle Functionality ----------------------------------------------------------------
}