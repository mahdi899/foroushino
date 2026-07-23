import 'dart:io';

import 'package:video_player/video_player.dart';

VideoPlayerController createStoryVideoController(String url) {
  if (url.startsWith('blob:') || url.startsWith('http')) {
    return VideoPlayerController.networkUrl(Uri.parse(url));
  }
  return VideoPlayerController.file(File(url));
}
