window.addEventListener('load', function () {
    var Engine = Matter.Engine,
        Render = Matter.Render,
        World = Matter.World,
        Bodies = Matter.Bodies,
        Body = Matter.Body,
        Query = Matter.Query;

    var NUM_TILES_X = 100;
    var NUM_TILES_Y = 100;
    var TILE_SIZE = 64;
    var PREVENT_DEFAULT_FOR = [37, 38, 39, 40, 32];

    var TileType = {
        SKY: {
            ghost: true,
            texture: 'tile-sky',
        },
        REGULAR: {
            drillDuration: 2,
            texture: 'tile-regular',
        },
        DRILLED: {
            ghost: true,
            texture: 'tile-drilled',
        },
    };

    // Setup PIXI

    var app = new PIXI.Application(960, 600, { backgroundColor: 0x1099bb, roundPixels: true });
    var stage = app.stage;
    document.body.appendChild(app.view);

    // Physics

    var engine = Engine.create();
    engine.world.gravity.y = 20;
    var render;

    if(window.dev) {
        render = Render.create({
            element: document.body,
            engine: engine,
            options: {
                width: 960,
                height: 600,
            }
        });
    }

    // Load things

    var assetLocation = !window.dev ? 'https://varnius.github.io/kanaka/' : '';

    PIXI.loader.add('drill', assetLocation + 'assets/drill.png');
    PIXI.loader.add('tile-regular', assetLocation + 'assets/tile-regular.png');
    PIXI.loader.add('tile-sky', assetLocation + 'assets/tile-sky.png');
    PIXI.loader.once('complete', onAssetsLoaded);
    PIXI.loader.load();

    function onAssetsLoaded(loader, resources) {
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
            if (window.dev) Render.run(render);
        }

        // Game loop

        var lastTime = 0;
        var delta;

        var hMov = 0;
        var maxVelocity = 260;
        var damping = 0.7;
        var hVelocity = 0;
        var vVelocity = 0;
        var acceleration = 15;
        var isFlying = false;
        var isDrilling = false;
        var drillDirection;
        var prevX;

        var tiles;
        var drill;

        function tick() {
            var now = new Date().getTime();
            delta = (now - lastTime) / 1000;

            handleMovement();
            handleDrill();
            updateDrillPosition();
            Engine.update(engine);

            lastTime = now;
        }

        function handleMovement() {
            if (hMov !== 0)
                hVelocity += (hVelocity * hMov < 0 ? 4 : 1) * acceleration * hMov;
            else
                hVelocity *= damping;

            if (isFlying) vVelocity += acceleration;

            if (Math.abs(hVelocity) > maxVelocity) hVelocity = maxVelocity * hMov;
            if (Math.abs(hVelocity) < 0.1) hVelocity = 0;
            if (Math.abs(vVelocity) > maxVelocity) vVelocity = maxVelocity;

            Body.setVelocity(drill.body, { x: hVelocity * delta, y: isFlying ? -(vVelocity * delta) : 0 });

            if (Math.abs(prevX - drill.body.position.x) < 0.1 && hMov !== 0) hVelocity = 0;

            prevX = drill.body.position.x;
        }

        function handleDrill() {
            if (!isDrilling || !drillDirection) return;

            var end;
            var pos = drill.body.position;
            var rayLength = 40;

            if (drillDirection === 'up') end = { x: pos.x, y: pos.y - rayLength };
            if (drillDirection === 'down') end = { x: pos.x, y: pos.y + rayLength };
            if (drillDirection === 'left') end = { x: pos.x - rayLength, y: pos.y };
            if (drillDirection === 'right') end = { x: pos.x + rayLength, y: pos.y };

            var bodies = Matter.Composite.allBodies(engine.world);
            var res = Query.ray(bodies, pos, end);

            if (res.length > 1) {
                var tile = res[0].body.tile;
                tile.timeLeft -= delta;

                let colorMatrix = new PIXI.filters.ColorMatrixFilter();
                tile.filters = [colorMatrix];
                colorMatrix.contrast(2);

                if (tile.timeLeft < 0) {
                    tiles.removeChild(tile);
                    Matter.World.remove(engine.world, tile.body);
                }
            }
        }

        function updateDrillPosition() {
            drill.position.x = drill.body.position.x;
            drill.position.y = drill.body.position.y;
        }

        // Input events

        function onKeyDown(event) {
            if (PREVENT_DEFAULT_FOR.includes(event.keyCode)) event.preventDefault();

            if (event.keyCode === 37) hMov = -1;
            else if (event.keyCode === 39) hMov = 1;

            if (event.keyCode === 37) drillDirection = 'left';
            if (event.keyCode === 39) drillDirection = 'right';
            if (event.keyCode === 38) drillDirection = 'up';
            if (event.keyCode === 40) drillDirection = 'down'

            if (event.keyCode === 32) isFlying = true;
            if (event.keyCode === 68) isDrilling = true;
        }

        function onKeyUp(event) {
            if (PREVENT_DEFAULT_FOR.includes(event.keyCode)) event.preventDefault();
            if (event.keyCode === 37 || event.keyCode === 39) hMov = 0;
            if (event.keyCode === 32) isFlying = false;

            if ([37, 38, 39, 40].includes(event.keyCode)) drillDirection = null;
            if (event.keyCode === 68) isDrilling = false;
        }

        // Generate level

        function createGrid() {
            var bodies = [];
            tiles = new PIXI.Container();
            stage.addChild(tiles);

            for (var i = -NUM_TILES_X / 2; i < NUM_TILES_X; i++) {
                for (var j = 0; j < NUM_TILES_Y; j++) {
                    var isSky = (j === 0 || j === 1) && (i > 1 && i < 13);
                    isSky = isSky || (j === 2 && i === 10);

                    var type = isSky ? TileType.SKY : TileType.REGULAR,

                        tile = new PIXI.Sprite(resources[type.texture].texture);
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

            World.add(engine.world, bodies);
        }

        function createDrill() {
            const drillBody = Matter.Bodies.circle(0, 0, 25);

            var jumpSensor = Bodies.rectangle(0, 30, 10, 10, {
                sleepThreshold: 99999999999,
                isSensor: true
            });

            const player = Body.create({
                parts: [drillBody, jumpSensor],
                inertia: Infinity, //prevents player rotation
                friction: 0.002,
                //frictionStatic: 0.5,
                restitution: 0.3,
                sleepThreshold: Infinity,
                label: 'drill',
                //collisionFilter: {
                //    group: -2
                //},
            });
            Matter.Body.setPosition(player, { x: TILE_SIZE * 5, y: TILE_SIZE });
            Matter.Body.setMass(player, 5);
            World.add(engine.world, [player]);

            drill = new PIXI.Container();
            drill.body = player;

            stage.addChild(drill);
            drill.addChild(new PIXI.Sprite(resources.drill.texture));
            drill.pivot.set(25, 25);
            drill.position.x = TILE_SIZE * 7;
            drill.position.y = TILE_SIZE;

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
