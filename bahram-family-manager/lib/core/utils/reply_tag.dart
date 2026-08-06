/// Reply name-chip encoding — Persian names as ⟦Name⟧body (no @).
final _replyTagPattern = RegExp(r'^⟦([^⟧]{1,80})⟧\s*');
final _legacyAtPattern = RegExp(
  r'^@([\u0600-\u06FFa-zA-Z0-9_\u200c]+(?:\s+[\u0600-\u06FFa-zA-Z0-9_\u200c]+){0,4})\s*',
);

({String? tag, String body}) parseReplyBody(String text) {
  final tagged = _replyTagPattern.firstMatch(text);
  if (tagged != null) {
    return (tag: tagged.group(1)?.trim(), body: text.substring(tagged.end));
  }
  final legacy = _legacyAtPattern.firstMatch(text);
  if (legacy != null) {
    return (tag: legacy.group(1)?.trim(), body: text.substring(legacy.end));
  }
  return (tag: null, body: text);
}

String encodeReplyBody(String? tagName, String body) {
  final trimmed = body.trim();
  final tag = tagName?.trim();
  if (tag == null || tag.isEmpty) return trimmed;
  return '⟦$tag⟧$trimmed';
}
