import adventurerIdle from '../assets/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_idle.png';
import adventurerWalk1 from '../assets/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_walk1.png';
import adventurerWalk2 from '../assets/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_walk2.png';
import adventurerJump from '../assets/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_jump.png';
import adventurerFall from '../assets/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_fall.png';
import adventurerKick from '../assets/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_kick.png';
import adventurerHurt from '../assets/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_hurt.png';
import adventurerDuck from '../assets/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_duck.png';

import femaleIdle from '../assets/kenney_platformer-characters/PNG/Female/Poses/female_idle.png';
import femaleWalk1 from '../assets/kenney_platformer-characters/PNG/Female/Poses/female_walk1.png';
import femaleWalk2 from '../assets/kenney_platformer-characters/PNG/Female/Poses/female_walk2.png';
import femaleJump from '../assets/kenney_platformer-characters/PNG/Female/Poses/female_jump.png';
import femaleFall from '../assets/kenney_platformer-characters/PNG/Female/Poses/female_fall.png';
import femaleKick from '../assets/kenney_platformer-characters/PNG/Female/Poses/female_kick.png';
import femaleHurt from '../assets/kenney_platformer-characters/PNG/Female/Poses/female_hurt.png';
import femaleDuck from '../assets/kenney_platformer-characters/PNG/Female/Poses/female_duck.png';

import playerIdle from '../assets/kenney_platformer-characters/PNG/Player/Poses/player_idle.png';
import playerWalk1 from '../assets/kenney_platformer-characters/PNG/Player/Poses/player_walk1.png';
import playerWalk2 from '../assets/kenney_platformer-characters/PNG/Player/Poses/player_walk2.png';
import playerJump from '../assets/kenney_platformer-characters/PNG/Player/Poses/player_jump.png';
import playerFall from '../assets/kenney_platformer-characters/PNG/Player/Poses/player_fall.png';
import playerKick from '../assets/kenney_platformer-characters/PNG/Player/Poses/player_kick.png';
import playerHurt from '../assets/kenney_platformer-characters/PNG/Player/Poses/player_hurt.png';
import playerDuck from '../assets/kenney_platformer-characters/PNG/Player/Poses/player_duck.png';

import soldierIdle from '../assets/kenney_platformer-characters/PNG/Soldier/Poses/soldier_idle.png';
import soldierWalk1 from '../assets/kenney_platformer-characters/PNG/Soldier/Poses/soldier_walk1.png';
import soldierWalk2 from '../assets/kenney_platformer-characters/PNG/Soldier/Poses/soldier_walk2.png';
import soldierJump from '../assets/kenney_platformer-characters/PNG/Soldier/Poses/soldier_jump.png';
import soldierFall from '../assets/kenney_platformer-characters/PNG/Soldier/Poses/soldier_fall.png';
import soldierKick from '../assets/kenney_platformer-characters/PNG/Soldier/Poses/soldier_kick.png';
import soldierHurt from '../assets/kenney_platformer-characters/PNG/Soldier/Poses/soldier_hurt.png';
import soldierDuck from '../assets/kenney_platformer-characters/PNG/Soldier/Poses/soldier_duck.png';

import zombieIdle from '../assets/kenney_platformer-characters/PNG/Zombie/Poses/zombie_idle.png';
import zombieWalk1 from '../assets/kenney_platformer-characters/PNG/Zombie/Poses/zombie_walk1.png';
import zombieWalk2 from '../assets/kenney_platformer-characters/PNG/Zombie/Poses/zombie_walk2.png';
import zombieJump from '../assets/kenney_platformer-characters/PNG/Zombie/Poses/zombie_jump.png';
import zombieFall from '../assets/kenney_platformer-characters/PNG/Zombie/Poses/zombie_fall.png';
import zombieKick from '../assets/kenney_platformer-characters/PNG/Zombie/Poses/zombie_kick.png';
import zombieHurt from '../assets/kenney_platformer-characters/PNG/Zombie/Poses/zombie_hurt.png';
import zombieDuck from '../assets/kenney_platformer-characters/PNG/Zombie/Poses/zombie_duck.png';

export interface CharacterDef {
  id: string;
  label: string;
  idle: string;
  walk: [string, string];
  jump: string;
  fall: string;
  kick: string;
  hurt: string;
  duck: string;
}

// Kenney "Platformer Characters" (CC0) - see game/src/assets/kenney_platformer-characters/License.txt.
export const CHARACTERS: CharacterDef[] = [
  {
    id: 'adventurer',
    label: 'Adventurer',
    idle: adventurerIdle,
    walk: [adventurerWalk1, adventurerWalk2],
    jump: adventurerJump,
    fall: adventurerFall,
    kick: adventurerKick,
    hurt: adventurerHurt,
    duck: adventurerDuck,
  },
  {
    id: 'female',
    label: 'Female',
    idle: femaleIdle,
    walk: [femaleWalk1, femaleWalk2],
    jump: femaleJump,
    fall: femaleFall,
    kick: femaleKick,
    hurt: femaleHurt,
    duck: femaleDuck,
  },
  {
    id: 'player',
    label: 'Player',
    idle: playerIdle,
    walk: [playerWalk1, playerWalk2],
    jump: playerJump,
    fall: playerFall,
    kick: playerKick,
    hurt: playerHurt,
    duck: playerDuck,
  },
  {
    id: 'soldier',
    label: 'Soldier',
    idle: soldierIdle,
    walk: [soldierWalk1, soldierWalk2],
    jump: soldierJump,
    fall: soldierFall,
    kick: soldierKick,
    hurt: soldierHurt,
    duck: soldierDuck,
  },
  {
    id: 'zombie',
    label: 'Zombie',
    idle: zombieIdle,
    walk: [zombieWalk1, zombieWalk2],
    jump: zombieJump,
    fall: zombieFall,
    kick: zombieKick,
    hurt: zombieHurt,
    duck: zombieDuck,
  },
];

export const DEFAULT_CHARACTER_ID = CHARACTERS[0].id;

export function getCharacterById(id: string): CharacterDef {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
}
