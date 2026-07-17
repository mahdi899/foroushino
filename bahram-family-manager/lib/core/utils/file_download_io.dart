import 'dart:io';

Future<void> downloadFileImpl(String filename, List<int> bytes) async {
  final home = Platform.environment['USERPROFILE'] ?? Platform.environment['HOME'] ?? '.';
  final path = '$home${Platform.pathSeparator}Downloads${Platform.pathSeparator}$filename';
  await File(path).writeAsBytes(bytes, flush: true);
}
