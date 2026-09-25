/**
 * Speakers. `voice` is a Kokoro-82M voice id used by tools/voice/generate.py
 * (synthetic voices — not modelled on any actor). `fx` is baked in offline.
 * Pure data: imported by both the game and the Node export script.
 */
export type VoiceFx = 'none' | 'villain' | 'robot' | 'ghost' | 'radio' | 'tv' | 'dream' | 'narrator' | 'phone';

export interface CastMember {
  name: string;
  color: string;
  voice: string;
  speed: number;
  fx: VoiceFx;
  portrait: string | null; // rig id used to render the portrait
}

export const CAST = {
  scarn: { name: 'MICHAEL SCARN', color: '#ffcf4a', voice: 'am_michael', speed: 1.0, fx: 'none', portrait: 'scarn' },
  samuel: { name: 'SAMUEL L. CHANG', color: '#7fd8ff', voice: 'bm_george', speed: 0.98, fx: 'none', portrait: 'samuel' },
  samuel_robot: { name: 'SAMUEL L. CHANG', color: '#7fd8ff', voice: 'bm_george', speed: 0.92, fx: 'robot', portrait: 'samuel' },
  samuel_radio: { name: 'SAMUEL (RADIO)', color: '#7fd8ff', voice: 'bm_george', speed: 1.0, fx: 'radio', portrait: 'samuel' },
  goldenface: { name: 'GOLDENFACE', color: '#f4c542', voice: 'am_onyx', speed: 0.9, fx: 'villain', portrait: 'goldenface' },
  president: { name: 'PRESIDENT JACKSON', color: '#9fb8ff', voice: 'am_adam', speed: 0.95, fx: 'none', portrait: 'president' },
  president_tv: { name: 'PRESIDENT JACKSON', color: '#9fb8ff', voice: 'am_adam', speed: 0.95, fx: 'tv', portrait: 'president' },
  jack: { name: 'CHEROKEE JACK', color: '#c8a27a', voice: 'am_santa', speed: 0.88, fx: 'none', portrait: 'jack' },
  jack_ghost: { name: 'GHOST OF CHEROKEE JACK', color: '#b8f0ff', voice: 'am_santa', speed: 0.85, fx: 'ghost', portrait: 'jack' },
  jasmine: { name: 'JASMINE WINDSONG', color: '#ff6b8b', voice: 'af_nicole', speed: 0.92, fx: 'none', portrait: 'jasmine' },
  billy: { name: 'BILLY', color: '#8fe39a', voice: 'am_liam', speed: 1.05, fx: 'none', portrait: 'billy' },
  catherine: { name: 'CATHERINE ZETA-SCARN', color: '#e7b6ff', voice: 'af_heart', speed: 0.9, fx: 'dream', portrait: 'catherine' },
  narrator: { name: 'NARRATOR', color: '#dddddd', voice: 'am_fenrir', speed: 0.9, fx: 'narrator', portrait: null },
  goon: { name: 'HENCHMAN', color: '#c0c0c0', voice: 'am_echo', speed: 1.0, fx: 'none', portrait: 'goon' },
  goon2: { name: 'OTHER HENCHMAN', color: '#c0c0c0', voice: 'am_eric', speed: 1.05, fx: 'none', portrait: 'goon' },
  cashier: { name: 'CASHIER', color: '#ffb36b', voice: 'af_sarah', speed: 1.0, fx: 'none', portrait: 'cashier' },
  coach: { name: 'COACH', color: '#ff9d5c', voice: 'am_eric', speed: 1.05, fx: 'none', portrait: 'coach' },
  chad: { name: 'CHAD "THE WALL" KOWALSKI', color: '#ffd29a', voice: 'am_puck', speed: 1.0, fx: 'none', portrait: 'chad' },
  chad_towel: { name: 'CHAD (IN THE "SAUNA")', color: '#ffd29a', voice: 'am_puck', speed: 1.05, fx: 'none', portrait: 'chad_towel' },
  announcer: { name: 'ANNOUNCER', color: '#ffffff', voice: 'am_fenrir', speed: 1.05, fx: 'radio', portrait: null },
  bouncer: { name: 'BOUNCER', color: '#b7a3ff', voice: 'am_onyx', speed: 1.0, fx: 'none', portrait: 'bouncer' },
  patron: { name: 'JAZZ PATRON', color: '#d7c3a0', voice: 'bm_lewis', speed: 1.0, fx: 'none', portrait: 'patron' },
  bartender: { name: 'CLUB BARTENDER', color: '#d7c3a0', voice: 'af_river', speed: 1.0, fx: 'none', portrait: 'patron2' },
  nurse: { name: 'NURSE', color: '#8fe3d8', voice: 'af_sarah', speed: 1.02, fx: 'none', portrait: 'nurse' },
  hostage3: { name: 'HOSTAGE #3 (HR)', color: '#d9c9a3', voice: 'bm_daniel', speed: 0.95, fx: 'none', portrait: 'hostage3' },
  hostage: { name: 'HOSTAGE', color: '#ffe08a', voice: 'af_kore', speed: 1.05, fx: 'none', portrait: 'hostage' },
  mystery: { name: '???', color: '#ff4040', voice: 'am_onyx', speed: 0.9, fx: 'phone', portrait: null },
  crowd: { name: 'CROWD', color: '#ffffff', voice: 'am_echo', speed: 1.0, fx: 'none', portrait: null },
} satisfies Record<string, CastMember>;

export type SpeakerId = keyof typeof CAST;
