import 'package:video_player/video_player.dart';

VideoPlayerController createStoryVideoController(String url) {
  return VideoPlayerController.networkUrl(Uri.parse(url));
}
