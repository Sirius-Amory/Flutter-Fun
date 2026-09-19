const ASSET_PREFIX = '/assets';

const cert = `${ASSET_PREFIX}/tokens/cert.png`;
const fb = `${ASSET_PREFIX}/tokens/fb.png`;
const funProject = `${ASSET_PREFIX}/tokens/fun_project.png`;
const goodRating = `${ASSET_PREFIX}/tokens/good_rating.png`;
const newSkill = `${ASSET_PREFIX}/tokens/new_skill.png`;
const officeRomance = `${ASSET_PREFIX}/tokens/office_romance.png`;
const payRise = `${ASSET_PREFIX}/tokens/pay_rise.png`;
const promotion = `${ASSET_PREFIX}/tokens/promotion.png`;
const promotionOpportunity = `${ASSET_PREFIX}/tokens/promotion_opportunity.png`;
const badRating = `${ASSET_PREFIX}/projectiles/bad_rating.png`;
const corporateBs = `${ASSET_PREFIX}/projectiles/corp_bs.png`;
const deadline = `${ASSET_PREFIX}/projectiles/deadline.png`;
const divorce = `${ASSET_PREFIX}/projectiles/divorce.png`;
const meeting = `${ASSET_PREFIX}/projectiles/meeting.png`;
const redundancies = `${ASSET_PREFIX}/projectiles/redundancies.png`;
const scopeCreep = `${ASSET_PREFIX}/projectiles/scope_creep.png`;
const background1 = `${ASSET_PREFIX}/background/bg_1.jpg`;
const background2 = `${ASSET_PREFIX}/background/bg_2.jpg`;
const background3 = `${ASSET_PREFIX}/background/bg_3.jpg`;
const background4 = `${ASSET_PREFIX}/background/bg_4.jpg`;
const background5 = `${ASSET_PREFIX}/background/bg_5.jpg`;

export const FLOOR_HAZARD_ASSETS = [
  { key: 'floor-boxes', source: 'assets/floor-sprites/boxes.png' },
  { key: 'floor-cables', source: 'assets/floor-sprites/cables.png' },
  { key: 'floor-chairs', source: 'assets/floor-sprites/chairs.png' },
  { key: 'floor-copier', source: 'assets/floor-sprites/copier.png' },
  { key: 'floor-mugs', source: 'assets/floor-sprites/mugs.png' },
  { key: 'floor-pins', source: 'assets/floor-sprites/pins.png' },
  { key: 'floor-watercooler', source: 'assets/floor-sprites/watercooler.png' },
] as const;

export const REGULAR_TOKEN_ASSETS = [
  { key: 'token-pay-rise', source: payRise },
  { key: 'token-certificate', source: cert },
  { key: 'token-good-feedback', source: fb },
  { key: 'token-office-romance', source: officeRomance },
  { key: 'token-new-skill', source: newSkill },
  { key: 'token-fun-project', source: funProject },
  { key: 'token-good-rating', source: goodRating },
  { key: 'token-health', source: 'assets/tokens/health.png' },
] as const;

export const PROMOTION_TOKEN_ASSET = { key: 'token-promotion', source: promotion } as const;
export const PROMOTION_OPPORTUNITY_ASSET = { key: 'promotion-opportunity', source: promotionOpportunity } as const;

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
export const FLOOR_HAZARD_TEXTURE_KEYS = FLOOR_HAZARD_ASSETS.map((asset) => asset.key);
export const BACKGROUND_ASSETS = [background1, background2, background3, background4, background5];
