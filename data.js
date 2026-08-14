// Tournament data — 10-player round-robin, best of 3 rounds, 2 pts per round win.
// Day-of-week is normalized from the actual date (some source day labels were off).

const PLAYERS = [
  "Ravi Attada",
  "Kavitha",
  "Ravi Pasunuri",
  "Likitha",
  "Ramesh",
  "Rohith",
  "Naveen",
  "Hari Krishna",
  "Sathish",
  "Pawan"
];

// Each match: { id, date (YYYY-MM-DD), day, p1, p2 }
const SCHEDULE = [
  // Thu, Aug 6, 2026
  { id: 1,  date: "2026-08-06", day: "Thu", p1: "Ravi Attada",   p2: "Kavitha" },
  { id: 2,  date: "2026-08-06", day: "Thu", p1: "Ravi Pasunuri", p2: "Likitha" },
  { id: 3,  date: "2026-08-06", day: "Thu", p1: "Ramesh",        p2: "Rohith" },
  { id: 4,  date: "2026-08-06", day: "Thu", p1: "Naveen",        p2: "Hari Krishna" },
  { id: 5,  date: "2026-08-06", day: "Thu", p1: "Sathish",       p2: "Pawan" },
  { id: 6,  date: "2026-08-06", day: "Thu", p1: "Ravi Attada",   p2: "Ramesh" },

  // Fri, Aug 7, 2026
  { id: 7,  date: "2026-08-07", day: "Fri", p1: "Naveen",        p2: "Ravi Pasunuri" },
  { id: 8,  date: "2026-08-07", day: "Fri", p1: "Hari Krishna",  p2: "Sathish" },
  { id: 9,  date: "2026-08-07", day: "Fri", p1: "Ravi Attada",   p2: "Likitha" },
  { id: 10, date: "2026-08-07", day: "Fri", p1: "Kavitha",       p2: "Pawan" },
  { id: 11, date: "2026-08-07", day: "Fri", p1: "Ramesh",        p2: "Pawan" },

  // Thu, Aug 13, 2026
  { id: 12, date: "2026-08-13", day: "Thu", p1: "Ravi Attada",   p2: "Rohith" },
  { id: 13, date: "2026-08-13", day: "Thu", p1: "Likitha",       p2: "Hari Krishna" },
  { id: 14, date: "2026-08-13", day: "Thu", p1: "Ravi Pasunuri", p2: "Sathish" },
  { id: 15, date: "2026-08-13", day: "Thu", p1: "Ramesh",        p2: "Naveen" },
  { id: 16, date: "2026-08-13", day: "Thu", p1: "Kavitha",       p2: "Rohith" },

  // Fri, Aug 14, 2026
  { id: 17, date: "2026-08-14", day: "Fri", p1: "Ravi Attada",   p2: "Hari Krishna" },
  { id: 18, date: "2026-08-14", day: "Fri", p1: "Rohith",        p2: "Pawan" },
  { id: 19, date: "2026-08-14", day: "Fri", p1: "Likitha",       p2: "Sathish" },
  { id: 20, date: "2026-08-14", day: "Fri", p1: "Kavitha",       p2: "Naveen" },
  { id: 21, date: "2026-08-14", day: "Fri", p1: "Ravi Pasunuri", p2: "Ramesh" },

  // Sat, Aug 15, 2026
  { id: 22, date: "2026-08-15", day: "Sat", p1: "Ravi Attada",   p2: "Pawan" },
  { id: 23, date: "2026-08-15", day: "Sat", p1: "Rohith",        p2: "Naveen" },
  { id: 24, date: "2026-08-15", day: "Sat", p1: "Likitha",       p2: "Ramesh" },
  { id: 25, date: "2026-08-15", day: "Sat", p1: "Kavitha",       p2: "Ravi Pasunuri" },
  { id: 26, date: "2026-08-15", day: "Sat", p1: "Rohith",        p2: "Hari Krishna" },

  // Thu, Aug 20, 2026
  { id: 27, date: "2026-08-20", day: "Thu", p1: "Ravi Attada",   p2: "Sathish" },
  { id: 28, date: "2026-08-20", day: "Thu", p1: "Pawan",         p2: "Naveen" },
  { id: 29, date: "2026-08-20", day: "Thu", p1: "Hari Krishna",  p2: "Ramesh" },
  { id: 30, date: "2026-08-20", day: "Thu", p1: "Rohith",        p2: "Ravi Pasunuri" },
  { id: 31, date: "2026-08-20", day: "Thu", p1: "Likitha",       p2: "Kavitha" },

  // Fri, Aug 21, 2026
  { id: 32, date: "2026-08-21", day: "Fri", p1: "Ravi Attada",   p2: "Naveen" },
  { id: 33, date: "2026-08-21", day: "Fri", p1: "Sathish",       p2: "Ramesh" },
  { id: 34, date: "2026-08-21", day: "Fri", p1: "Pawan",         p2: "Ravi Pasunuri" },
  { id: 35, date: "2026-08-21", day: "Fri", p1: "Hari Krishna",  p2: "Kavitha" },
  { id: 36, date: "2026-08-21", day: "Fri", p1: "Rohith",        p2: "Likitha" },

  // Sat, Aug 22, 2026
  { id: 37, date: "2026-08-22", day: "Sat", p1: "Ravi Pasunuri", p2: "Hari Krishna" },
  { id: 38, date: "2026-08-22", day: "Sat", p1: "Pawan",         p2: "Likitha" },
  { id: 39, date: "2026-08-22", day: "Sat", p1: "Naveen",        p2: "Sathish" },
  { id: 40, date: "2026-08-22", day: "Sat", p1: "Sathish",       p2: "Kavitha" },

  // Thu, Aug 27, 2026
  { id: 41, date: "2026-08-27", day: "Thu", p1: "Ravi Attada",   p2: "Ravi Pasunuri" },
  { id: 42, date: "2026-08-27", day: "Thu", p1: "Ramesh",        p2: "Kavitha" },
  { id: 43, date: "2026-08-27", day: "Thu", p1: "Naveen",        p2: "Likitha" },
  { id: 44, date: "2026-08-27", day: "Thu", p1: "Sathish",       p2: "Rohith" },
  { id: 45, date: "2026-08-27", day: "Thu", p1: "Pawan",         p2: "Hari Krishna" }
];

const TOURNAMENT_META = {
  title: "Pickleball Tournament 2026",
  subtitle: "Best of 3 Rounds · 2 Points per Round Win · Max 4 pts / match",
  info: "Start 5:30 PM · 2 Grounds (A & B) · 45 mins / match",
  duration: "Aug6-27"
};
