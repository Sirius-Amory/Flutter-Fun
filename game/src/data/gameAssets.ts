import cert from '../assets/tokens/cert.png';
import fb from '../assets/tokens/fb.png';
import funProject from '../assets/tokens/fun_project.png';
import goodRating from '../assets/tokens/good_rating.png';
import newSkill from '../assets/tokens/new_skill.png';
import officeRomance from '../assets/tokens/office_romance.png';
import payRise from '../assets/tokens/pay_rise.png';
import promotion from '../assets/tokens/promotion.png';
import badRating from '../assets/projectiles/bad_rating.png';
import corporateBs from '../assets/projectiles/corp_bs.png';
import deadline from '../assets/projectiles/deadline.png';
import divorce from '../assets/projectiles/divorce.png';
import meeting from '../assets/projectiles/meeting.png';
import redundancies from '../assets/projectiles/redundancies.png';
import scopeCreep from '../assets/projectiles/scope_creep.png';
import background1 from '../assets/background/bg_1.jpg';
import background2 from '../assets/background/bg_2.jpg';
import background3 from '../assets/background/bg_3.jpg';
import background4 from '../assets/background/bg_4.jpg';
import background5 from '../assets/background/bg_5.jpg';

export const REGULAR_TOKEN_ASSETS = [
  { key: 'token-pay-rise', source: payRise },
  { key: 'token-certificate', source: cert },
  { key: 'token-good-feedback', source: fb },
  { key: 'token-office-romance', source: officeRomance },
  { key: 'token-new-skill', source: newSkill },
  { key: 'token-fun-project', source: funProject },
  { key: 'token-good-rating', source: goodRating },
] as const;

export const PROMOTION_TOKEN_ASSET = { key: 'token-promotion', source: promotion } as const;

// Reorg is intentionally absent until its PNG is added to assets/projectiles.
export const OBSTACLE_ASSETS = [
  { key: 'obstacle-meeting', source: meeting },
  { key: 'obstacle-scope-creep', source: scopeCreep },
  { key: 'obstacle-deadline', source: deadline },
  { key: 'obstacle-corporate-bs', source: corporateBs },
  { key: 'obstacle-bad-rating', source: badRating },
  { key: 'obstacle-divorce', source: divorce },
  { key: 'obstacle-redundancies', source: redundancies },
] as const;

export const REGULAR_TOKEN_TEXTURE_KEYS = REGULAR_TOKEN_ASSETS.map((asset) => asset.key);
export const OBSTACLE_TEXTURE_KEYS = OBSTACLE_ASSETS.map((asset) => asset.key);
export const BACKGROUND_ASSETS = [background1, background2, background3, background4, background5];
