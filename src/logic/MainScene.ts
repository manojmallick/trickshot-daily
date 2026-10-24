import Phaser from "phaser";

/** One-shot physics golf/pool daily — Wordle for physics */

function daySeed(): number {
  const d = new Date().toISOString().slice(0, 10);
  let h = 0;
  for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) >>> 0;
  return h || 1;
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MainScene extends Phaser.Scene {
  private ball!: Phaser.Physics.Arcade.Image;
  private hole!: Phaser.GameObjects.Arc;
  private aiming = true;
  private shot = false;
  private won = false;
  private start = new Phaser.Math.Vector2();
  private dragGfx!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.Text;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private attempts = 0;

  constructor() {
    super("MainScene");
  }

  preload() {
    // procedural textures
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xf8fafc);
    g.fillCircle(16, 16, 14);
    g.generateTexture("ball", 32, 32);
    g.destroy();
  }

  create() {
    const rng = mulberry32(daySeed());
    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x14532d);
    // felt stripes
    for (let i = 0; i < 8; i++) {
      this.add.rectangle(w / 2, 40 + i * 70, w, 2, 0x166534, 0.35);
    }

    this.add
      .text(16, 12, "Trickshot Daily", {
        fontFamily: "system-ui",
        fontSize: "22px",
        color: "#ecfdf5",
        fontStyle: "bold",
      })
      .setScrollFactor(0);
    this.add
      .text(16, 40, new Date().toISOString().slice(0, 10) + " · one shot · drag to aim", {
        fontFamily: "system-ui",
        fontSize: "14px",
        color: "#86efac",
      })
      .setScrollFactor(0);

    this.status = this.add
      .text(w / 2, h - 28, "Drag from the ball and release", {
        fontFamily: "system-ui",
        fontSize: "16px",
        color: "#fef3c7",
      })
      .setOrigin(0.5);

    // hole
    const hx = 120 + rng() * (w - 240);
    const hy = 100 + rng() * (h * 0.35);
    this.hole = this.add.circle(hx, hy, 18, 0x0f172a);
    this.add.circle(hx, hy, 22, 0x022c22).setStrokeStyle(3, 0x4ade80);

    this.obstacles = this.physics.add.staticGroup();
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const ox = 80 + rng() * (w - 160);
      const oy = h * 0.35 + rng() * (h * 0.35);
      const bw = 40 + rng() * 80;
      const bh = 16 + rng() * 20;
      const block = this.add.rectangle(ox, oy, bw, bh, 0x78350f);
      this.physics.add.existing(block, true);
      this.obstacles.add(block);
    }

    this.ball = this.physics.add.image(w / 2, h - 90, "ball");
    this.ball.setCircle(14);
    this.ball.setBounce(0.55, 0.55);
    this.ball.setCollideWorldBounds(true);
    this.ball.setDamping(true);
    this.ball.setDrag(0.99);
    this.ball.setMaxVelocity(900, 900);
    (this.ball.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    this.physics.add.collider(this.ball, this.obstacles);
    this.dragGfx = this.add.graphics();

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.aiming || this.won) return;
      const d = Phaser.Math.Distance.Between(p.x, p.y, this.ball.x, this.ball.y);
      if (d < 48) this.start.set(this.ball.x, this.ball.y);
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.aiming || !p.isDown || this.start.length() === 0) return;
      this.drawAim(p.x, p.y);
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!this.aiming || this.start.length() === 0 || this.won) return;
      this.dragGfx.clear();
      const dx = this.start.x - p.x;
      const dy = this.start.y - p.y;
      const power = Phaser.Math.Clamp(Math.hypot(dx, dy) * 4.5, 0, 780);
      const angle = Math.atan2(dy, dx);
      this.ball.setVelocity(Math.cos(angle) * power, Math.sin(angle) * power);
      this.aiming = false;
      this.shot = true;
      this.attempts += 1;
      this.start.set(0, 0);
      this.status.setText("Rolling…");
    });
  }

  private drawAim(px: number, py: number) {
    this.dragGfx.clear();
    this.dragGfx.lineStyle(3, 0xfef08a, 0.9);
    this.dragGfx.lineBetween(this.ball.x, this.ball.y, px, py);
    const dx = this.ball.x - px;
    const dy = this.ball.y - py;
    this.dragGfx.fillStyle(0xfef08a, 0.5);
    this.dragGfx.fillCircle(this.ball.x + dx * 0.15, this.ball.y + dy * 0.15, 6);
  }

  update() {
    if (!this.shot || this.won) return;
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    const speed = body.velocity.length();
    if (speed < 12) {
      body.setVelocity(0, 0);
      const dist = Phaser.Math.Distance.Between(
        this.ball.x,
        this.ball.y,
        this.hole.x,
        this.hole.y,
      );
      if (dist < 22) {
        this.won = true;
        this.status.setText(`Sink! 🎯 share: Trickshot ${new Date().toISOString().slice(0, 10)} 🟢`);
        this.tweens.add({
          targets: this.ball,
          scale: 0.2,
          alpha: 0.3,
          duration: 400,
        });
      } else {
        this.aiming = true;
        this.shot = false;
        this.status.setText(`Miss — attempt ${this.attempts + 1}. Drag again.`);
      }
    }
  }
}
