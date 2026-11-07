/*
  config.js - the lists everything else depends on.

  It is shared by TWO places:
    - the website (app.js, search.js) uses it to build filters and cards
    - the AI function (netlify/functions/ai-search.mjs) uses it to tell Claude
      which features exist

  Keeping it in one file means you only edit it once. To add a new feature
  (e.g. "hearing loop"): add it here, then add "hearing_loop": true/false
  to the places in data/places.json.
*/

// Types of place: key -> label shown to the user.
export const PLACE_TYPES = {
  cafe: "Café",
  restaurant: "Restaurant",
  park: "Park",
  hospital: "Hospital / Clinic",
  mall: "Mall",
  library: "Library",
  museum: "Museum",
};

// Accessibility features we track.
//   label   -> text shown in the app
//   icon    -> emoji shown next to it
//   hint    -> plain-English meaning (the AI reads this to understand each feature)
//   pattern -> words that switch this feature on in the offline keyword search
export const FEATURES = {
  wheelchair_access: {
    label: "Wheelchair entrance",
    icon: "♿",
    hint: "ramp or step-free entrance that is wide enough for a wheelchair",
    pattern: "wheel ?chair|\\bramps?\\b|step[- ]?free|mobility|crutch|walker",
  },
  accessible_washroom: {
    label: "Accessible washroom",
    icon: "🚻",
    hint: "washroom/toilet with enough space and rails for wheelchair users",
    pattern: "wash ?rooms?|toilets?|restrooms?|bathrooms?|\\bloo\\b",
  },
  emergency_supplies: {
    label: "Emergency supplies",
    icon: "🩹",
    hint: "first-aid kit, defibrillator (AED) or an emergency help point on site",
    pattern: "emergency|first[- ]?aid|defibrillator|\\baed\\b",
  },
  accessible_parking: {
    label: "Accessible parking",
    icon: "🅿️",
    hint: "reserved parking bays close to the entrance for disabled visitors",
    pattern: "parking",
  },
  step_free_path: {
    label: "Step-free paths / lift",
    icon: "🛗",
    hint: "smooth, step-free routes inside or outside, or a working lift/elevator",
    pattern: "elevators?|\\blifts?\\b|smooth|paved|flat path",
  },
  braille_signage: {
    label: "Braille & tactile signs",
    icon: "🦯",
    hint: "braille menus/signs, tactile paths or large-print info for blind or low-vision visitors",
    pattern: "braille|blind|visually impaired|low vision|\\bvision\\b|large[- ]print|white cane|tactile",
  },
  quiet_space: {
    label: "Quiet space",
    icon: "🤫",
    hint: "calm, low-noise area for people who are sensory-sensitive (e.g. autism) or easily overwhelmed",
    pattern: "quiet|calm|sensory|autis|noise|overwhelm|peaceful",
  },
};

// Words that pick a type of place in the offline keyword search.
export const TYPE_PATTERNS = {
  cafe: "caf[eé]s?\\b|coffee",
  restaurant: "restaurants?|dinner|lunch|eat out|\\bfood\\b",
  park: "\\bparks?\\b|garden|playground",
  hospital: "hospitals?|clinics?|doctor",
  mall: "\\bmalls?\\b|shopping",
  library: "librar(y|ies)|\\bbooks?\\b",
  museum: "museums?|exhibit",
};
