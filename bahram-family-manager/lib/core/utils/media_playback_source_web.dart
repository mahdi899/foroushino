import 'package:just_audio/just_audio.dart';
import 'package:video_player/video_player.dart';

VideoPlayerController createVideoPlayerController(String source, {required bool isLocalFile}) {
  // Blob URLs are served via networkUrl on web.
  return VideoPlayerController.networkUrl(Uri.parse(source));
}

Future<Duration?> setAudioPlayerSource(AudioPlayer player, String source, {required bool isLocalFile}) {
  return player.setUrl(source);
}
