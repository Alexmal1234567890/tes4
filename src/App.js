import React, { useEffect, useRef } from "react";

const DinoCADEUL = () => {
  // Références pour le canvas et l'animation
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Référence pour les états du jeu
  const playerRef = useRef({
    x: 100,
    y: 200,
    width: 40,
    height: 50,
    velX: 0,
    velY: 0,
    facingRight: true,
    isJumping: false,
    isOnGround: false,
    health: 3,
    invulnerable: 0,
    isDead: false,
  });

  const gameRef = useRef({
    active: false,
    level: 1,
    score: 0,
    cameraX: 0,
    keys: {},
    gameOver: false,
    levelComplete: false,
    time: 0,
    showLevelMessage: false, // Flag pour montrer le message de fin de niveau
    isTransitioning: false, // Flag pour éviter les transitions multiples
  });

  // Éléments du jeu
  const platformsRef = useRef([]);
  const coinsRef = useRef([]);
  const enemiesRef = useRef([]);
  const powerupsRef = useRef([]);
  const goalRef = useRef({ x: 3000, y: 300, width: 50, height: 100 });

  // Fonction pour détecter si l'utilisateur est sur mobile
  const isMobileDevice = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  };

  // Référence pour savoir si on est sur mobile
  const isMobileRef = useRef(isMobileDevice());

  // Constantes
  const GRAVITY = 0.8;
  const JUMP_FORCE = 15;
  const SPEED = 5;
  const GROUND_Y = 385;
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 450;

  // Initialisation du jeu
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Définir la taille du canvas
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const game = gameRef.current;

    // Initialiser le joueur avec 3 vies
    playerRef.current.health = 3;
    playerRef.current.grade = "A+";

    // Génération initiale du niveau
    generateLevel(1);

    // Variable pour suivre si un niveau est en cours de transition
    let isTransitioning = false;

    // Gestion des touches
    const handleKeyDown = (e) => {
      game.keys[e.code] = true;

      // Démarrer le jeu si appui sur une touche
      if (!game.active && !game.gameOver && !isTransitioning) {
        game.active = true;
        gameLoop();
      }

      // Redémarrer le jeu si game over
      if (game.gameOver && (e.code === "Space" || e.code === "Enter")) {
        restartGame();
      }

      // Passer au niveau suivant
      if (game.levelComplete && (e.code === "Space" || e.code === "Enter")) {
        if (!isTransitioning) {
          isTransitioning = true;
          nextLevel();
          // Réinitialiser après la transition
          setTimeout(() => {
            isTransitioning = false;
          }, 1500);
        }
      }
    };

    const handleKeyUp = (e) => {
      game.keys[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Démarrer sur clic aussi
    canvas.addEventListener("click", () => {
      if (!game.active && !game.gameOver && !isTransitioning) {
        game.active = true;
        gameLoop();
      } else if (game.gameOver) {
        restartGame();
      } else if (game.levelComplete && !isTransitioning) {
        isTransitioning = true;
        nextLevel();
        // Réinitialiser après la transition
        setTimeout(() => {
          isTransitioning = false;
        }, 1500);
      }
    });

    // Dessiner l'écran de démarrage
    drawStartScreen();

    // Nettoyage
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Génération des niveaux
  const generateLevel = (level) => {
    // Vider complètement les tableaux avant la génération
    const platforms = [];
    const coins = [];
    const powerups = []; // Nouveau tableau pour les powerups
    const enemies = [];

    // Fonction pour vérifier si une plateforme chevauche une autre
    const checkPlatformOverlap = (newPlatform) => {
      // Vérifier le chevauchement avec les plateformes existantes
      for (const platform of platforms) {
        // Ignorer les plateformes de sol pour cette vérification
        if (platform.type === "ground") continue;

        // Vérifier si les plateformes sont trop proches verticalement (moins de 40 pixels)
        const verticalOverlap = Math.abs(platform.y - newPlatform.y) < 40;

        // Vérifier si les plateformes se chevauchent horizontalement
        const horizontalOverlap =
          newPlatform.x < platform.x + platform.width &&
          newPlatform.x + newPlatform.width > platform.x;

        // Si les deux conditions sont vraies, il y a chevauchement
        if (verticalOverlap && horizontalOverlap) {
          return true;
        }
      }
      return false;
    };

    // Fonction pour déterminer si un point est sur une plateforme
    const isOnPlatform = (x, y) => {
      for (const platform of platforms) {
        if (
          x >= platform.x &&
          x <= platform.x + platform.width &&
          y >= platform.y - 10 &&
          y <= platform.y + platform.height + 10
        ) {
          return true;
        }
      }
      return false;
    };

    // Fonction pour positionner une pièce près d'une plateforme mais pas dessus
    const positionCoinNearPlatform = (platformIndex) => {
      const platform = platforms[platformIndex];
      if (!platform) return null;

      // Positions possibles: au-dessus, en dessous, à gauche, à droite
      const positions = [
        // Au-dessus
        {
          x: platform.x + Math.random() * platform.width,
          y: platform.y - 30 - Math.random() * 40,
        },
        // À gauche
        {
          x: platform.x - 30 - Math.random() * 20,
          y: platform.y - 20 + Math.random() * 40,
        },
        // À droite
        {
          x: platform.x + platform.width + 10 + Math.random() * 20,
          y: platform.y - 20 + Math.random() * 40,
        },
      ];

      // Choisir une position aléatoire
      const position = positions[Math.floor(Math.random() * positions.length)];

      // Vérifier que la position n'est pas sur une autre plateforme
      if (!isOnPlatform(position.x, position.y)) {
        return position;
      }

      // Si toutes les positions sont occupées, renvoyer null
      return null;
    };

    // Fonction pour ajouter les propriétés d'écroulement aux plateformes
    const addCollapsableProperties = (platform) => {
      if (platform.type === "platform") {
        platform.canCollapse = true;
        platform.collapseTimer = 90;
        platform.maxTimer = 90;
        platform.isCollapsing = false;
        platform.playerStanding = false;
        platform.opacity = 1.0;
      }
      return platform;
    };

    // Niveau 1
    if (level === 1) {
      // Sol avec des trous franchissables
      for (let i = 0; i < 15; i++) {
        // Créer des trous dans le sol pour le niveau 1
        if (i !== 3 && i !== 7 && i !== 11) {
          platforms.push({
            x: i * 400,
            y: GROUND_Y,
            width: 320, // Légèrement plus petit pour créer des trous franchissables
            height: 70,
            type: "ground",
          });
        }
      }

      // Plateformes flottantes
      const platformPositions = [
        // Plateformes pour aider à franchir les trous
        { x: 1050, y: 250, w: 100 }, // Aide pour le premier trou (i=3)
        { x: 1200, y: 250, w: 100 },
        { x: 2750, y: 250, w: 100 }, // Aide pour le deuxième trou (i=7)
        { x: 2900, y: 250, w: 100 },
        { x: 4350, y: 250, w: 100 }, // Aide pour le troisième trou (i=11)
        { x: 4500, y: 250, w: 100 },

        // Plateformes standard
        { x: 300, y: 250, w: 120 },
        { x: 450, y: 200, w: 100 },
        { x: 600, y: 230, w: 140 },
        { x: 800, y: 210, w: 110 },
        { x: 950, y: 250, w: 120 },
        { x: 1100, y: 200, w: 100 },
        { x: 1300, y: 230, w: 120 },
        { x: 1500, y: 200, w: 140 },
        { x: 1700, y: 250, w: 100 },
        { x: 1900, y: 200, w: 120 },
        { x: 2100, y: 230, w: 140 },
        { x: 2300, y: 210, w: 110 },
        { x: 2500, y: 250, w: 120 },
      ];

      // Ajouter les plateformes en vérifiant le chevauchement
      for (const pos of platformPositions) {
        const newPlatform = {
          x: pos.x,
          y: pos.y,
          width: pos.w,
          height: 20,
          type: "platform",
        };

        // Ajouter les propriétés d'écroulement
        addCollapsableProperties(newPlatform);

        // Vérifier le chevauchement avec les plateformes existantes
        if (!checkPlatformOverlap(newPlatform)) {
          platforms.push(newPlatform);
        }
      }

      // Générer les pièces près des plateformes
      const numPlatforms = platforms.length;
      for (let i = 0; i < 30; i++) {
        // Choisir une plateforme aléatoire
        const platformIndex = Math.floor(Math.random() * numPlatforms);
        const coinPos = positionCoinNearPlatform(platformIndex);

        if (coinPos) {
          coins.push({
            x: coinPos.x,
            y: coinPos.y,
            radius: 15,
            collected: false,
          });
        } else {
          // Si on n'a pas pu positionner la pièce, la mettre à un endroit aléatoire
          coins.push({
            x: 200 + i * 150 + Math.random() * 50,
            y: 100 + Math.random() * 100,
            radius: 15,
            collected: false,
          });
        }
      }

      // Ajouter des powerups pour améliorer la note
      for (let i = 0; i < 3; i++) {
        powerups.push({
          x: 1000 + i * 1000,
          y: 150,
          width: 30,
          height: 30,
          collected: false,
          type: "grade",
        });
      }

      // Ennemis - aucun ennemi sur la première plateforme de sol (0-320px)
      [
        // Commencer les ennemis au sol après la position 450 pour éviter la première plateforme
        { x: 550, y: GROUND_Y - 40, type: "slime" },
        { x: 800, y: GROUND_Y - 40, type: "slime" },
        { x: 1200, y: GROUND_Y - 40, type: "spike" },
        { x: 1500, y: GROUND_Y - 40, type: "slime" },
        { x: 1900, y: GROUND_Y - 40, type: "spike" },
        { x: 2200, y: GROUND_Y - 40, type: "slime" },
        { x: 2600, y: GROUND_Y - 40, type: "spike" },
        // Les ennemis volants commencent aussi loin de la position de départ
        { x: 700, y: 150, type: "flyingEnemy" },
        { x: 1100, y: 100, type: "flyingEnemy" },
        { x: 1600, y: 120, type: "flyingEnemy" },
        { x: 2000, y: 90, type: "flyingEnemy" },
        { x: 2400, y: 130, type: "flyingEnemy" },
      ].forEach((e) => {
        enemies.push({
          x: e.x,
          y: e.y,
          width: 40,
          height: 40,
          type: e.type,
          direction: 1,
          speed: e.type === "flyingEnemy" ? 2 : 1,
          amplitude: 50,
          frequency: 0.02,
          startY: e.y,
        });
      });

      // Position de l'objectif
      goalRef.current = { x: 3200, y: GROUND_Y - 100, width: 50, height: 100 };
    }

    // Niveau 2
    else if (level === 2) {
      // Sol avec des trous plus fréquents mais franchissables
      for (let i = 0; i < 15; i++) {
        if (i % 2 === 0) {
          // Trou tous les 2 blocs
          platforms.push({
            x: i * 400,
            y: GROUND_Y,
            width: 280, // Légèrement plus petit pour créer des trous franchissables
            height: 70,
            type: "ground",
          });
        }
      }

      // Plateformes flottantes pour aider à franchir les trous
      for (let i = 0; i < 7; i++) {
        const newPlatform = {
          x: 370 + i * 800, // Placement stratégique au-dessus des trous
          y: 250,
          width: 100,
          height: 20,
          type: "platform",
        };

        // Ajouter les propriétés d'écroulement
        addCollapsableProperties(newPlatform);

        if (!checkPlatformOverlap(newPlatform)) {
          platforms.push(newPlatform);
        }
      }

      // Plus de plateformes
      for (let i = 0; i < 30; i++) {
        const attempts = 5; // Nombre maximum de tentatives pour placer une plateforme

        for (let j = 0; j < attempts; j++) {
          const newPlatform = {
            x: 200 + i * 200 + Math.random() * 50 - 25,
            y: 150 + Math.random() * 150,
            width: 100,
            height: 20,
            type: "platform",
          };

          // Ajouter les propriétés d'écroulement
          addCollapsableProperties(newPlatform);

          if (!checkPlatformOverlap(newPlatform)) {
            platforms.push(newPlatform);
            break;
          }
        }
      }

      // Générer les pièces près des plateformes
      for (let i = 0; i < 50; i++) {
        // Choisir une plateforme aléatoire
        const platformIndex = Math.floor(Math.random() * platforms.length);
        const coinPos = positionCoinNearPlatform(platformIndex);

        if (coinPos) {
          coins.push({
            x: coinPos.x,
            y: coinPos.y,
            radius: 12,
            collected: false,
          });
        } else {
          // Position aléatoire si nécessaire
          coins.push({
            x: 200 + i * 100 + Math.random() * 50,
            y: 100 + Math.random() * 130,
            radius: 12,
            collected: false,
          });
        }
      }

      // Plus d'ennemis - pas sur la première plateforme
      for (let i = 0; i < 20; i++) {
        const type =
          Math.random() > 0.6
            ? "spike"
            : Math.random() > 0.5
            ? "slime"
            : "flyingEnemy";
        const y =
          type === "flyingEnemy" ? 100 + Math.random() * 100 : GROUND_Y - 40;

        // Position X avec un offset pour éviter la première plateforme (minimum 500px)
        const enemyX = Math.max(500, 400 + i * 200);

        enemies.push({
          x: enemyX,
          y: y,
          width: 40,
          height: 40,
          type: type,
          direction: Math.random() > 0.5 ? 1 : -1,
          speed: type === "flyingEnemy" ? 2.5 : 1.5,
          amplitude: 50,
          frequency: 0.02,
          startY: y,
        });
      }

      // Position de l'objectif
      goalRef.current = { x: 4200, y: GROUND_Y - 100, width: 50, height: 100 };
    }

    // Niveau 3
    else if (level === 3) {
      // Sol avec encore plus de trous mais tous franchissables
      for (let i = 0; i < 15; i++) {
        if (i % 3 === 0) {
          // Un sol sur trois
          platforms.push({
            x: i * 400,
            y: GROUND_Y,
            width: 270, // Encore plus petit pour rendre le niveau plus difficile mais franchissable
            height: 70,
            type: "ground",
          });
        }
      }

      // Plateformes flottantes pour aider à franchir les trous
      for (let i = 0; i < 5; i++) {
        const platform1 = {
          x: 400 + i * 1200, // Placement stratégique au-dessus des trous
          y: 250,
          width: 100,
          height: 20,
          type: "platform",
        };

        const platform2 = {
          x: 550 + i * 1200, // Une deuxième plateforme par trou pour aider
          y: 280,
          width: 100,
          height: 20,
          type: "platform",
        };

        // Ajouter les propriétés d'écroulement
        addCollapsableProperties(platform1);
        addCollapsableProperties(platform2);

        if (!checkPlatformOverlap(platform1)) {
          platforms.push(platform1);
        }

        if (!checkPlatformOverlap(platform2)) {
          platforms.push(platform2);
        }
      }

      // Encore plus de plateformes
      for (let i = 0; i < 40; i++) {
        const attempts = 8; // Plus de tentatives pour le niveau 3

        for (let j = 0; j < attempts; j++) {
          const newPlatform = {
            x: 200 + i * 150 + Math.random() * 50 - 25,
            y: 150 + Math.random() * 150,
            width: 80 + Math.random() * 40,
            height: 20,
            type: "platform",
          };

          // Ajouter les propriétés d'écroulement
          addCollapsableProperties(newPlatform);

          if (!checkPlatformOverlap(newPlatform)) {
            platforms.push(newPlatform);
            break;
          }
        }
      }

      // Encore plus de pièces
      for (let i = 0; i < 70; i++) {
        // Choisir une plateforme aléatoire
        const platformIndex = Math.floor(Math.random() * platforms.length);
        const coinPos = positionCoinNearPlatform(platformIndex);

        if (coinPos) {
          coins.push({
            x: coinPos.x,
            y: coinPos.y,
            radius: 12,
            collected: false,
          });
        } else {
          // Position aléatoire si nécessaire
          coins.push({
            x: 200 + i * 80 + Math.random() * 40,
            y: 100 + Math.random() * 100,
            radius: 12,
            collected: false,
          });
        }
      }

      // Beaucoup plus d'ennemis - pas sur la première plateforme
      for (let i = 0; i < 30; i++) {
        const type =
          Math.random() > 0.7
            ? "spike"
            : Math.random() > 0.5
            ? "slime"
            : "flyingEnemy";
        const y =
          type === "flyingEnemy" ? 80 + Math.random() * 120 : GROUND_Y - 40;

        // Position X avec un offset pour éviter la première plateforme (minimum 500px)
        const enemyX = Math.max(500, 400 + i * 180);

        enemies.push({
          x: enemyX,
          y: y,
          width: 40,
          height: 40,
          type: type,
          direction: Math.random() > 0.5 ? 1 : -1,
          speed: type === "flyingEnemy" ? 3 : 2,
          amplitude: 60,
          frequency: 0.025,
          startY: y,
        });
      }

      // Longue plateforme pour le boss (vers la fin du niveau)
      platforms.push({
        x: 4800,
        y: GROUND_Y,
        width: 600, // Plateforme suffisamment longue pour le combat
        height: 70,
        type: "ground",
      });

      // Plateformes flottantes au-dessus pour plus de dynamisme dans le combat
      const platform1 = {
        x: 4850,
        y: GROUND_Y - 120,
        width: 100,
        height: 20,
        type: "platform",
      };
      addCollapsableProperties(platform1);
      platforms.push(platform1);

      const platform2 = {
        x: 5100,
        y: GROUND_Y - 150,
        width: 120,
        height: 20,
        type: "platform",
      };
      addCollapsableProperties(platform2);
      platforms.push(platform2);

      const platform3 = {
        x: 5250,
        y: GROUND_Y - 100,
        width: 100,
        height: 20,
        type: "platform",
      };
      addCollapsableProperties(platform3);
      platforms.push(platform3);

      // Boss à la fin
      enemies.push({
        x: 5000,
        y: GROUND_Y - 80,
        width: 80,
        height: 80,
        type: "boss",
        direction: -1,
        speed: 1.5,
        health: 3,
        maxHealth: 3,
        isFinalBoss: true, // Marquer comme boss final
        defeated: false, // État pour savoir s'il a été vaincu
      });

      // Position de l'objectif (masqué initialement)
      goalRef.current = {
        x: 5400,
        y: GROUND_Y - 100,
        width: 50,
        height: 100,
        visible: false, // Le drapeau est invisible jusqu'à ce que le boss soit vaincu
      };
    }

    // Sauvegarder les éléments générés
    platformsRef.current = platforms;
    coinsRef.current = coins;
    enemiesRef.current = enemies;

    // Réinitialiser le joueur
    const player = playerRef.current;
    player.x = 100;
    player.y = 200;
    player.velX = 0;
    player.velY = 0;
    player.facingRight = true;
    player.isJumping = false;
    player.isOnGround = false;
    player.isDead = false;

    // Réinitialiser la caméra
    gameRef.current.cameraX = 0;
  };
  // Redémarrer le jeu
  const restartGame = () => {
    const game = gameRef.current;
    game.active = true;
    game.gameOver = false;
    game.levelComplete = false;
    game.score = 0;
    game.level = 1;

    // S'assurer que la santé est réinitialisée à 3
    playerRef.current.health = 3;
    playerRef.current.grade = "A+";
    playerRef.current.isDead = false;

    generateLevel(1);
    gameLoop();
  };

  // Passer au niveau suivant
  const nextLevel = () => {
    const game = gameRef.current;

    // Incrémenter le niveau
    game.level += 1;

    // Initialiser la difficulté si elle n'existe pas
    if (!game.difficulty) {
      game.difficulty = 1;
    }

    if (game.level > 10) {
      // Jeu terminé après le niveau 10 - revenir au niveau 1 avec une difficulté accrue
      game.level = 1;

      // Augmenter la difficulté
      game.difficulty += 0.3; // Augmentation de 30% de la difficulté

      // Réinitialiser les états
      game.active = true;
      game.gameOver = false;
      game.levelComplete = false;
      game.score = 0;

      // S'assurer que la santé est réinitialisée
      playerRef.current.health = 3;
      playerRef.current.grade = "A+";
      playerRef.current.isDead = false;

      // Afficher un message de difficulté accrue
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Fond semi-transparent
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Message
      ctx.fillStyle = "#FFD700"; // Or
      ctx.font = "bold 30px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "Tous les niveaux terminés!",
        canvas.width / 2,
        canvas.height / 2 - 30
      );
      ctx.fillStyle = "white";
      ctx.font = "22px Arial";
      ctx.fillText(
        "Difficulté augmentée de 30%",
        canvas.width / 2,
        canvas.height / 2 + 20
      );

      // Attendre un peu avant de générer le nouveau niveau
      setTimeout(() => {
        generateLevel(1);
        gameLoop();
      }, 2000);
    } else {
      // Augmenter légèrement la difficulté à chaque niveau au-delà du niveau 3
      if (game.level > 3) {
        game.difficulty += 0.1;
      }

      // Réinitialiser les états de fin de niveau
      game.active = true;
      game.levelComplete = false;
      game.showLevelMessage = false;

      // Réinitialiser complètement les touches pour éviter les problèmes d'entrée bloquée
      game.keys = {};

      // Réinitialiser la santé à 3 pour chaque nouveau niveau
      playerRef.current.health = 3;
      playerRef.current.isDead = false;

      // Générer le nouveau niveau et démarrer immédiatement
      generateLevel(game.level);
      gameLoop();
    }
  };

  // Dessiner l'écran de démarrage
  const drawStartScreen = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Fond avec dégradé
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#64B5F6");
    gradient.addColorStop(1, "#2196F3");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Motif de fond (logo CADEUL subtil)
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 6; j++) {
        ctx.beginPath();
        ctx.arc(i * 100, j * 100, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "bold 24px Arial";
        ctx.fillText("C", i * 100, j * 100 + 8);
      }
    }
    ctx.globalAlpha = 1.0;

    // Sol
    const groundGradient = ctx.createLinearGradient(
      0,
      GROUND_Y,
      0,
      canvas.height
    );
    groundGradient.addColorStop(0, "#4CAF50");
    groundGradient.addColorStop(1, "#388E3C");
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

    // Panneau de titre
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(canvas.width / 2 - 250, 50, 500, 100);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 250, 50, 500, 100);

    // Titre principal (sans le logo C)
    ctx.fillStyle = "white";
    ctx.font = "bold 60px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Dino CADEUL", canvas.width / 2, 110);

    // Panneau d'instructions
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(canvas.width / 2 - 300, 170, 600, 170);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 300, 170, 600, 170);

    // Instructions
    ctx.fillStyle = "#2196F3";
    ctx.font = "bold 24px Arial";
    ctx.fillText(
      "Cliquez ou appuyez sur une touche pour jouer",
      canvas.width / 2,
      200
    );

    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Flèches ou WASD pour bouger", canvas.width / 2, 230);
    ctx.fillText(
      "Espace pour sauter, Shift pour courir plus vite",
      canvas.width / 2,
      260
    );
    ctx.fillText(
      "Collectez les pièces et évitez ou écrasez les ennemis",
      canvas.width / 2,
      290
    );
    ctx.fillText("Attention aux trous!", canvas.width / 2, 320);

    // Dessiner un dino
    drawDino(
      ctx,
      canvas.width / 2 - 20,
      380,
      2,
      true,
      false,
      Date.now(),
      false
    );

    // Message de la CADEUL en bas
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    ctx.fillStyle = "white";
    ctx.font = "italic 16px Arial";
    ctx.fillText(
      "La CADEUL, votre association étudiante depuis 1981",
      canvas.width / 2,
      canvas.height - 15
    );
  };

  // Dessin de l'écran de game over
  const drawGameOverScreen = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const game = gameRef.current;

    // Overlay semi-transparent
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Texte Game Over
    ctx.fillStyle = "white";
    ctx.font = "bold 50px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, 150);

    // Score
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.fillText(`Score: ${game.score}`, canvas.width / 2, 230);

    // Instruction pour recommencer
    ctx.fillStyle = "white";
    ctx.font = "22px Arial";
    ctx.fillText("Appuyez sur Espace pour recommencer", canvas.width / 2, 280);
  };

  // Dessin de l'écran de niveau terminé
  const drawLevelCompleteScreen = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const game = gameRef.current;

    // Overlay semi-transparent
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Texte de niveau terminé
    ctx.fillStyle = "white";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Niveau ${game.level} Terminé!`, canvas.width / 2, 150);

    // Score
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.fillText(`Score: ${game.score}`, canvas.width / 2, 200);

    // Animation du message d'instruction
    const pulseScale = 1 + Math.sin(game.time * 0.1) * 0.1;
    ctx.save();
    ctx.translate(canvas.width / 2, 280);
    ctx.scale(pulseScale, pulseScale);
    ctx.font = "22px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.fillText("Appuyez sur Espace pour continuer", 0, 0);
    ctx.restore();

    // Statistiques supplémentaires
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText(
      `Vies restantes: ${playerRef.current.health}`,
      canvas.width / 2,
      320
    );
    ctx.fillText(
      `Note actuelle: ${playerRef.current.grade}`,
      canvas.width / 2,
      350
    );
  };

  // Fonction pour gérer les dégâts du joueur
  const playerHit = () => {
    const player = playerRef.current;

    player.health--;
    player.invulnerable = 60; // Période d'invulnérabilité

    // Vérifier que la santé n'est pas inférieure à 0
    if (player.health <= 0) {
      player.health = 0; // S'assurer que la santé ne devient pas négative
      player.isDead = true;
      gameOver();
    } else {
      // Effet de recul
      player.velY = -JUMP_FORCE * 0.5;
      player.velX = player.facingRight ? -SPEED * 2 : SPEED * 2;
    }
  };

  // Fonction de fin de jeu
  const gameOver = () => {
    const game = gameRef.current;
    game.active = false;
    game.gameOver = true;

    drawGameOverScreen();
  };

  // Fonction de niveau terminé
  const levelComplete = () => {
    const game = gameRef.current;

    // Vérifier si nous sommes déjà en transition pour éviter les doubles déclenchements
    if (game.showLevelMessage || game.levelComplete) return;

    // Désactiver les entrées du joueur pendant la transition
    game.keys = {};

    // Montrer uniquement le message CADEUL
    game.showLevelMessage = true;

    // Bloquer la mise à jour du jeu pour éviter les interférences
    game.active = false;

    // Après 3 secondes, passer directement au niveau suivant
    setTimeout(() => {
      // Vérifier si le joueur n'a pas quitté le jeu entre-temps
      if (canvasRef.current) {
        nextLevel();
      }
    }, 3000);
  };

  // Afficher le message de fin de niveau
  const drawLevelMessage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const game = gameRef.current;

    // Fond semi-transparent
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cadre bleu pour le message
    ctx.fillStyle = "#1565C0";
    const boxWidth = 700;
    const boxHeight = 120;
    const boxX = (canvas.width - boxWidth) / 2;
    const boxY = (canvas.height - boxHeight) / 2;
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Bordure dorée
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 5;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Message en fonction du niveau
    let message = "";
    switch (game.level) {
      case 1:
        message = "J'ai hâte au Show de la rentrée!";
        break;
      case 2:
        message = "J'ai hâte à l'Oktoberfest!";
        break;
      case 3:
        message = "J'ai hâte aux Jeux interfacultaires!";
        break;
      case 4:
        message = "Les activités de la CADEUL sont incroyables!";
        break;
      case 5:
        message = "Merci à la CADEUL pour ses services!";
        break;
      case 6:
        message = "La CADEUL nous représente depuis 1981!";
        break;
      case 7:
        message = "Je participe aux assemblées générales!";
        break;
      case 8:
        message = "La CADEUL soutient ses étudiants!";
        break;
      case 9:
        message = "Ensemble avec la CADEUL!";
        break;
      case 10:
        message = "Fierté d'être membre de la CADEUL!";
        break;
    }
    // Texte du message
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  };

  // Boucle principale du jeu
  const gameLoop = () => {
    const game = gameRef.current;

    if (!game.active) return;

    // Incrémenter le temps de jeu
    game.time += 1;

    updateGame();
    renderGame();

    if (!game.gameOver && !game.showLevelMessage) {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else if (game.showLevelMessage) {
      // Continuer à afficher le message tout en arrêtant la partie
      renderGame();
    }
  };

  // Mise à jour des ennemis - fonctionnalité pour éviter les trous
  const updateEnemies = () => {
    const enemies = enemiesRef.current;
    const platforms = platformsRef.current;
    const goal = goalRef.current;
    const game = gameRef.current;

    enemies.forEach((enemy) => {
      // Logique de mouvement selon le type d'ennemi
      if (enemy.type === "flyingEnemy") {
        // Mouvement sinusoïdal
        enemy.x += enemy.speed * enemy.direction;
        enemy.y =
          enemy.startY +
          Math.sin(game.time * enemy.frequency) * enemy.amplitude;

        // Changer de direction aux bords de l'écran
        if (enemy.x < 0 || enemy.x > goal.x) {
          enemy.direction *= -1;
        }
      } else if (enemy.type === "slime" || enemy.type === "spike") {
        // Vérifier si l'ennemi va marcher dans un trou - logique améliorée
        let willFallInPit = true;
        let nextX = enemy.x + enemy.speed * enemy.direction;
        let nextXEnd = nextX + enemy.width;

        // Trouver une plateforme de sol sous la future position de l'ennemi
        platforms.forEach((platform) => {
          if (platform.type === "ground") {
            // Vérifier si la prochaine position de l'ennemi sera sur une plateforme
            if (
              nextX + enemy.width * 0.5 >= platform.x &&
              nextX + enemy.width * 0.5 <= platform.x + platform.width
            ) {
              willFallInPit = false;
            }

            // Vérification supplémentaire: si l'ennemi va dépasser le bord
            if (
              (nextX < platform.x && nextXEnd > platform.x) ||
              (nextX < platform.x + platform.width &&
                nextXEnd > platform.x + platform.width)
            ) {
              // Si nous sommes près du bord, changer de direction
              if (
                Math.abs(platform.x - nextX) < enemy.speed * 3 ||
                Math.abs(platform.x + platform.width - nextXEnd) <
                  enemy.speed * 3
              ) {
                willFallInPit = true;
              }
            }
          }
        });

        // Changer de direction si l'ennemi va tomber dans un trou
        if (willFallInPit) {
          enemy.direction *= -1;
          // Ajuster légèrement la position pour éviter de se coincer
          enemy.x += enemy.direction * 2;
        } else {
          // Sinon, avancer normalement
          enemy.x += enemy.speed * enemy.direction;
        }

        // Changer de direction aux bords de l'écran
        if (enemy.x < 0 || enemy.x > goal.x) {
          enemy.direction *= -1;
        }

        // Forcer les ennemis à rester sur le sol
        let isOnGround = false;
        platforms.forEach((platform) => {
          if (
            platform.type === "ground" &&
            enemy.x + enemy.width / 2 >= platform.x &&
            enemy.x + enemy.width / 2 <= platform.x + platform.width
          ) {
            enemy.y = platform.y - enemy.height;
            isOnGround = true;
          }
        });

        // Si l'ennemi n'est pas sur le sol, essayer de le replacer
        if (!isOnGround) {
          // Essayer de trouver la plateforme la plus proche
          let closestPlatform = null;
          let minDistance = Number.MAX_VALUE;

          platforms.forEach((platform) => {
            if (platform.type === "ground") {
              const distance = Math.abs(
                enemy.x + enemy.width / 2 - (platform.x + platform.width / 2)
              );
              if (distance < minDistance) {
                minDistance = distance;
                closestPlatform = platform;
              }
            }
          });

          // Repositionner l'ennemi sur la plateforme la plus proche
          if (closestPlatform) {
            enemy.x =
              closestPlatform.x + closestPlatform.width / 2 - enemy.width / 2;
            enemy.y = closestPlatform.y - enemy.height;
          }
        }
      } else if (enemy.type === "boss") {
        // Mouvement de boss simple
        enemy.x += enemy.speed * enemy.direction;

        // Sauts périodiques
        if (Math.random() < 0.01) {
          enemy.y -= 15;
        }

        // Gravité pour le boss
        if (enemy.y + enemy.height < GROUND_Y) {
          enemy.y += GRAVITY * 2;
        } else {
          enemy.y = GROUND_Y - enemy.height;
        }

        // Vérifier si le boss va tomber dans un trou
        let onSolidGround = false;
        platforms.forEach((platform) => {
          if (
            platform.type === "ground" &&
            enemy.x + enemy.width / 2 >= platform.x &&
            enemy.x + enemy.width / 2 <= platform.x + platform.width
          ) {
            onSolidGround = true;
          }
        });

        // Si le boss va tomber, changer de direction
        if (!onSolidGround) {
          enemy.direction *= -1;
          enemy.x += enemy.direction * 10; // Déplacer plus loin du bord
        }

        // Changer de direction selon la position
        if (enemy.x < goal.x - 500 || enemy.x > goal.x - 100) {
          enemy.direction *= -1;
        }
      }
    });
  };

  // Mise à jour de la logique de jeu
  const updateGame = () => {
    const player = playerRef.current;
    const game = gameRef.current;
    const platforms = platformsRef.current;
    const coins = coinsRef.current;
    const enemies = enemiesRef.current;
    const goal = goalRef.current;
    const keys = game.keys;

    // Réduire le temps d'invulnérabilité
    if (player.invulnerable > 0) {
      player.invulnerable--;
    }

    // Mouvement horizontal
    player.velX = 0;
    // Facteur de vitesse pour mobile
    const mobileSpeedFactor = isMobileRef.current ? 0.4 : 1;
    if ((keys["ArrowLeft"] || keys["KeyA"]) && !player.isDead) {
      player.velX = -SPEED * mobileSpeedFactor;
      player.facingRight = false;
    }
    if ((keys["ArrowRight"] || keys["KeyD"]) && !player.isDead) {
      player.velX = SPEED * mobileSpeedFactor;
      player.facingRight = true;
    }

    // Double-vitesse avec Shift (sauf sur mobile où c'est déjà appliqué)
    if (
      (keys["ShiftLeft"] || keys["ShiftRight"]) &&
      !player.isDead &&
      !isMobileRef.current
    ) {
      player.velX *= 1.5;
    }

    // Boost supplémentaire pour mobile en saut
    if (isMobileRef.current && player.isJumping && !player.isOnGround) {
      // Appliquer un boost horizontal substantiel pendant le saut sur mobile
      player.velX *= 1.7;
    }
    // Mise à jour de la position horizontale
    player.x += player.velX;

    // Empêcher de sortir à gauche de l'écran
    if (player.x < 0) {
      player.x = 0;
    }

    // Saut
    if (
      (keys["ArrowUp"] || keys["KeyW"] || keys["Space"]) &&
      player.isOnGround &&
      !player.isDead
    ) {
      // Augmenter la force de saut de 30% sur mobile
      const jumpBoostFactor = isMobileRef.current ? 1.1 : 1.0;
      player.velY = -JUMP_FORCE * jumpBoostFactor;
      player.isJumping = true;
      player.isOnGround = false;

      // Ajouter une impulsion horizontale supplémentaire sur mobile
      if (isMobileRef.current && player.velX > 0) {
        player.velX += SPEED * 0.8; // Boost horizontal pour atteindre les plateformes
      }

      // Effet sonore de saut (simulé visuellement)
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(
        player.x + player.width / 2 - game.cameraX,
        player.y + player.height,
        20,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    // Super saut avec flèche haut + shift
    if (
      (keys["ArrowUp"] || keys["KeyW"] || keys["Space"]) &&
      (keys["ShiftLeft"] || keys["ShiftRight"]) &&
      player.isOnGround &&
      !player.isDead
    ) {
      player.velY = -JUMP_FORCE * 1.3;
    }

    // Appliquer la gravité (réduite sur mobile pour maintenir le joueur en l'air plus longtemps)
    player.velY += isMobileRef.current ? GRAVITY * 0.7 : GRAVITY;

    // Limiter la vitesse de chute
    player.velY = Math.min(player.velY, 15);

    // Mettre à jour la position verticale
    player.y += player.velY;

    // Réinitialiser le statut au sol
    player.isOnGround = false;

    // Collision avec les plateformes
    let isOnPlatform = false;
    let currentPlatform = null;

    platforms.forEach((platform) => {
      // Vérifier si le joueur atterrit sur une plateforme
      // Ignorer les plateformes qui s'écroulent
      if (
        !platform.isCollapsing &&
        player.x + player.width * 0.3 < platform.x + platform.width &&
        player.x + player.width * 0.7 > platform.x &&
        player.y + player.height > platform.y &&
        player.y + player.height < platform.y + platform.height + player.velY &&
        player.velY > 0
      ) {
        player.y = platform.y - player.height;
        player.velY = 0;
        player.isOnGround = true;
        player.isJumping = false;
        isOnPlatform = true;
        currentPlatform = platform;

        // Marquer la plateforme comme ayant le joueur dessus
        if (platform.type === "platform" && platform.canCollapse) {
          platform.playerStanding = true;
        }
      }
    });

    // Gérer les plateformes qui s'écroulent
    platforms.forEach((platform) => {
      if (platform.type === "platform" && platform.canCollapse) {
        if (platform.isCollapsing) {
          // Faire tomber la plateforme rapidement
          platform.y += 20; // Beaucoup plus rapide qu'avant

          // Cacher la plateforme quand elle est hors écran
          if (platform.y > GROUND_Y + 200) {
            platform.y = 2000; // Hors écran mais pas supprimée
          }
        } else if (platform.playerStanding) {
          // Décrémenter le timer
          platform.collapseTimer--;

          // Si le timer atteint zéro, marquer la plateforme comme s'écroulant
          if (platform.collapseTimer <= 0) {
            platform.isCollapsing = true;
          }
        } else {
          // Réinitialiser progressivement le timer si le joueur n'est pas sur la plateforme
          if (platform.collapseTimer < platform.maxTimer) {
            platform.collapseTimer += 2;
            platform.collapseTimer = Math.min(
              platform.collapseTimer,
              platform.maxTimer
            );
          }
        }
      }
    });

    // Contact avec le sol (s'il n'y a pas de plateforme)
    if (player.y + player.height > GROUND_Y && !isOnPlatform) {
      // Vérifier si on est au-dessus d'une section avec un trou
      let isAboveHole = true;

      platforms.forEach((platform) => {
        if (
          platform.type === "ground" &&
          player.x + player.width * 0.3 < platform.x + platform.width &&
          player.x + player.width * 0.7 > platform.x
        ) {
          isAboveHole = false;
        }
      });

      if (!isAboveHole) {
        player.y = GROUND_Y - player.height;
        player.velY = 0;
        player.isOnGround = true;
        player.isJumping = false;
      }
    }

    // Vérifier si le joueur est tombé trop bas (dans un trou)
    if (player.y > GROUND_Y + 150 && !player.isDead) {
      player.isDead = true;

      // Baisser la note quand on tombe
      const grades = [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "D-",
        "F",
      ];
      const currentGradeIndex = grades.indexOf(player.grade);

      if (currentGradeIndex < grades.length - 1) {
        player.grade = grades[currentGradeIndex + 1];
      }

      if (player.grade === "F") {
        gameOver();
      } else {
        // Message pour indiquer la perte d'une vie
        setTimeout(() => {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");

          // Afficher un message temporaire
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = "#FF5252";
          ctx.font = "bold 30px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            "Vous êtes tombé dans un trou!",
            canvas.width / 2,
            canvas.height / 2 - 20
          );

          ctx.fillStyle = "white";
          ctx.font = "22px Arial";
          ctx.fillText(
            `Votre note: ${player.grade}`,
            canvas.width / 2,
            canvas.height / 2 + 20
          );
          ctx.fillText(
            "Retour au début du niveau...",
            canvas.width / 2,
            canvas.height / 2 + 60
          );

          // Réinitialiser après un court délai
          setTimeout(() => {
            resetPlayerAfterFall();
          }, 1500);
        }, 500);
      }
    }

    // Mise à jour de la caméra
    if (player.x > GAME_WIDTH / 3) {
      game.cameraX = player.x - GAME_WIDTH / 3;
    }

    // Collecte des pièces
    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];

      if (!coin.collected) {
        const dx = player.x + player.width / 2 - coin.x;
        const dy = player.y + player.height / 2 - coin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.width / 2 + coin.radius) {
          coin.collected = true;
          game.score += 10;

          // Effet visuel de collecte
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          const x = coin.x - game.cameraX;
          const y = coin.y;

          // Particules plus élaborées
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const distance = 15 + Math.random() * 10;
            const particleSize = 2 + Math.random() * 3;

            // Dégradé pour les particules
            const gradient = ctx.createRadialGradient(
              x + Math.cos(angle) * distance,
              y + Math.sin(angle) * distance,
              0,
              x + Math.cos(angle) * distance,
              y + Math.sin(angle) * distance,
              particleSize * 2
            );
            gradient.addColorStop(0, "#FFD700");
            gradient.addColorStop(1, "rgba(255, 215, 0, 0)");

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(
              x + Math.cos(angle) * distance,
              y + Math.sin(angle) * distance,
              particleSize,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }

          // Afficher le score gagné avec un effet de fondu
          const scoreGainY = y - 20;
          const fadeInOut = Math.sin(((game.time % 20) / 20) * Math.PI);
          ctx.fillStyle = `rgba(76, 175, 80, ${0.8 + fadeInOut * 0.2})`;
          ctx.font = "bold 16px Arial";
          ctx.textAlign = "center";
          ctx.fillText("+10", x, scoreGainY);

          // Effet de lueur autour du joueur au lieu de le grossir
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = "#FFD700";
          ctx.beginPath();
          ctx.arc(
            player.x + player.width / 2 - game.cameraX,
            player.y + player.height / 2,
            player.width * 0.8,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();

          // Son visuel (onde de choc)
          ctx.beginPath();
          ctx.arc(
            player.x + player.width / 2 - game.cameraX,
            player.y + player.height / 2,
            40,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    }

    // Mise à jour des ennemis - appel à la nouvelle fonction
    updateEnemies();

    // Collision avec les ennemis
    enemies.forEach((enemy) => {
      // Collision avec le joueur
      if (
        player.x + player.width * 0.7 > enemy.x + enemy.width * 0.3 &&
        player.x + player.width * 0.3 < enemy.x + enemy.width * 0.7 &&
        player.y + player.height > enemy.y + enemy.height * 0.2 &&
        player.y < enemy.y + enemy.height * 0.8 &&
        !player.isDead &&
        player.invulnerable <= 0
      ) {
        // Vérifier si le joueur saute sur l'ennemi
        if (
          player.velY > 0 &&
          player.y + player.height < enemy.y + enemy.height / 2
        ) {
          // Rebond sur l'ennemi
          player.velY = -JUMP_FORCE * 0.7;

          // Gagner des points
          game.score += 50;

          // Gestion des boss
          if (enemy.type === "boss") {
            enemy.health--;

            if (enemy.health <= 0) {
              // Enlever le boss
              const index = enemies.indexOf(enemy);
              if (index > -1) {
                enemies.splice(index, 1);
              }
              game.score += 500;

              // Si c'est le boss final, rendre le drapeau visible
              if (enemy.isFinalBoss) {
                goalRef.current.visible = true;

                // Effet visuel pour montrer l'apparition du drapeau
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");

                // Créer un flash lumineux à l'emplacement du drapeau
                ctx.save();
                ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                ctx.beginPath();
                ctx.arc(
                  goalRef.current.x + goalRef.current.width / 2 - game.cameraX,
                  goalRef.current.y + goalRef.current.height / 2,
                  100,
                  0,
                  Math.PI * 2
                );
                ctx.fill();
                ctx.restore();
              }
            }
          } else if (enemy.type !== "spike") {
            // Les pics ne peuvent pas être éliminés
            // Enlever l'ennemi
            const index = enemies.indexOf(enemy);
            if (index > -1) {
              enemies.splice(index, 1);
            }
          }
        } else {
          // Le joueur est touché
          playerHit();
        }
      }
    });

    // Vérifier si le joueur a atteint l'objectif
    if (
      player.x + player.width * 0.7 > goal.x &&
      player.x + player.width * 0.3 < goal.x + goal.width &&
      player.y + player.height > goal.y &&
      player.y < goal.y + goal.height
    ) {
      levelComplete();
    }
  };

  // Réinitialisation du joueur après une chute
  const resetPlayerAfterFall = () => {
    const player = playerRef.current;
    const game = gameRef.current;

    // Ramener le joueur au début du niveau
    player.x = 100;
    player.y = 200;
    player.velX = 0;
    player.velY = 0;
    player.isJumping = false;
    player.isOnGround = false;
    player.isDead = false;
    player.invulnerable = 60; // Période d'invulnérabilité

    // S'assurer que le joueur a toujours au moins 1 vie après une chute
    if (player.health <= 0) {
      player.health = 1;
    }

    // Réinitialiser la caméra aussi pour suivre le joueur
    game.cameraX = 0;

    // Régénérer complètement le niveau actuel pour réinitialiser toutes les plateformes
    generateLevel(game.level);
  };
  // Rendu du jeu
  const renderGame = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const player = playerRef.current;
    const game = gameRef.current;
    const platforms = platformsRef.current;
    const coins = coinsRef.current;
    const enemies = enemiesRef.current;
    const goal = goalRef.current;

    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sauvegarder le contexte pour la caméra
    ctx.save();

    // Appliquer la transformation de la caméra
    ctx.translate(-game.cameraX, 0);

    // Dessiner le ciel (avec dégradé selon le niveau et time of day)
    const skyX = game.cameraX;
    const timePhase = (Math.sin(game.time * 0.0005) + 1) / 2; // Cycle jour/nuit très lent
    const gradient = ctx.createLinearGradient(skyX, 0, skyX, canvas.height);

    if (game.level === 1) {
      // Ciel bleu qui change légèrement avec le temps - couleurs plus riches
      gradient.addColorStop(
        0,
        `hsl(210, ${80 - timePhase * 20}%, ${60 + timePhase * 20}%)`
      );
      gradient.addColorStop(0.4, `hsl(205, 85%, ${65 + timePhase * 15}%)`);
      gradient.addColorStop(1, `hsl(200, 80%, ${70 + timePhase * 10}%)`);

      // Soleil ou lune avec halo plus élaboré
      const celestialX = skyX + canvas.width * 0.8;
      const celestialY = 70 + timePhase * 20;

      // Effet de halo extérieur
      const outerGlow = ctx.createRadialGradient(
        celestialX,
        celestialY,
        25,
        celestialX,
        celestialY,
        80
      );

      if (timePhase > 0.5) {
        // Soleil
        outerGlow.addColorStop(0, "rgba(255, 230, 100, 0.3)");
        outerGlow.addColorStop(0.5, "rgba(255, 200, 70, 0.1)");
        outerGlow.addColorStop(1, "rgba(255, 180, 50, 0)");
      } else {
        // Lune
        outerGlow.addColorStop(0, "rgba(200, 220, 255, 0.2)");
        outerGlow.addColorStop(0.5, "rgba(180, 210, 255, 0.08)");
        outerGlow.addColorStop(1, "rgba(160, 200, 255, 0)");
      }

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(celestialX, celestialY, 80, 0, Math.PI * 2);
      ctx.fill();

      // Halo intérieur
      const innerGlow = ctx.createRadialGradient(
        celestialX,
        celestialY,
        0,
        celestialX,
        celestialY,
        40
      );

      if (timePhase > 0.5) {
        // Soleil
        innerGlow.addColorStop(0, "#FFFFA0");
        innerGlow.addColorStop(0.7, "#FFD54F");
        innerGlow.addColorStop(1, "#FFC107");
      } else {
        // Lune
        innerGlow.addColorStop(0, "#F5F5F5");
        innerGlow.addColorStop(0.7, "#E1F5FE");
        innerGlow.addColorStop(1, "#B3E5FC");
      }

      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.arc(celestialX, celestialY, 25, 0, Math.PI * 2);
      ctx.fill();

      // Détails sur la lune si c'est la nuit
      if (timePhase <= 0.5) {
        ctx.fillStyle = "rgba(200, 210, 220, 0.15)";
        // Quelques cratères
        for (let i = 0; i < 5; i++) {
          const craterX = celestialX + (Math.random() * 30 - 15);
          const craterY = celestialY + (Math.random() * 30 - 15);
          const craterSize = 2 + Math.random() * 4;
          ctx.beginPath();
          ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (game.level === 2) {
      // Coucher de soleil plus riche
      gradient.addColorStop(0, "#1E88E5"); // Bleu en haut
      gradient.addColorStop(0.3, "#FF9800"); // Orange
      gradient.addColorStop(0.6, "#FF6F00"); // Orange foncé
      gradient.addColorStop(0.8, "#FB8C00"); // Orange clair
      gradient.addColorStop(1, "#FFAB91"); // Rose

      // Ajouter un soleil couchant
      const sunX = skyX + canvas.width * 0.7;
      const sunY = GROUND_Y - 30;

      // Grand halo
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 100);
      sunGlow.addColorStop(0, "rgba(255, 160, 0, 0.5)");
      sunGlow.addColorStop(0.5, "rgba(255, 120, 0, 0.2)");
      sunGlow.addColorStop(1, "rgba(255, 100, 0, 0)");

      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 100, 0, Math.PI * 2);
      ctx.fill();

      // Soleil
      const sunBody = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 40);
      sunBody.addColorStop(0, "#FFCC80");
      sunBody.addColorStop(0.7, "#FF9800");
      sunBody.addColorStop(1, "#FB8C00");

      ctx.fillStyle = sunBody;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 40, 0, Math.PI);
      ctx.fill();
    } else {
      // Nuit étoilée améliorée
      gradient.addColorStop(0, "#0D173C"); // Bleu très foncé
      gradient.addColorStop(0.4, "#0D47A1"); // Bleu foncé
      gradient.addColorStop(0.8, "#1A237E"); // Indigo
      gradient.addColorStop(1, "#311B92"); // Violet foncé

      // Brume étoilée (nebula effect)
      for (let i = 0; i < 3; i++) {
        const nebulaX = (skyX + i * 600) % 5000;
        const nebulaY = 50 + i * 30;

        if (nebulaX > skyX - 300 && nebulaX < skyX + canvas.width + 300) {
          const nebulaGradient = ctx.createRadialGradient(
            nebulaX,
            nebulaY,
            0,
            nebulaX,
            nebulaY,
            150
          );

          // Couleurs de nébuleuse aléatoires
          const hue = [240, 280, 320, 190][i % 4];
          nebulaGradient.addColorStop(0, `hsla(${hue}, 70%, 40%, 0.2)`);
          nebulaGradient.addColorStop(0.5, `hsla(${hue}, 60%, 30%, 0.1)`);
          nebulaGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

          ctx.fillStyle = nebulaGradient;
          ctx.beginPath();
          ctx.ellipse(nebulaX, nebulaY, 250, 150, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ajouter des étoiles améliorées
      for (let i = 0; i < 70; i++) {
        const starX = (skyX + i * 87) % 5000;
        const starY = (i * 57) % 150;
        const starSize = (i % 3) + 1;
        const twinkle = Math.sin(game.time * 0.01 + i) * 0.5 + 0.5;

        if (starX > skyX - 50 && starX < skyX + canvas.width + 50) {
          // Étoiles avec lueur
          const starGlow = ctx.createRadialGradient(
            starX,
            starY,
            0,
            starX,
            starY,
            starSize * 3
          );
          starGlow.addColorStop(
            0,
            `rgba(255, 255, 255, ${0.7 + twinkle * 0.3})`
          );
          starGlow.addColorStop(0.5, `rgba(200, 220, 255, ${0.3 * twinkle})`);
          starGlow.addColorStop(1, "rgba(150, 200, 255, 0)");

          ctx.fillStyle = starGlow;
          ctx.beginPath();
          ctx.arc(starX, starY, starSize * 3, 0, Math.PI * 2);
          ctx.fill();

          // Étoile centrale
          ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + twinkle * 0.2})`;
          ctx.beginPath();
          ctx.arc(starX, starY, starSize, 0, Math.PI * 2);
          ctx.fill();

          // Quelques étoiles filantes occasionnelles
          if (Math.random() < 0.001) {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(starX, starY);
            ctx.lineTo(starX + 30, starY + 30);
            ctx.stroke();
          }
        }
      }
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(skyX, 0, canvas.width, canvas.height);

    // Dessiner des nuages décoratifs
    drawClouds(ctx, game.cameraX, game.time);

    // Dessiner des montagnes en arrière-plan
    drawMountains(ctx, game.cameraX);

    // Dessiner les trous avec une bande violette qui couvre tout le niveau
    ctx.save(); // Sauvegarder le contexte avant de modifier l'opacité

    // S'assurer que l'opacité est bien à 1 (opaque)
    ctx.globalAlpha = 1.0;

    // Calculer la longueur totale du niveau
    const levelLength = Math.max(goalRef.current.x + 10000, 10000);

    // Dessiner une bande violette pour les trous qui couvre tout le niveau
    ctx.fillStyle = " #2196F3"; // Violet pour les trous
    ctx.fillRect(0 - game.cameraX, GROUND_Y, levelLength, 200);

    ctx.restore(); // Restaurer le contexte

    // Dessiner les plateformes
    platforms.forEach((platform) => {
      const platformX = platform.x;

      // N'afficher que les plateformes visibles à l'écran
      if (
        platformX + platform.width > game.cameraX &&
        platformX < game.cameraX + canvas.width
      ) {
        if (platform.type === "ground") {
          // Sol avec dégradé et coins arrondis
          const groundGradient = ctx.createLinearGradient(
            platformX,
            platform.y,
            platformX,
            platform.y + platform.height
          );
          groundGradient.addColorStop(0, "#8BC34A");
          groundGradient.addColorStop(1, "#689F38");
          ctx.fillStyle = groundGradient;

          // Dessiner un rectangle avec coins arrondis pour le sol
          const radius = 15; // Rayon des coins arrondis
          ctx.beginPath();
          ctx.moveTo(platformX + radius, platform.y);
          ctx.lineTo(platformX + platform.width - radius, platform.y);
          ctx.quadraticCurveTo(
            platformX + platform.width,
            platform.y,
            platformX + platform.width,
            platform.y + radius
          );
          ctx.lineTo(platformX + platform.width, platform.y + platform.height);
          ctx.lineTo(platformX, platform.y + platform.height);
          ctx.lineTo(platformX, platform.y + radius);
          ctx.quadraticCurveTo(
            platformX,
            platform.y,
            platformX + radius,
            platform.y
          );
          ctx.closePath();
          ctx.fill();

          // Dessiner une texture d'herbe en haut avec arrondi
          ctx.fillStyle = "#9CCC65";
          ctx.beginPath();
          ctx.moveTo(platformX + radius, platform.y);
          ctx.lineTo(platformX + platform.width - radius, platform.y);
          ctx.quadraticCurveTo(
            platformX + platform.width,
            platform.y,
            platformX + platform.width,
            platform.y + 10
          );
          ctx.lineTo(platformX, platform.y + 10);
          ctx.lineTo(platformX, platform.y + radius);
          ctx.quadraticCurveTo(
            platformX,
            platform.y,
            platformX + radius,
            platform.y
          );
          ctx.closePath();
          ctx.fill();

          // Ajouter quelques détails à l'herbe
          ctx.fillStyle = "#7CB342";
          for (let i = 0; i < platform.width; i += 20) {
            const grassHeight = 5 + Math.random() * 8;
            ctx.fillRect(
              platformX + i + Math.random() * 10,
              platform.y - grassHeight,
              3,
              grassHeight
            );
          }
        } else {
          // Plateformes en bois avec coins arrondis
          const radius = 10; // Rayon des coins arrondis pour les plateformes

          // Appliquer l'opacité pour les plateformes qui s'écroulent
          const opacity =
            platform.opacity !== undefined ? platform.opacity : 1.0;

          // Position X modifiée pour l'effet de secousse si la plateforme va s'écrouler
          let shakeX = platformX;

          // Couleur de la plateforme basée sur son état
          let platformColor = "#A1887F"; // Couleur standard

          if (platform.canCollapse && platform.playerStanding) {
            // Calculer le ratio du temps restant
            const timeRatio = platform.collapseTimer / platform.maxTimer;

            // Changer la couleur en fonction du temps restant
            if (timeRatio < 0.3) {
              platformColor = "#FF5252"; // Rouge quand presque écroulé

              // Ajouter un effet de secousse
              if (Math.sin(game.time * 0.5) > 0) {
                shakeX += Math.sin(game.time * 0.8) * 2;
              }
            } else if (timeRatio < 0.6) {
              platformColor = "#FFA726"; // Orange pour avertissement
            }
          }

          // Appliquer l'opacité
          ctx.globalAlpha = opacity;
          ctx.fillStyle = platformColor;

          // Dessiner un rectangle arrondi
          ctx.beginPath();
          ctx.moveTo(shakeX + radius, platform.y);
          ctx.lineTo(shakeX + platform.width - radius, platform.y);
          ctx.quadraticCurveTo(
            shakeX + platform.width,
            platform.y,
            shakeX + platform.width,
            platform.y + radius
          );
          ctx.lineTo(
            shakeX + platform.width,
            platform.y + platform.height - radius
          );
          ctx.quadraticCurveTo(
            shakeX + platform.width,
            platform.y + platform.height,
            shakeX + platform.width - radius,
            platform.y + platform.height
          );
          ctx.lineTo(shakeX + radius, platform.y + platform.height);
          ctx.quadraticCurveTo(
            shakeX,
            platform.y + platform.height,
            shakeX,
            platform.y + platform.height - radius
          );
          ctx.lineTo(shakeX, platform.y + radius);
          ctx.quadraticCurveTo(shakeX, platform.y, shakeX + radius, platform.y);
          ctx.closePath();
          ctx.fill();

          // Réinitialiser l'opacité
          ctx.globalAlpha = 1.0;

          // Détails de la plateforme
          ctx.fillStyle = "#8D6E63";
          for (let i = 0; i < platform.width; i += 20) {
            const detailX = shakeX + i;
            if (
              detailX >= shakeX + radius &&
              detailX <= shakeX + platform.width - radius - 10
            ) {
              ctx.fillRect(detailX, platform.y + 2, 10, 5);
            }
          }
        }
      }
    });
    // Dessiner les pièces avec animation
    coins.forEach((coin) => {
      if (!coin.collected) {
        const coinX = coin.x;
        const coinY = coin.y + Math.sin(game.time * 0.05) * 5; // Animation de flottement

        // N'afficher que les pièces visibles à l'écran
        if (
          coinX + coin.radius > game.cameraX &&
          coinX - coin.radius < game.cameraX + canvas.width
        ) {
          // Corps de la pièce
          ctx.fillStyle = "#FFD700";
          ctx.beginPath();
          ctx.arc(coinX, coinY, coin.radius, 0, Math.PI * 2);
          ctx.fill();

          // Brillance
          ctx.fillStyle = "#FFC107";
          ctx.beginPath();
          ctx.arc(coinX, coinY, coin.radius * 0.7, 0, Math.PI * 2);
          ctx.fill();

          // Contour
          ctx.strokeStyle = "#FFA000";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(coinX, coinY, coin.radius, 0, Math.PI * 2);
          ctx.stroke();

          // Ajout du "C" dans le style CADEUL (bleu pâle)
          ctx.fillStyle = "#64B5F6"; // Bleu pâle
          ctx.font = `bold ${Math.floor(coin.radius * 1.2)}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("C", coinX, coinY);

          // Reflet sur le C
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.font = `bold ${Math.floor(coin.radius * 0.8)}px Arial`;
          ctx.fillText(
            "c",
            coinX - coin.radius * 0.3,
            coinY - coin.radius * 0.3
          );
        }
      }
    });

    // Dessiner les ennemis
    enemies.forEach((enemy) => {
      const enemyX = enemy.x;

      // N'afficher que les ennemis visibles à l'écran
      if (
        enemyX + enemy.width > game.cameraX &&
        enemyX < game.cameraX + canvas.width
      ) {
        if (enemy.type === "slime") {
          drawSlime(
            ctx,
            enemyX,
            enemy.y,
            enemy.width,
            enemy.height,
            enemy.direction,
            game.time
          );
        } else if (enemy.type === "spike") {
          drawSpike(ctx, enemyX, enemy.y, enemy.width, enemy.height, game.time);
        } else if (enemy.type === "flyingEnemy") {
          drawBird(
            ctx,
            enemyX,
            enemy.y,
            enemy.width,
            enemy.height,
            enemy.direction,
            game.time
          );
        } else if (enemy.type === "boss") {
          drawBoss(
            ctx,
            enemyX,
            enemy.y,
            enemy.width,
            enemy.height,
            enemy.direction,
            enemy.health,
            enemy.maxHealth,
            game.time
          );
        }
      }
    });

    // Dessiner l'objectif (drapeau)
    const goalX = goal.x;
    if (
      goalX + goal.width > game.cameraX &&
      goalX < game.cameraX + canvas.width &&
      (game.level !== 3 || goal.visible) // Condition de visibilité pour le niveau 3
    ) {
      drawFlag(ctx, goalX, goal.y, goal.width, goal.height, game.time);
    }
    // Dessiner le joueur
    if (!player.isDead) {
      drawDino(
        ctx,
        player.x,
        player.y,
        1,
        player.facingRight,
        player.isJumping,
        game.time,
        player.invulnerable > 0
      );
    }

    // Restaurer le contexte de la caméra
    ctx.restore();

    // Afficher le score et la vie (UI fixe)
    drawUI(ctx, game, player);

    // Afficher le message de fin de niveau si nécessaire
    if (game.showLevelMessage) {
      drawLevelMessage();
    }
  };

  // Dessiner des nuages décoratifs
  const drawClouds = (ctx, cameraX, time = 0) => {
    // Facteur de parallaxe
    const parallaxFactor = 0.2;

    // Nombre de nuages à dessiner
    const numClouds = 20;

    // Distance entre chaque nuage (en moyenne)
    const cloudSpacing = 400;

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

    for (let i = 0; i < numClouds; i++) {
      // Détermination de la position X absolue du nuage (constante au fil du temps)
      const absoluteX = i * cloudSpacing;

      // Position relative à l'écran (avec parallaxe)
      const relativeX = absoluteX - cameraX * parallaxFactor;

      // Utiliser le modulo pour créer un effet de répétition infinie
      const screenX = relativeX % (numClouds * cloudSpacing);

      // Position Y du nuage, déterminée par son index (stable)
      const baseY = 50 + (i % 5) * 30;

      // Animation de flottement basée sur le temps
      const floatOffset = Math.sin(time * 0.05 + i) * 5;
      const y = baseY + floatOffset;

      // Dessiner le nuage
      const size = 50 + (i % 4) * 10; // Taille variée pour chaque nuage

      ctx.beginPath();
      ctx.arc(screenX, y, size / 2, 0, Math.PI * 2);
      ctx.arc(screenX + size * 0.4, y - size * 0.1, size / 3, 0, Math.PI * 2);
      ctx.arc(screenX + size * 0.7, y, size / 2.5, 0, Math.PI * 2);
      ctx.arc(screenX + size * 0.4, y + size * 0.1, size / 3, 0, Math.PI * 2);
      ctx.fill();

      // Dessiner un second ensemble de nuages pour garantir la couverture complète
      const offsetX = screenX + numClouds * cloudSpacing;
      if (offsetX < GAME_WIDTH) {
        ctx.beginPath();
        ctx.arc(offsetX, y, size / 2, 0, Math.PI * 2);
        ctx.arc(offsetX + size * 0.4, y - size * 0.1, size / 3, 0, Math.PI * 2);
        ctx.arc(offsetX + size * 0.7, y, size / 2.5, 0, Math.PI * 2);
        ctx.arc(offsetX + size * 0.4, y + size * 0.1, size / 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Dessiner des montagnes en arrière-plan avec effet 3D amélioré
  const drawMountains = (ctx, cameraX) => {
    // Facteur de parallaxe
    const parallaxFactor = 0.3;

    // Nombre de montagnes à dessiner
    const numMountains = 15;

    // Distance entre chaque montagne
    const mountainSpacing = 350;

    // Palettes de couleurs pour les montagnes - variation plus riche
    const mountainColors = [
      ["#546E7A", "#455A64", "#37474F"], // Bleu-gris
      ["#5D4037", "#4E342E", "#3E2723"], // Brun
      ["#2E7D32", "#1B5E20", "#0A3D11"], // Vert foncé
    ];

    // Dessiner trois plans de montagnes avec différentes distances
    for (let plan = 0; plan < 3; plan++) {
      // Facteur de parallaxe ajusté par plan
      const adjustedParallax = parallaxFactor * (1 - plan * 0.2);
      // Taille ajustée selon le plan
      const sizeMultiplier = 1 - plan * 0.25;

      const palette = mountainColors[plan % mountainColors.length];

      for (let i = 0; i < numMountains; i++) {
        // Détermination de la position X absolue de la montagne
        const absoluteX = i * mountainSpacing * sizeMultiplier;

        // Position relative à l'écran (avec parallaxe)
        const relativeX = absoluteX - cameraX * adjustedParallax;

        // Modulo pour créer une boucle infinie
        const screenX =
          relativeX % (numMountains * mountainSpacing * sizeMultiplier);

        // Caractéristiques de la montagne basées sur son index
        const baseHeight = 150 + (i % 3) * 30;
        const height = baseHeight * sizeMultiplier;
        const width = (300 + (i % 4) * 50) * sizeMultiplier;
        const colorIndex = i % palette.length;

        // IMPORTANT: Toutes les montagnes commencent au même niveau GROUND_Y
        const mountainY = GROUND_Y;

        // Dessiner la montagne avec effet 3D
        ctx.fillStyle = palette[colorIndex];
        ctx.beginPath();
        ctx.moveTo(screenX, mountainY);

        // Pic principal
        ctx.lineTo(screenX + width / 2, mountainY - height);

        // Ajouter quelques pics secondaires pour plus de réalisme
        const peakCount = 3 + (i % 3);
        for (let p = 1; p <= peakCount; p++) {
          const peakX =
            screenX + width / 2 + (width / 2) * (p / (peakCount + 1));
          const peakHeight = height * (0.6 - 0.1 * p + Math.sin(i * p) * 0.15);
          ctx.lineTo(peakX, mountainY - peakHeight);
        }

        ctx.lineTo(screenX + width, mountainY);
        ctx.closePath();
        ctx.fill();

        // Ajouter des ombres pour effet 3D
        const gradient = ctx.createLinearGradient(
          screenX,
          mountainY,
          screenX + width / 2,
          mountainY - height
        );
        gradient.addColorStop(0, "rgba(0,0,0,0.3)");
        gradient.addColorStop(0.5, "rgba(255,255,255,0.1)");
        gradient.addColorStop(1, "rgba(0,0,0,0.5)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(screenX, mountainY);
        ctx.lineTo(screenX + width / 2, mountainY - height);
        ctx.lineTo(screenX + width / 4, mountainY - height / 2);
        ctx.closePath();
        ctx.fill();

        // Neige sur les sommets (pour certaines montagnes)
        if (i % 3 === 0 && plan === 0) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.beginPath();
          ctx.moveTo(
            screenX + width / 2 - width * 0.1,
            mountainY - height * 0.9
          );
          ctx.lineTo(screenX + width / 2, mountainY - height);
          ctx.lineTo(
            screenX + width / 2 + width * 0.1,
            mountainY - height * 0.9
          );
          ctx.closePath();
          ctx.fill();
        }

        // Dessiner un second ensemble de montagnes pour garantir la couverture complète
        const offsetX =
          screenX + numMountains * mountainSpacing * sizeMultiplier;
        if (offsetX < GAME_WIDTH) {
          // Répéter le même code pour la montagne décalée
          ctx.fillStyle = palette[colorIndex];
          ctx.beginPath();
          ctx.moveTo(offsetX, mountainY);
          ctx.lineTo(offsetX + width / 2, mountainY - height);

          // Pics secondaires pour la montagne décalée également
          for (let p = 1; p <= peakCount; p++) {
            const peakX =
              offsetX + width / 2 + (width / 2) * (p / (peakCount + 1));
            const peakHeight =
              height * (0.6 - 0.1 * p + Math.sin(i * p) * 0.15);
            ctx.lineTo(peakX, mountainY - peakHeight);
          }

          ctx.lineTo(offsetX + width, mountainY);
          ctx.closePath();
          ctx.fill();

          // Ombres pour l'effet 3D
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(offsetX, mountainY);
          ctx.lineTo(offsetX + width / 2, mountainY - height);
          ctx.lineTo(offsetX + width / 4, mountainY - height / 2);
          ctx.closePath();
          ctx.fill();

          // Neige sur les sommets (pour certaines montagnes)
          if (i % 3 === 0 && plan === 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.beginPath();
            ctx.moveTo(
              offsetX + width / 2 - width * 0.1,
              mountainY - height * 0.9
            );
            ctx.lineTo(offsetX + width / 2, mountainY - height);
            ctx.lineTo(
              offsetX + width / 2 + width * 0.1,
              mountainY - height * 0.9
            );
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
  };
  // Fonctions de dessin

  // Dessiner le dinosaure
  const drawDino = (
    ctx,
    x,
    y,
    scale = 1,
    facingRight = true,
    isJumping = false,
    time = 0,
    isFlashing = false
  ) => {
    // Ne pas dessiner si clignotement d'invulnérabilité
    if (isFlashing && Math.floor(time * 0.2) % 2 === 0) {
      return;
    }

    const width = playerRef.current.width * scale;
    const height = playerRef.current.height * scale;

    // Sauvegarder le contexte
    ctx.save();

    // Appliquer la transformation pour l'orientation
    ctx.translate(x + width / 2, y + height / 2);
    ctx.scale(facingRight ? 1 : -1, 1);
    ctx.translate(-(x + width / 2), -(y + height / 2));

    // Vitesse de l'animation selon la vélocité
    const animSpeed = (Math.abs(playerRef.current.velX) / SPEED) * 0.15 + 0.05;

    // Animation de course avancée
    const legPhase = isJumping ? 0 : Math.sin(time * animSpeed) * 0.5;
    const bounceHeight = isJumping
      ? 0
      : Math.abs(Math.sin(time * animSpeed)) * 3;

    // Ombre sous le dino
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.5,
      y + height * 0.95,
      width * 0.3,
      height * 0.1,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Couleur de base avec gradient (bleu)
    const bodyGradient = ctx.createLinearGradient(x, y, x + width, y + height);
    bodyGradient.addColorStop(0, "#2196F3");
    bodyGradient.addColorStop(1, "#1565C0");

    // Effet de flash pour l'invulnérabilité
    const dinoColor = isFlashing ? "#64B5F6" : bodyGradient;
    const darkDinoColor = isFlashing ? "#42A5F5" : "#1565C0";

    // Corps
    ctx.fillStyle = dinoColor;
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.5,
      y + height * 0.6 - bounceHeight,
      width * 0.4,
      height * 0.35,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Reflet sur le corps
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.4,
      y + height * 0.5 - bounceHeight,
      width * 0.2,
      height * 0.15,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Tête
    ctx.fillStyle = dinoColor;
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.7,
      y + height * 0.25 - bounceHeight * 0.7,
      width * 0.25,
      height * 0.2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Œil
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(
      x + width * 0.8,
      y + height * 0.2 - bounceHeight * 0.7,
      width * 0.06,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Pupille (avec mouvement)
    const lookDir = facingRight ? 1 : -1;
    const blinkPhase = Math.sin(time * 0.1 + 1) > 0.95 ? 0.1 : 1;

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.ellipse(
      x + width * (0.82 + lookDir * 0.01),
      y + height * 0.2 - bounceHeight * 0.7,
      width * 0.03,
      width * 0.03 * blinkPhase,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Reflet dans l'œil
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(
      x + width * 0.78,
      y + height * 0.18 - bounceHeight * 0.7,
      width * 0.02,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Museau
    ctx.fillStyle = darkDinoColor;
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.9,
      y + height * 0.3 - bounceHeight * 0.5,
      width * 0.1,
      height * 0.08,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Narines
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.95,
      y + height * 0.28 - bounceHeight * 0.5,
      width * 0.02,
      height * 0.02,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Crête avec animation
    for (let i = 0; i < 3; i++) {
      const spikePhase = Math.sin(time * 0.05 + i) * 2;

      ctx.fillStyle = darkDinoColor;
      ctx.beginPath();
      ctx.moveTo(x + width * (0.55 - i * 0.1), y + height * 0.05 - spikePhase);
      ctx.lineTo(x + width * (0.65 - i * 0.1), y - height * 0.05 - spikePhase);
      ctx.lineTo(x + width * (0.75 - i * 0.1), y + height * 0.05 - spikePhase);
      ctx.closePath();
      ctx.fill();
    }

    // Pattes avant avec animation améliorée
    const runningSpeed = Math.abs(playerRef.current.velX) / SPEED;
    const legOffset = legPhase * 10 * (isJumping ? 0.5 : runningSpeed);

    ctx.fillStyle = darkDinoColor;
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.35,
      y + height * 0.8 + legOffset,
      width * 0.1,
      height * 0.15,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Pattes arrière
    ctx.fillStyle = darkDinoColor;
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.25,
      y + height * 0.85 - legOffset,
      width * 0.15,
      height * 0.1,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Queue avec animation
    const tailWag = Math.sin(time * 0.1) * 0.2;

    ctx.fillStyle = darkDinoColor;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + height * 0.5);
    ctx.quadraticCurveTo(
      x - width * 0.1,
      y + height * (0.4 + tailWag),
      x + width * 0.1,
      y + height * 0.6
    );
    ctx.closePath();
    ctx.fill();

    // Restaurer le contexte
    ctx.restore();
  };

  // Dessiner le slime
  const drawSlime = (ctx, x, y, width, height, direction, time = 0) => {
    const bounceHeight = Math.sin(time * 0.1) * 5;
    const squishFactor = 1 - Math.abs(Math.sin(time * 0.1)) * 0.2;

    // Ombre sous le slime
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(
      x + width / 2,
      y + height,
      width * 0.4,
      height * 0.1,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Corps du slime avec gradient
    const slimeGradient = ctx.createRadialGradient(
      x + width / 2,
      y + height / 2 + bounceHeight,
      width * 0.1,
      x + width / 2,
      y + height / 2 + bounceHeight,
      width
    );
    slimeGradient.addColorStop(0, "#9FA8DA");
    slimeGradient.addColorStop(1, "#5C6BC0");

    ctx.fillStyle = slimeGradient;
    ctx.beginPath();
    ctx.ellipse(
      x + width / 2,
      y + height - height / 4 + bounceHeight,
      width / 2 / squishFactor,
      (width / 2) * squishFactor,
      0,
      Math.PI,
      Math.PI * 2
    );
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fill();

    // Brillance
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.4,
      y + height * 0.6 + bounceHeight,
      width * 0.15,
      height * 0.1,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Yeux
    const eyeX = direction > 0 ? x + width * 0.7 : x + width * 0.3;
    const blinkPhase = Math.sin(time * 0.07 + 2) > 0.95 ? 0.1 : 1;

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(
      eyeX,
      y + height * 0.4 + bounceHeight,
      width * 0.15,
      width * 0.15 * blinkPhase,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Pupille qui suit le joueur
    const playerX = playerRef.current.x;
    const lookDir = playerX > x ? 0.03 : -0.03;

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(
      eyeX + lookDir * width,
      y + height * 0.4 + bounceHeight,
      width * 0.07 * blinkPhase,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Reflet dans l'œil
    if (blinkPhase > 0.5) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.arc(
        eyeX - width * 0.05,
        y + height * 0.37 + bounceHeight,
        width * 0.04,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Petite bouche
    const mouthPhase = Math.sin(time * 0.05) * 0.5 + 0.5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.5,
      y + height * 0.6 + bounceHeight,
      width * 0.1 * mouthPhase,
      width * 0.05,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  };

  // Dessiner un pic
  const drawSpike = (ctx, x, y, width, height, time = 0) => {
    const pulseScale = 0.9 + Math.sin(time * 0.05) * 0.1;

    // Corps du pic
    ctx.fillStyle = "#E91E63";
    ctx.beginPath();
    ctx.arc(
      x + width / 2,
      y + height / 2,
      (width / 2) * pulseScale,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Pointes
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const spikeLength = width * 0.3 * pulseScale;

      ctx.fillStyle = "#C2185B";
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y + height / 2);
      ctx.lineTo(
        x + width / 2 + Math.cos(angle) * (width / 2 + spikeLength),
        y + height / 2 + Math.sin(angle) * (height / 2 + spikeLength)
      );
      ctx.lineTo(
        x + width / 2 + Math.cos(angle + 0.3) * (width / 2),
        y + height / 2 + Math.sin(angle + 0.3) * (height / 2)
      );
      ctx.closePath();
      ctx.fill();
    }

    // Œil
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width * 0.07, 0, Math.PI * 2);
    ctx.fill();
  };

  // Dessiner un oiseau
  const drawBird = (ctx, x, y, width, height, direction, time = 0) => {
    const wingPhase = Math.sin(time * 0.2) * 0.5 + 0.5;

    // Sauvegarder le contexte
    ctx.save();

    // Appliquer la transformation pour l'orientation
    ctx.translate(x + width / 2, y + height / 2);
    ctx.scale(direction > 0 ? 1 : -1, 1);
    ctx.translate(-(x + width / 2), -(y + height / 2));

    // Corps
    ctx.fillStyle = "#FF8A65";
    ctx.beginPath();
    ctx.ellipse(
      x + width / 2,
      y + height / 2,
      width / 3,
      height / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Ailes
    ctx.fillStyle = "#E64A19";
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y + height / 2);
    ctx.quadraticCurveTo(
      x + width / 2,
      y - height * wingPhase,
      x + width,
      y + height / 2
    );
    ctx.quadraticCurveTo(
      x + width / 2,
      y + height * 0.8,
      x + width / 2,
      y + height / 2
    );
    ctx.closePath();
    ctx.fill();

    // Tête
    ctx.fillStyle = "#FF8A65";
    ctx.beginPath();
    ctx.arc(x + width * 0.8, y + height * 0.3, width * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Œil
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x + width * 0.85, y + height * 0.25, width * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x + width * 0.87, y + height * 0.25, width * 0.03, 0, Math.PI * 2);
    ctx.fill();

    // Bec
    ctx.fillStyle = "#FFB74D";
    ctx.beginPath();
    ctx.moveTo(x + width * 0.9, y + height * 0.3);
    ctx.lineTo(x + width * 1.1, y + height * 0.25);
    ctx.lineTo(x + width * 0.9, y + height * 0.4);
    ctx.closePath();
    ctx.fill();

    // Restaurer le contexte
    ctx.restore();
  };

  // Dessiner le boss
  const drawBoss = (
    ctx,
    x,
    y,
    width,
    height,
    direction,
    health,
    maxHealth,
    time = 0
  ) => {
    // Sauvegarder le contexte
    ctx.save();

    // Appliquer la transformation pour l'orientation
    ctx.translate(x + width / 2, y + height / 2);
    ctx.scale(direction > 0 ? 1 : -1, 1);
    ctx.translate(-(x + width / 2), -(y + height / 2));

    // Corps
    ctx.fillStyle = "#D32F2F";
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.5,
      y + height * 0.6,
      width * 0.4,
      height * 0.35,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Tête
    ctx.fillStyle = "#D32F2F";
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.7,
      y + height * 0.25,
      width * 0.25,
      height * 0.2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Œil
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x + width * 0.8, y + height * 0.2, width * 0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x + width * 0.82, y + height * 0.2, width * 0.03, 0, Math.PI * 2);
    ctx.fill();

    // Museau
    ctx.fillStyle = "#B71C1C";
    ctx.beginPath();
    ctx.ellipse(
      x + width * 0.9,
      y + height * 0.3,
      width * 0.1,
      height * 0.08,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Crête
    ctx.fillStyle = "#B71C1C";
    ctx.beginPath();
    ctx.moveTo(x + width * 0.55, y + height * 0.05);
    ctx.lineTo(x + width * 0.65, y - height * 0.05);
    ctx.lineTo(x + width * 0.75, y + height * 0.05);
    ctx.closePath();
    ctx.fill();

    // Dessiner les dents
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.moveTo(x + width * (0.75 + i * 0.05), y + height * 0.35);
      ctx.lineTo(x + width * (0.8 + i * 0.05), y + height * 0.45);
      ctx.lineTo(x + width * (0.85 + i * 0.05), y + height * 0.35);
      ctx.closePath();
      ctx.fill();
    }

    // Barre de vie du boss
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, y - 15, width, 10);
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(x, y - 15, width * (health / maxHealth), 10);

    // Restaurer le contexte
    ctx.restore();
  };

  // Dessiner le drapeau (objectif)
  const drawFlag = (ctx, x, y, width, height, time = 0) => {
    // Mât
    ctx.fillStyle = "#795548";
    ctx.fillRect(x, y, width * 0.2, height);

    // Drapeau (avec ondulation) - maintenant en bleu CADEUL
    const wavePhase = Math.sin(time * 0.05);

    // Gradient bleu pour le drapeau CADEUL
    const flagGradient = ctx.createLinearGradient(
      x + width * 0.2,
      y,
      x + width * 0.9,
      y
    );
    flagGradient.addColorStop(0, "#1976D2"); // Bleu CADEUL plus foncé
    flagGradient.addColorStop(1, "#2196F3"); // Bleu CADEUL

    ctx.fillStyle = flagGradient;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.2, y + height * 0.1);
    ctx.lineTo(x + width * 0.9, y + height * 0.2 + wavePhase * 5);
    ctx.lineTo(x + width * 0.9, y + height * 0.5 + wavePhase * 5);
    ctx.lineTo(x + width * 0.2, y + height * 0.4);
    ctx.closePath();
    ctx.fill();

    // Ajouter le logo C au drapeau
    ctx.fillStyle = "white";
    ctx.font = `bold ${Math.floor(height * 0.25)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("C", x + width * 0.5, y + height * 0.3 + wavePhase * 2);
  };

  // Dessiner l'interface utilisateur
  const drawUI = (ctx, game, player) => {
    // Bannière CADEUL en haut
    const bannerGradient = ctx.createLinearGradient(0, 0, GAME_WIDTH, 0);
    bannerGradient.addColorStop(0, "#1565C0");
    bannerGradient.addColorStop(0.5, "#2196F3");
    bannerGradient.addColorStop(1, "#1565C0");

    ctx.fillStyle = bannerGradient;
    ctx.fillRect(0, 0, GAME_WIDTH, 40);

    // Ajouter le logo CADEUL dans le coin en bas à droite de l'écran
    const logoSize = 60; // Taille du logo
    const logoX = GAME_WIDTH - logoSize - 20; // Position X (à droite avec une marge de 20px)
    const logoY = GAME_HEIGHT - logoSize - 20; // Position Y (en bas avec une marge de 20px)

    // Cercle blanc pour avoir un fort contraste avec le bleu
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoSize, 0, Math.PI * 2);
    ctx.fill();

    // Dessiner un cercle bleu clair plus petit à l'intérieur
    ctx.fillStyle = "#29B6F6"; // Bleu clair vif
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoSize - 5, 0, Math.PI * 2);
    ctx.fill();

    // Texte CADEUL en noir pour un meilleur contraste sur le bleu
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("CADEUL", logoX, logoY);

    // Bord inférieur de la bannière
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(0, 40, GAME_WIDTH, 2);

    // Logo/Titre CADEUL au centre
    const titlePulse = 1 + Math.sin(game.time * 0.05) * 0.05;

    // Centre vertical de la bannière
    const bannerCenterY = 20;

    ctx.save();
    ctx.translate(GAME_WIDTH / 2, bannerCenterY);
    ctx.scale(titlePulse, titlePulse);

    // Ombre du texte
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle"; // Assure un centrage vertical
    ctx.fillText("DINO CADEUL", 2, 2);

    // Texte principal
    ctx.fillStyle = "white";
    ctx.fillText("DINO CADEUL", 0, 0);
    ctx.restore();

    // Logo supprimé selon la demande
    // (Le cercle blanc avec "C" a été retiré)

    // Fond semi-transparent pour l'UI (uniquement pour le score et les vies)
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(10, 50, 170, 100);
    // Rectangle pour les contrôles supprimé

    // Score avec animation
    const scoreScale = 1 + Math.sin(game.time * 0.05) * 0.05;
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "left";
    ctx.save();
    ctx.translate(20, 75);
    ctx.scale(scoreScale, scoreScale);
    ctx.fillText(`Score: ${game.score}`, 0, 0);
    ctx.restore();

    // Niveau avec effet de brillance
    const levelGlow = Math.sin(game.time * 0.1) * 30;
    const levelGradient = ctx.createLinearGradient(20, 100, 120, 100);
    levelGradient.addColorStop(0, `hsl(${200 + levelGlow}, 100%, 70%)`);
    levelGradient.addColorStop(1, `hsl(${240 + levelGlow}, 100%, 70%)`);
    ctx.fillStyle = levelGradient;
    ctx.font = "bold 20px Arial";
    ctx.fillText(`Niveau: ${game.level}`, 20, 105);

    // Vies avec battements
    ctx.fillStyle = "white";
    ctx.fillText("Vies:", 20, 135);

    // S'assurer que player.health est défini et positif
    const healthCount = player.health || 3;

    for (let i = 0; i < healthCount; i++) {
      const heartbeat =
        player.invulnerable > 0
          ? 1 + Math.sin(game.time * 0.2) * 0.2
          : 1 + Math.sin(game.time * 0.05) * 0.05;

      ctx.fillStyle = "#F44336";
      ctx.beginPath();
      ctx.arc(90 + i * 30, 130, 10 * heartbeat, 0, Math.PI * 2);
      ctx.fill();

      // Contour
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Slogan CADEUL
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.textAlign = "center";
    ctx.font = "italic 14px Arial";
    ctx.fillText(
      "La CADEUL, votre association étudiante!",
      GAME_WIDTH / 2,
      GAME_HEIGHT - 10
    );

    // Contrôles
    ctx.fillStyle = "white";
    ctx.textAlign = "right";
    ctx.font = "16px Arial";
    ctx.fillText(
      "⬅️➡️: Bouger | ⬆️: Sauter | Shift: Boost",
      GAME_WIDTH - 20,
      70
    );
  };

  // Gestion des contrôles tactiles
  const handleTouchStart = (e) => {
    e.preventDefault();
    const game = gameRef.current;
    const player = playerRef.current;

    // Si le jeu n'est pas actif
    if (!game.active) {
      if (game.gameOver) {
        restartGame();
      } else if (game.levelComplete) {
        if (!game.isTransitioning) {
          game.isTransitioning = true;
          nextLevel();
          setTimeout(() => {
            game.isTransitioning = false;
          }, 1500);
        }
      } else {
        game.active = true;
        gameLoop();
      }
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Réinitialiser les touches
    game.keys["ArrowLeft"] = false;
    game.keys["ArrowRight"] = false;
    game.keys["Space"] = false;

    // Sur mobile: Shift est toujours activé mais vitesse réduite de 50%
    game.keys["ShiftLeft"] = true;
    player.mobileSpeedFactor = 0.5;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const touchX = touch.clientX - rect.left;
      const scaleFactor = canvas.width / rect.width;
      const adjustedTouchX = touchX * scaleFactor;

      const canvasHalf = GAME_WIDTH / 2;

      if (adjustedTouchX < canvasHalf) {
        // Toucher le côté gauche = sauter ET avancer pour des sauts plus longs
        game.keys["Space"] = true;
        game.keys["ArrowRight"] = true; // Toujours avancer lors du saut
      } else {
        // Toucher le côté droit = avancer
        game.keys["ArrowRight"] = true;
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    const game = gameRef.current;

    if (!game.active) return;

    // Réinitialiser les touches
    game.keys["ArrowRight"] = false;
    game.keys["Space"] = false;

    // Garder Shift activé pour la vitesse
    game.keys["ShiftLeft"] = true;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const touchX = touch.clientX - rect.left;
      const scaleFactor = canvas.width / rect.width;
      const adjustedTouchX = touchX * scaleFactor;

      const canvasHalf = GAME_WIDTH / 2;

      if (adjustedTouchX < canvasHalf) {
        // Toucher le côté gauche = sauter
        game.keys["Space"] = true;
      } else {
        // Toucher le côté droit = avancer
        game.keys["ArrowRight"] = true;
      }
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    const game = gameRef.current;

    // Réinitialiser les touches
    game.keys["ArrowRight"] = false;
    game.keys["Space"] = false;

    // Maintenir le Shift activé
    game.keys["ShiftLeft"] = true;

    if (e.touches.length > 0) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const touchX = touch.clientX - rect.left;
        const scaleFactor = canvas.width / rect.width;
        const adjustedTouchX = touchX * scaleFactor;

        const canvasHalf = GAME_WIDTH / 2;

        if (adjustedTouchX < canvasHalf) {
          game.keys["Space"] = true;
        } else {
          game.keys["ArrowRight"] = true;
        }
      }
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        style={{
          border: "4px solid #333",
          borderRadius: "8px",
          touchAction: "none",
          maxWidth: "100%",
          height: "auto",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      <div style={{ marginTop: "10px", textAlign: "center" }}></div>
    </div>
  );
};

export default DinoCADEUL;
