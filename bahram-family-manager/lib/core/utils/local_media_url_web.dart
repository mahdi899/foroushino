// ignore: avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:typed_data';

Future<String> createLocalMediaUrl(Uint8List bytes, String mimeType, {String? extension}) async {
  final blob = html.Blob([bytes], mimeType);
  return html.Url.createObjectUrlFromBlob(blob);
}

Future<void> revokeLocalMediaUrl(String? url) async {
  if (url == null || url.isEmpty) return;
  html.Url.revokeObjectUrl(url);
}
