const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ============================================================================
// --- AJUSTE RESPONSIVO DA TELA DE CELULAR (PROPORÇÃO 9:16) ---
// ============================================================================
function resizeCanvasToMobileFormat() {
  const targetAspectRatio = 9 / 16;
  let windowWidth = window.innerWidth;
  let windowHeight = window.innerHeight;

  if (windowWidth / windowHeight > targetAspectRatio) {
    // Tela mais larga que 9:16 -> ajusta altura
    canvas.height = Math.min(windowHeight, 800);
    canvas.width = canvas.height * targetAspectRatio;
  } else {
    // Tela mais estreita -> ajusta largura
    canvas.width = Math.min(windowWidth, 450);
    canvas.height = canvas.width / targetAspectRatio;
  }
}

// Configura tamanho inicial e escuta redimensionamento
resizeCanvasToMobileFormat();
window.addEventListener('resize', resizeCanvasToMobileFormat);

// ============================================================================
// --- CARREGAMENTO DAS IMAGENS ---
// ============================================================================
const imgPlayer = new Image(); imgPlayer.src = 'nave.png';
const imgEnemy = new Image();  imgEnemy.src = 'batedor_04.png';
const imgMissile = new Image(); imgMissile.src = 'm_2.png';

// Projetores de Tiro
const imgPlayerBullet = new Image(); imgPlayerBullet.src = 'gosma_verde.png';
const imgEnemyBullet = new Image();  imgEnemyBullet.src = 'bola_maldita.png';

// Bosses das Fases
const imgBoss1 = new Image(); imgBoss1.src = 'centaury_1.png';
const imgBoss2 = new Image(); imgBoss2.src = 'centaury_2.png';
const imgBoss3 = new Image(); imgBoss3.src = 'centaury_3.png';

// ============================================================================
// --- CARREGAMENTO DOS ÁUDIOS ---
// ============================================================================
const audioShoot = new Audio('til.mp3');
const audioExplosion = new Audio('explosao.mp3');
const audioMissile = new Audio('missil.mp3');
const audioBonus = new Audio('bonus.mp3'); // SOm de Bônus / Power-up

function playSound(audio) {
  const soundClone = audio.cloneNode();
  soundClone.volume = 0.5;
  soundClone.play().catch(() => {});
}

// ============================================================================
// --- CONTROLES DE TECLADO & LÓGICA DE DUPLO TOQUE (DOUBLE TAP) ---
// ============================================================================
const keys = {};

const tapTracker = {
  left: { lastTime: 0, isDoubleTap: false },
  right: { lastTime: 0, isDoubleTap: false }
};

window.addEventListener('keydown', (e) => {
  const now = Date.now();

  if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && !keys[e.code]) {
    if (now - tapTracker.left.lastTime < 300) {
      tapTracker.left.isDoubleTap = true;
    } else {
      tapTracker.left.isDoubleTap = false;
    }
    tapTracker.left.lastTime = now;
  }

  if ((e.code === 'ArrowRight' || e.code === 'KeyD') && !keys[e.code]) {
    if (now - tapTracker.right.lastTime < 300) {
      tapTracker.right.isDoubleTap = true;
    } else {
      tapTracker.right.isDoubleTap = false;
    }
    tapTracker.right.lastTime = now;
  }

  keys[e.code] = true;

  if ((e.code === 'KeyB' || e.code === 'ControlLeft') && gameState.bombs > 0 && gameState.status === 'PLAYING') {
    useBomb();
  }
  if (e.code === 'KeyR' && (gameState.status === 'GAME_OVER' || gameState.status === 'VICTORY')) {
    resetGame();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') tapTracker.left.isDoubleTap = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') tapTracker.right.isDoubleTap = false;
});

// ============================================================================
// --- ESTRELAS / FUNDO SIDERAL ---
// ============================================================================
const stars = [];
for (let i = 0; i < 80; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 2 + 1
  });
}

// ============================================================================
// --- CONFIGURAÇÃO DO LABIRINTO EXPANDIDO (ADAPTADO) ---
// ============================================================================
const mazeGrid = [
  [1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
  [1, 0, 0, 0, 3, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 2, 2, 2, 1, 1, 1, 1],
  [1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 3, 0, 0, 0, 3, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 0, 2, 2, 1, 1],
  [1, 1, 1, 1, 0, 0, 0, 0, 1, 1],
  [1, 0, 0, 0, 0, 3, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 2, 2, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 0, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

const mazeConfig = {
  cols: 10,
  rows: mazeGrid.length,
  get tileWidth() { return canvas.width / 10; },
  tileHeight: 65,
  scrollSpeed: 1.8,
  offsetY: 0,
  doorsOpen: false,
  doorTimer: 0
};

let mazeMines = [];

function initMazeMines() {
  mazeMines = [];
  for (let r = 0; r < mazeConfig.rows; r++) {
    for (let c = 0; c < mazeConfig.cols; c++) {
      if (mazeGrid[r][c] === 3) {
        mazeMines.push({
          row: r, col: c,
          active: true,
          x: c * mazeConfig.tileWidth + mazeConfig.tileWidth / 2,
          tileYOffset: r * mazeConfig.tileHeight + mazeConfig.tileHeight / 2,
          radius: 14
        });
      }
    }
  }
}

// ============================================================================
// --- ESTADO DO JOGO E DIFICULDADE (70 KILLS) ---
// ============================================================================
const gameState = {
  score: 0,
  kills: 0,
  killsToBoss: 70, // Retornado para 70 Batedores
  status: 'PLAYING',
  transitionTimer: 0,
  lastExplosionTick: 0,
  missiles: 5,
  bombs: 2,
  rapidFireTimer: 0,
  bossSpawned: false,
  spheresKilled: 0
};

const alienSpheres = [];
let lastSphereSpawn = 0;

// ============================================================================
// --- CONFIGURAÇÕES DO JOGADOR ---
// ============================================================================
const player = {
  x: canvas.width / 2 - 22,
  y: canvas.height - 90,
  width: 44,
  height: 44,
  health: 100,
  maxHealth: 100,
  vx: 0, vy: 0, angle: 0, vAngle: 0,
  speed: 5.5,
  lastShoot: 0,
  shootDelay: 180,
  bulletDamage: 10,
  lastMissile: 0
};

function applyKnockback(forceX, forceY, spinForce) {
  player.vx += forceX;
  player.vy += forceY;
  player.vAngle += spinForce;
}

// ============================================================================
// --- CONFIGURAÇÕES DO CHEFÃO (MAIS VIDA / MAIS DIFICULDADE) ---
// ============================================================================
const boss = {
  active: false,
  phase: 1, 
  x: 0,
  y: -200,
  targetY: 60,
  width: 150,
  height: 110,
  health: 150,    // Chefão 1 com 150 HP
  maxHealth: 150,
  speedX: 3,
  lastShoot: 0,
  shootDelay: 850,
  invulnerableTimer: 0
};

const missileConfig = {
  width: 36,
  height: 58,
  speed: 9,
  damage: 25
};

const bullets = [];
const missiles = [];
const enemyBullets = [];
const enemies = [];
const explosions = [];
const powerups = [];

let lastEnemySpawn = 0;
const enemySpawnDelay = 1100;

function resetGame() {
  player.health = 100;
  player.x = canvas.width / 2 - 22;
  player.y = canvas.height - 90;
  player.vx = 0; player.vy = 0; player.angle = 0; player.vAngle = 0;

  gameState.score = 0;
  gameState.kills = 0;
  gameState.missiles = 5;
  gameState.bombs = 2;
  gameState.rapidFireTimer = 0;
  gameState.bossSpawned = false;
  gameState.spheresKilled = 0;
  gameState.status = 'PLAYING';

  boss.active = false;
  boss.phase = 1;
  boss.health = 150;
  boss.maxHealth = 150;
  boss.y = -200;
  boss.invulnerableTimer = 0;

  bullets.length = 0;
  missiles.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  explosions.length = 0;
  powerups.length = 0;
  alienSpheres.length = 0;
}

// ============================================================================
// --- DISPAROS ALINHADOS COM O ÂNGULO DA NAVE ---
// ============================================================================
function shoot() {
  const now = Date.now();
  const currentDelay = gameState.rapidFireTimer > 0 ? 80 : player.shootDelay;

  if (now - player.lastShoot > currentDelay) {
    const bulletSpeed = 11;
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;

    const offsetDistance = player.height / 2;

    const spawnX = centerX + Math.sin(player.angle) * offsetDistance;
    const spawnY = centerY - Math.cos(player.angle) * offsetDistance;

    const vx = Math.sin(player.angle) * bulletSpeed;
    const vy = -Math.cos(player.angle) * bulletSpeed;

    bullets.push({
      x: spawnX,
      y: spawnY,
      vx: vx,
      vy: vy,
      width: 18,
      height: 36,
      angle: player.angle,
      damage: player.bulletDamage
    });

    player.lastShoot = now;
    playSound(audioShoot);
  }
}

function shootMissile() {
  const now = Date.now();
  if (gameState.missiles > 0 && now - player.lastMissile > 300) {
    missiles.push({
      x: player.x + player.width / 2 - missileConfig.width / 2,
      y: player.y,
      width: missileConfig.width,
      height: missileConfig.height,
      speed: missileConfig.speed,
      damage: missileConfig.damage
    });
    gameState.missiles--;
    player.lastMissile = now;
    playSound(audioMissile);
  }
}

function useBomb() {
  gameState.bombs--;
  playSound(audioExplosion);

  for (let i = enemies.length - 1; i >= 0; i--) {
    createExplosion(enemies[i].x + enemies[i].width / 2, enemies[i].y + enemies[i].height / 2);
    gameState.score += 100;
  }
  enemies.length = 0;
  enemyBullets.length = 0;

  if (gameState.status === 'SPHERE_RAIN') {
    alienSpheres.forEach(s => {
      createSolidBubbleExplosion(s.x, s.y);
      gameState.spheresKilled++;
    });
    alienSpheres.length = 0;
  }

  if (boss.active && boss.invulnerableTimer <= 0) {
    boss.health -= 60;
    createSolidBubbleExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2);
    if (boss.health <= 0) handleBossDefeat();
  }
}

function spawnPowerup(x, y) {
  const types = ['HEALTH', 'RAPID_FIRE', 'MISSILE', 'BOMB'];
  const type = types[Math.floor(Math.random() * types.length)];
  powerups.push({ x: x, y: y, width: 25, height: 25, type: type, speed: 1.5 });
}

function enemyShoot(enemy) {
  enemyBullets.push({
    x: enemy.x + enemy.width / 2 - 10,
    y: enemy.y + enemy.height,
    width: 20, height: 20, speed: 5.5
  });
}

function bossShoot() {
  const angles = boss.phase === 3 ? [-0.4, -0.2, 0, 0.2, 0.4] : [-0.25, 0, 0.25];
  angles.forEach(ang => {
    enemyBullets.push({
      x: boss.x + boss.width / 2 - 10,
      y: boss.y + boss.height - 10,
      width: 20, height: 20,
      vx: Math.sin(ang) * 6,
      vy: Math.cos(ang) * 6,
      speed: 6
    });
  });
}

// ============================================================================
// --- GERENCIAMENTO DE DERROTA DOS CHEFÕES ---
// ============================================================================
function handleBossDefeat() {
  gameState.status = 'BOSS_EXPLODING';
  gameState.transitionTimer = Date.now();
  gameState.lastExplosionTick = 0;
  enemyBullets.length = 0;
}

function createSolidBubbleExplosion(x, y) {
  playSound(audioExplosion);
  for (let i = 0; i < 12; i++) {
    explosions.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      radius: Math.random() * 12 + 8,
      alpha: 1,
      color: Math.random() > 0.5 ? '#ffffff' : '#ffff00',
      isSolidBubble: true
    });
  }
}

function createExplosion(x, y) {
  playSound(audioExplosion);
  for (let i = 0; i < 18; i++) {
    explosions.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      radius: Math.random() * 5 + 3,
      alpha: 1,
      color: Math.random() > 0.5 ? '#ff4500' : '#ffd700',
      isSolidBubble: false
    });
  }
}

// ============================================================================
// --- COLISÕES NO LABIRINTO ---
// ============================================================================
function checkScrollingMazeCollisions() {
  const margin = 6;
  const corners = [
    { x: player.x + margin, y: player.y + margin },
    { x: player.x + player.width - margin, y: player.y + margin },
    { x: player.x + margin, y: player.y + player.height - margin },
    { x: player.x + player.width - margin, y: player.y + player.height - margin }
  ];

  for (let pt of corners) {
    const col = Math.floor(pt.x / mazeConfig.tileWidth);
    const row = Math.floor((pt.y - mazeConfig.offsetY) / mazeConfig.tileHeight);

    if (row >= 0 && row < mazeConfig.rows && col >= 0 && col < mazeConfig.cols) {
      const tileType = mazeGrid[row][col];
      const isSolidWall = (tileType === 1);
      const isClosedDoor = (tileType === 2 && !mazeConfig.doorsOpen);

      if (isSolidWall || isClosedDoor) {
        createExplosion(pt.x, pt.y);
        applyKnockback((Math.random() - 0.5) * 8, 5, (Math.random() - 0.5) * 0.5);
        player.health -= 0.8;
        if (player.health <= 0) { player.health = 0; gameState.status = 'GAME_OVER'; }
        break;
      }
    }
  }

  mazeMines.forEach(mine => {
    if (!mine.active) return;
    const currentMineY = mazeConfig.offsetY + mine.tileYOffset;
    const dist = Math.hypot((player.x + player.width / 2) - mine.x, (player.y + player.height / 2) - currentMineY);

    if (dist < mine.radius + player.width / 3) {
      mine.active = false;
      createExplosion(mine.x, currentMineY);
      applyKnockback((Math.random() - 0.5) * 10, 8, 0.5);
      player.health -= 15;
      if (player.health <= 0) { player.health = 0; gameState.status = 'GAME_OVER'; }
    }
  });

  for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
    const b = bullets[bIndex];
    mazeMines.forEach(mine => {
      if (!mine.active) return;
      const currentMineY = mazeConfig.offsetY + mine.tileYOffset;
      if (Math.hypot(b.x - mine.x, b.y - currentMineY) < mine.radius + 10) {
        mine.active = false;
        createExplosion(mine.x, currentMineY);
        bullets.splice(bIndex, 1);
        gameState.score += 50;
      }
    });
  }
}

// ============================================================================
// --- LÓGICA DO JOGO (UPDATE) ---
// ============================================================================
function handlePlayerMovement() {
  if (keys['ArrowLeft'] || keys['KeyA']) {
    player.x -= player.speed;
    if (tapTracker.left.isDoubleTap) {
      player.vAngle -= 0.04;
    }
  }

  if (keys['ArrowRight'] || keys['KeyD']) {
    player.x += player.speed;
    if (tapTracker.right.isDoubleTap) {
      player.vAngle += 0.04;
    }
  }

  if (keys['ArrowUp'] || keys['KeyW']) player.y -= player.speed;
  if (keys['ArrowDown'] || keys['KeyS']) player.y += player.speed;

  if (keys['Space']) shoot();
  if (keys['KeyM'] || keys['ShiftLeft']) shootMissile();

  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function update() {
  if (gameState.status === 'GAME_OVER' || gameState.status === 'VICTORY') return;

  player.x += player.vx;
  player.y += player.vy;
  player.angle += player.vAngle;

  player.vx *= 0.88;
  player.vy *= 0.88;
  player.vAngle *= 0.82;
  player.angle *= 0.85;

  stars.forEach(star => {
    star.y += (gameState.status === 'TRANSITION_MAZE' || gameState.status === 'POST_MAZE_BREATHER' || gameState.status === 'BOSS_EXPLODING') ? star.speed * 3 : star.speed;
    if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; }
  });

  // 1. EXPLOSÃO DE 3 SEGUNDOS DOS CHEFÕES
  if (gameState.status === 'BOSS_EXPLODING') {
    const elapsed = Date.now() - gameState.transitionTimer;
    const now = Date.now();

    if (now - gameState.lastExplosionTick > 100) {
      const expX = boss.x + Math.random() * boss.width;
      const expY = boss.y + Math.random() * boss.height;
      createSolidBubbleExplosion(expX, expY);
      gameState.lastExplosionTick = now;
    }

    boss.x += (Math.random() - 0.5) * 8;
    boss.y += (Math.random() - 0.5) * 6;

    for (let i = explosions.length - 1; i >= 0; i--) {
      const p = explosions[i];
      p.x += p.vx; p.y += p.vy; p.alpha -= 0.03;
      if (p.alpha <= 0) explosions.splice(i, 1);
    }

    if (elapsed >= 3000) {
      boss.active = false;

      if (boss.phase === 1) {
        gameState.score += 1000;
        gameState.status = 'SPHERE_RAIN';
        gameState.spheresKilled = 0;
        alienSpheres.length = 0;
      } else if (boss.phase === 2) {
        gameState.score += 2000;
        gameState.status = 'TRANSITION_MAZE';
        gameState.transitionTimer = Date.now();
      } else if (boss.phase === 3) {
        gameState.score += 5000;
        gameState.status = 'VICTORY';
        setTimeout(() => {
          window.location.href = 'volta_pra_casa.html';
        }, 500);
      }
    }
    return;
  }

  // 2. CHUVA DE ESFERAS
  if (gameState.status === 'SPHERE_RAIN') {
    handlePlayerMovement();

    const now = Date.now();
    if (now - lastSphereSpawn > 250) {
      alienSpheres.push({
        x: Math.random() * (canvas.width - 30) + 15,
        y: -30,
        radius: Math.random() * 8 + 14,
        speedY: Math.random() * 2.5 + 3,
        colorType: Math.random() > 0.5 ? 'BLUE' : 'SILVER'
      });
      lastSphereSpawn = now;
    }

    for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
      const b = bullets[bIndex];
      b.x += b.vx;
      b.y += b.vy;

      for (let sIndex = alienSpheres.length - 1; sIndex >= 0; sIndex--) {
        const s = alienSpheres[sIndex];
        if (Math.hypot(b.x - s.x, b.y - s.y) < s.radius + 10) {
          createSolidBubbleExplosion(s.x, s.y);
          bullets.splice(bIndex, 1);
          alienSpheres.splice(sIndex, 1);
          gameState.spheresKilled++;
          gameState.score += 30;
          break;
        }
      }

      if (b && (b.y < -50 || b.y > canvas.height + 50 || b.x < -50 || b.x > canvas.width + 50)) {
        bullets.splice(bIndex, 1);
      }
    }

    for (let mIndex = missiles.length - 1; mIndex >= 0; mIndex--) {
      const m = missiles[mIndex];
      m.y -= m.speed;

      for (let sIndex = alienSpheres.length - 1; sIndex >= 0; sIndex--) {
        const s = alienSpheres[sIndex];
        if (Math.hypot(m.x - s.x, m.y - s.y) < s.radius + 20) {
          createSolidBubbleExplosion(s.x, s.y);
          missiles.splice(mIndex, 1);
          alienSpheres.splice(sIndex, 1);
          gameState.spheresKilled++;
          gameState.score += 30;
          break;
        }
      }

      if (m && m.y < 0) missiles.splice(mIndex, 1);
    }

    for (let sIndex = alienSpheres.length - 1; sIndex >= 0; sIndex--) {
      const s = alienSpheres[sIndex];
      s.y += s.speedY;

      const distToPlayer = Math.hypot((player.x + player.width / 2) - s.x, (player.y + player.height / 2) - s.y);
      if (distToPlayer < s.radius + player.width / 2.5) {
        createExplosion(s.x, s.y);
        applyKnockback((player.x + player.width / 2 - s.x) * 0.4, 6, (Math.random() - 0.5) * 0.5);
        player.health -= 10;
        alienSpheres.splice(sIndex, 1);

        if (player.health <= 0) {
          player.health = 0;
          gameState.status = 'GAME_OVER';
        }
        continue;
      }

      if (s.y > canvas.height + 40) alienSpheres.splice(sIndex, 1);
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      const p = explosions[i];
      p.x += p.vx; p.y += p.vy; p.alpha -= 0.03;
      if (p.alpha <= 0) explosions.splice(i, 1);
    }

    if (gameState.spheresKilled >= 20) {
      alienSpheres.length = 0;
      gameState.status = 'PLAYING';
      boss.active = true;
      boss.phase = 2; // SURGE CENTAURY II
      boss.health = 250;    // VIDA DO BOSS 2 = 250 HP
      boss.maxHealth = 250;
      boss.x = canvas.width / 2 - boss.width / 2;
      boss.y = -200;
      boss.invulnerableTimer = 20;
    }
    return;
  }

  // 3. TRANSIÇÃO ESPAÇO LIVRE (3s)
  if (gameState.status === 'TRANSITION_MAZE') {
    const elapsed = Date.now() - gameState.transitionTimer;
    if (elapsed >= 3000) {
      gameState.status = 'SCROLLING_MAZE';
      mazeConfig.offsetY = -mazeConfig.rows * mazeConfig.tileHeight;
      initMazeMines();
    }
    return;
  }

  // 4. LABIRINTO EM ROLAGEM
  if (gameState.status === 'SCROLLING_MAZE') {
    handlePlayerMovement();

    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].x += bullets[i].vx;
      bullets[i].y += bullets[i].vy;
      if (bullets[i].y < -50 || bullets[i].y > canvas.height + 50) bullets.splice(i, 1);
    }

    mazeConfig.doorTimer++;
    if (mazeConfig.doorTimer > 110) {
      mazeConfig.doorsOpen = !mazeConfig.doorsOpen;
      mazeConfig.doorTimer = 0;
    }

    mazeConfig.offsetY += mazeConfig.scrollSpeed;
    checkScrollingMazeCollisions();

    if (mazeConfig.offsetY > canvas.height) {
      gameState.status = 'POST_MAZE_BREATHER';
      gameState.transitionTimer = Date.now();
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      const p = explosions[i];
      p.x += p.vx; p.y += p.vy; p.alpha -= 0.03;
      if (p.alpha <= 0) explosions.splice(i, 1);
    }
    return;
  }

  // 5. RESPIRO PÓS-LABIRINTO (3s) -> SURGE CENTAURY 3
  if (gameState.status === 'POST_MAZE_BREATHER') {
    const elapsed = Date.now() - gameState.transitionTimer;
    if (elapsed >= 3000) {
      gameState.status = 'PLAYING';
      boss.active = true;
      boss.phase = 3; // CENTAURY III (FINAL)
      boss.health = 400;    // VIDA DO BOSS 3 FINAL = 400 HP
      boss.maxHealth = 400;
      boss.x = canvas.width / 2 - boss.width / 2;
      boss.y = -200;
      boss.invulnerableTimer = 30;
    }
    return;
  }

  // 6. GAMEPLAY PADRÃO
  if (gameState.rapidFireTimer > 0) gameState.rapidFireTimer--;
  if (boss.invulnerableTimer > 0) boss.invulnerableTimer--;

  handlePlayerMovement();

  // Tiros do Jogador x Boss
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    if (boss.active && boss.invulnerableTimer <= 0 &&
        b.x < boss.x + boss.width &&
        b.x > boss.x &&
        b.y < boss.y + boss.height &&
        b.y > boss.y) {
      boss.health -= b.damage;
      createExplosion(b.x, b.y);
      bullets.splice(i, 1);
      if (boss.health <= 0) handleBossDefeat();
      continue;
    }

    if (b.y < -50 || b.y > canvas.height + 50 || b.x < -50 || b.x > canvas.width + 50) {
      bullets.splice(i, 1);
    }
  }

  // Mísseis
  for (let i = missiles.length - 1; i >= 0; i--) {
    const m = missiles[i];
    let targetObj = boss.active ? boss : null;

    if (!targetObj) {
      let closestDist = Infinity;
      enemies.forEach(e => {
        const d = Math.hypot(e.x - m.x, e.y - m.y);
        if (d < closestDist) { closestDist = d; targetObj = e; }
      });
    }

    if (targetObj) {
      const angle = Math.atan2((targetObj.y + targetObj.height / 2) - m.y, (targetObj.x + targetObj.width / 2) - m.x);
      m.x += Math.cos(angle) * m.speed;
      m.y += Math.sin(angle) * m.speed;
    } else {
      m.y -= m.speed;
    }

    if (boss.active && boss.invulnerableTimer <= 0 &&
        m.x < boss.x + boss.width &&
        m.x + m.width > boss.x &&
        m.y < boss.y + boss.height &&
        m.y + m.height > boss.y) {
      boss.health -= m.damage;
      createExplosion(m.x, m.y);
      missiles.splice(i, 1);
      if (boss.health <= 0) handleBossDefeat();
      continue;
    }

    if (m.y < 0 || m.x < 0 || m.x > canvas.width || m.y > canvas.height) missiles.splice(i, 1);
  }

  // Tiros Inimigos
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];
    eb.x += eb.vx || 0;
    eb.y += eb.vy || eb.speed;

    if (
      eb.x < player.x + player.width &&
      eb.x + eb.width > player.x &&
      eb.y < player.y + player.height &&
      eb.y + eb.height > player.y
    ) {
      createExplosion(player.x + player.width / 2, player.y + player.height / 2);
      applyKnockback((player.x + player.width / 2 - eb.x) * 0.4, 6, (Math.random() - 0.5) * 0.8);

      enemyBullets.splice(i, 1);
      player.health -= 10;
      if (player.health <= 0) { player.health = 0; gameState.status = 'GAME_OVER'; }
      continue;
    }

    if (eb.y > canvas.height || eb.x < 0 || eb.x > canvas.width) enemyBullets.splice(i, 1);
  }

  // Spawning do Boss 1 (Após 70 Kills)
  if (gameState.kills >= gameState.killsToBoss && !gameState.bossSpawned) {
    gameState.bossSpawned = true;
    boss.active = true;
    boss.phase = 1;
    boss.health = 150;
    boss.maxHealth = 150;
    boss.x = canvas.width / 2 - boss.width / 2;
    boss.y = -200;
  }

  if (boss.active) {
    if (boss.y < boss.targetY) boss.y += 2;
    boss.x += boss.speedX;
    if (boss.x <= 10 || boss.x + boss.width >= canvas.width - 10) boss.speedX *= -1;

    const now = Date.now();
    if (now - boss.lastShoot > boss.shootDelay) {
      bossShoot();
      boss.lastShoot = now;
    }
  }

  // Batedores Normais (batedor_04)
  const now = Date.now();
  if (gameState.status === 'PLAYING' && !gameState.bossSpawned && !boss.active && (now - lastEnemySpawn > enemySpawnDelay)) {
    enemies.push({
      x: Math.random() * (canvas.width - 44),
      y: -50, width: 44, height: 44,
      speed: Math.random() * 2 + 2,
      lastShoot: 0,
      shootDelay: Math.random() * 1000 + 1500
    });
    lastEnemySpawn = now;
  }

  for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
    const enemy = enemies[eIndex];
    enemy.y += enemy.speed;

    if (now - enemy.lastShoot > enemy.shootDelay && enemy.y > 0) {
      enemyShoot(enemy);
      enemy.lastShoot = now;
    }

    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    ) {
      createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
      applyKnockback((player.x - enemy.x) * 0.5, 8, 0.6);
      player.health -= 15;
      enemies.splice(eIndex, 1);
      continue;
    }

    for (let bIndex = bullets.length - 1; bIndex >= 0; bIndex--) {
      const bullet = bullets[bIndex];
      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y > enemy.y
      ) {
        createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        bullets.splice(bIndex, 1);
        enemies.splice(eIndex, 1);

        gameState.score += 100;
        gameState.kills++;
        if (gameState.kills % 5 === 0) spawnPowerup(enemy.x, enemy.y);
        break;
      }
    }

    if (enemies[eIndex] && enemies[eIndex].y > canvas.height) enemies.splice(eIndex, 1);
  }

  // Coleta de Power-ups com ÁUDIO BONUS.MP3
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += p.speed;

    if (
      p.x < player.x + player.width &&
      p.x + p.width > player.x &&
      p.y < player.y + player.height &&
      p.y + p.height > player.y
    ) {
      playSound(audioBonus); // Som de Bônus tocado ao coletar!

      if (p.type === 'HEALTH') player.health = Math.min(player.maxHealth, player.health + 15);
      if (p.type === 'RAPID_FIRE') gameState.rapidFireTimer = 300;
      if (p.type === 'MISSILE') gameState.missiles += 2;
      if (p.type === 'BOMB') gameState.bombs += 1;

      powerups.splice(i, 1);
      continue;
    }

    if (p.y > canvas.height) powerups.splice(i, 1);
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    const p = explosions[i];
    p.x += p.vx; p.y += p.vy; p.alpha -= 0.03;
    if (p.alpha <= 0) explosions.splice(i, 1);
  }
}

// ============================================================================
// --- DESENHAR HUD ADAPTADO PARA MOBILE ---
// ============================================================================
function drawHUD() {
  ctx.fillStyle = '#222';
  ctx.fillRect(15, 15, 140, 16);
  ctx.fillStyle = player.health > 30 ? '#00ff66' : '#ff0033';
  ctx.fillRect(15, 15, (player.health / player.maxHealth) * 140, 16);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(15, 15, 140, 16);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`HP: ${Math.ceil(player.health)}%`, 18, 28);

  ctx.font = '14px monospace';
  ctx.fillText(`PTS: ${gameState.score}`, 15, 50);

  if (gameState.status === 'SPHERE_RAIN') {
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(`ESFERAS: ${gameState.spheresKilled}/20`, 15, 68);
  } else {
    ctx.fillText(`KILLS: ${gameState.kills}/${gameState.killsToBoss}`, 15, 68);
  }

  ctx.fillStyle = '#00ffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`MÍSSIL: ${gameState.missiles}`, canvas.width - 100, 25);
  ctx.fillStyle = '#ff5500';
  ctx.fillText(`BOMBA: ${gameState.bombs}`, canvas.width - 100, 45);

  if (boss.active && gameState.status !== 'BOSS_EXPLODING') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(canvas.width / 2 - 100, 10, 200, 20);
    ctx.fillStyle = boss.invulnerableTimer > 0 ? '#ffff00' : '#ff0055';
    ctx.fillRect(canvas.width / 2 - 100, 10, (boss.health / boss.maxHealth) * 200, 20);
    ctx.strokeStyle = '#ff00ff';
    ctx.strokeRect(canvas.width / 2 - 100, 10, 200, 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    let bossName = 'CENTAURY I';
    if (boss.phase === 2) bossName = 'CENTAURY II';
    if (boss.phase === 3) bossName = 'CENTAURY III';
    ctx.fillText(`${bossName} (${Math.ceil(boss.health)} HP)`, canvas.width / 2, 24);
    ctx.textAlign = 'left';
  }

  if (gameState.status === 'GAME_OVER') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ff0055';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText(`PONTUAÇÃO FINAL: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Pressione [ R ] para Reiniciar', canvas.width / 2, canvas.height / 2 + 55);
    ctx.textAlign = 'left';
  }
}

// ============================================================================
// --- RENDERIZAÇÃO DO LABIRINTO ---
// ============================================================================
function drawMaze() {
  ctx.fillStyle = '#02000a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach(s => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  for (let r = 0; r < mazeConfig.rows; r++) {
    const tileY = mazeConfig.offsetY + r * mazeConfig.tileHeight;

    if (tileY + mazeConfig.tileHeight > 0 && tileY < canvas.height) {
      for (let c = 0; c < mazeConfig.cols; c++) {
        const tileType = mazeGrid[r][c];
        const tileX = c * mazeConfig.tileWidth;

        if (tileType === 1) {
          ctx.fillStyle = 'rgba(0, 160, 255, 0.35)';
          ctx.fillRect(tileX + 2, tileY + 2, mazeConfig.tileWidth - 4, mazeConfig.tileHeight - 4);
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(tileX + 2, tileY + 2, mazeConfig.tileWidth - 4, mazeConfig.tileHeight - 4);
        } else if (tileType === 2) {
          if (mazeConfig.doorsOpen) {
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.4)';
            ctx.lineWidth = 2;
            ctx.strokeRect(tileX + 4, tileY + 4, mazeConfig.tileWidth - 8, mazeConfig.tileHeight - 8);
          } else {
            ctx.fillStyle = 'rgba(255, 0, 60, 0.6)';
            ctx.fillRect(tileX + 2, tileY + 2, mazeConfig.tileWidth - 4, mazeConfig.tileHeight - 4);
            ctx.strokeStyle = '#ff0033';
            ctx.lineWidth = 3;
            ctx.strokeRect(tileX + 2, tileY + 2, mazeConfig.tileWidth - 4, mazeConfig.tileHeight - 4);
          }
        }
      }
    }
  }

  mazeMines.forEach(mine => {
    if (!mine.active) return;
    const currentMineY = mazeConfig.offsetY + mine.tileYOffset;

    if (currentMineY > -50 && currentMineY < canvas.height + 50) {
      ctx.save();
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(mine.x, currentMineY, mine.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = Math.floor(Date.now() / 200) % 2 === 0 ? '#ff0000' : '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  });

  bullets.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.drawImage(imgPlayerBullet, -b.width / 2, -b.height / 2, b.width, b.height);
    ctx.restore();
  });

  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.rotate(player.angle);
  ctx.drawImage(imgPlayer, -player.width / 2, -player.height / 2, player.width, player.height);
  ctx.restore();

  explosions.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.fillStyle = '#ffff00';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚠️ ATRAVESSE A TRINCHEIRA! ⚠️', canvas.width / 2, 35);
  ctx.textAlign = 'left';

  drawHUD();
}

// ============================================================================
// --- RENDERIZAÇÃO GERAL (DRAW) ---
// ============================================================================
function draw() {
  if (gameState.status === 'BOSS_EXPLODING') {
    ctx.fillStyle = '#000008';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

    let activeBossImg = imgBoss1;
    if (boss.phase === 2) activeBossImg = imgBoss2;
    if (boss.phase === 3) activeBossImg = imgBoss3;

    ctx.drawImage(activeBossImg, boss.x, boss.y, boss.width, boss.height);

    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.angle);
    ctx.drawImage(imgPlayer, -player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();

    explosions.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      if (p.isSolidBubble) {
        ctx.strokeStyle = p.color === '#ffffff' ? '#ffff00' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    });

    drawHUD();
    return;
  }

  if (gameState.status === 'SPHERE_RAIN') {
    ctx.fillStyle = '#00000d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

    alienSpheres.forEach(s => {
      ctx.save();
      ctx.shadowBlur = 15;

      if (s.colorType === 'BLUE') {
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#0088ff';
        ctx.strokeStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#e0e0e0';
        ctx.shadowColor = '#00ffff';
        ctx.strokeStyle = '#00f0ff';
      }

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });

    bullets.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.drawImage(imgPlayerBullet, -b.width / 2, -b.height / 2, b.width, b.height);
      ctx.restore();
    });

    missiles.forEach(m => ctx.drawImage(imgMissile, m.x, m.y, m.width, m.height));

    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.angle);
    ctx.drawImage(imgPlayer, -player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();

    explosions.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ DESTRUA 20 ESFERAS! ⚡', canvas.width / 2, 35);
    ctx.textAlign = 'left';

    drawHUD();
    return;
  }

  if (gameState.status === 'TRANSITION_MAZE') {
    ctx.fillStyle = '#00000a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size * 3));

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚀 CENTAURY II DERROTADO!', canvas.width / 2, canvas.height / 2 - 15);
    ctx.fillStyle = '#ffcc00';
    ctx.font = '14px sans-serif';
    ctx.fillText('Aproximando-se do Labirinto...', canvas.width / 2, canvas.height / 2 + 20);
    ctx.textAlign = 'left';
    return;
  }

  if (gameState.status === 'POST_MAZE_BREATHER') {
    ctx.fillStyle = '#00000a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size * 3));

    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✅ LABIRINTO ATRAVESSADO!', canvas.width / 2, canvas.height / 2 - 15);
    ctx.fillStyle = '#ff0055';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('CENTAURY III (FINAL) APROXIMANDO-SE!', canvas.width / 2, canvas.height / 2 + 25);
    ctx.textAlign = 'left';
    return;
  }

  if (gameState.status === 'SCROLLING_MAZE') {
    drawMaze();
    return;
  }

  ctx.fillStyle = '#000008';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

  powerups.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
    if (p.type === 'HEALTH') ctx.fillStyle = '#00ff66';
    if (p.type === 'RAPID_FIRE') ctx.fillStyle = '#ffff00';
    if (p.type === 'MISSILE') ctx.fillStyle = '#00ffff';
    if (p.type === 'BOMB') ctx.fillStyle = '#ff0055';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  });

  bullets.forEach(b => {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.drawImage(imgPlayerBullet, -b.width / 2, -b.height / 2, b.width, b.height);
    ctx.restore();
  });

  missiles.forEach(m => ctx.drawImage(imgMissile, m.x, m.y, m.width, m.height));
  enemyBullets.forEach(eb => ctx.drawImage(imgEnemyBullet, eb.x, eb.y, eb.width, eb.height));

  if (boss.active) {
    let currentBossImg = imgBoss1;
    if (boss.phase === 2) currentBossImg = imgBoss2;
    if (boss.phase === 3) currentBossImg = imgBoss3;

    if (boss.invulnerableTimer === 0 || Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.drawImage(currentBossImg, boss.x, boss.y, boss.width, boss.height);
    }
  }

  ctx.save();
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
  ctx.rotate(player.angle);
  ctx.drawImage(imgPlayer, -player.width / 2, -player.height / 2, player.width, player.height);
  ctx.restore();

  enemies.forEach(e => ctx.drawImage(imgEnemy, e.x, e.y, e.width, e.height));

  explosions.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  drawHUD();
}

// --- GAME LOOP ---
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();

// ============================================================================
// LOGICA DE COMANDOS VIRTUAIS (TOUCH MOBILE)
// ============================================================================

// Mapeamento dinâmico dos botões na tela para os eventos do teclado
function setupTouchButton(buttonId, keyCode) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  const press = (e) => {
    e.preventDefault();
    if (typeof keys !== 'undefined') {
      keys[keyCode] = true;
    }
  };

  const release = (e) => {
    e.preventDefault();
    if (typeof keys !== 'undefined') {
      keys[keyCode] = false;
    }
  };

  // Eventos para Celular (Touch) e PC (Mouse para testes)
  btn.addEventListener('touchstart', press, { passive: false });
  btn.addEventListener('touchend', release, { passive: false });
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
}

// Vincula os IDs do HTML às teclas correspondentes
setupTouchButton('btn-up', 'ArrowUp');
setupTouchButton('btn-down', 'ArrowDown');
setupTouchButton('btn-left', 'ArrowLeft');
setupTouchButton('btn-right', 'ArrowRight');
setupTouchButton('btn-shoot', 'Space');
setupTouchButton('btn-missile', 'KeyM');
setupTouchButton('btn-bomb', 'KeyB');