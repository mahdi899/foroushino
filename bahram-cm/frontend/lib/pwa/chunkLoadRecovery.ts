/**
 * One-shot reload when a deploy invalidates hashed Next.js chunks (ChunkLoadError).
 * sessionStorage prevents infinite reload loops.
 */
export const CHUNK_LOAD_RECOVERY_SCRIPT = `(function(){try{var k='bahram_chunk_reload_v1';function hit(m){return/ChunkLoadError|Loading chunk [\\s\\S]+ failed/i.test(m||'');}function go(){if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1');location.reload();}window.addEventListener('error',function(e){if(hit(e&&e.message))go();});window.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;var m=(r&&r.message)||r||'';if(hit(String(m)))go();});}catch(_){}})();`;
