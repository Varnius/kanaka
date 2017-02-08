var pi = document.body.appendChild(document.createElement('script'));
pi.onload = function ()
{
    var app = new PIXI.Application(960, 600, { backgroundColor: 0x1099bb });
    var renderer = app.renderer;

    // The application will create a canvas element for you that you 
    // can then insert into the DOM.
    document.body.appendChild(app.view);

    // Load things

    var assetLocation = !window.dev ? 'https://varnius.github.io/kanaka/' : '';

    PIXI.loader.add('drill', assetLocation + 'assets/musa.png');
    PIXI.loader.add('regularTile', assetLocation + 'assets/tile-test.png');
    PIXI.loader.once('complete', onAssetsLoaded);
    PIXI.loader.load();

    var bunny;
    var stage = app.stage;

    function onAssetsLoaded(loader, resources)
    {
        init();

        function init() {
            // This creates a texture from a 'bunny.png' image.
            bunny = new PIXI.Sprite(resources.drill.texture);

            // Setup the position of the bunny
            bunny.x = app.renderer.width / 2;
            bunny.y = app.renderer.height / 2;

            // Rotate around the center
            bunny.anchor.x = 0.5;
            bunny.anchor.y = 0.5;

            // Add the bunny to the scene we are building.
            app.stage.addChild(bunny);

            // Listen for frame updates
            app.ticker.add(tick);
            generateGrid();
        }

        // Render loop

        function tick() {
            bunny.rotation += 0.01;
        }

        // Generate level

        function generateGrid() {
            var tile;
            var container = new PIXI.Container();
            stage.addChild(container);

            var numTilesX = 15;
            var numTilesY = 10;
            var tileSize = Math.round(renderer.width / numTilesX);

            for (var i = 0; i < numTilesX; i++) {
                for (var j = 0; j < numTilesY; j++) {

                    var texture = resources.regularTile.texture;

                    tile = new PIXI.Sprite(texture);
                    tile.position.x = i * tileSize;
                    tile.position.y = j * tileSize;

                    container.addChild(tile);
                }
            }
        }
    }
};

pi.src = 'https://varnius.github.io/kanaka/pixi.min.js';
