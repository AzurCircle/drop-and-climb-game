import { Game, WEBGL, GameObjects, Scene, Physics, Input, Math as PhaserMath } from 'phaser'

const pauseDialog = document.querySelector('#pause-dialog') as HTMLDialogElement
const pauseDialogTitle = document.querySelector('#pause-dialog .title') as HTMLHeadingElement
const pauseDialogButton = document.querySelector('#pause-dialog .main-button') as HTMLButtonElement
const pauseDialogViewUnder = document.querySelector(
	'#pause-dialog .view-under'
) as HTMLButtonElement

type PauseReason = 'initial-screen' | 'pause' | 'game-win' | 'game-loose'

// Phaser intercepts keydown events so that esc doesn't work by default (preventDefault)
// So we listen to keydown instead of cancel
let shouldEscUnPause = false
pauseDialog.addEventListener('keydown', (ev) => {
	if (shouldEscUnPause && ev.key === 'Escape') {
		pauseDialog.close()
	}
})

pauseDialogButton.addEventListener('click', () => pauseDialog.close())

let onClosePauseDialog: Function
pauseDialog.addEventListener('close', () => {
	onClosePauseDialog()
	pauseDialog.classList.remove('transparent')
})

pauseDialogViewUnder.addEventListener('click', () => {
	if (pauseDialog.classList.contains('transparent')) {
		pauseDialog.classList.remove('transparent')
	} else {
		pauseDialog.classList.add('transparent')
	}
})

const BLOCK_SIZE = 50

class MainScene extends Scene {
	shouldShowStartGame = true

	player: GameObjects.Rectangle
	playerSpeed = 200

	blockSpawnRate = 500
	spawnBlockEvent: Phaser.Time.TimerEvent

	blockColliderGroup: Physics.Arcade.Group
	keyboardInputs: { a: Input.Keyboard.Key; d: Input.Keyboard.Key; space: Input.Keyboard.Key }

	constructor() {
		super('Main')
	}

	create() {
		// Don't do check top collision since we're dropping blocks from the top
		this.physics.world.checkCollision.up = false
		this.blockColliderGroup = this.physics.add.group()
		this.physics.add.collider(
			this.blockColliderGroup,
			this.blockColliderGroup,
			(block1, block2) => {
				// Don't know why this solves the problem of player getting stuck between blocks
				// https://phaser.discourse.group/t/player-sticks-to-walls-when-moving-left-right-while-jump/9173
				const block1Body = (block1 as GameObjects.Rectangle).body as Physics.Arcade.Body
				const block2Body = (block2 as GameObjects.Rectangle).body as Physics.Arcade.Body
				let ignoreCollision = false
				if (block1Body.bottom < 0) {
					block1.destroy()
					ignoreCollision = true
				}
				if (block2Body.bottom < 0) {
					block2.destroy()
					ignoreCollision = true
				}
				if (ignoreCollision) {
					return
				}
				if (block1Body.y < block2Body.y) {
					block1Body.checkCollision.down = false
					block2Body.checkCollision.up = false
				} else {
					block1Body.checkCollision.up = false
					block2Body.checkCollision.down = false
				}
			}
		)

		this.player = new GameObjects.Rectangle(
			this,
			this.cameras.main.centerX,
			this.game.canvas.height - 100,
			30,
			100,
			0x8fbc8f
		)
		this.physics.add.existing(this.player)
		const playerBody = this.player.body as Physics.Arcade.Body
		playerBody.setGravityY(3000)
		playerBody.setCollideWorldBounds(true)
		this.physics.add.collider(this.player, this.blockColliderGroup, (player, block) => {
			const playerBody = (player as GameObjects.Rectangle).body as Physics.Arcade.Body
			const blockBody = (block as GameObjects.Rectangle).body as Physics.Arcade.Body
			if (playerBody.top === blockBody.bottom) {
				this.pause('game-loose')
			}
		})
		this.add.existing(this.player)

		// Bug: https://github.com/photonstorm/phaser/issues/6630
		// const bottom = this.physics.add.staticBody(
		// 	0,
		// 	this.game.canvas.height,
		// 	this.game.canvas.width,
		// 	1
		// )
		const top = new GameObjects.Rectangle(
			this,
			this.cameras.main.centerX,
			0,
			this.game.canvas.width,
			1
		)
		this.physics.add.existing(top, true)
		this.physics.add.collider(this.player, top, () => {
			this.pause('game-win')
		})
		this.add.existing(top)

		this.spawnBlockEvent = this.time.addEvent({
			loop: true,
			delay: this.blockSpawnRate,
			callback: () => this.spawnBlock(),
		})
		this.spawnBlock()

		const keyboard = this.input.keyboard!
		this.keyboardInputs = {
			a: keyboard.addKey(Input.Keyboard.KeyCodes.A),
			d: keyboard.addKey(Input.Keyboard.KeyCodes.D),
			space: keyboard.addKey(Input.Keyboard.KeyCodes.SPACE),
		}

		keyboard.addKey(Input.Keyboard.KeyCodes.ESC).on('down', () => {
			this.pause('pause')
		})
		if (this.shouldShowStartGame) {
			this.shouldShowStartGame = false
			this.pause('initial-screen')
		}
	}

	update(time: number, deltaMs: number) {
		const body = this.player.body as Physics.Arcade.Body
		if (this.keyboardInputs.a.isDown) {
			body.setVelocityX(-this.playerSpeed)
		} else if (this.keyboardInputs.d.isDown) {
			body.setVelocityX(this.playerSpeed)
		} else {
			body.setVelocityX(0)
		}

		if (this.keyboardInputs.space.isDown) {
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
		body.setCollideWorldBounds(true)
		body.setVelocityY(300)
		this.add.existing(rect)
	}

	pause(reason: PauseReason) {
		this.scene.pause()
		shouldEscUnPause = false
		switch (reason) {
			case 'initial-screen':
				pauseDialogTitle.innerText = 'Drop And Climb'
				pauseDialogButton.innerText = 'Start'
				onClosePauseDialog = () => {
					this.scene.resume()
				}
				break
			case 'pause':
				pauseDialogTitle.innerText = 'Paused'
				pauseDialogButton.innerText = 'Resume'
				onClosePauseDialog = () => {
					this.scene.resume()
				}
				shouldEscUnPause = true
				break
			case 'game-win':
				pauseDialogTitle.innerText = 'You Win!'
				pauseDialogButton.innerText = 'Play Again'
				onClosePauseDialog = () => {
					this.scene.restart()
				}
				break
			case 'game-loose':
				pauseDialogTitle.innerText = 'Game Over!'
				pauseDialogButton.innerText = 'Play Again'
				onClosePauseDialog = () => {
					this.scene.restart()
				}
				break
		}
		pauseDialog.showModal()
	}
}

const game = new Game({
	width: 800,
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
