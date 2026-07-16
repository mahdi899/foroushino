import 'file_download_stub.dart'
    if (dart.library.html) 'file_download_web.dart'
    if (dart.library.io) 'file_download_io.dart';

Future<void> downloadFile(String filename, List<int> bytes) =>
    downloadFileImpl(filename, bytes);
