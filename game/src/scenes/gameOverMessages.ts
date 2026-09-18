export const GAME_OVER_MESSAGES = [
  'choked on a muffin at a project kickoff morning tea',
  "suffocated under a beanbag during a mandatory 'fun' team offsite",
  'fell off the boat at the Christmas party',
  'swallowed a whiteboard marker lid mid-brainstorm',
  'died from a broken back after carrying the dev team during a taxing project',
  'electrocuted themselves microwaving a fork by accident',
  'choked on a jelly bean grabbed from the communal lolly jar',
  'fell down the stairs trying to get steps in',
  'died from embarrassment after getting rejected by the receptionist',
  'choked on a samosa at the Diwali morning tea',
  'died from fright at a fire alarm',
  'never came back after the Christmas party',
  'had an allergic reaction to the mystery meal at the potluck',
  'took a paintball to the eye at a work function',
  "got stuck in the stationary cupboard right before the Christmas shutdown period",
  'died trying to get the grad out of a really high tree',
  "used a wheelchair as a ladder and didn't live to regret it",
  'got stuck in the lift forever after pressing all the buttons at once',
  'bled out from a paper cut',
  'got electrocuted licking a 9-volt battery from the stationary cupboard on a dare',
];

let lastCauseIndex = -1;

export function getNextGameOverCause(): string {
  if (GAME_OVER_MESSAGES.length === 0) return '';

  let causeIndex = Math.floor(Math.random() * GAME_OVER_MESSAGES.length);
  if (GAME_OVER_MESSAGES.length > 1 && causeIndex === lastCauseIndex) {
    causeIndex = (causeIndex + 1) % GAME_OVER_MESSAGES.length;
  }
  lastCauseIndex = causeIndex;
  return GAME_OVER_MESSAGES[causeIndex];
}

export function getRandomGameOverMessage(age: number, randomFn: () => number = Math.random): string {
  const cause = GAME_OVER_MESSAGES[Math.floor(randomFn() * GAME_OVER_MESSAGES.length)] ?? GAME_OVER_MESSAGES[0];
  return `You ${cause} at age ${age}`;
}
