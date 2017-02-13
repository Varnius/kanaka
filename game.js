var initialData = {
    fuel: 50,
};
var pageLoaded = false;
var initialDataServed = window.dev;

function initGame() {
    var Engine = Matter.Engine,
        Render = Matter.Render,
        World = Matter.World,
        Bodies = Matter.Bodies,
        Body = Matter.Body,
        Query = Matter.Query,
        Bounds = Matter.Bounds;

    const SCREEN_WIDTH = 960;
    const SCREEN_HEIGHT = 600;
    const NUM_TILES_X = 26;
    const NUM_TILES_Y = 150;
    const TILE_SIZE = 64;
    const PREVENT_DEFAULT_FOR = [37, 38, 39, 40, 32, 68];
    const DRILL_KEYS = [37, 38, 39, 40];
    const RUBBER_BAND_FACTOR = 10;
    const INITIAL_FUEL = 50;

    var TileType = {
        GRASS: {
            eventId: 'dirt',
            drillDuration: 0.5,
            fuel: 1,
            texture: () => 'grass',
        },
        DIRT: {
            eventId: 'dirt',
            drillDuration: 0.5,
            fuel: 1,
            texture: () => Math.random() < 0.5 ? 'dirt' : 'dirt2',
        },
        DRILLED: {
            ghost: true,
            texture: () => 'drilled',
        },
        IRON: {
            eventId: 'iron',
            texture: () => 'iron',
            fuel: 2,
            chance: 0.1,
            drillDuration: 2,
            depth: { from: 0.0, to: 0.3 },
            color: [208, 226, 248],
        },
        COPPER: {
            eventId: 'copper',
            texture: () => 'copper',
            fuel: 4,
            chance: 0.1,
            drillDuration: 4,
            depth: { from: 0.1, to: 0.4 },
        },
        SILVER: {
            eventId: 'silver',
            texture: () => 'silver',
            fuel: 8,
            chance: 0.1,
            drillDuration: 6,
            depth: { from: 0.2, to: 0.6 },
        },
        GOLD: {
            eventId: 'gold',
            texture: () => 'gold',
            fuel: 16,
            chance: 0.1,
            drillDuration: 8,
            depth: { from: 0.5, to: 0.8 },
        },
        TITAN: {
            eventId: 'titan',
            texture: () => 'titan',
            fuel: 32,
            chance: 0.1,
            drillDuration: 10,
            depth: { from: 0.7, to: 1.0 },
        },
    };

    const GOODS = [
        TileType.IRON, TileType.GOLD, TileType.TITAN, TileType.COPPER, TileType.SILVER,
    ];

    // Setup PIXI

    var app = new PIXI.Application(SCREEN_WIDTH, SCREEN_HEIGHT, { backgroundColor: 0xF5A38F, roundPixels: true });
    var stage = app.stage;
    var level = new PIXI.Container();
    stage.addChild(level);

    document.body.appendChild(app.view);

    // Physics

    var engine = Engine.create();
    engine.world.gravity.y = 11;
    var render;

    //if (window.dev) {
    //    render = Render.create({
    //        element: document.body,
    //        engine: engine,
    //        options: {
    //            width: SCREEN_WIDTH,
    //            height: SCREEN_HEIGHT,
    //            hasBounds: true,
    //        }
    //    });
    //}

    // Load things

    var assetLocation = !window.dev ? 'https://varnius.github.io/kanaka/' : '';

    PIXI.loader.add('drill', assetLocation + 'assets/drill.png');
    PIXI.loader.add('apparatus', assetLocation + 'assets/apparatus.png');
    PIXI.loader.add('drilled', assetLocation + 'assets/drilled.png');
    PIXI.loader.add('dirt', assetLocation + 'assets/dirt.png');
    PIXI.loader.add('dirt2', assetLocation + 'assets/dirt2.png');
    PIXI.loader.add('grass', assetLocation + 'assets/grass.png');
    PIXI.loader.add('iron', assetLocation + 'assets/iron.png');
    PIXI.loader.add('gold', assetLocation + 'assets/gold.png');
    PIXI.loader.add('copper', assetLocation + 'assets/copper.png');
    PIXI.loader.add('silver', assetLocation + 'assets/silver.png');
    PIXI.loader.add('titan', assetLocation + 'assets/titan.png');
    PIXI.loader.add('piecedirt', assetLocation + 'assets/piece.png');
    PIXI.loader.add('pieceiron', assetLocation + 'assets/iron-piece.png');
    PIXI.loader.add('piecesilver', assetLocation + 'assets/silver-piece.png');
    PIXI.loader.add('piecegold', assetLocation + 'assets/gold-piece.png');
    PIXI.loader.add('piececopper', assetLocation + 'assets/copper-piece.png');
    PIXI.loader.add('piecetitan', assetLocation + 'assets/titan-piece.png');
    PIXI.loader.once('complete', onAssetsLoaded);
    PIXI.loader.load();

    function onAssetsLoaded(loader, resources) {
        var lastTime = 0;
        var delta;

        var activeDrillKeys = [];

        var playerStartPosition = { x: 0, y: 0 };
        var hMov = 0;
        var maxXVelocity = 260;
        var maxYVelocity = 500;
        var damping = 0.7;
        var hVelocity = 0;
        var vVelocity = 0;
        var acceleration = 15;
        var isFlying = false;
        var isFalling = false;
        var isDrilling = false;
        var drillDirection;
        var prevX;
        var activeTile;
        var activeTileFilter = new PIXI.filters.ColorMatrixFilter();

        var tiles;
        var drill;

        const r = new PIXI.Rectangle();
        const levelBounds = new PIXI.Rectangle();

        var particles;
        var drillEmitter;

        // handle in game for now
        var fuel = INITIAL_FUEL; //initialData.fuel;

        init();

        function init() {
            // Events

            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);

            createGrid();
            createDrill();
            createEmitters();

            // Listen for frame updates
            app.ticker.add(tick);

            // physics debug renderer
            //if (window.dev) Render.run(render);
            //Bounds.translate(render.bounds, {x:-200, y: 0});
        }

        // Game loop

        function tick() {
            var now = new Date().getTime();
            delta = (now - lastTime) / 1000;

            handleMovement();
            handleDrillProcess();
            updateDrillPosition();
            handleCamera();
            handleRefill();

            Engine.update(engine);

            lastTime = now;
        }

        function handleMovement() {

            if (hMov !== 0)
                hVelocity += (hVelocity * hMov < 0 ? 4 : 1) * acceleration * hMov;
            else
                hVelocity *= damping;

            if (isFlying) vVelocity += acceleration * 2;

            if (Math.abs(hVelocity) > maxXVelocity) hVelocity = maxXVelocity * hMov;
            if (Math.abs(hVelocity) < 0.1) hVelocity = 0;
            if (Math.abs(vVelocity) > maxYVelocity) vVelocity = maxYVelocity;

            Body.setVelocity(drill.body, { x: hVelocity * delta, y: isFlying ? -(vVelocity * delta) : 0 });

            if (Math.abs(prevX - drill.body.position.x) < 0.1 && hMov !== 0) hVelocity = 0;

            prevX = drill.body.position.x;

            if (hMov !== 0) drill.scale = { x: -hMov, y: 1 };
        }

        function handleDrillProcess() {
            if (!isDrilling || !drillDirection) {
                if (activeTile) activeTile.filters = null;
                activeTile = null;
                drillEmitter.emit = false;
                return;
            }

            var end;
            var pos = drill.body.position;
            var rayLength = 40;

            if (drillDirection === 'up') end = { x: pos.x, y: pos.y - rayLength };
            if (drillDirection === 'down') end = { x: pos.x, y: pos.y + rayLength };
            if (drillDirection === 'left') end = { x: pos.x - rayLength, y: pos.y };
            if (drillDirection === 'right') end = { x: pos.x + rayLength, y: pos.y };

            var bodies = Matter.Composite.allBodies(engine.world);
            var res = Query.ray(bodies, pos, end);

            drillEmitter.emit = false;

            if (res.length > 1 && res[0].body.tile) {
                var type = res[0].body.tile.type;

                // Handle drilled particle positions
                var drillBounds = drill.getBounds();
                particles.x = drillBounds.x + drillBounds.width / 2;
                particles.y = drillBounds.y + drillBounds.height - 27;
                particles.rotation = 0;
                drillEmitter.particleImages = [resources['piece' + type.eventId].texture];

                if (drillDirection === 'left') {
                    particles.rotation = Math.PI / 2;
                    particles.x -= 25;
                    particles.y -= 5;
                } else if (drillDirection === 'right') {
                    particles.rotation = -Math.PI / 2;
                    particles.x += 25;
                    particles.y -= 5;
                } else if (drillDirection === 'up') {
                    particles.rotation = Math.PI;
                    particles.y -= 50;
                }

                drillEmitter.emit = true;

                // Handle active tile and its animation
                if (activeTile !== res[0].body.tile) {
                    if (activeTile) activeTile.filters = null;
                    activeTile = res[0].body.tile;
                    activeTile.filters = [activeTileFilter];
                } else {
                    let d = new Date().getTime();
                    activeTile.filters[0].brightness((Math.sin(d / 20) / 2 + 2) / 2 + 0.5);
                }

                activeTile.timeLeft -= delta;

                if (activeTile.timeLeft <= 0) {
                    tiles.removeChild(activeTile);
                    var drilledTile = new PIXI.Sprite(resources[TileType.DRILLED.texture()].texture);
                    tiles.addChild(drilledTile);
                    drilledTile.position = activeTile.position;
                    Matter.World.remove(engine.world, activeTile.body);

                    onMineralDrilled(activeTile.type);
                    fuel -= activeTile.type.fuel;
                    onFuelChange(fuel <= 0 ? 0 : fuel)

                    if (fuel <= 0) fuelOver();
                }
            }
        }

        function updateDrillPosition() {
            drill.x = drill.body.position.x;
            drill.y = drill.body.position.y;

            if (drillDirection === 'up') drill.setUp();
            else if (drillDirection === 'down') drill.setDown();
            else if (drillDirection === 'left') drill.setHorizontal();
            else if (drillDirection === 'right') drill.setHorizontal();
        }

        function handleCamera() {
            drill.getBounds(false, r);
            var deltaX = (SCREEN_WIDTH / 2 - r.x - r.width / 2) / RUBBER_BAND_FACTOR;
            var deltaY = (SCREEN_HEIGHT / 2 - r.y - r.height / 2) / RUBBER_BAND_FACTOR;

            level.x += Math.floor(deltaX);
            level.y += Math.floor(deltaY);
            level.getBounds(false, r);

            // Camera bounds

            if (r.x > 0) level.x = -levelBounds.x;
            if (r.x + r.width < SCREEN_WIDTH) level.x = -(levelBounds.width + levelBounds.x - SCREEN_WIDTH);
            //if (r.y > TILE_SIZE * 2) level.y = TILE_SIZE * 2; meh
        }

        function fuelOver() {
            drill.filters = [activeTileFilter];

            var interval = setInterval(function () {
                var d = new Date().getTime();
                if (drill.filters) drill.filters[0].brightness((Math.sin(d / 20) / 2 + 2) / 2 + 0.5);
            }, 20);

            setTimeout(function () {
                onFuelGone();
                Matter.Body.setPosition(drill.body, playerStartPosition);
                drill.filters = null;
                clearInterval(interval);
            }, 1000);
        }

        function handleRefill() {
            if (drill.body.position.y < -25 && fuel !== INITIAL_FUEL) {
                onFuelChange(INITIAL_FUEL);
                fuel = INITIAL_FUEL;
            }
        }

        // Input events

        function onKeyDown(e) {
            if (PREVENT_DEFAULT_FOR.includes(e.keyCode)) e.preventDefault();

            if (e.keyCode === 37) hMov = -1;
            else if (e.keyCode === 39) hMov = 1;

            if (e.keyCode === 37) drillDirection = 'left';
            if (e.keyCode === 39) drillDirection = 'right';
            if (e.keyCode === 38) drillDirection = 'up';
            if (e.keyCode === 40) drillDirection = 'down'

            if (e.keyCode === 32) isFlying = true;
            if (DRILL_KEYS.includes(e.keyCode)) {
                activeDrillKeys.push(e.keyCode);
                isDrilling = true;
            }
        }

        function onKeyUp(e) {
            if (PREVENT_DEFAULT_FOR.includes(e.keyCode)) e.preventDefault();
            if (e.keyCode === 37 || e.keyCode === 39) hMov = 0;
            if (e.keyCode === 32) isFlying = false;

            if ([37, 38, 39, 40].includes(e.keyCode)) drillDirection = null;
            if (DRILL_KEYS.includes(e.keyCode)) {
                activeDrillKeys.splice(activeDrillKeys.indexOf(e.keyCode), 1);
                isDrilling = activeDrillKeys.length > 0;
            }
        }

        // Helpers

        function createGrid() {
            var bodies = [];
            tiles = new PIXI.Container();
            level.addChild(tiles);

            for (var i = -NUM_TILES_X / 2; i < NUM_TILES_X; i++) {
                for (var j = 0; j < NUM_TILES_Y; j++) {
                    var type;

                    if (j === 0) type = TileType.GRASS;
                    else {
                        var currDepth = j / NUM_TILES_Y;
                        var filteredGoods = GOODS.filter(item => currDepth >= item.depth.from && currDepth < item.depth.to);
                        var index = Math.floor(Math.random() * (filteredGoods.length));
                        var good = filteredGoods[index];
                        type = good && Math.random() < good.chance ? good : TileType.DIRT;
                    }

                    var tile = new PIXI.Sprite(resources[type.texture()].texture);
                    var posX = i * TILE_SIZE + TILE_SIZE / 2;
                    var posY = j * TILE_SIZE + TILE_SIZE / 2;
                    tile.x = posX - TILE_SIZE / 2;
                    tile.y = posY - TILE_SIZE / 2;

                    if (!type.ghost) {
                        tile.body = Bodies.rectangle(posX, posY, TILE_SIZE, TILE_SIZE, {
                            isStatic: true,
                            label: `tile ${i} ${j}`
                        });
                        tile.type = type;
                        tile.body.tile = tile;
                        tile.timeLeft = type.drillDuration;
                        bodies.push(tile.body);
                    }

                    tiles.addChild(tile);
                }
            }

            // Add some boundaries to the sides of the level (left/right/top)

            bodies.push(Bodies.rectangle(
                (-NUM_TILES_X / 2 * TILE_SIZE) + TILE_SIZE / 2,
                NUM_TILES_Y * TILE_SIZE / 2 - TILE_SIZE * 2,
                TILE_SIZE,
                NUM_TILES_Y * TILE_SIZE + TILE_SIZE * 2,
                { isStatic: true })
            );

            bodies.push(Bodies.rectangle(
                (-NUM_TILES_X / 2 * TILE_SIZE) + (NUM_TILES_X / 2 * TILE_SIZE),
                -TILE_SIZE * 2 + TILE_SIZE / 2 + 12,
                NUM_TILES_X * 2 * TILE_SIZE,
                TILE_SIZE,
                { isStatic: true })
            );

            bodies.push(Bodies.rectangle(
                NUM_TILES_X * TILE_SIZE - TILE_SIZE / 2,
                NUM_TILES_Y * TILE_SIZE / 2 - TILE_SIZE * 2,
                TILE_SIZE,
                NUM_TILES_Y * TILE_SIZE + TILE_SIZE * 2,
                { isStatic: true })
            );

            level.getBounds(false, levelBounds);
            World.add(engine.world, bodies);
        }

        function createDrill() {
            const drillBody = Matter.Bodies.rectangle(0, 0, 64, 48, { chamfer: { radius: 30 } });
            const jumpSensor = Bodies.rectangle(0, 28, 10, 10, { sleepThreshold: 99999999999, isSensor: true })
            const player = Body.create({
                parts: [drillBody, jumpSensor],
                inertia: Infinity, //prevents player rotation
                friction: 0.002,
                restitution: 0.3,
                sleepThreshold: Infinity,
                label: 'drill',
                //frictionStatic: 0.5,
                //collisionFilter: {group: -2},
            });
            Matter.Body.setPosition(player, playerStartPosition);
            Matter.Body.setMass(player, 5);
            World.add(engine.world, [player]);

            drill = new PIXI.Container();
            drill.body = player;

            var drilly = new PIXI.Sprite(resources.drill.texture);

            drill.setHorizontal = () => {
                drilly.scale = { x: -1, y: 1 };
                drilly.position = { x: 10, y: 8 };
                drilly.rotation = 0.1;
            };

            drill.setUp = () => {
                drilly.scale = { x: -1, y: 1 };
                drilly.position = { x: 65, y: 20 };
                drilly.rotation = Math.PI / 2;
            };

            drill.setDown = () => {
                drilly.scale = { x: -1, y: 1 };
                drilly.position = { x: 1, y: 60 };
                drilly.rotation = -Math.PI / 2;
            };

            drill.setHorizontal();

            level.addChild(drill);
            drill.addChild(new PIXI.Sprite(resources.apparatus.texture));
            drill.addChild(drilly);
            drill.pivot.set(30, 39);

            updateDrillPosition();
        }

        function createEmitters() {
            particles = new PIXI.Container();
            stage.addChild(particles);

            var emitter = new PIXI.particles.Emitter(
                particles,
                resources.piecedirt.texture,
                {
                    autoUpdate: true,
                    alpha: {
                        start: 1,
                        end: 0.0
                    },
                    scale: {
                        start: 0.5,
                        end: 0.3
                    },
                    color: {
                        start: 'ffffff',
                        end: '9ff3ff',
                    },
                    speed: {
                        start: 1000,
                        end: 200
                    },
                    startRotation: {
                        min: 225,
                        max: 320
                    },
                    rotationSpeed: {
                        min: 0,
                        max: 20
                    },
                    lifetime: {
                        min: 0.25,
                        max: 0.4
                    },
                    blendMode: 'normal',
                    frequency: 0.001,
                    emitterLifetime: 0,
                    maxParticles: 1000,
                    pos: {
                        x: 0,
                        y: 0
                    },
                    addAtBack: false,
                    spawnType: 'circle',
                    spawnCircle: {
                        x: 0,
                        y: 0,
                        r: 0
                    }
                }
            );

            drillEmitter = emitter;
        }
    }

    // Add dummy div for click event
    var dummyDiv = document.body.appendChild(document.createElement('div'));
    dummyDiv.style.width = '100%';
    dummyDiv.style.height = '100%';
    dummyDiv.style.position = 'absolute';
    dummyDiv.style.top = '0';
}

function onMineralDrilled(type) {
    window.parent.postMessage({ type: 'MINED_MINERAL', mineral: type.eventId }, '*');
}

function onFuelGone() {
    window.parent.postMessage({ type: 'FUEL_GONE' }, '*');
}

function onFuelChange(amount) {
    window.parent.postMessage({ type: 'FUEL_CHANGE', amount }, '*');
}

function tryStartGame() {
    if (pageLoaded && initialDataServed) {
        initGame();
    }
}

window.addEventListener('message', function (e) {
    if (e.data.type === 'START_GAME') {
        window.focus();
        initialData = e.data.initialData;
        initialDataServed = true;
        tryStartGame();
    }
}, false);

window.addEventListener('load', function (e) {
    pageLoaded = true;
    window.parent.postMessage({ type: 'GAME_LOADED' }, '*');
    tryStartGame();
});
