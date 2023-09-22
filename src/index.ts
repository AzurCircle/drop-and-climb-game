import { Game, WEBGL, GameObjects, Scene, Physics, Input } from 'phaser'

const BLOCK_SIZE = 50

class MainScene extends Scene {
	player: GameObjects.Rectangle
	playerSpeed = 200

	blockSpawnRate = 500
	spawnBlockEvent: Phaser.Time.TimerEvent

	blockColliderGroup: Physics.Arcade.Group

	constructor() {
		super('Main')
	}

	create() {
		this.blockColliderGroup = this.physics.add.group()
		this.physics.add.collider(this.blockColliderGroup, this.blockColliderGroup)

		this.player = new GameObjects.Rectangle(
			this,
			this.cameras.main.centerX,
			this.game.canvas.height - 100,
			30,
			100,
			0x8fbc8f
		)
		this.blockColliderGroup.add(this.player)
		const playerBody = this.player.body as Physics.Arcade.Body
		playerBody.setGravityY(3000)
		this.add.existing(this.player)

		// Bug: https://github.com/photonstorm/phaser/issues/6630
		// const bottom = this.physics.add.staticBody(
		// 	0,
		// 	this.game.canvas.height,
		// 	this.game.canvas.width,
		// 	1
		// )
		const bottom = new GameObjects.Rectangle(
			this,
			this.cameras.main.centerX,
			this.game.canvas.height,
			this.game.canvas.width,
			1
		)
		this.physics.add.existing(bottom, true)
		this.physics.add.collider(this.blockColliderGroup, bottom)
		this.add.existing(bottom)

		this.spawnBlockEvent = this.time.addEvent({
			loop: true,
			delay: this.blockSpawnRate,
			callback: () => this.spawnBlock(),
		})
		this.spawnBlock()

		this.handleInput()
	}

	update(time: number, deltaMs: number) {
		// console.log(delta)
		const keyboard = this.input.keyboard!
		const body = this.player.body as Physics.Arcade.Body
		if (keyboard.checkDown(keyboard.addKey(Input.Keyboard.KeyCodes.A))) {
			body.setVelocityX(-this.playerSpeed)
		} else if (keyboard.checkDown(keyboard.addKey(Input.Keyboard.KeyCodes.D))) {
			body.setVelocityX(this.playerSpeed)
		} else {
			body.setVelocityX(0)
		}

		if (keyboard.checkDown(keyboard.addKey(Input.Keyboard.KeyCodes.SPACE))) {
			if (body.onFloor()) {
				body.setVelocityY(-1000)
			}
		}
	}

	spawnBlock() {
		const maxTiles = Math.floor(this.game.canvas.width / BLOCK_SIZE)
		const rect = new GameObjects.Rectangle(
			this,
			(Math.floor(Math.random() * maxTiles) + 0.5) * BLOCK_SIZE,
			-100,
			BLOCK_SIZE,
			BLOCK_SIZE,
			0x999999
		)
		rect.setStrokeStyle(3, 0xffffff)
		this.blockColliderGroup.add(rect)
		const body = rect.body as Physics.Arcade.Body
		body.pushable = false
		body.setVelocityY(300)
		this.add.existing(rect)
	}

	handleInput() {}
}

const game = new Game({
	width: 1000,
	height: 600,
	canvas: document.getElementById('main-canvas') as HTMLCanvasElement,
	type: WEBGL,
	physics: {
		default: 'arcade',
		arcade: {
			// Unlimited, will be limited by requestAnimationFrame to screen refresh rate anyway
			fps: 1000,
			// gravity: { y: 1000 },
		},
	},
	input: {
		keyboard: true,
	},
	scene: MainScene,
})
