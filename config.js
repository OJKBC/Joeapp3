/* =========================================================
   くく ヒーロー — せってい（編集はここ）
   ========================================================= */

const CONFIG = {
  rate: 0.9,          // よみあげの速さ（1=ふつう）
  pitch: 1.1,
  hintAfter: 2,       // この回数まちがえたら、こたえのボタンを光らせる
  nextDelay: 600,     // 「にいちがに」を言いおわってから次の問題までの間(ms)
  storageKey: 'kukuHero.v1'
};

/* 九九の読み方。
   q = こたえの前まで（「にいちが」）、a = こたえ（「に」）
   TTS の読みがおかしいときは、ここのひらがなを直す。
   ほかの段を足すときは同じ形で 3: {...} のように追加し、index.html にボタンを足す。 */
const DANS = {
  2: {
    name: '2のだん',
    rows: [
      {q:'にいちが',  a:'に'},
      {q:'ににんが',  a:'し'},
      {q:'にさんが',  a:'ろく'},
      {q:'にしが',    a:'はち'},
      {q:'にご',      a:'じゅう'},
      {q:'にろく',    a:'じゅうに'},
      {q:'にしち',    a:'じゅうし'},
      {q:'にはち',    a:'じゅうろく'},
      {q:'にく',      a:'じゅうはち'}
    ]
  },
  5: {
    name: '5のだん',
    rows: [
      {q:'ごいちが',  a:'ご'},
      {q:'ごに',      a:'じゅう'},
      {q:'ごさん',    a:'じゅうご'},
      {q:'ごし',      a:'にじゅう'},
      {q:'ごご',      a:'にじゅうご'},
      {q:'ごろく',    a:'さんじゅう'},
      {q:'ごしち',    a:'さんじゅうご'},
      {q:'ごは',      a:'しじゅう'},
      {q:'ごっく',    a:'しじゅうご'}
    ]
  }
};

const HEROES = [
  'images/fire_hero_512.webp',
  'images/lightning_hero_512.webp',
  'images/water_ice_hero_512.webp',
  'images/wind_ninja_hero_512.webp',
  'images/hero_holy_paladin_512.webp',
  'images/hero_dark_mage_512.webp',
  'images/hero_earth_martial_artist_512.webp',
  'images/hero_black_dragoon_512.webp'
];

const PRAISE = ['すごい！', 'せいかい！', 'やったね！', 'ばっちり！', 'かんぺき！'];
