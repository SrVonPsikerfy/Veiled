import Inventory from './inventory.js';

export default class Player extends Phaser.Physics.Matter.Sprite {
    constructor(world, x, y, spawnPoint, startingFaith, scale) {
        super(world, x, y, 'player'); //llama a la constructora de Sprite

        this.setBody({
            type: 'rectangle',
            width: 25,
            height: 48
        });

        this.scene.add.existing(this); //lo añades en la escena
        this.scene.matter.add.sprite(this); //lo añado a las fisicas de Matter

        this.setScale(scale);
        this.setFriction(0); //quitamos friccion
        this.setFrictionAir(0);
        this.setFixedRotation(0); //quitamos rotacion
        this.setMass(1);

        this.speed = 3; //velocidad

        this.maxSanity = 100;
        this.sanity = this.maxSanity; //cordura
        this.decay = 0.2; //velocidad base a la que pierde la cordura
        this.sanityLogThreshold = 20; //umbral a partir del cual aplicamos la pérdida logarítmica

        this.deathState = {
            Alive: 'alive',
            CheckDeath: 'checkDeath',
            Dead: 'dead'
        }
        this.death = this.deathState.Alive;
        this.deathProbability = 0.6;

        this.faith = startingFaith //al instanciarse en el nivel, tiene que recibir la de del nivel anterior
        this.faithCheck = 30; //cantidad de fe a partir de la cual no se podrá restar mas fe, dado que se necesita un minimo para completar el nivel
        this.numCompletedEvents = 0;

        this.inventory = new Inventory(this.scene);

        this.spawnPoint = { x: x, y: y };
        this.spawnBounds = [spawnPoint.properties[3].value, spawnPoint.properties[1].value,
        spawnPoint.properties[2].value, spawnPoint.properties[0].value]

        this.cursorsPlayer = this.scene.input.keyboard.addKeys({ //teclas de direccion
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            interact: Phaser.Input.Keyboard.KeyCodes.E,
            interactGhost: Phaser.Input.Keyboard.KeyCodes.R,
            invToggle: Phaser.Input.Keyboard.KeyCodes.Q,
            blindfold: Phaser.Input.Keyboard.KeyCodes.SPACE,
            pause: Phaser.Input.Keyboard.KeyCodes.ESC,

            talk: Phaser.Input.Keyboard.KeyCodes.T,
            testing: Phaser.Input.Keyboard.KeyCodes.CTRL
        });

        console.log('faith: ' + this.faith);

        //Guardamos el sonido de los pasos
        this.stepSound = this.scene.sound.add('sfxSteps');
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta); //preUpdate de Sprite (necesario para animaciones)

        //Calculamos la velocidad
        let [velX, velY] = this.calculateVelocity();

        //Aplicamos la velocidad al cuerpo
        this.setVelocity(velX, velY);

        //Reproducimos la animación que corresponda
        this.changeAnims(velX, velY);

        //Actualizamos cordura
        this.updateSanity();

        //Reproducimos su sonido si se mueve
        if (this.cursorsPlayer.up.isDown || this.cursorsPlayer.down.isDown ||
            this.cursorsPlayer.left.isDown || this.cursorsPlayer.right.isDown) {
            //Y solo en caso de que no este ya sonando
            if (!this.stepSound.isPlaying) {
                this.stepSound.play();
                this.stepSound.loop = true;
            }
        }
        else this.stepSound.loop = false;

        if (this.scene.objectiveMarker !== undefined)
            this.scene.objectiveMarker.updateObjectiveMarker();
    }

    //Calculo de velocidad con respecto a input
    calculateVelocity() {
        let [velX, velY] = [0, 0];
        if (this.cursorsPlayer.up.isDown) { //arriba
            velY -= this.speed;
        }
        if (this.cursorsPlayer.down.isDown) { //abajo
            velY += this.speed;
        }
        if (this.cursorsPlayer.left.isDown) { //izquierda
            velX -= this.speed;
        }
        if (this.cursorsPlayer.right.isDown) { //derecha
            velX += this.speed;
        }

        //Normalizamos el vector
        if (velX != 0 && velY != 0) {
            velX /= Math.sqrt(2);
            velY /= Math.sqrt(2)
        }

        //devolvemos velocidad
        return [velX, velY];
    }

    //cambio de animacion con respecto a la velocidad
    changeAnims(velX, velY) {
        if (velX === 0) {
            if (velY === 0) //quieto
                this.anims.play('idle_' + this.frame.texture.key, true);
            else if (velY < 0) //arriba
                this.anims.play('up_move_' + this.frame.texture.key, true);
            else //abajo
                this.anims.play('down_move_' + this.frame.texture.key, true);
        }
        else if (velX < 0) //izquierda
            this.anims.play('left_move_' + this.frame.texture.key, true);
        else //derecha
            this.anims.play('right_move_' + this.frame.texture.key, true);
    }

    //actualizacion de la cordura
    updateSanity() {
        //Ajustamos la cordura
        if (!this.scene.blindfold.blind) {
            if (this.sanity > this.sanityLogThreshold)
                this.sanity -= this.decay;
            else
                //Esta fórmula hace que la función sea derivable y el decay nunca baje por debajo del 10% del valor inicial
                this.sanity -= (this.decay * this.sanity / this.sanityLogThreshold) * 0.9 + this.decay * 0.1;
        }
        if (this.sanity < 0.1 && this.death === this.deathState.Alive) {//si se gasta la cordura
            this.enableInputs(false);
            this.scene.cameras.main.fadeOut(2000);
            this.death = this.deathState.CheckDeath;
            this.scene.sound.play('sfxDeath');
        }
    }

    //metodo para añadir cordura (item)
    addSanity(sanityBoost) {
        this.sanity += sanityBoost;
        //en caso de intentar recuperar mas cordura de la maxima permitida, se establece al maximo
        if (this.sanity > this.maxSanity) this.sanity = 100;
        else if (this.sanity < 0) this.sanity = 0;
    }

    setMaxSanity(newMax) {
        this.maxSanity = newMax;
    }

    addFaith(faithBoost) {
        //en caso de restar la fe por debajo del minimo permitido, no se resta
        if (this.faithCheck + faithBoost <= 0) {
            this.faith -= this.faithCheck;
        }
        else {
            //si se tiene la cantidad de fe que se va a restar
            this.faith += faithBoost;
            //resto al minimo para actualizar cuanto mas se puede restar
            this.faithCheck -= faithBoost;
        }
        //me aseguro de que su valor nunca es negativo
        if (this.faith < 0) this.faith = 0;
        this.scene.gui.viewFaith(this.faith);
    }

    //metodo que establece la muerte del jugador
    setDead() {
        this.death = this.deathState.Dead;
    }

    setAlive() {
        this.death = this.deathState.Alive;
    }

    //reaparicion tras muerte
    die(blindfold, silhouette) {
        this.setPosition(this.spawnPoint.x, this.spawnPoint.y);
        this.setVelocity(0, 0);

        this.scene.readjustTriggers();
        this.scene.cameras.main.setBounds(this.spawnBounds[0], this.spawnBounds[1], this.spawnBounds[2], this.spawnBounds[3]);
        this.scene.deathBlindfold(blindfold, silhouette);

        this.sanity = this.sanityLogThreshold;
        this.death = this.deathState.Alive;
    }

    //metodo para que el personaje no se quede pillado al moverse o al hacer otra accion
    resetInputs() {
        for (const property in this.cursorsPlayer) {
            this.cursorsPlayer[property].reset();
        }
    }

    //metodo para desactivar el input al morir
    enableInputs(boolean) {
        this.resetInputs();
        for (const property in this.cursorsPlayer) {
            this.cursorsPlayer[property].enabled = boolean;
        }
        this.anims.play('idle_' + this.frame.texture.key, true);
    }
}