import 'package:just_audio/just_audio.dart';
import 'package:video_player/video_player.dart';

VideoPlayerController createVideoPlayerControllerImpl(String source, {required bool isLocalFile}) {
  return VideoPlayerController.networkUrl(Uri.parse(source));
}

Future<Duration?> setAudioPlayerSourceImpl(AudioPlayer player, String source, {required bool isLocalFile}) {
  return player.setUrl(source);
}
