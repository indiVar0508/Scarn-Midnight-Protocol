/**
 * Speakers. `voice` is a Kokoro-82M voice id used by tools/voice/generate.py
 * (synthetic voices — not modelled on any actor). `fx` is baked in offline.
 * Pure data: imported by both the game and the Node export script.
 */
export type VoiceFx = 'none' | 'villain' | 'robot' | 'ghost' | 'radio' | 'tv' | 'dream' | 'narrator' | 'phone' | 'room';

export interface CastMember {
  name: string;
  color: string;
  /** Kokoro voice id, or a blend like "am_michael:0.65+am_puck:0.35" (style vectors mixed). */
  voice: string;
  speed: number;
  /** Pitch shift in semitones (duration preserved), applied offline with ffmpeg. */
  pitch?: number;
  /** Extra ffmpeg EQ to shape the timbre (e.g. a nasal bump for Dwight). */
  eq?: string;
  fx: VoiceFx;
  portrait: string | null; // rig id used to render the portrait
  /** The Dunder Mifflin employee Michael cast in the role (shown small under the name). */
  actor?: string;
}

export const CAST = {
  scarn: { name: 'MICHAEL SCARN', color: '#ffcf4a', voice: 'am_michael:0.65+am_puck:0.35', speed: 1.06, pitch: 3.0, eq: 'equalizer=f=2600:t=q:w=1.2:g=3', fx: 'none', portrait: 'scarn', actor: 'Michael Scott' },
  samuel: { name: 'SAMUEL L. CHANG', color: '#7fd8ff', voice: 'am_adam:0.5+am_eric:0.5', speed: 1.02, pitch: -1.8, eq: 'equalizer=f=1300:t=q:w=1.4:g=5,highpass=f=140', fx: 'none', portrait: 'samuel', actor: 'Dwight Schrute' },
  samuel_robot: { name: 'SAMUEL L. CHANG', color: '#7fd8ff', voice: 'am_adam:0.5+am_eric:0.5', speed: 0.94, pitch: -1.8, eq: 'equalizer=f=1300:t=q:w=1.4:g=5,highpass=f=140', fx: 'robot', portrait: 'samuel', actor: 'Dwight Schrute' },
  samuel_radio: { name: 'SAMUEL (RADIO)', color: '#7fd8ff', voice: 'am_adam:0.5+am_eric:0.5', speed: 1.02, pitch: -1.8, fx: 'radio', portrait: 'samuel', actor: 'Dwight Schrute' },
  goldenface: { name: 'GOLDENFACE', color: '#f4c542', voice: 'am_liam:0.6+am_adam:0.4', speed: 0.93, pitch: -0.8, fx: 'room', portrait: 'goldenface', actor: 'Jim Halpert' },
  president: { name: 'PRESIDENT JACKSON', color: '#9fb8ff', voice: 'am_onyx:0.7+am_fenrir:0.3', speed: 0.92, pitch: -1.5, eq: 'bass=g=3', fx: 'none', portrait: 'president', actor: 'Darryl Philbin' },
  president_tv: { name: 'PRESIDENT JACKSON', color: '#9fb8ff', voice: 'am_onyx:0.7+am_fenrir:0.3', speed: 0.92, pitch: -1.5, fx: 'tv', portrait: 'president', actor: 'Darryl Philbin' },
  jack: { name: 'CHEROKEE JACK', color: '#c8a27a', voice: 'am_santa:0.6+am_fenrir:0.4', speed: 0.88, pitch: -3.4, eq: 'lowpass=f=6500,equalizer=f=250:t=q:w=1:g=3', fx: 'none', portrait: 'jack', actor: 'Creed Bratton' },
  jack_ghost: { name: 'GHOST OF CHEROKEE JACK', color: '#b8f0ff', voice: 'am_santa:0.6+am_fenrir:0.4', speed: 0.85, pitch: -3.4, fx: 'ghost', portrait: 'jack', actor: 'Creed Bratton' },
  jasmine: { name: 'JASMINE WINDSONG', color: '#ff6b8b', voice: 'af_bella:0.6+af_sarah:0.4', speed: 0.95, pitch: -1.8, fx: 'none', portrait: 'jasmine', actor: 'Jan Levinson' },
  billy: { name: 'BILLY', color: '#8fe39a', voice: 'am_puck:0.6+am_liam:0.4', speed: 1.08, pitch: 4.6, eq: 'equalizer=f=3000:t=q:w=1.2:g=2', fx: 'none', portrait: 'billy', actor: 'Andy Bernard' },
  catherine: { name: 'CATHERINE ZETA-SCARN', color: '#e7b6ff', voice: 'af_heart', speed: 0.9, fx: 'dream', portrait: 'catherine' },
  narrator: { name: 'NARRATOR', color: '#dddddd', voice: 'am_fenrir:0.6+am_onyx:0.4', speed: 0.84, pitch: -3.6, fx: 'narrator', portrait: null, actor: 'Stanley Hudson' },
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
  nurse: { name: 'NURSE', color: '#8fe3d8', voice: 'af_sarah:0.7+af_bella:0.3', speed: 0.96, pitch: -0.8, fx: 'none', portrait: 'nurse', actor: "Helene Beesly (Pam's mom)" },
  hostage3: { name: 'TOBY THE HOSTAGE', color: '#d9c9a3', voice: 'am_adam:0.6+am_echo:0.4', speed: 0.9, pitch: -0.8, eq: 'lowpass=f=5000,volume=0.85', fx: 'none', portrait: 'hostage3', actor: 'Toby Flenderson' },
  hostage: { name: 'HOSTAGE', color: '#ffe08a', voice: 'af_kore', speed: 1.05, fx: 'none', portrait: 'hostage' },
  president_phone: { name: 'PRESIDENT JACKSON (PHONE)', color: '#9fb8ff', voice: 'am_onyx:0.7+am_fenrir:0.3', speed: 0.92, pitch: -1.5, fx: 'phone', portrait: null, actor: 'Darryl Philbin' },
  mystery: { name: '???', color: '#ff4040', voice: 'am_onyx', speed: 0.9, fx: 'phone', portrait: null },
  pam: { name: 'NACHO LADY', color: '#ffb4a0', voice: 'af_heart:0.6+af_sky:0.4', speed: 0.98, pitch: 1.0, fx: 'none', portrait: 'hostage_c', actor: 'Pam Halpert' },
  kevin: { name: 'HOT DOG GUY', color: '#ffd27a', voice: 'am_echo:0.6+am_onyx:0.4', speed: 0.8, pitch: -3.2, eq: 'lowpass=f=6000', fx: 'none', portrait: 'hostage_b', actor: 'Kevin Malone' },
  kid: { name: 'JUKEBOX KID', color: '#a8e6ff', voice: 'af_nova:0.8+af_sky:0.2', speed: 1.08, pitch: 6.5, fx: 'none', portrait: null },
  bachelorette: { name: 'BACHELORETTE', color: '#ff8ad8', voice: 'af_jessica:0.6+af_nova:0.4', speed: 1.2, pitch: 3.6, fx: 'none', portrait: 'bar1', actor: 'Kelly Kapoor' },
  assassin: { name: "GOLDENFACE'S ASSASSIN", color: '#c0c0c0', voice: 'am_eric', speed: 0.95, fx: 'none', portrait: 'goon' },
  director: { name: 'DIRECTOR (MEGAPHONE)', color: '#ffcf4a', voice: 'am_michael:0.65+am_puck:0.35', speed: 1.1, pitch: 3.0, fx: 'radio', portrait: null, actor: 'Michael Scott' },
  crowd: { name: 'CROWD', color: '#ffffff', voice: 'am_echo', speed: 1.0, fx: 'none', portrait: null },
} satisfies Record<string, CastMember>;

export type SpeakerId = keyof typeof CAST;
