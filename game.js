window.addEventListener('load', function () {
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

    var TileType = {
        GRASS: {
            drillDuration: 1,
            texture: () => 'grass',
        },
        REGULAR: {
            drillDuration: 0.5,
            texture: () => 'dirt',
        },
        DRILLED: {
            ghost: true,
            texture: () => 'drilled',
        },
        IRON: {
            texture: () => 'iron',
            chance: 0.05,
            drillDuration: 2,
            depth: { from: 0, to: 0.6 },
        },
        GOLD: {
            texture: () => 'gold',
            chance: 0.05,
            drillDuration: 2,
            depth: { from: 0.4, to: 0.8 },
        },
        WIXIUM: {
            texture: () => 'wixium',
            chance: 0.05,
            drillDuration: 2,
            depth: { from: 0.7, to: 1.0 },
        },
    };

    const GOODS = [
        TileType.IRON, TileType.GOLD, TileType.WIXIUM,
    ];

    // Setup PIXI

    //PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
    var app = new PIXI.Application(SCREEN_WIDTH, SCREEN_HEIGHT, { backgroundColor: 0x1099bb, roundPixels: true });
    var stage = app.stage;
    var level = new PIXI.Container();
    stage.addChild(level);

    document.body.appendChild(app.view);

    // Physics

    var engine = Engine.create();
    engine.world.gravity.y = 11;
    var render;

    if (window.dev) {
        //render = Render.create({
        //    element: document.body,
        //    engine: engine,
        //    options: {
        //        width: SCREEN_WIDTH,
        //        height: SCREEN_HEIGHT,
        //        hasBounds: true,
        //    }
        //});
    }

    // Load things

    var assetLocation = !window.dev ? 'https://varnius.github.io/kanaka/' : '';

    PIXI.loader.add('drill', assetLocation + 'assets/drill.png');
    PIXI.loader.add('apparatus', assetLocation + 'assets/apparatus.png');
    PIXI.loader.add('piece', assetLocation + 'assets/piece.png');
    PIXI.loader.add('drilled', assetLocation + 'assets/drilled.png');
    PIXI.loader.add('dirt', assetLocation + 'assets/dirt.png');
    PIXI.loader.add('grass', assetLocation + 'assets/grass.png');
    PIXI.loader.add('iron', assetLocation + 'assets/iron.png');
    PIXI.loader.add('gold', assetLocation + 'assets/gold.png');
    PIXI.loader.add('wixium', assetLocation + 'assets/wixium.png');
    PIXI.loader.once('complete', onAssetsLoaded);
    PIXI.loader.load();

    function onAssetsLoaded(loader, resources) {
        var lastTime = 0;
        var delta;

        var activeDrillKeys = [];

        var hMov = 0;
        var maxXVelocity = 260;
        var maxYVelocity = 400;
        var damping = 0.7;
        var hVelocity = 0;
        var vVelocity = 0;
        var acceleration = 15;
        var isFlying = false;
        var isDrilling = false;
        var drillDirection;
        var prevX;
        var activeTile;
        var activeTileFilter = new PIXI.filters.ColorMatrixFilter();

        var tiles;
        var drill;

        const r = new PIXI.Rectangle();
        const levelBounds = new PIXI.Rectangle();

        init();

        function init() {
            // Events

            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);

            // Listen for frame updates
            app.ticker.add(tick);
            createGrid();
            createDrill();

            // physics debug renderer
            //if (window.dev) Render.run(render);
            //Bounds.translate(render.bounds, {x:-400, y: -400});
        }

        // Game loop

        function tick() {
            var now = new Date().getTime();
            delta = (now - lastTime) / 1000;

            handleMovement();
            handleDrillProcess();
            updateDrillPosition();
            handleCamera();
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

            if (res.length > 1 && res[0].body.tile) {
                if (activeTile !== res[0].body.tile) {
                    if (activeTile) activeTile.filters = null;
                    activeTile = res[0].body.tile;
                    activeTileFilter.contrast(2);
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
            //if (r.y > 0) level.y = -levelBounds.y;
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

        // Generate level

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
                        var good = GOODS.filter(item => currDepth >= item.depth.from && currDepth < item.depth.to)[0];
                        type = good && Math.random() < good.chance ? good : TileType.REGULAR;
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
            const drillBody = Matter.Bodies.rectangle(0, 0, 60, 42);

            var jumpSensor = Bodies.rectangle(0, 28, 10, 10, { sleepThreshold: 99999999999, isSensor: true });
            var c1 = Bodies.circle(-23, -16, 10);
            var c2 = Bodies.circle(-23, 16, 10);
            var c3 = Bodies.circle(23, -16, 10);
            var c4 = Bodies.circle(23, 16, 10);

            const player = Body.create({
                parts: [drillBody, jumpSensor, c1, c2, c3, c4],
                inertia: Infinity, //prevents player rotation
                friction: 0.002,
                restitution: 0.3,
                sleepThreshold: Infinity,
                label: 'drill',
                //frictionStatic: 0.5,
                //collisionFilter: {group: -2},
            });
            Matter.Body.setPosition(player, { x: 0, y: 0 });
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
            drill.pivot.set(30, 36);

            updateDrillPosition();
        }
    }

    // Add dummy div for click event
    var dummyDiv = document.body.appendChild(document.createElement('div'));
    dummyDiv.style.width = '100%';
    dummyDiv.style.height = '100%';
    dummyDiv.style.position = 'absolute';
    dummyDiv.style.top = '0';
});

var score = 0;
setInterval(function () {
    score += 2;
    window.parent.postMessage('Your score: ' + score, "*");
}, 2000);

window.addEventListener("message", function (ev) {
    if (ev.data.type === 'START_GAME') {
        window.focus();
    }
}, false);
