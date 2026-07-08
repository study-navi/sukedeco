const SukeStorage = {
  save(key, value){ localStorage.setItem('sukedeco_' + key, JSON.stringify(value)); },
  load(key, fallback=null){ try { return JSON.parse(localStorage.getItem('sukedeco_' + key)) ?? fallback; } catch { return fallback; } },
  remove(key){ localStorage.removeItem('sukedeco_' + key); }
};
