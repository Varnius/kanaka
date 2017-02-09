window.addEventListener('load', function ()
{
    var NUM_TILES_X = 100;
    var NUM_TILES_Y = 100;
    var TILE_SIZE = 64;
    var PREVENT_DEFAULT_FOR = [37, 38, 39, 40];

    // Setup PIXI

    var app = new PIXI.Application(960, 600, { backgroundColor: 0x1099bb, roundPixels: true });
    document.body.appendChild(app.view);

    // Setup physics

    var Engine = Matter.Engine,
        Render = Matter.Render,
        World = Matter.World,
        Bodies = Matter.Bodies,
        Body = Matter.Body;

    var engine = Engine.create();
    var render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: 960,
            height: 600,
        }
    });

    // Load things

    var assetLocation = !window.dev ? 'https://varnius.github.io/kanaka/' : '';

    PIXI.loader.add('drill', assetLocation + 'assets/musa.png');
    PIXI.loader.add('regularTile', assetLocation + 'assets/tile-test.png');
    PIXI.loader.add('sky', assetLocation + 'assets/sky.png');
    PIXI.loader.once('complete', onAssetsLoaded);
    PIXI.loader.load();

    var bunny;
    var stage = app.stage;

    function onAssetsLoaded(loader, resources)
    {
        init();

        function init()
        {
            // Events

            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);

            // Listen for frame updates
            app.ticker.add(tick);
            createGrid();
            createDrill();

            // Run physics
            //Engine.run(engine);
            Render.run(render);
        }

        // Game loop

        var lastTime = 0;

        function tick()
        {
            var now = new Date().getTime();
            var delta = (now - lastTime) / 1000;

            handleMovement();
            Engine.update(engine);

            lastTime = now;
        }

        var hMov = 0, vMov = 0;
        var maxVelocity = 300;
        var damping = 0.85;
        var hVelocity = 0;
        var acceleration = 10;

        function handleMovement()
        {
            if (hMov !== 0)
                hVelocity += acceleration * hMov;
            else
                hVelocity *= damping;

            //if (Math.abs(hVelocity) > maxVelocity) hVelocity = maxVelocity * hMov;
            //if (Math.abs(hVelocity) < 0.01) hVelocity = 0;

            //drill.position.x += hVelocity * delta;
            Body.setVelocity(drill.body, { x: 100, y: 0});
            updateDrillPosition();
        }

        function updateDrillPosition() {
            drill.position.x = drill.body.position.x;
            drill.position.y = drill.body.position.y;
        }

        // Input events

        function onKeyDown(event)
        {
            if (PREVENT_DEFAULT_FOR.includes(event.keyCode)) event.preventDefault();

            if (event.keyCode === 37) hMov = -1;
            else if (event.keyCode === 39) hMov = 1;

            if (event.keyCode === 38) vMov = -1;
            else if (event.keyCode === 40) vMov = 1;
        }

        function onKeyUp(event)
        {
            if (PREVENT_DEFAULT_FOR.includes(event.keyCode)) event.preventDefault();
            if (event.keyCode === 37 || event.keyCode === 39) hMov = 0;
            if (event.keyCode === 38 || event.keyCode === 40) vMov = 0;
        }

        // Generate level

        var tiles;
        var drill;

        function createGrid()
        {
            var tile;
            var bodies = [];
            tiles = new PIXI.Container();
            stage.addChild(tiles);

            for (var i = -NUM_TILES_X / 2; i < NUM_TILES_X; i++)
            {
                for (var j = 0; j < NUM_TILES_Y; j++)
                {
                    var isGhost = (j === 0 || j === 1) && (i > 1 && i < 13);
                    isGhost = isGhost || (j === 2 && i === 10);
                    var texture = isGhost ? resources.sky.texture : resources.regularTile.texture;

                    tile = new PIXI.Sprite(texture);
                    var posX = i * TILE_SIZE + TILE_SIZE / 2;
                    var posY = j * TILE_SIZE + TILE_SIZE / 2;
                    tile.x = posX - TILE_SIZE / 2;
                    tile.y = posY - TILE_SIZE / 2;

                    if (!isGhost)
                    {
                        tile.body = Bodies.rectangle(posX, posY, TILE_SIZE, TILE_SIZE, { isStatic: true });
                        bodies.push(tile.body);
                    }

                    tiles.addChild(tile);
                }
            }

            World.add(engine.world, bodies);
        }

        function createDrill()
        {
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
                //collisionFilter: {
                //    group: -2
                //},
            });
            Matter.Body.setPosition(player, { x: TILE_SIZE * 5, y: TILE_SIZE });
            Matter.Body.setMass(player, 5);
            World.add(engine.world, [player]);

            drill = new PIXI.Container();
            drill.body = drillBody;

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
setInterval(function ()
{
    score += 2;
    window.parent.postMessage('Your score: ' + score, "*");
}, 2000);

//window.addEventListener("message", function(ev){
//  document.body.appendChild(document.createTextNode(ev.data))
//}, false);
