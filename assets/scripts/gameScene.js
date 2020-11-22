import Blindfold from './blindfold.js';
import EventManager from './eventManager.js';
import Player from './player.js';

export default class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'gameScene' }) };

    preload() {
        this.load.spritesheet('player', './assets/sprites/player.png',
            { frameWidth: 47, frameHeight: 60 });
        this.load.image('background', './assets/sprites/background.jpg');
        this.load.image('vision', './assets/sprites/black_circle.png');
        this.load.image('blindfold', './assets/sprites/black_background.png');

        // Carga los datos del mapa.
        this.load.tilemapTiledJSON('testTilemap', './assets/sprites/tilesets/testTileset_Project.json');

        // Carga el tileset que contiene las texturas del mapa.
        this.load.image('testTileset', './assets/sprites/tilesets/testTileset.png');
    }

    create() {

        // Creamos un mapa a partir de los datos en cache
        this.map = this.make.tilemap({
            key: 'testTilemap',
            tileWidth: 32,
            tileHeight: 32
        });

        // Asignamos el tileset (nombre en Tiled y la textura se llaman igual mia culpa)
        const tileset1 = this.map.addTilesetImage('testTileset', 'testTileset');

        // Capas del mapa para asignar distintas funcionalidades
        this.ground0 = this.map.createStaticLayer('ground 0', tileset1);
        this.ground1 = this.map.createStaticLayer('ground 1', tileset1);
        this.walls = this.map.createStaticLayer('walls', tileset1);

        //this.add.image(0, 0, 'background').setOrigin(0).setScale(0.5, 0.7);
        this.vision = this.add.image(400, 500, 'vision').setVisible(false).setScale(0.4);

        this.player = new Player(this, 400, 500);
        this.blindfold = new Blindfold(this, 0, 0, this.vision).setOrigin(0);

        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('player', { start: 1, end: 1 }),
            frameRate: 1,
            repeat: -1
        });
        this.anims.create({
            key: 'up_move',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'down_move',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'left_move',
            frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
            frameRate: 4,
            repeat: -1
        });
        this.anims.create({
            key: 'right_move',
            frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
            frameRate: 4,
            repeat: -1
        });

        this.player.blindfold().on('down', event => {
            console.log('estoy en el evento wow');
            this.blindfold.setBlindfold();
        });

        // Colision entre las paredes y el player.
        this.walls.setCollisionBetween(1, 50);
        this.physics.add.collider(this.player, this.walls);
    }

    update(time, delta) {
        if (this.player.isInteracting()) {
            this.scene.start('eventManager');
        }

        const playerPos = this.player.getPos();
        this.blindfold.setRenderPosition(playerPos[0], playerPos[1]);
    }
}